import offlineStorage from '../services/offlineStorage.js';

// Offline data management utilities
export const offlineUtils = {
  // Clear all offline data
  async clearAllData() {
    try {
      await offlineStorage.clearAllData();
      console.log('All offline data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  },

  // Export offline data as JSON
  async exportData() {
    try {
      const data = await offlineStorage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frende-offline-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return data;
    } catch (error) {
      console.error('Failed to export offline data:', error);
      throw error;
    }
  },

  // Import offline data from JSON
  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await offlineStorage.importData(data);
      console.log('Offline data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw error;
    }
  },

  // Get database statistics
  async getDatabaseStats() {
    try {
      const size = await offlineStorage.getDatabaseSize();
      const data = await offlineStorage.exportData();
      
      const stats = {
        totalSize: size,
        tasks: data.TASKS?.length || 0,
        messages: data.CHAT_MESSAGES?.length || 0,
        chatRooms: data.CHAT_ROOMS?.length || 0,
        userProfiles: data.USER_PROFILE ? 1 : 0,
        syncQueueItems: data.SYNC_QUEUE?.length || 0,
        offlineActions: data.OFFLINE_ACTIONS?.length || 0
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  },

  // Clean up old data
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      // Clean up old messages
      const messages = await offlineStorage.getAllMessages();
      const oldMessages = messages.filter(msg => 
        new Date(msg.timestamp).getTime() < cutoffDate
      );
      
      for (const message of oldMessages) {
        await offlineStorage.deleteMessage(message.id);
      }
      
      // Clean up old sync queue items
      const syncQueue = await offlineStorage.getSyncQueueItems();
      const oldSyncItems = syncQueue.filter(item => 
        new Date(item.timestamp).getTime() < cutoffDate
      );
      
      for (const item of oldSyncItems) {
        await offlineStorage.removeFromSyncQueue(item.id);
      }
      
      console.log(`Cleaned up ${oldMessages.length} old messages and ${oldSyncItems.length} sync items`);
      return { messagesRemoved: oldMessages.length, syncItemsRemoved: oldSyncItems.length };
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  },

  // Validate offline data integrity
  async validateDataIntegrity() {
    try {
      const data = await offlineStorage.exportData();
      const issues = [];
      
      // Check for orphaned messages (messages without chat rooms)
      const chatRoomIds = new Set(data.CHAT_ROOMS?.map(room => room.id) || []);
      const orphanedMessages = data.CHAT_MESSAGES?.filter(msg => 
        !chatRoomIds.has(msg.roomId)
      ) || [];
      
      if (orphanedMessages.length > 0) {
        issues.push(`Found ${orphanedMessages.length} orphaned messages`);
      }
      
      // Check for tasks without matches
      const matchIds = new Set(data.CHAT_ROOMS?.map(room => room.matchId) || []);
      const orphanedTasks = data.TASKS?.filter(task => 
        !matchIds.has(task.matchId)
      ) || [];
      
      if (orphanedTasks.length > 0) {
        issues.push(`Found ${orphanedTasks.length} orphaned tasks`);
      }
      
      // Check for duplicate IDs
      const messageIds = new Set();
      const duplicateMessages = data.CHAT_MESSAGES?.filter(msg => {
        if (messageIds.has(msg.id)) {
          return true;
        }
        messageIds.add(msg.id);
        return false;
      }) || [];
      
      if (duplicateMessages.length > 0) {
        issues.push(`Found ${duplicateMessages.length} duplicate message IDs`);
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        totalItems: Object.values(data).reduce((sum, items) => sum + (items?.length || 0), 0)
      };
    } catch (error) {
      console.error('Failed to validate data integrity:', error);
      throw error;
    }
  },

  // Get storage usage information
  async getStorageUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          usagePercentage: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return null;
    }
  },

  // Check if offline storage is available
  async checkStorageAvailability() {
    try {
      await offlineStorage.init();
      return true;
    } catch (error) {
      console.error('Offline storage not available:', error);
      return false;
    }
  },

  // Reset offline storage
  async resetStorage() {
    try {
      await offlineStorage.clearAllData();
      console.log('Offline storage reset successfully');
      return true;
    } catch (error) {
      console.error('Failed to reset offline storage:', error);
      throw error;
    }
  }
};

// Offline data validation schemas
export const offlineSchemas = {
  task: {
    required: ['id', 'title', 'description', 'matchId'],
    optional: ['is_completed', 'is_expired', 'progress_percentage', 'coin_reward', 'difficulty', 'task_type', 'ai_generated', 'expires_at', 'isOffline', 'lastSynced']
  },
  
  message: {
    required: ['id', 'message_text', 'user_id', 'roomId', 'timestamp'],
    optional: ['message_type', 'is_read', 'read_at', 'isOffline', 'lastSynced']
  },
  
  chatRoom: {
    required: ['id', 'matchId'],
    optional: ['lastMessageAt', 'isOffline', 'lastSynced']
  },
  
  userProfile: {
    required: ['id'],
    optional: ['name', 'age', 'profession', 'profile_text', 'profile_picture', 'isOffline', 'lastSynced']
  }
};

// Validate data against schema
export const validateData = (data, schema) => {
  const errors = [];
  
  for (const requiredField of schema.required) {
    if (!(requiredField in data)) {
      errors.push(`Missing required field: ${requiredField}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default offlineUtils;
