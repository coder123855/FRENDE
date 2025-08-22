// Offline Storage using IndexedDB
class OfflineStorage {
  constructor() {
    this.dbName = 'FrendeOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.isSupported = 'indexedDB' in window;
  }

  // Initialize database
  async init() {
    if (!this.isSupported) {
      console.warn('IndexedDB not supported');
      return false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('offlineActions')) {
          const offlineActionsStore = db.createObjectStore('offlineActions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          offlineActionsStore.createIndex('type', 'type', { unique: false });
          offlineActionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          offlineActionsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const cachedDataStore = db.createObjectStore('cachedData', { 
            keyPath: 'key' 
          });
          cachedDataStore.createIndex('type', 'type', { unique: false });
          cachedDataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          const userPreferencesStore = db.createObjectStore('userPreferences', { 
            keyPath: 'key' 
          });
        }

        if (!db.objectStoreNames.contains('chatHistory')) {
          const chatHistoryStore = db.createObjectStore('chatHistory', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          chatHistoryStore.createIndex('matchId', 'matchId', { unique: false });
          chatHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { 
            keyPath: 'id' 
          });
          tasksStore.createIndex('status', 'status', { unique: false });
          tasksStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  // Store offline action
  async storeOfflineAction(action) {
    if (!this.db) {
      await this.init();
    }

    const offlineAction = {
      ...action,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.add(offlineAction);

      request.onsuccess = () => {
        console.log('Offline action stored:', offlineAction);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to store offline action:', request.error);
        reject(request.error);
      };
    });
  }

  // Get pending offline actions
  async getPendingOfflineActions() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get pending offline actions:', request.error);
        reject(request.error);
      };
    });
  }

  // Update offline action status
  async updateOfflineActionStatus(id, status, result = null) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      
      // First get the action
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.status = status;
          action.result = result;
          action.completedAt = Date.now();
          
          const updateRequest = store.put(action);
          
          updateRequest.onsuccess = () => {
            console.log('Offline action status updated:', id, status);
            resolve(true);
          };
          
          updateRequest.onerror = () => {
            console.error('Failed to update offline action status:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          reject(new Error('Offline action not found'));
        }
      };
      
      getRequest.onerror = () => {
        console.error('Failed to get offline action:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  // Remove completed offline action
  async removeOfflineAction(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Offline action removed:', id);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to remove offline action:', request.error);
        reject(request.error);
      };
    });
  }

  // Store cached data
  async storeCachedData(key, data, type = 'general', ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    if (!this.db) {
      await this.init();
    }

    const cachedItem = {
      key,
      data,
      type,
      timestamp: Date.now(),
      ttl,
      expiresAt: Date.now() + ttl
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.put(cachedItem);

      request.onsuccess = () => {
        console.log('Data cached:', key);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to cache data:', request.error);
        reject(request.error);
      };
    });
  }

  // Get cached data
  async getCachedData(key) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        const cachedItem = request.result;
        if (cachedItem && cachedItem.expiresAt > Date.now()) {
          console.log('Cached data retrieved:', key);
          resolve(cachedItem.data);
        } else {
          if (cachedItem) {
            // Remove expired data
            this.removeCachedData(key);
          }
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Failed to get cached data:', request.error);
        reject(request.error);
      };
    });
  }

  // Remove cached data
  async removeCachedData(key) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log('Cached data removed:', key);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to remove cached data:', request.error);
        reject(request.error);
      };
    });
  }

  // Store user preference
  async storeUserPreference(key, value) {
    if (!this.db) {
      await this.init();
    }

    const preference = {
      key,
      value,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readwrite');
      const store = transaction.objectStore('userPreferences');
      const request = store.put(preference);

      request.onsuccess = () => {
        console.log('User preference stored:', key);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to store user preference:', request.error);
        reject(request.error);
      };
    });
  }

  // Get user preference
  async getUserPreference(key) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readonly');
      const store = transaction.objectStore('userPreferences');
      const request = store.get(key);

      request.onsuccess = () => {
        const preference = request.result;
        resolve(preference ? preference.value : null);
      };

      request.onerror = () => {
        console.error('Failed to get user preference:', request.error);
        reject(request.error);
      };
    });
  }

  // Store chat message
  async storeChatMessage(message) {
    if (!this.db) {
      await this.init();
    }

    const chatMessage = {
      ...message,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chatHistory'], 'readwrite');
      const store = transaction.objectStore('chatHistory');
      const request = store.add(chatMessage);

      request.onsuccess = () => {
        console.log('Chat message stored:', chatMessage);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to store chat message:', request.error);
        reject(request.error);
      };
    });
  }

  // Get chat history for a match
  async getChatHistory(matchId) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chatHistory'], 'readonly');
      const store = transaction.objectStore('chatHistory');
      const index = store.index('matchId');
      const request = index.getAll(matchId);

      request.onsuccess = () => {
        const messages = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(messages);
      };

      request.onerror = () => {
        console.error('Failed to get chat history:', request.error);
        reject(request.error);
      };
    });
  }

  // Store task
  async storeTask(task) {
    if (!this.db) {
      await this.init();
    }

    const offlineTask = {
      ...task,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.put(offlineTask);

      request.onsuccess = () => {
        console.log('Task stored:', offlineTask);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Failed to store task:', request.error);
        reject(request.error);
      };
    });
  }

  // Get tasks by status
  async getTasks(status = null) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      
      let request;
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const tasks = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(tasks);
      };

      request.onerror = () => {
        console.error('Failed to get tasks:', request.error);
        reject(request.error);
      };
    });
  }

  // Clean up expired data
  async cleanupExpiredData() {
    if (!this.db) {
      await this.init();
    }

    const now = Date.now();

    // Clean up expired cached data
    const transaction = this.db.transaction(['cachedData'], 'readwrite');
    const store = transaction.objectStore('cachedData');
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const item = cursor.value;
        if (item.expiresAt < now) {
          cursor.delete();
          console.log('Expired cached data removed:', item.key);
        }
        cursor.continue();
      }
    };

    // Clean up old offline actions (older than 7 days)
    const oldActionsTransaction = this.db.transaction(['offlineActions'], 'readwrite');
    const actionsStore = oldActionsTransaction.objectStore('offlineActions');
    const actionsRequest = actionsStore.openCursor();

    actionsRequest.onsuccess = () => {
      const cursor = actionsRequest.result;
      if (cursor) {
        const action = cursor.value;
        if (action.timestamp < now - (7 * 24 * 60 * 60 * 1000)) { // 7 days
          cursor.delete();
          console.log('Old offline action removed:', action.id);
        }
        cursor.continue();
      }
    };
  }

  // Get storage statistics
  async getStorageStats() {
    if (!this.db) {
      await this.init();
    }

    const stats = {};

    // Count offline actions
    const actionsTransaction = this.db.transaction(['offlineActions'], 'readonly');
    const actionsStore = actionsTransaction.objectStore('offlineActions');
    stats.offlineActions = await this.countStore(actionsStore);

    // Count cached data
    const cachedTransaction = this.db.transaction(['cachedData'], 'readonly');
    const cachedStore = cachedTransaction.objectStore('cachedData');
    stats.cachedData = await this.countStore(cachedStore);

    // Count chat messages
    const chatTransaction = this.db.transaction(['chatHistory'], 'readonly');
    const chatStore = chatTransaction.objectStore('chatHistory');
    stats.chatMessages = await this.countStore(chatStore);

    // Count tasks
    const tasksTransaction = this.db.transaction(['tasks'], 'readonly');
    const tasksStore = tasksTransaction.objectStore('tasks');
    stats.tasks = await this.countStore(tasksStore);

    return stats;
  }

  // Helper method to count store entries
  async countStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data
  async clearAll() {
    if (!this.db) {
      await this.init();
    }

    const stores = ['offlineActions', 'cachedData', 'userPreferences', 'chatHistory', 'tasks'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('All offline storage cleared');
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
