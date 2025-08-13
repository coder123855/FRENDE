import offlineStorage from './offlineStorage.js';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    this.retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
    this.maxRetries = 5;
    
    this.setupEventListeners();
  }

  // Setup online/offline event listeners
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onOffline();
    });
  }

  // Called when coming back online
  async onOnline() {
    console.log('Back online - starting sync');
    this.startPeriodicSync();
    await this.syncAllData();
  }

  // Called when going offline
  onOffline() {
    console.log('Gone offline - stopping sync');
    this.stopPeriodicSync();
  }

  // Start periodic sync when online
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAllData();
      }
    }, 30000);
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync all pending data
  async syncAllData() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      await Promise.all([
        this.syncTasks(),
        this.syncChatMessages(),
        this.syncChatRooms(),
        this.syncUserProfile(),
        this.processSyncQueue()
      ]);
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync tasks
  async syncTasks() {
    try {
      const offlineTasks = await offlineStorage.getAllTasks();
      
      for (const task of offlineTasks) {
        if (task.isOffline) {
          await this.syncTask(task);
        }
      }
    } catch (error) {
      console.error('Task sync failed:', error);
      throw error;
    }
  }

  // Sync individual task
  async syncTask(task) {
    try {
      // Check if task exists on server
      const serverTask = await this.fetchTaskFromServer(task.id);
      
      if (serverTask) {
        // Task exists - check for conflicts
        const mergedTask = this.resolveTaskConflict(task, serverTask);
        await this.updateTaskOnServer(mergedTask);
        await offlineStorage.updateTask(task.id, { 
          ...mergedTask, 
          isOffline: false,
          lastSynced: Date.now()
        });
      } else {
        // Task doesn't exist - create it
        const newTask = await this.createTaskOnServer(task);
        await offlineStorage.updateTask(task.id, { 
          ...newTask, 
          isOffline: false,
          lastSynced: Date.now()
        });
      }
    } catch (error) {
      console.error(`Failed to sync task ${task.id}:`, error);
      await this.addToSyncQueue({
        type: 'task',
        action: 'sync',
        data: task,
        error: error.message
      });
    }
  }

  // Sync chat messages
  async syncChatMessages() {
    try {
      const offlineMessages = await offlineStorage.getAllMessages();
      
      for (const message of offlineMessages) {
        if (message.isOffline) {
          await this.syncMessage(message);
        }
      }
    } catch (error) {
      console.error('Message sync failed:', error);
      throw error;
    }
  }

  // Sync individual message
  async syncMessage(message) {
    try {
      // Check if message exists on server
      const serverMessage = await this.fetchMessageFromServer(message.id);
      
      if (serverMessage) {
        // Message exists - update if needed
        if (message.lastSynced > serverMessage.lastSynced) {
          await this.updateMessageOnServer(message);
          await offlineStorage.updateMessage(message.id, { 
            isOffline: false,
            lastSynced: Date.now()
          });
        }
      } else {
        // Message doesn't exist - create it
        const newMessage = await this.createMessageOnServer(message);
        await offlineStorage.updateMessage(message.id, { 
          ...newMessage, 
          isOffline: false,
          lastSynced: Date.now()
        });
      }
    } catch (error) {
      console.error(`Failed to sync message ${message.id}:`, error);
      await this.addToSyncQueue({
        type: 'message',
        action: 'sync',
        data: message,
        error: error.message
      });
    }
  }

  // Sync chat rooms
  async syncChatRooms() {
    try {
      const offlineRooms = await offlineStorage.getAllChatRooms();
      
      for (const room of offlineRooms) {
        if (room.isOffline) {
          await this.syncChatRoom(room);
        }
      }
    } catch (error) {
      console.error('Chat room sync failed:', error);
      throw error;
    }
  }

  // Sync individual chat room
  async syncChatRoom(room) {
    try {
      const serverRoom = await this.fetchChatRoomFromServer(room.id);
      
      if (serverRoom) {
        const mergedRoom = this.resolveChatRoomConflict(room, serverRoom);
        await this.updateChatRoomOnServer(mergedRoom);
        await offlineStorage.updateChatRoom(room.id, { 
          ...mergedRoom, 
          isOffline: false,
          lastSynced: Date.now()
        });
      } else {
        const newRoom = await this.createChatRoomOnServer(room);
        await offlineStorage.updateChatRoom(room.id, { 
          ...newRoom, 
          isOffline: false,
          lastSynced: Date.now()
        });
      }
    } catch (error) {
      console.error(`Failed to sync chat room ${room.id}:`, error);
      await this.addToSyncQueue({
        type: 'chatRoom',
        action: 'sync',
        data: room,
        error: error.message
      });
    }
  }

  // Sync user profile
  async syncUserProfile() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      const offlineProfile = await offlineStorage.getUserProfile(userId);
      if (!offlineProfile || !offlineProfile.isOffline) return;

      const serverProfile = await this.fetchUserProfileFromServer(userId);
      
      if (serverProfile) {
        const mergedProfile = this.resolveProfileConflict(offlineProfile, serverProfile);
        await this.updateUserProfileOnServer(mergedProfile);
        await offlineStorage.saveUserProfile({ 
          ...mergedProfile, 
          isOffline: false,
          lastSynced: Date.now()
        });
      } else {
        const newProfile = await this.createUserProfileOnServer(offlineProfile);
        await offlineStorage.saveUserProfile({ 
          ...newProfile, 
          isOffline: false,
          lastSynced: Date.now()
        });
      }
    } catch (error) {
      console.error('User profile sync failed:', error);
      throw error;
    }
  }

  // Process sync queue
  async processSyncQueue() {
    try {
      const queueItems = await offlineStorage.getSyncQueueItems();
      
      for (const item of queueItems) {
        if (item.retryCount < this.maxRetries) {
          await this.processQueueItem(item);
        } else {
          console.warn(`Queue item ${item.id} exceeded max retries`);
          await offlineStorage.updateSyncQueueItem(item.id, { 
            status: 'failed',
            error: 'Max retries exceeded'
          });
        }
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      throw error;
    }
  }

  // Process individual queue item
  async processQueueItem(item) {
    try {
      switch (item.type) {
        case 'task':
          await this.syncTask(item.data);
          break;
        case 'message':
          await this.syncMessage(item.data);
          break;
        case 'chatRoom':
          await this.syncChatRoom(item.data);
          break;
        default:
          console.warn(`Unknown queue item type: ${item.type}`);
      }
      
      await offlineStorage.removeFromSyncQueue(item.id);
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      
      const retryCount = item.retryCount + 1;
      const delay = this.retryDelays[Math.min(retryCount - 1, this.retryDelays.length - 1)];
      
      await offlineStorage.updateSyncQueueItem(item.id, {
        retryCount,
        lastError: error.message,
        nextRetry: Date.now() + delay
      });
    }
  }

  // Add item to sync queue
  async addToSyncQueue(item) {
    await offlineStorage.addToSyncQueue(item);
  }

  // Conflict resolution methods
  resolveTaskConflict(offlineTask, serverTask) {
    // If offline task is newer, use it
    if (offlineTask.lastSynced > serverTask.lastSynced) {
      return offlineTask;
    }
    
    // If server task is newer, use it
    if (serverTask.lastSynced > offlineTask.lastSynced) {
      return serverTask;
    }
    
    // If same timestamp, merge changes
    return {
      ...serverTask,
      ...offlineTask,
      lastSynced: Date.now()
    };
  }

  resolveChatRoomConflict(offlineRoom, serverRoom) {
    // Similar logic to task conflict resolution
    if (offlineRoom.lastSynced > serverRoom.lastSynced) {
      return offlineRoom;
    }
    
    if (serverRoom.lastSynced > offlineRoom.lastSynced) {
      return serverRoom;
    }
    
    return {
      ...serverRoom,
      ...offlineRoom,
      lastSynced: Date.now()
    };
  }

  resolveProfileConflict(offlineProfile, serverProfile) {
    // For profile, prefer the most recently updated version
    if (offlineProfile.lastSynced > serverProfile.lastSynced) {
      return offlineProfile;
    }
    
    return serverProfile;
  }

  // Server API methods (to be implemented with actual API calls)
  async fetchTaskFromServer(taskId) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch task from server:', error);
      return null;
    }
  }

  async createTaskOnServer(task) {
    // TODO: Implement actual API call
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create task on server');
    } catch (error) {
      console.error('Failed to create task on server:', error);
      throw error;
    }
  }

  async updateTaskOnServer(task) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update task on server');
    } catch (error) {
      console.error('Failed to update task on server:', error);
      throw error;
    }
  }

  async fetchMessageFromServer(messageId) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/messages/${messageId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch message from server:', error);
      return null;
    }
  }

  async createMessageOnServer(message) {
    // TODO: Implement actual API call
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create message on server');
    } catch (error) {
      console.error('Failed to create message on server:', error);
      throw error;
    }
  }

  async updateMessageOnServer(message) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update message on server');
    } catch (error) {
      console.error('Failed to update message on server:', error);
      throw error;
    }
  }

  async fetchChatRoomFromServer(roomId) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch chat room from server:', error);
      return null;
    }
  }

  async createChatRoomOnServer(room) {
    // TODO: Implement actual API call
    try {
      const response = await fetch('/api/chat-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create chat room on server');
    } catch (error) {
      console.error('Failed to create chat room on server:', error);
      throw error;
    }
  }

  async updateChatRoomOnServer(room) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/chat-rooms/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update chat room on server');
    } catch (error) {
      console.error('Failed to update chat room on server:', error);
      throw error;
    }
  }

  async fetchUserProfileFromServer(userId) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile from server:', error);
      return null;
    }
  }

  async createUserProfileOnServer(profile) {
    // TODO: Implement actual API call
    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create user profile on server');
    } catch (error) {
      console.error('Failed to create user profile on server:', error);
      throw error;
    }
  }

  async updateUserProfileOnServer(profile) {
    // TODO: Implement actual API call
    try {
      const response = await fetch(`/api/users/${profile.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update user profile on server');
    } catch (error) {
      console.error('Failed to update user profile on server:', error);
      throw error;
    }
  }

  // Utility methods
  getCurrentUserId() {
    // TODO: Get from auth context
    return localStorage.getItem('userId');
  }

  // Background data preloading
  async preloadData() {
    if (!this.isOnline) return;
    
    try {
      console.log('Preloading data for offline use...');
      
      // Preload tasks for all matches
      await this.preloadTasks();
      
      // Preload chat messages for recent conversations
      await this.preloadChatMessages();
      
      // Preload user profile
      await this.preloadUserProfile();
      
      console.log('Data preloading completed');
    } catch (error) {
      console.error('Data preloading failed:', error);
    }
  }

  async preloadTasks() {
    try {
      // Get user's matches and preload tasks for each
      const matches = await this.fetchUserMatches();
      
      for (const match of matches) {
        const tasks = await this.fetchTasksForMatch(match.id);
        for (const task of tasks) {
          await offlineStorage.saveTask(task);
        }
      }
    } catch (error) {
      console.error('Task preloading failed:', error);
    }
  }

  async preloadChatMessages() {
    try {
      // Get user's recent matches and preload messages
      const matches = await this.fetchUserMatches();
      
      for (const match of matches) {
        const messages = await this.fetchRecentMessages(match.id, 50);
        for (const message of messages) {
          await offlineStorage.saveMessage(message);
        }
      }
    } catch (error) {
      console.error('Chat message preloading failed:', error);
    }
  }

  async preloadUserProfile() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      const profile = await this.fetchUserProfileFromServer(userId);
      if (profile) {
        await offlineStorage.saveUserProfile(profile);
      }
    } catch (error) {
      console.error('User profile preloading failed:', error);
    }
  }

  // Fetch user matches (to be implemented with actual API)
  async fetchUserMatches() {
    try {
      const response = await fetch('/api/matches', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch user matches:', error);
      return [];
    }
  }

  // Fetch tasks for a match (to be implemented with actual API)
  async fetchTasksForMatch(matchId) {
    try {
      const response = await fetch(`/api/matches/${matchId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch tasks for match:', error);
      return [];
    }
  }

  // Fetch recent messages for a match (to be implemented with actual API)
  async fetchRecentMessages(matchId, limit = 50) {
    try {
      const response = await fetch(`/api/chat/${matchId}/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch recent messages:', error);
      return [];
    }
  }

  // Get auth token (to be implemented)
  getAuthToken() {
    // TODO: Get from auth context or localStorage
    return localStorage.getItem('authToken');
  }

  // Public methods
  async startSync() {
    if (this.isOnline) {
      await this.syncAllData();
    }
  }

  async stopSync() {
    this.stopPeriodicSync();
  }

  async startBackgroundSync() {
    if (this.isOnline) {
      // Start periodic sync
      this.startPeriodicSync();
      
      // Preload data for offline use
      await this.preloadData();
    }
  }

  isSyncInProgress() {
    return this.syncInProgress;
  }

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSync: Date.now() // TODO: Store actual last sync time
    };
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
