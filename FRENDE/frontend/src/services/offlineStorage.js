import { openDB } from 'idb';

const DB_NAME = 'FrendeOfflineDB';
const DB_VERSION = 1;

// Database stores
const STORES = {
  TASKS: 'tasks',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_ROOMS: 'chat_rooms',
  USER_PROFILE: 'user_profile',
  SYNC_QUEUE: 'sync_queue',
  OFFLINE_ACTIONS: 'offline_actions'
};

class OfflineStorageService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize the database
  async init() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion, newVersion) => {
          this.createStores(db, oldVersion, newVersion);
        },
        blocked: () => {
          console.warn('Database blocked - another tab may be using it');
        },
        blocking: () => {
          console.warn('Database blocking - this tab is blocking another');
        }
      });

      this.isInitialized = true;
      console.log('Offline storage initialized successfully');
      return this.db;
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      throw error;
    }
  }

  // Create database stores
  createStores(db, oldVersion, newVersion) {
    // Tasks store
    if (!db.objectStoreNames.contains(STORES.TASKS)) {
      const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
      taskStore.createIndex('matchId', 'matchId', { unique: false });
      taskStore.createIndex('status', 'status', { unique: false });
      taskStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Chat messages store
    if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
      const messageStore = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id' });
      messageStore.createIndex('roomId', 'roomId', { unique: false });
      messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      messageStore.createIndex('senderId', 'senderId', { unique: false });
    }

    // Chat rooms store
    if (!db.objectStoreNames.contains(STORES.CHAT_ROOMS)) {
      const roomStore = db.createObjectStore(STORES.CHAT_ROOMS, { keyPath: 'id' });
      roomStore.createIndex('matchId', 'matchId', { unique: true });
      roomStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
    }

    // User profile store
    if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
      db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('status', 'status', { unique: false });
    }

    // Offline actions store
    if (!db.objectStoreNames.contains(STORES.OFFLINE_ACTIONS)) {
      const actionStore = db.createObjectStore(STORES.OFFLINE_ACTIONS, { keyPath: 'id', autoIncrement: true });
      actionStore.createIndex('type', 'type', { unique: false });
      actionStore.createIndex('timestamp', 'timestamp', { unique: false });
      actionStore.createIndex('status', 'status', { unique: false });
    }
  }

  // Task operations
  async saveTask(task) {
    await this.ensureInit();
    const db = await this.db;
    
    const taskData = {
      ...task,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.TASKS, taskData);
  }

  async getTask(taskId) {
    await this.ensureInit();
    const db = await this.db;
    return db.get(STORES.TASKS, taskId);
  }

  async getAllTasks() {
    await this.ensureInit();
    const db = await this.db;
    return db.getAll(STORES.TASKS);
  }

  async getTasksByMatch(matchId) {
    await this.ensureInit();
    const db = await this.db;
    const index = db.transaction(STORES.TASKS).store.index('matchId');
    return index.getAll(matchId);
  }

  async updateTask(taskId, updates) {
    await this.ensureInit();
    const db = await this.db;
    
    const existingTask = await db.get(STORES.TASKS, taskId);
    if (!existingTask) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask = {
      ...existingTask,
      ...updates,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.TASKS, updatedTask);
  }

  async deleteTask(taskId) {
    await this.ensureInit();
    const db = await this.db;
    return db.delete(STORES.TASKS, taskId);
  }

  // Chat message operations
  async saveMessage(message) {
    await this.ensureInit();
    const db = await this.db;
    
    const messageData = {
      ...message,
      id: message.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: message.timestamp || Date.now(),
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.CHAT_MESSAGES, messageData);
  }

  async getMessage(messageId) {
    await this.ensureInit();
    const db = await this.db;
    return db.get(STORES.CHAT_MESSAGES, messageId);
  }

  async getMessagesByRoom(roomId, limit = 50, offset = 0) {
    await this.ensureInit();
    const db = await this.db;
    const index = db.transaction(STORES.CHAT_MESSAGES).store.index('roomId');
    const messages = await index.getAll(roomId);
    
    // Sort by timestamp and apply pagination
    messages.sort((a, b) => b.timestamp - a.timestamp);
    return messages.slice(offset, offset + limit);
  }

  async updateMessage(messageId, updates) {
    await this.ensureInit();
    const db = await this.db;
    
    const existingMessage = await db.get(STORES.CHAT_MESSAGES, messageId);
    if (!existingMessage) {
      throw new Error(`Message ${messageId} not found`);
    }

    const updatedMessage = {
      ...existingMessage,
      ...updates,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.CHAT_MESSAGES, updatedMessage);
  }

  async deleteMessage(messageId) {
    await this.ensureInit();
    const db = await this.db;
    return db.delete(STORES.CHAT_MESSAGES, messageId);
  }

  // Chat room operations
  async saveChatRoom(room) {
    await this.ensureInit();
    const db = await this.db;
    
    const roomData = {
      ...room,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.CHAT_ROOMS, roomData);
  }

  async getChatRoom(roomId) {
    await this.ensureInit();
    const db = await this.db;
    return db.get(STORES.CHAT_ROOMS, roomId);
  }

  async getAllChatRooms() {
    await this.ensureInit();
    const db = await this.db;
    return db.getAll(STORES.CHAT_ROOMS);
  }

  async updateChatRoom(roomId, updates) {
    await this.ensureInit();
    const db = await this.db;
    
    const existingRoom = await db.get(STORES.CHAT_ROOMS, roomId);
    if (!existingRoom) {
      throw new Error(`Chat room ${roomId} not found`);
    }

    const updatedRoom = {
      ...existingRoom,
      ...updates,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.CHAT_ROOMS, updatedRoom);
  }

  // User profile operations
  async saveUserProfile(profile) {
    await this.ensureInit();
    const db = await this.db;
    
    const profileData = {
      ...profile,
      lastSynced: Date.now(),
      isOffline: true
    };

    return db.put(STORES.USER_PROFILE, profileData);
  }

  async getUserProfile(userId) {
    await this.ensureInit();
    const db = await this.db;
    return db.get(STORES.USER_PROFILE, userId);
  }

  // Sync queue operations
  async addToSyncQueue(item) {
    await this.ensureInit();
    const db = await this.db;
    
    const queueItem = {
      ...item,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    return db.add(STORES.SYNC_QUEUE, queueItem);
  }

  async getSyncQueueItems(type = null, status = 'pending') {
    await this.ensureInit();
    const db = await this.db;
    
    if (type) {
      const index = db.transaction(STORES.SYNC_QUEUE).store.index('type');
      return index.getAll(type);
    }
    
    if (status !== 'all') {
      const index = db.transaction(STORES.SYNC_QUEUE).store.index('status');
      return index.getAll(status);
    }
    
    return db.getAll(STORES.SYNC_QUEUE);
  }

  async updateSyncQueueItem(id, updates) {
    await this.ensureInit();
    const db = await this.db;
    
    const existingItem = await db.get(STORES.SYNC_QUEUE, id);
    if (!existingItem) {
      throw new Error(`Sync queue item ${id} not found`);
    }

    const updatedItem = {
      ...existingItem,
      ...updates
    };

    return db.put(STORES.SYNC_QUEUE, updatedItem);
  }

  async removeFromSyncQueue(id) {
    await this.ensureInit();
    const db = await this.db;
    return db.delete(STORES.SYNC_QUEUE, id);
  }

  // Offline actions operations
  async addOfflineAction(action) {
    await this.ensureInit();
    const db = await this.db;
    
    const actionData = {
      ...action,
      timestamp: Date.now(),
      status: 'pending'
    };

    return db.add(STORES.OFFLINE_ACTIONS, actionData);
  }

  async getOfflineActions(type = null) {
    await this.ensureInit();
    const db = await this.db;
    
    if (type) {
      const index = db.transaction(STORES.OFFLINE_ACTIONS).store.index('type');
      return index.getAll(type);
    }
    
    return db.getAll(STORES.OFFLINE_ACTIONS);
  }

  async updateOfflineAction(id, updates) {
    await this.ensureInit();
    const db = await this.db;
    
    const existingAction = await db.get(STORES.OFFLINE_ACTIONS, id);
    if (!existingAction) {
      throw new Error(`Offline action ${id} not found`);
    }

    const updatedAction = {
      ...existingAction,
      ...updates
    };

    return db.put(STORES.OFFLINE_ACTIONS, updatedAction);
  }

  async removeOfflineAction(id) {
    await this.ensureInit();
    const db = await this.db;
    return db.delete(STORES.OFFLINE_ACTIONS, id);
  }

  // Utility methods
  async ensureInit() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async clearAllData() {
    await this.ensureInit();
    const db = await this.db;
    
    const stores = Object.values(STORES);
    const tx = db.transaction(stores, 'readwrite');
    
    await Promise.all(
      stores.map(storeName => tx.objectStore(storeName).clear())
    );
    
    await tx.done;
  }

  async getDatabaseSize() {
    await this.ensureInit();
    const db = await this.db;
    
    const stores = Object.values(STORES);
    let totalSize = 0;
    
    for (const storeName of stores) {
      const count = await db.count(storeName);
      totalSize += count;
    }
    
    return totalSize;
  }

  async exportData() {
    await this.ensureInit();
    const db = await this.db;
    
    const exportData = {};
    
    for (const [key, storeName] of Object.entries(STORES)) {
      exportData[key] = await db.getAll(storeName);
    }
    
    return exportData;
  }

  async importData(data) {
    await this.ensureInit();
    const db = await this.db;
    
    for (const [key, storeName] of Object.entries(STORES)) {
      if (data[key] && Array.isArray(data[key])) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        for (const item of data[key]) {
          await store.put(item);
        }
        
        await tx.done;
      }
    }
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageService();

export default offlineStorage;
export { STORES };
