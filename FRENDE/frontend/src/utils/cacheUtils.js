import cacheService from '../services/cacheService.js';
import { getCacheStrategy, CACHE_STRATEGIES } from '../services/cacheStrategies.js';
import { isCachingEnabled } from '../config/cacheConfig.js';

/**
 * Cache utility functions for debugging, optimization, and management
 */

// Cache debugging utilities
export const cacheDebug = {
  // Enable debug mode
  enable: () => {
    if (typeof window !== 'undefined') {
      window.__CACHE_DEBUG__ = true;
      console.log('Cache debug mode enabled');
    }
  },

  // Disable debug mode
  disable: () => {
    if (typeof window !== 'undefined') {
      window.__CACHE_DEBUG__ = false;
      console.log('Cache debug mode disabled');
    }
  },

  // Check if debug mode is enabled
  isEnabled: () => {
    return typeof window !== 'undefined' && window.__CACHE_DEBUG__ === true;
  },

  // Log cache operation
  log: (operation, data = {}) => {
    if (cacheDebug.isEnabled()) {
      console.log(`[Cache Debug] ${operation}:`, data);
    }
  },

  // Log cache hit
  logHit: (key, data) => {
    cacheDebug.log('HIT', { key, dataSize: JSON.stringify(data).length });
  },

  // Log cache miss
  logMiss: (key) => {
    cacheDebug.log('MISS', { key });
  },

  // Log cache set
  logSet: (key, data, ttl) => {
    cacheDebug.log('SET', { key, dataSize: JSON.stringify(data).length, ttl });
  },

  // Log cache delete
  logDelete: (key) => {
    cacheDebug.log('DELETE', { key });
  }
};

// Cache performance utilities
export const cachePerformance = {
  // Measure cache operation time
  measure: async (operation, fn) => {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      cacheDebug.log('PERFORMANCE', { operation, duration: `${duration.toFixed(2)}ms` });
      return { result, duration };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      cacheDebug.log('PERFORMANCE_ERROR', { operation, duration: `${duration.toFixed(2)}ms`, error: error.message });
      throw error;
    }
  },

  // Get cache performance metrics
  getMetrics: () => {
    const stats = cacheService.getStats();
    return {
      hitRate: stats.hitRate,
      averageGetTime: stats.performance?.averageGetTime || 0,
      averageSetTime: stats.performance?.averageSetTime || 0,
      memoryUsage: (stats.memorySize / stats.memoryMaxSize) * 100,
      totalOperations: stats.hits + stats.misses + stats.sets + stats.deletes
    };
  },

  // Check if cache performance is acceptable
  isAcceptable: () => {
    const metrics = cachePerformance.getMetrics();
    return {
      hitRate: metrics.hitRate >= 0.7,
      getTime: metrics.averageGetTime <= 50,
      setTime: metrics.averageSetTime <= 100,
      memoryUsage: metrics.memoryUsage <= 90
    };
  }
};

