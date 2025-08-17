// Cache configuration for the Frende application
export const CACHE_CONFIG = {
  // General cache settings
  GENERAL: {
    ENABLED: true,
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
  },

  // Memory cache settings
  MEMORY: {
    MAX_SIZE: 100,
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  },

  // IndexedDB cache settings
  INDEXEDDB: {
    DB_NAME: 'FrendeCacheDB',
    DB_VERSION: 1,
    STORE_NAME: 'api_cache',
    MAX_SIZE: 1000,
    DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Data type specific TTL settings
  TTL: {
    // Tasks
    TASKS: 60 * 60 * 1000, // 1 hour
    TASK_DETAILS: 30 * 60 * 1000, // 30 minutes
    TASK_HISTORY: 60 * 60 * 1000, // 1 hour
    
    // Chat
    CHAT_MESSAGES: 24 * 60 * 60 * 1000, // 24 hours
    CHAT_ROOMS: 2 * 60 * 60 * 1000, // 2 hours
    CHAT_HISTORY: 24 * 60 * 60 * 1000, // 24 hours
    
    // User data
    USER_PROFILE: 24 * 60 * 60 * 1000, // 1 day
    USER_SETTINGS: 7 * 24 * 60 * 60 * 1000, // 7 days
    USER_STATS: 10 * 60 * 1000, // 10 minutes
    
    // Matches
    MATCHES: 2 * 60 * 60 * 1000, // 2 hours
    MATCH_DETAILS: 30 * 60 * 1000, // 30 minutes
    MATCH_REQUESTS: 30 * 60 * 1000, // 30 minutes
    
    // Queue and matching
    QUEUE: 5 * 60 * 1000, // 5 minutes
    COMPATIBLE_USERS: 15 * 60 * 1000, // 15 minutes
    
    // Coins and rewards
    COIN_BALANCE: 10 * 60 * 1000, // 10 minutes
    COIN_HISTORY: 60 * 60 * 1000, // 1 hour
    REWARDS: 30 * 60 * 1000, // 30 minutes
    
    // System data
    SYSTEM_CONFIG: 24 * 60 * 60 * 1000, // 1 day
    NOTIFICATIONS: 5 * 60 * 1000, // 5 minutes
  },

  // Cache invalidation settings
  INVALIDATION: {
    // Patterns for automatic invalidation
    PATTERNS: {
      TASKS: ['/api/tasks'],
      CHAT: ['/api/chat'],
      MATCHES: ['/api/matches'],
      USERS: ['/api/users'],
      COINS: ['/api/coins'],
      QUEUE: ['/api/queue'],
    },
    
    // Methods that trigger invalidation
    METHODS: {
      TASKS: ['POST', 'PUT', 'DELETE'],
      CHAT: ['POST'],
      MATCHES: ['POST', 'PUT', 'DELETE'],
      USERS: ['PUT', 'DELETE'],
      COINS: ['POST', 'PUT'],
      QUEUE: ['POST', 'PUT', 'DELETE'],
    },
  },

  // Background refresh settings
  BACKGROUND_REFRESH: {
    ENABLED: true,
    INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_CONCURRENT: 3,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },

  // Stale-while-revalidate settings
  STALE_WHILE_REVALIDATE: {
    ENABLED: true,
    MAX_STALE_TIME: 60 * 1000, // 1 minute
  },

  // Preloading settings
  PRELOAD: {
    ENABLED: true,
    PRIORITY_LEVELS: {
      HIGH: ['user_profile', 'active_matches'],
      MEDIUM: ['recent_tasks', 'chat_rooms'],
      LOW: ['task_history', 'coin_history'],
    },
  },

  // Performance thresholds
  PERFORMANCE: {
    MAX_CACHE_SIZE_MB: 50,
    SLOW_CACHE_THRESHOLD_MS: 100,
    ERROR_THRESHOLD_PERCENT: 5,
  },

  // Offline settings
  OFFLINE: {
    CACHE_FIRST: true,
    NETWORK_FIRST: false,
    STALE_WHILE_REVALIDATE: true,
    MAX_OFFLINE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

// Cache strategy configurations
export const CACHE_STRATEGIES = {
  // Cache-first strategy (for static data)
  CACHE_FIRST: {
    name: 'cache-first',
    description: 'Return cached data if available, otherwise fetch from network',
    useCases: ['user_profile', 'system_config', 'task_history'],
  },

  // Network-first strategy (for dynamic data)
  NETWORK_FIRST: {
    name: 'network-first',
    description: 'Fetch from network first, fallback to cache',
    useCases: ['coin_balance', 'active_matches', 'queue_status'],
  },

  // Stale-while-revalidate strategy
  STALE_WHILE_REVALIDATE: {
    name: 'stale-while-revalidate',
    description: 'Return cached data immediately, update in background',
    useCases: ['tasks', 'chat_messages', 'matches'],
  },

  // Network-only strategy
  NETWORK_ONLY: {
    name: 'network-only',
    description: 'Always fetch from network, never use cache',
    useCases: ['authentication', 'sensitive_data'],
  },

  // Cache-only strategy
  CACHE_ONLY: {
    name: 'cache-only',
    description: 'Only use cached data, never fetch from network',
    useCases: ['offline_data', 'static_assets'],
  },
};

// Get TTL for a specific data type
export function getTTL(dataType) {
  return CACHE_CONFIG.TTL[dataType.toUpperCase()] || CACHE_CONFIG.MEMORY.DEFAULT_TTL;
}

// Get cache strategy for a data type
export function getStrategy(dataType) {
  const strategies = {
    'user_profile': CACHE_STRATEGIES.CACHE_FIRST,
    'tasks': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    'chat_messages': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    'matches': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    'coin_balance': CACHE_STRATEGIES.NETWORK_FIRST,
    'queue': CACHE_STRATEGIES.NETWORK_FIRST,
    'authentication': CACHE_STRATEGIES.NETWORK_ONLY,
  };
  
  return strategies[dataType] || CACHE_STRATEGIES.CACHE_FIRST;
}

// Check if caching is enabled
export function isCachingEnabled() {
  return CACHE_CONFIG.GENERAL.ENABLED;
}

// Get debug mode status
export function isDebugMode() {
  return CACHE_CONFIG.GENERAL.DEBUG_MODE;
}

// Get log level
export function getLogLevel() {
  return CACHE_CONFIG.GENERAL.LOG_LEVEL;
}

// Export default configuration
export default CACHE_CONFIG;
