import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const useTaskHistory = (matchId = null) => {
  const { user } = useAuth();
  const [taskHistory, setTaskHistory] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    difficulty: 'all',
    dateRange: 'all',
    sortBy: 'completed_at',
    sortOrder: 'desc'
  });

  // Fetch task history
  const fetchTaskHistory = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: itemsPerPage.toString(),
        ...filters
      });

      const url = matchId 
        ? `/api/tasks/matches/${matchId}/tasks?${params}`
        : `/api/tasks/history?${params}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (matchId) {
        // For match-specific tasks, filter completed ones
        const completedTasks = data.tasks?.filter(task => task.is_completed) || [];
        setTaskHistory(completedTasks);
        setTotalItems(completedTasks.length);
        setTotalPages(Math.ceil(completedTasks.length / itemsPerPage));
      } else {
        // For general history
        setTaskHistory(data.completed_tasks || []);
        setTotalItems(data.total_completed || 0);
        setTotalPages(Math.ceil((data.total_completed || 0) / itemsPerPage));
      }
    } catch (err) {
      console.error('Error fetching task history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, matchId, currentPage, filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/tasks/statistics', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error('Error fetching task statistics:', err);
    }
  }, [user]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'all',
      difficulty: 'all',
      dateRange: 'all',
      sortBy: 'completed_at',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  }, []);

  // Go to specific page
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Go to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  // Go to previous page
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchTaskHistory();
    fetchStatistics();
  }, [fetchTaskHistory, fetchStatistics]);

  // Filter tasks locally (for client-side filtering)
  const getFilteredTasks = useCallback(() => {
    let filtered = [...taskHistory];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(task => task.category === filters.category);
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(task => task.difficulty === filters.difficulty);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(task => 
        new Date(task.completed_at) >= cutoffDate
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          aValue = difficultyOrder[a.difficulty] || 0;
          bValue = difficultyOrder[b.difficulty] || 0;
          break;
        case 'coins':
          aValue = a.final_coin_reward || 0;
          bValue = b.final_coin_reward || 0;
          break;
        case 'completed_at':
        default:
          aValue = new Date(a.completed_at);
          bValue = new Date(b.completed_at);
          break;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [taskHistory, filters]);

  // Get paginated tasks
  const getPaginatedTasks = useCallback(() => {
    const filtered = getFilteredTasks();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [getFilteredTasks, currentPage]);

  // Calculate completion rate
  const getCompletionRate = useCallback(() => {
    const total = statistics.total_tasks_created || 0;
    const completed = statistics.total_tasks_completed || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [statistics]);

  // Get average completion time
  const getAverageCompletionTime = useCallback(() => {
    const avgTime = statistics.average_completion_time || 0;
    if (avgTime < 1) {
      return `${Math.round(avgTime * 60)} minutes`;
    }
    return `${Math.round(avgTime)} hours`;
  }, [statistics]);

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchTaskHistory();
      fetchStatistics();
    }
  }, [user, fetchTaskHistory, fetchStatistics]);

  // Refetch when dependencies change
  useEffect(() => {
    if (user) {
      fetchTaskHistory();
    }
  }, [fetchTaskHistory]);

  return {
    // Data
    taskHistory,
    statistics,
    filteredTasks: getFilteredTasks(),
    paginatedTasks: getPaginatedTasks(),
    
    // State
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    filters,
    
    // Actions
    updateFilters,
    resetFilters,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    
    // Computed values
    completionRate: getCompletionRate(),
    averageCompletionTime: getAverageCompletionTime(),
    
    // Utilities
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  };
};

export default useTaskHistory; 