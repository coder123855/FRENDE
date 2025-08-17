import { useState, useEffect, useCallback, useRef } from 'react';
import { matchAPI } from '../lib/api';
import { useSocket } from './useSocket';
import { useOptimisticUpdate } from './useOptimisticUpdate';

export const useMatches = () => {
  const socket = useSocket();
  const optimisticUpdate = useOptimisticUpdate({ type: 'immediate' });
  const [matches, setMatches] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [activeMatches, setActiveMatches] = useState([]);
  const [expiredMatches, setExpiredMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Refs for cleanup
  const socketConnected = useRef(false);
  const expirationTimers = useRef(new Map());

  // Initialize socket connection and event listeners
  useEffect(() => {
    if (socket.isConnected && !socketConnected.current) {
      setupSocketListeners();
      socketConnected.current = true;
    }

    return () => {
      cleanupExpirationTimers();
    };
  }, [socket.isConnected]);

  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    const cleanupListeners = [
      socket.on('match_status_update', handleMatchStatusUpdate),
      socket.on('match_expired', handleMatchExpiredFromSocket),
      socket.on('match_request_received', handleMatchRequestReceived),
      socket.on('match_accepted', handleMatchAccepted),
      socket.on('match_rejected', handleMatchRejected)
    ];

    return () => {
      cleanupListeners.forEach(cleanup => cleanup && cleanup());
    };
  }, [socket]);

  // Handle match status update
  const handleMatchStatusUpdate = useCallback((data) => {
    console.log('Match status update received:', data);
    updateMatchStatus(data.match_id, data.status, data);
  }, []);

  // Handle match expired from socket
  const handleMatchExpiredFromSocket = useCallback((data) => {
    console.log('Match expired from socket:', data);
    // We'll call the local handler directly to avoid circular dependency
    updateMatchStatus(data.match_id, 'expired');
    
    // Clear expiration timer
    if (expirationTimers.current.has(data.match_id)) {
      clearTimeout(expirationTimers.current.get(data.match_id));
      expirationTimers.current.delete(data.match_id);
    }
  }, []);

  // Handle new match request
  const handleMatchRequestReceived = useCallback((data) => {
    console.log('New match request received:', data);
    addNewMatch(data);
  }, []);

  // Handle match accepted
  const handleMatchAccepted = useCallback((data) => {
    console.log('Match accepted:', data);
    updateMatchStatus(data.match_id, 'active', data);
  }, []);

  // Handle match rejected
  const handleMatchRejected = useCallback((data) => {
    console.log('Match rejected:', data);
    updateMatchStatus(data.match_id, 'rejected', data);
  }, []);

  // Fetch matches from API
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await matchAPI.getMatches();
      const matchesData = response.data;
      
      setMatches(matchesData);
      
      // Categorize matches
      categorizeMatches(matchesData);
      
      // Set up expiration timers
      setupExpirationTimers(matchesData);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch matches');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Categorize matches by status
  const categorizeMatches = useCallback((matchesData) => {
    const pending = matchesData.filter(match => match.status === 'pending');
    const active = matchesData.filter(match => match.status === 'active');
    const expired = matchesData.filter(match => match.status === 'expired');
    
    setPendingMatches(pending);
    setActiveMatches(active);
    setExpiredMatches(expired);
  }, []);

  // Set up expiration timers for pending matches
  const setupExpirationTimers = useCallback((matchesData) => {
    // Clear existing timers
    cleanupExpirationTimers();
    
    const pendingMatches = matchesData.filter(match => match.status === 'pending');
    
    pendingMatches.forEach(match => {
      if (match.expires_at) {
        const expiresAt = new Date(match.expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry > 0) {
          const timer = setTimeout(() => {
            handleMatchExpired(match.id);
          }, timeUntilExpiry);
          
          expirationTimers.current.set(match.id, timer);
        } else {
          // Match already expired
          handleMatchExpired(match.id);
        }
      }
    });
  }, []);

  // Clean up expiration timers
  const cleanupExpirationTimers = useCallback(() => {
    expirationTimers.current.forEach(timer => clearTimeout(timer));
    expirationTimers.current.clear();
  }, []);

  // Update match status
  const updateMatchStatus = useCallback((matchId, newStatus, data = {}) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, status: newStatus, ...data }
        : match
    ));
    
    // Re-categorize matches
    setMatches(prev => {
      categorizeMatches(prev);
      return prev;
    });
  }, [categorizeMatches]);

  // Handle match expiration
  const handleMatchExpired = useCallback((matchId) => {
    updateMatchStatus(matchId, 'expired');
    
    // Clear expiration timer
    if (expirationTimers.current.has(matchId)) {
      clearTimeout(expirationTimers.current.get(matchId));
      expirationTimers.current.delete(matchId);
    }
  }, [updateMatchStatus]);

  // Add new match
  const addNewMatch = useCallback((matchData) => {
    const newMatch = {
      id: matchData.match_id,
      status: 'pending',
      ...matchData
    };
    
    setMatches(prev => [...prev, newMatch]);
    
    // Re-categorize matches
    setMatches(prev => {
      categorizeMatches(prev);
      return prev;
    });
    
    // Set up expiration timer for new match
    if (newMatch.expires_at) {
      const expiresAt = new Date(newMatch.expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry > 0) {
        const timer = setTimeout(() => {
          handleMatchExpired(newMatch.id);
        }, timeUntilExpiry);
        
        expirationTimers.current.set(newMatch.id, timer);
      }
    }
  }, [categorizeMatches, handleMatchExpired]);

  // Accept match
  const acceptMatch = useCallback(async (matchId) => {
    const match = getMatchById(matchId);
    if (!match) return;

    // Optimistic update
    const optimisticId = `accept_match_${matchId}`;
    const optimisticData = { ...match, status: 'active', _isOptimistic: true };
    
    const rollbackFn = () => {
      updateMatchStatus(matchId, match.status, match);
    };

    optimisticUpdate.createUpdate(optimisticId, optimisticData, rollbackFn, {
      onSuccess: (result) => {
        updateMatchStatus(matchId, 'active', result);
      },
      onError: (error) => {
        const errorMessage = error.message || 'Failed to accept match';
        setError(errorMessage);
        console.error('Error accepting match:', error);
      }
    });

    // Apply optimistic update immediately
    updateMatchStatus(matchId, 'active', optimisticData);

    try {
      const response = await matchAPI.acceptMatch(matchId);
      optimisticUpdate.markSuccess(optimisticId, response.data);
      return response.data;
    } catch (err) {
      optimisticUpdate.markFailure(optimisticId, err);
      throw err;
    }
  }, [updateMatchStatus, getMatchById, optimisticUpdate]);

  // Reject match
  const rejectMatch = useCallback(async (matchId) => {
    const match = getMatchById(matchId);
    if (!match) return;

    // Optimistic update
    const optimisticId = `reject_match_${matchId}`;
    const optimisticData = { ...match, status: 'rejected', _isOptimistic: true };
    
    const rollbackFn = () => {
      updateMatchStatus(matchId, match.status, match);
    };

    optimisticUpdate.createUpdate(optimisticId, optimisticData, rollbackFn, {
      onSuccess: (result) => {
        updateMatchStatus(matchId, 'rejected', result);
      },
      onError: (error) => {
        const errorMessage = error.message || 'Failed to reject match';
        setError(errorMessage);
        console.error('Error rejecting match:', error);
      }
    });

    // Apply optimistic update immediately
    updateMatchStatus(matchId, 'rejected', optimisticData);

    try {
      const response = await matchAPI.rejectMatch(matchId);
      optimisticUpdate.markSuccess(optimisticId, response.data);
      return response.data;
    } catch (err) {
      optimisticUpdate.markFailure(optimisticId, err);
      throw err;
    }
  }, [updateMatchStatus, getMatchById, optimisticUpdate]);

  // Delete match
  const deleteMatch = useCallback(async (matchId) => {
    const match = getMatchById(matchId);
    if (!match) return;

    // Optimistic update
    const optimisticId = `delete_match_${matchId}`;
    
    const rollbackFn = () => {
      // Restore match to state
      setMatches(prev => [...prev, match]);
      categorizeMatches([...matches, match]);
      
      // Restore expiration timer if needed
      if (match.expires_at) {
        const expiresAt = new Date(match.expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry > 0) {
          const timer = setTimeout(() => {
            handleMatchExpired(matchId);
          }, timeUntilExpiry);
          
          expirationTimers.current.set(matchId, timer);
        }
      }
    };

    optimisticUpdate.createUpdate(optimisticId, null, rollbackFn, {
      onSuccess: () => {
        // Clear expiration timer
        if (expirationTimers.current.has(matchId)) {
          clearTimeout(expirationTimers.current.get(matchId));
          expirationTimers.current.delete(matchId);
        }
      },
      onError: (error) => {
        const errorMessage = error.message || 'Failed to delete match';
        setError(errorMessage);
        console.error('Error deleting match:', error);
      }
    });

    // Apply optimistic update immediately
    setMatches(prev => prev.filter(m => m.id !== matchId));
    categorizeMatches(matches.filter(m => m.id !== matchId));

    try {
      await matchAPI.deleteMatch(matchId);
      optimisticUpdate.markSuccess(optimisticId, null);
    } catch (err) {
      optimisticUpdate.markFailure(optimisticId, err);
      throw err;
    }
  }, [categorizeMatches, getMatchById, optimisticUpdate, matches, handleMatchExpired]);

  // Get matches by status
  const getMatchesByStatus = useCallback((status) => {
    switch (status) {
      case 'pending':
        return pendingMatches;
      case 'active':
        return activeMatches;
      case 'expired':
        return expiredMatches;
      default:
        return matches;
    }
  }, [matches, pendingMatches, activeMatches, expiredMatches]);

  // Get match by ID
  const getMatchById = useCallback((matchId) => {
    return matches.find(match => match.id === matchId);
  }, [matches]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set selected status
  const setStatus = useCallback((status) => {
    setSelectedStatus(status);
  }, []);

  // Get match statistics
  const getMatchStats = useCallback(() => {
    return {
      total: matches.length,
      pending: pendingMatches.length,
      active: activeMatches.length,
      expired: expiredMatches.length
    };
  }, [matches.length, pendingMatches.length, activeMatches.length, expiredMatches.length]);

  // Load matches on mount
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    // State
    matches,
    pendingMatches,
    activeMatches,
    expiredMatches,
    loading,
    error,
    selectedStatus,
    
    // Methods
    fetchMatches,
    acceptMatch,
    rejectMatch,
    deleteMatch,
    getMatchesByStatus,
    getMatchById,
    getMatchStats,
    setStatus,
    clearError,
    
    // Socket state
    isConnected: socket.isConnected,
    connectionState: socket.connectionState
  };
}; 