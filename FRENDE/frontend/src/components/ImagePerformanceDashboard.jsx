import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  Settings,
  RefreshCw
} from 'lucide-react';
import imagePerformanceMonitor from '../utils/imagePerformance';

const ImagePerformanceDashboard = ({ className = '' }) => {
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Get initial metrics
    updateMetrics();
    
    // Set up observer for real-time updates
    const handleMetricsUpdate = (newMetrics) => {
      setMetrics(newMetrics);
      setRecommendations(imagePerformanceMonitor.getRecommendations());
    };
    
    imagePerformanceMonitor.addObserver(handleMetricsUpdate);
    setIsMonitoringEnabled(imagePerformanceMonitor.isEnabled);
    
    return () => {
      imagePerformanceMonitor.removeObserver(handleMetricsUpdate);
    };
  }, []);

  const updateMetrics = () => {
    const currentMetrics = imagePerformanceMonitor.getReport();
    setMetrics(currentMetrics);
    setRecommendations(imagePerformanceMonitor.getRecommendations());
  };

  const toggleMonitoring = () => {
    const newState = !isMonitoringEnabled;
    setIsMonitoringEnabled(newState);
    imagePerformanceMonitor.setEnabled(newState);
  };

  const resetMetrics = () => {
    imagePerformanceMonitor.reset();
    updateMetrics();
  };

  const exportMetrics = () => {
    const data = imagePerformanceMonitor.exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-performance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (value, threshold, type = 'success') => {
    if (type === 'success') {
      return value >= threshold ? 'text-green-600' : 'text-red-600';
    }
    return value <= threshold ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (value, threshold, type = 'success') => {
    if (type === 'success') {
      return value >= threshold ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
    }
    return value <= threshold ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Image Performance Dashboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
              className={isMonitoringEnabled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
            >
              <Settings className="w-4 h-4 mr-1" />
              {isMonitoringEnabled ? 'Enabled' : 'Disabled'}
            </Button>
            <Button variant="outline" size="sm" onClick={updateMetrics}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalImages}</div>
            <div className="text-sm text-gray-600">Total Images</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-2xl font-bold ${getStatusColor(metrics.successRate, 95)}`}>
              {metrics.successRate}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-2xl font-bold ${getStatusColor(metrics.averageLoadTime, 2000, 'performance')}`}>
              {Math.round(metrics.averageLoadTime)}ms
            </div>
            <div className="text-sm text-gray-600">Avg Load Time</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{metrics.averageSize}KB</div>
            <div className="text-sm text-gray-600">Avg Size</div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Slow Images (>2s)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.slowImages}</span>
                  {getStatusIcon(metrics.slowImages, 5, 'performance')}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Very Slow Images (>5s)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.verySlowImages}</span>
                  {getStatusIcon(metrics.verySlowImages, 2, 'performance')}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failed Images</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.failedImages}</span>
                  {getStatusIcon(metrics.failedImages, 0, 'performance')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Format Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(metrics.formatBreakdown).map(([format, count]) => (
                <div key={format} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{format}</span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
              {Object.keys(metrics.formatBreakdown).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No format data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {isExpanded && recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`mt-1 ${rec.type === 'error' ? 'text-red-500' : rec.type === 'performance' ? 'text-yellow-500' : 'text-blue-500'}`}>
                      {rec.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : 
                       rec.type === 'performance' ? <Clock className="w-4 h-4" /> : 
                       <Settings className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{rec.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-gray-500">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetMetrics}>
              Reset Metrics
            </Button>
            <Button variant="outline" size="sm" onClick={exportMetrics}>
              Export Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImagePerformanceDashboard;
