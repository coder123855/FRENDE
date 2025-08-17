import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../lib/api';
import { useOptimisticUpdate } from './useOptimisticUpdate';

const useCompatibleUsers = (limit = 10) => {
  const optimisticUpdate = useOptimisticUpdate({ type: 'immediate' });
  const [compatibleUsers, setCompatibleUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchCompatibleUsers = useCallback(async (reset = false) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const currentPage = reset ? 1 : page;
      const response = await userAPI.getCompatibleUsers(limit);
      
      const newUsers = response.data || [];
      
      if (reset) {
        setCompatibleUsers(newUsers);
        setPage(1);
      } else {
        setCompatibleUsers(prev => [...prev, ...newUsers]);
        setPage(prev => prev + 1);
      }

      // Check if we have more users to load
      setHasMore(newUsers.length === limit);
    } catch (err) {
      console.error('Failed to fetch compatible users:', err);
      setError(err.response?.data?.detail || 'Failed to load compatible users');
    } finally {
      setLoading(false);
    }
  }, [limit, page, loading]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchCompatibleUsers(false);
    }
  }, [loading, hasMore, fetchCompatibleUsers]);

  const refresh = useCallback(() => {
    fetchCompatibleUsers(true);
  }, [fetchCompatibleUsers]);

  // Initial load
  useEffect(() => {
    fetchCompatibleUsers(true);
  }, [fetchCompatibleUsers]);

  // Remove user from list after sending request
  const removeUser = useCallback((userId) => {
    const user = getUserById(userId);
    if (!user) return;

    // Optimistic update
    const optimisticId = `remove_user_${userId}`;
    
    const rollbackFn = () => {
      setCompatibleUsers(prev => [...prev, user]);
    };

    optimisticUpdate.createUpdate(optimisticId, null, rollbackFn, {
      onError: (error) => {
        console.error('Error removing user:', error);
        // Restore user on error
        setCompatibleUsers(prev => [...prev, user]);
      }
    });

    // Apply optimistic update immediately
    setCompatibleUsers(prev => prev.filter(u => u.user.id !== userId));
  }, [getUserById, optimisticUpdate]);

  // Get user by ID
  const getUserById = useCallback((userId) => {
    return compatibleUsers.find(item => item.user.id === userId);
  }, [compatibleUsers]);

  return {
    compatibleUsers,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    removeUser,
    getUserById,
    total: compatibleUsers.length
  };
};

export default useCompatibleUsers; 