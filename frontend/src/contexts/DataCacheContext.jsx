import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

const DataCacheContext = createContext(null);

const STALE_MS = 30_000; // Data older than 30s is considered stale

export const DataCacheProvider = ({ children }) => {
  const { api, isAuthenticated, user } = useAuth();
  const cacheRef = useRef({});  // { [key]: { data, timestamp } }
  // Subscribers: page components register to get notified of cache updates for their key
  const subscribersRef = useRef(new Map()); // Map<key, Set<callback>>

  const lastSyncRef = useRef(null);

  // Helper to get local storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `lifeos_data_cache_${user.id}` : null;
  }, [user?.id]);

  // Load from localStorage on mount or when user changes
  useEffect(() => {
    const key = getStorageKey();
    if (key) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          cacheRef.current = JSON.parse(stored);
          lastSyncRef.current = localStorage.getItem(`${key}_sync`) || null;
          // Notify components so they pick up cached data instantly
          Object.keys(cacheRef.current).forEach(k => notifyKey(k));
        }
      } catch (e) {
        console.error('Failed to load cache from localStorage', e);
      }
    }
  }, [getStorageKey, notifyKey]);

  // Subscribe to cache updates for a specific key
  const subscribe = useCallback((key, callback) => {
    if (!subscribersRef.current.has(key)) {
      subscribersRef.current.set(key, new Set());
    }
    subscribersRef.current.get(key).add(callback);
    return () => subscribersRef.current.get(key)?.delete(callback);
  }, []);

  // Notify subscribers for a specific key (not the whole tree)
  const notifyKey = useCallback((key) => {
    const subs = subscribersRef.current.get(key);
    if (subs) {
      subs.forEach(cb => cb(cacheRef.current[key]?.data));
    }
  }, []);

  // Get cached data
  const getCached = useCallback((key) => {
    const entry = cacheRef.current[key];
    if (!entry) return null;
    return entry.data;
  }, []);

  // Check if cached data is still fresh
  const isFresh = useCallback((key) => {
    const entry = cacheRef.current[key];
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < STALE_MS;
  }, []);

  // Set cache entry — only notifies the specific key's subscribers
  const setCached = useCallback((key, data) => {
    cacheRef.current[key] = { data, timestamp: Date.now() };
    notifyKey(key);

    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(cacheRef.current));
      } catch (e) {
        console.error('Failed to save cache to localStorage', e);
      }
    }
  }, [notifyKey, getStorageKey]);

  // Invalidate a cache key
  const invalidate = useCallback((key) => {
    if (cacheRef.current[key]) {
      cacheRef.current[key].timestamp = 0;
    }
  }, []);

  // Clear all cache (on logout)
  const clearAll = useCallback(() => {
    cacheRef.current = {};
    lastSyncRef.current = null;
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('lifeos_data_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Failed to clear cache from localStorage', e);
    }
  }, []);

  // Prefetch core data in a single request after auth
  const prefetchAll = useCallback(async () => {
    if (!api) return;
    try {
      const isDeltaSync = !!lastSyncRef.current;
      const url = isDeltaSync 
        ? `/preload?since=${encodeURIComponent(lastSyncRef.current)}` 
        : '/preload';
        
      const res = await api.get(url);
      const { tasks, notes, budget_sheets, server_time } = res.data;
      const now = Date.now();
      
      if (isDeltaSync) {
        // Delta sync: Merge new items into existing cache
        const mergeArr = (oldArr = [], newArr = []) => {
          if (!newArr || !newArr.length) return oldArr;
          const map = new Map(oldArr.map(item => [item.id, item]));
          newArr.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        const existingTasks = cacheRef.current.tasks?.data || [];
        const existingNotes = cacheRef.current.notes?.data || [];
        const existingSheets = cacheRef.current.budget_sheets?.data || [];

        cacheRef.current = {
          ...cacheRef.current,
          tasks: { 
            data: mergeArr(existingTasks, tasks).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)), 
            timestamp: now 
          },
          notes: { 
            data: mergeArr(existingNotes, notes).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)), 
            timestamp: now 
          },
          budget_sheets: { 
            data: mergeArr(existingSheets, budget_sheets).sort((a,b) => a.order - b.order), 
            timestamp: now 
          },
        };
      } else {
        // Full sync
        cacheRef.current = {
          ...cacheRef.current,
          tasks: { data: tasks, timestamp: now },
          notes: { data: notes, timestamp: now },
          budget_sheets: { data: budget_sheets, timestamp: now },
        };
      }
      
      if (server_time) {
        lastSyncRef.current = server_time;
      }
      
      // Notify all prefetched keys
      notifyKey('tasks');
      notifyKey('notes');
      notifyKey('budget_sheets');

      const storageKey = getStorageKey();
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(cacheRef.current));
          if (server_time) {
            localStorage.setItem(`${storageKey}_sync`, server_time);
          }
        } catch (e) {
          console.error('Failed to save cache to localStorage', e);
        }
      }
    } catch (e) {
      console.error('Prefetch failed:', e);
    }
  }, [api, notifyKey, getStorageKey]);

  // Auto-prefetch when user becomes authenticated, and sync every 60 seconds
  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      // Fetch immediately on auth (if not already loaded from localStorage, or just to get fresh data)
      prefetchAll();
      
      interval = setInterval(() => {
        // Only run background sync if the tab is visible!
        if (document.visibilityState === 'visible') {
          prefetchAll();
        }
      }, 60000); // 60 seconds
    } else {
      clearAll();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, prefetchAll, clearAll]);

  // Stable context value — never changes reference, prevents consumer re-renders
  const value = useMemo(() => ({
    getCached,
    setCached,
    isFresh,
    invalidate,
    clearAll,
    prefetchAll,
    subscribe,
  }), [getCached, setCached, isFresh, invalidate, clearAll, prefetchAll, subscribe]);

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

/**
 * Hook: Fetch data with cache. Returns [data, loading, refetch].
 * Uses subscription pattern so only the component using this key re-renders,
 * NOT the entire provider tree.
 */
export const useCachedFetch = (key, fetchFn, deps = []) => {
  const { getCached, isFresh, setCached, subscribe } = useDataCache();

  const cachedData = getCached(key);
  const [data, setData] = useState(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  // Subscribe to cache updates for this key
  useEffect(() => {
    return subscribe(key, (newData) => {
      if (newData !== undefined) {
        setData(newData);
        setLoading(false);
      }
    });
  }, [key, subscribe]);

  const refetch = useCallback(async (signal) => {
    try {
      const result = await fetchFn(signal);
      setCached(key, result);
      return result;
    } catch (e) {
      if (!signal?.aborted) {
        setLoading(false);
        console.error(`Cache fetch error [${key}]:`, e);
      }
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCached, ...deps]);

  useEffect(() => {
    const controller = new AbortController();
    const fresh = isFresh(key);
    const cached = getCached(key);

    if (cached && fresh) {
      setData(cached);
      setLoading(false);
    } else if (cached && !fresh) {
      setData(cached);
      setLoading(false);
      refetch(controller.signal);
    } else {
      setLoading(true);
      refetch(controller.signal);
    }

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refetch]);

  return [data, loading, refetch];
};
