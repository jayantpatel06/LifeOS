import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';
const HEALTHCHECK_URL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/health`
  : '/health';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lifeos_token'));
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('idle');
  const backendStatusRef = useRef('idle');
  const warmupPromiseRef = useRef(null);

  // Create stable API instance
  const [api] = useState(() => axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }));

  const applyTokenToApi = useCallback((nextToken) => {
    if (nextToken) {
      api.defaults.headers.Authorization = `Bearer ${nextToken}`;
    } else {
      delete api.defaults.headers.Authorization;
    }
  }, [api]);

  // Update axios headers when token changes
  useEffect(() => {
    applyTokenToApi(token);
  }, [token, applyTokenToApi]);

  useEffect(() => {
    backendStatusRef.current = backendStatus;
  }, [backendStatus]);

  const warmBackend = useCallback(() => {
    if (warmupPromiseRef.current) {
      return warmupPromiseRef.current;
    }

    if (backendStatusRef.current === 'ready') {
      return Promise.resolve(true);
    }

    backendStatusRef.current = 'warming';
    setBackendStatus('warming');

    const warmupRequest = axios
      .get(HEALTHCHECK_URL, { timeout: 65000 })
      .then(() => {
        backendStatusRef.current = 'ready';
        setBackendStatus('ready');
        return true;
      })
      .catch(() => {
        backendStatusRef.current = 'error';
        setBackendStatus('error');
        return false;
      })
      .finally(() => {
        warmupPromiseRef.current = null;
      });

    warmupPromiseRef.current = warmupRequest;
    return warmupRequest;
  }, []);

  useEffect(() => {
    warmBackend();
  }, [warmBackend]);

  // 401 interceptor — logout on expired/invalid token
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('lifeos_token');
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [api]);

  // Proactive token refresh — refresh every 20 hours (token lasts 24h)
  useEffect(() => {
    if (!token) return;
    const REFRESH_INTERVAL = 20 * 60 * 60 * 1000; // 20 hours
    const interval = setInterval(async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { access_token, user: userData } = response.data;
        localStorage.setItem('lifeos_token', access_token);
        applyTokenToApi(access_token);
        setToken(access_token);
        setUser(userData);
      } catch (e) {
        console.error('Token refresh failed:', e);
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [token, api, applyTokenToApi]);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('lifeos_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('lifeos_token', access_token);
    applyTokenToApi(access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, [applyTokenToApi]);

  const register = useCallback(async (email, password, username) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, username });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('lifeos_token', access_token);
    applyTokenToApi(access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  }, [applyTokenToApi]);

  const logout = useCallback(() => {
    localStorage.removeItem('lifeos_token');
    applyTokenToApi(null);
    setToken(null);
    setUser(null);
  }, [applyTokenToApi]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value = {
    user,
    token,
    loading,
    backendStatus,
    login,
    register,
    logout,
    refreshUser,
    warmBackend,
    api,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
