import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

// Create context
const SocketContext = createContext();

/**
 * SocketProvider Component
 * 
 * Provides global socket state management and shares socket instance across components.
 * Handles authentication state changes and provides socket utilities to child components.
 */
export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socket = useSocket();
    const socketRef = useRef(null);

    // Store socket instance in ref for global access
    useEffect(() => {
        socketRef.current = socket;
        
        // Make socket available globally for debugging
        if (typeof window !== 'undefined') {
            window.socketManager = socket;
        }
    }, [socket]);

    // Handle authentication state changes
    useEffect(() => {
        if (!user) {
            // User logged out, disconnect socket
            socket.disconnect();
        }
    }, [user, socket]);

    // Provide socket utilities to child components
    const socketUtils = {
        // Connection state
        connectionState: socket.connectionState,
        isConnected: socket.isConnected,
        isConnecting: socket.isConnecting,
        isDisconnected: socket.isDisconnected,
        isError: socket.isError,
        canReconnect: socket.canReconnect,
        reconnectAttempts: socket.reconnectAttempts,
        lastError: socket.lastError,
        eventQueueLength: socket.eventQueueLength,

        // Connection methods
        connect: socket.connect,
        disconnect: socket.disconnect,
        clearError: socket.clearError,

        // Event methods
        on: socket.on,
        off: socket.off,
        emit: socket.emit,

        // Chat methods
        joinChatRoom: socket.joinChatRoom,
        leaveChatRoom: socket.leaveChatRoom,
        sendMessage: socket.sendMessage,
        startTyping: socket.startTyping,
        stopTyping: socket.stopTyping,
        markMessagesAsRead: socket.markMessagesAsRead,

        // Task methods
        submitTaskCompletion: socket.submitTaskCompletion,

        // Utility methods
        getSocketId: socket.getSocketId,
        isUserOnline: socket.isUserOnline,

        // Cleanup
        cleanup: socket.cleanup,

        // Global access
        getSocket: () => socketRef.current
    };

    return (
        <SocketContext.Provider value={socketUtils}>
            {children}
        </SocketContext.Provider>
    );
};

/**
 * useSocketContext Hook
 * 
 * Custom hook to access socket context
 */
export const useSocketContext = () => {
    const context = useContext(SocketContext);
    
    if (!context) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    
    return context;
};

/**
 * withSocket HOC
 * 
 * Higher-order component to inject socket context into components
 */
export const withSocket = (Component) => {
    const WithSocket = (props) => {
        const socket = useSocketContext();
        return <Component {...props} socket={socket} />;
    };

    WithSocket.displayName = `withSocket(${Component.displayName || Component.name})`;
    return WithSocket;
};

/**
 * SocketStatus Component
 * 
 * Displays current socket connection status
 */
export const SocketStatus = () => {
    const { connectionState, isConnected, isConnecting, isError, reconnectAttempts, lastError } = useSocketContext();

    const getStatusColor = () => {
        if (isConnected) return 'text-green-500';
        if (isConnecting) return 'text-yellow-500';
        if (isError) return 'text-red-500';
        return 'text-gray-500';
    };

    const getStatusText = () => {
        if (isConnected) return 'Connected';
        if (isConnecting) return 'Connecting...';
        if (isError) return `Error (${reconnectAttempts}/5)`;
        return 'Disconnected';
    };

    return (
        <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : isError ? 'bg-red-500' : 'bg-gray-500'}`} />
            <span>{getStatusText()}</span>
            {lastError && (
                <span className="text-xs text-red-400" title={lastError}>
                    (Error)
                </span>
            )}
        </div>
    );
};

/**
 * SocketDebug Component
 * 
 * Debug component to display socket information (development only)
 */
export const SocketDebug = () => {
    const socket = useSocketContext();

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-xs">
            <h3 className="font-bold mb-2">Socket Debug</h3>
            <div className="space-y-1">
                <div>State: {socket.connectionState}</div>
                <div>Connected: {socket.isConnected ? 'Yes' : 'No'}</div>
                <div>Connecting: {socket.isConnecting ? 'Yes' : 'No'}</div>
                <div>Reconnect Attempts: {socket.reconnectAttempts}</div>
                <div>Event Queue: {socket.eventQueueLength}</div>
                <div>Socket ID: {socket.getSocketId() || 'None'}</div>
                {socket.lastError && (
                    <div className="text-red-400">Error: {socket.lastError}</div>
                )}
            </div>
        </div>
    );
};

export default SocketContext;
