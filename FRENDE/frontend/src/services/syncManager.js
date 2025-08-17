/**
 * Sync Manager Service
 * 
 * Core service for managing real-time synchronization between components
 * Handles optimistic updates, sync queues, conflict resolution, and coordination with Socket.IO
 */

import { EventEmitter } from 'events';
import { 
  SYNC_CONFIG, 
  getSyncStrategy, 
  getSyncInterval, 
  getRetryConfig,
  isSyncEnabled,
  isOptimisticUpdatesEnabled,
  getPerformanceThresholds,
  getBackgroundSyncConfig,
  getOfflineSyncConfig
} from '../config/syncConfig.js';

import {
  resolveConflict,
  retryWithBackoff,
  performanceMetrics,
  deepEqual,
  hasDataChanged,
  generateDataHash,
  syncLogger,
  isOnline,
  isNetworkSuitableForSync,
  PriorityQueue,
  createBatchProcessor
} from '../utils/syncUtils.js';

import { useSocket } from '../hooks/useSocket.js';
import cacheService from './cacheService.js';
import offlineStorage from './offlineStorage.js';

/**
 * Sync Operation Class
 */
class SyncOperation {
  constructor(type, dataType, data, options = {}) {
    this.id = generateOperationId();
    this.type = type; // 'create', 'update', 'delete', 'sync'
    this.dataType = dataType;
    this.data = data;
    this.options = options;
    this.timestamp = Date.now();
    this.status = 'pending';
    this.attempts = 0;
    this.error = null;
    this.result = null;
    this.priority = options.priority || getSyncStrategy(dataType).PRIORITY;
  }
}

/**
 * Sync Manager Class
 */
