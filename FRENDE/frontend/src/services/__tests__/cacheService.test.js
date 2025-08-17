import cacheService from '../cacheService.js';
import { CACHE_CONFIG } from '../cacheService.js';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
};

global.indexedDB = mockIndexedDB;

describe('CacheService', () => {
  beforeEach(() => {
    // Reset cache service
    cacheService.memoryCache.clear();
    cacheService.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    // Mock IndexedDB
    mockIndexedDB.open.mockResolvedValue({
      objectStoreNames: ['api_cache'],
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        }),
        done: Promise.resolve(),
      }),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate cache key from URL', () => {
      const key = cacheService.generateKey('/api/tasks');
      expect(key).toBe('/api/tasks');
    });

    it('should generate cache key from URL with params', () => {
      const key = cacheService.generateKey('/api/tasks', { limit: 10, page: 1 });
      expect(key).toBe('/api/tasks?limit=10&page=1');
    });

    it('should sort params alphabetically', () => {
      const key = cacheService.generateKey('/api/tasks', { page: 1, limit: 10 });
      expect(key).toBe('/api/tasks?limit=10&page=1');
    });
  });

  describe('set and get', () => {
    it('should set and get data from memory cache', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await cacheService.set(key, data);
      const result = await cacheService.get(key);
      
      expect(result).toEqual(data);
      expect(cacheService.metrics.sets).toBe(1);
      expect(cacheService.metrics.hits).toBe(1);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent');
      expect(result).toBeNull();
      expect(cacheService.metrics.misses).toBe(1);
    });

    it('should handle expired entries', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      // Set with very short TTL
      await cacheService.set(key, data, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheService.get(key);
      expect(result).toBeNull();
      expect(cacheService.metrics.misses).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete data from cache', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await cacheService.set(key, data);
      await cacheService.delete(key);
      
      const result = await cacheService.get(key);
      expect(result).toBeNull();
      expect(cacheService.metrics.deletes).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all cache data', async () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const data = { test: 'data' };
      
      await cacheService.set(key1, data);
      await cacheService.set(key2, data);
      
      await cacheService.clear();
      
      const result1 = await cacheService.get(key1);
      const result2 = await cacheService.get(key2);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(cacheService.memoryCache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when cache is full', async () => {
      const maxSize = CACHE_CONFIG.MEMORY_CACHE_SIZE;
      
      // Fill cache to capacity
      for (let i = 0; i < maxSize; i++) {
        await cacheService.set(`key-${i}`, { data: i });
      }
      
      // Add one more entry
      await cacheService.set('new-key', { data: 'new' });
      
      // Oldest entry should be evicted
      const oldestResult = await cacheService.get('key-0');
      expect(oldestResult).toBeNull();
      
      // New entry should be available
      const newResult = await cacheService.get('new-key');
      expect(newResult).toEqual({ data: 'new' });
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('memoryMaxSize');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should calculate hit rate correctly', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      await cacheService.set(key, data);
      await cacheService.get(key); // Hit
      await cacheService.get('non-existent'); // Miss
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit, 1 miss
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate cache entries matching pattern', async () => {
      const key1 = '/api/tasks/123';
      const key2 = '/api/tasks/456';
      const key3 = '/api/users/123';
      const data = { test: 'data' };
      
      await cacheService.set(key1, data);
      await cacheService.set(key2, data);
      await cacheService.set(key3, data);
      
      await cacheService.invalidatePattern('/api/tasks');
      
      const result1 = await cacheService.get(key1);
      const result2 = await cacheService.get(key2);
      const result3 = await cacheService.get(key3);
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual(data); // Should still be available
    });
  });

  describe('preload', () => {
    it('should preload data into cache', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'preloaded' }),
      });
      
      const urls = [
        { url: '/api/tasks', params: { limit: 10 }, ttl: 60000 },
        { url: '/api/users', params: {}, ttl: 300000 },
      ];
      
      await cacheService.preload(urls);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      
      const result1 = await cacheService.get('/api/tasks?limit=10');
      const result2 = await cacheService.get('/api/users');
      
      expect(result1).toEqual({ data: 'preloaded' });
      expect(result2).toEqual({ data: 'preloaded' });
    });
  });

  describe('error handling', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      // Mock IndexedDB error
      mockIndexedDB.open.mockRejectedValue(new Error('IndexedDB error'));
      
      // Should not throw error
      await expect(cacheService.init()).resolves.not.toThrow();
      
      // Should increment error count
      expect(cacheService.metrics.errors).toBeGreaterThan(0);
    });

    it('should handle cache operation errors', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      // Mock IndexedDB error for set operation
      cacheService.db = null;
      
      // Should not throw error
      await expect(cacheService.set(key, data)).resolves.not.toThrow();
      
      // Should increment error count
      expect(cacheService.metrics.errors).toBeGreaterThan(0);
    });
  });
});
