/**
 * Real-Time Context
 * 
 * React Context for real-time synchronization between components
 * Provides sync state, conflict resolution, and cross-component communication
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import syncManager from '../services/syncManager.js';
import { syncLogger } from '../utils/syncUtils.js';
import { SYNC_CONFIG } from '../config/syncConfig.js';

// Create context
const RealTimeContext = createContext();

/**
 * Real-Time Provider Component
 */
export function RealTimeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // State
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncStats, setSyncStats] = useState({
    queueSize: 0,
    activeOperations: 0,
    offlineQueueSize: 0,
    componentCount: 0,
    conflictCount: 0,
    performance: {}
  });
  const [conflicts, setConflicts] = useState(new Map());
  const [componentStates, setComponentStates] = useState(new Map());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(null);
  
  // Refs
  const syncIntervalRef = useRef(null);
  const statsIntervalRef = useRef(null);
  
  /**
   * Initialize sync manager
   */
  const initializeSync = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      syncLogger.info('Initializing real-time sync context');
      
      // Initialize sync manager
      await syncManager.init();
      
      // Start sync manager
      await syncManager.start();
      
      // Setup event listeners
      setupEventListeners();
      
      // Start stats collection
      startStatsCollection();
      
      setSyncStatus('active');
      syncLogger.info('Real-time sync context initialized');
    } catch (error) {
      syncLogger.error('Failed to initialize real-time sync context:', error);
      setSyncStatus('error');
    }
  }, [isAuthenticated, user]);
  
  /**
   * Setup event listeners
   */
  const setupEventListeners = useCallback(() => {
    // Sync manager events
    syncManager.on('initialized', () => {
      setSyncStatus('initialized');
    });
    
    syncManager.on('started', () => {
      setSyncStatus('active');
    });
    
    syncManager.on('stopped', () => {
      setSyncStatus('stopped');
    });
    
    syncManager.on('componentRegistered', ({ componentId, dataType }) => {
      setComponentStates(prev => new Map(prev).set(componentId, { dataType, state: null }));
    });
    
    syncManager.on('componentUnregistered', ({ componentId }) => {
      setComponentStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(componentId);
        return newMap;
      });
    });
    
    syncManager.on('componentStateChanged', ({ componentId, dataType, oldState, newState }) => {
      setComponentStates(prev => {
        const newMap = new Map(prev);
        const component = newMap.get(componentId);
        if (component) {
          newMap.set(componentId, { ...component, state: newState });
        }
        return newMap;
      });
      
      setLastSync(Date.now());
    });
    
    syncManager.on('operationQueued', (operation) => {
      syncLogger.debug(`Operation queued: ${operation.id}`);
    });
    
    syncManager.on('operationCompleted', (operation) => {
      syncLogger.debug(`Operation completed: ${operation.id}`);
    });
    
    syncManager.on('operationFailed', (operation) => {
      syncLogger.error(`Operation failed: ${operation.id}`, operation.error);
    });
    
    syncManager.on('conflictDetected', ({ operation, conflict }) => {
      setConflicts(prev => new Map(prev).set(operation.id, { operation, conflict }));
      syncLogger.warn(`Conflict detected: ${operation.id}`);
    });
    
    syncManager.on('conflictResolved', ({ operation, resolution }) => {
      setConflicts(prev => {
        const newMap = new Map(prev);
        newMap.delete(operation.id);
        return newMap;
      });
      syncLogger.info(`Conflict resolved: ${operation.id}`);
    });
    
    syncManager.on('online', () => {
      setIsOnline(true);
      syncLogger.info('Network connection restored');
    });
    
    syncManager.on('offline', () => {
      setIsOnline(false);
      syncLogger.warn('Network connection lost');
    });
    
    // Socket events
    if (socket) {
      socket.on('sync_update', (data) => {
        handleSocketSyncUpdate(data);
      });
      
      socket.on('sync_conflict', (data) => {
        handleSocketSyncConflict(data);
      });
    }
  }, [socket]);
  
  /**
   * Handle socket sync update
   */
  const handleSocketSyncUpdate = useCallback((data) => {
    const { type, dataType, payload, componentId } = data;
    
    // Update component state if specified
    if (componentId) {
      syncManager.updateComponentState(componentId, payload, { 
        priority: 'high',
        source: 'socket' 
      });
    }
    
    // Emit global update event
    syncManager.emit('socketUpdate', { type, dataType, payload });
    
    syncLogger.debug(`Socket sync update: ${type} ${dataType}`);
  }, []);
  
  /**
   * Handle socket sync conflict
   */
  const handleSocketSyncConflict = useCallback((data) => {
    const { operationId, conflict } = data;
    
    // Add to conflicts map
    setConflicts(prev => new Map(prev).set(operationId, { 
      operation: { id: operationId }, 
      conflict 
    }));
    
    syncLogger.warn(`Socket sync conflict: ${operationId}`);
  }, []);
  
  /**
   * Start stats collection
   */
  const startStatsCollection = useCallback(() => {
    // Update stats immediately
    updateStats();
    
    // Update stats every 5 seconds
    statsIntervalRef.current = setInterval(() => {
      updateStats();
    }, 5000);
  }, []);
  
  /**
   * Update sync stats
   */
  const updateStats = useCallback(() => {
    const status = syncManager.getStatus();
    setSyncStats(status);
  }, []);
  
  /**
   * Register component for sync
   */
  const registerComponent = useCallback((componentId, dataType, initialState = null) => {
    syncManager.registerComponent(componentId, dataType, initialState);
  }, []);
  
  /**
   * Unregister component
   */
  const unregisterComponent = useCallback((componentId) => {
    syncManager.unregisterComponent(componentId);
  }, []);
  
  /**
   * Update component state
   */
  const updateComponentState = useCallback((componentId, newState, options = {}) => {
    syncManager.updateComponentState(componentId, newState, options);
  }, []);
  
  /**
   * Queue sync operation
   */
  const queueSyncOperation = useCallback((type, dataType, data, options = {}) => {
    syncManager.queueSyncOperation(type, dataType, data, options);
  }, []);
  
  /**
   * Resolve conflict manually
   */
  const resolveConflict = useCallback((operationId, resolution) => {
    const conflictData = conflicts.get(operationId);
    if (!conflictData) return;
    
    const { operation, conflict } = conflictData;
    
    // Update operation with resolved data
    operation.data = resolution.data;
    operation.conflictResolved = true;
    
    // Re-queue operation
    syncManager.queueSyncOperation(
      operation.type,
      operation.dataType,
      operation.data,
      operation.options
    );
    
    // Remove from conflicts
    setConflicts(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
    
    syncLogger.info(`Manual conflict resolution: ${operationId}`);
  }, [conflicts]);
  
  /**
   * Get component state
   */
  const getComponentState = useCallback((componentId) => {
    return componentStates.get(componentId);
  }, [componentStates]);
  
  /**
   * Get all component states
   */
  const getAllComponentStates = useCallback(() => {
    return Array.from(componentStates.entries());
  }, [componentStates]);
  
  /**
   * Force sync for a component
   */
  const forceSync = useCallback((componentId) => {
    const component = componentStates.get(componentId);
    if (!component) return;
    
    syncManager.queueSyncOperation('sync', component.dataType, component.state, {
      componentId,
      priority: 'high'
    });
    
    syncLogger.info(`Forced sync for component: ${componentId}`);
  }, [componentStates]);
  
  /**
   * Force sync for all components
   */
  const forceSyncAll = useCallback(() => {
    for (const [componentId, component] of componentStates) {
      if (component.state) {
        syncManager.queueSyncOperation('sync', component.dataType, component.state, {
          componentId,
          priority: 'normal'
        });
      }
    }
    
    syncLogger.info('Forced sync for all components');
  }, [componentStates]);
  
  /**
   * Get sync status for a component
   */
  const getComponentSyncStatus = useCallback((componentId) => {
    const component = componentStates.get(componentId);
    if (!component) return 'unknown';
    
    // Check if component has pending operations
    const hasPendingOps = syncStats.activeOperations > 0;
    const isDirty = component.state && component.lastSync;
    
    if (hasPendingOps && isDirty) return 'syncing';
    if (isDirty) return 'dirty';
    return 'synced';
  }, [componentStates, syncStats]);
  
  /**
   * Clear all conflicts
   */
  const clearConflicts = useCallback(() => {
    setConflicts(new Map());
    syncLogger.info('All conflicts cleared');
  }, []);
  
  /**
   * Get performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    return syncStats.performance;
  }, [syncStats]);
  
  /**
   * Check if sync is healthy
   */
  const isSyncHealthy = useCallback(() => {
    const { performance } = syncStats;
    const thresholds = SYNC_CONFIG.PERFORMANCE;
    
    return (
      performance.successRate >= 90 &&
      performance.averageDuration <= thresholds.MAX_SYNC_DURATION &&
      syncStats.conflictCount === 0
    );
  }, [syncStats]);
  
  // Initialize sync when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSync();
    }
  }, [isAuthenticated, user, initializeSync]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      // Stop sync manager
      syncManager.stop();
    };
  }, []);
  
  // Context value
  const contextValue = {
    // State
    syncStatus,
    syncStats,
    conflicts: Array.from(conflicts.values()),
    componentStates: getAllComponentStates(),
    isOnline,
    lastSync,
    
    // Actions
    registerComponent,
    unregisterComponent,
    updateComponentState,
    queueSyncOperation,
    resolveConflict,
    forceSync,
    forceSyncAll,
    clearConflicts,
    
    // Getters
    getComponentState,
    getComponentSyncStatus,
    getPerformanceMetrics,
    isSyncHealthy,
    
    // Utilities
    isSyncEnabled: () => syncManager.isRunning,
    getSyncManager: () => syncManager,
  };
  
  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
}

