import cacheService from './cacheService.js';

// Cache strategies for different data types
export const CACHE_STRATEGIES = {
  // Tasks: Cache for 1 hour, invalidate on completion
  TASKS: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPattern: '/api/tasks',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/tasks'],
    backgroundRefresh: true,
    staleWhileRevalidate: true
  },

  // Chat Messages: Cache for 24 hours, append-only
  CHAT_MESSAGES: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    keyPattern: '/api/chat',
    invalidateOn: ['POST'], // Only invalidate on new messages
    invalidatePatterns: ['/api/chat'],
    backgroundRefresh: false,
    appendOnly: true
  },

  // User Profiles: Cache for 1 day, invalidate on update
  USER_PROFILES: {
    ttl: 24 * 60 * 60 * 1000, // 1 day
    keyPattern: '/api/users/profile',
    invalidateOn: ['PUT', 'DELETE'],
    invalidatePatterns: ['/api/users/profile'],
    backgroundRefresh: true,
    staleWhileRevalidate: false
  },

  // Matches: Cache for 2 hours, invalidate on status change
  MATCHES: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    keyPattern: '/api/matches',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/matches'],
    backgroundRefresh: true,
    staleWhileRevalidate: true
  },

  // Match Requests: Cache for 30 minutes
  MATCH_REQUESTS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyPattern: '/api/match-requests',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/match-requests'],
    backgroundRefresh: false,
    staleWhileRevalidate: false
  },

  // Queue: Cache for 5 minutes
  QUEUE: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPattern: '/api/queue',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/queue'],
    backgroundRefresh: true,
    staleWhileRevalidate: true
  },

  // Coin Balance: Cache for 10 minutes
  COIN_BALANCE: {
    ttl: 10 * 60 * 1000, // 10 minutes
    keyPattern: '/api/coins/balance',
    invalidateOn: ['POST', 'PUT'],
    invalidatePatterns: ['/api/coins'],
    backgroundRefresh: true,
    staleWhileRevalidate: true
  },

  // Task History: Cache for 1 hour
  TASK_HISTORY: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPattern: '/api/tasks/history',
    invalidateOn: ['POST'],
    invalidatePatterns: ['/api/tasks'],
    backgroundRefresh: false,
    staleWhileRevalidate: false
  }
};

// Get cache strategy for a URL
export function getCacheStrategy(url) {
  for (const [strategyName, strategy] of Object.entries(CACHE_STRATEGIES)) {
    if (url.includes(strategy.keyPattern)) {
      return { name: strategyName, ...strategy };
    }
  }
  
  // Default strategy
  return {
    name: 'DEFAULT',
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPattern: '',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: [],
    backgroundRefresh: false,
    staleWhileRevalidate: false
  };
}

// Check if request should invalidate cache
export function shouldInvalidateCache(method, url, strategy) {
  return strategy.invalidateOn.includes(method);
}

// Get invalidation patterns for a URL
export function getInvalidationPatterns(url, strategy) {
  const patterns = [...strategy.invalidatePatterns];
  
  // Add URL-specific patterns
  if (url.includes('/api/tasks/')) {
    patterns.push('/api/tasks');
  }
  if (url.includes('/api/chat/')) {
    patterns.push('/api/chat');
  }
  if (url.includes('/api/matches/')) {
    patterns.push('/api/matches');
  }
  if (url.includes('/api/users/')) {
    patterns.push('/api/users');
  }
  
  return patterns;
}

// Cache invalidation service
export class CacheInvalidationService {
  constructor() {
    this.pendingInvalidations = new Set();
  }

  // Invalidate cache based on strategy
  async invalidateCache(url, method, data = null) {
    const strategy = getCacheStrategy(url);
    
    if (!shouldInvalidateCache(method, url, strategy)) {
      return;
    }

    const patterns = getInvalidationPatterns(url, strategy);
    
    // Add to pending invalidations to prevent race conditions
    const invalidationKey = `${method}:${url}`;
    if (this.pendingInvalidations.has(invalidationKey)) {
      return;
    }
    
    this.pendingInvalidations.add(invalidationKey);
    
    try {
      // Invalidate by patterns
      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }
      
      // Invalidate specific URL
      const key = cacheService.generateKey(url);
      await cacheService.delete(key);
      
      console.log(`Invalidated cache for ${method} ${url}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    } finally {
      this.pendingInvalidations.delete(invalidationKey);
    }
  }

  // Invalidate cache for specific data type
  async invalidateByType(dataType) {
    const strategy = CACHE_STRATEGIES[dataType.toUpperCase()];
    if (!strategy) {
      console.warn(`No cache strategy found for data type: ${dataType}`);
      return;
    }

    for (const pattern of strategy.invalidatePatterns) {
      await cacheService.invalidatePattern(pattern);
    }
  }

  // Invalidate all cache
  async invalidateAll() {
    await cacheService.clear();
    console.log('All cache invalidated');
  }
}

// Create singleton instance
const cacheInvalidationService = new CacheInvalidationService();

export default cacheInvalidationService;
