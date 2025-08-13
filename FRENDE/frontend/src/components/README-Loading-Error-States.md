# Loading States and Error Boundaries Implementation

This document describes the comprehensive loading states and error boundaries system implemented for the Frende application.

## Overview

The implementation provides:
- **Global Error Boundaries**: Catch unhandled JavaScript errors
- **Route-Level Error Boundaries**: Handle errors specific to different route types
- **Component-Level Error Boundaries**: Graceful degradation for individual components
- **Loading States**: Consistent loading indicators across the application
- **Error Recovery**: User-friendly error handling with recovery options
- **Offline Detection**: Real-time network status monitoring

## File Structure

```
src/
├── components/
│   ├── error-boundaries/
│   │   ├── ErrorBoundary.jsx          # Global error boundary
│   │   ├── RouteErrorBoundary.jsx     # Route-specific error boundary
│   │   └── ComponentErrorBoundary.jsx # Component-level error boundary
│   ├── loading/
│   │   ├── LoadingSpinner.jsx         # Reusable spinner component
│   │   ├── LoadingSkeleton.jsx        # Skeleton loading patterns
│   │   ├── LoadingOverlay.jsx         # Full-screen loading overlay
│   │   ├── TaskLoadingSkeleton.jsx    # Task-specific skeleton
│   │   ├── ChatLoadingSkeleton.jsx    # Chat-specific skeleton
│   │   ├── ProfileLoadingSkeleton.jsx # Profile-specific skeleton
│   │   └── MatchingLoadingSkeleton.jsx # Matching-specific skeleton
│   └── error-states/
│       ├── ErrorDisplay.jsx           # Standardized error display
│       ├── RetryButton.jsx            # Retry functionality
│       ├── ErrorFallback.jsx          # Error fallback UI
│       ├── ErrorRecovery.jsx          # Recovery options
│       └── OfflineIndicator.jsx       # Offline status indicator
├── contexts/
│   └── LoadingContext.jsx             # Global loading state management
├── hooks/
│   ├── useLoading.js                  # Loading state hooks
│   └── useErrorBoundary.js            # Error boundary hooks
└── utils/
    └── errorUtils.js                  # Error utility functions
```

## Error Boundaries

### 1. Global Error Boundary (`ErrorBoundary.jsx`)

Catches unhandled JavaScript errors throughout the application.

**Features:**
- Generates unique error IDs for tracking
- Provides error reporting functionality
- Shows development error details in debug mode
- Offers retry, go home, and report error options

**Usage:**
```jsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### 2. Route Error Boundary (`RouteErrorBoundary.jsx`)

Handles errors specific to different route types (auth, protected, public).

**Route Types:**
- `auth`: Authentication-related errors
- `protected`: Protected route errors
- `public`: Public page errors

**Usage:**
```jsx
<RouteErrorBoundary routeType="protected">
  <ProtectedComponent />
</RouteErrorBoundary>
```

### 3. Component Error Boundary (`ComponentErrorBoundary.jsx`)

Provides graceful degradation for individual components.

**Features:**
- Custom fallback components
- Higher-order component wrapper
- Component-specific error handling

**Usage:**
```jsx
// Direct usage
<ComponentErrorBoundary componentName="UserCard">
  <UserCard user={user} />
</ComponentErrorBoundary>

// HOC usage
const SafeUserCard = withErrorBoundary(UserCard, {
  componentName: 'UserCard',
  fallback: (props) => <div>User card unavailable</div>
});
```

## Loading States

### 1. Loading Context (`LoadingContext.jsx`)

Global loading state management with support for multiple concurrent loading states.

**Features:**
- Multiple loading states with unique keys
- Loading messages and timestamps
- Global loading state overview
- Automatic cleanup

**Usage:**
```jsx
// Wrap your app
<LoadingProvider>
  <YourApp />
</LoadingProvider>

// Use in components
const { isLoading, startLoading, stopLoading, withLoading } = useLoadingState('tasks');
```

### 2. Loading Components

#### LoadingSpinner
Reusable spinner with customizable size and color.

```jsx
<LoadingSpinner size="lg" color="blue" text="Loading..." showText={true} />
```

#### LoadingSkeleton
Skeleton loading patterns for different content types.

```jsx
<LoadingSkeleton type="card" lines={3} />
<LoadingSkeleton type="avatar" />
<LoadingSkeleton type="list" lines={5} />
```

#### Content-Specific Skeletons
- `TaskLoadingSkeleton`: Task card layouts
- `ChatLoadingSkeleton`: Chat message layouts
- `ProfileLoadingSkeleton`: Profile content layouts
- `MatchingLoadingSkeleton`: User card layouts

### 3. Loading Overlay
Full-screen loading overlay for blocking operations.

```jsx
<LoadingOverlay isLoading={true} text="Processing..." />
```

## Error States

### 1. Error Display (`ErrorDisplay.jsx`)

Standardized error message display with different types.

**Error Types:**
- `error`: Red styling for critical errors
- `warning`: Yellow styling for warnings
- `info`: Blue styling for information

```jsx
<ErrorDisplay
  error={error}
  type="error"
  title="Custom Title"
  message="Custom message"
  showDetails={true}
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>
```

### 2. Retry Button (`RetryButton.jsx`)

Standardized retry functionality with loading state.

```jsx
<RetryButton onRetry={handleRetry} loadingText="Retrying...">
  Try Again
</RetryButton>
```

### 3. Error Fallback (`ErrorFallback.jsx`)

Comprehensive error fallback with recovery options.

**Error Types:**
- `network`: Network connectivity issues
- `server`: Server-side errors
- `auth`: Authentication errors
- `notFound`: 404 errors

```jsx
<ErrorFallback
  error={error}
  errorType="network"
  onRetry={handleRetry}
  onGoHome={handleGoHome}
  onGoBack={handleGoBack}
