import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export const useTaskChat = (matchId) => {
    const { user } = useAuth();
    const [taskStatus, setTaskStatus] = useState(null);
    const [taskNotifications, setTaskNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submissionHistory, setSubmissionHistory] = useState([]);
    const notificationRef = useRef(null);

    // Load task status
    useEffect(() => {
        if (!user || !matchId) return;
        loadTaskStatus();
    }, [user, matchId]);

    // Load task notifications
    useEffect(() => {
        if (!user || !matchId) return;
        loadTaskNotifications();
    }, [user, matchId]);

    // Listen for WebSocket task events
    useEffect(() => {
        if (!window.socketManager) return;

        const handleTaskAssigned = (data) => {
            console.log('Task assigned:', data);
            addTaskNotification({
                type: 'task_assigned',
                task_id: data.task_id,
                title: data.task_title,
                description: data.task_description,
                reward_coins: data.reward_coins,
                due_date: data.due_date,
                timestamp: new Date().toISOString(),
                is_read: false
            });
            loadTaskStatus(); // Refresh task status
        };

        const handleTaskCompleted = (data) => {
            console.log('Task completed:', data);
            addTaskNotification({
                type: 'task_completed',
                task_id: data.task_id,
                title: data.task_title,
                reward_coins: data.reward_coins,
                timestamp: new Date().toISOString(),
                is_read: false
            });
            loadTaskStatus(); // Refresh task status
        };

        const handleTaskExpiring = (data) => {
            console.log('Task expiring:', data);
            addTaskNotification({
                type: 'task_expiring',
                task_id: data.task_id,
                title: data.task_title,
                hours_remaining: data.hours_remaining,
                timestamp: new Date().toISOString(),
                is_read: false
            });
        };

        const handleTaskReplaced = (data) => {
            console.log('Task replaced:', data);
            addTaskNotification({
                type: 'task_replaced',
                task_id: data.new_task_id,
                title: data.new_task_title,
                description: data.new_task_description,
                reward_coins: data.reward_coins,
                timestamp: new Date().toISOString(),
                is_read: false
            });
            loadTaskStatus(); // Refresh task status
        };

        const handleTaskSubmission = (data) => {
            console.log('Task submission:', data);
            addTaskNotification({
                type: 'task_submission',
                task_id: data.task_id,
                title: 'Task submission received',
                timestamp: new Date().toISOString(),
                is_read: false
            });
            loadTaskStatus(); // Refresh task status
        };

        // Listen for task events
        window.socketManager.on('task_assigned', handleTaskAssigned);
        window.socketManager.on('task_completed', handleTaskCompleted);
        window.socketManager.on('task_expiring', handleTaskExpiring);
        window.socketManager.on('task_replaced', handleTaskReplaced);
        window.socketManager.on('task_submission', handleTaskSubmission);

        return () => {
            window.socketManager.off('task_assigned', handleTaskAssigned);
            window.socketManager.off('task_completed', handleTaskCompleted);
            window.socketManager.off('task_expiring', handleTaskExpiring);
            window.socketManager.off('task_replaced', handleTaskReplaced);
            window.socketManager.off('task_submission', handleTaskSubmission);
        };
    }, [matchId]);

    const loadTaskStatus = useCallback(async () => {
        if (!user || !matchId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/status`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTaskStatus(data);
            } else {
                throw new Error('Failed to load task status');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading task status:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId]);

    const loadTaskNotifications = useCallback(async () => {
        if (!user || !matchId) return;

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTaskNotifications(data);
            } else {
                throw new Error('Failed to load task notifications');
            }
        } catch (err) {
            console.error('Error loading task notifications:', err);
        }
    }, [user, matchId]);

    const submitTaskViaChat = useCallback(async (taskId, submissionText, evidenceUrl = null) => {
        if (!user || !matchId) return null;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/tasks/${taskId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    submission_text: submissionText,
                    evidence_url: evidenceUrl
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Add to submission history
                setSubmissionHistory(prev => [...prev, {
                    task_id: taskId,
                    submission_text: submissionText,
                    evidence_url: evidenceUrl,
                    timestamp: new Date().toISOString(),
                    success: data.success
                }]);

                // Refresh task status
                await loadTaskStatus();

                // Emit WebSocket event
                if (window.socketManager) {
                    window.socketManager.emit('task_submission', {
                        match_id: matchId,
                        task_id: taskId,
                        user_id: user.id,
                        submission_text: submissionText,
                        evidence_url: evidenceUrl
                    });
                }

                return data;
            } else {
                throw new Error('Failed to submit task');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error submitting task via chat:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId, loadTaskStatus]);

    const completeTaskViaChat = useCallback(async (taskId) => {
        if (!user || !matchId) return null;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Add to submission history
                setSubmissionHistory(prev => [...prev, {
                    task_id: taskId,
                    submission_text: 'Task completed via chat',
                    timestamp: new Date().toISOString(),
                    success: data.success
                }]);

                // Refresh task status
                await loadTaskStatus();

                // Emit WebSocket event
                if (window.socketManager) {
                    window.socketManager.emit('task_completion', {
                        match_id: matchId,
                        task_id: taskId,
                        user_id: user.id
                    });
                }

                return data;
            } else {
                throw new Error('Failed to complete task');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error completing task via chat:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId, loadTaskStatus]);

    const markNotificationRead = useCallback(async (notificationId) => {
        if (!user || !matchId) return;

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update notification as read
                setTaskNotifications(prev => 
                    prev.map(notification => 
                        notification.id === notificationId 
                            ? { ...notification, is_read: true }
                            : notification
                    )
                );
            } else {
                throw new Error('Failed to mark notification as read');
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, [user, matchId]);

    const addTaskNotification = useCallback((notification) => {
        setTaskNotifications(prev => [notification, ...prev]);
        
        // Show browser notification if supported
        if (notificationRef.current && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Notification', {
                body: `${notification.title} - ${notification.type}`,
                icon: '/favicon.ico'
            });
        }
    }, []);

    const sendTaskNotification = useCallback(async (taskId, notificationType, message) => {
        if (!user || !matchId) return;

        try {
            const response = await fetch(`/api/task-chat/matches/${matchId}/tasks/${taskId}/notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notification_type: notificationType,
                    message: message
                })
            });

            if (response.ok) {
                console.log('Task notification sent successfully');
                return true;
            } else {
                throw new Error('Failed to send task notification');
            }
        } catch (err) {
            console.error('Error sending task notification:', err);
            return false;
        }
    }, [user, matchId]);

    // Utility functions
    const hasActiveTask = useCallback(() => {
        return taskStatus?.has_active_task || false;
    }, [taskStatus]);

    const getCurrentTask = useCallback(() => {
        return taskStatus?.task || null;
    }, [taskStatus]);

    const getTaskProgress = useCallback(() => {
        if (!taskStatus?.submissions) return 0;
        const { count, user_ids } = taskStatus.submissions;
        return (count / 2) * 100; // Assuming 2 users per match
    }, [taskStatus]);

    const getTimeRemaining = useCallback(() => {
        if (!taskStatus?.time_remaining) return null;
        const hours = Math.floor(taskStatus.time_remaining / 3600);
        const minutes = Math.floor((taskStatus.time_remaining % 3600) / 60);
        return { hours, minutes };
    }, [taskStatus]);

    const getUnreadNotificationsCount = useCallback(() => {
        return taskNotifications.filter(notification => !notification.is_read).length;
    }, [taskNotifications]);

    const getTaskNotificationsByType = useCallback((type) => {
        return taskNotifications.filter(notification => notification.type === type);
    }, [taskNotifications]);

    const clearNotifications = useCallback(() => {
        setTaskNotifications([]);
    }, []);

    const refreshTaskData = useCallback(async () => {
        await Promise.all([
            loadTaskStatus(),
            loadTaskNotifications()
        ]);
    }, [loadTaskStatus, loadTaskNotifications]);

    return {
        // State
        taskStatus,
        taskNotifications,
        submissionHistory,
        isLoading,
        error,
        
        // Actions
        submitTaskViaChat,
        completeTaskViaChat,
        markNotificationRead,
        sendTaskNotification,
        refreshTaskData,
        clearNotifications,
        
        // Utility functions
        hasActiveTask,
        getCurrentTask,
        getTaskProgress,
        getTimeRemaining,
        getUnreadNotificationsCount,
        getTaskNotificationsByType,
        
        // Refs
        notificationRef
    };
}; 