class SyncManager extends EventEmitter {
  constructor() {
    super();
    
    this.isInitialized = false;
    this.isRunning = false;
    this.syncQueue = new PriorityQueue();
    this.activeOperations = new Map();
    this.syncIntervals = new Map();
    this.componentStates = new Map();
    this.conflictQueue = new Map();
    this.performanceThresholds = getPerformanceThresholds();
    
    // Background sync
    this.backgroundSyncInterval = null;
    this.backgroundSyncConfig = getBackgroundSyncConfig();
    
    // Offline sync
    this.offlineQueue = new PriorityQueue();
    this.offlineSyncConfig = getOfflineSyncConfig();
    
    // Batch processing
    this.batchProcessors = new Map();
    
    // Event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initialize the sync manager
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      syncLogger.info('Initializing sync manager');
      
      // Initialize cache service
      await cacheService.init();
      
      // Setup batch processors for each data type
      this.setupBatchProcessors();
      
      // Start background sync if enabled
      if (this.backgroundSyncConfig.ENABLED) {
        this.startBackgroundSync();
      }
      
      // Setup offline sync
      if (this.offlineSyncConfig.ENABLED) {
        this.setupOfflineSync();
      }
      
      this.isInitialized = true;
      syncLogger.info('Sync manager initialized successfully');
      
      this.emit('initialized');
    } catch (error) {
      syncLogger.error('Failed to initialize sync manager:', error);
      throw error;
    }
  }
  
  /**
   * Start the sync manager
   */
  async start() {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (this.isRunning) return;
    
    this.isRunning = true;
    syncLogger.info('Starting sync manager');
    
    // Start all sync intervals
    this.startAllSyncIntervals();
    
    // Process any pending operations
    this.processQueue();
    
    this.emit('started');
  }
  
  /**
   * Stop the sync manager
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    syncLogger.info('Stopping sync manager');
    
    // Stop all sync intervals
    this.stopAllSyncIntervals();
    
    // Stop background sync
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
    }
    
    this.emit('stopped');
  }
  
  /**
   * Register a component for sync
   */
  registerComponent(componentId, dataType, initialState = null) {
    this.componentStates.set(componentId, {
      dataType,
      state: initialState,
      lastSync: null,
      isDirty: false,
      syncInterval: null
    });
    
    syncLogger.debug(`Component registered: ${componentId} (${dataType})`);
    this.emit('componentRegistered', { componentId, dataType });
  }
  
  /**
   * Unregister a component
   */
  unregisterComponent(componentId) {
    const component = this.componentStates.get(componentId);
    if (component) {
      if (component.syncInterval) {
        clearInterval(component.syncInterval);
      }
      this.componentStates.delete(componentId);
      syncLogger.debug(`Component unregistered: ${componentId}`);
      this.emit('componentUnregistered', { componentId });
    }
  }
  
  /**
   * Update component state
   */
  updateComponentState(componentId, newState, options = {}) {
    const component = this.componentStates.get(componentId);
    if (!component) {
      syncLogger.warn(`Component not found: ${componentId}`);
      return;
    }
    
    const oldState = component.state;
    const hasChanged = hasDataChanged(oldState, newState, options.ignoreFields);
    
    if (hasChanged) {
      component.state = newState;
      component.isDirty = true;
      component.lastSync = Date.now();
      
      // Queue sync operation if optimistic updates are enabled
      if (isOptimisticUpdatesEnabled(component.dataType)) {
        this.queueSyncOperation('update', component.dataType, newState, {
          componentId,
          priority: options.priority || 'normal'
        });
      }
      
      this.emit('componentStateChanged', { 
        componentId, 
        dataType: component.dataType, 
        oldState, 
        newState 
      });
    }
  }
  
  /**
   * Queue a sync operation
   */
  queueSyncOperation(type, dataType, data, options = {}) {
    if (!isSyncEnabled()) {
      syncLogger.debug('Sync disabled, operation queued for later');
      return;
    }
    
    const operation = new SyncOperation(type, dataType, data, options);
    
    // Add to appropriate queue
    if (!isOnline() && this.offlineSyncConfig.ENABLED) {
      this.offlineQueue.enqueue(operation, this.getPriorityScore(operation.priority));
      syncLogger.debug(`Operation queued offline: ${operation.id}`);
    } else {
      this.syncQueue.enqueue(operation, this.getPriorityScore(operation.priority));
      syncLogger.debug(`Operation queued: ${operation.id}`);
    }
    
    this.emit('operationQueued', operation);
    
    // Process queue if not already processing
    if (!this.activeOperations.size) {
      this.processQueue();
    }
  }
  
  /**
   * Process the sync queue
   */
  async processQueue() {
    if (!this.isRunning || this.activeOperations.size >= SYNC_CONFIG.GENERAL.MAX_CONCURRENT_SYNCS) {
      return;
    }
    
    while (!this.syncQueue.isEmpty() && this.activeOperations.size < SYNC_CONFIG.GENERAL.MAX_CONCURRENT_SYNCS) {
      const operation = this.syncQueue.dequeue();
      if (operation) {
        this.processOperation(operation);
      }
    }
  }
  
  /**
   * Process a single sync operation
   */
  async processOperation(operation) {
    this.activeOperations.set(operation.id, operation);
    operation.status = 'processing';
    
    const timer = performanceMetrics.startTimer();
    
    try {
      syncLogger.debug(`Processing operation: ${operation.id} (${operation.type})`);
      
      // Check if we should use batch processing
      if (this.shouldUseBatchProcessing(operation)) {
        await this.processBatchOperation(operation);
      } else {
        await this.processSingleOperation(operation);
      }
      
      operation.status = 'completed';
      operation.result = 'success';
      
      const { duration } = performanceMetrics.endTimer(timer, true);
      syncLogger.debug(`Operation completed: ${operation.id} (${duration.toFixed(2)}ms)`);
      
      this.emit('operationCompleted', operation);
    } catch (error) {
      operation.status = 'failed';
      operation.error = error;
      operation.attempts++;
      
      const { duration } = performanceMetrics.endTimer(timer, false);
      syncLogger.error(`Operation failed: ${operation.id} (${duration.toFixed(2)}ms)`, error);
      
      // Retry if attempts remaining
      if (operation.attempts < getRetryConfig(operation.dataType).attempts) {
        this.retryOperation(operation);
      } else {
        this.emit('operationFailed', operation);
      }
    } finally {
      this.activeOperations.delete(operation.id);
      
      // Continue processing queue
      this.processQueue();
    }
  }
  
  /**
   * Process a single operation
   */
  async processSingleOperation(operation) {
    const { type, dataType, data, options } = operation;
    
    // Get cached data for comparison
    const cachedData = await cacheService.get(`${dataType}:${data.id || 'latest'}`);
    
    // Check for conflicts
    if (cachedData && type === 'update') {
      const conflict = await this.detectConflict(dataType, cachedData, data);
      if (conflict) {
        await this.handleConflict(operation, conflict);
        return;
      }
    }
    
    // Perform the operation
    switch (type) {
      case 'create':
        await this.performCreate(dataType, data, options);
        break;
      case 'update':
        await this.performUpdate(dataType, data, options);
        break;
      case 'delete':
        await this.performDelete(dataType, data, options);
        break;
      case 'sync':
        await this.performSync(dataType, data, options);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
  
  /**
   * Process batch operation
   */
  async processBatchOperation(operation) {
    const batchProcessor = this.batchProcessors.get(operation.dataType);
    if (!batchProcessor) {
      throw new Error(`No batch processor for data type: ${operation.dataType}`);
    }
    
    batchProcessor.add(operation);
  }
  
  /**
   * Detect conflicts between local and server data
   */
  async detectConflict(dataType, localData, serverData) {
    if (!localData || !serverData) return null;
    
    const localHash = generateDataHash(localData);
    const serverHash = generateDataHash(serverData);
    
    if (localHash !== serverHash) {
      return {
        localData,
        serverData,
        localHash,
        serverHash,
        dataType
      };
    }
    
    return null;
  }
  
  /**
   * Handle conflict resolution
   */
  async handleConflict(operation, conflict) {
    const { dataType, localData, serverData } = conflict;
    
    // Resolve conflict based on strategy
    const resolution = resolveConflict(localData, serverData, null, dataType);
    
    if (resolution.resolved) {
      // Update operation with resolved data
      operation.data = resolution.data;
      operation.conflictResolved = true;
      
      syncLogger.info(`Conflict resolved for ${dataType}: ${resolution.type}`);
      this.emit('conflictResolved', { operation, resolution });
    } else {
      // Manual resolution required
      this.conflictQueue.set(operation.id, { operation, conflict });
      this.emit('conflictDetected', { operation, conflict });
      
      throw new Error('Manual conflict resolution required');
    }
  }
  
  /**
   * Perform create operation
   */
  async performCreate(dataType, data, options) {
    // This would typically call the API
    // For now, we'll simulate the operation
    const result = { ...data, id: generateOperationId(), created_at: Date.now() };
    
    // Update cache
    await cacheService.set(`${dataType}:${result.id}`, result);
    
    // Emit socket event
    this.emitSocketEvent('create', dataType, result);
    
    return result;
  }
  
  /**
   * Perform update operation
   */
  async performUpdate(dataType, data, options) {
    // This would typically call the API
    // For now, we'll simulate the operation
    const result = { ...data, updated_at: Date.now() };
    
    // Update cache
    await cacheService.set(`${dataType}:${result.id}`, result);
    
    // Emit socket event
    this.emitSocketEvent('update', dataType, result);
    
    return result;
  }
  
  /**
   * Perform delete operation
   */
  async performDelete(dataType, data, options) {
    // This would typically call the API
    // For now, we'll simulate the operation
    
    // Remove from cache
    await cacheService.delete(`${dataType}:${data.id}`);
    
    // Emit socket event
    this.emitSocketEvent('delete', dataType, data);
    
    return { success: true };
  }
  
  /**
   * Perform sync operation
   */
  async performSync(dataType, data, options) {
    // This would typically fetch latest data from server
    // For now, we'll simulate the operation
    const result = { ...data, synced_at: Date.now() };
    
    // Update cache
    await cacheService.set(`${dataType}:${result.id}`, result);
    
    return result;
  }
  
  /**
   * Retry a failed operation
   */
  retryOperation(operation) {
    const retryConfig = getRetryConfig(operation.dataType);
    const delay = calculateRetryDelay(operation.attempts, retryConfig);
    
    setTimeout(() => {
      operation.status = 'pending';
      this.syncQueue.enqueue(operation, this.getPriorityScore(operation.priority));
      this.processQueue();
    }, delay);
    
    syncLogger.debug(`Operation ${operation.id} scheduled for retry in ${delay}ms`);
  }
  
  /**
   * Setup batch processors
   */
  setupBatchProcessors() {
    Object.keys(SYNC_CONFIG.STRATEGIES).forEach(dataType => {
      const strategy = SYNC_CONFIG.STRATEGIES[dataType];
      
      if (strategy.BATCH_UPDATES) {
        const batchProcessor = createBatchProcessor(
          async (operations) => {
            await this.processBatchOperations(dataType, operations);
          },
          SYNC_CONFIG.GENERAL.BATCH_SIZE
        );
        
        this.batchProcessors.set(dataType, batchProcessor);
      }
    });
  }
  
  /**
   * Process batch operations
   */
  async processBatchOperations(dataType, operations) {
    // This would typically call a batch API endpoint
    // For now, we'll process them individually
    for (const operation of operations) {
      try {
        await this.processSingleOperation(operation);
      } catch (error) {
        syncLogger.error(`Batch operation failed: ${operation.id}`, error);
      }
    }
  }
  
  /**
   * Start all sync intervals
   */
  startAllSyncIntervals() {
    Object.keys(SYNC_CONFIG.STRATEGIES).forEach(dataType => {
      this.startSyncInterval(dataType);
    });
  }
  
  /**
   * Stop all sync intervals
   */
  stopAllSyncIntervals() {
    this.syncIntervals.forEach((interval, dataType) => {
      clearInterval(interval);
    });
    this.syncIntervals.clear();
  }
  
  /**
   * Start sync interval for a data type
   */
  startSyncInterval(dataType) {
    if (this.syncIntervals.has(dataType)) {
      clearInterval(this.syncIntervals.get(dataType));
    }
    
    const interval = getSyncInterval(dataType);
    const syncInterval = setInterval(() => {
      this.performPeriodicSync(dataType);
    }, interval);
    
    this.syncIntervals.set(dataType, syncInterval);
    syncLogger.debug(`Started sync interval for ${dataType}: ${interval}ms`);
  }
  
  /**
   * Perform periodic sync for a data type
   */
  async performPeriodicSync(dataType) {
    if (!this.isRunning || !isNetworkSuitableForSync()) {
      return;
    }
    
    try {
      // Get all components of this data type
      const components = Array.from(this.componentStates.entries())
        .filter(([_, component]) => component.dataType === dataType);
      
      for (const [componentId, component] of components) {
        if (component.isDirty) {
          this.queueSyncOperation('sync', dataType, component.state, {
            componentId,
            priority: 'low'
          });
        }
      }
    } catch (error) {
      syncLogger.error(`Periodic sync failed for ${dataType}:`, error);
    }
  }
  
  /**
   * Start background sync
   */
  startBackgroundSync() {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    
    this.backgroundSyncInterval = setInterval(() => {
      this.performBackgroundSync();
    }, this.backgroundSyncConfig.INTERVAL);
    
    syncLogger.debug(`Started background sync: ${this.backgroundSyncConfig.INTERVAL}ms`);
  }
  
  /**
   * Perform background sync
   */
  async performBackgroundSync() {
    if (!this.isRunning || !isNetworkSuitableForSync()) {
      return;
    }
    
    try {
      // Sync all dirty components
      for (const [componentId, component] of this.componentStates) {
        if (component.isDirty) {
          this.queueSyncOperation('sync', component.dataType, component.state, {
            componentId,
            priority: 'low'
          });
        }
      }
    } catch (error) {
      syncLogger.error('Background sync failed:', error);
    }
  }
  
  /**
   * Setup offline sync
   */
  setupOfflineSync() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }
  
  /**
   * Handle online event
   */
  async handleOnline() {
    syncLogger.info('Network connection restored');
    
    // Process offline queue
    while (!this.offlineQueue.isEmpty()) {
      const operation = this.offlineQueue.dequeue();
      if (operation) {
        this.syncQueue.enqueue(operation, this.getPriorityScore(operation.priority));
      }
    }
    
    // Process queue
    this.processQueue();
    
    this.emit('online');
  }
  
  /**
   * Handle offline event
   */
  handleOffline() {
    syncLogger.info('Network connection lost');
    this.emit('offline');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for socket events
    this.on('socketConnected', () => {
      syncLogger.info('Socket connected, processing pending operations');
      this.processQueue();
    });
    
    this.on('socketDisconnected', () => {
      syncLogger.warn('Socket disconnected');
    });
  }
  
  /**
   * Emit socket event
   */
  emitSocketEvent(type, dataType, data) {
    // This would typically emit through the socket connection
    // For now, we'll emit a local event
    this.emit('socketEvent', { type, dataType, data });
  }
  
  /**
   * Get priority score for queue ordering
   */
  getPriorityScore(priority) {
    const scores = {
      critical: 100,
      high: 75,
      normal: 50,
      low: 25
    };
    return scores[priority] || 50;
  }
  
  /**
   * Check if batch processing should be used
   */
  shouldUseBatchProcessing(operation) {
    const strategy = getSyncStrategy(operation.dataType);
    return strategy.BATCH_UPDATES && operation.type === 'update';
  }
  
  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      queueSize: this.syncQueue.size(),
      activeOperations: this.activeOperations.size,
      offlineQueueSize: this.offlineQueue.size(),
      componentCount: this.componentStates.size,
      conflictCount: this.conflictQueue.size(),
      performance: performanceMetrics.getStats()
    };
  }
  
  /**
   * Get component state
   */
  getComponentState(componentId) {
    return this.componentStates.get(componentId);
  }
  
  /**
   * Get all component states
   */
  getAllComponentStates() {
    return Array.from(this.componentStates.entries());
  }
  
  /**
   * Clear all data
   */
  clear() {
    this.stop();
    this.syncQueue.clear();
    this.offlineQueue.clear();
    this.activeOperations.clear();
    this.componentStates.clear();
    this.conflictQueue.clear();
    performanceMetrics.reset();
  }
}

// Helper function to generate operation IDs
function generateOperationId() {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;
