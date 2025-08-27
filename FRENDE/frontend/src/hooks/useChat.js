import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { useOffline } from './useOffline';
import { useOptimisticUpdate } from './useOptimisticUpdate';
import { chatAPI } from '../lib/api';

export const useChat = (matchId) => {
    const { user } = useAuth();
    const socket = useSocket();
    const optimisticUpdate = useOptimisticUpdate({ type: 'immediate' });
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

    // Offline functionality
    const { 
        isOnline, 
        storeChatMessage, 
        getOfflineChatHistory 
    } = useOffline();

    // Initialize chat connection
    useEffect(() => {
        if (!user || !matchId) return;

        // Only connect to socket if online
        if (isOnline && socket.isConnected) {
            // Join chat room
            socket.joinChatRoom(matchId);

            // Set up event listeners
            const cleanupListeners = [
                socket.on('new_message', handleNewMessage),
                socket.on('typing_start', handleUserTyping),
                socket.on('typing_stop', handleUserStoppedTyping),
                socket.on('user_online', handleUserJoined),
                socket.on('user_offline', handleUserLeft),
                socket.on('online_users', handleOnlineUsers),
                socket.on('messages_read', handleMessagesRead),
                socket.on('task_submission', handleTaskSubmission),
                socket.on('connection_established', handleConnectionEstablished),
                socket.on('error', handleError)
            ];

            // Load chat history
            loadChatHistory();
            
            // Load initial room status
            loadRoomStatus();

            return () => {
                // Clean up event listeners
                cleanupListeners.forEach(cleanup => cleanup && cleanup());
                
                // Leave chat room
                socket.leaveChatRoom(matchId);
            };
        } else {
            // Offline mode - load from offline storage
            setIsOfflineMode(true);
            loadOfflineMessages();
        }
    }, [user, matchId, isOnline, socket.isConnected]);

    // Update connection state when socket state changes
    useEffect(() => {
        setIsConnected(socket.isConnected);
        setError(socket.lastError);
    }, [socket.isConnected, socket.lastError]);

    // Handle new message
    const handleNewMessage = useCallback((data) => {
        if (!data || !data.message) return;

        const newMessage = {
            id: data.message_id || Date.now(),
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            message_text: data.message,
            task_id: data.task_id,
            timestamp: data.timestamp || new Date().toISOString(),
            is_read: false
        };

        setMessages(prev => [...prev, newMessage]);
        
        // Save to offline storage
        if (isOfflineMode) {
            storeChatMessage(newMessage);
        }

        // Scroll to bottom
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOfflineMode, storeChatMessage]);

    // Handle user typing
    const handleUserTyping = useCallback((data) => {
        if (!data || !data.user_id) return;

        setTypingUsers(prev => {
            if (!prev.includes(data.user_id)) {
                return [...prev, data.user_id];
            }
            return prev;
        });
    }, []);

    // Handle user stopped typing
    const handleUserStoppedTyping = useCallback((data) => {
        if (!data || !data.user_id) return;

        setTypingUsers(prev => prev.filter(id => id !== data.user_id));
    }, []);

    // Handle user joined
    const handleUserJoined = useCallback((data) => {
        if (!data || !data.user_id) return;

        setOnlineUsers(prev => {
            if (!prev.includes(data.user_id)) {
                return [...prev, data.user_id];
            }
            return prev;
        });
    }, []);

    // Handle user left
    const handleUserLeft = useCallback((data) => {
        if (!data || !data.user_id) return;

        setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
    }, []);

    // Handle online users update
    const handleOnlineUsers = useCallback((data) => {
        if (!data || !Array.isArray(data.users)) return;

        setOnlineUsers(data.users);
    }, []);

    // Handle messages read
    const handleMessagesRead = useCallback((data) => {
        if (!data || !data.message_ids) return;

        setMessages(prev => prev.map(msg => 
            data.message_ids.includes(msg.id) 
                ? { ...msg, is_read: true }
                : msg
        ));
    }, []);

    // Handle task submission
    const handleTaskSubmission = useCallback((data) => {
        if (!data || !data.task_id) return;

        // Handle task submission notification
        console.log('Task submission received:', data);
    }, []);

    // Handle connection established
    const handleConnectionEstablished = useCallback(() => {
        console.log('Chat connection established');
        setIsConnected(true);
        setError(null);
    }, []);

    // Handle error
    const handleError = useCallback((error) => {
        console.error('Chat error:', error);
        setError(error.message || 'Chat connection error');
    }, []);

    // Load chat history
    const loadChatHistory = useCallback(async () => {
        if (!matchId) return;

        try {
            setIsLoading(true);
            setError(null);

            // Make actual API call to load chat history
            const response = await chatAPI.getChatHistory(matchId, page, size);

            if (response.data) {
                setMessages(response.data.messages || []);
                setHasMore(response.data.has_more || false);
                setNextCursor(response.data.next_cursor || null);
                setPrevCursor(response.data.prev_cursor || null);
            } else {
                setMessages([]);
                setHasMore(false);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to load chat history');
            console.error('Error loading chat history:', err);
            // Fallback to empty messages on error
            setMessages([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [matchId, page, size]);

    // Load older messages
    const loadOlderMessages = useCallback(async () => {
        if (!hasMore || isLoadingMore || !nextCursor) return;

        try {
            setIsLoadingMore(true);

            // TODO: Implement API call to load older messages
            // const response = await chatAPI.getChatHistory(matchId, page + 1, size, nextCursor);
            // setMessages(prev => [...response.data.messages, ...prev]);
            // setPage(prev => prev + 1);
            // setHasMore(response.data.has_more);
            // setNextCursor(response.data.next_cursor);

            // For now, just set hasMore to false
            setHasMore(false);
        } catch (err) {
            setError(err.message || 'Failed to load older messages');
            console.error('Error loading older messages:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [matchId, hasMore, isLoadingMore, nextCursor, page, size]);

    // Load room status
    const loadRoomStatus = useCallback(async () => {
        if (!matchId) return;

        try {
            // Make actual API call to load room status
            const response = await chatAPI.getChatStatus(matchId);
            
            if (response.data) {
                setOnlineUsers(response.data.online_users || []);
                // Note: typing users are typically handled via WebSocket, not API
                setTypingUsers([]);
            } else {
                setOnlineUsers([]);
                setTypingUsers([]);
            }
        } catch (err) {
            console.error('Error loading room status:', err);
            // Fallback to empty arrays on error
            setOnlineUsers([]);
            setTypingUsers([]);
        }
    }, [matchId]);

    // Load offline messages
    const loadOfflineMessages = useCallback(async () => {
        try {
            const offlineMsgs = await getOfflineChatHistory(matchId);
            setMessages(offlineMsgs);
        } catch (err) {
            console.error('Error loading offline messages:', err);
            setMessages([]);
        }
    }, [matchId, getOfflineChatHistory]);

    // Send message
    const sendMessage = useCallback(async (message, type = 'text', taskId = null) => {
        if (!message.trim() || !matchId) return;

        const messageData = {
            match_id: matchId,
            message: message.trim(),
            type,
            task_id: taskId
        };

        // Create optimistic message
        const optimisticMessage = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sender_id: user?.id,
            sender_name: user?.name || user?.username,
            message_text: message.trim(),
            task_id: taskId,
            timestamp: new Date().toISOString(),
            is_read: false,
            _isOptimistic: true
        };

        // Optimistic update
        const optimisticId = `send_message_${optimisticMessage.id}`;
        
        const rollbackFn = () => {
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        };

        optimisticUpdate.createUpdate(optimisticId, optimisticMessage, rollbackFn, {
            onSuccess: (result) => {
                // Replace optimistic message with real message
                setMessages(prev => prev.map(msg => 
                    msg.id === optimisticMessage.id ? { ...result, _isOptimistic: false } : msg
                ));
            },
            onError: (error) => {
                setError(error.message || 'Failed to send message');
                console.error('Error sending message:', error);
            }
        });

        // Add optimistic message immediately
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            if (isOnline && socket.isConnected) {
                // Send via socket
                socket.sendMessage(matchId, message.trim(), type);
                optimisticUpdate.markSuccess(optimisticId, optimisticMessage);
            } else {
                // Save to offline storage
                const offlineMessage = {
                    id: Date.now(),
                    sender_id: user?.id,
                    sender_name: user?.name || user?.username,
                    message_text: message.trim(),
                    task_id: taskId,
                    timestamp: new Date().toISOString(),
                    is_read: false
                };

                await storeChatMessage(offlineMessage);
                setMessages(prev => [...prev, offlineMessage]);
            }

            // Clear typing indicator
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        } catch (err) {
            setError(err.message || 'Failed to send message');
            console.error('Error sending message:', err);
        }
    }, [matchId, user, isOnline, socket.isConnected, storeChatMessage]);

    // Handle typing
    const handleTyping = useCallback((isTyping) => {
        if (!matchId || !socket.isConnected) return;

        if (isTyping) {
            socket.startTyping(matchId);
        } else {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                socket.stopTyping(matchId);
            }, 1000);
        }
    }, [matchId, socket.isConnected, socket.startTyping, socket.stopTyping]);

    // Mark messages as read
    const markMessagesAsRead = useCallback(async (messageIds) => {
        if (!messageIds || messageIds.length === 0) return;

        try {
            if (isOnline && socket.isConnected) {
                socket.markMessagesAsRead(matchId, messageIds);
            }

            // Update local state
            setMessages(prev => prev.map(msg => 
                messageIds.includes(msg.id) 
                    ? { ...msg, is_read: true }
                    : msg
            ));
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [matchId, isOnline, socket.isConnected, socket.markMessagesAsRead]);

    // Submit task completion
    const submitTaskCompletion = useCallback(async (taskId, submissionData) => {
        if (!taskId || !matchId) return;

        try {
            if (isOnline && socket.isConnected) {
                socket.submitTaskCompletion(matchId, taskId, submissionData);
            }
        } catch (err) {
            setError(err.message || 'Failed to submit task completion');
            console.error('Error submitting task completion:', err);
        }
    }, [matchId, isOnline, socket.isConnected, socket.submitTaskCompletion]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        messages,
        typingUsers,
        onlineUsers,
        isConnected,
        isLoading,
        error,
        isOfflineMode,
        hasMore,
        isLoadingMore,
        lastMessageRef,

        // Methods
        sendMessage,
        handleTyping,
        markMessagesAsRead,
        submitTaskCompletion,
        loadOlderMessages,
        clearError
    };
}; 