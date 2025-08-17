/**
 * Sync Utilities
 * 
 * Utility functions for real-time synchronization system
 * Includes conflict resolution, retry logic, performance monitoring, and data comparison
 */

import { 
  SYNC_CONFIG, 
  getSyncStrategy, 
  getRetryConfig, 
  getConflictResolution,
  isDebugMode,
  getLogLevel 
} from '../config/syncConfig.js';

/**
 * Conflict Resolution Utilities
 */

/**
 * Resolve conflicts based on strategy
 */
export function resolveConflict(localData, serverData, strategy, dataType = 'default') {
  const resolutionStrategy = strategy || getConflictResolution(dataType);
  
  switch (resolutionStrategy) {
    case 'last_write_wins':
      return resolveLastWriteWins(localData, serverData);
    case 'server_wins':
      return resolveServerWins(localData, serverData);
    case 'client_wins':
      return resolveClientWins(localData, serverData);
    case 'timestamp_based':
      return resolveTimestampBased(localData, serverData);
    case 'merge':
      return resolveMerge(localData, serverData);
    case 'append_only':
      return resolveAppendOnly(localData, serverData);
    case 'manual':
      return { type: 'manual', localData, serverData };
    default:
      return resolveLastWriteWins(localData, serverData);
  }
}

/**
 * Last write wins conflict resolution
 */
function resolveLastWriteWins(localData, serverData) {
  const localTimestamp = localData.updated_at || localData.created_at || 0;
  const serverTimestamp = serverData.updated_at || serverData.created_at || 0;
  
  return {
    type: 'last_write_wins',
    data: localTimestamp > serverTimestamp ? localData : serverData,
    resolved: true
  };
}

/**
 * Server wins conflict resolution
 */
function resolveServerWins(localData, serverData) {
  return {
    type: 'server_wins',
    data: serverData,
    resolved: true
  };
}

/**
 * Client wins conflict resolution
 */
function resolveClientWins(localData, serverData) {
  return {
    type: 'client_wins',
    data: localData,
    resolved: true
  };
}

/**
 * Timestamp-based conflict resolution
 */
function resolveTimestampBased(localData, serverData) {
  const localTimestamp = localData.updated_at || localData.created_at || 0;
  const serverTimestamp = serverData.updated_at || serverData.created_at || 0;
  
  if (Math.abs(localTimestamp - serverTimestamp) < 1000) {
    // Timestamps are within 1 second, merge the data
    return resolveMerge(localData, serverData);
  }
  
  return resolveLastWriteWins(localData, serverData);
}

/**
 * Merge conflict resolution
 */
function resolveMerge(localData, serverData) {
  const merged = { ...serverData };
  
  // Merge non-conflicting fields
  Object.keys(localData).forEach(key => {
    if (!(key in serverData) || serverData[key] === null || serverData[key] === undefined) {
      merged[key] = localData[key];
    }
  });
  
  return {
    type: 'merge',
    data: merged,
    resolved: true
  };
}

/**
 * Append-only conflict resolution (for lists/arrays)
 */
function resolveAppendOnly(localData, serverData) {
  if (Array.isArray(localData) && Array.isArray(serverData)) {
    const merged = [...serverData];
    localData.forEach(item => {
      if (!merged.find(existing => existing.id === item.id)) {
        merged.push(item);
      }
    });
    
    return {
      type: 'append_only',
      data: merged,
      resolved: true
    };
  }
  
  return resolveServerWins(localData, serverData);
}

