import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import offlineStorage from '../services/offlineStorage.js';
import syncService from '../services/syncService.js';

// Action types
const OFFLINE_ACTIONS = {
  SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  SET_OFFLINE_DATA: 'SET_OFFLINE_DATA',
  ADD_OFFLINE_ACTION: 'ADD_OFFLINE_ACTION',
  UPDATE_OFFLINE_ACTION: 'UPDATE_OFFLINE_ACTION',
  REMOVE_OFFLINE_ACTION: 'REMOVE_OFFLINE_ACTION',
  SET_SYNC_PROGRESS: 'SET_SYNC_PROGRESS',
  SET_LAST_SYNC: 'SET_LAST_SYNC',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  isOnline: navigator.onLine,
  syncInProgress: false,
  syncProgress: 0,
  lastSync: null,
  offlineData: {
    tasks: [],
    messages: [],
    chatRooms: [],
    userProfile: null
  },
  offlineActions: [],
  syncQueue: [],
  error: null,
  databaseSize: 0
};

// Reducer
const offlineReducer = (state, action) => {
  switch (action.type) {
    case OFFLINE_ACTIONS.SET_ONLINE_STATUS:
      return {
        ...state,
        isOnline: action.payload
      };

    case OFFLINE_ACTIONS.SET_SYNC_STATUS:
      return {
        ...state,
        syncInProgress: action.payload
      };

    case OFFLINE_ACTIONS.SET_OFFLINE_DATA:
      return {
        ...state,
        offlineData: {
          ...state.offlineData,
          ...action.payload
        }
      };

    case OFFLINE_ACTIONS.ADD_OFFLINE_ACTION:
      return {
        ...state,
        offlineActions: [...state.offlineActions, action.payload]
      };

    case OFFLINE_ACTIONS.UPDATE_OFFLINE_ACTION:
      return {
        ...state,
        offlineActions: state.offlineActions.map(action =>
          action.id === action.payload.id ? { ...action, ...action.payload } : action
        )
      };

    case OFFLINE_ACTIONS.REMOVE_OFFLINE_ACTION:
      return {
        ...state,
        offlineActions: state.offlineActions.filter(action => action.id !== action.payload)
      };

    case OFFLINE_ACTIONS.SET_SYNC_PROGRESS:
      return {
        ...state,
        syncProgress: action.payload
      };

    case OFFLINE_ACTIONS.SET_LAST_SYNC:
      return {
        ...state,
        lastSync: action.payload
      };

    case OFFLINE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case OFFLINE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create context
const OfflineContext = createContext();

// Provider component
export const OfflineProvider = ({ children }) => {
  const [state, dispatch] = useReducer(offlineReducer, initialState);

  // Initialize offline storage and sync service
  useEffect(() => {
    const initializeOffline = async () => {
      try {
        await offlineStorage.init();
        await loadOfflineData();
        await updateDatabaseSize();
      } catch (error) {
        console.error('Failed to initialize offline functionality:', error);
        dispatch({ type: OFFLINE_ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    initializeOffline();
  }, []);

  // Setup network status listeners
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: OFFLINE_ACTIONS.SET_ONLINE_STATUS, payload: true });
      dispatch({ type: OFFLINE_ACTIONS.CLEAR_ERROR });
    };

    const handleOffline = () => {
      dispatch({ type: OFFLINE_ACTIONS.SET_ONLINE_STATUS, payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data
  const loadOfflineData = useCallback(async () => {
    try {
      const [tasks, messages, chatRooms, syncQueue] = await Promise.all([
        offlineStorage.getAllTasks(),
        offlineStorage.getAllMessages(),
        offlineStorage.getAllChatRooms(),
        offlineStorage.getSyncQueueItems()
      ]);

      dispatch({
        type: OFFLINE_ACTIONS.SET_OFFLINE_DATA,
        payload: {
          tasks,
          messages,
          chatRooms,
          syncQueue
        }
      });
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, []);

  // Update database size
  const updateDatabaseSize = useCallback(async () => {
    try {
      const size = await offlineStorage.getDatabaseSize();
      // Update state with database size
    } catch (error) {
      console.error('Failed to get database size:', error);
    }
  }, []);

  // Start sync
  const startSync = useCallback(async () => {
    if (!state.isOnline || state.syncInProgress) {
      return;
    }

    dispatch({ type: OFFLINE_ACTIONS.SET_SYNC_STATUS, payload: true });
    dispatch({ type: OFFLINE_ACTIONS.SET_SYNC_PROGRESS, payload: 0 });

    try {
      await syncService.startSync();
      dispatch({ type: OFFLINE_ACTIONS.SET_LAST_SYNC, payload: Date.now() });
      await loadOfflineData(); // Reload data after sync
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch({ type: OFFLINE_ACTIONS.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: OFFLINE_ACTIONS.SET_SYNC_STATUS, payload: false });
      dispatch({ type: OFFLINE_ACTIONS.SET_SYNC_PROGRESS, payload: 100 });
    }
  }, [state.isOnline, state.syncInProgress, loadOfflineData]);

  // Add offline action
  const addOfflineAction = useCallback(async (action) => {
    try {
      const actionId = await offlineStorage.addOfflineAction(action);
      const newAction = { ...action, id: actionId };
      
      dispatch({ type: OFFLINE_ACTIONS.ADD_OFFLINE_ACTION, payload: newAction });
      
      // If online, try to sync immediately
      if (state.isOnline) {
        await startSync();
      }
      
      return actionId;
    } catch (error) {
      console.error('Failed to add offline action:', error);
      throw error;
    }
  }, [state.isOnline, startSync]);

  // Update offline action
  const updateOfflineAction = useCallback(async (actionId, updates) => {
    try {
      await offlineStorage.updateOfflineAction(actionId, updates);
      dispatch({ type: OFFLINE_ACTIONS.UPDATE_OFFLINE_ACTION, payload: { id: actionId, ...updates } });
    } catch (error) {
      console.error('Failed to update offline action:', error);
      throw error;
    }
  }, []);

  // Remove offline action
  const removeOfflineAction = useCallback(async (actionId) => {
    try {
      await offlineStorage.removeOfflineAction(actionId);
      dispatch({ type: OFFLINE_ACTIONS.REMOVE_OFFLINE_ACTION, payload: actionId });
    } catch (error) {
      console.error('Failed to remove offline action:', error);
      throw error;
    }
  }, []);

  // Save task offline
  const saveTaskOffline = useCallback(async (task) => {
    try {
      await offlineStorage.saveTask(task);
      await loadOfflineData();
      
      // Add to sync queue if online
      if (state.isOnline) {
        await addOfflineAction({
          type: 'task',
          action: 'save',
          data: task
        });
      }
    } catch (error) {
      console.error('Failed to save task offline:', error);
      throw error;
    }
  }, [state.isOnline, loadOfflineData, addOfflineAction]);

  // Save message offline
  const saveMessageOffline = useCallback(async (message) => {
    try {
      await offlineStorage.saveMessage(message);
      await loadOfflineData();
      
      // Add to sync queue if online
      if (state.isOnline) {
        await addOfflineAction({
          type: 'message',
          action: 'save',
          data: message
        });
      }
    } catch (error) {
      console.error('Failed to save message offline:', error);
      throw error;
    }
  }, [state.isOnline, loadOfflineData, addOfflineAction]);

  // Get offline tasks
  const getOfflineTasks = useCallback(() => {
    return state.offlineData.tasks;
  }, [state.offlineData.tasks]);

  // Get offline messages for a room
  const getOfflineMessages = useCallback((roomId) => {
    return state.offlineData.messages.filter(message => message.roomId === roomId);
  }, [state.offlineData.messages]);

  // Get offline chat rooms
  const getOfflineChatRooms = useCallback(() => {
    return state.offlineData.chatRooms;
  }, [state.offlineData.chatRooms]);

  // Clear all offline data
  const clearAllOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearAllData();
      dispatch({ type: OFFLINE_ACTIONS.SET_OFFLINE_DATA, payload: initialState.offlineData });
      await updateDatabaseSize();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, [updateDatabaseSize]);

  // Export offline data
  const exportOfflineData = useCallback(async () => {
    try {
      return await offlineStorage.exportData();
    } catch (error) {
      console.error('Failed to export offline data:', error);
      throw error;
    }
  }, []);

  // Import offline data
  const importOfflineData = useCallback(async (data) => {
    try {
      await offlineStorage.importData(data);
      await loadOfflineData();
      await updateDatabaseSize();
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw error;
    }
  }, [loadOfflineData, updateDatabaseSize]);

  // Check if data is available offline
  const isDataAvailableOffline = useCallback((dataType, id = null) => {
    switch (dataType) {
      case 'tasks':
        return state.offlineData.tasks.length > 0;
      case 'messages':
        return state.offlineData.messages.length > 0;
      case 'chatRooms':
        return state.offlineData.chatRooms.length > 0;
      case 'task':
        return state.offlineData.tasks.some(task => task.id === id);
      case 'message':
        return state.offlineData.messages.some(message => message.id === id);
      case 'chatRoom':
        return state.offlineData.chatRooms.some(room => room.id === id);
      default:
        return false;
    }
  }, [state.offlineData]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return {
      isOnline: state.isOnline,
      syncInProgress: state.syncInProgress,
      syncProgress: state.syncProgress,
      lastSync: state.lastSync,
      pendingActions: state.offlineActions.length,
      pendingSyncItems: state.offlineData.syncQueue.length
    };
  }, [state]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: OFFLINE_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // State
    isOnline: state.isOnline,
    syncInProgress: state.syncInProgress,
    syncProgress: state.syncProgress,
    lastSync: state.lastSync,
    offlineData: state.offlineData,
    offlineActions: state.offlineActions,
    error: state.error,
    databaseSize: state.databaseSize,

    // Actions
    startSync,
    addOfflineAction,
    updateOfflineAction,
    removeOfflineAction,
    saveTaskOffline,
    saveMessageOffline,
    getOfflineTasks,
    getOfflineMessages,
    getOfflineChatRooms,
    clearAllOfflineData,
    exportOfflineData,
    importOfflineData,
    isDataAvailableOffline,
    getSyncStatus,
    clearError,
    loadOfflineData,
    updateDatabaseSize
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

// Custom hook to use offline context
export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Hook for sync status
export const useSyncStatus = () => {
  const { getSyncStatus } = useOffline();
  return getSyncStatus();
};

// Hook for offline data
export const useOfflineData = (dataType) => {
  const { offlineData } = useOffline();
  return offlineData[dataType] || [];
};

export default OfflineContext;
