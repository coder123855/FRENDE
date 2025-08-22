import React, { useEffect, useState } from 'react';
import { captureMessage } from '../lib/sentry.js';

/**
 * Performance Monitor Component
 * Tracks bundle loading performance and runtime metrics
 */
const PerformanceMonitor = ({ enabled = false }) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    bundleSize: 0,
    chunkCount: 0,
    memoryUsage: 0,
    renderTime: 0
  });

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    // Measure initial load time
    const measureLoadTime = () => {
      const loadTime = performance.now() - startTime;
      
      // Get bundle information
      const scripts = document.querySelectorAll('script[src]');
      const chunkCount = scripts.length;
      let totalSize = 0;

      // Estimate bundle size from script tags
      scripts.forEach(script => {
        const src = script.src;
        if (src.includes('assets/') && src.includes('.js')) {
          // This is a rough estimate - in production you'd want actual file sizes
          totalSize += 100; // Assume ~100KB per chunk
        }
      });

      // Get memory usage if available
      let memoryUsage = 0;
      if (performance.memory) {
        memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      const newMetrics = {
        loadTime: Math.round(loadTime),
        bundleSize: totalSize,
        chunkCount,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        renderTime: 0
      };

      setMetrics(newMetrics);

      // Report to Sentry if load time is slow
      if (loadTime > 3000) {
        captureMessage('Slow bundle load detected', 'warning', {
          loadTime,
          chunkCount,
          bundleSize: totalSize
        });
      }

      // Log performance metrics
      console.log('🚀 Performance Metrics:', newMetrics);
    };

    // Measure render time
    const measureRenderTime = () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime) }));
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', measureLoadTime);
    } else {
      measureLoadTime();
    }

    // Measure render time after React has rendered
    setTimeout(measureRenderTime, 100);

    // Monitor for performance issues
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry;
          if (navEntry.loadEventEnd - navEntry.loadEventStart > 3000) {
            captureMessage('Slow page load detected', 'warning', {
              loadEventDuration: navEntry.loadEventEnd - navEntry.loadEventStart,
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs opacity-75 hover:opacity-100 transition-opacity z-50">
      <div className="font-semibold mb-1">Performance Monitor</div>
      <div className="space-y-1">
        <div>Load: {metrics.loadTime}ms</div>
        <div>Render: {metrics.renderTime}ms</div>
        <div>Chunks: {metrics.chunkCount}</div>
        <div>Memory: {metrics.memoryUsage}MB</div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
