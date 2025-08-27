import { useState, useEffect, useCallback, useRef } from 'react';
import socketManager from '../lib/socket';
import tokenManager from '../lib/tokenManager';
import { useAuth } from './useAuth';

/**
 * useSocket Hook
 * 
 * Provides centralized socket connection management with:
 * - Connection state tracking
 * - Event listener registration and cleanup
 * - Automatic reconnection handling
 * - Connection health monitoring
 * - Event queuing for offline scenarios
 */
export const useSocket = () => {
    const { user } = useAuth();
    const [connectionState, setConnectionState] = useState('disconnected');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [lastError, setLastError] = useState(null);
    const [eventQueueLength, setEventQueueLength] = useState(0);
    const [connectionQuality, setConnectionQuality] = useState({
        latency: 0,
        messageCount: 0,
        errorRate: 0,
        lastPing: null
    });
    
    // Refs for cleanup and state management
    const eventListeners = useRef(new Map());
    const connectionCheckInterval = useRef(null);
    const mounted = useRef(true);

    // Initialize socket connection when user is available
    useEffect(() => {
        // Get token from tokenManager instead of user object
        const token = tokenManager.getAccessToken();
        
        console.log('🔌 useSocket: Token:', token ? 'Present' : 'Missing');
        console.log('🔌 useSocket: User:', user);
        
        if (!token) {
            console.log('🔌 useSocket: No token available, disconnecting');
            disconnect();
            return;
        }

        if (!isConnected && !isConnecting) {
            console.log('🔌 useSocket: Connecting to socket with token');
            connect(token);
        }

        return () => {
            mounted.current = false;
            cleanup();
        };
    }, [user, isConnected, isConnecting]);

    // Monitor connection state changes
    useEffect(() => {
        const updateConnectionState = () => {
            if (!mounted.current) return;

            const currentState = socketManager.getConnectionState();
            const currentConnected = socketManager.getIsConnected();
            const currentConnecting = currentState === 'connecting';
            const currentReconnectAttempts = socketManager.getReconnectAttempts();
            const currentEventQueueLength = socketManager.getEventQueueLength();

            setConnectionState(currentState);
            setIsConnected(currentConnected);
            setIsConnecting(currentConnecting);
            setReconnectAttempts(currentReconnectAttempts);
            setEventQueueLength(currentEventQueueLength);
        };

        // Update immediately
        updateConnectionState();

        // Set up interval to monitor connection state
        connectionCheckInterval.current = setInterval(updateConnectionState, 1000);

        return () => {
            if (connectionCheckInterval.current) {
                clearInterval(connectionCheckInterval.current);
                connectionCheckInterval.current = null;
            }
        };
    }, []);

    // Connect to socket
    const connect = useCallback((token) => {
        if (!token) {
            console.warn('No token provided for socket connection');
            return;
        }

        try {
            socketManager.connect(token);
            setLastError(null);
        } catch (error) {
            console.error('Failed to connect to socket:', error);
            setLastError(error.message);
        }
    }, []);

    // Disconnect from socket
    const disconnect = useCallback(() => {
        socketManager.disconnect();
        setLastError(null);
    }, []);

    // Register event listener
    const on = useCallback((event, callback) => {
        if (!event || typeof callback !== 'function') {
            console.warn('Invalid event or callback provided to useSocket.on');
            return;
        }

        // Store listener for cleanup
        if (!eventListeners.current.has(event)) {
            eventListeners.current.set(event, new Set());
        }
        eventListeners.current.get(event).add(callback);

        // Register with socket manager
        socketManager.on(event, callback);

        return () => {
            // Remove from socket manager
            socketManager.off(event, callback);
            
            // Remove from stored listeners
            const listeners = eventListeners.current.get(event);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    eventListeners.current.delete(event);
                }
            }
        };
    }, []);

    // Remove event listener
    const off = useCallback((event, callback) => {
        if (!event) {
            console.warn('No event provided to useSocket.off');
            return;
        }

        if (callback) {
            // Remove specific callback
            socketManager.off(event, callback);
            
            const listeners = eventListeners.current.get(event);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    eventListeners.current.delete(event);
                }
            }
        } else {
            // Remove all listeners for this event
            const listeners = eventListeners.current.get(event);
            if (listeners) {
                listeners.forEach(cb => socketManager.off(event, cb));
                eventListeners.current.delete(event);
            }
        }
    }, []);

    // Emit event
    const emit = useCallback((event, data) => {
        if (!event) {
            console.warn('No event provided to useSocket.emit');
            return;
        }

        try {
            socketManager.emit(event, data);
        } catch (error) {
            console.error('Failed to emit socket event:', error);
            setLastError(error.message);
        }
    }, []);

    // Join chat room
    const joinChatRoom = useCallback((matchId) => {
        if (!matchId) {
            console.warn('No matchId provided to joinChatRoom');
            return;
        }

        try {
            socketManager.joinChatRoom(matchId);
        } catch (error) {
            console.error('Failed to join chat room:', error);
            setLastError(error.message);
        }
    }, []);

    // Leave chat room
    const leaveChatRoom = useCallback((matchId) => {
        if (!matchId) {
            console.warn('No matchId provided to leaveChatRoom');
            return;
        }

        try {
            socketManager.leaveChatRoom(matchId);
        } catch (error) {
            console.error('Failed to leave chat room:', error);
            setLastError(error.message);
        }
    }, []);

    // Send message
    const sendMessage = useCallback(async (matchId, message, type = 'text') => {
        if (!matchId || !message) {
            console.warn('Invalid parameters provided to sendMessage');
            return;
        }

        try {
            const result = await socketManager.sendMessage(matchId, message, type);
            return result;
        } catch (error) {
            console.error('Failed to send message:', error);
            setLastError(error.message);
            throw error;
        }
    }, []);

    // Start typing indicator
    const startTyping = useCallback((matchId) => {
        if (!matchId) {
            console.warn('No matchId provided to startTyping');
            return;
        }

        try {
            socketManager.startTyping(matchId);
        } catch (error) {
            console.error('Failed to start typing:', error);
            setLastError(error.message);
        }
    }, []);

    // Stop typing indicator
    const stopTyping = useCallback((matchId) => {
        if (!matchId) {
            console.warn('No matchId provided to stopTyping');
            return;
        }

        try {
            socketManager.stopTyping(matchId);
        } catch (error) {
            console.error('Failed to stop typing:', error);
            setLastError(error.message);
        }
    }, []);

    // Mark messages as read
    const markMessagesAsRead = useCallback((matchId, messageIds) => {
        if (!matchId || !messageIds) {
            console.warn('Invalid parameters provided to markMessagesAsRead');
            return;
        }

        try {
            socketManager.markMessagesAsRead(matchId, messageIds);
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
            setLastError(error.message);
        }
    }, []);

    // Submit task completion
    const submitTaskCompletion = useCallback((matchId, taskId, submissionData) => {
        if (!matchId || !taskId) {
            console.warn('Invalid parameters provided to submitTaskCompletion');
            return;
        }

        try {
            socketManager.submitTaskCompletion(matchId, taskId, submissionData);
        } catch (error) {
            console.error('Failed to submit task completion:', error);
            setLastError(error.message);
        }
    }, []);

    // Get socket ID
    const getSocketId = useCallback(() => {
        return socketManager.getSocketId();
    }, []);

    // Check if user is online
    const isUserOnline = useCallback((userId) => {
        // This would need to be implemented in the socket manager
        // For now, return true if we're connected
        return isConnected;
    }, [isConnected]);

    // Clear error
    const clearError = useCallback(() => {
        setLastError(null);
    }, []);

    // Add ping/pong monitoring
    useEffect(() => {
        if (!isConnected) return;
        
        const pingInterval = setInterval(() => {
            const startTime = Date.now();
            
            socketManager.emit('ping', { timestamp: startTime });
            
            // Listen for pong
            const pongHandler = (data) => {
                const latency = Date.now() - data.timestamp;
                setConnectionQuality(prev => ({
                    ...prev,
                    latency,
                    lastPing: new Date().toISOString()
                }));
            };
            
            socketManager.on('pong', pongHandler);
            
            // Cleanup pong listener after 5 seconds
            setTimeout(() => {
                socketManager.off('pong', pongHandler);
            }, 5000);
            
        }, 30000); // Ping every 30 seconds
        
        return () => clearInterval(pingInterval);
    }, [isConnected]);

    // Cleanup function
    const cleanup = useCallback(() => {
        // Remove all event listeners
        eventListeners.current.forEach((listeners, event) => {
            listeners.forEach(callback => {
                socketManager.off(event, callback);
            });
        });
        eventListeners.current.clear();

        // Clear interval
        if (connectionCheckInterval.current) {
            clearInterval(connectionCheckInterval.current);
            connectionCheckInterval.current = null;
        }
    }, []);

    // Connection state helpers
    const isDisconnected = connectionState === 'disconnected';
    const isError = connectionState === 'error';
    const canReconnect = isError && reconnectAttempts < 5;

    return {
        // Connection state
        connectionState,
        isConnected,
        isConnecting,
        isDisconnected,
        isError,
        canReconnect,
        reconnectAttempts,
        lastError,
        eventQueueLength,
        connectionQuality,

        // Connection methods
        connect,
        disconnect,
        clearError,

        // Event methods
        on,
        off,
        emit,

        // Chat methods
        joinChatRoom,
        leaveChatRoom,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesAsRead,

        // Task methods
        submitTaskCompletion,

        // Utility methods
        getSocketId,
        isUserOnline,

        // Cleanup
        cleanup
    };
};
