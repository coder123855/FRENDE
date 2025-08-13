import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Clock, 
  CheckCircle, 
  X, 
  Filter, 
  Trash2, 
  Eye, 
  EyeOff,
  Heart,
  MessageSquare,
  AlertTriangle,
  Gift
} from 'lucide-react';
import notificationService from '../services/notificationService';

const NotificationHistory = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showRead, setShowRead] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter, showRead]);

  const loadNotifications = () => {
    setLoading(true);
    const history = notificationService.getHistory();
    
    let filtered = history;
    
    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(n => n.category === filter);
    }
    
    // Apply read status filter
    if (!showRead) {
      filtered = filtered.filter(n => !n.isRead);
    }
    
    setNotifications(filtered);
    setLoading(false);
  };

  const handleMarkAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    loadNotifications();
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all notification history?')) {
      notificationService.clearHistory();
      loadNotifications();
    }
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
        return Clock;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'match':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'task':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'message':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp) => {
    return notificationService.formatTimeAgo(timestamp);
  };

  const filterOptions = [
    { value: 'all', label: 'All', count: notificationService.getHistory().length },
    { value: 'match', label: 'Matches', count: notificationService.getHistory().filter(n => n.category === 'match').length },
    { value: 'task', label: 'Tasks', count: notificationService.getHistory().filter(n => n.category === 'task').length },
    { value: 'message', label: 'Messages', count: notificationService.getHistory().filter(n => n.category === 'message').length },
    { value: 'system', label: 'System', count: notificationService.getHistory().filter(n => n.category === 'system').length }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Notification History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close notification history"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              {filterOptions.map(option => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                  className="text-xs"
                >
                  {option.label}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {option.count}
                  </Badge>
                </Button>
              ))}
              
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRead(!showRead)}
                  className="text-xs"
                >
                  {showRead ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showRead ? 'Hide Read' : 'Show Read'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={notifications.filter(n => !n.isRead).length === 0}
                  className="text-xs"
                >
                  Mark All Read
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No notifications found</p>
                <p className="text-sm">Notifications will appear here when you receive them</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const CategoryIcon = getCategoryIcon(notification.category);
                  const NotificationIcon = notification.icon || CategoryIcon;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <NotificationIcon className={`h-5 w-5 ${getTypeColor(notification.type)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(notification.category)}`}
                            >
                              {notification.category.toUpperCase()}
                            </Badge>
                            
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            
                            <span className="text-xs text-gray-500 ml-auto">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1">
                            {notification.title}
                          </h4>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          {notification.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (notification.action.handler) {
                                  notification.action.handler();
                                }
                                onClose();
                              }}
                              className="text-xs"
                            >
                              {notification.action.label}
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              aria-label="Mark as read"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationHistory;
