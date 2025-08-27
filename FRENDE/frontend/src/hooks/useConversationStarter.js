import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import tokenManager from '../lib/tokenManager';

export const useConversationStarter = (matchId) => {
    const { user } = useAuth();
    const [conversationStarter, setConversationStarter] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeoutCountdown, setTimeoutCountdown] = useState(null);

    // Load conversation starter data
    useEffect(() => {
        if (!user || !matchId) return;
        loadConversationStarter();
    }, [user, matchId]);

    // Set up countdown timer
    useEffect(() => {
        if (!conversationStarter?.timeout_at) return;

        const timeoutDate = new Date(conversationStarter.timeout_at);
        const now = new Date();
        const timeLeft = timeoutDate.getTime() - now.getTime();

        if (timeLeft > 0) {
            const interval = setInterval(() => {
                const currentTime = new Date();
                const remaining = timeoutDate.getTime() - currentTime.getTime();
                
                if (remaining <= 0) {
                    setTimeoutCountdown(null);
                    clearInterval(interval);
                    checkTimeout();
                } else {
                    setTimeoutCountdown(Math.max(0, Math.floor(remaining / 1000)));
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            checkTimeout();
        }
    }, [conversationStarter?.timeout_at]);

    const loadConversationStarter = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/conversation-starter/matches/${matchId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConversationStarter(data);
            } else if (response.status === 404) {
                // No conversation starter assigned yet
                setConversationStarter(null);
            } else {
                throw new Error('Failed to load conversation starter');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading conversation starter:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId]);

    const assignConversationStarter = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/conversation-starter/matches/${matchId}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConversationStarter(data);
                return data;
            } else {
                throw new Error('Failed to assign conversation starter');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error assigning conversation starter:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId]);

    const resetConversationStarter = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/conversation-starter/matches/${matchId}/reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setConversationStarter(null);
                setTimeoutCountdown(null);
                return true;
            } else {
                throw new Error('Failed to reset conversation starter');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error resetting conversation starter:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId]);

    const checkTimeout = useCallback(async () => {
        if (!user || !matchId) return;

        const tokenInfo = tokenManager.getTokenInfo();
        const token = tokenInfo?.accessToken;
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return;
        }

        try {
            const response = await fetch(`/api/conversation-starter/matches/${matchId}/check-timeout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.timed_out) {
                    // Handle timeout - could trigger automatic greeting
                    console.log('Conversation starter timed out');
                    return data;
                }
            }
        } catch (err) {
            console.error('Error checking timeout:', err);
        }
    }, [user, matchId]);

    const markGreetingSent = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return;
        }

        try {
            const response = await fetch(`/api/conversation-starter/matches/${matchId}/mark-greeting-sent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setConversationStarter(prev => prev ? { ...prev, greeting_sent: true } : null);
                return true;
            } else {
                throw new Error('Failed to mark greeting as sent');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error marking greeting as sent:', err);
            throw err;
        }
    }, [user, matchId]);

    const getDefaultGreeting = useCallback(async (userName) => {
        if (!user) return null;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for conversation starter API call');
            return null;
        }

        try {
            const response = await fetch(`/api/conversation-starter/default-greeting?user_name=${encodeURIComponent(userName)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.greeting;
            } else {
                throw new Error('Failed to get default greeting');
            }
        } catch (err) {
            console.error('Error getting default greeting:', err);
            return null;
        }
    }, [user]);

    // Utility functions
    const isCurrentUserStarter = useCallback(() => {
        return conversationStarter?.starter_id === user?.id;
    }, [conversationStarter, user]);

    const isExpired = useCallback(() => {
        return conversationStarter?.is_expired || false;
    }, [conversationStarter]);

    const hasGreetingBeenSent = useCallback(() => {
        return conversationStarter?.greeting_sent || false;
    }, [conversationStarter]);

    const getTimeLeft = useCallback(() => {
        if (!timeoutCountdown) return null;
        
        const minutes = Math.floor(timeoutCountdown / 60);
        const seconds = timeoutCountdown % 60;
        return { minutes, seconds };
    }, [timeoutCountdown]);

    return {
        conversationStarter,
        isLoading,
        error,
        timeoutCountdown,
        isCurrentUserStarter: isCurrentUserStarter(),
        isExpired: isExpired(),
        hasGreetingBeenSent: hasGreetingBeenSent(),
        timeLeft: getTimeLeft(),
        assignConversationStarter,
        resetConversationStarter,
        markGreetingSent,
        getDefaultGreeting,
        reload: loadConversationStarter
    };
}; 