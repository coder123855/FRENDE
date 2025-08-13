import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const useTaskReplacement = (matchId) => {
  const { user } = useAuth();
  const [expiredTasks, setExpiredTasks] = useState([]);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replacementModal, setReplacementModal] = useState({
    isOpen: false,
    oldTask: null,
    newTask: null
  });

  // Check for expired tasks
  const checkExpiredTasks = useCallback(async () => {
    if (!matchId || !user) return;

    try {
      const response = await fetch(`/api/tasks/matches/${matchId}/expired`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const expiredTasksData = await response.json();
        setExpiredTasks(expiredTasksData);
        
        // If there are expired tasks, show replacement modal
        if (expiredTasksData.length > 0) {
          const firstExpiredTask = expiredTasksData[0];
          await showReplacementModal(firstExpiredTask);
        }
      }
    } catch (error) {
      console.error('Error checking expired tasks:', error);
    }
  }, [matchId, user]);

  // Generate replacement task
  const generateReplacementTask = useCallback(async (oldTask) => {
    if (!matchId || !user) return null;

    try {
      const response = await fetch(`/api/tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          task_type: oldTask.task_type || 'bonding',
          difficulty: oldTask.difficulty || 'medium',
          category: oldTask.category || 'bonding'
        })
      });

      if (response.ok) {
        const newTask = await response.json();
        return newTask;
      }
    } catch (error) {
      console.error('Error generating replacement task:', error);
    }
    return null;
  }, [matchId, user]);

  // Show replacement modal
  const showReplacementModal = useCallback(async (oldTask) => {
    const newTask = await generateReplacementTask(oldTask);
    
    if (newTask) {
      setReplacementModal({
        isOpen: true,
        oldTask,
        newTask
      });
    }
  }, [generateReplacementTask]);

  // Replace specific expired task
  const replaceExpiredTask = useCallback(async (taskId) => {
    if (!user) return;

    setIsReplacing(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/replace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const replacementTask = await response.json();
        return replacementTask;
      }
    } catch (error) {
      console.error('Error replacing expired task:', error);
      throw error;
    } finally {
      setIsReplacing(false);
    }
  }, [user]);

  // Replace all expired tasks for a match
  const replaceAllExpiredTasks = useCallback(async () => {
    if (!matchId || !user) return;

    setIsReplacing(true);
    try {
      const response = await fetch(`/api/tasks/matches/${matchId}/replace-expired`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const replacedTasks = await response.json();
        return replacedTasks;
      }
    } catch (error) {
      console.error('Error replacing all expired tasks:', error);
      throw error;
    } finally {
      setIsReplacing(false);
    }
  }, [matchId, user]);

  // Handle task expiration
  const handleTaskExpired = useCallback(async (task) => {
    await showReplacementModal(task);
  }, [showReplacementModal]);

  // Handle replacement confirmation
  const handleReplacementConfirm = useCallback(async (oldTask, newTask) => {
    setIsReplacing(true);
    try {
      // Replace the specific task
      await replaceExpiredTask(oldTask.id);
      
      // Close modal
      setReplacementModal({
        isOpen: false,
        oldTask: null,
        newTask: null
      });

      // Refresh expired tasks list
      await checkExpiredTasks();

      return newTask;
    } catch (error) {
      console.error('Error confirming replacement:', error);
      throw error;
    } finally {
      setIsReplacing(false);
    }
  }, [replaceExpiredTask, checkExpiredTasks]);

  // Close replacement modal
  const closeReplacementModal = useCallback(() => {
    setReplacementModal({
      isOpen: false,
      oldTask: null,
      newTask: null
    });
  }, []);

  // Check for expired tasks periodically
  useEffect(() => {
    if (matchId && user) {
      checkExpiredTasks();
      
      // Check every 5 minutes
      const interval = setInterval(checkExpiredTasks, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [matchId, user, checkExpiredTasks]);

  return {
    expiredTasks,
    isReplacing,
    replacementModal,
    handleTaskExpired,
    handleReplacementConfirm,
    closeReplacementModal,
    replaceExpiredTask,
    replaceAllExpiredTasks,
    checkExpiredTasks
  };
};

export default useTaskReplacement; 