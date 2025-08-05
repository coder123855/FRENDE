# Match Status Tracking and Expiration Logic

## Overview

This implementation provides comprehensive match status tracking and expiration logic for the Frende application. It includes real-time updates, expiration timers, and a complete UI for managing matches.

## Components

### 1. Socket Client (`lib/socket.js`)
- **Purpose**: Manages WebSocket connections for real-time updates
- **Features**:
  - Automatic reconnection with exponential backoff
  - Event listeners for match status updates
  - Chat and typing indicator support
  - Authentication token handling

### 2. useMatches Hook (`hooks/useMatches.js`)
- **Purpose**: Centralized state management for matches
- **Features**:
  - Real-time status updates via WebSocket
  - Automatic expiration timer management
  - Match categorization (pending, active, expired)
  - API integration for CRUD operations
  - Error handling and loading states

### 3. ExpirationTimer Component (`components/ExpirationTimer.jsx`)
- **Purpose**: Displays countdown timers for match expiration
- **Features**:
  - Real-time countdown with hours, minutes, seconds
  - Visual indicators for urgency (pulsing animation)
  - Color-coded badges (green → yellow → red)
  - Automatic expiration handling

### 4. MatchStatusCard Component (`components/MatchStatusCard.jsx`)
- **Purpose**: Individual match display with status and actions
- **Features**:
  - Status badges (Pending, Active, Expired, Rejected)
  - Compatibility score display
  - User profile information
  - Action buttons (Accept, Decline, Delete, Chat)
  - Integration with ExpirationTimer

### 5. MatchManager Component (`components/MatchManager.jsx`)
- **Purpose**: Comprehensive match management interface
- **Features**:
  - Tabbed interface for different match statuses
  - Bulk selection and deletion
  - Match filtering and search
  - Statistics display
  - Error handling and loading states

### 6. NotificationSystem Component (`components/NotificationSystem.jsx`)
- **Purpose**: Real-time notifications for match events
- **Features**:
  - Toast notifications for status changes
  - Expiration warnings
  - New match request alerts
  - Auto-dismiss with configurable duration
  - Type-based styling (success, warning, error, info)

## API Integration

### Match API Endpoints
- `GET /users/me/matches` - Fetch user's matches
- `PUT /matches/{id}/accept` - Accept a match
- `PUT /matches/{id}/reject` - Reject a match
- `DELETE /matches/{id}` - Delete a match

### WebSocket Events
- `match:status_update` - Match status changed
- `match:expired` - Match has expired
- `match:request_received` - New match request
- `match:accepted` - Match was accepted
- `match:rejected` - Match was rejected

## Match Statuses

### 1. Pending
- **Description**: Match request sent, waiting for response
- **Duration**: 24 hours (configurable)
- **Actions**: Accept, Decline, Delete
- **UI**: Clock icon, countdown timer

### 2. Active
- **Description**: Both users accepted, can chat
- **Duration**: Until completion or manual end
- **Actions**: Chat, Delete
- **UI**: Heart icon, chat button

### 3. Expired
- **Description**: Match request expired without response
- **Duration**: Permanent
- **Actions**: Delete only
- **UI**: Alert triangle, red styling

### 4. Rejected
- **Description**: Match was declined
- **Duration**: Permanent
- **Actions**: Delete only
- **UI**: X circle icon

## Expiration Logic

### Timer Management
- **Automatic Setup**: Timers created when matches are fetched
- **Real-time Updates**: Countdown updates every second
- **Cleanup**: Timers automatically cleaned up on component unmount
- **Visual Feedback**: Color changes and animations for urgency

### Expiration Handling
- **Backend**: Automatic cleanup via background tasks
- **Frontend**: Real-time updates via WebSocket
- **UI**: Immediate status change and notification

## Usage Examples

### Basic Match Display
```jsx
import { useMatches } from '../hooks/useMatches';
import MatchStatusCard from '../components/MatchStatusCard';

function MyComponent() {
  const { pendingMatches, acceptMatch, rejectMatch } = useMatches();

  return (
    <div>
      {pendingMatches.map(match => (
        <MatchStatusCard
          key={match.id}
          match={match}
          onAccept={acceptMatch}
          onReject={rejectMatch}
        />
      ))}
    </div>
  );
}
```

### Complete Match Management
```jsx
import MatchManager from '../components/MatchManager';

function App() {
  const handleChat = (matchId) => {
    // Navigate to chat interface
  };

  return (
    <MatchManager onChat={handleChat} />
  );
}
```

## Configuration

### Environment Variables
```env
VITE_API_URL=http://localhost:8000
```

### Socket Configuration
- **Reconnection Attempts**: 5
- **Reconnection Delay**: 1000ms
- **Transports**: WebSocket, polling fallback

### Expiration Settings
- **Pending Match Duration**: 24 hours
- **Warning Threshold**: 1 hour before expiry
- **Critical Warning**: 15 minutes before expiry

## Testing

### Unit Tests
- `MatchStatusCard.test.jsx` - Component rendering and interactions
- Covers all status types and user interactions
- Tests API integration and error handling

### Integration Tests
- WebSocket connection and event handling
- Real-time status updates
- Expiration timer accuracy

## Performance Considerations

### Optimization
- **Memoization**: React.memo for expensive components
- **Debouncing**: API calls and socket events
- **Lazy Loading**: Match lists with pagination
- **Caching**: Match data in localStorage

### Memory Management
- **Timer Cleanup**: Automatic cleanup of expiration timers
- **Socket Cleanup**: Proper disconnection handling
- **Event Listener Cleanup**: Remove listeners on unmount

## Error Handling

### Network Errors
- **Retry Logic**: Exponential backoff for failed requests
- **Offline Support**: Local storage for pending actions
- **User Feedback**: Clear error messages and loading states

### Socket Errors
- **Reconnection**: Automatic reconnection with user notification
- **Fallback**: Polling when WebSocket fails
- **State Sync**: Re-sync data after reconnection

## Future Enhancements

### Planned Features
- **Push Notifications**: Browser notifications for match events
- **Sound Alerts**: Audio notifications for important events
- **Match Analytics**: Detailed statistics and insights
- **Advanced Filtering**: Search and filter by multiple criteria
- **Bulk Operations**: Select and manage multiple matches

### Technical Improvements
- **Service Worker**: Offline support and background sync
- **WebRTC**: Direct peer-to-peer communication
- **Real-time Analytics**: Live match statistics
- **Performance Monitoring**: Track component render times 