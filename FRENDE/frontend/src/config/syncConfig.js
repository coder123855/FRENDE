/**
 * Sync Configuration
 * 
 * Centralized configuration for real-time synchronization system
 * Defines sync strategies, retry policies, conflict resolution rules, and performance thresholds
 */

export const SYNC_CONFIG = {
  // General sync settings
  GENERAL: {
    ENABLED: true,
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    MAX_CONCURRENT_SYNCS: 5,
    SYNC_TIMEOUT: 30000, // 30 seconds
    BATCH_SIZE: 50,
  },

  // Data type-specific sync strategies
  STRATEGIES: {
    TASKS: {
      SYNC_INTERVAL: 5000, // 5 seconds
      OPTIMISTIC_UPDATES: true,
      CONFLICT_RESOLUTION: 'last_write_wins',
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,
      PRIORITY: 'high',
      BATCH_UPDATES: true,
    },
    MATCHES: {
      SYNC_INTERVAL: 3000, // 3 seconds
      OPTIMISTIC_UPDATES: true,
      CONFLICT_RESOLUTION: 'server_wins',
      RETRY_ATTEMPTS: 5,
      RETRY_DELAY: 500,
      PRIORITY: 'high',
      BATCH_UPDATES: false,
    },
    CHAT_MESSAGES: {
      SYNC_INTERVAL: 1000, // 1 second
      OPTIMISTIC_UPDATES: true,
      CONFLICT_RESOLUTION: 'timestamp_based',
      RETRY_ATTEMPTS: 2,
      RETRY_DELAY: 200,
      PRIORITY: 'critical',
      BATCH_UPDATES: true,
    },
    USER_PROFILES: {
      SYNC_INTERVAL: 10000, // 10 seconds
      OPTIMISTIC_UPDATES: false,
      CONFLICT_RESOLUTION: 'manual',
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 2000,
      PRIORITY: 'medium',
      BATCH_UPDATES: false,
    },
    COIN_BALANCE: {
      SYNC_INTERVAL: 2000, // 2 seconds
      OPTIMISTIC_UPDATES: false,
      CONFLICT_RESOLUTION: 'server_wins',
      RETRY_ATTEMPTS: 5,
      RETRY_DELAY: 500,
      PRIORITY: 'high',
      BATCH_UPDATES: false,
    },
    NOTIFICATIONS: {
      SYNC_INTERVAL: 5000, // 5 seconds
      OPTIMISTIC_UPDATES: false,
      CONFLICT_RESOLUTION: 'append_only',
      RETRY_ATTEMPTS: 2,
      RETRY_DELAY: 1000,
      PRIORITY: 'medium',
      BATCH_UPDATES: true,
    },
  },

  // Conflict resolution strategies
  CONFLICT_RESOLUTION: {
    LAST_WRITE_WINS: 'last_write_wins',
    SERVER_WINS: 'server_wins',
    CLIENT_WINS: 'client_wins',
    MANUAL: 'manual',
    TIMESTAMP_BASED: 'timestamp_based',
    APPEND_ONLY: 'append_only',
    MERGE: 'merge',
  },

  // Retry policies
  RETRY: {
    EXPONENTIAL_BACKOFF: true,
    MAX_RETRY_DELAY: 30000, // 30 seconds
    JITTER: true,
    JITTER_FACTOR: 0.1,
  },

  // Performance thresholds
  PERFORMANCE: {
    MAX_SYNC_DURATION: 10000, // 10 seconds
    MAX_QUEUE_SIZE: 1000,
    MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
    CPU_THRESHOLD: 80, // 80%
    NETWORK_THRESHOLD: 5000, // 5 seconds
  },

  // Background sync settings
  BACKGROUND_SYNC: {
    ENABLED: true,
    INTERVAL: 30000, // 30 seconds
    MAX_BACKGROUND_SYNCS: 3,
    PRIORITY: 'low',
    NETWORK_REQUIREMENT: 'any', // 'any', 'wifi', 'cellular'
  },

  // Offline sync settings
  OFFLINE_SYNC: {
    ENABLED: true,
    QUEUE_PERSISTENCE: true,
    MAX_OFFLINE_QUEUE_SIZE: 500,
    SYNC_ON_RECONNECT: true,
    PRIORITY_QUEUE: true,
  },

  // Event types for sync
  EVENT_TYPES: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    BATCH: 'batch',
    SYNC: 'sync',
    CONFLICT: 'conflict',
    ERROR: 'error',
  },

  // Sync status types
  SYNC_STATUS: {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error',
    CONFLICT: 'conflict',
    OFFLINE: 'offline',
    QUEUED: 'queued',
  },

  // Debug settings
  DEBUG: {
    LOG_EVENTS: process.env.NODE_ENV === 'development',
    LOG_PERFORMANCE: process.env.NODE_ENV === 'development',
    LOG_CONFLICTS: true,
    LOG_RETRIES: true,
    SHOW_SYNC_STATUS: process.env.NODE_ENV === 'development',
  },
};

/**
 * Get sync strategy for a data type
 */
export function getSyncStrategy(dataType) {
  return SYNC_CONFIG.STRATEGIES[dataType.toUpperCase()] || SYNC_CONFIG.STRATEGIES.TASKS;
}

/**
 * Get sync interval for a data type
 */
export function getSyncInterval(dataType) {
  const strategy = getSyncStrategy(dataType);
  return strategy.SYNC_INTERVAL;
}

/**
 * Get conflict resolution strategy for a data type
 */
export function getConflictResolution(dataType) {
  const strategy = getSyncStrategy(dataType);
  return strategy.CONFLICT_RESOLUTION;
}

/**
 * Get retry configuration for a data type
 */
export function getRetryConfig(dataType) {
  const strategy = getSyncStrategy(dataType);
  return {
    attempts: strategy.RETRY_ATTEMPTS,
    delay: strategy.RETRY_DELAY,
    exponentialBackoff: SYNC_CONFIG.RETRY.EXPONENTIAL_BACKOFF,
    maxDelay: SYNC_CONFIG.RETRY.MAX_RETRY_DELAY,
    jitter: SYNC_CONFIG.RETRY.JITTER,
    jitterFactor: SYNC_CONFIG.RETRY.JITTER_FACTOR,
  };
}

/**
 * Check if optimistic updates are enabled for a data type
 */
export function isOptimisticUpdatesEnabled(dataType) {
  const strategy = getSyncStrategy(dataType);
  return strategy.OPTIMISTIC_UPDATES;
}

/**
 * Check if sync is enabled
 */
export function isSyncEnabled() {
  return SYNC_CONFIG.GENERAL.ENABLED;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
  return SYNC_CONFIG.GENERAL.DEBUG_MODE;
}

/**
 * Get log level
 */
export function getLogLevel() {
  return SYNC_CONFIG.GENERAL.LOG_LEVEL;
}

/**
 * Get performance thresholds
 */
export function getPerformanceThresholds() {
  return SYNC_CONFIG.PERFORMANCE;
}

/**
 * Get background sync configuration
 */
export function getBackgroundSyncConfig() {
  return SYNC_CONFIG.BACKGROUND_SYNC;
}

/**
 * Get offline sync configuration
 */
export function getOfflineSyncConfig() {
  return SYNC_CONFIG.OFFLINE_SYNC;
}

export default SYNC_CONFIG;
