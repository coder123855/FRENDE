// Image Performance Monitoring for Frende App
class ImagePerformanceMonitor {
  constructor() {
    this.metrics = {
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      slowImages: 0, // Images taking > 2 seconds
      verySlowImages: 0, // Images taking > 5 seconds
      totalSize: 0,
      averageSize: 0,
      formatBreakdown: {},
      errorBreakdown: {}
    };
    
    this.observers = new Set();
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('frende_image_performance_monitoring') === 'true';
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('frende_image_performance_monitoring', enabled.toString());
  }

  // Track image load
  trackImageLoad(src, loadTime, size = null, format = null) {
    if (!this.isEnabled) return;

    this.metrics.totalImages++;
    this.metrics.loadedImages++;
    this.metrics.totalLoadTime += loadTime;

    // Track slow images
    if (loadTime > 5000) {
      this.metrics.verySlowImages++;
    } else if (loadTime > 2000) {
      this.metrics.slowImages++;
    }

    // Track format usage
    if (format) {
      this.metrics.formatBreakdown[format] = (this.metrics.formatBreakdown[format] || 0) + 1;
    }

    // Track size
    if (size) {
      this.metrics.totalSize += size;
    }

    // Update averages
    this.updateAverages();
    this.notifyObservers();
  }

  // Track image error
  trackImageError(src, error, loadTime = 0) {
    if (!this.isEnabled) return;

    this.metrics.totalImages++;
    this.metrics.failedImages++;
    this.metrics.totalLoadTime += loadTime;

    // Track error types
    const errorType = this.categorizeError(error);
    this.metrics.errorBreakdown[errorType] = (this.metrics.errorBreakdown[errorType] || 0) + 1;

    this.updateAverages();
    this.notifyObservers();
  }

  // Categorize errors
  categorizeError(error) {
    if (typeof error === 'string') {
      if (error.includes('404')) return 'not_found';
      if (error.includes('403')) return 'forbidden';
      if (error.includes('timeout')) return 'timeout';
      if (error.includes('network')) return 'network';
      return 'unknown';
    }
    return 'unknown';
  }

  // Update average calculations
  updateAverages() {
    if (this.metrics.totalImages > 0) {
      this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.totalImages;
    }
    
    if (this.metrics.loadedImages > 0) {
      this.metrics.averageSize = this.metrics.totalSize / this.metrics.loadedImages;
    }
  }

  // Get performance report
  getReport() {
    const successRate = this.metrics.totalImages > 0 
      ? (this.metrics.loadedImages / this.metrics.totalImages) * 100 
      : 0;

    const slowImageRate = this.metrics.loadedImages > 0 
      ? ((this.metrics.slowImages + this.metrics.verySlowImages) / this.metrics.loadedImages) * 100 
      : 0;

    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      slowImageRate: Math.round(slowImageRate * 100) / 100,
      averageLoadTime: Math.round(this.metrics.averageLoadTime * 100) / 100,
      averageSize: Math.round(this.metrics.averageSize / 1024 * 100) / 100, // KB
      totalSize: Math.round(this.metrics.totalSize / 1024 / 1024 * 100) / 100, // MB
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      totalLoadTime: 0,
      averageLoadTime: 0,
      slowImages: 0,
      verySlowImages: 0,
      totalSize: 0,
      averageSize: 0,
      formatBreakdown: {},
      errorBreakdown: {}
    };
    this.notifyObservers();
  }

  // Add observer
  addObserver(callback) {
    this.observers.add(callback);
  }

  // Remove observer
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  // Notify observers
  notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.getReport());
      } catch (error) {
        console.error('Error in image performance observer:', error);
      }
    });
  }

  // Send metrics to analytics (if configured)
  sendToAnalytics() {
    const report = this.getReport();
    
    // Send to Sentry if available
    if (window.Sentry) {
      window.Sentry.metrics.increment('image.load.success', report.loadedImages);
      window.Sentry.metrics.increment('image.load.failure', report.failedImages);
      window.Sentry.metrics.gauge('image.load.average_time', report.averageLoadTime);
      window.Sentry.metrics.gauge('image.load.success_rate', report.successRate);
    }

    // Send to custom analytics endpoint
    if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
      fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'image_performance',
          data: report
        })
      }).catch(error => {
        console.warn('Failed to send image performance metrics:', error);
      });
    }
  }

  // Get recommendations based on metrics
  getRecommendations() {
    const report = this.getReport();
    const recommendations = [];

    if (report.successRate < 95) {
      recommendations.push({
        type: 'error',
        message: `Image success rate is ${report.successRate}%. Consider improving error handling and fallback strategies.`
      });
    }

    if (report.averageLoadTime > 2000) {
      recommendations.push({
        type: 'performance',
        message: `Average image load time is ${report.averageLoadTime}ms. Consider implementing better caching and optimization.`
      });
    }

    if (report.slowImageRate > 10) {
      recommendations.push({
        type: 'performance',
        message: `${report.slowImageRate}% of images are loading slowly. Consider lazy loading and progressive enhancement.`
      });
    }

    if (report.averageSize > 500) { // 500KB
      recommendations.push({
        type: 'optimization',
        message: `Average image size is ${report.averageSize}KB. Consider compression and format optimization.`
      });
    }

    // Check format usage
    const formatCount = Object.keys(report.formatBreakdown).length;
    if (formatCount < 2) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider using multiple image formats (WebP, AVIF) for better browser compatibility.'
      });
    }

    return recommendations;
  }

  // Export metrics for debugging
  exportMetrics() {
    const report = this.getReport();
    const recommendations = this.getRecommendations();
    
    return {
      report,
      recommendations,
      exportTime: new Date().toISOString()
    };
  }
}

// Create singleton instance
const imagePerformanceMonitor = new ImagePerformanceMonitor();

// Auto-send metrics periodically (every 5 minutes)
if (imagePerformanceMonitor.isEnabled) {
  setInterval(() => {
    imagePerformanceMonitor.sendToAnalytics();
  }, 5 * 60 * 1000);
}

export default imagePerformanceMonitor;
