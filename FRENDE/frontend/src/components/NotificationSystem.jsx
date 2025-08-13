import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Clock, Heart, MessageSquare, Bell, Settings, Volume2, VolumeX, History } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import NotificationHistory from './NotificationHistory';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    sound: true,
    browserNotifications: true,
    matchNotifications: true,
    taskNotifications: true,
    messageNotifications: true,
    systemNotifications: true
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);
  const { announceToScreenReader } = useAccessibility();

  // Initialize WS notification listeners
  useNotifications();

  useEffect(() => {
    // Load notification settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setNotificationSettings(JSON.parse(savedSettings));
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Create audio element for notification sounds
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audioRef.current.volume = 0.3;
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    const handleAppNotify = (e) => {
      const detail = e.detail || {};
      addNotification({
        id: Date.now() + Math.random(),
        type: detail.type || 'info',
        title: detail.title || 'Notification',
        message: detail.message || '',
        icon: detail.icon || MessageSquare,
        duration: detail.duration || 5000,
        category: detail.category || 'system',
        isRead: false,
        timestamp: new Date(),
        action: detail.action,
        priority: detail.priority || 'normal'
      });
    };

    window.addEventListener('app-notify', handleAppNotify);
    return () => window.removeEventListener('app-notify', handleAppNotify);
  }, []);

  const addNotification = (notification) => {
    // Check if notification type is enabled
    const categoryKey = `${notification.category}Notifications`;
    if (!notificationSettings[categoryKey]) {
      return;
    }

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play sound if enabled
    if (notificationSettings.sound && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Show browser notification if enabled
    if (notificationSettings.browserNotifications && 
        'Notification' in window && 
        Notification.permission === 'granted' &&
        document.hidden) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      });
    }

    // Announce to screen reader
    announceToScreenReader(`${notification.title}: ${notification.message}`);

    // Auto-remove notification after duration (except high priority)
    if (notification.priority !== 'high') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationStyles = (type, priority) => {
    const baseStyles = 'flex items-start space-x-3 p-4 rounded-lg border shadow-lg max-w-sm transition-all duration-200';
    
    let typeStyles = '';
    switch (type) {
      case 'success':
        typeStyles = 'bg-green-50 border-green-200 text-green-800';
        break;
      case 'warning':
        typeStyles = 'bg-yellow-50 border-yellow-200 text-yellow-800';
        break;
      case 'error':
        typeStyles = 'bg-red-50 border-red-200 text-red-800';
        break;
      case 'info':
        typeStyles = 'bg-blue-50 border-blue-200 text-blue-800';
        break;
      default:
        typeStyles = 'bg-gray-50 border-gray-200 text-gray-800';
    }

    const priorityStyles = priority === 'high' ? 'ring-2 ring-red-300' : '';
    
    return `${baseStyles} ${typeStyles} ${priorityStyles}`;
  };

  const getIcon = (icon, type) => {
    const IconComponent = icon;
    const iconColor = type === 'success' ? 'text-green-600' : 
                     type === 'warning' ? 'text-yellow-600' : 
                     type === 'error' ? 'text-red-600' : 'text-blue-600';
    
    return <IconComponent className={`h-5 w-5 ${iconColor}`} />;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'match':
        return Heart;
      case 'task':
        return CheckCircle;
      case 'message':
        return MessageSquare;
      case 'system':
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const groupedNotifications = notifications.reduce((groups, notification) => {
    const category = notification.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(notification);
    return groups;
  }, {});

  return (
    <>
      {/* Notification Bell with Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="relative"
            aria-label="Notification history"
          >
            <History className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Notification settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notification Settings Panel */}
      {showSettings && (
        <Card className="fixed top-16 right-4 z-50 w-80 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sound</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotificationSettings(prev => ({ ...prev, sound: !prev.sound }))}
                  aria-label={notificationSettings.sound ? 'Disable sound' : 'Enable sound'}
                >
                  {notificationSettings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Browser notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if ('Notification' in window) {
                      if (Notification.permission === 'granted') {
                        setNotificationSettings(prev => ({ ...prev, browserNotifications: !prev.browserNotifications }));
                      } else {
                        Notification.requestPermission();
                      }
                    }
                  }}
                  aria-label={notificationSettings.browserNotifications ? 'Disable browser notifications' : 'Enable browser notifications'}
                >
                  {notificationSettings.browserNotifications ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </Button>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Categories</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </Button>
                </div>

                {Object.entries(notificationSettings)
                  .filter(([key]) => key.endsWith('Notifications'))
                  .map(([key, enabled]) => {
                    const category = key.replace('Notifications', '');
                    const Icon = getCategoryIcon(category);
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm capitalize">{category}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !enabled }))}
                          aria-label={`${enabled ? 'Disable' : 'Enable'} ${category} notifications`}
                        >
                          {enabled ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                  className="w-full"
                >
                  Clear all notifications
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification List */}
      <div className="fixed top-16 right-4 z-40 space-y-2 max-h-96 overflow-y-auto">
        {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => (
          <div key={category} className="space-y-2">
            {categoryNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`${getNotificationStyles(notification.type, notification.priority)} ${
                  !notification.isRead ? 'ring-2 ring-blue-300' : ''
                } animate-in slide-in-from-right-2`}
                role="alert"
                aria-live={notification.priority === 'high' ? 'assertive' : 'polite'}
              >
                <div className="flex-shrink-0">
                  {getIcon(notification.icon, notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{notification.message}</p>
                  
                  {notification.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => notification.action()}
                      className="mt-2"
                    >
                      {notification.action.label || 'Action'}
                    </Button>
                  )}
                </div>
                
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      aria-label="Mark as read"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Notification History Modal */}
      <NotificationHistory 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </>
  );
};

export default NotificationSystem; 