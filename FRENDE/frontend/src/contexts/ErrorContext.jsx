import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { globalErrorHandler } from '../lib/globalErrorHandler';
import { errorReportingService } from '../lib/errorReportingService';
import { ERROR_SEVERITY } from '../lib/globalErrorHandler';

// Create context
const ErrorContext = createContext();

// Custom hook to use error context
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Error Provider component
export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [errorStats, setErrorStats] = useState({
    total: 0,
    byCategory: {},
    bySeverity: {},
    recent: []
  });

  // Initialize error handling
  useEffect(() => {
    // Initialize global error handler
    globalErrorHandler.initialize();
    
    // Initialize error reporting service
    errorReportingService.initialize();

    // Listen for app errors
    const handleAppError = (event) => {
      const errorInfo = event.detail;
      handleNewError(errorInfo);
    };

    window.addEventListener('app-error', handleAppError);

    // Update error stats periodically
    const statsInterval = setInterval(() => {
      updateErrorStats();
    }, 5000);

    return () => {
      window.removeEventListener('app-error', handleAppError);
      clearInterval(statsInterval);
      globalErrorHandler.cleanup();
      errorReportingService.cleanup();
    };
  }, []);

  // Handle new error
  const handleNewError = useCallback((errorInfo) => {
    // Add to errors list
    setErrors(prev => [...prev, errorInfo]);

    // Create notification for user
    const notification = {
      id: errorInfo.errorId,
      type: 'error',
      title: getErrorTitle(errorInfo),
      message: getErrorMessage(errorInfo),
      severity: errorInfo.severity,
      category: errorInfo.category,
      timestamp: new Date(),
      actions: getErrorActions(errorInfo),
      autoDismiss: errorInfo.severity === ERROR_SEVERITY.LOW
    };

    setNotifications(prev => [...prev, notification]);

    // Show error modal for critical errors
    if (errorInfo.severity === ERROR_SEVERITY.CRITICAL) {
      setCurrentError(errorInfo);
      setIsErrorModalOpen(true);
    }

    // Auto-dismiss low severity notifications
    if (notification.autoDismiss) {
      setTimeout(() => {
        dismissNotification(notification.id);
      }, 5000);
    }
  }, []);

  // Get error title
  const getErrorTitle = (errorInfo) => {
    switch (errorInfo.category) {
      case 'network':
        return 'Network Error';
      case 'authentication':
        return 'Authentication Error';
      case 'validation':
        return 'Validation Error';
      case 'server':
        return 'Server Error';
      case 'client':
        return 'Client Error';
      default:
        return 'Error';
    }
  };

  // Get error message
  const getErrorMessage = (errorInfo) => {
    const { message, category } = errorInfo;

    // Provide user-friendly messages
    switch (category) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'authentication':
        return 'Your session has expired. Please log in again.';
      case 'validation':
        return 'Please check your input and try again.';
      case 'server':
        return 'The server encountered an error. Please try again later.';
      case 'client':
        return 'Something went wrong. Please refresh the page.';
      default:
        return message || 'An unexpected error occurred.';
    }
  };

  // Get error actions
  const getErrorActions = (errorInfo) => {
    const actions = [];

    switch (errorInfo.category) {
      case 'network':
        actions.push({
          label: 'Retry',
          action: 'retry',
          primary: true
        });
        break;
      case 'authentication':
        actions.push({
          label: 'Login',
          action: 'login',
          primary: true
        });
        break;
      case 'validation':
        actions.push({
          label: 'Fix',
          action: 'fix',
          primary: true
        });
        break;
      default:
        actions.push({
          label: 'Retry',
          action: 'retry',
          primary: true
        });
    }

    actions.push({
      label: 'Report',
      action: 'report',
      primary: false
    });

    return actions;
  };

  // Update error statistics
  const updateErrorStats = useCallback(() => {
    const stats = globalErrorHandler.getErrorStats();
    setErrorStats(stats);
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Handle notification action
  const handleNotificationAction = useCallback((notificationId, action) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    switch (action) {
      case 'retry':
        // Trigger retry logic
        window.dispatchEvent(new CustomEvent('retry-action', {
          detail: { errorId: notificationId }
        }));
        break;
      case 'login':
        // Redirect to login
        window.location.href = '/login';
        break;
      case 'fix':
        // Show error details for fixing
        const error = errors.find(e => e.errorId === notificationId);
        if (error) {
          setCurrentError(error);
          setIsErrorModalOpen(true);
        }
        break;
      case 'report':
        // Report error
        reportError(notificationId);
        break;
    }

    dismissNotification(notificationId);
  }, [notifications, errors, dismissNotification]);

  // Report error
  const reportError = useCallback((errorId) => {
    const error = errors.find(e => e.errorId === errorId);
    if (error) {
      errorReportingService.reportError(error);
    }
  }, [errors]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([]);
    setNotifications([]);
    globalErrorHandler.clearErrorHistory();
  }, []);

  // Get errors by category
  const getErrorsByCategory = useCallback((category) => {
    return errors.filter(error => error.category === category);
  }, [errors]);

  // Get errors by severity
  const getErrorsBySeverity = useCallback((severity) => {
    return errors.filter(error => error.severity === severity);
  }, [errors]);

  // Get recent errors
  const getRecentErrors = useCallback((count = 10) => {
    return errors.slice(-count);
  }, [errors]);

  // Check if there are critical errors
  const hasCriticalErrors = useCallback(() => {
    return errors.some(error => error.severity === ERROR_SEVERITY.CRITICAL);
  }, [errors]);

  // Check if there are unread notifications
  const hasUnreadNotifications = useCallback(() => {
    return notifications.length > 0;
  }, [notifications]);

  // Close error modal
  const closeErrorModal = useCallback(() => {
    setIsErrorModalOpen(false);
    setCurrentError(null);
  }, []);

  // Context value
  const contextValue = {
    // State
    errors,
    notifications,
    isErrorModalOpen,
    currentError,
    errorStats,
    
    // Actions
    dismissNotification,
    handleNotificationAction,
    reportError,
    clearAllErrors,
    closeErrorModal,
    
    // Utilities
    getErrorsByCategory,
    getErrorsBySeverity,
    getRecentErrors,
    hasCriticalErrors,
    hasUnreadNotifications,
    
    // Error reporting service
    errorReportingService
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

export default ErrorContext;
