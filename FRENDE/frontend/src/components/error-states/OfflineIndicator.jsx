import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge';

const OfflineIndicator = ({ 
  showBadge = true, 
  showBanner = false,
  className = '',
  onOnline,
  onOffline
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onOnline?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  if (isOnline) {
    return null;
  }

  if (showBanner) {
    return (
      <div className={`fixed top-0 left-0 right-0 bg-red-600 text-white p-3 z-50 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            You're currently offline. Some features may not work properly.
          </span>
        </div>
      </div>
    );
  }

  if (showBadge) {
    return (
      <Badge variant="destructive" className={`flex items-center space-x-1 ${className}`}>
        <WifiOff className="w-3 h-3" />
        <span>Offline</span>
      </Badge>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">Offline</span>
    </div>
  );
};

export default OfflineIndicator;
