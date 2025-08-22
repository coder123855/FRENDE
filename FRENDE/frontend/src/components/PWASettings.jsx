import React, { useState, useEffect } from 'react';
import { Settings, Bell, Wifi, Database, Trash2, RefreshCw, Download, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import pwaUtils from '../utils/pwaUtils';

const PWASettings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      enabled: false,
      matchNotifications: true,
      taskNotifications: true,
      messageNotifications: true,
      systemNotifications: true
    },
    offline: {
      enabled: true,
      autoSync: true,
      syncOnConnect: true
    },
    cache: {
      enabled: true,
      autoCleanup: true
    }
  });

  const [cacheSize, setCacheSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);

  useEffect(() => {
    loadSettings();
    loadCacheInfo();
    loadSyncQueue();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('pwa_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const loadCacheInfo = async () => {
    try {
      const size = await pwaUtils.getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to get cache size:', error);
    }
  };

  const loadSyncQueue = () => {
    const queue = pwaUtils.syncQueue || [];
    setSyncQueue(queue);
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pwa_settings', JSON.stringify(newSettings));
  };

  const handleNotificationToggle = async (key, value) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    };

    // If enabling notifications, request permission
    if (key === 'enabled' && value) {
      try {
        await pwaUtils.requestNotificationPermission();
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return; // Don't save settings if permission denied
      }
    }

    saveSettings(newSettings);
  };

  const handleOfflineToggle = (key, value) => {
    const newSettings = {
      ...settings,
      offline: {
        ...settings.offline,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleCacheToggle = (key, value) => {
    const newSettings = {
      ...settings,
      cache: {
        ...settings.cache,
        [key]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      await pwaUtils.clearCache();
      await loadCacheInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await pwaUtils.syncQueuedActions();
      loadSyncQueue();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPWAFeatures = () => {
    const features = [];
    
    if (pwaUtils.notificationSupported) {
      features.push('Push Notifications');
    }
    
    if (pwaUtils.backgroundSyncSupported) {
      features.push('Background Sync');
    }
    
    if (pwaUtils.pushSupported) {
      features.push('Offline Support');
    }
    
    if (pwaUtils.canInstall) {
      features.push('Installable');
    }
    
    return features;
  };

  return (
    <div className="space-y-6">
      {/* PWA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>PWA Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">PWA Features</span>
              <div className="flex flex-wrap gap-1">
                {getPWAFeatures().map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection</span>
              <Badge variant={navigator.onLine ? 'default' : 'destructive'}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            {syncQueue.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Sync</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{syncQueue.length} items</Badge>
                  <Button
                    size="sm"
                    onClick={handleManualSync}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications for important events
                </p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={settings.notifications.enabled}
                onCheckedChange={(value) => handleNotificationToggle('enabled', value)}
              />
            </div>

            {settings.notifications.enabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="match-notifications">Match Notifications</Label>
                    <Switch
                      id="match-notifications"
                      checked={settings.notifications.matchNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('matchNotifications', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="task-notifications">Task Notifications</Label>
                    <Switch
                      id="task-notifications"
                      checked={settings.notifications.taskNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('taskNotifications', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message-notifications">Message Notifications</Label>
                    <Switch
                      id="message-notifications"
                      checked={settings.notifications.messageNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('messageNotifications', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system-notifications">System Notifications</Label>
                    <Switch
                      id="system-notifications"
                      checked={settings.notifications.systemNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('systemNotifications', value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Offline Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="offline-enabled">Offline Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable offline functionality and data caching
                </p>
              </div>
              <Switch
                id="offline-enabled"
                checked={settings.offline.enabled}
                onCheckedChange={(value) => handleOfflineToggle('enabled', value)}
              />
            </div>

            {settings.offline.enabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-sync">Auto Sync</Label>
                    <Switch
                      id="auto-sync"
                      checked={settings.offline.autoSync}
                      onCheckedChange={(value) => handleOfflineToggle('autoSync', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-on-connect">Sync on Reconnect</Label>
                    <Switch
                      id="sync-on-connect"
                      checked={settings.offline.syncOnConnect}
                      onCheckedChange={(value) => handleOfflineToggle('syncOnConnect', value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Cache Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cache-enabled">Enable Caching</Label>
                <p className="text-sm text-muted-foreground">
                  Cache data for faster loading and offline access
                </p>
              </div>
              <Switch
                id="cache-enabled"
                checked={settings.cache.enabled}
                onCheckedChange={(value) => handleCacheToggle('enabled', value)}
              />
            </div>

            {settings.cache.enabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-cleanup">Auto Cleanup</Label>
                    <Switch
                      id="auto-cleanup"
                      checked={settings.cache.autoCleanup}
                      onCheckedChange={(value) => handleCacheToggle('autoCleanup', value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Cache Size</Label>
                      <span className="text-sm font-medium">{formatBytes(cacheSize)}</span>
                    </div>
                    
                    <Progress value={Math.min((cacheSize / (50 * 1024 * 1024)) * 100, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(cacheSize)} of 50 MB used
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isLoading || cacheSize === 0}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isLoading ? 'Clearing...' : 'Clear Cache'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Install PWA */}
      {pwaUtils.canInstall && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Install App</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Install Frende on your device for a better experience with offline access and push notifications.
              </p>
              
              <Button
                onClick={() => pwaUtils.showInstallPrompt()}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Install Frende
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PWASettings;
