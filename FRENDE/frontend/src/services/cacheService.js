import { openDB } from 'idb';

const CACHE_DB_NAME = 'FrendeCacheDB';
const CACHE_DB_VERSION = 2; // Increment version for new features
const CACHE_STORE_NAME = 'api_cache';
const ANALYTICS_STORE_NAME = 'cache_analytics';

// Cache configuration
const CACHE_CONFIG = {
  // In-memory cache settings
  MEMORY_CACHE_SIZE: 100,
  MEMORY_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  // IndexedDB cache settings
  INDEXEDDB_CACHE_SIZE: 1000,
  INDEXEDDB_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  
  // Cache cleanup interval
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  
  // Background refresh settings
  BACKGROUND_REFRESH_ENABLED: true,
  BACKGROUND_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  
  // Stale-while-revalidate settings
  STALE_WHILE_REVALIDATE_ENABLED: true,
  STALE_WHILE_REVALIDATE_TTL: 60 * 1000, // 1 minute
  
  // Cache warming settings
  CACHE_WARMING_ENABLED: true,
  CACHE_WARMING_DELAY: 1000, // 1 second
  
  // Analytics settings
  ANALYTICS_ENABLED: true,
  ANALYTICS_RETENTION_DAYS: 30,
};

class CacheEntry {
  constructor(key, data, ttl = CACHE_CONFIG.MEMORY_CACHE_TTL) {
    this.key = key;
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
    this.staleWhileRevalidate = false;
    this.backgroundRefresh = false;
    this.compressed = false;
  }

  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }

  isStale() {
    return Date.now() - this.lastAccessed > this.ttl * 2;
  }

  isStaleWhileRevalidate() {
    return this.staleWhileRevalidate && (Date.now() - this.timestamp > this.ttl + CACHE_CONFIG.STALE_WHILE_REVALIDATE_TTL);
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }

  markForBackgroundRefresh() {
    this.backgroundRefresh = true;
  }
}

