import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import pwaUtils from '../utils/pwaUtils';

const PWAStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncQueue, setSyncQueue] = useState([]);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    // Listen for online/offline status changes
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('good');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('poor');
    };

    // Listen for connection status changes
    const handleConnectionChange = (event) => {
      const { isOnline: online } = event.detail;
      setIsOnline(online);
      
      if (online) {
        // Check connection quality
        checkConnectionQuality();
      } else {
        setConnectionQuality('poor');
      }
    };

    // Listen for background sync events
    const handleBackgroundSync = (event) => {
      const { success } = event.detail;
      setIsSyncing(false);
      
      if (success) {
        setLastSync(new Date());
        setSyncQueue([]);
      }
    };

    // Listen for sync queue updates
    const handleSyncQueueUpdate = () => {
      const queue = pwaUtils.syncQueue || [];
      setSyncQueue(queue);
      setIsSyncing(queue.length > 0);
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connection-status-changed', handleConnectionChange);
    window.addEventListener('background-sync-complete', handleBackgroundSync);

    // Check connection quality periodically
    const qualityInterval = setInterval(checkConnectionQuality, 30000);
    
    // Check sync queue periodically
    const syncInterval = setInterval(handleSyncQueueUpdate, 5000);

    // Initial checks
    checkConnectionQuality();
    handleSyncQueueUpdate();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connection-status-changed', handleConnectionChange);
      window.removeEventListener('background-sync-complete', handleBackgroundSync);
      clearInterval(qualityInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const checkConnectionQuality = async () => {
    if (!navigator.onLine) {
      setConnectionQuality('poor');
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      
      if (latency < 100) {
        setConnectionQuality('excellent');
      } else if (latency < 300) {
        setConnectionQuality('good');
      } else if (latency < 1000) {
        setConnectionQuality('fair');
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      setConnectionQuality('poor');
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }

    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-green-400" />;
      case 'fair':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="h-4 w-4 text-red-400" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    if (isSyncing) {
      return 'Syncing...';
    }

    switch (connectionQuality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'destructive';
    }

    if (isSyncing) {
      return 'secondary';
    }

    switch (connectionQuality) {
      case 'excellent':
      case 'good':
        return 'default';
      case 'fair':
        return 'secondary';
      case 'poor':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTooltipContent = () => {
    let content = [];

    // Connection status
    if (!isOnline) {
      content.push('You are currently offline');
      content.push('Some features may be limited');
    } else {
      content.push(`Connection: ${connectionQuality}`);
    }

    // Sync status
    if (isSyncing) {
      content.push(`Syncing ${syncQueue.length} items...`);
    } else if (lastSync) {
      content.push(`Last sync: ${lastSync.toLocaleTimeString()}`);
    }

    // PWA features
    if (pwaUtils.notificationSupported) {
      content.push('Push notifications available');
    }
    
    if (pwaUtils.backgroundSyncSupported) {
      content.push('Background sync enabled');
    }

    return content.join('\n');
  };

  const handleManualSync = async () => {
    if (isOnline && syncQueue.length > 0) {
      setIsSyncing(true);
      try {
        await pwaUtils.syncQueuedActions();
      } catch (error) {
        console.error('Manual sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={getStatusColor()} 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleManualSync}
            >
              {getStatusIcon()}
              <span className="ml-1 text-xs font-medium">
                {getStatusText()}
              </span>
              
              {/* Show sync queue count */}
              {syncQueue.length > 0 && (
                <Badge variant="outline" className="ml-1 h-5 w-5 p-0 text-xs">
                  {syncQueue.length}
                </Badge>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">Connection Status</div>
            <div className="text-sm space-y-1">
              {getTooltipContent().split('\n').map((line, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {line.includes('offline') && <WifiOff className="h-3 w-3 text-red-500" />}
                  {line.includes('Syncing') && <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />}
                  {line.includes('Last sync') && <Clock className="h-3 w-3 text-gray-500" />}
                  {line.includes('notifications') && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {line.includes('sync enabled') && <CheckCircle className="h-3 w-3 text-green-500" />}
                  <span>{line}</span>
                </div>
              ))}
            </div>
            
            {syncQueue.length > 0 && isOnline && (
              <div className="pt-2 border-t">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync now'}
                </button>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PWAStatusIndicator;
