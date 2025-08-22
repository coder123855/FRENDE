import cacheService from './cacheService.js';

// Enhanced cache strategies for different data types
export const CACHE_STRATEGIES = {
  // Tasks: Cache for 1 hour, invalidate on completion, stale-while-revalidate
  TASKS: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPattern: '/api/tasks',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/tasks'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 5 * 60 * 1000, // 5 minutes
    compress: true,
    priority: 'high'
  },

  // Task Details: Cache for 30 minutes, background refresh
  TASK_DETAILS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyPattern: '/api/tasks/',
    invalidateOn: ['PUT', 'DELETE'],
    invalidatePatterns: ['/api/tasks'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 2 * 60 * 1000, // 2 minutes
    compress: true,
    priority: 'medium'
  },

  // Chat Messages: Cache for 24 hours, append-only, high compression
  CHAT_MESSAGES: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    keyPattern: '/api/chat',
    invalidateOn: ['POST'], // Only invalidate on new messages
    invalidatePatterns: ['/api/chat'],
    backgroundRefresh: false,
    appendOnly: true,
    compress: true,
    priority: 'high'
  },

  // Chat History: Cache for 24 hours, background refresh
  CHAT_HISTORY: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    keyPattern: '/api/chat/history',
    invalidateOn: ['POST'],
    invalidatePatterns: ['/api/chat'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 10 * 60 * 1000, // 10 minutes
    compress: true,
    priority: 'medium'
  },

  // User Profiles: Cache for 1 day, invalidate on update
  USER_PROFILES: {
    ttl: 24 * 60 * 60 * 1000, // 1 day
    keyPattern: '/api/users/profile',
    invalidateOn: ['PUT', 'DELETE'],
    invalidatePatterns: ['/api/users/profile'],
    backgroundRefresh: true,
    staleWhileRevalidate: false,
    compress: false, // User profiles are usually small
    priority: 'high'
  },

  // User Settings: Cache for 7 days, background refresh
  USER_SETTINGS: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    keyPattern: '/api/users/settings',
    invalidateOn: ['PUT'],
    invalidatePatterns: ['/api/users/settings'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 60 * 60 * 1000, // 1 hour
    compress: false,
    priority: 'low'
  },

  // Matches: Cache for 2 hours, invalidate on status change
  MATCHES: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    keyPattern: '/api/matches',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/matches'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 5 * 60 * 1000, // 5 minutes
    compress: true,
    priority: 'high'
  },

  // Match Details: Cache for 30 minutes
  MATCH_DETAILS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyPattern: '/api/matches/',
    invalidateOn: ['PUT', 'DELETE'],
    invalidatePatterns: ['/api/matches'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 2 * 60 * 1000, // 2 minutes
    compress: true,
    priority: 'medium'
  },

  // Match Requests: Cache for 30 minutes
  MATCH_REQUESTS: {
    ttl: 30 * 60 * 1000, // 30 minutes
    keyPattern: '/api/match-requests',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/match-requests'],
    backgroundRefresh: false,
    staleWhileRevalidate: false,
    compress: true,
    priority: 'medium'
  },

  // Queue: Cache for 5 minutes, frequent background refresh
  QUEUE: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPattern: '/api/queue',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/queue'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 1 * 60 * 1000, // 1 minute
    compress: false, // Queue data is usually small
    priority: 'high'
  },

  // Compatible Users: Cache for 15 minutes
  COMPATIBLE_USERS: {
    ttl: 15 * 60 * 1000, // 15 minutes
    keyPattern: '/api/users/compatible',
    invalidateOn: ['POST'],
    invalidatePatterns: ['/api/users'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 3 * 60 * 1000, // 3 minutes
    compress: true,
    priority: 'medium'
  },

  // Coin Balance: Cache for 10 minutes, network-first
  COIN_BALANCE: {
    ttl: 10 * 60 * 1000, // 10 minutes
    keyPattern: '/api/coins/balance',
    invalidateOn: ['POST', 'PUT'],
    invalidatePatterns: ['/api/coins'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 1 * 60 * 1000, // 1 minute
    compress: false,
    priority: 'high',
    networkFirst: true
  },

  // Coin History: Cache for 1 hour
  COIN_HISTORY: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPattern: '/api/coins/history',
    invalidateOn: ['POST'],
    invalidatePatterns: ['/api/coins'],
    backgroundRefresh: false,
    staleWhileRevalidate: false,
    compress: true,
    priority: 'low'
  },

  // Task History: Cache for 1 hour
  TASK_HISTORY: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPattern: '/api/tasks/history',
    invalidateOn: ['POST'],
    invalidatePatterns: ['/api/tasks'],
    backgroundRefresh: false,
    staleWhileRevalidate: false,
    compress: true,
    priority: 'low'
  },

  // System Configuration: Cache for 1 day
  SYSTEM_CONFIG: {
    ttl: 24 * 60 * 60 * 1000, // 1 day
    keyPattern: '/api/system/config',
    invalidateOn: ['PUT'],
    invalidatePatterns: ['/api/system'],
    backgroundRefresh: true,
    staleWhileRevalidate: false,
    compress: false,
    priority: 'low'
  },

  // Notifications: Cache for 5 minutes
  NOTIFICATIONS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPattern: '/api/notifications',
    invalidateOn: ['POST', 'PUT', 'DELETE'],
    invalidatePatterns: ['/api/notifications'],
    backgroundRefresh: true,
    staleWhileRevalidate: true,
    staleWhileRevalidateTtl: 1 * 60 * 1000, // 1 minute
    compress: true,
    priority: 'high'
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
    staleWhileRevalidate: false,
    staleWhileRevalidateTtl: 60 * 1000, // 1 minute
    compress: true,
    priority: 'low',
    networkFirst: false
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
  if (url.includes('/api/coins/')) {
    patterns.push('/api/coins');
  }
  if (url.includes('/api/queue/')) {
    patterns.push('/api/queue');
  }
  if (url.includes('/api/notifications/')) {
    patterns.push('/api/notifications');
  }
  
  return patterns;
}

