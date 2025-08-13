// Re-export from LoadingContext for easier imports
export { useLoading, useLoadingState } from '../contexts/LoadingContext';

// Additional loading utilities
export const useLoadingWithRetry = (key, maxRetries = 3) => {
  const { isLoading, message, startLoading, stopLoading, withLoading } = useLoadingState(key);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  const executeWithRetry = useCallback(async (asyncFn, message = '') => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        setRetryCount(attempts);
        setLastError(null);
        const result = await withLoading(asyncFn, message);
        return result;
      } catch (error) {
        attempts++;
        setLastError(error);
        
        if (attempts >= maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }, [withLoading, maxRetries]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setLastError(null);
  }, []);

  return {
    isLoading,
    message,
    retryCount,
    lastError,
    executeWithRetry,
    reset,
    hasRetriesLeft: retryCount < maxRetries
  };
};

export const useLoadingWithTimeout = (key, timeoutMs = 30000) => {
  const { isLoading, message, startLoading, stopLoading, withLoading } = useLoadingState(key);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const executeWithTimeout = useCallback(async (asyncFn, message = '') => {
    setIsTimedOut(false);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        withLoading(asyncFn, message),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      if (error.message === 'Operation timed out') {
        setIsTimedOut(true);
      }
      throw error;
    }
  }, [withLoading, timeoutMs]);

  return {
    isLoading,
    message,
    isTimedOut,
    executeWithTimeout
  };
};
