# Socket.IO Client Implementation

## Overview

This document describes the comprehensive Socket.IO client implementation for the Frende application, providing real-time communication for chat, matches, tasks, and notifications.

## Architecture

### Core Components

1. **SocketManager** (`lib/socket.js`) - Enhanced socket connection manager
2. **useSocket Hook** (`hooks/useSocket.js`) - React hook for socket management
3. **SocketContext** (`contexts/SocketContext.jsx`) - Global socket state provider
4. **Socket Events** (`lib/socketEvents.js`) - Event type definitions and constants
5. **Socket Utils** (`utils/socketUtils.js`) - Utility functions and helpers

## Features

### Connection Management
- **Automatic Reconnection**: Exponential backoff with configurable attempts
- **Connection State Tracking**: Real-time state monitoring (disconnected, connecting, connected, error)
- **Health Monitoring**: Periodic ping/pong for connection health
- **Event Queuing**: Offline event queuing with automatic replay on reconnection

### Event System
- **Type Safety**: Comprehensive event type definitions
- **Event Validation**: Input validation and sanitization
- **Error Handling**: Robust error handling with retry logic
- **Event Categories**: Organized events by functionality (chat, match, task, etc.)

### Real-time Features
- **Chat**: Real-time messaging with typing indicators
- **Matches**: Live match status updates and notifications
- **Tasks**: Task completion and progress tracking
- **Notifications**: Instant notification delivery

## Usage

### Basic Setup

```jsx
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <SocketProvider>
      {/* Your app components */}
    </SocketProvider>
  );
}
```

### Using the useSocket Hook

```jsx
import { useSocket } from './hooks/useSocket';

function ChatComponent() {
  const socket = useSocket();
  
  useEffect(() => {
    if (socket.isConnected) {
      // Join chat room
      socket.joinChatRoom(matchId);
      
      // Listen for messages
      const cleanup = socket.on('new_message', handleNewMessage);
      
      return cleanup;
    }
  }, [socket.isConnected, matchId]);
  
  const sendMessage = (message) => {
    socket.sendMessage(matchId, message);
  };
  
  return (
    <div>
      <div>Status: {socket.connectionState}</div>
      {/* Chat UI */}
    </div>
  );
}
```

### Using SocketContext

```jsx
import { useSocketContext } from './contexts/SocketContext';

function MyComponent() {
  const socket = useSocketContext();
  
  return (
    <div>
      <SocketStatus />
      {/* Component content */}
    </div>
  );
}
```

## Event Types

### Chat Events
- `new_message` - New chat message received
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `user_online` - User came online
- `user_offline` - User went offline
- `messages_read` - Messages marked as read

### Match Events
- `match_status_update` - Match status changed
- `match_expired` - Match expired
- `match_request_received` - New match request
- `match_accepted` - Match accepted
- `match_rejected` - Match rejected

### Task Events
- `task_assigned` - New task assigned
- `task_completed` - Task completed
- `task_expiring` - Task expiring soon
- `task_replaced` - Task replaced
- `task_submission` - Task submission received

### System Events
- `connection_established` - Socket connected
- `error` - Socket error
- `ping` - Health check ping
- `pong` - Health check response

## API Reference

### SocketManager Methods

#### Connection
```javascript
socket.connect(token)           // Connect with authentication token
socket.disconnect()             // Disconnect socket
socket.isConnected()            // Check connection status
socket.getConnectionState()     // Get current connection state
```

#### Events
```javascript
socket.on(event, callback)      // Register event listener
socket.off(event, callback)     // Remove event listener
socket.emit(event, data)        // Emit event
```

#### Chat
```javascript
socket.joinChatRoom(matchId)    // Join chat room
socket.leaveChatRoom(matchId)   // Leave chat room
socket.sendMessage(matchId, message, type)
socket.startTyping(matchId)     // Start typing indicator
socket.stopTyping(matchId)      // Stop typing indicator
socket.markMessagesAsRead(matchId, messageIds)
```

#### Tasks
```javascript
socket.submitTaskCompletion(matchId, taskId, data)
```

### useSocket Hook

#### State
```javascript
const {
  connectionState,    // 'disconnected' | 'connecting' | 'connected' | 'error'
  isConnected,        // boolean
  isConnecting,       // boolean
  isDisconnected,     // boolean
  isError,           // boolean
  canReconnect,      // boolean
  reconnectAttempts, // number
  lastError,         // string | null
  eventQueueLength   // number
} = useSocket();
```

#### Methods
```javascript
const {
  connect,           // (token) => void
  disconnect,        // () => void
  on,               // (event, callback) => cleanup
  off,              // (event, callback) => void
  emit,             // (event, data) => void
  joinChatRoom,     // (matchId) => void
  leaveChatRoom,    // (matchId) => void
  sendMessage,      // (matchId, message, type) => void
  startTyping,      // (matchId) => void
  stopTyping,       // (matchId) => void
  markMessagesAsRead, // (matchId, messageIds) => void
  submitTaskCompletion, // (matchId, taskId, data) => void
  clearError,       // () => void
  cleanup          // () => void
} = useSocket();
```

## Error Handling

### Connection Errors
```javascript
const socket = useSocket();

if (socket.isError) {
  console.log('Connection error:', socket.lastError);
  
  if (socket.canReconnect) {
    // Automatic reconnection will be attempted
  }
}
```

