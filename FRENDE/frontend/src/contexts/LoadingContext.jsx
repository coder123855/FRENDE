import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Loading state reducer
const loadingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        [action.key]: {
          isLoading: action.isLoading,
          message: action.message || '',
          timestamp: action.timestamp || Date.now()
        }
      };
    case 'CLEAR_LOADING':
      const newState = { ...state };
      delete newState[action.key];
      return newState;
    case 'CLEAR_ALL':
      return {};
    default:
      return state;
  }
};

// Loading context
const LoadingContext = createContext();

// Loading provider component
export const LoadingProvider = ({ children }) => {
  const [loadingStates, dispatch] = useReducer(loadingReducer, {});

  const setLoading = useCallback((key, isLoading, message = '') => {
    dispatch({
      type: 'SET_LOADING',
      key,
      isLoading,
      message,
      timestamp: Date.now()
    });
  }, []);

  const clearLoading = useCallback((key) => {
    dispatch({
      type: 'CLEAR_LOADING',
      key
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    dispatch({
      type: 'CLEAR_ALL'
    });
  }, []);

  const isLoading = useCallback((key) => {
    return loadingStates[key]?.isLoading || false;
  }, [loadingStates]);

  const getLoadingMessage = useCallback((key) => {
    return loadingStates[key]?.message || '';
  }, [loadingStates]);

  const getGlobalLoadingState = useCallback(() => {
    const loadingKeys = Object.keys(loadingStates);
    return {
      isLoading: loadingKeys.length > 0,
      count: loadingKeys.length,
      keys: loadingKeys,
      states: loadingStates
    };
  }, [loadingStates]);

  const value = {
    loadingStates,
    setLoading,
    clearLoading,
    clearAllLoading,
    isLoading,
    getLoadingMessage,
    getGlobalLoadingState
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

// Custom hook to use loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Hook for managing loading state for a specific key
export const useLoadingState = (key) => {
  const { setLoading, clearLoading, isLoading, getLoadingMessage } = useLoading();

  const startLoading = useCallback((message = '') => {
    setLoading(key, true, message);
  }, [key, setLoading]);

  const stopLoading = useCallback(() => {
    clearLoading(key);
  }, [key, clearLoading]);

  const withLoading = useCallback(async (asyncFn, message = '') => {
    startLoading(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading: isLoading(key),
    message: getLoadingMessage(key),
    startLoading,
    stopLoading,
    withLoading
  };
};

export default LoadingContext;
