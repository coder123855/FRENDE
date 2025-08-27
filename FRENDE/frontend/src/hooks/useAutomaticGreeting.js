import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import tokenManager from '../lib/tokenManager';

export const useAutomaticGreeting = (matchId) => {
    const { user } = useAuth();
    const [greetingStatus, setGreetingStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeoutCountdown, setTimeoutCountdown] = useState(null);
    const timeoutRef = useRef(null);

    // Load greeting status
    useEffect(() => {
        if (!user || !matchId) return;
        loadGreetingStatus();
    }, [user, matchId]);

    // Set up countdown timer for timeout
    useEffect(() => {
        if (!greetingStatus?.timeout_at) return;

        const timeoutDate = new Date(greetingStatus.timeout_at);
        const now = new Date();
        const timeLeft = timeoutDate.getTime() - now.getTime();

        if (timeLeft > 0) {
            const interval = setInterval(() => {
                const currentTime = new Date();
                const remaining = timeoutDate.getTime() - currentTime.getTime();
                
                if (remaining <= 0) {
                    setTimeoutCountdown(null);
                    clearInterval(interval);
                    handleTimeout();
                } else {
                    setTimeoutCountdown(Math.max(0, Math.floor(remaining / 1000)));
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            handleTimeout();
        }
    }, [greetingStatus?.timeout_at]);

    // Cleanup timeout ref on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const loadGreetingStatus = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/automatic-greeting/matches/${matchId}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setGreetingStatus(data);
            } else {
                throw new Error('Failed to load greeting status');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading greeting status:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId]);

    const handleTimeout = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return;
        }

        try {
            // Check if greeting has been sent
            if (greetingStatus?.greeting_sent) {
                return;
            }

            // Send automatic greeting
            const response = await fetch(`/api/automatic-greeting/matches/${matchId}/send-automatic`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Automatic greeting sent:', data);
                
                // Reload status to reflect changes
                await loadGreetingStatus();
                
                // Emit WebSocket event for real-time updates
                if (window.socketManager) {
                    window.socketManager.emit('automatic_greeting_sent', {
                        match_id: matchId,
                        greeting: data.greeting
                    });
                }
            } else {
                throw new Error('Failed to send automatic greeting');
            }
        } catch (err) {
            console.error('Error handling timeout:', err);
            setError(err.message);
        }
    }, [user, matchId, greetingStatus, loadGreetingStatus]);

    const markGreetingSent = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return;
        }

        try {
            const response = await fetch(`/api/automatic-greeting/matches/${matchId}/mark-sent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setGreetingStatus(prev => prev ? { ...prev, greeting_sent: true } : null);
                return true;
            } else {
                throw new Error('Failed to mark greeting as sent');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error marking greeting as sent:', err);
            return false;
        }
    }, [user, matchId]);

    const sendManualGreeting = useCallback(async () => {
        if (!user || !matchId) return;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/automatic-greeting/matches/${matchId}/send-automatic`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Manual greeting sent:', data);
                
                // Reload status
                await loadGreetingStatus();
                
                return data;
            } else {
                throw new Error('Failed to send manual greeting');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error sending manual greeting:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId, loadGreetingStatus]);

    const getDefaultGreeting = useCallback(async (userName, templateId = null) => {
        if (!user) return null;

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return null;
        }

        try {
            const url = new URL(`/api/automatic-greeting/default-greeting/${encodeURIComponent(userName)}`, window.location.origin);
            if (templateId) {
                url.searchParams.set('template_id', templateId);
            }

            const response = await fetch(url.toString(), {
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

    const getGreetingTemplates = useCallback(async () => {
        if (!user) return [];

        const token = tokenManager.getAccessToken();
        
        if (!token) {
            console.error('No token available for automatic greeting API call');
            return [];
        }

        try {
            const response = await fetch('/api/automatic-greeting/templates', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.templates || [];
            } else {
                throw new Error('Failed to get greeting templates');
            }
        } catch (err) {
            console.error('Error getting greeting templates:', err);
            return [];
        }
    }, [user]);

    // Utility functions
    const isExpired = useCallback(() => {
        return greetingStatus?.is_expired || false;
    }, [greetingStatus]);

    const hasGreetingBeenSent = useCallback(() => {
        return greetingStatus?.greeting_sent || false;
    }, [greetingStatus]);

    const isCurrentUserStarter = useCallback(() => {
        return greetingStatus?.conversation_starter_id === user?.id;
    }, [greetingStatus, user]);

    const getTimeLeft = useCallback(() => {
        if (!timeoutCountdown) return null;
        
        const minutes = Math.floor(timeoutCountdown / 60);
        const seconds = timeoutCountdown % 60;
        return { minutes, seconds };
    }, [timeoutCountdown]);

    const formatCountdown = useCallback(() => {
        const timeLeft = getTimeLeft();
        if (!timeLeft) return '';
        
        return `${timeLeft.minutes}:${timeLeft.seconds.toString().padStart(2, '0')}`;
    }, [getTimeLeft]);

    // Listen for WebSocket events
    useEffect(() => {
        if (!window.socketManager) return;

        const handleAutomaticGreetingSent = (data) => {
            if (data.match_id === matchId) {
                console.log('Automatic greeting sent via WebSocket:', data);
                loadGreetingStatus();
            }
        };

        const handleConversationTimeout = (data) => {
            if (data.match_id === matchId) {
                console.log('Conversation timeout via WebSocket:', data);
                loadGreetingStatus();
            }
        };

        window.socketManager.on('automatic_greeting_sent', handleAutomaticGreetingSent);
        window.socketManager.on('conversation_timeout', handleConversationTimeout);

        return () => {
            window.socketManager.off('automatic_greeting_sent', handleAutomaticGreetingSent);
            window.socketManager.off('conversation_timeout', handleConversationTimeout);
        };
    }, [matchId, loadGreetingStatus]);

    return {
        greetingStatus,
        isLoading,
        error,
        timeoutCountdown,
        isExpired: isExpired(),
        hasGreetingBeenSent: hasGreetingBeenSent(),
        isCurrentUserStarter: isCurrentUserStarter(),
        timeLeft: getTimeLeft(),
        countdown: formatCountdown(),
        loadGreetingStatus,
        markGreetingSent,
        sendManualGreeting,
        getDefaultGreeting,
        getGreetingTemplates,
        reload: loadGreetingStatus
    };
}; 