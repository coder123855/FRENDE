import React, { useState, useEffect } from 'react';
import { useError } from '../contexts/ErrorContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  AlertTriangle, 
  X, 
  Wifi, 
  WifiOff, 
  User, 
  Server, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const GlobalErrorNotification = () => {
  const { notifications, dismissNotification, handleNotificationAction } = useError();
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  // Update visible notifications when notifications change
  useEffect(() => {
    setVisibleNotifications(notifications.slice(-3)); // Show last 3 notifications
  }, [notifications]);

  // Auto-dismiss notifications after delay
  useEffect(() => {
    const timers = visibleNotifications.map(notification => {
      if (notification.autoDismiss) {
        return setTimeout(() => {
          dismissNotification(notification.id);
        }, 5000);
      }
      return null;
    });

    return () => {
      timers.forEach(timer => timer && clearTimeout(timer));
    };
  }, [visibleNotifications, dismissNotification]);

  // Get icon for notification
  const getNotificationIcon = (severity, category) => {
    switch (category) {
      case 'network':
        return <WifiOff className="w-5 h-5" />;
      case 'authentication':
        return <User className="w-5 h-5" />;
      case 'server':
        return <Server className="w-5 h-5" />;
      default:
        switch (severity) {
          case 'critical':
            return <AlertTriangle className="w-5 h-5" />;
          case 'high':
            return <AlertCircle className="w-5 h-5" />;
          case 'medium':
            return <Info className="w-5 h-5" />;
          case 'low':
            return <CheckCircle className="w-5 h-5" />;
          default:
            return <AlertCircle className="w-5 h-5" />;
        }
    }
  };

  // Get background color for notification
  const getNotificationBgColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get icon color for notification
  const getNotificationIconColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Handle action button click
  const handleActionClick = (notificationId, action) => {
    handleNotificationAction(notificationId, action);
  };

  // Handle dismiss notification
  const handleDismiss = (notificationId) => {
    dismissNotification(notificationId);
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification) => (
        <Card
          key={notification.id}
          className={`${getNotificationBgColor(notification.severity)} border shadow-lg transition-all duration-300 ease-in-out`}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={`flex-shrink-0 ${getNotificationIconColor(notification.severity)}`}>
                {getNotificationIcon(notification.severity, notification.category)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm opacity-90">
                      {notification.message}
                    </p>
                  </div>
                  
                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Action buttons */}
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex space-x-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.primary ? "default" : "outline"}
                        onClick={() => handleActionClick(notification.id, action.action)}
                        className="text-xs"
                      >
                        {action.action === 'retry' && <RefreshCw className="w-3 h-3 mr-1" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs opacity-70 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GlobalErrorNotification;
