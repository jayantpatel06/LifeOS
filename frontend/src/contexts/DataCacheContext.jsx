import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

const DataCacheContext = createContext(null);

const STALE_MS = 30_000; // Data older than 30s is considered stale

export const DataCacheProvider = ({ children }) => {
  const { api, isAuthenticated, token, user } = useAuth();
  const cacheRef = useRef({});  // { [key]: { data, timestamp } }
  // Subscribers: page components register to get notified of cache updates for their key
  const subscribersRef = useRef(new Map()); // Map<key, Set<callback>>

  const lastSyncRef = useRef(null);

  // Helper to get local storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `lifeos_data_cache_${user.id}` : null;
  }, [user?.id]);

  // Notify subscribers for a specific key (not the whole tree)
  const notifyKey = useCallback((key) => {
    const subs = subscribersRef.current.get(key);
    if (subs) {
      subs.forEach(cb => cb(cacheRef.current[key]?.data));
    }
  }, []);

  // Subscribe to cache updates for a specific key
  const subscribe = useCallback((key, callback) => {
    if (!subscribersRef.current.has(key)) {
      subscribersRef.current.set(key, new Set());
    }
    subscribersRef.current.get(key).add(callback);
    return () => subscribersRef.current.get(key)?.delete(callback);
  }, []);

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
      } catch {
      }
    }
  }, [getStorageKey, notifyKey]);

  // Get cached data
  const getCached = useCallback((key) => {
    const entry = cacheRef.current[key];
    if (!entry) return null;
    return entry.data;
  }, []);

  const getCacheTimestamp = useCallback((key) => {
    const entry = cacheRef.current[key];
    return entry?.timestamp || 0;
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
      } catch {
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
    } catch {
    }
  }, []);

  // Prefetch core data in a single request after auth
  const prefetchAll = useCallback(async () => {
    if (!api) return;
    try {
      const requestStartedAt = Date.now();
      const isDeltaSync = !!lastSyncRef.current;
      const url = isDeltaSync 
        ? `/preload?since=${encodeURIComponent(lastSyncRef.current)}` 
        : '/preload';
        
      const res = await api.get(url);
      const { tasks, notes, budget_sheets, server_time } = res.data;
      const now = Date.now();
      
      const tasksModifiedDuringRequest = getCacheTimestamp('tasks') > requestStartedAt;
      const notesModifiedDuringRequest = getCacheTimestamp('notes') > requestStartedAt;
      const sheetsModifiedDuringRequest = getCacheTimestamp('budget_sheets') > requestStartedAt;

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
          ...(tasksModifiedDuringRequest ? {} : {
            tasks: {
              data: mergeArr(existingTasks, tasks).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)),
              timestamp: now,
            },
          }),
          ...(notesModifiedDuringRequest ? {} : {
            notes: {
              data: mergeArr(existingNotes, notes).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)),
              timestamp: now,
            },
          }),
          ...(sheetsModifiedDuringRequest ? {} : {
            budget_sheets: {
              data: mergeArr(existingSheets, budget_sheets).sort((a,b) => a.order - b.order),
              timestamp: now,
            },
          }),
        };
      } else {
        // Full sync
        cacheRef.current = {
          ...cacheRef.current,
          ...(tasksModifiedDuringRequest ? {} : { tasks: { data: tasks, timestamp: now } }),
          ...(notesModifiedDuringRequest ? {} : { notes: { data: notes, timestamp: now } }),
          ...(sheetsModifiedDuringRequest ? {} : { budget_sheets: { data: budget_sheets, timestamp: now } }),
        };
      }
      
      const hasConcurrentLocalWrites =
        tasksModifiedDuringRequest ||
        notesModifiedDuringRequest ||
        sheetsModifiedDuringRequest;

      if (server_time && !hasConcurrentLocalWrites) {
        lastSyncRef.current = server_time;
      }
      
      // Notify all prefetched keys
      notifyKey('tasks');
      notifyKey('notes');
      notifyKey('budget_sheets');

      // Prefetch settings data in the background (fire-and-forget)
      // This prevents the Settings page from blocking on a heavy network request locally
      if (!isDeltaSync && window._settingsPrefetched !== requestStartedAt) {
        window._settingsPrefetched = requestStartedAt;
        Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/activity?days=365')
        ]).then(([statsRes, activityRes]) => {
          cacheRef.current = {
            ...cacheRef.current,
            settingsData: {
              data: {
                activityData: activityRes.data,
                stats: statsRes.data,
              },
              timestamp: Date.now()
            }
          };
          notifyKey('settingsData');
        }).catch(() => {});
      }

      const storageKey = getStorageKey();
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(cacheRef.current));
          if (server_time && !hasConcurrentLocalWrites) {
            localStorage.setItem(`${storageKey}_sync`, server_time);
          }
        } catch {
        }
      }
    } catch {
    }
  }, [api, notifyKey, getStorageKey, getCacheTimestamp]);

  // Auto-prefetch when user becomes authenticated, and sync every 60 seconds
  useEffect(() => {
    let interval;
    if (isAuthenticated && token) {
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
  }, [isAuthenticated, token, prefetchAll, clearAll]);

  // Stable context value — never changes reference, prevents consumer re-renders
  const value = useMemo(() => ({
    getCached,
    getCacheTimestamp,
    setCached,
    isFresh,
    invalidate,
    clearAll,
    prefetchAll,
    subscribe,
  }), [getCached, getCacheTimestamp, setCached, isFresh, invalidate, clearAll, prefetchAll, subscribe]);

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
 * Custom hook to fetch data with a built-in stale-while-revalidate caching strategy.
 * 
 * **Mechanics**:
 * 1. **Subscription**: Subscribes to changes for a specific `key`. When the provider's `cacheRef` updates,
 *    only components subscribed to this specific key will re-render (avoids full tree re-renders).
 * 2. **Stale-time**: Checks if the data for `key` is fresh (`isFresh()`). If so, returns cached data instantly
 *    without triggering a network request.
 * 3. **Sync**: If stale or missing, calls `fetchFn` to fetch new data from the backend, updates the
 *    cache via `setCached`, and triggers an update.
 * 
 * @param {string} key - Unique cache key for this data (e.g., 'notes', 'tasks').
 * @param {Function} fetchFn - Async function returning the data to cache.
 * @param {Array} deps - Dependency array to trigger refetches.
 * @returns {[any, boolean, Function]} - Returns `[data, loading, refetch]`.
 */
export const useCachedFetch = (key, fetchFn, deps = []) => {
  const { getCached, getCacheTimestamp, isFresh, setCached, subscribe } = useDataCache();

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
      const requestStartedAt = Date.now();
      const result = await fetchFn(signal);
      if (getCacheTimestamp(key) > requestStartedAt) {
        return getCached(key);
      }
      setCached(key, result);
      return result;
    } catch {
      if (!signal?.aborted) {
        setLoading(false);
      }
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCached, getCacheTimestamp, getCached, ...deps]);

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
