/**
 * PWA Utilities for Frende App
 * Handles offline functionality, background sync, push notifications, and PWA features
 */

// PWA Configuration
const PWA_CONFIG = {
  CACHE_VERSION: 'frende-v2.0.0',
  VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY || '',
  API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
  NOTIFICATION_ICON: '/assets/icon-192x192.png',
  NOTIFICATION_BADGE: '/assets/icon-72x72.png'
};

// Service Worker Registration
class PWAUtils {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.notificationPermission = 'default';
    this.init();
  }

  async init() {
    await this.registerServiceWorker();
    await this.setupEventListeners();
    await this.checkNotificationPermission();
    await this.setupBackgroundSync();
  }

  // Service Worker Registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[PWA] Service Worker registered:', this.registration);

        // Handle service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });

        return this.registration;
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
        throw error;
      }
    } else {
      console.warn('[PWA] Service Worker not supported');
      return null;
    }
  }

  // Event Listeners Setup
  async setupEventListeners() {
    // Online/Offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineStatus();
    });

    // Service Worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });

    // Before install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      this.handleInstallPrompt(event);
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });
  }

  // Notification Permission
  async checkNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      
      if (this.notificationPermission === 'default') {
        // Request permission when user interacts with the app
        document.addEventListener('click', () => {
          this.requestNotificationPermission();
        }, { once: true });
      }
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window && this.notificationPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        
        if (permission === 'granted') {
          await this.subscribeToPushNotifications();
        }
      } catch (error) {
        console.error('[PWA] Notification permission request failed:', error);
      }
    }
  }

  // Push Notifications
  async subscribeToPushNotifications() {
    if (!this.registration || !PWA_CONFIG.VAPID_PUBLIC_KEY) {
      console.warn('[PWA] Push notifications not available');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(PWA_CONFIG.VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await this.sendSubscriptionToServer(subscription);

      console.log('[PWA] Push notification subscription created');
      return subscription;
    } catch (error) {
      console.error('[PWA] Push notification subscription failed:', error);
      return null;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${PWA_CONFIG.API_BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PWA] Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Background Sync
  async setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.registration.sync.register('background-sync');
        console.log('[PWA] Background sync registered');
      } catch (error) {
        console.error('[PWA] Background sync registration failed:', error);
      }
    }
  }

  async queueForBackgroundSync(data) {
    if (!this.isOnline) {
      this.syncQueue.push({
        ...data,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });

      // Store in localStorage for persistence
      this.saveSyncQueue();

      // Trigger background sync when online
      if (this.registration && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          await this.registration.sync.register('background-sync');
        } catch (error) {
          console.error('[PWA] Background sync trigger failed:', error);
        }
      }

      return {
        success: true,
        message: 'Action queued for background sync',
        queued: true
      };
    }

    return { success: false, message: 'Online - no sync needed' };
  }

  // Offline Data Management
  async saveOfflineData(key, data) {
    try {
      const offlineData = JSON.parse(localStorage.getItem('frende_offline_data') || '{}');
      offlineData[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('frende_offline_data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('[PWA] Failed to save offline data:', error);
    }
  }

  async getOfflineData(key) {
    try {
      const offlineData = JSON.parse(localStorage.getItem('frende_offline_data') || '{}');
      return offlineData[key]?.data || null;
    } catch (error) {
      console.error('[PWA] Failed to get offline data:', error);
      return null;
    }
  }

  async clearOfflineData(key) {
    try {
      const offlineData = JSON.parse(localStorage.getItem('frende_offline_data') || '{}');
      if (key) {
        delete offlineData[key];
      } else {
        localStorage.removeItem('frende_offline_data');
        return;
      }
      localStorage.setItem('frende_offline_data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('[PWA] Failed to clear offline data:', error);
    }
  }

  // Sync Queue Management
  saveSyncQueue() {
    try {
      localStorage.setItem('frende_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('[PWA] Failed to save sync queue:', error);
    }
  }

  loadSyncQueue() {
    try {
      const savedQueue = localStorage.getItem('frende_sync_queue');
      this.syncQueue = savedQueue ? JSON.parse(savedQueue) : [];
    } catch (error) {
      console.error('[PWA] Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Install Prompt Management
  handleInstallPrompt(event) {
    event.preventDefault();
    this.deferredPrompt = event;
    
    // Show custom install prompt
    this.showInstallPrompt();
  }

  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt outcome:', outcome);
      
      // Track install attempt
      this.trackInstallAttempt(outcome);
      
      this.deferredPrompt = null;
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }

  // App Installation Tracking
  handleAppInstalled() {
    console.log('[PWA] App installed successfully');
    this.trackAppInstallation();
  }

  // Status Handlers
  handleOnlineStatus() {
    console.log('[PWA] App is online');
    
    // Sync queued actions
    this.syncQueuedActions();
    
    // Update UI
    this.updateOnlineStatus(true);
  }

  handleOfflineStatus() {
    console.log('[PWA] App is offline');
    
    // Update UI
    this.updateOnlineStatus(false);
  }

  async syncQueuedActions() {
    if (this.syncQueue.length === 0) {
      return;
    }

    console.log('[PWA] Syncing queued actions:', this.syncQueue.length);

    const successfulActions = [];
    const failedActions = [];

    for (const action of this.syncQueue) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          successfulActions.push(action);
        } else {
          failedActions.push(action);
        }
      } catch (error) {
        console.error('[PWA] Failed to sync action:', action, error);
        failedActions.push(action);
      }
    }

    // Remove successful actions from queue
    this.syncQueue = failedActions;
    this.saveSyncQueue();

    console.log('[PWA] Sync completed:', {
      successful: successfulActions.length,
      failed: failedActions.length
    });
  }

  // Service Worker Message Handler
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'background-sync-complete':
        this.handleBackgroundSyncComplete(data);
        break;
      case 'cache-updated':
        this.handleCacheUpdate(data);
        break;
      case 'offline-action-queued':
        this.handleOfflineActionQueued(data);
        break;
      default:
        console.log('[PWA] Unknown service worker message:', data);
    }
  }

  handleBackgroundSyncComplete(data) {
    console.log('[PWA] Background sync completed:', data);
    
    // Show success notification
    if (data.success) {
      this.showNotification('Sync Complete', 'Your offline actions have been synchronized successfully.');
    }
  }

  handleCacheUpdate(data) {
    console.log('[PWA] Cache updated:', data);
    
    // Show update notification
    this.showNotification('App Updated', 'A new version of the app is available. Please refresh to update.');
  }

  handleOfflineActionQueued(data) {
    console.log('[PWA] Offline action queued:', data);
    
    // Show offline notification
    this.showNotification('Offline Mode', 'Action saved for when you\'re back online.');
  }

  // Notifications
  showNotification(title, body, options = {}) {
    if (this.notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: PWA_CONFIG.NOTIFICATION_ICON,
        badge: PWA_CONFIG.NOTIFICATION_BADGE,
        tag: 'frende-notification',
        requireInteraction: false,
        silent: false,
        ...options
      });

      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });

      return notification;
    } else if (this.notificationPermission === 'default') {
      // Show in-app notification instead
      this.showInAppNotification(title, body);
    }
  }

  showInAppNotification(title, body) {
    // Dispatch custom event for in-app notification
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: { title, body, type: 'info' }
    }));
  }

  showUpdateNotification() {
    this.showNotification(
      'App Update Available',
      'A new version of Frende is available. Click to update.',
      {
        requireInteraction: true,
        actions: [
          {
            action: 'update',
            title: 'Update Now'
          },
          {
            action: 'later',
            title: 'Later'
          }
        ]
      }
    );
  }

  // UI Updates
  updateOnlineStatus(isOnline) {
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('connection-status-changed', {
      detail: { isOnline }
    }));
  }

  // Analytics and Tracking
  trackInstallAttempt(outcome) {
    // Send analytics data
    if (window.gtag) {
      window.gtag('event', 'pwa_install_attempt', {
        event_category: 'PWA',
        event_label: outcome,
        value: outcome === 'accepted' ? 1 : 0
      });
    }
  }

  trackAppInstallation() {
    // Send analytics data
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'success'
      });
    }
  }

  // Utility Functions
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  // Public API
  get isOffline() {
    return !this.isOnline;
  }

  get canInstall() {
    return !!this.deferredPrompt;
  }

  get notificationSupported() {
    return 'Notification' in window;
  }

  get pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  get backgroundSyncSupported() {
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
  }

  // Cache Management
  async clearCache() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('frende-')) {
              return caches.delete(cacheName);
            }
          })
        );
        console.log('[PWA] Cache cleared successfully');
      } catch (error) {
        console.error('[PWA] Failed to clear cache:', error);
      }
    }
  }

  async getCacheSize() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
          if (cacheName.startsWith('frende-')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            }
          }
        }

        return totalSize;
      } catch (error) {
        console.error('[PWA] Failed to get cache size:', error);
        return 0;
      }
    }
    return 0;
  }
}

// Create and export singleton instance
const pwaUtils = new PWAUtils();

export default pwaUtils;
