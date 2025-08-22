import { useState, useEffect, useCallback } from 'react';
import serviceWorkerManager from '../utils/serviceWorker';
import offlineStorage from '../utils/offlineStorage';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [offlineActions, setOfflineActions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, completed, failed
  const [storageStats, setStorageStats] = useState(null);

  // Initialize offline functionality
  useEffect(() => {
    const initializeOffline = async () => {
      try {
        // Initialize offline storage
        await offlineStorage.init();
        
        // Register service worker
        const swRegistered = await serviceWorkerManager.register();
        setIsServiceWorkerReady(swRegistered);

        // Load initial data
        await loadOfflineActions();
        await loadStorageStats();

        // Set up event listeners
        serviceWorkerManager.addEventListener('updateAvailable', handleUpdateAvailable);
        serviceWorkerManager.addEventListener('controllerChanged', handleControllerChanged);
        serviceWorkerManager.addEventListener('syncCompleted', handleSyncCompleted);

        console.log('Offline functionality initialized');
      } catch (error) {
        console.error('Failed to initialize offline functionality:', error);
      }
    };

    initializeOffline();

    // Cleanup
    return () => {
      serviceWorkerManager.removeEventListener('updateAvailable', handleUpdateAvailable);
      serviceWorkerManager.removeEventListener('controllerChanged', handleControllerChanged);
      serviceWorkerManager.removeEventListener('syncCompleted', handleSyncCompleted);
    };
  }, []);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline actions
  const loadOfflineActions = useCallback(async () => {
    try {
      const actions = await offlineStorage.getPendingOfflineActions();
      setOfflineActions(actions);
    } catch (error) {
      console.error('Failed to load offline actions:', error);
    }
  }, []);

  // Load storage statistics
  const loadStorageStats = useCallback(async () => {
    try {
      const stats = await offlineStorage.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  }, []);

  // Handle service worker update available
  const handleUpdateAvailable = useCallback(() => {
    console.log('Service Worker update available');
    // You can show a notification to the user here
  }, []);

  // Handle service worker controller change
  const handleControllerChanged = useCallback(() => {
    console.log('Service Worker controller changed');
    setIsServiceWorkerReady(true);
  }, []);

  // Handle sync completed
  const handleSyncCompleted = useCallback((data) => {
    console.log('Sync completed:', data);
    setSyncStatus('completed');
    
    // Reload offline actions after sync
    setTimeout(() => {
      loadOfflineActions();
      loadStorageStats();
    }, 1000);
  }, [loadOfflineActions, loadStorageStats]);

  // Store offline action
  const storeOfflineAction = useCallback(async (action) => {
    try {
      const actionId = await offlineStorage.storeOfflineAction(action);
      await loadOfflineActions();
      await loadStorageStats();
      
      // Request background sync if online
      if (isOnline) {
        await serviceWorkerManager.requestBackgroundSync('background-sync');
      }
      
      return actionId;
    } catch (error) {
      console.error('Failed to store offline action:', error);
      throw error;
    }
  }, [isOnline, loadOfflineActions, loadStorageStats]);

  // Perform manual sync
  const performSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    setSyncStatus('syncing');

    try {
      // Get pending actions
      const pendingActions = await offlineStorage.getPendingOfflineActions();
      
      for (const action of pendingActions) {
        try {
          // Perform the action
          const response = await fetch(action.url, {
            method: action.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${action.data.token}`
            },
            body: JSON.stringify(action.data)
          });

          if (response.ok) {
            // Mark as completed
            await offlineStorage.updateOfflineActionStatus(action.id, 'completed', await response.json());
          } else {
            // Mark as failed
            await offlineStorage.updateOfflineActionStatus(action.id, 'failed', { error: response.statusText });
          }
        } catch (error) {
          console.error('Failed to sync action:', action, error);
          await offlineStorage.updateOfflineActionStatus(action.id, 'failed', { error: error.message });
        }
      }

      setSyncStatus('completed');
      await loadOfflineActions();
      await loadStorageStats();
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('failed');
      throw error;
    }
  }, [isOnline, loadOfflineActions, loadStorageStats]);

  // Cache data
  const cacheData = useCallback(async (key, data, type = 'general', ttl = 24 * 60 * 60 * 1000) => {
    try {
      await offlineStorage.storeCachedData(key, data, type, ttl);
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to cache data:', error);
      throw error;
    }
  }, [loadStorageStats]);

  // Get cached data
  const getCachedData = useCallback(async (key) => {
    try {
      return await offlineStorage.getCachedData(key);
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }, []);

  // Store user preference
  const storeUserPreference = useCallback(async (key, value) => {
    try {
      await offlineStorage.storeUserPreference(key, value);
    } catch (error) {
      console.error('Failed to store user preference:', error);
      throw error;
    }
  }, []);

  // Get user preference
  const getUserPreference = useCallback(async (key) => {
    try {
      return await offlineStorage.getUserPreference(key);
    } catch (error) {
      console.error('Failed to get user preference:', error);
      return null;
    }
  }, []);

  // Store chat message offline
  const storeChatMessage = useCallback(async (message) => {
    try {
      await offlineStorage.storeChatMessage(message);
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to store chat message:', error);
      throw error;
    }
  }, [loadStorageStats]);

  // Get offline chat history
  const getOfflineChatHistory = useCallback(async (matchId) => {
    try {
      return await offlineStorage.getChatHistory(matchId);
    } catch (error) {
      console.error('Failed to get offline chat history:', error);
      return [];
    }
  }, []);

  // Store task offline
  const storeTask = useCallback(async (task) => {
    try {
      await offlineStorage.storeTask(task);
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to store task:', error);
      throw error;
    }
  }, [loadStorageStats]);

  // Get offline tasks
  const getOfflineTasks = useCallback(async (status = null) => {
    try {
      return await offlineStorage.getTasks(status);
    } catch (error) {
      console.error('Failed to get offline tasks:', error);
      return [];
    }
  }, []);

  // Clear all offline data
  const clearAllOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearAll();
      await loadOfflineActions();
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, [loadOfflineActions, loadStorageStats]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    try {
      await serviceWorkerManager.update();
    } catch (error) {
      console.error('Failed to update service worker:', error);
      throw error;
    }
  }, []);

  // Skip waiting and reload
  const skipWaiting = useCallback(async () => {
    try {
      await serviceWorkerManager.skipWaiting();
    } catch (error) {
      console.error('Failed to skip waiting:', error);
      throw error;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    try {
      return await serviceWorkerManager.requestNotificationPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPushNotifications = useCallback(async (vapidPublicKey) => {
    try {
      return await serviceWorkerManager.subscribeToPushNotifications(vapidPublicKey);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }, []);

  // Get service worker status
  const getServiceWorkerStatus = useCallback(() => {
    return serviceWorkerManager.getStatus();
  }, []);

  // Check if service worker is controlling
  const isServiceWorkerControlling = useCallback(() => {
    return serviceWorkerManager.isControlling();
  }, []);

  // Get cache status
  const getCacheStatus = useCallback(async () => {
    try {
      return await serviceWorkerManager.getCacheStatus();
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return { available: false };
    }
  }, []);

  // Clear all caches
  const clearAllCaches = useCallback(async () => {
    try {
      return await serviceWorkerManager.clearAllCaches();
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }, []);

  return {
    // Status
    isOnline,
    isServiceWorkerReady,
    syncStatus,
    storageStats,
    offlineActions,

    // Actions
    storeOfflineAction,
    performSync,
    cacheData,
    getCachedData,
    storeUserPreference,
    getUserPreference,
    storeChatMessage,
    getOfflineChatHistory,
    storeTask,
    getOfflineTasks,
    clearAllOfflineData,

    // Service Worker
    updateServiceWorker,
    skipWaiting,
    requestNotificationPermission,
    subscribeToPushNotifications,
    getServiceWorkerStatus,
    isServiceWorkerControlling,
    getCacheStatus,
    clearAllCaches,

    // Utilities
    loadOfflineActions,
    loadStorageStats
  };
};