### Event Errors
```javascript
const socket = useSocket();

// Events are automatically validated and sanitized
socket.on('new_message', (data) => {
  // Data is guaranteed to be valid and sanitized
  console.log('New message:', data);
});
```

### Custom Error Handling
```javascript
import { createSafeSocketListener } from './utils/socketUtils';

const socket = useSocket();

const cleanup = createSafeSocketListener(
  socket,
  'custom_event',
  (data) => {
    // Handle event
  },
  {
    validateData: true,
    sanitizeData: true,
    logEvents: true,
    retryOnError: true
  }
);
```

## Performance Optimization

### Event Debouncing
```javascript
import { createSocketEventDebouncer } from './utils/socketUtils';

const debouncedEmit = createSocketEventDebouncer(
  (event, data) => socket.emit(event, data),
  300
);
```

### Event Throttling
```javascript
import { createSocketEventThrottler } from './utils/socketUtils';

const throttledEmit = createSocketEventThrottler(
  (event, data) => socket.emit(event, data),
  10,  // max 10 calls
  1000 // per second
);
```

### Retry Logic
```javascript
import { retrySocketOperation } from './utils/socketUtils';

const result = await retrySocketOperation(
  () => socket.sendMessage(matchId, message),
  3,    // max attempts
  1000  // base delay
);
```

## Debugging

### Socket Debug Component
```jsx
import { SocketDebug } from './contexts/SocketContext';

function App() {
  return (
    <SocketProvider>
      <SocketDebug /> {/* Only shows in development */}
      {/* Your app */}
    </SocketProvider>
  );
}
```

### Manual Debugging
```javascript
import { debugSocket, getSocketStatistics } from './utils/socketUtils';

const socket = useSocket();

// Debug current socket state
debugSocket(socket, true); // verbose mode

// Get detailed statistics
const stats = getSocketStatistics(socket);
console.log('Socket stats:', stats);
```

### Health Check
```javascript
import { checkSocketHealth } from './utils/socketUtils';

const health = checkSocketHealth(socket);

if (!health.isHealthy) {
  console.warn('Socket issues:', health.issues);
}
```

## Testing

### Unit Tests
```javascript
import { renderHook, act } from '@testing-library/react';
import { useSocket } from './hooks/useSocket';

test('should connect when token provided', () => {
  const { result } = renderHook(() => useSocket());
  
  act(() => {
    result.current.connect('test-token');
  });
  
  expect(result.current.isConnecting).toBe(true);
});
```

### Integration Tests
```javascript
// Test real-time event handling
test('should handle new message event', async () => {
  const { result } = renderHook(() => useSocket());
  
  const mockCallback = jest.fn();
  result.current.on('new_message', mockCallback);
  
  // Simulate event
  // Verify callback was called
});
```

## Configuration

### Environment Variables
```env
REACT_APP_WEBSOCKET_URL=ws://localhost:8000
```

### Socket Options
```javascript
// Default configuration in socket.js
{
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: false, // Manual reconnection
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000
}
```

## Best Practices

### 1. Always Clean Up Event Listeners
```javascript
useEffect(() => {
  const cleanup = socket.on('event', handler);
  return cleanup; // Important!
}, []);
```

### 2. Check Connection State
```javascript
if (socket.isConnected) {
  socket.sendMessage(matchId, message);
} else {
  // Handle offline state
}
```

### 3. Use Error Boundaries
```javascript
// Wrap socket-dependent components
<ErrorBoundary>
  <ChatComponent />
</ErrorBoundary>
```

### 4. Handle Offline Scenarios
```javascript
const socket = useSocket();

if (socket.isDisconnected) {
  // Show offline indicator
  // Queue actions for later
}
```

### 5. Validate Event Data
```javascript
import { validateSocketEvent } from './utils/socketUtils';

socket.on('event', (data) => {
  const validation = validateSocketEvent('event', data);
  if (!validation.isValid) {
    console.error('Invalid event data:', validation.errors);
    return;
  }
  // Process valid data
});
```

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check authentication token
   - Verify WebSocket URL
   - Check network connectivity

2. **Events Not Received**
   - Verify event listener registration
   - Check event name spelling
   - Ensure proper cleanup

3. **Memory Leaks**
   - Always return cleanup functions from event listeners
   - Use cleanup on component unmount

4. **Performance Issues**
   - Use event debouncing/throttling
   - Limit event queue size
   - Monitor connection health

### Debug Commands
```javascript
// In browser console
window.socketManager.debugSocket(true);
window.socketManager.getSocketStatistics();
```

## Migration Guide

### From Direct Socket Usage
```javascript
// Old way
import socketManager from './lib/socket';
socketManager.connect(token);

// New way
import { useSocket } from './hooks/useSocket';
const socket = useSocket();
socket.connect(token);
```

### From Global Socket
```javascript
// Old way
window.socketManager.on('event', handler);

// New way
const socket = useSocket();
const cleanup = socket.on('event', handler);
```

## Future Enhancements

1. **WebRTC Integration**: Direct peer-to-peer communication
2. **Message Encryption**: End-to-end encryption for messages
3. **Presence System**: Advanced user presence tracking
4. **Message Sync**: Conflict resolution for offline messages
5. **Performance Monitoring**: Real-time performance metrics
6. **Load Balancing**: Multiple socket server support

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs in browser console
3. Use debug utilities to diagnose issues
4. Check connection health status
5. Verify event listener registration