// Enhanced cache invalidation service
export class CacheInvalidationService {
  constructor() {
    this.pendingInvalidations = new Set();
    this.invalidationQueue = new Map();
    this.batchInvalidationTimeout = null;
  }

  // Invalidate cache based on strategy with batching
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
      // Queue invalidation for batching
      this.queueInvalidation(patterns, url);
      
      console.log(`Queued cache invalidation for ${method} ${url}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    } finally {
      this.pendingInvalidations.delete(invalidationKey);
    }
  }

  // Queue invalidation for batching
  queueInvalidation(patterns, url) {
    const batchKey = Date.now().toString().slice(0, -3); // Batch by second
    
    if (!this.invalidationQueue.has(batchKey)) {
      this.invalidationQueue.set(batchKey, {
        patterns: new Set(),
        urls: new Set(),
        timestamp: Date.now()
      });
    }
    
    const batch = this.invalidationQueue.get(batchKey);
    patterns.forEach(pattern => batch.patterns.add(pattern));
    batch.urls.add(url);
    
    // Schedule batch processing
    if (this.batchInvalidationTimeout) {
      clearTimeout(this.batchInvalidationTimeout);
    }
    
    this.batchInvalidationTimeout = setTimeout(() => {
      this.processInvalidationBatch();
    }, 100); // Batch invalidations within 100ms
  }

  // Process batched invalidations
  async processInvalidationBatch() {
    const now = Date.now();
    const batchesToProcess = [];
    
    // Collect batches older than 100ms
    for (const [batchKey, batch] of this.invalidationQueue) {
      if (now - batch.timestamp > 100) {
        batchesToProcess.push({ batchKey, batch });
        this.invalidationQueue.delete(batchKey);
      }
    }
    
    // Process all batches
    for (const { batchKey, batch } of batchesToProcess) {
      try {
        // Invalidate by patterns
        for (const pattern of batch.patterns) {
          await cacheService.invalidatePattern(pattern);
        }
        
        // Invalidate specific URLs
        for (const url of batch.urls) {
          const key = cacheService.generateKey(url);
          await cacheService.delete(key);
        }
        
        console.log(`Processed batch invalidation for ${batch.urls.size} URLs`);
      } catch (error) {
        console.error('Batch invalidation error:', error);
      }
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

  // Invalidate cache for user-specific data
  async invalidateUserData(userId) {
    const userPatterns = [
      `/api/users/${userId}`,
      `/api/users/profile`,
      `/api/users/settings`,
      `/api/coins/balance`,
      `/api/coins/history`,
      `/api/notifications`
    ];
    
    for (const pattern of userPatterns) {
      await cacheService.invalidatePattern(pattern);
    }
  }

  // Invalidate cache for match-specific data
  async invalidateMatchData(matchId) {
    const matchPatterns = [
      `/api/matches/${matchId}`,
      `/api/chat/${matchId}`,
      `/api/tasks/${matchId}`
    ];
    
    for (const pattern of matchPatterns) {
      await cacheService.invalidatePattern(pattern);
    }
  }

  // Invalidate all cache
  async invalidateAll() {
    await cacheService.clear();
    console.log('All cache invalidated');
  }

  // Get invalidation statistics
  getInvalidationStats() {
    return {
      pendingInvalidations: this.pendingInvalidations.size,
      queuedBatches: this.invalidationQueue.size,
      totalBatches: this.invalidationQueue.size
    };
  }
}

// Cache warming service
export class CacheWarmingService {
  constructor() {
    this.warmingQueue = new Map();
    this.warmingInterval = null;
    this.isWarming = false;
  }

  // Warm cache for critical endpoints
  async warmCriticalCache() {
    const criticalEndpoints = [
      { url: '/api/users/profile', ttl: 24 * 60 * 60 * 1000, priority: 'high' },
      { url: '/api/matches', ttl: 2 * 60 * 60 * 1000, priority: 'high' },
      { url: '/api/tasks', ttl: 60 * 60 * 1000, priority: 'high' },
      { url: '/api/coins/balance', ttl: 10 * 60 * 1000, priority: 'high' },
      { url: '/api/notifications', ttl: 5 * 60 * 1000, priority: 'high' }
    ];

    for (const endpoint of criticalEndpoints) {
      await this.queueWarming(endpoint);
    }
  }

  // Queue cache warming
  async queueWarming(endpoint) {
    const { url, ttl, priority } = endpoint;
    const strategy = getCacheStrategy(url);
    
    this.warmingQueue.set(url, {
      ...endpoint,
      strategy,
      timestamp: Date.now(),
      attempts: 0
    });
  }

  // Process warming queue
  async processWarmingQueue() {
    if (this.isWarming || this.warmingQueue.size === 0) return;

    this.isWarming = true;
    const now = Date.now();
    const toProcess = [];

    // Collect items to warm
    for (const [url, item] of this.warmingQueue) {
      if (now - item.timestamp > 1000 && item.attempts < 3) { // 1 second delay, max 3 attempts
        toProcess.push({ url, item });
        this.warmingQueue.delete(url);
      }
    }

    // Process warming
    for (const { url, item } of toProcess) {
      try {
        await this.warmEndpoint(url, item);
      } catch (error) {
        console.error(`Cache warming failed for ${url}:`, error);
        
        // Retry if under max attempts
        if (item.attempts < 3) {
          item.attempts++;
          item.timestamp = now;
          this.warmingQueue.set(url, item);
        }
      }
    }

    this.isWarming = false;
  }

  // Warm a specific endpoint
  async warmEndpoint(url, item) {
    const { ttl, strategy } = item;
    
    try {
      // Check if already cached
      const key = cacheService.generateKey(url);
      const cached = await cacheService.get(key);
      
      if (cached) {
        console.log(`Cache already warm for ${url}`);
        return;
      }

      // Make API call to warm cache
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        await cacheService.set(key, data, ttl, {
          staleWhileRevalidate: strategy.staleWhileRevalidate,
          backgroundRefresh: strategy.backgroundRefresh,
          compress: strategy.compress
        });
        
        console.log(`Cache warmed for ${url}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Start warming service
  startWarming() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }
    
    this.warmingInterval = setInterval(() => {
      this.processWarmingQueue();
    }, 5000); // Process every 5 seconds
  }

  // Stop warming service
  stopWarming() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
  }

  // Get warming statistics
  getWarmingStats() {
    return {
      queuedItems: this.warmingQueue.size,
      isWarming: this.isWarming
    };
  }
}

// Create singleton instances
const cacheInvalidationService = new CacheInvalidationService();
const cacheWarmingService = new CacheWarmingService();

export default cacheInvalidationService;
export { cacheWarmingService };
