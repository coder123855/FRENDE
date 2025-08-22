import { useState, useEffect, useCallback, useRef } from 'react';
import { taskApi, TaskApiError } from '../lib/taskApi';
import { useOffline } from './useOffline';
import { useCachedData } from './useCache.js';
import { getTTL } from '../config/cacheConfig.js';

export const useTasks = (matchId, userId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskProgress, setTaskProgress] = useState({});
  const [taskHistory, setTaskHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [expiredTasks, setExpiredTasks] = useState([]);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const abortControllerRef = useRef(null);

  // Offline functionality
  const { 
    isOnline, 
    storeTask, 
    getOfflineTasks 
  } = useOffline();

  // Cache-aware data fetching for tasks
  const {
    data: cachedTasks,
    loading: cacheLoading,
    error: cacheError,
    isFromCache,
    refresh: refreshCache,
  } = useCachedData(
    matchId ? `/api/matches/${matchId}/tasks` : null,
    {
      dataType: 'tasks',
      ttl: getTTL('TASKS'),
      strategy: 'stale-while-revalidate',
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      enabled: !!matchId && isOnline,
    }
  );

  // Fetch tasks for a match with offline fallback
  const fetchTasks = useCallback(async () => {
    if (!matchId) return;
    
    setLoading(true);
    setError(null);
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Try online first with cache support
      if (isOnline) {
        // Use cached data if available
        if (cachedTasks && !cacheLoading) {
          setTasks(cachedTasks);
          setIsOfflineMode(false);
        } else {
          const tasksData = await taskApi.getMatchTasks(matchId);
          setTasks(tasksData || []);
          setIsOfflineMode(false);
          
          // Save to offline storage
          if (tasksData) {
            for (const task of tasksData) {
              await saveTaskOffline(task);
            }
          }
        }
        
        // Fetch progress for each task
        if (userId && tasks) {
          const progressPromises = tasks.map(task => 
            taskApi.getTaskProgress(task.id, userId).catch(() => null)
          );
          const progressResults = await Promise.all(progressPromises);
          
          const progressMap = {};
          progressResults.forEach((progress, index) => {
            if (progress && tasks[index]) {
              progressMap[tasks[index].id] = progress;
            }
          });
          setTaskProgress(progressMap);
        }
      } else {
        // Offline mode - use cached data
        const matchTasks = offlineTasks.filter(task => task.matchId === matchId);
        setTasks(matchTasks);
        setIsOfflineMode(true);
        setError('You are offline. Showing cached tasks.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      
      console.error('Failed to fetch tasks:', err);
      
      // Fallback to offline data
      if (hasOfflineTasks) {
        const matchTasks = offlineTasks.filter(task => task.matchId === matchId);
        setTasks(matchTasks);
        setIsOfflineMode(true);
        setError('Network error. Showing cached tasks.');
      } else {
        setError(err.message || 'Failed to load tasks');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [matchId, userId, isOnline, cachedTasks, cacheLoading, tasks, offlineTasks, saveTaskOffline, hasOfflineTasks]);

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    setRefreshing(true);
    if (isOnline) {
      await fetchTasks();
    } else {
      await refreshOfflineTasks();
      const matchTasks = offlineTasks.filter(task => task.matchId === matchId);
      setTasks(matchTasks);
    }
    setRefreshing(false);
  }, [fetchTasks, isOnline, refreshOfflineTasks, offlineTasks, matchId]);

  // Complete a task with offline support
  const completeTask = useCallback(async (taskId, submission = {}) => {
    if (!userId) {
      throw new Error('User ID is required to complete tasks');
    }
    
    try {
      let result;
      
      if (isOnline) {
        // Online completion
        result = await taskApi.completeTask(taskId, userId, submission);
      } else {
        // Offline completion - save to offline storage
        result = {
          id: taskId,
          is_completed: true,
          completion_date: new Date().toISOString(),
          submission: submission,
          isOffline: true
        };
        await saveTaskOffline(result);
      }
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, ...result }
            : task
        )
      );
      
      // Refresh progress if online
      if (isOnline) {
        const progress = await taskApi.getTaskProgress(taskId, userId);
        setTaskProgress(prev => ({
          ...prev,
          [taskId]: progress
        }));
      }
      
      return result;
    } catch (err) {
      console.error('Failed to complete task:', err);
      
      // If online failed, try offline
      if (isOnline) {
        try {
          const offlineResult = {
            id: taskId,
            is_completed: true,
            completion_date: new Date().toISOString(),
            submission: submission,
            isOffline: true
          };
          await saveTaskOffline(offlineResult);
          
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId 
                ? { ...task, ...offlineResult }
                : task
            )
          );
          
          return offlineResult;
        } catch (offlineErr) {
          console.error('Offline fallback also failed:', offlineErr);
        }
      }
      
      throw err;
    }
  }, [userId, isOnline, saveTaskOffline]);

  // Submit task validation with offline support
  const submitTaskValidation = useCallback(async (taskId, validation) => {
    if (!userId) {
      throw new Error('User ID is required to submit task validation');
    }
    
    try {
      let result;
      
      if (isOnline) {
        result = await taskApi.submitTaskValidation(taskId, userId, validation);
      } else {
        // Offline validation
        result = {
          id: taskId,
          validation: validation,
          validation_date: new Date().toISOString(),
          isOffline: true
        };
        await saveTaskOffline(result);
      }
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, ...result }
            : task
        )
      );
      
      return result;
    } catch (err) {
      console.error('Failed to submit task validation:', err);
      
      // Offline fallback
      if (isOnline) {
        try {
          const offlineResult = {
            id: taskId,
            validation: validation,
            validation_date: new Date().toISOString(),
            isOffline: true
          };
          await saveTaskOffline(offlineResult);
          
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId 
                ? { ...task, ...offlineResult }
                : task
            )
          );
          
          return offlineResult;
        } catch (offlineErr) {
          console.error('Offline fallback also failed:', offlineErr);
        }
      }
      
      throw err;
    }
  }, [userId, isOnline, saveTaskOffline]);

  // Get task details with offline support
  const getTaskDetails = useCallback(async (taskId) => {
    try {
      let details;
      
      if (isOnline) {
        details = await taskApi.getTaskDetails(taskId);
      } else {
        // Get from offline storage
        details = offlineTasks.find(task => task.id === taskId);
        if (!details) {
          throw new Error('Task not found in offline storage');
        }
      }
      
      setSelectedTask(details);
      return details;
    } catch (err) {
      console.error('Failed to get task details:', err);
      throw err;
    }
  }, [isOnline, offlineTasks]);

  // Generate new task (online only)
  const generateTask = useCallback(async (taskType = 'bonding', difficulty = 'medium') => {
    if (!matchId) {
      throw new Error('Match ID is required to generate tasks');
    }
    
    if (!isOnline) {
      throw new Error('Task generation requires internet connection');
    }
    
    try {
      const newTask = await taskApi.generateTask(matchId, taskType, difficulty);
      setTasks(prevTasks => [...prevTasks, newTask]);
      
      // Save to offline storage
      await saveTaskOffline(newTask);
      
      return newTask;
    } catch (err) {
      console.error('Failed to generate task:', err);
      throw err;
    }
  }, [matchId, isOnline, saveTaskOffline]);

  // Replace expired tasks (online only)
  const replaceExpiredTasks = useCallback(async () => {
    if (!matchId) {
      throw new Error('Match ID is required to replace expired tasks');
    }
    
    if (!isOnline) {
      throw new Error('Task replacement requires internet connection');
    }
    
    try {
      const result = await taskApi.replaceExpiredTasks(matchId);
      if (result.replaced_tasks) {
        setTasks(prevTasks => {
          const updatedTasks = [...prevTasks];
          result.replaced_tasks.forEach(replacement => {
            const index = updatedTasks.findIndex(t => t.id === replacement.old_task_id);
            if (index !== -1) {
              updatedTasks[index] = replacement.new_task;
              // Save new task to offline storage
              saveTaskOffline(replacement.new_task);
            }
          });
          return updatedTasks;
        });
      }
      return result;
    } catch (err) {
      console.error('Failed to replace expired tasks:', err);
      throw err;
    }
  }, [matchId, isOnline, saveTaskOffline]);

  // Get expired tasks for a match
  const getExpiredTasks = useCallback(async () => {
    if (!matchId) return;
    
    setExpiredLoading(true);
    try {
      let expiredTasksData;
      
      if (isOnline) {
        expiredTasksData = await taskApi.getExpiredTasks(matchId);
      } else {
        // Get from offline storage
        expiredTasksData = offlineTasks.filter(task => 
          task.matchId === matchId && task.is_expired && !task.is_completed
        );
      }
      
      setExpiredTasks(expiredTasksData || []);
      return expiredTasksData;
    } catch (err) {
      console.error('Failed to get expired tasks:', err);
      throw err;
    } finally {
      setExpiredLoading(false);
    }
  }, [matchId, isOnline, offlineTasks]);

  // Replace a specific expired task (online only)
  const replaceSpecificExpiredTask = useCallback(async (taskId) => {
    if (!isOnline) {
      throw new Error('Task replacement requires internet connection');
    }
    
    try {
      const replacementTask = await taskApi.replaceSpecificExpiredTask(taskId);
      
      // Update tasks list
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? replacementTask
            : task
        )
      );
      
      // Save to offline storage
      await saveTaskOffline(replacementTask);
      
      // Remove from expired tasks
      setExpiredTasks(prev => prev.filter(task => task.id !== taskId));
      
      return replacementTask;
    } catch (err) {
      console.error('Failed to replace specific expired task:', err);
      throw err;
    }
  }, [isOnline, saveTaskOffline]);

  // Replace all expired tasks system-wide (online only)
  const replaceAllExpiredTasks = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Task replacement requires internet connection');
    }
    
    try {
      const result = await taskApi.replaceAllExpiredTasks();
      
      // Refresh tasks to get updated list
      await fetchTasks();
      
      return result;
    } catch (err) {
      console.error('Failed to replace all expired tasks:', err);
      throw err;
    }
  }, [fetchTasks, isOnline]);

  // Fetch task history with offline support
  const fetchTaskHistory = useCallback(async () => {
    if (!userId) return;
    
    try {
      if (isOnline) {
        const history = await taskApi.getTaskHistory(userId);
        setTaskHistory(history || []);
      } else {
        // Get completed tasks from offline storage
        const completedTasks = offlineTasks.filter(task => task.is_completed);
        setTaskHistory(completedTasks);
      }
    } catch (err) {
      console.error('Failed to fetch task history:', err);
    }
  }, [userId, isOnline, offlineTasks]);

  // Fetch task statistics with offline support
  const fetchTaskStatistics = useCallback(async () => {
    if (!userId) return;
    
    try {
      if (isOnline) {
        const stats = await taskApi.getTaskStatistics(userId);
        setStatistics(stats);
      } else {
        // Calculate from offline data
        const completedTasks = offlineTasks.filter(task => task.is_completed);
        const totalTasks = offlineTasks.length;
        
        setStatistics({
          total_tasks: totalTasks,
          completed_tasks: completedTasks.length,
          completion_rate: totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0,
          total_coins_earned: completedTasks.reduce((sum, task) => sum + (task.coin_reward || 0), 0)
        });
      }
    } catch (err) {
      console.error('Failed to fetch task statistics:', err);
    }
  }, [userId, isOnline, offlineTasks]);

  // Auto-refresh tasks periodically
  useEffect(() => {
    fetchTasks();
    
    const interval = setInterval(() => {
      fetchTasks();
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  // Fetch history and statistics on mount
  useEffect(() => {
    fetchTaskHistory();
    fetchTaskStatistics();
  }, [fetchTaskHistory, fetchTaskStatistics]);

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(task => task.is_completed).length,
    inProgress: tasks.filter(task => !task.is_completed && task.progress_percentage > 0).length,
    expired: tasks.filter(task => task.is_expired && !task.is_completed).length,
    aiGenerated: tasks.filter(task => task.ai_generated).length,
  };

  return {
    // State
    tasks,
    loading,
    error,
    refreshing,
    selectedTask,
    taskProgress,
    taskHistory,
    statistics,
    taskStats,
    expiredTasks,
    expiredLoading,
    isOfflineMode,
    
    // Actions
    fetchTasks,
    refreshTasks,
    completeTask,
    submitTaskValidation,
    getTaskDetails,
    generateTask,
    replaceExpiredTasks,
    getExpiredTasks,
    replaceSpecificExpiredTask,
    replaceAllExpiredTasks,
    fetchTaskHistory,
    fetchTaskStatistics,
    setSelectedTask,
  };
}; 