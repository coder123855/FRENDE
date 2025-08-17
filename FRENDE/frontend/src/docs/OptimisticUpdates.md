# Optimistic Updates System

## Overview

The Optimistic Updates System provides a comprehensive solution for implementing optimistic UI updates in the Frende application. It enables immediate user feedback while handling server communication in the background, with automatic rollback on errors and conflict resolution.

## Architecture

### Core Components

1. **OptimisticUpdateManager** (`lib/optimisticUpdateManager.js`)
   - Centralized management of all optimistic updates
   - Handles registration, success/failure tracking, and rollback operations
   - Provides analytics and conflict resolution

2. **OptimisticContext** (`contexts/OptimisticContext.jsx`)
   - React Context for global optimistic update state
   - Manages pending updates, history, and analytics
   - Provides hooks for components to interact with the system

3. **useOptimisticUpdate Hook** (`hooks/useOptimisticUpdate.js`)
   - React hook for easy optimistic update management
   - Provides various update strategies (immediate, debounced, conditional)
   - Integrates with API calls and provides automatic rollback

4. **UI Components**
   - `OptimisticUpdateIndicator`: Visual feedback for update status
   - `OptimisticButton`: Button with built-in optimistic update support
   - `GlobalOptimisticIndicator`: Global indicator for pending updates

## Features

### 1. Immediate Updates
Updates are applied instantly to the UI, providing immediate feedback to users.

```javascript
const optimisticUpdate = useOptimisticUpdate({ type: 'immediate' });

const handleLike = async (postId) => {
  const optimisticData = { likes: currentLikes + 1 };
  const rollbackFn = () => setLikes(currentLikes);
  
  optimisticUpdate.createUpdate(
    `like_${postId}`,
    optimisticData,
    rollbackFn
  );
  
  // Apply optimistic update immediately
  setLikes(currentLikes + 1);
  
  try {
    await api.likePost(postId);
    optimisticUpdate.markSuccess(`like_${postId}`, { success: true });
  } catch (error) {
    optimisticUpdate.markFailure(`like_${postId}`, error);
  }
};
```

### 2. Debounced Updates
Updates are batched and sent after a delay, reducing server load.

```javascript
const optimisticUpdate = useOptimisticUpdate({ type: 'debounced' });

const handleTyping = (message) => {
  optimisticUpdate.createDebouncedUpdate(
    'typing_indicator',
    { isTyping: true },
    () => setIsTyping(false),
    1000 // 1 second delay
  );
  
  setIsTyping(true);
};
```

### 3. Conditional Updates
Updates are only applied when certain conditions are met.

```javascript
const optimisticUpdate = useOptimisticUpdate();

const handleSave = (data) => {
  optimisticUpdate.createConditionalUpdate(
    'save_draft',
    data,
    rollbackFn,
    () => hasUnsavedChanges // Only update if there are unsaved changes
  );
};
```

### 4. Progressive Updates
Complex updates are broken down into stages with rollback support.

```javascript
const optimisticUpdate = useOptimisticUpdate();

const handleComplexUpdate = async () => {
  const stages = [
    {
      execute: () => api.step1(),
      rollback: (result) => api.rollbackStep1(result)
    },
    {
      execute: () => api.step2(),
      rollback: (result) => api.rollbackStep2(result)
    }
  ];
  
  await optimisticUpdate.createProgressiveUpdate(
    'complex_update',
    stages,
    () => console.log('All stages completed')
  );
};
```

## Usage Examples

### Basic Optimistic Update

```javascript
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';

const MyComponent = () => {
  const optimisticUpdate = useOptimisticUpdate();
  const [data, setData] = useState(initialData);

  const handleUpdate = async (newData) => {
    const optimisticId = `update_${Date.now()}`;
    const rollbackFn = () => setData(initialData);
    
    // Register optimistic update
    optimisticUpdate.createUpdate(optimisticId, newData, rollbackFn);
    
    // Apply optimistic update immediately
    setData(newData);
    
    try {
      const result = await api.updateData(newData);
      optimisticUpdate.markSuccess(optimisticId, result);
    } catch (error) {
      optimisticUpdate.markFailure(optimisticId, error);
    }
  };

  return (
    <div>
      <button onClick={() => handleUpdate({ ...data, status: 'updated' })}>
        Update
      </button>
    </div>
  );
};
```

### Using OptimisticButton Component