/**
 * Retry Logic Utilities
 */

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt, config) {
  const { delay, exponentialBackoff, maxDelay, jitter, jitterFactor } = config;
  
  let retryDelay = delay;
  
  if (exponentialBackoff) {
    retryDelay = Math.min(delay * Math.pow(2, attempt), maxDelay);
  }
  
  if (jitter) {
    const jitterAmount = retryDelay * jitterFactor;
    retryDelay += (Math.random() - 0.5) * jitterAmount;
  }
  
  return Math.max(0, retryDelay);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, config, dataType = 'default') {
  const retryConfig = config || getRetryConfig(dataType);
  let lastError;
  
  for (let attempt = 0; attempt <= retryConfig.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === retryConfig.attempts) {
        break;
      }
      
      const delay = calculateRetryDelay(attempt, retryConfig);
      
      if (isDebugMode()) {
        console.warn(`Sync retry attempt ${attempt + 1}/${retryConfig.attempts + 1} for ${dataType}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Performance Monitoring Utilities
 */

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      syncDurations: [],
      memoryUsage: [],
      errorCount: 0,
      successCount: 0,
      totalOperations: 0,
    };
  }
  
  startTimer() {
    return {
      start: performance.now(),
      memory: performance.memory?.usedJSHeapSize || 0
    };
  }
  
  endTimer(timer, success = true) {
    const duration = performance.now() - timer.start;
    const memoryDelta = (performance.memory?.usedJSHeapSize || 0) - timer.memory;
    
    this.metrics.syncDurations.push(duration);
    this.metrics.memoryUsage.push(memoryDelta);
    this.metrics.totalOperations++;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    
    // Keep only last 100 measurements
    if (this.metrics.syncDurations.length > 100) {
      this.metrics.syncDurations.shift();
      this.metrics.memoryUsage.shift();
    }
    
    return { duration, memoryDelta };
  }
  
  getStats() {
    const durations = this.metrics.syncDurations;
    const memoryUsage = this.metrics.memoryUsage;
    
    return {
      totalOperations: this.metrics.totalOperations,
      successCount: this.metrics.successCount,
      errorCount: this.metrics.errorCount,
      successRate: this.metrics.totalOperations > 0 ? 
        (this.metrics.successCount / this.metrics.totalOperations) * 100 : 0,
      averageDuration: durations.length > 0 ? 
        durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      averageMemoryUsage: memoryUsage.length > 0 ? 
        memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length : 0,
    };
  }
  
  reset() {
    this.metrics = {
      syncDurations: [],
      memoryUsage: [],
      errorCount: 0,
      successCount: 0,
      totalOperations: 0,
    };
  }
}

export const performanceMetrics = new PerformanceMetrics();

/**
 * Data Comparison Utilities
 */

/**
 * Deep comparison of objects
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Check if data has changed
 */
export function hasDataChanged(oldData, newData, ignoreFields = []) {
  if (!oldData || !newData) return true;
  
  const filteredOld = { ...oldData };
  const filteredNew = { ...newData };
  
  // Remove fields to ignore
  ignoreFields.forEach(field => {
    delete filteredOld[field];
    delete filteredNew[field];
  });
  
  return !deepEqual(filteredOld, filteredNew);
}

/**
 * Generate data hash for change detection
 */
export function generateDataHash(data) {
  if (!data) return '';
  
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString();
}

/**
 * Logging Utilities
 */

/**
 * Sync logger with configurable levels
 */
export class SyncLogger {
  constructor() {
    this.logLevel = getLogLevel();
    this.debugMode = isDebugMode();
  }
  
  log(level, message, data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[Sync] ${timestamp} [${level.toUpperCase()}] ${message}`;
      
      if (data && this.debugMode) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  }
  
  debug(message, data = null) {
    this.log('debug', message, data);
  }
  
  info(message, data = null) {
    this.log('info', message, data);
  }
  
  warn(message, data = null) {
    this.log('warn', message, data);
  }
  
  error(message, data = null) {
    this.log('error', message, data);
  }
}

export const syncLogger = new SyncLogger();

/**
 * Network Utilities
 */

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Get network type
 */
export function getNetworkType() {
  if ('connection' in navigator) {
    return navigator.connection.effectiveType || 'unknown';
  }
  return 'unknown';
}

/**
 * Check if network is fast enough for sync
 */
export function isNetworkSuitableForSync() {
  if (!isOnline()) return false;
  
  const networkType = getNetworkType();
  const suitableTypes = ['4g', '3g'];
  
  return suitableTypes.includes(networkType) || networkType === 'unknown';
}

/**
 * Queue Management Utilities
 */

/**
 * Priority queue implementation
 */
export class PriorityQueue {
  constructor() {
    this.queue = [];
  }
  
  enqueue(item, priority = 0) {
    this.queue.push({ item, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }
  
  dequeue() {
    return this.queue.shift()?.item;
  }
  
  peek() {
    return this.queue[0]?.item;
  }
  
  isEmpty() {
    return this.queue.length === 0;
  }
  
  size() {
    return this.queue.length;
  }
  
  clear() {
    this.queue = [];
  }
  
  toArray() {
    return this.queue.map(({ item }) => item);
  }
}

/**
 * Batch processing utilities
 */
export function createBatchProcessor(processor, batchSize = SYNC_CONFIG.GENERAL.BATCH_SIZE) {
  let batch = [];
  let processing = false;
  
  return {
    add(item) {
      batch.push(item);
      
      if (batch.length >= batchSize && !processing) {
        this.process();
      }
    },
    
    async process() {
      if (processing || batch.length === 0) return;
      
      processing = true;
      const currentBatch = batch.splice(0, batchSize);
      
      try {
        await processor(currentBatch);
      } catch (error) {
        syncLogger.error('Batch processing error:', error);
        // Re-add failed items to the front of the batch
        batch.unshift(...currentBatch);
      } finally {
        processing = false;
        
        // Process remaining items if any
        if (batch.length > 0) {
          this.process();
        }
      }
    },
    
    getBatchSize() {
      return batch.length;
    },
    
    clear() {
      batch = [];
    }
  };
}

export default {
  resolveConflict,
  retryWithBackoff,
  performanceMetrics,
  deepEqual,
  hasDataChanged,
  generateDataHash,
  syncLogger,
  isOnline,
  getNetworkType,
  isNetworkSuitableForSync,
  PriorityQueue,
  createBatchProcessor,
};
