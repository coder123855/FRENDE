/**
 * Real-Time Sync Hook
 * 
 * Main hook for real-time synchronization capabilities
 * Provides automatic state management, conflict resolution, and performance monitoring
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRealTime, useComponentSync } from '../contexts/RealTimeContext.jsx';
import { useSocket } from './useSocket.js';
import { useCachedData } from './useCache.js';
import { 
  getSyncStrategy, 
  getSyncInterval, 
  isOptimisticUpdatesEnabled,
  getRetryConfig 
} from '../config/syncConfig.js';
import { 
  hasDataChanged, 
  generateDataHash, 
  syncLogger,
  isOnline,
  isNetworkSuitableForSync 
} from '../utils/syncUtils.js';
import cacheService from '../services/cacheService.js';

/**
 * Main real-time sync hook
 */
export function useRealTimeSync(dataType, options = {}) {
  const {
    componentId,
    initialData = null,
    autoSync = true,
    syncInterval = null,
    optimisticUpdates = null,
    conflictResolution = null,
    retryConfig = null,
    onDataChange = null,
    onSyncStart = null,
    onSyncComplete = null,
    onSyncError = null,
    onConflict = null,
    ignoreFields = [],
    priority = 'normal',
    batchUpdates = false,
    cacheKey = null,
    transformData = null,
    validateData = null
  } = options;

  // Generate component ID if not provided
  const generatedComponentId = useMemo(() => {
    return componentId || `sync_${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [componentId, dataType]);

  // Get sync strategy
  const strategy = useMemo(() => getSyncStrategy(dataType), [dataType]);
  
  // Get sync interval
  const effectiveSyncInterval = useMemo(() => {
    return syncInterval || getSyncInterval(dataType);
  }, [syncInterval, dataType]);
  
  // Get optimistic updates setting
  const effectiveOptimisticUpdates = useMemo(() => {
    return optimisticUpdates !== null ? optimisticUpdates : isOptimisticUpdatesEnabled(dataType);
  }, [optimisticUpdates, dataType]);
  
  // Get retry configuration
  const effectiveRetryConfig = useMemo(() => {
    return retryConfig || getRetryConfig(dataType);
  }, [retryConfig, dataType]);

  // Real-time context
  const {
    syncStatus: globalSyncStatus,
    isOnline: globalIsOnline,
    conflicts,
    resolveConflict,
    forceSyncAll
  } = useRealTime();

  // Component-specific sync
  const {
    state: componentState,
    syncStatus: componentSyncStatus,
    updateState: updateComponentState,
    forceSync: forceComponentSync,
    isDirty,
    lastSync
  } = useComponentSync(generatedComponentId, dataType, initialData);

  // Socket connection
  const { socket, isConnected } = useSocket();

  // Local state
  const [localState, setLocalState] = useState(initialData);
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    lastSyncAttempt: null,
    syncErrors: [],
    pendingChanges: false,
    conflictId: null
  });
  const [performance, setPerformance] = useState({
    syncCount: 0,
    averageSyncTime: 0,
    lastSyncTime: 0,
    errorCount: 0
  });

  // Refs
  const syncTimeoutRef = useRef(null);
  const lastDataHashRef = useRef(null);
  const syncStartTimeRef = useRef(null);
  const pendingChangesRef = useRef(false);

  // Cache key for this data
  const effectiveCacheKey = useMemo(() => {
    return cacheKey || `${dataType}:${generatedComponentId}`;
  }, [cacheKey, dataType, generatedComponentId]);

  // Cached data hook
  const { data: cachedData, loading: cacheLoading, error: cacheError } = useCachedData(
    effectiveCacheKey,
    { 
      ttl: strategy.SYNC_INTERVAL * 2,
      staleWhileRevalidate: true 
    }
  );

  /**
   * Transform data if transform function provided
   */
  const transformDataIfNeeded = useCallback((data) => {
    if (transformData && data) {
      try {
        return transformData(data);
      } catch (error) {
        syncLogger.error('Data transformation failed:', error);
        return data;
      }
    }
    return data;
  }, [transformData]);

  /**
   * Validate data if validation function provided
   */
  const validateDataIfNeeded = useCallback((data) => {
    if (validateData && data) {
      try {
        return validateData(data);
      } catch (error) {
        syncLogger.error('Data validation failed:', error);
        return false;
      }
    }
    return true;
  }, [validateData]);

  /**
   * Update local state
   */
  const updateLocalState = useCallback((newData, options = {}) => {
    const transformedData = transformDataIfNeeded(newData);
    
    if (!validateDataIfNeeded(transformedData)) {
      syncLogger.warn('Data validation failed, update rejected');
      return false;
    }

    const oldData = localState;
    const hasChanged = hasDataChanged(oldData, transformedData, ignoreFields);
    
    if (hasChanged) {
      setLocalState(transformedData);
      pendingChangesRef.current = true;
      
      // Update component state if optimistic updates enabled
      if (effectiveOptimisticUpdates) {
        updateComponentState(transformedData, {
          priority,
          source: 'local',
          ...options
        });
      }
      
      // Call onDataChange callback
      if (onDataChange) {
        onDataChange(transformedData, oldData, options);
      }
      
      // Generate new hash
      lastDataHashRef.current = generateDataHash(transformedData);
      
      return true;
    }
    
    return false;
  }, [
    localState, 
    transformDataIfNeeded, 
    validateDataIfNeeded, 
    ignoreFields, 
    effectiveOptimisticUpdates, 
    updateComponentState, 
    priority, 
    onDataChange
  ]);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async (force = false) => {
    if (!autoSync && !force) return;
    
    if (syncState.isSyncing && !force) {
      syncLogger.debug('Sync already in progress, skipping');
      return;
    }

    if (!isOnline() && !force) {
      syncLogger.debug('Offline, skipping sync');
      return;
    }

    if (!isNetworkSuitableForSync() && !force) {
      syncLogger.debug('Network not suitable for sync, skipping');
      return;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      syncStartTimeRef.current = performance.now();
      
      if (onSyncStart) {
        onSyncStart(localState);
      }

      syncLogger.debug(`Starting sync for ${dataType}:${generatedComponentId}`);

      // Update component state to trigger sync
      if (localState) {
        updateComponentState(localState, {
          priority: force ? 'high' : priority,
          source: 'sync'
        });
      }

      // Wait for sync to complete
      await new Promise(resolve => {
        const checkSync = () => {
          if (!syncState.isSyncing) {
            resolve();
          } else {
            setTimeout(checkSync, 100);
          }
        };
        checkSync();
      });

      const syncTime = performance.now() - syncStartTimeRef.current;
      
      setPerformance(prev => ({
        ...prev,
        syncCount: prev.syncCount + 1,
        lastSyncTime: syncTime,
        averageSyncTime: (prev.averageSyncTime * prev.syncCount + syncTime) / (prev.syncCount + 1)
      }));

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAttempt: Date.now(),
        pendingChanges: false
      }));

      pendingChangesRef.current = false;

      if (onSyncComplete) {
        onSyncComplete(localState, syncTime);
      }

      syncLogger.debug(`Sync completed for ${dataType}:${generatedComponentId} in ${syncTime.toFixed(2)}ms`);

    } catch (error) {
      const syncTime = performance.now() - syncStartTimeRef.current;
      
      setPerformance(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAttempt: Date.now(),
        syncErrors: [...prev.syncErrors, { error, timestamp: Date.now() }]
      }));

      if (onSyncError) {
        onSyncError(error, localState, syncTime);
      }

      syncLogger.error(`Sync failed for ${dataType}:${generatedComponentId}:`, error);
    }
  }, [
    autoSync,
    syncState.isSyncing,
    isOnline,
    onSyncStart,
    dataType,
    generatedComponentId,
    localState,
    updateComponentState,
    priority,
    onSyncComplete,
    onSyncError
  ]);

  /**
   * Force sync
   */
  const forceSync = useCallback(() => {
    return performSync(true);
  }, [performSync]);

  /**
   * Handle conflicts
   */
  const handleConflict = useCallback((conflictId, resolution) => {
    try {
      resolveConflict(conflictId, resolution);
      setSyncState(prev => ({ ...prev, conflictId: null }));
      
      if (onConflict) {
        onConflict(resolution);
      }
      
      syncLogger.info(`Conflict resolved: ${conflictId}`);
    } catch (error) {
      syncLogger.error(`Failed to resolve conflict: ${conflictId}`, error);
    }
  }, [resolveConflict, onConflict]);

  /**
   * Get current data (prioritizing local state)
   */
  const getCurrentData = useCallback(() => {
    // Priority: local state > cached data > component state
    return localState || cachedData || componentState || initialData;
  }, [localState, cachedData, componentState, initialData]);

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback(() => {
    if (syncState.isSyncing) return 'syncing';
    if (syncState.conflictId) return 'conflict';
    if (syncState.syncErrors.length > 0) return 'error';
    if (pendingChangesRef.current) return 'pending';
    if (componentSyncStatus === 'syncing') return 'syncing';
    if (componentSyncStatus === 'dirty') return 'dirty';
    return 'synced';
  }, [syncState, componentSyncStatus]);

  /**
   * Check if data is stale
   */
  const isDataStale = useCallback(() => {
    if (!lastSync) return true;
    const staleThreshold = effectiveSyncInterval * 2;
    return Date.now() - lastSync > staleThreshold;
  }, [lastSync, effectiveSyncInterval]);

  /**
   * Setup automatic sync
   */
  useEffect(() => {
    if (!autoSync) return;

    const setupAutoSync = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        performSync();
      }, effectiveSyncInterval);
    };

    setupAutoSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [autoSync, effectiveSyncInterval, performSync]);

  /**
   * Handle cached data updates
   */
  useEffect(() => {
    if (cachedData && !localState) {
      updateLocalState(cachedData, { source: 'cache' });
    }
  }, [cachedData, localState, updateLocalState]);

  /**
   * Handle component state updates
   */
  useEffect(() => {
    if (componentState && !localState) {
      updateLocalState(componentState, { source: 'component' });
    }
  }, [componentState, localState, updateLocalState]);

  /**
   * Handle conflicts
   */
  useEffect(() => {
    const componentConflicts = conflicts.filter(
      conflict => conflict.operation?.options?.componentId === generatedComponentId
    );
    
    if (componentConflicts.length > 0) {
      const conflict = componentConflicts[0];
      setSyncState(prev => ({ ...prev, conflictId: conflict.operation.id }));
      
      if (onConflict) {
        onConflict(conflict);
      }
    }
  }, [conflicts, generatedComponentId, onConflict]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Return hook interface
  return {
    // Data
    data: getCurrentData(),
    localData: localState,
    cachedData,
    componentData: componentState,
    
    // State
    syncStatus: getSyncStatus(),
    globalSyncStatus,
    componentSyncStatus,
    isSyncing: syncState.isSyncing,
    isDirty,
    isOnline: globalIsOnline,
    isConnected,
    isDataStale: isDataStale(),
    pendingChanges: pendingChangesRef.current,
    
    // Performance
    performance,
    lastSync,
    lastSyncAttempt: syncState.lastSyncAttempt,
    syncErrors: syncState.syncErrors,
    
    // Actions
    updateData: updateLocalState,
    sync: performSync,
    forceSync,
    forceComponentSync,
    resolveConflict: handleConflict,
    
    // Utilities
    componentId: generatedComponentId,
    dataType,
    strategy,
    syncInterval: effectiveSyncInterval,
    optimisticUpdates: effectiveOptimisticUpdates,
    retryConfig: effectiveRetryConfig,
    
    // Cache
    cacheKey: effectiveCacheKey,
    cacheLoading,
    cacheError,
    
    // Conflicts
    conflicts: conflicts.filter(
      conflict => conflict.operation?.options?.componentId === generatedComponentId
    ),
    currentConflict: syncState.conflictId ? 
      conflicts.find(c => c.operation.id === syncState.conflictId) : null
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticSync(dataType, options = {}) {
  const syncHook = useRealTimeSync(dataType, {
    ...options,
    optimisticUpdates: true
  });

  const optimisticUpdate = useCallback((updater, options = {}) => {
    const currentData = syncHook.data;
    const newData = typeof updater === 'function' ? updater(currentData) : updater;
    
    return syncHook.updateData(newData, {
      ...options,
      optimistic: true
    });
  }, [syncHook]);

  return {
    ...syncHook,
    optimisticUpdate
  };
}

/**
 * Hook for batch updates
 */
export function useBatchSync(dataType, options = {}) {
  const [batchQueue, setBatchQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const syncHook = useRealTimeSync(dataType, {
    ...options,
    batchUpdates: true
  });

  const addToBatch = useCallback((update) => {
    setBatchQueue(prev => [...prev, update]);
  }, []);

  const processBatch = useCallback(async () => {
    if (batchQueue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Process all updates in batch
      for (const update of batchQueue) {
        await syncHook.updateData(update.data, update.options);
      }
      
      // Clear batch queue
      setBatchQueue([]);
      
      // Force sync
      await syncHook.forceSync();
      
    } catch (error) {
      syncLogger.error('Batch processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [batchQueue, isProcessing, syncHook]);

  // Auto-process batch when queue gets large
  useEffect(() => {
    if (batchQueue.length >= 10) {
      processBatch();
    }
  }, [batchQueue.length, processBatch]);

  return {
    ...syncHook,
    batchQueue,
    isProcessing,
    addToBatch,
    processBatch
  };
}

export default useRealTimeSync;