/>
```

### 4. Error Recovery (`ErrorRecovery.jsx`)

Advanced error recovery with multiple options.

```jsx
<ErrorRecovery
  error={error}
  errorType="auth"
  onRetry={handleRetry}
  onReset={handleReset}
  onContactSupport={handleContactSupport}
/>
```

### 5. Offline Indicator (`OfflineIndicator.jsx`)

Real-time network status monitoring.

```jsx
// Banner mode
<OfflineIndicator showBanner={true} />

// Badge mode
<OfflineIndicator showBadge={true} />

// Custom mode
<OfflineIndicator 
  onOnline={handleOnline}
  onOffline={handleOffline}
/>
```

## Hooks

### 1. Loading Hooks (`useLoading.js`)

#### useLoading
Access to global loading context.

```jsx
const { 
  loadingStates, 
  setLoading, 
  clearLoading, 
  isLoading, 
  getLoadingMessage 
} = useLoading();
```

#### useLoadingState
Manage loading state for a specific key.

```jsx
const { 
  isLoading, 
  message, 
  startLoading, 
  stopLoading, 
  withLoading 
} = useLoadingState('tasks');
```

#### useLoadingWithRetry
Loading with automatic retry functionality.

```jsx
const { 
  isLoading, 
  retryCount, 
  lastError, 
  executeWithRetry 
} = useLoadingWithRetry('api-call', 3);
```

#### useLoadingWithTimeout
Loading with timeout handling.

```jsx
const { 
  isLoading, 
  isTimedOut, 
  executeWithTimeout 
} = useLoadingWithTimeout('api-call', 30000);
```

### 2. Error Boundary Hooks (`useErrorBoundary.js`)

#### useErrorBoundary
Error boundary state management.

```jsx
const { 
  error, 
  errorInfo, 
  handleError, 
  clearError, 
  reportError 
} = useErrorBoundary();
```

#### useErrorHandler
General error handling.

```jsx
const { 
  errors, 
  addError, 
  removeError, 
  clearErrors, 
  getErrors 
} = useErrorHandler();
```

#### useNetworkErrorHandler
Network-specific error handling.

```jsx
const { 
  isOnline, 
  networkErrors, 
  addNetworkError, 
  retryFailedRequests 
} = useNetworkErrorHandler();
```

## Utility Functions (`errorUtils.js`)

### Error Classification
- `isNetworkError(error)`: Check if error is network-related
- `isAuthError(error)`: Check if error is authentication-related
- `isServerError(error)`: Check if error is server-related
- `getErrorType(error)`: Get error type classification

### Error Formatting
- `formatError(error)`: Format error for user display
- `createErrorBoundary(error, errorInfo)`: Create error boundary data
- `logError(error, context)`: Log error with context

### Error Handling
- `retryWithBackoff(fn, maxRetries, baseDelay)`: Retry with exponential backoff
- `withErrorHandling(fn, errorHandler)`: Wrap function with error handling
- `createErrorHandler(options)`: Create custom error handler

## Integration Examples

### 1. Component with Loading and Error States

```jsx
import React from 'react';
import { useLoadingState } from '../hooks/useLoading';
import { withErrorBoundary } from '../components/error-boundaries/ComponentErrorBoundary';
import TaskLoadingSkeleton from '../components/loading/TaskLoadingSkeleton';
import ErrorFallback from '../components/error-states/ErrorFallback';

const TaskList = ({ matchId }) => {
  const { isLoading, error, tasks, refreshTasks } = useTasks(matchId);
  const { withLoading } = useLoadingState('tasks');

  const handleRefresh = () => {
    withLoading(refreshTasks, 'Refreshing tasks...');
  };

  if (isLoading) {
    return <TaskLoadingSkeleton count={3} />;
  }

  if (error) {
    return (
      <ErrorFallback
        error={{ message: error }}
        errorType="general"
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};

export default withErrorBoundary(TaskList, {
  componentName: 'TaskList',
  errorMessage: 'Failed to load task list'
});
```

### 2. API Call with Error Handling

```jsx
import { useLoadingWithRetry } from '../hooks/useLoading';
import { withErrorHandling } from '../utils/errorUtils';

const useTaskAPI = () => {
  const { executeWithRetry } = useLoadingWithRetry('task-api', 3);

  const createTask = withErrorHandling(async (taskData) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  });

  return { createTask };
};
```

## Testing

### Error Boundary Testing

Visit `/test-error` to test error boundaries:

```jsx
// Test component that throws an error
const TestErrorBoundary = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }

  return (
    <Button onClick={() => setShouldThrow(true)}>
      Throw Error
    </Button>
  );
};
```

### Loading State Testing

```jsx
// Test loading states
const { startLoading, stopLoading } = useLoadingState('test');

// Simulate loading
startLoading('Loading test data...');
setTimeout(() => stopLoading(), 2000);
```

## Best Practices

1. **Always wrap components with error boundaries** for graceful error handling
2. **Use loading states for all async operations** to provide user feedback
3. **Provide meaningful error messages** that help users understand and recover
4. **Implement retry mechanisms** for transient errors
5. **Log errors appropriately** for debugging and monitoring
6. **Test error scenarios** to ensure proper error handling
7. **Use skeleton loading** for better perceived performance
8. **Handle offline states** to maintain app functionality

## Future Enhancements

1. **Error Reporting Integration**: Connect to services like Sentry
2. **Performance Monitoring**: Track loading times and error rates
3. **Advanced Retry Logic**: Implement circuit breakers and backoff strategies
4. **Error Analytics**: Collect error metrics for improvement
5. **Progressive Error Handling**: Different error handling based on user context
6. **Automated Error Recovery**: Self-healing mechanisms for common errors
