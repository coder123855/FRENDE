import cacheService from './cacheService.js';

// Cache analytics service for performance tracking and optimization
export class CacheAnalyticsService {
  constructor() {
    this.metrics = {
      daily: new Map(),
      hourly: new Map(),
      realtime: {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        startTime: Date.now()
      }
    };
    this.performanceThresholds = {
      hitRate: 0.8, // 80% target hit rate
      averageGetTime: 50, // 50ms target
      averageSetTime: 100, // 100ms target
      errorRate: 0.05 // 5% max error rate
    };
    this.alerts = [];
    this.optimizationSuggestions = [];
    
    this.startPeriodicAnalysis();
  }

  // Record cache operation
  recordOperation(operation, data = {}) {
    const timestamp = Date.now();
    const hour = new Date(timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const day = new Date(timestamp).toISOString().slice(0, 10); // YYYY-MM-DD

    // Update realtime metrics
    this.metrics.realtime.requests++;
    if (operation === 'hit') this.metrics.realtime.hits++;
    if (operation === 'miss') this.metrics.realtime.misses++;
    if (operation === 'error') this.metrics.realtime.errors++;

    // Update hourly metrics
    if (!this.metrics.hourly.has(hour)) {
      this.metrics.hourly.set(hour, {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        sets: 0,
        deletes: 0,
        averageGetTime: 0,
        averageSetTime: 0,
        totalGetTime: 0,
        totalSetTime: 0,
        getCount: 0,
        setCount: 0
      });
    }

    const hourlyData = this.metrics.hourly.get(hour);
    hourlyData.requests++;
    
    if (operation === 'hit') hourlyData.hits++;
    if (operation === 'miss') hourlyData.misses++;
    if (operation === 'error') hourlyData.errors++;
    if (operation === 'set') hourlyData.sets++;
    if (operation === 'delete') hourlyData.deletes++;

    if (data.getTime) {
      hourlyData.totalGetTime += data.getTime;
      hourlyData.getCount++;
      hourlyData.averageGetTime = hourlyData.totalGetTime / hourlyData.getCount;
    }

    if (data.setTime) {
      hourlyData.totalSetTime += data.setTime;
      hourlyData.setCount++;
      hourlyData.averageSetTime = hourlyData.totalSetTime / hourlyData.setCount;
    }

    // Update daily metrics
    if (!this.metrics.daily.has(day)) {
      this.metrics.daily.set(day, {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        sets: 0,
        deletes: 0,
        averageGetTime: 0,
        averageSetTime: 0,
        totalGetTime: 0,
        totalSetTime: 0,
        getCount: 0,
        setCount: 0,
        peakHour: null,
        peakRequests: 0
      });
    }

    const dailyData = this.metrics.daily.get(day);
    dailyData.requests++;
    
    if (operation === 'hit') dailyData.hits++;
    if (operation === 'miss') dailyData.misses++;
    if (operation === 'error') dailyData.errors++;
    if (operation === 'set') dailyData.sets++;
    if (operation === 'delete') dailyData.deletes++;

    if (data.getTime) {
      dailyData.totalGetTime += data.getTime;
      dailyData.getCount++;
      dailyData.averageGetTime = dailyData.totalGetTime / dailyData.getCount;
    }

    if (data.setTime) {
      dailyData.totalSetTime += data.setTime;
      dailyData.setCount++;
      dailyData.averageSetTime = dailyData.totalSetTime / dailyData.setCount;
    }

    // Track peak hour
    if (hourlyData.requests > dailyData.peakRequests) {
      dailyData.peakRequests = hourlyData.requests;
      dailyData.peakHour = hour;
    }
  }

  // Get current hit rate
  getCurrentHitRate() {
    const { hits, misses } = this.metrics.realtime;
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  // Get current error rate
  getCurrentErrorRate() {
    const { requests, errors } = this.metrics.realtime;
    return requests > 0 ? errors / requests : 0;
  }

  // Get hourly statistics
  getHourlyStats(hours = 24) {
    const stats = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString().slice(0, 13);
      const data = this.metrics.hourly.get(hour) || {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        sets: 0,
        deletes: 0,
        averageGetTime: 0,
        averageSetTime: 0
      };
      
      const hitRate = data.requests > 0 ? data.hits / data.requests : 0;
      const errorRate = data.requests > 0 ? data.errors / data.requests : 0;
      
      stats.push({
        hour,
        ...data,
        hitRate,
        errorRate
      });
    }
    
    return stats;
  }

  // Get daily statistics
  getDailyStats(days = 7) {
    const stats = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const data = this.metrics.daily.get(day) || {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        sets: 0,
        deletes: 0,
        averageGetTime: 0,
        averageSetTime: 0,
        peakHour: null,
        peakRequests: 0
      };
      
      const hitRate = data.requests > 0 ? data.hits / data.requests : 0;
      const errorRate = data.requests > 0 ? data.errors / data.requests : 0;
      
      stats.push({
        day,
        ...data,
        hitRate,
        errorRate
      });
    }
    
    return stats;
  }

