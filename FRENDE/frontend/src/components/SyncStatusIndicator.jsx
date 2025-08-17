/**
 * Sync Status Indicator Component
 * 
 * Displays real-time synchronization status, conflicts, and performance metrics
 * Provides visual feedback for sync operations and debugging information
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Settings,
  X,
  Info,
  Zap,
  Database,
  Network
} from 'lucide-react';
import { useRealTime } from '../contexts/RealTimeContext.jsx';
import { SYNC_CONFIG, isDebugMode } from '../config/syncConfig.js';

const SyncStatusIndicator = ({ 
  showDetails = false, 
  showPerformance = false,
  showConflicts = true,
  compact = false,
  className = '' 
}) => {
  const {
    syncStatus,
    syncStats,
    conflicts,
    isOnline,
    lastSync,
    forceSyncAll,
    clearConflicts,
    isSyncHealthy
  } = useRealTime();

  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(showPerformance);

  // Calculate sync health
  const syncHealth = isSyncHealthy();
  const hasConflicts = conflicts.length > 0;
  const hasActiveOperations = syncStats.activeOperations > 0;
  const hasPendingChanges = syncStats.queueSize > 0;

  // Get status color and icon
  const getStatusInfo = () => {
    if (!isOnline) {
      return { color: 'text-red-500', icon: WifiOff, label: 'Offline' };
    }
    
    if (hasConflicts) {
      return { color: 'text-orange-500', icon: AlertTriangle, label: 'Conflicts' };
    }
    
    if (hasActiveOperations) {
      return { color: 'text-blue-500', icon: RefreshCw, label: 'Syncing' };
    }
    
    if (hasPendingChanges) {
      return { color: 'text-yellow-500', icon: Clock, label: 'Pending' };
    }
    
    if (syncHealth) {
      return { color: 'text-green-500', icon: CheckCircle, label: 'Synced' };
    }
    
    return { color: 'text-gray-500', icon: Activity, label: 'Idle' };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    
    const now = Date.now();
    const diff = now - lastSync;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return new Date(lastSync).toLocaleDateString();
  };

  // Calculate sync progress
  const calculateProgress = () => {
    const total = syncStats.queueSize + syncStats.activeOperations;
    const completed = syncStats.performance?.successCount || 0;
    
    if (total === 0) return 100;
    return Math.min((completed / total) * 100, 100);
  };

  const progress = calculateProgress();

  // Compact view
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
        <span className="text-sm font-medium">{statusInfo.label}</span>
        {hasConflicts && (
          <Badge variant="destructive" className="text-xs">
            {conflicts.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sync Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={forceSyncAll}
              disabled={!isOnline || hasActiveOperations}
            >
              <RefreshCw className={`w-4 h-4 ${hasActiveOperations ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
            <div>
              <p className="font-medium">{statusInfo.label}</p>
              <p className="text-sm text-muted-foreground">
                Last sync: {formatLastSync()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            {hasConflicts && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {conflicts.length} Conflicts
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {hasActiveOperations && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Active: {syncStats.activeOperations}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span>Queued: {syncStats.queueSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-500" />
            <span>Components: {syncStats.componentCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span>Success Rate: {syncStats.performance?.successRate?.toFixed(1) || 0}%</span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Performance Details */}
            {showPerformanceDetails && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Performance
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
                  >
                    {showPerformanceDetails ? 'Hide' : 'Show'}
                  </Button>
                </div>
                
                {showPerformanceDetails && (
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Avg Sync Time:</span>
                      <p className="font-medium">
                        {syncStats.performance?.averageDuration?.toFixed(2) || 0}ms
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Operations:</span>
                      <p className="font-medium">{syncStats.performance?.totalOperations || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Count:</span>
                      <p className="font-medium text-red-500">
                        {syncStats.performance?.errorCount || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Memory Usage:</span>
                      <p className="font-medium">
                        {(syncStats.performance?.averageMemoryUsage / 1024 / 1024).toFixed(2) || 0}MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conflicts */}
            {showConflicts && hasConflicts && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Conflicts ({conflicts.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearConflicts}
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {conflicts.slice(0, 5).map((conflict, index) => (
                    <div
                      key={conflict.operation?.id || index}
                      className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {conflict.operation?.dataType || 'Unknown'} Conflict
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {conflict.conflict?.type || 'Unknown'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Operation: {conflict.operation?.type || 'Unknown'}
                      </p>
                    </div>
                  ))}
                  
                  {conflicts.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{conflicts.length - 5} more conflicts
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Network Status */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Network className="w-4 h-4" />
                Network Status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Connection:</span>
                  <p className="font-medium">{isOnline ? 'Connected' : 'Disconnected'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Offline Queue:</span>
                  <p className="font-medium">{syncStats.offlineQueueSize}</p>
                </div>
              </div>
            </div>

            {/* Debug Info */}
            {isDebugMode() && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Debug Info
                </h4>
                <div className="text-xs bg-muted/50 p-3 rounded-lg font-mono">
                  <div>Global Status: {syncStatus}</div>
                  <div>Sync Health: {syncHealth ? 'Healthy' : 'Unhealthy'}</div>
                  <div>Queue Size: {syncStats.queueSize}</div>
                  <div>Active Ops: {syncStats.activeOperations}</div>
                  <div>Component Count: {syncStats.componentCount}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncStatusIndicator;
