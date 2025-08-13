import { useState, useCallback, useEffect } from 'react';

export const useErrorBoundary = () => {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const handleError = useCallback((error, errorInfo) => {
    setError(error);
    setErrorInfo(errorInfo);

    // Log error for debugging
    console.error('Error caught by boundary:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Dispatch custom event for error reporting
    window.dispatchEvent(new CustomEvent('app-error', {
      detail: {
        error,
        errorInfo,
        timestamp: new Date().toISOString()
      }
    }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  const reportError = useCallback((errorData) => {
    // In a real app, you'd send this to your error reporting service
    console.log('Error report:', errorData);
    
    // For now, just show an alert
    alert(`Error reported: ${errorData.message || 'Unknown error'}`);
  }, []);

  return {
    error,
    errorInfo,
    handleError,
    clearError,
    reportError,
    hasError: !!error
  };
};

export const useErrorHandler = () => {
  const [errors, setErrors] = useState([]);

  const addError = useCallback((error, context = {}) => {
    const errorEntry = {
      id: Date.now() + Math.random(),
      error,
      context,
      timestamp: new Date().toISOString()
    };

    setErrors(prev => [...prev, errorEntry]);

    // Log error
    console.error('Error handled:', errorEntry);

    return errorEntry.id;
  }, []);

  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(err => err.id !== errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getErrors = useCallback((filter = null) => {
    if (!filter) return errors;
    
    return errors.filter(error => {
      if (typeof filter === 'function') {
        return filter(error);
      }
      if (typeof filter === 'string') {
        return error.error.message?.includes(filter);
      }
      return true;
    });
  }, [errors]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    getErrors,
    hasErrors: errors.length > 0
  };
};

export const useNetworkErrorHandler = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkErrors, setNetworkErrors] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addNetworkError = useCallback((error, requestInfo = {}) => {
    const networkError = {
      id: Date.now() + Math.random(),
      error,
      requestInfo,
      timestamp: new Date().toISOString(),
      isOnline
    };

    setNetworkErrors(prev => [...prev, networkError]);
    return networkError.id;
  }, [isOnline]);

  const clearNetworkErrors = useCallback(() => {
    setNetworkErrors([]);
  }, []);

  const retryFailedRequests = useCallback(async (retryFn) => {
    if (!isOnline) return;

    const failedRequests = networkErrors.filter(err => 
      err.requestInfo && err.requestInfo.retryable !== false
    );

    for (const failedRequest of failedRequests) {
      try {
        await retryFn(failedRequest);
        setNetworkErrors(prev => 
          prev.filter(err => err.id !== failedRequest.id)
        );
      } catch (error) {
        console.error('Retry failed for request:', failedRequest, error);
      }
    }
  }, [isOnline, networkErrors]);

  return {
    isOnline,
    networkErrors,
    addNetworkError,
    clearNetworkErrors,
    retryFailedRequests,
    hasNetworkErrors: networkErrors.length > 0
  };
};
