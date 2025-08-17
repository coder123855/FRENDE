import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  HardDrive,
  Memory
} from 'lucide-react';
import { useCacheStatus } from '../hooks/useCache.js';

const CacheStatus = () => {
  const { stats, cacheSize, loading, clearCache, refresh } = useCacheStatus();

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading cache status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Cache service not available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hitRate = stats.hitRate * 100;
  const memoryUsage = (stats.memorySize / stats.memoryMaxSize) * 100;
  const totalRequests = stats.hits + stats.misses;

  const getHitRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHitRateBadge = (rate) => {
    if (rate >= 80) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 60) return <Badge variant="secondary">Good</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getMemoryUsageColor = (usage) => {
    if (usage >= 90) return 'text-red-600';
    if (usage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCache}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Hit Rate</span>
            </div>
            <div className={`text-2xl font-bold ${getHitRateColor(hitRate)}`}>
              {hitRate.toFixed(1)}%
            </div>
            {getHitRateBadge(hitRate)}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Memory className="h-4 w-4" />
              <span className="text-sm font-medium">Memory Usage</span>
            </div>
            <div className={`text-2xl font-bold ${getMemoryUsageColor(memoryUsage)}`}>
              {memoryUsage.toFixed(1)}%
            </div>
            <Badge variant="outline">
              {stats.memorySize} / {stats.memoryMaxSize}
            </Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Total Entries</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(cacheSize)}
            </div>
            <Badge variant="outline">IndexedDB</Badge>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Memory Usage</span>
              <span>{memoryUsage.toFixed(1)}%</span>
            </div>
            <Progress value={memoryUsage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cache Hit Rate</span>
              <span>{hitRate.toFixed(1)}%</span>
            </div>
            <Progress value={hitRate} className="h-2" />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatNumber(stats.hits)}
            </div>
            <div className="text-muted-foreground">Cache Hits</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {formatNumber(stats.misses)}
            </div>
            <div className="text-muted-foreground">Cache Misses</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {formatNumber(stats.sets)}
            </div>
            <div className="text-muted-foreground">Cache Sets</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {formatNumber(stats.deletes)}
            </div>
            <div className="text-muted-foreground">Cache Deletes</div>
          </div>
        </div>

        {/* Request Summary */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Total Requests
            </span>
            <span className="font-medium">{formatNumber(totalRequests)}</span>
          </div>
          {stats.errors > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                Errors
              </span>
              <span className="font-medium text-red-600">{formatNumber(stats.errors)}</span>
            </div>
          )}
        </div>

        {/* Health Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cache Health</span>
          <div className="flex items-center gap-2">
            {hitRate >= 60 && stats.errors === 0 ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Healthy</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Needs Attention</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheStatus;
