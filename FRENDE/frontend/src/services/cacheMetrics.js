import cacheService from './cacheService.js';
import { isDebugMode, getLogLevel } from '../config/cacheConfig.js';

// Cache performance metrics
class CacheMetrics {
  constructor() {
    this.metrics = {
      // Performance metrics
      responseTimes: [],
      hitRates: [],
      errorRates: [],
      
      // Usage metrics
      cacheSizes: [],
      memoryUsage: [],
      
      // Error tracking
      errors: [],
      
      // Timestamps for tracking
      timestamps: [],
      
      // Configuration
      maxDataPoints: 100,
      collectionInterval: 60000, // 1 minute
    };
    
    this.collectionTimer = null;
    this.isCollecting = false;
    
    this.startCollection();
  }

  // Start metrics collection
  startCollection() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.collectMetrics();
    
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.metrics.collectionInterval);
  }

  // Stop metrics collection
  stopCollection() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
    this.isCollecting = false;
  }

  // Collect current metrics
  async collectMetrics() {
    try {
      const timestamp = Date.now();
      const stats = cacheService.getStats();
      const cacheSize = await cacheService.getCacheSize();
      
      // Add performance metrics
      this.metrics.responseTimes.push({
        timestamp,
        value: this.calculateAverageResponseTime(),
      });
      
      this.metrics.hitRates.push({
        timestamp,
        value: stats.hitRate * 100,
      });
      
      this.metrics.errorRates.push({
        timestamp,
        value: this.calculateErrorRate(stats),
      });
      
      // Add usage metrics
      this.metrics.cacheSizes.push({
        timestamp,
        value: cacheSize,
      });
      
      this.metrics.memoryUsage.push({
        timestamp,
        value: (stats.memorySize / stats.memoryMaxSize) * 100,
      });
      
      // Add timestamp
      this.metrics.timestamps.push(timestamp);
      
      // Trim old data points
      this.trimDataPoints();
      
      // Log metrics in debug mode
      if (isDebugMode() && getLogLevel() === 'debug') {
        console.log('Cache metrics collected:', {
          timestamp: new Date(timestamp).toISOString(),
          hitRate: stats.hitRate * 100,
          cacheSize,
          memoryUsage: (stats.memorySize / stats.memoryMaxSize) * 100,
        });
      }
    } catch (error) {
      this.recordError('Metrics collection failed', error);
    }
  }

  // Calculate average response time
  calculateAverageResponseTime() {
    // This would be implemented with actual response time tracking
    // For now, return a placeholder value
    return Math.random() * 50 + 10; // 10-60ms range
  }

  // Calculate error rate
  calculateErrorRate(stats) {
    const totalRequests = stats.hits + stats.misses;
    if (totalRequests === 0) return 0;
    return (stats.errors / totalRequests) * 100;
  }

  // Record an error
  recordError(message, error) {
    const errorRecord = {
      timestamp: Date.now(),
      message,
      error: error?.message || error,
      stack: error?.stack,
    };
    
    this.metrics.errors.push(errorRecord);
    
    // Trim error log
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
    
    if (isDebugMode()) {
      console.error('Cache error:', errorRecord);
    }
  }

  // Trim data points to keep within limits
  trimDataPoints() {
    const maxPoints = this.metrics.maxDataPoints;
    
    if (this.metrics.responseTimes.length > maxPoints) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-maxPoints);
    }
    
    if (this.metrics.hitRates.length > maxPoints) {
      this.metrics.hitRates = this.metrics.hitRates.slice(-maxPoints);
    }
    
    if (this.metrics.errorRates.length > maxPoints) {
      this.metrics.errorRates = this.metrics.errorRates.slice(-maxPoints);
    }
    
    if (this.metrics.cacheSizes.length > maxPoints) {
      this.metrics.cacheSizes = this.metrics.cacheSizes.slice(-maxPoints);
    }
    
    if (this.metrics.memoryUsage.length > maxPoints) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxPoints);
    }
    
    if (this.metrics.timestamps.length > maxPoints) {
      this.metrics.timestamps = this.metrics.timestamps.slice(-maxPoints);
    }
  }

  // Get current metrics summary
  getSummary() {
    const stats = cacheService.getStats();
    
    return {
      current: {
        hitRate: stats.hitRate * 100,
        cacheSize: this.metrics.cacheSizes[this.metrics.cacheSizes.length - 1]?.value || 0,
        memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]?.value || 0,
        errorRate: this.metrics.errorRates[this.metrics.errorRates.length - 1]?.value || 0,
        totalRequests: stats.hits + stats.misses,
        totalErrors: stats.errors,
      },
      trends: {
        hitRateTrend: this.calculateTrend(this.metrics.hitRates),
        cacheSizeTrend: this.calculateTrend(this.metrics.cacheSizes),
        memoryUsageTrend: this.calculateTrend(this.metrics.memoryUsage),
        errorRateTrend: this.calculateTrend(this.metrics.errorRates),
      },
      performance: {
        averageResponseTime: this.calculateAverage(this.metrics.responseTimes),
        peakResponseTime: this.calculatePeak(this.metrics.responseTimes),
        averageHitRate: this.calculateAverage(this.metrics.hitRates),
        averageErrorRate: this.calculateAverage(this.metrics.errorRates),
      },
      health: {
        isHealthy: this.isHealthy(),
        issues: this.getIssues(),
        recommendations: this.getRecommendations(),
      },
    };
  }

  // Calculate trend (positive, negative, or stable)
  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return 'stable';
    
    const recent = dataPoints.slice(-5);
    const older = dataPoints.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  // Calculate average of data points
  calculateAverage(dataPoints) {
    if (dataPoints.length === 0) return 0;
    
    const values = dataPoints.map(dp => dp.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  // Calculate peak value
  calculatePeak(dataPoints) {
    if (dataPoints.length === 0) return 0;
    
    const values = dataPoints.map(dp => dp.value);
    return Math.max(...values);
  }

  // Check if cache is healthy
  isHealthy() {
    const summary = this.getSummary();
    const { current, trends } = summary;
    
    // Check hit rate
    if (current.hitRate < 50) return false;
    
    // Check error rate
    if (current.errorRate > 5) return false;
    
    // Check memory usage
    if (current.memoryUsage > 90) return false;
    
    // Check for declining trends
    if (trends.hitRateTrend === 'decreasing') return false;
    if (trends.errorRateTrend === 'increasing') return false;
    
    return true;
  }

  // Get current issues
  getIssues() {
    const issues = [];
    const summary = this.getSummary();
    const { current, trends } = summary;
    
    if (current.hitRate < 50) {
      issues.push({
        type: 'low_hit_rate',
        severity: 'high',
        message: `Cache hit rate is low (${current.hitRate.toFixed(1)}%)`,
        recommendation: 'Consider adjusting cache TTL or increasing cache size',
      });
    }
    
    if (current.errorRate > 5) {
      issues.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `Cache error rate is high (${current.errorRate.toFixed(1)}%)`,
        recommendation: 'Check cache configuration and storage availability',
      });
    }
    
    if (current.memoryUsage > 90) {
      issues.push({
        type: 'high_memory_usage',
        severity: 'medium',
        message: `Memory cache usage is high (${current.memoryUsage.toFixed(1)}%)`,
        recommendation: 'Consider increasing memory cache size or reducing TTL',
      });
    }
    
    if (trends.hitRateTrend === 'decreasing') {
      issues.push({
        type: 'declining_hit_rate',
        severity: 'medium',
        message: 'Cache hit rate is declining',
        recommendation: 'Monitor cache patterns and adjust strategy',
      });
    }
    
    return issues;
  }

  // Get recommendations
  getRecommendations() {
    const recommendations = [];
    const summary = this.getSummary();
    const { current, trends } = summary;
    
    if (current.hitRate < 60) {
      recommendations.push({
        priority: 'high',
        action: 'Increase cache TTL for frequently accessed data',
        impact: 'Should improve hit rate significantly',
      });
    }
    
    if (current.memoryUsage > 80) {
      recommendations.push({
        priority: 'medium',
        action: 'Increase memory cache size',
        impact: 'Will reduce IndexedDB access and improve performance',
      });
    }
    
    if (trends.cacheSizeTrend === 'increasing') {
      recommendations.push({
        priority: 'low',
        action: 'Monitor cache growth and consider cleanup strategies',
        impact: 'Prevents excessive storage usage',
      });
    }
    
    return recommendations;
  }

  // Get metrics for a specific time range
  getMetricsForRange(startTime, endTime) {
    const filtered = {
      responseTimes: this.metrics.responseTimes.filter(dp => 
        dp.timestamp >= startTime && dp.timestamp <= endTime
      ),
      hitRates: this.metrics.hitRates.filter(dp => 
        dp.timestamp >= startTime && dp.timestamp <= endTime
      ),
      errorRates: this.metrics.errorRates.filter(dp => 
        dp.timestamp >= startTime && dp.timestamp <= endTime
      ),
      cacheSizes: this.metrics.cacheSizes.filter(dp => 
        dp.timestamp >= startTime && dp.timestamp <= endTime
      ),
      memoryUsage: this.metrics.memoryUsage.filter(dp => 
        dp.timestamp >= startTime && dp.timestamp <= endTime
      ),
    };
    
    return filtered;
  }

  // Export metrics data
  exportMetrics() {
    return {
      metrics: this.metrics,
      summary: this.getSummary(),
      exportedAt: new Date().toISOString(),
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      responseTimes: [],
      hitRates: [],
      errorRates: [],
      cacheSizes: [],
      memoryUsage: [],
      errors: [],
      timestamps: [],
      maxDataPoints: 100,
      collectionInterval: 60000,
    };
  }

  // Destroy metrics service
  destroy() {
    this.stopCollection();
    this.reset();
  }
}

// Create singleton instance
const cacheMetrics = new CacheMetrics();

export default cacheMetrics;
