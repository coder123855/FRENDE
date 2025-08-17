/**
 * Sync Status Hook
 * 
 * Hook for monitoring sync status and performance metrics
 * Provides real-time updates on sync operations, conflicts, and system health
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealTime } from '../contexts/RealTimeContext.jsx';
import { SYNC_CONFIG, getPerformanceThresholds } from '../config/syncConfig.js';

/**
 * Main sync status hook
 */
export function useSyncStatus(options = {}) {
  const {
    pollInterval = 1000, // 1 second
    includePerformance = true,
    includeConflicts = true,
    includeNetwork = true,
    includeHealth = true
  } = options;

  const {
    syncStatus,
    syncStats,
    conflicts,
    isOnline,
    lastSync,
    isSyncHealthy
  } = useRealTime();

  const [localStats, setLocalStats] = useState({
    lastUpdate: Date.now(),
    syncCount: 0,
    errorCount: 0,
    averageSyncTime: 0,
    healthScore: 100
  });

  // Calculate health score
  const calculateHealthScore = useCallback(() => {
    const { performance } = syncStats;
    const thresholds = getPerformanceThresholds();
    
    let score = 100;
    
    // Deduct points for errors
    if (performance.errorCount > 0) {
      score -= Math.min(performance.errorCount * 5, 30);
    }
    
    // Deduct points for slow sync
    if (performance.averageDuration > thresholds.MAX_SYNC_DURATION) {
      score -= 20;
    }
    
    // Deduct points for low success rate
    if (performance.successRate < 90) {
      score -= (90 - performance.successRate) * 2;
    }
    
    // Deduct points for conflicts
    if (conflicts.length > 0) {
      score -= Math.min(conflicts.length * 3, 20);
    }
    
    // Deduct points for offline status
    if (!isOnline) {
      score -= 30;
    }
    
    return Math.max(0, score);
  }, [syncStats, conflicts.length, isOnline]);

  // Get sync status summary
  const getStatusSummary = useCallback(() => {
    const healthScore = calculateHealthScore();
    
    if (!isOnline) {
      return {
        status: 'offline',
        label: 'Offline',
        color: 'red',
        priority: 'high'
      };
    }
    
    if (conflicts.length > 0) {
      return {
        status: 'conflict',
        label: `${conflicts.length} Conflicts`,
        color: 'orange',
        priority: 'high'
      };
    }
    
    if (syncStats.activeOperations > 0) {
      return {
        status: 'syncing',
        label: 'Syncing',
        color: 'blue',
        priority: 'medium'
      };
    }
    
    if (syncStats.queueSize > 0) {
      return {
        status: 'pending',
        label: `${syncStats.queueSize} Pending`,
        color: 'yellow',
        priority: 'medium'
      };
    }
    
    if (healthScore < 70) {
      return {
        status: 'unhealthy',
        label: 'Unhealthy',
        color: 'red',
        priority: 'high'
      };
    }
    
    if (healthScore < 90) {
      return {
        status: 'warning',
        label: 'Warning',
        color: 'orange',
        priority: 'medium'
      };
    }
    
    return {
      status: 'healthy',
      label: 'Healthy',
      color: 'green',
      priority: 'low'
    };
  }, [isOnline, conflicts.length, syncStats, calculateHealthScore]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (!includePerformance) return null;
    
    const { performance } = syncStats;
    const thresholds = getPerformanceThresholds();
    
    return {
      successRate: performance.successRate || 0,
      averageDuration: performance.averageDuration || 0,
      totalOperations: performance.totalOperations || 0,
      errorCount: performance.errorCount || 0,
      memoryUsage: performance.averageMemoryUsage || 0,
      thresholds: {
        maxDuration: thresholds.MAX_SYNC_DURATION,
        minSuccessRate: 90,
        maxMemoryUsage: thresholds.MEMORY_THRESHOLD
      },
      isHealthy: {
        duration: performance.averageDuration <= thresholds.MAX_SYNC_DURATION,
        successRate: performance.successRate >= 90,
        memory: performance.averageMemoryUsage <= thresholds.MEMORY_THRESHOLD
      }
    };
  }, [syncStats, includePerformance]);

  // Get conflict summary
  const getConflictSummary = useCallback(() => {
    if (!includeConflicts) return null;
    
    if (conflicts.length === 0) {
      return {
        count: 0,
        hasConflicts: false,
        types: [],
        severity: 'none'
      };
    }
    
    const types = conflicts.map(conflict => conflict.operation?.dataType).filter(Boolean);
    const uniqueTypes = [...new Set(types)];
    
    let severity = 'low';
    if (conflicts.length > 5) severity = 'high';
    else if (conflicts.length > 2) severity = 'medium';
    
    return {
      count: conflicts.length,
      hasConflicts: true,
      types: uniqueTypes,
      severity,
      recentConflicts: conflicts.slice(0, 3)
    };
  }, [conflicts, includeConflicts]);

  // Get network status
  const getNetworkStatus = useCallback(() => {
    if (!includeNetwork) return null;
    
    return {
      isOnline,
      lastSync: lastSync ? new Date(lastSync) : null,
      syncAge: lastSync ? Date.now() - lastSync : null,
      queueSize: syncStats.queueSize,
      offlineQueueSize: syncStats.offlineQueueSize,
      activeOperations: syncStats.activeOperations
    };
  }, [isOnline, lastSync, syncStats, includeNetwork]);

  // Get health status
  const getHealthStatus = useCallback(() => {
    if (!includeHealth) return null;
    
    const healthScore = calculateHealthScore();
    const isHealthy = isSyncHealthy();
    
    return {
      score: healthScore,
      isHealthy,
      status: getStatusSummary(),
      recommendations: getHealthRecommendations(healthScore, syncStats, conflicts)
    };
  }, [calculateHealthScore, isSyncHealthy, getStatusSummary, syncStats, conflicts, includeHealth]);

  // Get health recommendations
  const getHealthRecommendations = useCallback((healthScore, stats, conflicts) => {
    const recommendations = [];
    
    if (healthScore < 70) {
      recommendations.push({
        type: 'error',
        message: 'Sync system is unhealthy. Check network connection and resolve conflicts.',
        priority: 'high'
      });
    }
    
    if (stats.performance.errorCount > 0) {
      recommendations.push({
        type: 'warning',
        message: `${stats.performance.errorCount} sync errors detected. Consider restarting the sync system.`,
        priority: 'medium'
      });
    }
    
    if (conflicts.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${conflicts.length} conflicts need resolution.`,
        priority: 'high'
      });
    }
    
    if (stats.performance.averageDuration > SYNC_CONFIG.PERFORMANCE.MAX_SYNC_DURATION) {
      recommendations.push({
        type: 'info',
        message: 'Sync operations are taking longer than expected. Check network performance.',
        priority: 'medium'
      });
    }
    
    if (!isOnline) {
      recommendations.push({
        type: 'error',
        message: 'Network connection is offline. Sync will resume when connection is restored.',
        priority: 'high'
      });
    }
    
    return recommendations;
  }, [isOnline]);

  // Update local stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalStats(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        healthScore: calculateHealthScore()
      }));
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, calculateHealthScore]);

  // Memoized values
  const statusSummary = useMemo(() => getStatusSummary(), [getStatusSummary]);
  const performanceMetrics = useMemo(() => getPerformanceMetrics(), [getPerformanceMetrics]);
  const conflictSummary = useMemo(() => getConflictSummary(), [getConflictSummary]);
  const networkStatus = useMemo(() => getNetworkStatus(), [getNetworkStatus]);
  const healthStatus = useMemo(() => getHealthStatus(), [getHealthStatus]);

  return {
    // Current status
    status: syncStatus,
    statusSummary,
    isOnline,
    lastSync,
    
    // Statistics
    stats: syncStats,
    localStats,
    
    // Performance
    performance: performanceMetrics,
    
    // Conflicts
    conflicts,
    conflictSummary,
    
    // Network
    network: networkStatus,
    
    // Health
    health: healthStatus,
    
    // Utilities
    isHealthy: healthStatus?.isHealthy || false,
    hasConflicts: conflictSummary?.hasConflicts || false,
    isSyncing: syncStats.activeOperations > 0,
    hasPendingChanges: syncStats.queueSize > 0
  };
}

/**
 * Hook for monitoring specific sync operations
 */
export function useSyncOperationStatus(operationId) {
  const { syncStats } = useRealTime();
  
  const [operationStatus, setOperationStatus] = useState({
    status: 'unknown',
    progress: 0,
    startTime: null,
    endTime: null,
    duration: 0,
    error: null
  });

  // This would typically track a specific operation
  // For now, we'll return a placeholder
  return {
    ...operationStatus,
    isActive: operationStatus.status === 'active',
    isCompleted: operationStatus.status === 'completed',
    isFailed: operationStatus.status === 'failed',
    progress: operationStatus.progress
  };
}

/**
 * Hook for monitoring sync performance trends
 */
export function useSyncPerformanceTrends(options = {}) {
  const {
    timeWindow = 60000, // 1 minute
    dataPoints = 60
  } = options;

  const { syncStats } = useRealTime();
  
  const [trends, setTrends] = useState({
    syncTimes: [],
    successRates: [],
    errorRates: [],
    queueSizes: []
  });

  // Update trends periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTrends(prev => {
        const newTrends = { ...prev };
        
        // Add current data point
        newTrends.syncTimes.push({
          timestamp: now,
          value: syncStats.performance.averageDuration || 0
        });
        
        newTrends.successRates.push({
          timestamp: now,
          value: syncStats.performance.successRate || 0
        });
        
        newTrends.errorRates.push({
          timestamp: now,
          value: syncStats.performance.errorCount || 0
        });
        
        newTrends.queueSizes.push({
          timestamp: now,
          value: syncStats.queueSize || 0
        });
        
        // Remove old data points
        const cutoff = now - timeWindow;
        
        Object.keys(newTrends).forEach(key => {
          newTrends[key] = newTrends[key].filter(point => point.timestamp > cutoff);
        });
        
        return newTrends;
      });
    }, timeWindow / dataPoints);

    return () => clearInterval(interval);
  }, [timeWindow, dataPoints, syncStats]);

  // Calculate trend direction
  const calculateTrend = useCallback((dataPoints) => {
    if (dataPoints.length < 2) return 'stable';
    
    const recent = dataPoints.slice(-5);
    const older = dataPoints.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }, []);

  return {
    trends,
    syncTimeTrend: calculateTrend(trends.syncTimes),
    successRateTrend: calculateTrend(trends.successRates),
    errorRateTrend: calculateTrend(trends.errorRates),
    queueSizeTrend: calculateTrend(trends.queueSizes),
    
    // Summary statistics
    averageSyncTime: trends.syncTimes.length > 0 
      ? trends.syncTimes.reduce((sum, point) => sum + point.value, 0) / trends.syncTimes.length 
      : 0,
    averageSuccessRate: trends.successRates.length > 0 
      ? trends.successRates.reduce((sum, point) => sum + point.value, 0) / trends.successRates.length 
      : 0,
    maxQueueSize: trends.queueSizes.length > 0 
      ? Math.max(...trends.queueSizes.map(point => point.value)) 
      : 0
  };
}

export default useSyncStatus;
