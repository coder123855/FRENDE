// Notification Service for centralized notification management
import { Heart, MessageSquare, CheckCircle, Clock, AlertTriangle, Gift, Bell } from 'lucide-react';

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.notificationHistory = [];
    this.maxHistory = 100;
  }

  // Add event listener for notification events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Dispatch notification to all listeners
  dispatch(notification) {
    const fullNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      isRead: false,
      ...notification
    };

    // Add to history
    this.notificationHistory.unshift(fullNotification);
    if (this.notificationHistory.length > this.maxHistory) {
      this.notificationHistory.pop();
    }

    // Save to localStorage
    this.saveToStorage();

    // Notify all listeners
    this.listeners.forEach(listener => listener(fullNotification));

    // Dispatch custom event for global access
    window.dispatchEvent(new CustomEvent('app-notify', {
      detail: fullNotification
    }));

    return fullNotification;
  }

  // Match notifications
  notifyMatchRequest(matchData) {
    return this.dispatch({
      type: 'info',
      title: 'New Match Request',
      message: `${matchData.userName} wants to be your friend!`,
      category: 'match',
      icon: Heart,
      duration: 15000,
      priority: 'high',
      action: {
        label: 'View Request',
        handler: () => this.focusMatch(matchData.matchId)
      }
    });
  }

  notifyMatchAccepted(matchData) {
    return this.dispatch({
      type: 'success',
      title: 'Match Accepted!',
      message: `${matchData.userName} accepted your friend request`,
      category: 'match',
      icon: Heart,
      duration: 8000,
      priority: 'high',
      action: {
        label: 'Start Chat',
        handler: () => this.focusChat(matchData.matchId)
      }
    });
  }

  notifyMatchRejected(matchData) {
    return this.dispatch({
      type: 'warning',
      title: 'Match Declined',
      message: `${matchData.userName} declined your friend request`,
      category: 'match',
      icon: AlertTriangle,
      duration: 8000,
      priority: 'normal'
    });
  }

  notifyMatchExpired(matchData) {
    return this.dispatch({
      type: 'warning',
      title: 'Match Expired',
      message: `Your match request with ${matchData.userName} has expired`,
      category: 'match',
      icon: Clock,
      duration: 8000,
      priority: 'normal'
    });
  }

  // Task notifications
  notifyTaskAssigned(taskData) {
    return this.dispatch({
      type: 'info',
      title: 'New Task Assigned',
      message: taskData.title || 'You have a new task to complete',
      category: 'task',
      icon: CheckCircle,
      duration: 6000,
      priority: 'normal',
      action: {
        label: 'View Task',
        handler: () => this.focusTask(taskData.taskId)
      }
    });
  }

  notifyTaskCompleted(taskData) {
    return this.dispatch({
      type: 'success',
      title: 'Task Completed!',
      message: `You completed: ${taskData.title}`,
      category: 'task',
      icon: CheckCircle,
      duration: 6000,
      priority: 'normal',
      action: {
        label: 'View Reward',
        handler: () => this.focusTask(taskData.taskId)
      }
    });
  }

  notifyTaskExpiring(taskData) {
    return this.dispatch({
      type: 'warning',
      title: 'Task Expiring Soon',
      message: `Complete "${taskData.title}" before it expires!`,
      category: 'task',
      icon: Clock,
      duration: 10000,
      priority: 'high',
      action: {
        label: 'Complete Now',
        handler: () => this.focusTask(taskData.taskId)
      }
    });
  }

  notifyTaskReward(taskData) {
    return this.dispatch({
      type: 'success',
      title: 'Reward Earned!',
      message: `You earned ${taskData.coins} coins for completing the task!`,
      category: 'task',
      icon: Gift,
      duration: 8000,
      priority: 'high',
      action: {
        label: 'View Balance',
        handler: () => this.focusProfile('coins')
      }
    });
  }

  // Message notifications
  notifyNewMessage(messageData) {
    return this.dispatch({
      type: 'info',
      title: 'New Message',
      message: messageData.preview || 'You received a new message',
      category: 'message',
      icon: MessageSquare,
      duration: 5000,
      priority: 'normal',
      action: {
        label: 'View Chat',
        handler: () => this.focusChat(messageData.matchId)
      }
    });
  }

  // System notifications
  notifySlotAvailable() {
    return this.dispatch({
      type: 'success',
      title: 'Slot Available',
      message: 'You have a new friend slot available!',
      category: 'system',
      icon: Heart,
      duration: 6000,
      priority: 'normal',
      action: {
        label: 'Find Friends',
        handler: () => this.focusMatching()
      }
    });
  }

  notifySlotExpired() {
    return this.dispatch({
      type: 'warning',
      title: 'Slot Expired',
      message: 'One of your friend slots has expired',
      category: 'system',
      icon: Clock,
      duration: 6000,
      priority: 'normal',
      action: {
        label: 'View Slots',
        handler: () => this.focusMatching()
      }
    });
  }

  notifyCoinsEarned(amount, reason) {
    return this.dispatch({
      type: 'success',
      title: 'Coins Earned!',
      message: `You earned ${amount} coins${reason ? ` for ${reason}` : ''}!`,
      category: 'system',
      icon: Gift,
      duration: 5000,
      priority: 'normal',
      action: {
        label: 'View Balance',
        handler: () => this.focusProfile('coins')
      }
    });
  }

  notifySystemMessage(message, type = 'info') {
    return this.dispatch({
      type,
      title: 'System Message',
      message,
      category: 'system',
      icon: AlertTriangle,
      duration: 4000,
      priority: 'normal'
    });
  }

  // Focus navigation methods
  focusMatch(matchId) {
    window.dispatchEvent(new CustomEvent('focus-match', { 
      detail: { matchId } 
    }));
  }

  focusChat(matchId) {
    window.dispatchEvent(new CustomEvent('focus-chat', { 
      detail: { matchId } 
    }));
  }

  focusTask(taskId) {
    window.dispatchEvent(new CustomEvent('focus-task', { 
      detail: { taskId } 
    }));
  }

  focusMatching() {
    window.dispatchEvent(new CustomEvent('focus-matching', { 
      detail: {} 
    }));
  }

  focusProfile(section) {
    window.dispatchEvent(new CustomEvent('focus-profile', { 
      detail: { section } 
    }));
  }

  // Storage methods
  saveToStorage() {
    try {
      localStorage.setItem('notificationHistory', JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.warn('Failed to save notification history:', error);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('notificationHistory');
      if (saved) {
        this.notificationHistory = JSON.parse(saved).map(notification => ({
          ...notification,
          timestamp: new Date(notification.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load notification history:', error);
      this.notificationHistory = [];
    }
  }

  clearHistory() {
    this.notificationHistory = [];
    this.saveToStorage();
  }

  getHistory() {
    return [...this.notificationHistory];
  }

  getUnreadCount() {
    return this.notificationHistory.filter(n => !n.isRead).length;
  }

  markAsRead(notificationId) {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveToStorage();
    }
  }

  markAllAsRead() {
    this.notificationHistory.forEach(n => n.isRead = true);
    this.saveToStorage();
  }

  // Utility methods
  getNotificationIcon(category, type) {
    const iconMap = {
      match: Heart,
      task: CheckCircle,
      message: MessageSquare,
      system: AlertTriangle
    };
    return iconMap[category] || Bell;
  }

  getNotificationColor(type) {
    const colorMap = {
      success: 'green',
      warning: 'yellow',
      error: 'red',
      info: 'blue'
    };
    return colorMap[type] || 'gray';
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Load history on initialization
notificationService.loadFromStorage();

export default notificationService;