```javascript
import OptimisticButton from '../components/OptimisticButton';

const MyComponent = () => {
  const handleLike = async () => {
    await api.likePost(postId);
  };

  return (
    <OptimisticButton
      optimisticId={`like_${postId}`}
      optimisticData={{ likes: currentLikes + 1 }}
      rollbackFn={() => setLikes(currentLikes)}
      onClick={handleLike}
      loadingText="Liking..."
      successText="Liked!"
      errorText="Failed to like"
    >
      Like ({currentLikes})
    </OptimisticButton>
  );
};
```

### Using OptimisticButton with API Integration

```javascript
import { OptimisticActionButton } from '../components/OptimisticButton';

const MyComponent = () => {
  const handleDelete = async () => {
    await api.deleteItem(itemId);
  };

  return (
    <OptimisticActionButton
      action={handleDelete}
      optimisticId={`delete_${itemId}`}
      optimisticData={null}
      rollbackFn={() => setItems([...items, deletedItem])}
      variant="destructive"
    >
      Delete
    </OptimisticActionButton>
  );
};
```

### Chat Message with Optimistic Updates

```javascript
const ChatComponent = () => {
  const optimisticUpdate = useOptimisticUpdate();
  const [messages, setMessages] = useState([]);

  const sendMessage = async (text) => {
    const optimisticMessage = {
      id: `temp_${Date.now()}`,
      text,
      sender: currentUser,
      timestamp: new Date().toISOString(),
      _isOptimistic: true
    };

    const optimisticId = `message_${optimisticMessage.id}`;
    const rollbackFn = () => {
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    };

    optimisticUpdate.createUpdate(optimisticId, optimisticMessage, rollbackFn);
    
    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const result = await api.sendMessage(text);
      optimisticUpdate.markSuccess(optimisticId, result);
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? { ...result, _isOptimistic: false } : msg
      ));
    } catch (error) {
      optimisticUpdate.markFailure(optimisticId, error);
    }
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.id} className={message._isOptimistic ? 'opacity-75' : ''}>
          {message.text}
          {message._isOptimistic && <span>Sending...</span>}
        </div>
      ))}
    </div>
  );
};
```

## Configuration Options

### OptimisticUpdateManager Options

```javascript
const options = {
  type: 'immediate' | 'debounced' | 'conditional',
  timeout: 30000, // Timeout in milliseconds
  retryCount: 3, // Number of retry attempts
  onSuccess: (result) => {}, // Success callback
  onError: (error) => {}, // Error callback
  onConflict: (serverData, optimisticData) => {}, // Conflict callback
  autoRollback: true // Enable automatic rollback
};
```

### Update Types

1. **immediate**: Updates are applied instantly
2. **debounced**: Updates are batched and sent after a delay
3. **conditional**: Updates are only applied when conditions are met

## Conflict Resolution

The system provides three conflict resolution strategies:

1. **server**: Use server data (default)
2. **optimistic**: Use optimistic data
3. **merge**: Merge optimistic and server data

```javascript
const handleConflict = (serverData, optimisticData) => {
  // Custom conflict resolution logic
  const mergedData = { ...serverData, ...optimisticData };
  optimisticUpdate.resolveConflict(updateId, 'merge');
};
```

## Analytics

The system tracks various metrics:

```javascript
const { analytics } = useOptimistic();

console.log(analytics);
// {
//   totalUpdates: 10,
//   successfulUpdates: 8,
//   failedUpdates: 1,
//   rollbacks: 1,
//   conflicts: 0
// }
```

## Error Handling

### Automatic Rollback
When an update fails, the system automatically rolls back to the previous state.

### Manual Error Handling
```javascript
const optimisticUpdate = useOptimisticUpdate({
  onError: (error) => {
    console.error('Update failed:', error);
    // Show user notification
    showNotification('Update failed. Please try again.');
  }
});
```

### Retry Logic
The system automatically retries failed updates with exponential backoff.

## Best Practices

### 1. Use Descriptive IDs
```javascript
// Good
optimisticUpdate.createUpdate(`like_post_${postId}`, data, rollbackFn);

// Bad
optimisticUpdate.createUpdate('update', data, rollbackFn);
```

### 2. Provide Meaningful Rollback Functions
```javascript
const rollbackFn = () => {
  // Restore exact previous state
  setData(previousData);
  setLoading(false);
  setError(null);
};
```

