import { useState, useEffect, useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext.jsx';

// Hook for offline state management
export const useOfflineState = () => {
  const { isOnline, syncInProgress, syncProgress, lastSync, error } = useOffline();
  
  return {
    isOnline,
    syncInProgress,
    syncProgress,
    lastSync,
    error,
    isOffline: !isOnline
  };
};

// Hook for sync operations
export const useSync = () => {
  const { startSync, getSyncStatus } = useOffline();
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    const updateSyncStatus = () => {
      setSyncStatus(getSyncStatus());
    };

    // Update status every second when sync is in progress
    let interval;
    if (syncStatus.syncInProgress) {
      interval = setInterval(updateSyncStatus, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [syncStatus.syncInProgress, getSyncStatus]);

  const sync = useCallback(async () => {
    try {
      await startSync();
      setSyncStatus(getSyncStatus());
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }, [startSync, getSyncStatus]);

  return {
    sync,
    syncStatus,
    isOnline: syncStatus.isOnline,
    syncInProgress: syncStatus.syncInProgress,
    syncProgress: syncStatus.syncProgress,
    lastSync: syncStatus.lastSync,
    pendingActions: syncStatus.pendingActions,
    pendingSyncItems: syncStatus.pendingSyncItems
  };
};

// Hook for offline tasks
export const useOfflineTasks = () => {
  const { 
    getOfflineTasks, 
    saveTaskOffline, 
    isDataAvailableOffline,
    startSync 
  } = useOffline();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTasks = () => {
      try {
        const offlineTasks = getOfflineTasks();
        setTasks(offlineTasks);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [getOfflineTasks]);

  const saveTask = useCallback(async (task) => {
    try {
      setLoading(true);
      await saveTaskOffline(task);
      const updatedTasks = getOfflineTasks();
      setTasks(updatedTasks);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveTaskOffline, getOfflineTasks]);

  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      await startSync();
      const updatedTasks = getOfflineTasks();
      setTasks(updatedTasks);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startSync, getOfflineTasks]);

  const hasOfflineTasks = isDataAvailableOffline('tasks');

  return {
    tasks,
    loading,
    error,
    saveTask,
    refreshTasks,
    hasOfflineTasks
  };
};

// Hook for offline messages
export const useOfflineMessages = (roomId) => {
  const { 
    getOfflineMessages, 
    saveMessageOffline, 
    isDataAvailableOffline,
    startSync 
  } = useOffline();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMessages = () => {
      try {
        const offlineMessages = getOfflineMessages(roomId);
        setMessages(offlineMessages);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      loadMessages();
    }
  }, [roomId, getOfflineMessages]);

  const saveMessage = useCallback(async (message) => {
    try {
      setLoading(true);
      await saveMessageOffline(message);
      const updatedMessages = getOfflineMessages(roomId);
      setMessages(updatedMessages);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveMessageOffline, getOfflineMessages, roomId]);

  const refreshMessages = useCallback(async () => {
    try {
      setLoading(true);
      await startSync();
      const updatedMessages = getOfflineMessages(roomId);
      setMessages(updatedMessages);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startSync, getOfflineMessages, roomId]);

  const hasOfflineMessages = isDataAvailableOffline('messages');

  return {
    messages,
    loading,
    error,
    saveMessage,
    refreshMessages,
    hasOfflineMessages
  };
};

// Hook for offline chat rooms
export const useOfflineChatRooms = () => {
  const { 
    getOfflineChatRooms, 
    isDataAvailableOffline,
    startSync 
  } = useOffline();
  
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChatRooms = () => {
      try {
        const offlineChatRooms = getOfflineChatRooms();
        setChatRooms(offlineChatRooms);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadChatRooms();
  }, [getOfflineChatRooms]);

  const refreshChatRooms = useCallback(async () => {
    try {
      setLoading(true);
      await startSync();
      const updatedChatRooms = getOfflineChatRooms();
      setChatRooms(updatedChatRooms);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startSync, getOfflineChatRooms]);

  const hasOfflineChatRooms = isDataAvailableOffline('chatRooms');

  return {
    chatRooms,
    loading,
    error,
    refreshChatRooms,
    hasOfflineChatRooms
  };
};

// Hook for offline actions
export const useOfflineActions = () => {
  const { 
    offlineActions, 
    addOfflineAction, 
    updateOfflineAction, 
    removeOfflineAction 
  } = useOffline();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addAction = useCallback(async (action) => {
    try {
      setLoading(true);
      setError(null);
      const actionId = await addOfflineAction(action);
      return actionId;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addOfflineAction]);

  const updateAction = useCallback(async (actionId, updates) => {
    try {
      setLoading(true);
      setError(null);
      await updateOfflineAction(actionId, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateOfflineAction]);

  const removeAction = useCallback(async (actionId) => {
    try {
      setLoading(true);
      setError(null);
      await removeOfflineAction(actionId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [removeOfflineAction]);

  const pendingActions = offlineActions.filter(action => action.status === 'pending');
  const completedActions = offlineActions.filter(action => action.status === 'completed');
  const failedActions = offlineActions.filter(action => action.status === 'failed');

  return {
    actions: offlineActions,
    pendingActions,
    completedActions,
    failedActions,
    loading,
    error,
    addAction,
    updateAction,
    removeAction
  };
};

// Hook for offline data management
export const useOfflineDataManagement = () => {
  const { 
    clearAllOfflineData, 
    exportOfflineData, 
    importOfflineData,
    databaseSize 
  } = useOffline();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await clearAllOfflineData();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAllOfflineData]);

  const exportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await exportOfflineData();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [exportOfflineData]);

  const importData = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      await importOfflineData(data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [importOfflineData]);

  return {
    databaseSize,
    loading,
    error,
    clearData,
    exportData,
    importData
  };
};

// Hook for network status
export const useNetworkStatus = () => {
  const { isOnline } = useOffline();
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const updateConnectionType = () => {
      if ('connection' in navigator) {
        setConnectionType(navigator.connection.effectiveType || 'unknown');
      }
    };

    updateConnectionType();
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateConnectionType);
      return () => {
        navigator.connection.removeEventListener('change', updateConnectionType);
      };
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g'
  };
};

// Hook for offline availability check
export const useOfflineAvailability = (dataType, id = null) => {
  const { isDataAvailableOffline } = useOffline();
  
  const isAvailable = isDataAvailableOffline(dataType, id);
  
  return {
    isAvailable,
    isNotAvailable: !isAvailable
  };
};

// Hook for sync with retry
export const useSyncWithRetry = (maxRetries = 3) => {
  const { sync, syncStatus } = useSync();
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  const syncWithRetry = useCallback(async () => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        setLastError(null);
        await sync();
        setRetryCount(0);
        return;
      } catch (error) {
        attempts++;
        setRetryCount(attempts);
        setLastError(error.message);
        
        if (attempts < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempts) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Sync failed after ${maxRetries} attempts`);
  }, [sync, maxRetries]);

  return {
    syncWithRetry,
    retryCount,
    lastError,
    hasRetriesLeft: retryCount < maxRetries,
    syncStatus
  };
};

// Export all hooks
export {
  useOffline
};
