import { useState, useEffect, useCallback, useRef } from 'react';
import socketManager from '../lib/socket';
import { useAuth } from './useAuth';
import { useOfflineMessages, useOfflineState } from './useOffline.js';

export const useChat = (matchId) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [size] = useState(50);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [prevCursor, setPrevCursor] = useState(null);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const typingTimeoutRef = useRef(null);
    const lastMessageRef = useRef(null);

    // Offline hooks
    const { isOnline } = useOfflineState();
    const { 
        messages: offlineMessages, 
        saveMessage: saveMessageOffline, 
        hasOfflineMessages,
        refreshMessages: refreshOfflineMessages 
    } = useOfflineMessages(matchId);

    // Initialize chat connection
    useEffect(() => {
        if (!user || !matchId) return;

        // Only connect to socket if online
        if (isOnline) {
            // Connect to socket if not already connected
            if (!socketManager.isConnected()) {
                socketManager.connect(user.token);
            }

            // Join chat room
            socketManager.joinChatRoom(matchId);

            // Set up event listeners
            socketManager.on('new_message', handleNewMessage);
            socketManager.on('typing_start', handleUserTyping);
            socketManager.on('typing_stop', handleUserStoppedTyping);
            socketManager.on('user_online', handleUserJoined);
            socketManager.on('user_offline', handleUserLeft);
            socketManager.on('online_users', handleOnlineUsers);
            socketManager.on('messages_read', handleMessagesRead);
            socketManager.on('task_submission', handleTaskSubmission);
            socketManager.on('connection_established', handleConnectionEstablished);
            socketManager.on('error', handleError);
        }

        // Load chat history
        loadChatHistory();
        
        // Load initial room status only if online
        if (isOnline) {
            loadRoomStatus();
        }

        return () => {
            if (isOnline) {
                // Clean up event listeners
                socketManager.off('new_message', handleNewMessage);
                socketManager.off('typing_start', handleUserTyping);
                socketManager.off('typing_stop', handleUserStoppedTyping);
                socketManager.off('user_online', handleUserJoined);
                socketManager.off('user_offline', handleUserLeft);
                socketManager.off('online_users', handleOnlineUsers);
                socketManager.off('messages_read', handleMessagesRead);
                socketManager.off('task_submission', handleTaskSubmission);
                socketManager.off('connection_established', handleConnectionEstablished);
                socketManager.off('error', handleError);

                // Leave chat room
                socketManager.leaveChatRoom(matchId);
            }
        };
    }, [user, matchId, isOnline]);

    // Load chat history from API with offline fallback
    const loadChatHistory = useCallback(async () => {
        if (!user || !matchId) return;

        setIsLoading(true);
        setError(null);

        try {
            if (isOnline) {
                // Try online first
                const response = await fetch(`/api/chat/${matchId}/history?page=1&limit=${size}`, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const messagesData = data.messages || [];
                    setMessages(messagesData);
                    setPage(data.page || 1);
                    setHasMore(data.has_more);
                    setNextCursor(data.next_cursor || null);
                    setPrevCursor(data.prev_cursor || null);
                    setIsOfflineMode(false);
                    
                    // Save messages to offline storage
                    for (const message of messagesData) {
                        await saveMessageOffline(message);
                    }
                } else {
                    throw new Error('Failed to load chat history');
                }
            } else {
                // Offline mode - use cached data
                setMessages(offlineMessages);
                setIsOfflineMode(true);
                setError('You are offline. Showing cached messages.');
            }
        } catch (err) {
            console.error('Error loading chat history:', err);
            
            // Fallback to offline data
            if (hasOfflineMessages) {
                setMessages(offlineMessages);
                setIsOfflineMode(true);
                setError('Network error. Showing cached messages.');
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, matchId, isOnline, offlineMessages, saveMessageOffline, hasOfflineMessages]);

    const loadOlderMessages = useCallback(async () => {
        if (!user || !matchId || !hasMore || isLoadingMore) return;
        
        setIsLoadingMore(true);
        
        try {
            if (isOnline) {
                const url = prevCursor
                    ? `/api/chat/${matchId}/history/cursor?limit=${size}&cursor=${encodeURIComponent(prevCursor)}&direction=older`
                    : `/api/chat/${matchId}/history?page=${page + 1}&limit=${size}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    const olderMessages = data.messages || [];
                    setMessages(prev => [...olderMessages, ...prev]);
                    setPage((p) => data.page ? data.page : p + 1);
                    setHasMore(data.has_more);
                    setNextCursor(data.next_cursor || null);
                    setPrevCursor(data.prev_cursor || null);
                    
                    // Save older messages to offline storage
                    for (const message of olderMessages) {
                        await saveMessageOffline(message);
                    }
                }
            } else {
                // In offline mode, we can't load older messages
                setError('Cannot load older messages while offline');
            }
        } catch (err) {
            console.error('Error loading older messages:', err);
            setError('Failed to load older messages');
        } finally {
            setIsLoadingMore(false);
        }
    }, [user, matchId, hasMore, isLoadingMore, size, page, prevCursor, isOnline, saveMessageOffline]);

    // Event handlers
    const handleNewMessage = useCallback((data) => {
        if (data.match_id === matchId) {
            const newMessage = data.message;
            setMessages(prev => [...prev, newMessage]);
            
            // Save to offline storage
            saveMessageOffline(newMessage);
            
            // Mark message as read if it's from another user
            if (newMessage.user_id !== user?.id) {
                markMessagesAsRead([newMessage.id]);
            }
        }
    }, [matchId, user, saveMessageOffline]);

    const handleUserTyping = useCallback((data) => {
        if (data.user_id !== user?.id) {
            setTypingUsers(prev => {
                if (!prev.includes(data.user_id)) {
                    return [...prev, data.user_id];
                }
                return prev;
            });
        }
    }, [user]);

    const handleUserStoppedTyping = useCallback((data) => {
        setTypingUsers(prev => prev.filter(id => id !== data.user_id));
    }, []);

    const handleUserJoined = useCallback((data) => {
        setOnlineUsers(prev => {
            if (!prev.includes(data.user_id)) return [...prev, data.user_id];
            return prev;
        });
    }, []);

    const handleUserLeft = useCallback((data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
    }, []);

    const handleOnlineUsers = useCallback((data) => {
        if (Array.isArray(data.users)) {
            setOnlineUsers(data.users);
        }
    }, []);

    const loadRoomStatus = useCallback(async () => {
        if (!isOnline) return;
        
        try {
            const resp = await fetch(`/api/chat/${matchId}/status`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (resp.ok) {
                const data = await resp.json();
                setOnlineUsers(data.online_users || []);
            }
        } catch (e) {
            console.error('Error loading room status', e);
        }
    }, [matchId, user, isOnline]);

    const handleMessagesRead = useCallback((data) => {
        if (data.match_id === matchId) {
            setMessages(prev => 
                prev.map(msg => 
                    data.message_ids.includes(msg.id) 
                        ? { ...msg, is_read: true, read_at: new Date().toISOString() }
                        : msg
                )
            );
        }
    }, [matchId]);

    const handleTaskSubmission = useCallback((data) => {
        if (data.match_id === matchId) {
            console.log('Task submission received:', data);
            // Handle task submission notification
        }
    }, [matchId]);

    const handleConnectionEstablished = useCallback(() => {
        setIsConnected(true);
    }, []);

    const handleError = useCallback((data) => {
        setError(data.message);
        console.error('Chat error:', data);
    }, []);

    // Chat actions with offline support
    const sendMessage = useCallback(async (messageText, messageType = 'text') => {
        if (!messageText.trim()) return;

        // Create message object
        const message = {
            id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            match_id: matchId,
            user_id: user?.id,
            message_text: messageText,
            message_type: messageType,
            timestamp: new Date().toISOString(),
            is_read: false,
            isOffline: !isOnline
        };

        try {
            if (isOnline && isConnected) {
                // Send via WebSocket for real-time
                socketManager.sendMessage(matchId, messageText, messageType);

                // Also send via REST API for persistence
                const response = await fetch(`/api/chat/${matchId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message_text: messageText,
                        message_type: messageType
                    })
                });

                if (response.ok) {
                    const serverMessage = await response.json();
                    // Update with server response
                    message.id = serverMessage.id;
                    message.isOffline = false;
                } else {
                    throw new Error('Failed to send message');
                }
            } else {
                // Offline mode - save to offline storage
                message.isOffline = true;
                setError('Message saved offline. Will send when connected.');
            }

            // Save to offline storage
            await saveMessageOffline(message);
            
            // Add to local state
            setMessages(prev => [...prev, message]);

        } catch (err) {
            console.error('Error sending message:', err);
            
            // If online failed, save as offline
            if (isOnline) {
                try {
                    message.isOffline = true;
                    await saveMessageOffline(message);
                    setMessages(prev => [...prev, message]);
                    setError('Message saved offline. Will send when connected.');
                } catch (offlineErr) {
                    console.error('Failed to save message offline:', offlineErr);
                    setError('Failed to send message');
                }
            } else {
                setError('Failed to send message');
            }
        }
    }, [matchId, user, isConnected, isOnline, saveMessageOffline]);

    const startTyping = useCallback(() => {
        if (isConnected && isOnline) {
            socketManager.startTyping(matchId);
        }
    }, [matchId, isConnected, isOnline]);

    const stopTyping = useCallback(() => {
        if (isConnected && isOnline) {
            socketManager.stopTyping(matchId);
        }
    }, [matchId, isConnected, isOnline]);

    const markMessagesAsRead = useCallback(async (messageIds) => {
        if (!messageIds.length) return;

        try {
            if (isOnline && isConnected) {
                // Mark via WebSocket for real-time
                socketManager.markMessagesAsRead(matchId, messageIds);

                // Also mark via REST API for persistence
                await fetch(`/api/chat/${matchId}/messages/read`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message_ids: messageIds
                    })
                });
            }

            // Update local state
            setMessages(prev => 
                prev.map(msg => 
                    messageIds.includes(msg.id) 
                        ? { ...msg, is_read: true, read_at: new Date().toISOString() }
                        : msg
                )
            );

            // Update offline storage
            for (const messageId of messageIds) {
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    await saveMessageOffline({
                        ...message,
                        is_read: true,
                        read_at: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [matchId, user, isConnected, isOnline, messages, saveMessageOffline]);

    const submitTaskCompletion = useCallback((taskId, submissionData) => {
        if (isConnected && isOnline) {
            socketManager.submitTaskCompletion(matchId, taskId, submissionData);
        }
    }, [matchId, isConnected, isOnline]);

    // Typing indicator with debounce
    const handleTyping = useCallback(() => {
        startTyping();

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    }, [startTyping, stopTyping]);

    // Clean up typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return {
        messages,
        typingUsers,
        isConnected,
        isLoading,
        error,
        isOfflineMode,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesAsRead,
        submitTaskCompletion,
        handleTyping,
        lastMessageRef,
        reloadHistory: loadChatHistory,
        loadOlderMessages,
        hasMore,
        isLoadingMore
    };
}; 