### 3. Handle Edge Cases
```javascript
const handleUpdate = async (newData) => {
  if (!newData || !isValid(newData)) {
    return; // Don't create optimistic update for invalid data
  }
  
  // Create optimistic update
  optimisticUpdate.createUpdate(id, newData, rollbackFn);
};
```

### 4. Use Appropriate Update Types
```javascript
// Use immediate for user actions
const handleClick = () => optimisticUpdate.createUpdate(id, data, rollbackFn);

// Use debounced for typing indicators
const handleTyping = () => optimisticUpdate.createDebouncedUpdate(id, data, rollbackFn, 1000);

// Use conditional for form submissions
const handleSubmit = () => optimisticUpdate.createConditionalUpdate(id, data, rollbackFn, () => isValid);
```

### 5. Provide Visual Feedback
```javascript
const MyComponent = () => {
  const { isPending } = useOptimistic();
  
  return (
    <div>
      <button disabled={isPending('my-update')}>
        {isPending('my-update') ? 'Updating...' : 'Update'}
      </button>
      <OptimisticUpdateIndicator updateId="my-update" />
    </div>
  );
};
```

## Integration with Existing Hooks

The system integrates seamlessly with existing hooks:

### useMatches Hook
```javascript
const { acceptMatch, rejectMatch, deleteMatch } = useMatches();

// All match operations now include optimistic updates
await acceptMatch(matchId); // Optimistic update applied automatically
```

### useChat Hook
```javascript
const { sendMessage } = useChat(matchId);

// Message sending includes optimistic updates
await sendMessage('Hello!'); // Message appears immediately
```

### useCompatibleUsers Hook
```javascript
const { removeUser } = useCompatibleUsers();

// User removal includes optimistic updates
removeUser(userId); // User disappears immediately
```

## Testing

### Unit Tests
```javascript
import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';

test('should create optimistic update', () => {
  const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });
  
  act(() => {
    const updateId = result.current.createUpdate('test', data, rollbackFn);
    expect(updateId).toBeDefined();
  });
});
```

### Integration Tests
```javascript
test('should handle API integration', async () => {
  const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });
  const mockApi = jest.fn().mockResolvedValue({ success: true });
  
  await act(async () => {
    const apiResult = await result.current.createUpdateWithAPI(
      'test',
      data,
      rollbackFn,
      mockApi
    );
    expect(apiResult).toEqual({ success: true });
  });
});
```

## Performance Considerations

1. **Memory Management**: The system automatically cleans up completed updates
2. **Event Listeners**: Use cleanup functions to prevent memory leaks
3. **Batch Updates**: Use debounced updates for frequent operations
4. **Conditional Updates**: Only create updates when necessary

## Troubleshooting

### Common Issues

1. **Updates not appearing**: Check if the optimistic update was registered correctly
2. **Rollback not working**: Ensure the rollback function restores the exact previous state
3. **Conflicts not resolved**: Verify conflict resolution callbacks are provided
4. **Memory leaks**: Make sure to clean up event listeners and timeouts

### Debug Mode
Enable debug mode to see optimistic update information:

```javascript
// In development, the OptimisticDebug component shows update status
import { OptimisticDebug } from '../contexts/OptimisticContext';

function App() {
  return (
    <OptimisticProvider>
      <YourApp />
      <OptimisticDebug /> {/* Only shown in development */}
    </OptimisticProvider>
  );
}
```

## Migration Guide

### From Manual Optimistic Updates
```javascript
// Before
const [data, setData] = useState(initialData);
const [isUpdating, setIsUpdating] = useState(false);

const handleUpdate = async (newData) => {
  setIsUpdating(true);
  setData(newData); // Optimistic update
  
  try {
    await api.updateData(newData);
  } catch (error) {
    setData(initialData); // Manual rollback
  } finally {
    setIsUpdating(false);
  }
};

// After
const optimisticUpdate = useOptimisticUpdate();
const [data, setData] = useState(initialData);

const handleUpdate = async (newData) => {
  const rollbackFn = () => setData(initialData);
  
  optimisticUpdate.createUpdate('update', newData, rollbackFn);
  setData(newData);
  
  try {
    await api.updateData(newData);
    optimisticUpdate.markSuccess('update', { success: true });
  } catch (error) {
    optimisticUpdate.markFailure('update', error);
  }
};
```

This comprehensive optimistic updates system provides a robust foundation for building responsive, user-friendly interfaces while maintaining data consistency and providing excellent error handling.