  // Get performance summary
  getPerformanceSummary() {
    const currentHitRate = this.getCurrentHitRate();
    const currentErrorRate = this.getCurrentErrorRate();
    const uptime = Date.now() - this.metrics.realtime.startTime;
    
    const cacheStats = cacheService.getStats();
    
    return {
      current: {
        hitRate: currentHitRate,
        errorRate: currentErrorRate,
        requests: this.metrics.realtime.requests,
        uptime: uptime,
        requestsPerMinute: (this.metrics.realtime.requests / (uptime / 60000)).toFixed(2)
      },
      cache: {
        memorySize: cacheStats.memorySize,
        memoryMaxSize: cacheStats.memoryMaxSize,
        backgroundRefreshQueueSize: cacheStats.backgroundRefreshQueueSize,
        cacheWarmingQueueSize: cacheStats.cacheWarmingQueueSize,
        averageGetTime: cacheStats.performance?.averageGetTime || 0,
        averageSetTime: cacheStats.performance?.averageSetTime || 0
      },
      thresholds: this.performanceThresholds
    };
  }

  // Check for performance alerts
  checkPerformanceAlerts() {
    const summary = this.getPerformanceSummary();
    const alerts = [];

    // Hit rate alert
    if (summary.current.hitRate < this.performanceThresholds.hitRate) {
      alerts.push({
        type: 'warning',
        message: `Low cache hit rate: ${(summary.current.hitRate * 100).toFixed(1)}% (target: ${(this.performanceThresholds.hitRate * 100).toFixed(1)}%)`,
        timestamp: Date.now(),
        severity: 'medium'
      });
    }

    // Error rate alert
    if (summary.current.errorRate > this.performanceThresholds.errorRate) {
      alerts.push({
        type: 'error',
        message: `High cache error rate: ${(summary.current.errorRate * 100).toFixed(1)}% (max: ${(this.performanceThresholds.errorRate * 100).toFixed(1)}%)`,
        timestamp: Date.now(),
        severity: 'high'
      });
    }

    // Performance alert
    if (summary.cache.averageGetTime > this.performanceThresholds.averageGetTime) {
      alerts.push({
        type: 'warning',
        message: `Slow cache get operations: ${summary.cache.averageGetTime.toFixed(1)}ms (target: ${this.performanceThresholds.averageGetTime}ms)`,
        timestamp: Date.now(),
        severity: 'medium'
      });
    }

    // Memory usage alert
    const memoryUsage = summary.cache.memorySize / summary.cache.memoryMaxSize;
    if (memoryUsage > 0.9) {
      alerts.push({
        type: 'warning',
        message: `High memory cache usage: ${(memoryUsage * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        severity: 'medium'
      });
    }

    this.alerts = alerts;
    return alerts;
  }

  // Generate optimization suggestions
  generateOptimizationSuggestions() {
    const summary = this.getPerformanceSummary();
    const suggestions = [];

    // Low hit rate suggestions
    if (summary.current.hitRate < this.performanceThresholds.hitRate) {
      suggestions.push({
        type: 'hit_rate',
        priority: 'high',
        title: 'Increase Cache Hit Rate',
        description: 'Consider increasing TTL for frequently accessed data or implementing cache warming for critical endpoints.',
        actions: [
          'Review cache TTL settings for frequently accessed endpoints',
          'Implement cache warming for critical data',
          'Consider adding more cache layers (L1/L2)',
          'Analyze cache miss patterns to identify optimization opportunities'
        ]
      });
    }

    // High error rate suggestions
    if (summary.current.errorRate > this.performanceThresholds.errorRate) {
      suggestions.push({
        type: 'error_rate',
        priority: 'high',
        title: 'Reduce Cache Errors',
        description: 'High error rate indicates cache system issues that need immediate attention.',
        actions: [
          'Check IndexedDB storage availability and quota',
          'Review cache cleanup and eviction policies',
          'Monitor for storage quota exceeded errors',
          'Implement better error handling and fallback mechanisms'
        ]
      });
    }

    // Performance suggestions
    if (summary.cache.averageGetTime > this.performanceThresholds.averageGetTime) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Cache Performance',
        description: 'Cache operations are slower than expected, consider optimization strategies.',
        actions: [
          'Review cache key generation efficiency',
          'Consider implementing cache compression for large objects',
          'Optimize IndexedDB operations with better indexing',
          'Implement cache partitioning for better performance'
        ]
      });
    }

    // Memory usage suggestions
    const memoryUsage = summary.cache.memorySize / summary.cache.memoryMaxSize;
    if (memoryUsage > 0.8) {
      suggestions.push({
        type: 'memory',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: 'Memory cache is approaching capacity limits.',
        actions: [
          'Increase memory cache size if possible',
          'Implement more aggressive LRU eviction',
          'Consider moving less frequently accessed data to IndexedDB',
          'Review cache entry sizes and optimize data structures'
        ]
      });
    }

    this.optimizationSuggestions = suggestions;
    return suggestions;
  }

  // Get cache efficiency metrics
  getCacheEfficiency() {
    const summary = this.getPerformanceSummary();
    const hourlyStats = this.getHourlyStats(24);
    
    // Calculate efficiency metrics
    const totalRequests = hourlyStats.reduce((sum, stat) => sum + stat.requests, 0);
    const totalHits = hourlyStats.reduce((sum, stat) => sum + stat.hits, 0);
    const totalErrors = hourlyStats.reduce((sum, stat) => sum + stat.errors, 0);
    
    const overallHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    const overallErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    // Calculate bandwidth savings (assuming average response size)
    const averageResponseSize = 2048; // 2KB estimate
    const bandwidthSaved = totalHits * averageResponseSize;
    
    // Calculate time savings
    const averageNetworkTime = 200; // 200ms estimate
    const timeSaved = totalHits * averageNetworkTime;
    
    return {
      overallHitRate,
      overallErrorRate,
      bandwidthSaved: {
        bytes: bandwidthSaved,
        kilobytes: (bandwidthSaved / 1024).toFixed(2),
        megabytes: (bandwidthSaved / (1024 * 1024)).toFixed(2)
      },
      timeSaved: {
        milliseconds: timeSaved,
        seconds: (timeSaved / 1000).toFixed(2),
        minutes: (timeSaved / (1000 * 60)).toFixed(2)
      },
      efficiency: {
        score: Math.min(100, (overallHitRate * 100) - (overallErrorRate * 100)),
        grade: this.getEfficiencyGrade(overallHitRate, overallErrorRate)
      }
    };
  }

  // Get efficiency grade
  getEfficiencyGrade(hitRate, errorRate) {
    const score = (hitRate * 100) - (errorRate * 100);
    
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  // Start periodic analysis
  startPeriodicAnalysis() {
    // Check performance every 5 minutes
    setInterval(() => {
      this.checkPerformanceAlerts();
      this.generateOptimizationSuggestions();
    }, 5 * 60 * 1000);

    // Clean up old metrics daily
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  // Clean up old metrics
  cleanupOldMetrics() {
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Clean up hourly metrics older than 7 days
    for (const [hour] of this.metrics.hourly) {
      const hourDate = new Date(hour);
      if (now.getTime() - hourDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
        this.metrics.hourly.delete(hour);
      }
    }

    // Clean up daily metrics older than 30 days
    for (const [day] of this.metrics.daily) {
      const dayDate = new Date(day);
      if (now.getTime() - dayDate.getTime() > maxAge) {
        this.metrics.daily.delete(day);
      }
    }
  }

  // Export analytics data
  exportAnalytics() {
    return {
      metrics: {
        daily: Object.fromEntries(this.metrics.daily),
        hourly: Object.fromEntries(this.metrics.hourly),
        realtime: this.metrics.realtime
      },
      performance: this.getPerformanceSummary(),
      efficiency: this.getCacheEfficiency(),
      alerts: this.alerts,
      suggestions: this.optimizationSuggestions,
      exportTime: new Date().toISOString()
    };
  }

  // Reset analytics
  reset() {
    this.metrics = {
      daily: new Map(),
      hourly: new Map(),
      realtime: {
        requests: 0,
        hits: 0,
        misses: 0,
        errors: 0,
        startTime: Date.now()
      }
    };
    this.alerts = [];
    this.optimizationSuggestions = [];
  }
}

// Create singleton instance
const cacheAnalyticsService = new CacheAnalyticsService();

export default cacheAnalyticsService;
