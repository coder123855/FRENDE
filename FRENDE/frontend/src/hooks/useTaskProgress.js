import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const useTaskProgress = (taskId, matchId) => {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [userCompleted, setUserCompleted] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [completionStatus, setCompletionStatus] = useState('not_started');

  // Fetch task details and progress
  const fetchTaskProgress = useCallback(async () => {
    if (!user || !taskId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTask(data.task);
      setProgress(data.progress_percentage || 0);
      setUserCompleted(data.user_completed || false);
      setPartnerCompleted(data.partner_completed || false);
      setCompletionStatus(data.completion_status || 'not_started');
      
      // Calculate time remaining
      if (data.task?.expires_at) {
        const now = new Date().getTime();
        const expirationTime = new Date(data.task.expires_at).getTime();
        const remaining = expirationTime - now;
        
        if (remaining <= 0) {
          setIsExpired(true);
          setTimeRemaining(0);
        } else {
          setIsExpired(false);
          setTimeRemaining(remaining);
        }
      }
    } catch (err) {
      console.error('Error fetching task progress:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, taskId]);

  // Complete task
  const completeTask = useCallback(async (submissionData = {}) => {
    if (!user || !taskId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_text: submissionData.text || 'Task completed',
          submission_evidence: submissionData.evidence || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update local state
      setUserCompleted(true);
      setProgress(prev => Math.min(prev + 50, 100)); // Each user contributes 50%
      
      if (result.progress_updated) {
        setCompletionStatus('partially_completed');
      }
      
      // If both users completed, mark as fully completed
      if (result.task?.is_completed) {
        setCompletionStatus('completed');
        setPartnerCompleted(true);
        setProgress(100);
      }

      return result;
    } catch (err) {
      console.error('Error completing task:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, taskId]);

  // Submit task validation (for tasks that require it)
  const submitValidation = useCallback(async (submissionText, submissionEvidence = null) => {
    if (!user || !taskId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_text: submissionText,
          submission_evidence: submissionEvidence
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error submitting task validation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, taskId]);

  // Check if user can complete the task
  const canComplete = useCallback(() => {
    if (!task || !user) return false;
    
    // Check if task is expired
    if (isExpired) return false;
    
    // Check if already completed by this user
    if (userCompleted) return false;
    
    // Check if task is already fully completed
    if (task.is_completed) return false;
    
    return true;
  }, [task, user, isExpired, userCompleted]);

  // Get completion status text
  const getCompletionStatusText = useCallback(() => {
    switch (completionStatus) {
      case 'completed':
        return 'Completed';
      case 'partially_completed':
        return 'Partially Completed';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  }, [completionStatus]);

  // Get progress color
  const getProgressColor = useCallback(() => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (isExpired) return 'bg-red-500';
    return 'bg-blue-500';
  }, [progress, isExpired]);

  // Format time remaining
  const formatTimeRemaining = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Start timer for countdown
  useEffect(() => {
    if (!task?.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expirationTime = new Date(task.expires_at).getTime();
      const remaining = expirationTime - now;

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
      } else {
        setIsExpired(false);
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [task?.expires_at]);

  // Initialize progress
  useEffect(() => {
    if (user && taskId) {
      fetchTaskProgress();
    }
  }, [user, taskId, fetchTaskProgress]);

  // Real-time updates (polling every 30 seconds)
  useEffect(() => {
    if (!user || !taskId) return;

    const interval = setInterval(() => {
      fetchTaskProgress();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, taskId, fetchTaskProgress]);

  return {
    // Data
    task,
    progress,
    timeRemaining,
    isExpired,
    userCompleted,
    partnerCompleted,
    completionStatus,
    
    // State
    loading,
    error,
    
    // Actions
    fetchTaskProgress,
    completeTask,
    submitValidation,
    
    // Computed values
    canComplete: canComplete(),
    completionStatusText: getCompletionStatusText(),
    progressColor: getProgressColor(),
    formattedTimeRemaining: formatTimeRemaining(timeRemaining),
    
    // Utilities
    isFullyCompleted: completionStatus === 'completed',
    isPartiallyCompleted: completionStatus === 'partially_completed',
    isNotStarted: completionStatus === 'not_started',
    hasExpired: isExpired,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining)
  };
};

export default useTaskProgress; 