/**
 * Hook to use real-time context
 */
export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}

/**
 * Hook for component-specific sync
 */
export function useComponentSync(componentId, dataType, initialState = null) {
  const {
    registerComponent,
    unregisterComponent,
    updateComponentState,
    getComponentState,
    getComponentSyncStatus,
    forceSync
  } = useRealTime();
  
  // Register component on mount
  useEffect(() => {
    if (componentId && dataType) {
      registerComponent(componentId, dataType, initialState);
      
      return () => {
        unregisterComponent(componentId);
      };
    }
  }, [componentId, dataType, initialState, registerComponent, unregisterComponent]);
  
  // Get current state and status
  const componentState = getComponentState(componentId);
  const syncStatus = getComponentSyncStatus(componentId);
  
  return {
    state: componentState?.state,
    syncStatus,
    updateState: (newState, options) => updateComponentState(componentId, newState, options),
    forceSync: () => forceSync(componentId),
    isDirty: componentState?.isDirty || false,
    lastSync: componentState?.lastSync
  };
}

/**
 * Hook for cross-component communication
 */
export function useCrossComponentSync() {
  const { componentStates, updateComponentState, getComponentState } = useRealTime();
  
  const broadcastUpdate = useCallback((dataType, data, options = {}) => {
    // Update all components of the same data type
    for (const [componentId, component] of componentStates) {
      if (component.dataType === dataType) {
        updateComponentState(componentId, data, { ...options, source: 'broadcast' });
      }
    }
  }, [componentStates, updateComponentState]);
  
  const getComponentsByType = useCallback((dataType) => {
    return Array.from(componentStates.entries())
      .filter(([_, component]) => component.dataType === dataType)
      .map(([componentId, component]) => ({ componentId, ...component }));
  }, [componentStates]);
  
  return {
    componentStates,
    broadcastUpdate,
    getComponentsByType,
    getComponentState
  };
}

export default RealTimeContext;