class CacheAnalytics {
  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      backgroundRefreshes: 0,
      staleWhileRevalidate: 0,
      compressions: 0,
      decompressions: 0,
    };
    this.performance = {
      averageGetTime: 0,
      averageSetTime: 0,
      totalGetTime: 0,
      totalSetTime: 0,
      getCount: 0,
      setCount: 0,
    };
  }

  recordHit() {
    this.metrics.hits++;
  }

  recordMiss() {
    this.metrics.misses++;
  }

  recordSet() {
    this.metrics.sets++;
  }

  recordDelete() {
    this.metrics.deletes++;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordBackgroundRefresh() {
    this.metrics.backgroundRefreshes++;
  }

  recordStaleWhileRevalidate() {
    this.metrics.staleWhileRevalidate++;
  }

  recordCompression() {
    this.metrics.compressions++;
  }

  recordDecompression() {
    this.metrics.decompressions++;
  }

  recordGetTime(time) {
    this.performance.totalGetTime += time;
    this.performance.getCount++;
    this.performance.averageGetTime = this.performance.totalGetTime / this.performance.getCount;
  }

  recordSetTime(time) {
    this.performance.totalSetTime += time;
    this.performance.setCount++;
    this.performance.averageSetTime = this.performance.totalSetTime / this.performance.setCount;
  }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  getStats() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      performance: this.performance,
    };
  }

  reset() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      backgroundRefreshes: 0,
      staleWhileRevalidate: 0,
      compressions: 0,
      decompressions: 0,
    };
    this.performance = {
      averageGetTime: 0,
      averageSetTime: 0,
      totalGetTime: 0,
      totalSetTime: 0,
      getCount: 0,
      setCount: 0,
    };
  }
}

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.db = null;
    this.isInitialized = false;
    this.cleanupInterval = null;
    this.backgroundRefreshInterval = null;
    this.analytics = new CacheAnalytics();
    this.backgroundRefreshQueue = new Map();
    this.cacheWarmingQueue = new Map();
    
    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB with new version
      this.db = await openDB(CACHE_DB_NAME, CACHE_DB_VERSION, {
        upgrade: (db, oldVersion, newVersion) => {
          // Create cache store
          if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
            const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
            store.createIndex('staleWhileRevalidate', 'staleWhileRevalidate', { unique: false });
            store.createIndex('backgroundRefresh', 'backgroundRefresh', { unique: false });
          }
          
          // Create analytics store
          if (!db.objectStoreNames.contains(ANALYTICS_STORE_NAME)) {
            const analyticsStore = db.createObjectStore(ANALYTICS_STORE_NAME, { keyPath: 'date' });
            analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      });

      // Start intervals
      this.startCleanupInterval();
      this.startBackgroundRefreshInterval();
      
      this.isInitialized = true;
      console.log('Enhanced cache service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize enhanced cache service:', error);
      this.analytics.recordError();
    }
  }

  // Generate cache key from URL and parameters
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${url}${sortedParams ? '?' + sortedParams : ''}`;
  }

  // Compress data for storage
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 1024) { // Only compress if larger than 1KB
        const compressed = btoa(jsonString);
        this.analytics.recordCompression();
        return { compressed: true, data: compressed };
      }
      return { compressed: false, data: jsonString };
    } catch (error) {
      console.warn('Compression failed:', error);
      return { compressed: false, data: JSON.stringify(data) };
    }
  }

  // Decompress data from storage
  decompressData(compressedData) {
    try {
      if (compressedData.compressed) {
        const decompressed = atob(compressedData.data);
        this.analytics.recordDecompression();
        return JSON.parse(decompressed);
      }
      return JSON.parse(compressedData.data);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return null;
    }
  }

  // Get data from cache with enhanced strategies
  async get(key, options = {}) {
    const startTime = performance.now();
    
    try {
      const {
        useStaleWhileRevalidate = CACHE_CONFIG.STALE_WHILE_REVALIDATE_ENABLED,
        backgroundRefresh = false,
        forceRefresh = false
      } = options;

      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !memoryEntry.isExpired()) {
        memoryEntry.touch();
        this.analytics.recordHit();
        this.analytics.recordGetTime(performance.now() - startTime);
        return memoryEntry.data;
      }

      // Remove expired entry from memory
      if (memoryEntry && memoryEntry.isExpired()) {
        this.memoryCache.delete(key);
      }

      // Check IndexedDB cache
      if (this.db) {
        const dbEntry = await this.db.get(CACHE_STORE_NAME, key);
        if (dbEntry && !this.isExpired(dbEntry)) {
          // Decompress data if needed
          const decompressedData = this.decompressData(dbEntry);
          if (decompressedData) {
            // Move to memory cache for faster access
            const entry = new CacheEntry(key, decompressedData, dbEntry.ttl);
            entry.staleWhileRevalidate = dbEntry.staleWhileRevalidate;
            entry.backgroundRefresh = dbEntry.backgroundRefresh;
            this.setInMemory(key, entry);
            
            // Update last accessed time
            await this.updateLastAccessed(key);
            
            this.analytics.recordHit();
            this.analytics.recordGetTime(performance.now() - startTime);
            
            // Handle stale-while-revalidate
            if (useStaleWhileRevalidate && entry.isStaleWhileRevalidate()) {
              this.analytics.recordStaleWhileRevalidate();
              this.queueBackgroundRefresh(key, options);
            }
            
            return decompressedData;
          }
        }
      }

      this.analytics.recordMiss();
      this.analytics.recordGetTime(performance.now() - startTime);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.analytics.recordError();
      this.analytics.recordGetTime(performance.now() - startTime);
      return null;
    }
  }

  // Set data in cache with enhanced features
  async set(key, data, ttl = CACHE_CONFIG.MEMORY_CACHE_TTL, options = {}) {
    const startTime = performance.now();
    
    try {
      const {
        staleWhileRevalidate = false,
        backgroundRefresh = false,
        compress = true
      } = options;

      const entry = new CacheEntry(key, data, ttl);
      entry.staleWhileRevalidate = staleWhileRevalidate;
      entry.backgroundRefresh = backgroundRefresh;
      
      // Set in memory cache
      this.setInMemory(key, entry);
      
      // Set in IndexedDB cache for persistence
      if (this.db) {
        const compressedData = compress ? this.compressData(data) : { compressed: false, data: JSON.stringify(data) };
        
        await this.db.put(CACHE_STORE_NAME, {
          key,
          data: compressedData.data,
          compressed: compressedData.compressed,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed,
          staleWhileRevalidate: entry.staleWhileRevalidate,
          backgroundRefresh: entry.backgroundRefresh
        });
      }
      
      this.analytics.recordSet();
      this.analytics.recordSetTime(performance.now() - startTime);
    } catch (error) {
      console.error('Cache set error:', error);
      this.analytics.recordError();
      this.analytics.recordSetTime(performance.now() - startTime);
    }
  }

  // Queue background refresh
  queueBackgroundRefresh(key, options) {
    if (!CACHE_CONFIG.BACKGROUND_REFRESH_ENABLED) return;
    
    this.backgroundRefreshQueue.set(key, {
      options,
      timestamp: Date.now()
    });
  }

  // Process background refresh queue
  async processBackgroundRefreshQueue() {
    if (this.backgroundRefreshQueue.size === 0) return;

    const now = Date.now();
    const toProcess = [];

    for (const [key, item] of this.backgroundRefreshQueue) {
      if (now - item.timestamp > CACHE_CONFIG.BACKGROUND_REFRESH_INTERVAL) {
        toProcess.push({ key, options: item.options });
        this.backgroundRefreshQueue.delete(key);
      }
    }

    for (const { key, options } of toProcess) {
      try {
        // This would typically trigger a new API call
        // For now, we'll just mark it as processed
        this.analytics.recordBackgroundRefresh();
        console.log(`Background refresh processed for key: ${key}`);
      } catch (error) {
        console.error(`Background refresh failed for key ${key}:`, error);
      }
    }
  }

  // Cache warming functionality
  async warmCache(urls) {
    if (!CACHE_CONFIG.CACHE_WARMING_ENABLED) return;

    const promises = urls.map(async ({ url, params, ttl, options }) => {
      const key = this.generateKey(url, params);
      
      // Check if already cached
      const cached = await this.get(key);
      if (cached) return { url, success: true, fromCache: true };

      // Queue for warming
      this.cacheWarmingQueue.set(key, {
        url,
        params,
        ttl,
        options,
        timestamp: Date.now()
      });

      return { url, success: true, queued: true };
    });

    return Promise.all(promises);
  }

  // Process cache warming queue
  async processCacheWarmingQueue() {
    if (this.cacheWarmingQueue.size === 0) return;

    const now = Date.now();
    const toProcess = [];

    for (const [key, item] of this.cacheWarmingQueue) {
      if (now - item.timestamp > CACHE_CONFIG.CACHE_WARMING_DELAY) {
        toProcess.push({ key, ...item });
        this.cacheWarmingQueue.delete(key);
      }
    }

    for (const { key, url, params, ttl, options } of toProcess) {
      try {
        // This would typically make an API call
        // For now, we'll simulate it
        console.log(`Cache warming for key: ${key}`);
      } catch (error) {
        console.error(`Cache warming failed for key ${key}:`, error);
      }
    }
  }

  // Set data in memory cache with LRU eviction
  setInMemory(key, entry) {
    // Remove expired entries first
    this.cleanupMemoryCache();
    
    // If cache is full, remove least recently used entry
    if (this.memoryCache.size >= CACHE_CONFIG.MEMORY_CACHE_SIZE) {
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [cacheKey, cacheEntry] of this.memoryCache) {
        if (cacheEntry.lastAccessed < oldestTime) {
          oldestTime = cacheEntry.lastAccessed;
          oldestKey = cacheKey;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    this.memoryCache.set(key, entry);
  }

  // Delete data from cache
  async delete(key) {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from IndexedDB cache
      if (this.db) {
        await this.db.delete(CACHE_STORE_NAME, key);
      }
      
      // Remove from background refresh queue
      this.backgroundRefreshQueue.delete(key);
      
      // Remove from cache warming queue
      this.cacheWarmingQueue.delete(key);
      
      this.analytics.recordDelete();
    } catch (error) {
      console.error('Cache delete error:', error);
      this.analytics.recordError();
    }
  }

  // Clear all cache data
  async clear() {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear IndexedDB cache
      if (this.db) {
        await this.db.clear(CACHE_STORE_NAME);
      }
      
      // Clear queues
      this.backgroundRefreshQueue.clear();
      this.cacheWarmingQueue.clear();
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Cache clear error:', error);
      this.analytics.recordError();
    }
  }

  // Check if entry is expired
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Update last accessed time in IndexedDB
  async updateLastAccessed(key) {
    try {
      if (this.db) {
        const entry = await this.db.get(CACHE_STORE_NAME, key);
        if (entry) {
          entry.lastAccessed = Date.now();
          entry.accessCount++;
          await this.db.put(CACHE_STORE_NAME, entry);
        }
      }
    } catch (error) {
      console.error('Failed to update last accessed time:', error);
    }
  }

  // Cleanup expired entries from memory cache
  cleanupMemoryCache() {
    for (const [key, entry] of this.memoryCache) {
      if (entry.isExpired()) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Cleanup expired entries from IndexedDB cache
  async cleanupIndexedDBCache() {
    try {
      if (!this.db) return;

      const tx = this.db.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const index = store.index('timestamp');
      
      const cutoffTime = Date.now() - CACHE_CONFIG.INDEXEDDB_CACHE_TTL;
      const expiredKeys = await index.getAllKeys(IDBKeyRange.upperBound(cutoffTime));
      
      for (const key of expiredKeys) {
        await store.delete(key);
      }
      
      await tx.done;
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }

  // Start cleanup interval
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
      this.cleanupIndexedDBCache();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  // Start background refresh interval
  startBackgroundRefreshInterval() {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }
    
    this.backgroundRefreshInterval = setInterval(() => {
      this.processBackgroundRefreshQueue();
      this.processCacheWarmingQueue();
    }, CACHE_CONFIG.BACKGROUND_REFRESH_INTERVAL);
  }

  // Stop all intervals
  stopIntervals() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryMaxSize: CACHE_CONFIG.MEMORY_CACHE_SIZE,
      backgroundRefreshQueueSize: this.backgroundRefreshQueue.size,
      cacheWarmingQueueSize: this.cacheWarmingQueue.size,
      ...this.analytics.getStats()
    };
  }

  // Get cache size
  async getCacheSize() {
    try {
      if (this.db) {
        return await this.db.count(CACHE_STORE_NAME);
      }
      return 0;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  // Preload data into cache
  async preload(urls) {
    try {
      const promises = urls.map(async ({ url, params, ttl, options }) => {
        const key = this.generateKey(url, params);
        const response = await fetch(url, { params });
        if (response.ok) {
          const data = await response.json();
          await this.set(key, data, ttl, options);
        }
      });
      
      await Promise.all(promises);
      console.log(`Preloaded ${urls.length} items into cache`);
    } catch (error) {
      console.error('Cache preload error:', error);
    }
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern) {
    try {
      // Clear memory cache entries matching pattern
      for (const [key] of this.memoryCache) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }
      
      // Clear IndexedDB cache entries matching pattern
      if (this.db) {
        const tx = this.db.transaction(CACHE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const allKeys = await store.getAllKeys();
        
        for (const key of allKeys) {
          if (key.includes(pattern)) {
            await store.delete(key);
          }
        }
        
        await tx.done;
      }
      
      console.log(`Invalidated cache entries matching pattern: ${pattern}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Save analytics to IndexedDB
  async saveAnalytics() {
    if (!CACHE_CONFIG.ANALYTICS_ENABLED || !this.db) return;

    try {
      const date = new Date().toISOString().split('T')[0];
      const stats = this.analytics.getStats();
      
      await this.db.put(ANALYTICS_STORE_NAME, {
        date,
        timestamp: Date.now(),
        stats
      });
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }

  // Get analytics history
  async getAnalyticsHistory(days = 7) {
    if (!CACHE_CONFIG.ANALYTICS_ENABLED || !this.db) return [];

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const tx = this.db.transaction(ANALYTICS_STORE_NAME, 'readonly');
      const store = tx.objectStore(ANALYTICS_STORE_NAME);
      const index = store.index('timestamp');
      
      const analytics = await index.getAll(IDBKeyRange.lowerBound(cutoffDate.getTime()));
      return analytics;
    } catch (error) {
      console.error('Failed to get analytics history:', error);
      return [];
    }
  }

  // Destroy cache service
  destroy() {
    this.stopIntervals();
    this.memoryCache.clear();
    this.backgroundRefreshQueue.clear();
    this.cacheWarmingQueue.clear();
    this.db = null;
    this.isInitialized = false;
    
    // Save final analytics
    this.saveAnalytics();
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
export { CACHE_CONFIG };
