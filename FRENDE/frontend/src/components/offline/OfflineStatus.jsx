import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Wifi, WifiOff, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOfflineState, useSync } from '../../hooks/useOffline.js';

const OfflineStatus = ({ showDetails = false, className = '' }) => {
  const { isOnline, syncInProgress, syncProgress, lastSync, error } = useOfflineState();
  const { sync } = useSync();

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isOnline ? (
          <Badge variant="default" className="flex items-center space-x-1">
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </Badge>
        )}
        
        {syncInProgress && (
          <div className="flex items-center space-x-1">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            <span className="text-xs text-gray-600">Syncing...</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed status card
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Connection Status</span>
          {isOnline ? (
            <Badge variant="default" className="flex items-center space-x-1">
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        {syncInProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-1">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Syncing data...</span>
              </span>
              <span className="text-gray-600">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Last Sync Time */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center space-x-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last sync:</span>
          </span>
          <span className="font-medium">{formatLastSync(lastSync)}</span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Sync Button */}
        <div className="flex space-x-2">
          <Button 
            onClick={handleSync} 
            disabled={syncInProgress || !isOnline}
            className="flex-1"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
            {syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          {!isOnline && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {isOnline ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-600 mx-auto" />
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {isOnline ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {syncInProgress ? (
                <RefreshCw className="w-6 h-6 text-blue-600 mx-auto animate-spin" />
              ) : lastSync ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto" />
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {syncInProgress ? 'Syncing' : lastSync ? 'Synced' : 'Not synced'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfflineStatus;