// Cache optimization utilities
export const cacheOptimization = {
  // Optimize cache key
  optimizeKey: (url, params = {}) => {
    // Remove unnecessary parameters
    const essentialParams = {};
    const essentialKeys = ['id', 'type', 'limit', 'offset', 'sort'];
    
    for (const key of essentialKeys) {
      if (params[key] !== undefined) {
        essentialParams[key] = params[key];
      }
    }
    
    return cacheService.generateKey(url, essentialParams);
  },

  // Preload critical data
  preloadCritical: async () => {
    const criticalEndpoints = [
      '/api/users/profile',
      '/api/matches',
      '/api/tasks',
      '/api/coins/balance'
    ];

    const promises = criticalEndpoints.map(async (endpoint) => {
      try {
        const strategy = getCacheStrategy(endpoint);
        const key = cacheService.generateKey(endpoint);
        
        // Check if already cached
        const cached = await cacheService.get(key);
        if (cached) {
          cacheDebug.log('PRELOAD_SKIP', { endpoint, reason: 'already_cached' });
          return { endpoint, status: 'skipped' };
        }

        // Make request to preload
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          await cacheService.set(key, data, strategy.ttl, {
            staleWhileRevalidate: strategy.staleWhileRevalidate,
            backgroundRefresh: strategy.backgroundRefresh,
            compress: strategy.compress
          });
          
          cacheDebug.log('PRELOAD_SUCCESS', { endpoint });
          return { endpoint, status: 'success' };
        } else {
          cacheDebug.log('PRELOAD_FAILED', { endpoint, status: response.status });
          return { endpoint, status: 'failed', error: response.status };
        }
      } catch (error) {
        cacheDebug.log('PRELOAD_ERROR', { endpoint, error: error.message });
        return { endpoint, status: 'error', error: error.message };
      }
    });

    return Promise.all(promises);
  },

  // Warm cache based on user behavior
  warmUserBehavior: async (userActions = []) => {
    const warmingPromises = [];
    
    for (const action of userActions) {
      const { type, data } = action;
      
      switch (type) {
        case 'view_profile':
          warmingPromises.push(
            cacheOptimization.preloadEndpoint('/api/users/profile')
          );
          break;
          
        case 'view_matches':
          warmingPromises.push(
            cacheOptimization.preloadEndpoint('/api/matches')
          );
          break;
          
        case 'view_tasks':
          warmingPromises.push(
            cacheOptimization.preloadEndpoint('/api/tasks')
          );
          break;
          
        case 'view_chat':
          if (data?.matchId) {
            warmingPromises.push(
              cacheOptimization.preloadEndpoint(`/api/chat/${data.matchId}`)
            );
          }
          break;
      }
    }
    
    return Promise.all(warmingPromises);
  },

  // Preload single endpoint
  preloadEndpoint: async (endpoint, params = {}) => {
    try {
      const strategy = getCacheStrategy(endpoint);
      const key = cacheService.generateKey(endpoint, params);
      
      // Check if already cached
      const cached = await cacheService.get(key);
      if (cached) {
        return { endpoint, status: 'already_cached' };
      }

      // Make request
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        await cacheService.set(key, data, strategy.ttl, {
          staleWhileRevalidate: strategy.staleWhileRevalidate,
          backgroundRefresh: strategy.backgroundRefresh,
          compress: strategy.compress
        });
        
        return { endpoint, status: 'success' };
      } else {
        return { endpoint, status: 'failed', error: response.status };
      }
    } catch (error) {
      return { endpoint, status: 'error', error: error.message };
    }
  }
};

