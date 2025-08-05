import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Clock, Heart } from 'lucide-react';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for match status updates from the socket
    const handleMatchStatusUpdate = (data) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Match Status Updated',
        message: `Match with ${data.user_name || 'user'} is now ${data.status}`,
        icon: data.status === 'active' ? Heart : Clock,
        duration: 5000,
      });
    };

    const handleMatchExpired = (data) => {
      addNotification({
        id: Date.now(),
        type: 'warning',
        title: 'Match Expired',
        message: `Your match with ${data.user_name || 'user'} has expired`,
        icon: AlertTriangle,
        duration: 8000,
      });
    };

    const handleMatchRequestReceived = (data) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'New Match Request',
        message: `${data.user_name || 'Someone'} wants to connect with you!`,
        icon: Heart,
        duration: 10000,
      });
    };

    // Add event listeners (these would be connected to the socket in a real implementation)
    // socketClient.onMatchStatusUpdate(handleMatchStatusUpdate);
    // socketClient.onMatchExpired(handleMatchExpired);
    // socketClient.onMatchRequestReceived(handleMatchRequestReceived);

    return () => {
      // Cleanup event listeners
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after duration
    setTimeout(() => {
      removeNotification(notification.id);
    }, notification.duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = (icon, type) => {
    const IconComponent = icon;
    const iconColor = type === 'success' ? 'text-green-600' : 
                     type === 'warning' ? 'text-yellow-600' : 
                     type === 'error' ? 'text-red-600' : 'text-blue-600';
    
    return <IconComponent className={`h-5 w-5 ${iconColor}`} />;
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg max-w-sm ${getNotificationStyles(notification.type)} animate-in slide-in-from-right-2`}
        >
          <div className="flex-shrink-0">
            {getIcon(notification.icon, notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            <p className="text-sm mt-1">{notification.message}</p>
          </div>
          
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem; 