// Service Worker Registration and Management
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.updateAvailable = false;
    this.listeners = new Set();
  }

  // Register service worker
  async register() {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        console.log('Service Worker update found');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.notifyListeners('updateAvailable');
          }
        });
      });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        this.notifyListeners('controllerChanged');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Update service worker
  async update() {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return false;
    }

    try {
      await this.registration.update();
      console.log('Service Worker update requested');
      return true;
    } catch (error) {
      console.error('Service Worker update failed:', error);
      return false;
    }
  }

  // Skip waiting and reload
  async skipWaiting() {
    if (!this.registration || !this.registration.waiting) {
      console.warn('No waiting service worker found');
      return false;
    }

    try {
      // Send skip waiting message
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });

      // Reload the page
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Skip waiting failed:', error);
      return false;
    }
  }

  // Unregister service worker
  async unregister() {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Cache API response
  async cacheApiResponse(request, response) {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_API_RESPONSE',
        request: request.clone(),
        response: response.clone()
      });
      return true;
    } catch (error) {
      console.error('Failed to cache API response:', error);
      return false;
    }
  }

  // Request background sync
  async requestBackgroundSync(tag, data = {}) {
    if (!this.registration || !('sync' in this.registration)) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('Background sync requested:', tag);
      return true;
    } catch (error) {
      console.error('Background sync request failed:', error);
      return false;
    }
  }

  // Request push notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications(vapidPublicKey) {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push notification subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      return false;
    }
  }

  // Convert VAPID public key
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

  // Add event listener
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  // Remove event listener
  removeEventListener(event, callback) {
    for (const listener of this.listeners) {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
        break;
      }
    }
  }

  // Notify listeners
  notifyListeners(event, data = null) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback(data);
      }
    }
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(data) {
    console.log('Message from service worker:', data);
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        this.notifyListeners('cacheUpdated', data);
        break;
      case 'OFFLINE_ACTION_STORED':
        this.notifyListeners('offlineActionStored', data);
        break;
      case 'SYNC_COMPLETED':
        this.notifyListeners('syncCompleted', data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Get registration status
  getStatus() {
    return {
      isSupported: this.isSupported,
      isRegistered: !!this.registration,
      updateAvailable: this.updateAvailable,
      scope: this.registration?.scope || null,
      active: !!this.registration?.active,
      waiting: !!this.registration?.waiting,
      installing: !!this.registration?.installing
    };
  }

  // Check if service worker is controlling the page
  isControlling() {
    return !!navigator.serviceWorker.controller;
  }

  // Get cache status
  async getCacheStatus() {
    if (!this.isSupported) {
      return { available: false };
    }

    try {
      const cacheNames = await caches.keys();
      const cacheStatus = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheStatus[cacheName] = keys.length;
      }

      return {
        available: true,
        caches: cacheStatus,
        totalEntries: Object.values(cacheStatus).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return { available: false, error: error.message };
    }
  }

  // Clear all caches
  async clearAllCaches() {
    if (!this.isSupported) {
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }
}

// Create singleton instance
const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    serviceWorkerManager.register();
  });
}

export default serviceWorkerManager;
