import { useState, useEffect, useCallback, useRef } from 'react';
import cacheService from '../services/cacheService.js';
import { getTTL, getStrategy, isCachingEnabled } from '../config/cacheConfig.js';
import { getCacheStrategy } from '../services/cacheStrategies.js';

// Hook for cache-aware data fetching
export const useCachedData = (url, options = {}) => {
  const {
    dataType = 'default',
    ttl = null,
    strategy = 'cache-first',
    refreshInterval = null,
    enabled = true,
    onSuccess = null,
    onError = null,
    onCacheHit = null,
    onCacheMiss = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const refreshTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Generate cache key
  const cacheKey = cacheService.generateKey(url, options.params);

  // Get TTL for this data type
  const effectiveTTL = ttl || getTTL(dataType);

  // Fetch data from network
  const fetchFromNetwork = useCallback(async (signal) => {
    try {
      const response = await fetch(url, {
        ...options.fetchOptions,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Cache the response
      if (isCachingEnabled()) {
        await cacheService.set(cacheKey, responseData, effectiveTTL);
      }

      return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }, [url, cacheKey, effectiveTTL, options.fetchOptions]);

  // Load data based on strategy
  const loadData = useCallback(async (signal) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      let result = null;
      let fromCache = false;

      // Check cache first based on strategy
      if (isCachingEnabled() && strategy !== 'network-only') {
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData) {
          result = cachedData;
          fromCache = true;
          onCacheHit?.(cachedData);
        }
      }

      // If no cached data or network-first strategy, fetch from network
      if (!result && strategy !== 'cache-only') {
        result = await fetchFromNetwork(signal);
        onCacheMiss?.(result);
      }

      if (result) {
        setData(result);
        setIsFromCache(fromCache);
        setLastUpdated(Date.now());
        onSuccess?.(result, fromCache);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message);
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, strategy, cacheKey, fetchFromNetwork, onSuccess, onError, onCacheHit, onCacheMiss]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    await loadData(abortControllerRef.current.signal);
  }, [loadData]);

  // Stale-while-revalidate refresh
  const backgroundRefresh = useCallback(async () => {
    if (!isFromCache) return;

    try {
      const freshData = await fetchFromNetwork();
      if (freshData) {
        setData(freshData);
        setIsFromCache(false);
        setLastUpdated(Date.now());
        onSuccess?.(freshData, false);
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }, [isFromCache, fetchFromNetwork, onSuccess]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && enabled) {
      refreshTimerRef.current = setInterval(refresh, refreshInterval);
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [refreshInterval, enabled, refresh]);

  // Setup background refresh for stale-while-revalidate
  useEffect(() => {
    if (strategy === 'stale-while-revalidate' && isFromCache) {
      const timer = setTimeout(backgroundRefresh, 1000);
      return () => clearTimeout(timer);
    }
  }, [strategy, isFromCache, backgroundRefresh]);

  // Initial load
  useEffect(() => {
    if (enabled) {
      loadData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, loadData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    lastUpdated,
    refresh,
    backgroundRefresh,
  };
};

// Hook for cache status monitoring
export const useCacheStatus = () => {
  const [stats, setStats] = useState(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);

  const updateStats = useCallback(async () => {
    try {
      const cacheStats = cacheService.getStats();
      const size = await cacheService.getCacheSize();
      
      setStats(cacheStats);
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updateStats();
    
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  const clearCache = useCallback(async () => {
    try {
      await cacheService.clear();
      await updateStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [updateStats]);

  return {
    stats,
    cacheSize,
    loading,
    clearCache,
    refresh: updateStats,
  };
};

// Hook for cache invalidation
export const useCacheInvalidation = () => {
  const [invalidating, setInvalidating] = useState(false);

  const invalidatePattern = useCallback(async (pattern) => {
    setInvalidating(true);
    try {
      await cacheService.invalidatePattern(pattern);
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      throw error;
    } finally {
      setInvalidating(false);
    }
  }, []);

  const invalidateByType = useCallback(async (dataType) => {
    setInvalidating(true);
    try {
      const strategy = getCacheStrategy(`/api/${dataType}`);
      for (const pattern of strategy.invalidatePatterns) {
        await cacheService.invalidatePattern(pattern);
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      throw error;
    } finally {
      setInvalidating(false);
    }
  }, []);

  const invalidateAll = useCallback(async () => {
    setInvalidating(true);
    try {
      await cacheService.clear();
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      throw error;
    } finally {
      setInvalidating(false);
    }
  }, []);

  return {
    invalidating,
    invalidatePattern,
    invalidateByType,
    invalidateAll,
  };
};

// Hook for cache preloading
export const useCachePreload = () => {
  const [preloading, setPreloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const preloadData = useCallback(async (urls) => {
    setPreloading(true);
    setProgress(0);

    try {
      const total = urls.length;
      let completed = 0;

      const promises = urls.map(async ({ url, params, ttl }) => {
        const key = cacheService.generateKey(url, params);
        const response = await fetch(url, { params });
        
        if (response.ok) {
          const data = await response.json();
          await cacheService.set(key, data, ttl);
        }
        
        completed++;
        setProgress((completed / total) * 100);
      });

      await Promise.all(promises);
      setProgress(100);
    } catch (error) {
      console.error('Cache preload failed:', error);
      throw error;
    } finally {
      setPreloading(false);
    }
  }, []);

  return {
    preloading,
    progress,
    preloadData,
  };
};

// Hook for cache-aware API calls
export const useCachedAPI = (baseURL) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const get = useCallback(async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    const cacheKey = cacheService.generateKey(url, options.params);
    
    // Check cache first
    if (isCachingEnabled()) {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Fetch from network
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      if (isCachingEnabled()) {
        const ttl = options.ttl || getTTL(options.dataType || 'default');
        await cacheService.set(cacheKey, data, ttl);
      }

      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  const post = useCallback(async (endpoint, data, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Invalidate related cache
      if (isCachingEnabled()) {
        const strategy = getCacheStrategy(url);
        for (const pattern of strategy.invalidatePatterns) {
          await cacheService.invalidatePattern(pattern);
        }
      }

      return responseData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  const put = useCallback(async (endpoint, data, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Invalidate related cache
      if (isCachingEnabled()) {
        const strategy = getCacheStrategy(url);
        for (const pattern of strategy.invalidatePatterns) {
          await cacheService.invalidatePattern(pattern);
        }
      }

      return responseData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  const del = useCallback(async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Invalidate related cache
      if (isCachingEnabled()) {
        const strategy = getCacheStrategy(url);
        for (const pattern of strategy.invalidatePatterns) {
          await cacheService.invalidatePattern(pattern);
        }
      }

      return responseData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseURL]);

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
  };
};
