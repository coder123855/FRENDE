import { useState, useEffect, useCallback } from 'react';
import cacheAnalyticsService from '../services/cacheAnalytics.js';
import cacheService from '../services/cacheService.js';

/**
 * React hook for cache analytics and performance monitoring
 * Provides real-time access to cache metrics, alerts, and optimization suggestions
 */
export const useCacheAnalytics = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    includeEfficiency = true,
    includeAlerts = true,
    includeSuggestions = true
  } = options;

  const [analytics, setAnalytics] = useState({
    performance: null,
    efficiency: null,
    alerts: [],
    suggestions: [],
    hourlyStats: [],
    dailyStats: [],
    loading: true,
    error: null
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }));

      const performance = cacheAnalyticsService.getPerformanceSummary();
      const hourlyStats = cacheAnalyticsService.getHourlyStats(24);
      const dailyStats = cacheAnalyticsService.getDailyStats(7);

      const newAnalytics = {
        performance,
        hourlyStats,
        dailyStats,
        loading: false,
        error: null
      };

      // Include efficiency metrics if requested
      if (includeEfficiency) {
        newAnalytics.efficiency = cacheAnalyticsService.getCacheEfficiency();
      }

      // Include alerts if requested
      if (includeAlerts) {
        newAnalytics.alerts = cacheAnalyticsService.checkPerformanceAlerts();
      }

      // Include optimization suggestions if requested
      if (includeSuggestions) {
        newAnalytics.suggestions = cacheAnalyticsService.generateOptimizationSuggestions();
      }

      setAnalytics(newAnalytics);
    } catch (error) {
      console.error('Failed to fetch cache analytics:', error);
      setAnalytics(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [includeEfficiency, includeAlerts, includeSuggestions]);

  // Manual refresh
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Record cache operation
  const recordOperation = useCallback((operation, data = {}) => {
    cacheAnalyticsService.recordOperation(operation, data);
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return cacheService.getStats();
  }, []);

  // Export analytics data
  const exportAnalytics = useCallback(() => {
    return cacheAnalyticsService.exportAnalytics();
  }, []);

  // Reset analytics
  const resetAnalytics = useCallback(() => {
    cacheAnalyticsService.reset();
    refresh();
  }, [refresh]);

  // Get performance grade
  const getPerformanceGrade = useCallback(() => {
    if (!analytics.efficiency) return null;
    return analytics.efficiency.efficiency.grade;
  }, [analytics.efficiency]);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    if (!analytics.efficiency) return null;
    return analytics.efficiency.efficiency.score;
  }, [analytics.efficiency]);

  // Check if performance is good
  const isPerformanceGood = useCallback(() => {
    const score = getPerformanceScore();
    return score !== null && score >= 80;
  }, [getPerformanceScore]);

  // Check if performance needs attention
  const needsAttention = useCallback(() => {
    return analytics.alerts.length > 0 || (getPerformanceScore() !== null && getPerformanceScore() < 70);
  }, [analytics.alerts, getPerformanceScore]);

  // Get critical alerts
  const getCriticalAlerts = useCallback(() => {
    return analytics.alerts.filter(alert => alert.severity === 'high');
  }, [analytics.alerts]);

  // Get warning alerts
  const getWarningAlerts = useCallback(() => {
    return analytics.alerts.filter(alert => alert.severity === 'medium');
  }, [analytics.alerts]);

  // Get high priority suggestions
  const getHighPrioritySuggestions = useCallback(() => {
    return analytics.suggestions.filter(suggestion => suggestion.priority === 'high');
  }, [analytics.suggestions]);

  // Get medium priority suggestions
  const getMediumPrioritySuggestions = useCallback(() => {
    return analytics.suggestions.filter(suggestion => suggestion.priority === 'medium');
  }, [analytics.suggestions]);

  // Get bandwidth savings
  const getBandwidthSavings = useCallback(() => {
    if (!analytics.efficiency) return null;
    return analytics.efficiency.bandwidthSaved;
  }, [analytics.efficiency]);

  // Get time savings
  const getTimeSavings = useCallback(() => {
    if (!analytics.efficiency) return null;
    return analytics.efficiency.timeSaved;
  }, [analytics.efficiency]);

  // Get current hit rate
  const getCurrentHitRate = useCallback(() => {
    if (!analytics.performance) return null;
    return analytics.performance.current.hitRate;
  }, [analytics.performance]);

  // Get current error rate
  const getCurrentErrorRate = useCallback(() => {
    if (!analytics.performance) return null;
    return analytics.performance.current.errorRate;
  }, [analytics.performance]);

  // Get requests per minute
  const getRequestsPerMinute = useCallback(() => {
    if (!analytics.performance) return null;
    return parseFloat(analytics.performance.current.requestsPerMinute);
  }, [analytics.performance]);

  // Get memory usage percentage
  const getMemoryUsagePercentage = useCallback(() => {
    if (!analytics.performance?.cache) return null;
    const { memorySize, memoryMaxSize } = analytics.performance.cache;
    return (memorySize / memoryMaxSize) * 100;
  }, [analytics.performance]);

  // Get average get time
  const getAverageGetTime = useCallback(() => {
    if (!analytics.performance?.cache) return null;
    return analytics.performance.cache.averageGetTime;
  }, [analytics.performance]);

  // Get average set time
  const getAverageSetTime = useCallback(() => {
    if (!analytics.performance?.cache) return null;
    return analytics.performance.cache.averageSetTime;
  }, [analytics.performance]);

  // Get peak hour
  const getPeakHour = useCallback(() => {
    if (!analytics.dailyStats.length) return null;
    const today = analytics.dailyStats[analytics.dailyStats.length - 1];
    return today.peakHour;
  }, [analytics.dailyStats]);

  // Get peak requests
  const getPeakRequests = useCallback(() => {
    if (!analytics.dailyStats.length) return null;
    const today = analytics.dailyStats[analytics.dailyStats.length - 1];
    return today.peakRequests;
  }, [analytics.dailyStats]);

  // Auto-refresh effect
  useEffect(() => {
    fetchAnalytics();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, autoRefresh, refreshInterval, refreshKey]);

  return {
    // Data
    analytics,
    performance: analytics.performance,
    efficiency: analytics.efficiency,
    alerts: analytics.alerts,
    suggestions: analytics.suggestions,
    hourlyStats: analytics.hourlyStats,
    dailyStats: analytics.dailyStats,
    
    // State
    loading: analytics.loading,
    error: analytics.error,
    
    // Actions
    refresh,
    recordOperation,
    getCacheStats,
    exportAnalytics,
    resetAnalytics,
    
    // Computed values
    performanceGrade: getPerformanceGrade(),
    performanceScore: getPerformanceScore(),
    isPerformanceGood: isPerformanceGood(),
    needsAttention: needsAttention(),
    currentHitRate: getCurrentHitRate(),
    currentErrorRate: getCurrentErrorRate(),
    requestsPerMinute: getRequestsPerMinute(),
    memoryUsagePercentage: getMemoryUsagePercentage(),
    averageGetTime: getAverageGetTime(),
    averageSetTime: getAverageSetTime(),
    peakHour: getPeakHour(),
    peakRequests: getPeakRequests(),
    bandwidthSavings: getBandwidthSavings(),
    timeSavings: getTimeSavings(),
    
    // Filtered data
    criticalAlerts: getCriticalAlerts(),
    warningAlerts: getWarningAlerts(),
    highPrioritySuggestions: getHighPrioritySuggestions(),
    mediumPrioritySuggestions: getMediumPrioritySuggestions(),
    
    // Utility functions
    formatBytes: (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatTime: (milliseconds) => {
      if (milliseconds < 1000) return `${milliseconds.toFixed(1)}ms`;
      if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
      return `${(milliseconds / 60000).toFixed(1)}m`;
    },
    
    formatPercentage: (value) => {
      return value !== null ? `${(value * 100).toFixed(1)}%` : 'N/A';
    }
  };
};

export default useCacheAnalytics;