// Cache management utilities
export const cacheManagement = {
  // Clear cache by pattern
  clearByPattern: async (pattern) => {
    try {
      await cacheService.invalidatePattern(pattern);
      cacheDebug.log('CLEAR_PATTERN', { pattern });
      return { success: true, pattern };
    } catch (error) {
      cacheDebug.log('CLEAR_PATTERN_ERROR', { pattern, error: error.message });
      return { success: false, pattern, error: error.message };
    }
  },

  // Clear cache by type
  clearByType: async (type) => {
    const strategy = CACHE_STRATEGIES[type.toUpperCase()];
    if (!strategy) {
      throw new Error(`Unknown cache type: ${type}`);
    }

    const promises = strategy.invalidatePatterns.map(pattern => 
      cacheService.invalidatePattern(pattern)
    );

    try {
      await Promise.all(promises);
      cacheDebug.log('CLEAR_TYPE', { type });
      return { success: true, type };
    } catch (error) {
      cacheDebug.log('CLEAR_TYPE_ERROR', { type, error: error.message });
      return { success: false, type, error: error.message };
    }
  },

  // Clear all cache
  clearAll: async () => {
    try {
      await cacheService.clear();
      cacheDebug.log('CLEAR_ALL');
      return { success: true };
    } catch (error) {
      cacheDebug.log('CLEAR_ALL_ERROR', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  // Get cache size
  getSize: async () => {
    try {
      const size = await cacheService.getCacheSize();
      return { size };
    } catch (error) {
      return { size: 0, error: error.message };
    }
  },

  // Get cache statistics
  getStats: () => {
    return cacheService.getStats();
  },

  // Export cache data
  exportData: async () => {
    try {
      const stats = cacheService.getStats();
      const size = await cacheService.getCacheSize();
      
      return {
        stats,
        size,
        exportTime: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Cache validation utilities
export const cacheValidation = {
  // Validate cache entry
  validateEntry: (key, data) => {
    const issues = [];
    
    if (!key || typeof key !== 'string') {
      issues.push('Invalid key');
    }
    
    if (data === null || data === undefined) {
      issues.push('Data is null or undefined');
    }
    
    if (typeof data === 'object' && Object.keys(data).length === 0) {
      issues.push('Data is empty object');
    }
    
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1024 * 1024) { // 1MB
      issues.push('Data size too large');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },

  // Validate cache strategy
  validateStrategy: (strategy) => {
    const issues = [];
    
    if (!strategy.ttl || strategy.ttl <= 0) {
      issues.push('Invalid TTL');
    }
    
    if (!strategy.keyPattern) {
      issues.push('Missing key pattern');
    }
    
    if (!Array.isArray(strategy.invalidateOn)) {
      issues.push('Invalid invalidateOn array');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },

  // Validate cache configuration
  validateConfig: () => {
    const issues = [];
    
    if (!isCachingEnabled()) {
      issues.push('Caching is disabled');
    }
    
    // Add more validation as needed
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

// Cache monitoring utilities
export const cacheMonitoring = {
  // Monitor cache health
  checkHealth: async () => {
    const health = {
      status: 'healthy',
      issues: [],
      metrics: {}
    };

    try {
      // Check if cache service is initialized
      const stats = cacheService.getStats();
      health.metrics = stats;

      // Check hit rate
      if (stats.hitRate < 0.5) {
        health.issues.push('Low hit rate');
        health.status = 'warning';
      }

      // Check error rate
      const errorRate = stats.errors / (stats.hits + stats.misses + stats.sets + stats.deletes);
      if (errorRate > 0.1) {
        health.issues.push('High error rate');
        health.status = 'critical';
      }

      // Check memory usage
      const memoryUsage = stats.memorySize / stats.memoryMaxSize;
      if (memoryUsage > 0.9) {
        health.issues.push('High memory usage');
        health.status = 'warning';
      }

      // Check performance
      if (stats.performance?.averageGetTime > 100) {
        health.issues.push('Slow get operations');
        health.status = 'warning';
      }

    } catch (error) {
      health.status = 'critical';
      health.issues.push(`Cache service error: ${error.message}`);
    }

    return health;
  },

  // Get cache insights
  getInsights: () => {
    const stats = cacheService.getStats();
    const insights = [];

    // Hit rate insights
    if (stats.hitRate < 0.6) {
      insights.push({
        type: 'performance',
        severity: 'high',
        message: 'Low cache hit rate indicates potential optimization opportunities',
        suggestion: 'Consider increasing TTL for frequently accessed data'
      });
    }

    // Memory usage insights
    const memoryUsage = stats.memorySize / stats.memoryMaxSize;
    if (memoryUsage > 0.8) {
      insights.push({
        type: 'memory',
        severity: 'medium',
        message: 'High memory cache usage',
        suggestion: 'Consider increasing memory cache size or optimizing data structures'
      });
    }

    // Performance insights
    if (stats.performance?.averageGetTime > 50) {
      insights.push({
        type: 'performance',
        severity: 'medium',
        message: 'Cache get operations are slower than expected',
        suggestion: 'Review cache key generation and IndexedDB operations'
      });
    }

    return insights;
  }
};

// Export all utilities
export default {
  debug: cacheDebug,
  performance: cachePerformance,
  optimization: cacheOptimization,
  management: cacheManagement,
  validation: cacheValidation,
  monitoring: cacheMonitoring
};
