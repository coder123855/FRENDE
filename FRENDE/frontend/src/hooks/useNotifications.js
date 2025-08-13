import { useEffect, useRef } from 'react';
import socketManager from '../lib/socket';
import { Heart, MessageSquare, CheckCircle, Clock, AlertTriangle, Gift } from 'lucide-react';

// Enhanced app-level notification dispatcher via custom events
export const useNotifications = () => {
  const shownEventsRef = useRef(new Set());

  useEffect(() => {
    const handleChatMessage = (data) => {
      // Expect data.message and data.message.sender_id, match_id
      const key = `chat_message:${data?.message?.id || data?.message_id}`;
      if (!data?.message || shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      dispatchNotification({
        type: 'info',
        title: 'New message',
        message: data.message.message_text || 'You received a message',
        category: 'message',
        icon: MessageSquare,
        duration: 5000,
        priority: 'normal',
        action: {
          label: 'View Chat',
          handler: () => {
            // Navigate to chat or focus chat window
            window.dispatchEvent(new CustomEvent('focus-chat', { 
              detail: { matchId: data.message.match_id } 
            }));
          }
        }
      });
    };

    const handleTaskEvent = (data) => {
      const key = `task:${data.type}:${data.task_id}:${data.timestamp}`;
      if (shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      const titleMap = {
        task_assigned: 'New Task Assigned',
        task_completed: 'Task Completed',
        task_expiring: 'Task Expiring Soon',
        task_replaced: 'Task Replaced',
        task_reward: 'Reward Earned',
        task_submission: 'Task Submission Received'
      };

      const iconMap = {
        task_assigned: CheckCircle,
        task_completed: CheckCircle,
        task_expiring: Clock,
        task_replaced: AlertTriangle,
        task_reward: Gift,
        task_submission: MessageSquare
      };

      const priorityMap = {
        task_expiring: 'high',
        task_reward: 'high',
        default: 'normal'
      };

      dispatchNotification({
        type: data.type === 'task_expiring' ? 'warning' : 
              data.type === 'task_completed' || data.type === 'task_reward' ? 'success' : 'info',
        title: titleMap[data.type] || 'Task Update',
        message: data.task_title || data.message || '',
        category: 'task',
        icon: iconMap[data.type] || CheckCircle,
        duration: data.type === 'task_expiring' ? 10000 : 6000,
        priority: priorityMap[data.type] || priorityMap.default,
        action: {
          label: data.type === 'task_expiring' ? 'Complete Now' : 
                 data.type === 'task_reward' ? 'View Reward' : 'View Task',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-task', { 
              detail: { taskId: data.task_id, type: data.type } 
            }));
          }
        }
      });
    };

    const handleMatchEvent = (data) => {
      const key = `match:${data.type}:${data.match_id}:${data.timestamp}`;
      if (shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      const titleMap = {
        match_request: 'New Match Request',
        match_accepted: 'Match Accepted',
        match_rejected: 'Match Rejected',
        match_expired: 'Match Expired',
        match_completed: 'Match Completed'
      };

      const iconMap = {
        match_request: Heart,
        match_accepted: Heart,
        match_rejected: AlertTriangle,
        match_expired: Clock,
        match_completed: CheckCircle
      };

      const priorityMap = {
        match_request: 'high',
        match_accepted: 'high',
        default: 'normal'
      };

      dispatchNotification({
        type: data.type === 'match_accepted' ? 'success' : 
              data.type === 'match_rejected' || data.type === 'match_expired' ? 'warning' : 'info',
        title: titleMap[data.type] || 'Match Update',
        message: data.message || `Match with ${data.other_user_name || 'user'} ${data.type.replace('_', ' ')}`,
        category: 'match',
        icon: iconMap[data.type] || Heart,
        duration: data.type === 'match_request' ? 15000 : 8000,
        priority: priorityMap[data.type] || priorityMap.default,
        action: {
          label: data.type === 'match_request' ? 'View Request' : 
                 data.type === 'match_accepted' ? 'Start Chat' : 'View Match',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-match', { 
              detail: { matchId: data.match_id, type: data.type } 
            }));
          }
        }
      });
    };

    const handleSystemMessage = (data) => {
      const key = `system:${data.message_id}`;
      if (shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      dispatchNotification({
        type: 'info',
        title: 'System Message',
        message: data.message || '',
        category: 'system',
        icon: AlertTriangle,
        duration: 4000,
        priority: 'normal'
      });
    };

    const handleSlotEvent = (data) => {
      const key = `slot:${data.type}:${data.timestamp}`;
      if (shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      const titleMap = {
        slot_available: 'Slot Available',
        slot_expired: 'Slot Expired',
        slot_purchased: 'Slot Purchased'
      };

      dispatchNotification({
        type: data.type === 'slot_available' ? 'success' : 
              data.type === 'slot_expired' ? 'warning' : 'info',
        title: titleMap[data.type] || 'Slot Update',
        message: data.message || `Slot ${data.type.replace('_', ' ')}`,
        category: 'system',
        icon: Heart,
        duration: 6000,
        priority: 'normal',
        action: {
          label: data.type === 'slot_available' ? 'Find Friends' : 'View Slots',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-matching', { 
              detail: { type: data.type } 
            }));
          }
        }
      });
    };

    const handleCoinEvent = (data) => {
      const key = `coin:${data.type}:${data.amount}:${data.timestamp}`;
      if (shownEventsRef.current.has(key)) return;
      shownEventsRef.current.add(key);
      
      dispatchNotification({
        type: 'success',
        title: 'Coins Earned',
        message: `You earned ${data.amount} coins!`,
        category: 'system',
        icon: Gift,
        duration: 5000,
        priority: 'normal',
        action: {
          label: 'View Balance',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-profile', { 
              detail: { section: 'coins' } 
            }));
          }
        }
      });
    };

    // Socket event listeners
    socketManager.on('chat_message', handleChatMessage);
    socketManager.on('task_assigned', handleTaskEvent);
    socketManager.on('task_completed', handleTaskEvent);
    socketManager.on('task_expiring', handleTaskEvent);
    socketManager.on('task_replaced', handleTaskEvent);
    socketManager.on('task_reward', handleTaskEvent);
    socketManager.on('task_submission', handleTaskEvent);
    socketManager.on('match_request', handleMatchEvent);
    socketManager.on('match_accepted', handleMatchEvent);
    socketManager.on('match_rejected', handleMatchEvent);
    socketManager.on('match_expired', handleMatchEvent);
    socketManager.on('match_completed', handleMatchEvent);
    socketManager.on('slot_available', handleSlotEvent);
    socketManager.on('slot_expired', handleSlotEvent);
    socketManager.on('slot_purchased', handleSlotEvent);
    socketManager.on('coins_earned', handleCoinEvent);
    socketManager.on('system_message', handleSystemMessage);

    // Cleanup function
    return () => {
      socketManager.off('chat_message', handleChatMessage);
      socketManager.off('task_assigned', handleTaskEvent);
      socketManager.off('task_completed', handleTaskEvent);
      socketManager.off('task_expiring', handleTaskEvent);
      socketManager.off('task_replaced', handleTaskEvent);
      socketManager.off('task_reward', handleTaskEvent);
      socketManager.off('task_submission', handleTaskEvent);
      socketManager.off('match_request', handleMatchEvent);
      socketManager.off('match_accepted', handleMatchEvent);
      socketManager.off('match_rejected', handleMatchEvent);
      socketManager.off('match_expired', handleMatchEvent);
      socketManager.off('match_completed', handleMatchEvent);
      socketManager.off('slot_available', handleSlotEvent);
      socketManager.off('slot_expired', handleSlotEvent);
      socketManager.off('slot_purchased', handleSlotEvent);
      socketManager.off('coins_earned', handleCoinEvent);
      socketManager.off('system_message', handleSystemMessage);
    };
  }, []);

  // Helper function to dispatch notifications
  const dispatchNotification = (notification) => {
    window.dispatchEvent(new CustomEvent('app-notify', {
      detail: notification
    }));
  };

  // Return utility functions for manual notification dispatch
  return {
    dispatchNotification,
    dispatchMatchNotification: (type, data) => {
      dispatchNotification({
        type: type === 'accepted' ? 'success' : type === 'rejected' ? 'warning' : 'info',
        title: `Match ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        message: data.message || `Match ${type}`,
        category: 'match',
        icon: Heart,
        duration: 8000,
        priority: type === 'request' ? 'high' : 'normal',
        action: {
          label: type === 'request' ? 'View Request' : 'View Match',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-match', { 
              detail: { matchId: data.matchId, type } 
            }));
          }
        }
      });
    },
    dispatchTaskNotification: (type, data) => {
      dispatchNotification({
        type: type === 'completed' ? 'success' : type === 'expiring' ? 'warning' : 'info',
        title: `Task ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        message: data.message || `Task ${type}`,
        category: 'task',
        icon: CheckCircle,
        duration: type === 'expiring' ? 10000 : 6000,
        priority: type === 'expiring' ? 'high' : 'normal',
        action: {
          label: type === 'expiring' ? 'Complete Now' : 'View Task',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-task', { 
              detail: { taskId: data.taskId, type } 
            }));
          }
        }
      });
    },
    dispatchMessageNotification: (data) => {
      dispatchNotification({
        type: 'info',
        title: 'New Message',
        message: data.message || 'You received a new message',
        category: 'message',
        icon: MessageSquare,
        duration: 5000,
        priority: 'normal',
        action: {
          label: 'View Chat',
          handler: () => {
            window.dispatchEvent(new CustomEvent('focus-chat', { 
              detail: { matchId: data.matchId } 
            }));
          }
        }
      });
    }
  };
};


