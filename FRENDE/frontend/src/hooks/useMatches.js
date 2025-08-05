import { useState, useEffect, useCallback, useRef } from 'react';
import { matchAPI } from '../lib/api';
import socketClient from '../lib/socket';

export const useMatches = () => {
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

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !socketConnected.current) {
      socketClient.connect(token);
      setupSocketListeners();
      socketConnected.current = true;
    }

    return () => {
      cleanupExpirationTimers();
    };
  }, []);

  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    socketClient.onMatchStatusUpdate((data) => {
      console.log('Match status update received:', data);
      updateMatchStatus(data.match_id, data.status, data);
    });

    socketClient.onMatchExpired((data) => {
      console.log('Match expired:', data);
      handleMatchExpired(data.match_id);
    });

    socketClient.onMatchRequestReceived((data) => {
      console.log('New match request received:', data);
      addNewMatch(data);
    });

    socketClient.onMatchAccepted((data) => {
      console.log('Match accepted:', data);
      updateMatchStatus(data.match_id, 'active', data);
    });

    socketClient.onMatchRejected((data) => {
      console.log('Match rejected:', data);
      updateMatchStatus(data.match_id, 'rejected', data);
    });
  }, []);

  // Fetch matches from API
  const fetchMatches = useCallback(async (status = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await matchAPI.getMatches(status);
      const matchesData = response.data;
      
      setMatches(matchesData);
      
      // Categorize matches by status
      const pending = matchesData.filter(match => match.status === 'pending');
      const active = matchesData.filter(match => match.status === 'active');
      const expired = matchesData.filter(match => match.status === 'expired');
      
      setPendingMatches(pending);
      setActiveMatches(active);
      setExpiredMatches(expired);
      
      // Setup expiration timers for pending matches
      setupExpirationTimers(pending);
      
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.detail || 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup expiration timers for matches
  const setupExpirationTimers = useCallback((matches) => {
    cleanupExpirationTimers();
    
    matches.forEach(match => {
      if (match.status === 'pending' && match.expires_at) {
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

  // Cleanup expiration timers
  const cleanupExpirationTimers = useCallback(() => {
    expirationTimers.current.forEach(timer => clearTimeout(timer));
    expirationTimers.current.clear();
  }, []);

  // Handle match expiration
  const handleMatchExpired = useCallback((matchId) => {
    setMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, status: 'expired' }
          : match
      )
    );
    
    setPendingMatches(prev => prev.filter(match => match.id !== matchId));
    setExpiredMatches(prev => {
      const expiredMatch = matches.find(match => match.id === matchId);
      return expiredMatch ? [...prev, { ...expiredMatch, status: 'expired' }] : prev;
    });
    
    // Clear timer for this match
    const timer = expirationTimers.current.get(matchId);
    if (timer) {
      clearTimeout(timer);
      expirationTimers.current.delete(matchId);
    }
  }, [matches]);

  // Update match status
  const updateMatchStatus = useCallback((matchId, newStatus, matchData = null) => {
    setMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, ...matchData, status: newStatus }
          : match
      )
    );
    
    // Update categorized lists
    if (newStatus === 'pending') {
      setPendingMatches(prev => {
        const existing = prev.find(m => m.id === matchId);
        if (existing) {
          return prev.map(m => m.id === matchId ? { ...m, ...matchData, status: newStatus } : m);
        } else {
          return [...prev, { ...matchData, status: newStatus }];
        }
      });
    } else if (newStatus === 'active') {
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
      setActiveMatches(prev => {
        const existing = prev.find(m => m.id === matchId);
        if (existing) {
          return prev.map(m => m.id === matchId ? { ...m, ...matchData, status: newStatus } : m);
        } else {
          return [...prev, { ...matchData, status: newStatus }];
        }
      });
    } else if (newStatus === 'expired') {
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
      setActiveMatches(prev => prev.filter(m => m.id !== matchId));
      setExpiredMatches(prev => {
        const existing = prev.find(m => m.id === matchId);
        if (existing) {
          return prev.map(m => m.id === matchId ? { ...m, ...matchData, status: newStatus } : m);
        } else {
          return [...prev, { ...matchData, status: newStatus }];
        }
      });
    }
  }, []);

  // Add new match
  const addNewMatch = useCallback((matchData) => {
    setMatches(prev => [...prev, matchData]);
    
    if (matchData.status === 'pending') {
      setPendingMatches(prev => [...prev, matchData]);
      setupExpirationTimers([matchData]);
    }
  }, [setupExpirationTimers]);

  // Accept match
  const acceptMatch = useCallback(async (matchId) => {
    try {
      const response = await matchAPI.acceptMatch(matchId);
      updateMatchStatus(matchId, 'active', response.data);
      return response.data;
    } catch (err) {
      console.error('Error accepting match:', err);
      throw err;
    }
  }, [updateMatchStatus]);

  // Reject match
  const rejectMatch = useCallback(async (matchId) => {
    try {
      const response = await matchAPI.rejectMatch(matchId);
      updateMatchStatus(matchId, 'rejected', response.data);
      return response.data;
    } catch (err) {
      console.error('Error rejecting match:', err);
      throw err;
    }
  }, [updateMatchStatus]);

  // Delete match
  const deleteMatch = useCallback(async (matchId) => {
    try {
      await matchAPI.deleteMatch(matchId);
      setMatches(prev => prev.filter(match => match.id !== matchId));
      setPendingMatches(prev => prev.filter(match => match.id !== matchId));
      setActiveMatches(prev => prev.filter(match => match.id !== matchId));
      setExpiredMatches(prev => prev.filter(match => match.id !== matchId));
    } catch (err) {
      console.error('Error deleting match:', err);
      throw err;
    }
  }, []);

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

  // Calculate time until expiration
  const getTimeUntilExpiry = useCallback((expiresAt) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, total: diff };
  }, []);

  // Check if match is expiring soon (less than 1 hour)
  const isExpiringSoon = useCallback((expiresAt) => {
    const timeUntil = getTimeUntilExpiry(expiresAt);
    return timeUntil && timeUntil.total < 60 * 60 * 1000; // Less than 1 hour
  }, [getTimeUntilExpiry]);

  return {
    // State
    matches,
    pendingMatches,
    activeMatches,
    expiredMatches,
    loading,
    error,
    selectedStatus,
    
    // Actions
    fetchMatches,
    acceptMatch,
    rejectMatch,
    deleteMatch,
    setSelectedStatus,
    
    // Utilities
    getMatchesByStatus,
    getTimeUntilExpiry,
    isExpiringSoon,
    updateMatchStatus,
  };
}; 