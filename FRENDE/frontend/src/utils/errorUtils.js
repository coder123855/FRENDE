// Error utility functions

export const isNetworkError = (error) => {
  if (!error) return false;
  
  // Check for network-related error messages
  const networkErrorMessages = [
    'network error',
    'fetch failed',
    'connection refused',
    'timeout',
    'cors',
    'net::err_',
    'failed to fetch'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
};

export const isAuthError = (error) => {
  if (!error) return false;
  
  // Check for authentication-related error messages
  const authErrorMessages = [
    'unauthorized',
    'forbidden',
    'authentication',
    'token expired',
    'invalid token',
    '401',
    '403'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return authErrorMessages.some(msg => errorMessage.includes(msg));
};

export const isServerError = (error) => {
  if (!error) return false;
  
  // Check for server-related error messages
  const serverErrorMessages = [
    'internal server error',
    '500',
    '502',
    '503',
    '504',
    'server error',
    'service unavailable'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return serverErrorMessages.some(msg => errorMessage.includes(msg));
};

export const getErrorType = (error) => {
  if (isNetworkError(error)) return 'network';
  if (isAuthError(error)) return 'auth';
  if (isServerError(error)) return 'server';
  return 'general';
};

export const formatError = (error) => {
  if (!error) return { message: 'Unknown error occurred' };
  
  const errorType = getErrorType(error);
  
  // Extract meaningful error message
  let message = error.message || 'An error occurred';
  
  // Clean up common error messages
  if (message.includes('fetch')) {
    message = 'Unable to connect to the server. Please check your internet connection.';
  } else if (message.includes('timeout')) {
    message = 'The request timed out. Please try again.';
  } else if (message.includes('unauthorized') || message.includes('401')) {
    message = 'Your session has expired. Please log in again.';
  } else if (message.includes('forbidden') || message.includes('403')) {
    message = 'You don\'t have permission to perform this action.';
  } else if (message.includes('500') || message.includes('internal server error')) {
    message = 'The server encountered an error. Please try again later.';
  }
  
  return {
    type: errorType,
    message,
    originalError: error,
    timestamp: new Date().toISOString()
  };
};

export const createErrorBoundary = (error, errorInfo) => {
  return {
    error,
    errorInfo,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    formatted: formatError(error)
  };
};

export const logError = (error, context = {}) => {
  const errorData = {
    ...createErrorBoundary(error),
    context,
    stack: error.stack,
    name: error.name
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorData);
  }
  
  // In production, you'd send this to your error reporting service
  // Example: Sentry.captureException(error, { extra: errorData });
  
  return errorData;
};

export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export const withErrorHandling = (fn, errorHandler = null) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const formattedError = formatError(error);
      
      if (errorHandler) {
        errorHandler(formattedError);
      } else {
        logError(error);
      }
      
      throw formattedError;
    }
  };
};

export const createErrorHandler = (options = {}) => {
  const {
    onError = null,
    onNetworkError = null,
    onAuthError = null,
    onServerError = null,
    logErrors = true
  } = options;
  
  return (error) => {
    const formattedError = formatError(error);
    
    if (logErrors) {
      logError(error);
    }
    
    // Call specific error handlers based on error type
    switch (formattedError.type) {
      case 'network':
        onNetworkError?.(formattedError);
        break;
      case 'auth':
        onAuthError?.(formattedError);
        break;
      case 'server':
        onServerError?.(formattedError);
        break;
      default:
        onError?.(formattedError);
        break;
    }
    
    return formattedError;
  };
};
