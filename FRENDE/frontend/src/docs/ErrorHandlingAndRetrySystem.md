# Error Handling and Retry System Documentation

## Overview

The Frende application implements a comprehensive error handling and retry system that provides robust error management, automatic recovery, and enhanced user experience. This system is designed to handle various types of errors gracefully while providing users with clear feedback and recovery options.

## Architecture

### Core Components

1. **Global Error Handler** (`globalErrorHandler.js`)
   - Catches unhandled errors and promise rejections
   - Categorizes errors by type and severity
   - Provides rate limiting and error deduplication
   - Dispatches error events for UI handling

2. **Error Reporting Service** (`errorReportingService.js`)
   - Centralized error reporting and analytics
   - Deduplicates errors to prevent spam
   - Collects user context for better error tracking
   - Provides error statistics and monitoring

3. **Retry Manager** (`retryManager.js`)
   - Implements circuit breaker pattern
   - Provides multiple retry strategies
   - Manages endpoint-specific retry configurations
   - Handles automatic recovery for different error types

4. **Error Recovery Service** (`errorRecoveryService.js`)
   - Provides automatic error recovery strategies
   - Handles authentication, network, and session errors
   - Implements recovery queues and retry logic
   - Manages user context during recovery

5. **Error Context Provider** (`ErrorContext.jsx`)
   - React context for global error state management
   - Provides error notifications and recovery actions
   - Manages error statistics and user feedback

## Error Categories

The system categorizes errors into the following types:

- **Network**: Connection issues, timeouts, fetch failures
- **Authentication**: Token expiration, unauthorized access
- **Validation**: Invalid input, format errors
- **Server**: 5xx errors, internal server issues
- **Client**: Resource loading failures, client-side errors
- **Unknown**: Unclassified errors

## Error Severity Levels

- **Critical**: Authentication failures, fatal errors
- **High**: Server errors, network failures
- **Medium**: Validation errors, resource failures
- **Low**: Warnings, informational messages

## Retry Strategies

### Available Strategies

1. **Exponential Backoff** (Default)
   - Delay increases exponentially: 1s, 2s, 4s, 8s...
   - Best for transient failures
   - Includes jitter to prevent thundering herd

2. **Linear Backoff**
   - Delay increases linearly: 1s, 2s, 3s, 4s...
   - Good for predictable failure patterns
   - More aggressive than exponential

3. **Constant Backoff**
   - Fixed delay between retries
   - Useful for rate limiting scenarios
   - Predictable retry behavior

4. **Fibonacci Backoff**
   - Delay follows Fibonacci sequence: 1s, 1s, 2s, 3s, 5s...
   - Balanced approach between exponential and linear
   - Good for mixed failure patterns

### Circuit Breaker Pattern

The retry manager implements a circuit breaker pattern with three states:

1. **Closed** (Normal Operation)
   - Requests are allowed through
   - Failures are counted
   - Opens when failure threshold is reached

2. **Open** (Failing)
   - All requests are rejected immediately
   - Prevents cascading failures
   - Transitions to half-open after recovery timeout

3. **Half-Open** (Testing)
   - Limited requests are allowed
   - Successes close the circuit breaker
   - Failures reopen the circuit breaker

## Configuration

### Default Retry Configurations

```javascript
// Authentication endpoints - minimal retries
auth: {
  maxRetries: 1,
  baseDelay: 500,
  maxDelay: 2000,
  strategy: 'constant_backoff',
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    halfOpenMaxRequests: 2
  }
}

// Chat endpoints - aggressive retries for real-time features
chat: {
  maxRetries: 5,
  baseDelay: 500,
  maxDelay: 15000,
  strategy: 'exponential_backoff',
  circuitBreaker: {
    failureThreshold: 10,
    recoveryTimeout: 30000,
    halfOpenMaxRequests: 5
  }
}

// User profile endpoints - moderate retries
user: {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 10000,
  strategy: 'exponential_backoff',
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    halfOpenMaxRequests: 3
  }
}
```

### Custom Configuration

```javascript
import { retryConfigManager } from '../lib/retryConfig';

// Configure specific endpoint
retryConfigManager.setCustomConfig('/api/custom', {
  maxRetries: 3,
  baseDelay: 1000,
  strategy: 'exponential_backoff',
  retryableErrors: ['network', 'server'],
  nonRetryableErrors: ['authentication', 'validation']
});

// Set global configuration
retryConfigManager.setGlobalConfig({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
});
```

## Usage

### Basic Error Handling

```javascript
import { useError } from '../contexts/ErrorContext';

function MyComponent() {
  const { notifications, dismissNotification } = useError();

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          <button onClick={() => dismissNotification(notification.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Enhanced API Hook Usage

```javascript
import { useApi } from '../hooks/useApi';

function UserProfile() {
  const { data, loading, error, execute } = useApi('/api/users/profile', {
    useRetryManager: true, // Enable advanced retry management
    onError: (error) => {
      console.log('API error:', error);
    }
  });

  // The hook automatically handles retries and circuit breaker logic
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>Profile: {data.name}</p>}
    </div>
  );
}
```

### Manual Error Recovery

```javascript
import { errorRecoveryService } from '../lib/errorRecoveryService';

async function handleError(error) {
  const context = {
    originalRequest: {
      url: '/api/data',
      options: { method: 'GET' }
    }
  };

  const recovered = await errorRecoveryService.attemptRecovery(error, context);
  
  if (recovered) {
    console.log('Error recovered successfully');
  } else {
    console.log('Recovery failed, showing error to user');
  }
}
```

### Error Reporting

```javascript
import { errorReportingService } from '../lib/errorReportingService';

// Report custom error
errorReportingService.reportError({
  type: 'custom',
  message: 'User action failed',
  category: 'validation',
  severity: 'medium',
  timestamp: new Date().toISOString()
});

// Get error analytics
const analytics = errorReportingService.getErrorAnalytics();
console.log('Error stats:', analytics);
```

## Error Recovery Strategies

### Authentication Recovery

1. **Token Refresh**: Automatically attempts to refresh expired tokens
2. **Session Recovery**: Clears invalid session data and redirects to login
3. **Re-authentication**: Prompts user to log in again if refresh fails

### Network Recovery

1. **Connection Monitoring**: Waits for network connection to be restored
2. **Circuit Breaker Reset**: Resets circuit breakers for network-related endpoints
3. **Request Retry**: Retries failed requests with appropriate backoff

### Server Recovery

1. **Graceful Degradation**: Shows cached data or fallback content
2. **Service Health Check**: Monitors server health and retries when available
3. **User Notification**: Informs users of server issues and expected resolution time

## User Experience Features

### Error Notifications

- **Toast Notifications**: Non-intrusive error messages
- **Action Buttons**: Retry, report, or dismiss options
- **Auto-dismiss**: Low-severity errors auto-dismiss after 5 seconds
- **Severity-based Styling**: Color-coded notifications by severity

### Error Reporting Modal

- **User-friendly Interface**: Simple form for error reporting
- **Context Collection**: Automatic system information gathering
- **Screenshot Support**: Optional screenshot capture for visual context
- **Email Collection**: Optional user contact for follow-up

### Global Error Handling

- **Unhandled Error Catching**: Catches all unhandled errors and promise rejections
- **Resource Error Monitoring**: Tracks failed image, script, and style loading
- **Console Error Interception**: Captures console errors in development
- **Error Deduplication**: Prevents error spam with intelligent deduplication

## Monitoring and Analytics

### Error Statistics

```javascript
// Get comprehensive error statistics
const stats = globalErrorHandler.getErrorStats();

console.log('Total errors:', stats.total);
console.log('By category:', stats.byCategory);
console.log('By severity:', stats.bySeverity);
console.log('Recent errors:', stats.recent);
```

### Circuit Breaker Status

```javascript
// Monitor circuit breaker health
const statuses = retryManager.getAllCircuitBreakerStatuses();

Object.entries(statuses).forEach(([endpoint, status]) => {
  console.log(`${endpoint}: ${status.state} (${status.failureCount} failures)`);
});
```

### Recovery Analytics

```javascript
// Track recovery success rates
const recoveryStats = errorRecoveryService.getRecoveryStats();

console.log('Recovery queue length:', recoveryStats.queueLength);
console.log('Active strategies:', recoveryStats.strategiesCount);
console.log('Is recovering:', recoveryStats.isRecovering);
```

## Best Practices

### Error Handling

1. **Always use try-catch blocks** for async operations
2. **Categorize errors appropriately** for better recovery
3. **Provide user-friendly error messages** instead of technical details
4. **Log errors with context** for debugging
5. **Implement graceful degradation** for non-critical features

### Retry Configuration

1. **Use appropriate retry strategies** for different endpoint types
2. **Set reasonable failure thresholds** to prevent unnecessary circuit breaker trips
3. **Configure recovery timeouts** based on service characteristics
4. **Monitor circuit breaker health** in production
5. **Test retry logic** with different failure scenarios

### User Experience

1. **Show loading states** during retry attempts
2. **Provide clear error messages** with actionable steps
3. **Offer manual retry options** for user-initiated recovery
4. **Collect error reports** for continuous improvement
5. **Implement progressive disclosure** for error details

## Testing

### Unit Tests

```bash
# Run error handling tests
npm test -- --testPathPattern=globalErrorHandler.test.js

# Run retry manager tests
npm test -- --testPathPattern=retryManager.test.js

# Run all error handling tests
npm test -- --testPathPattern=error
```

### Integration Tests

```javascript
// Test error recovery flow
describe('Error Recovery Integration', () => {
  it('should recover from network errors', async () => {
    // Simulate network error
    const networkError = new Error('Network request failed');
    
    // Attempt recovery
    const recovered = await errorRecoveryService.attemptRecovery(networkError);
    
    expect(recovered).toBe(true);
  });
});
```

## Performance Considerations

### Memory Management

- **Error History Limiting**: Only stores last 100 errors in localStorage
- **Circuit Breaker Cleanup**: Automatically cleans up old circuit breaker data
- **Recovery Queue Management**: Limits queue size to prevent memory leaks

### Network Optimization

- **Error Deduplication**: Prevents duplicate error reports
- **Batch Reporting**: Groups error reports for efficient transmission
- **Rate Limiting**: Prevents error spam and excessive API calls

### User Experience

- **Non-blocking Error Handling**: Errors don't block the main application
- **Progressive Enhancement**: Core functionality remains available during errors
- **Cached Error Recovery**: Uses cached data when possible during recovery

## Troubleshooting

### Common Issues

1. **Circuit Breaker Stuck Open**
   - Check failure threshold configuration
   - Verify recovery timeout settings
   - Monitor endpoint health

2. **Excessive Retries**
   - Review retry configuration
   - Check error categorization
   - Monitor retry statistics

3. **Error Spam**
   - Verify error deduplication settings
   - Check rate limiting configuration
   - Review error categorization logic

### Debug Mode

```javascript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  globalErrorHandler.debug = true;
  retryManager.debug = true;
  errorRecoveryService.debug = true;
}
```

## Future Enhancements

### Planned Features

1. **Machine Learning Error Prediction**: Predict and prevent errors before they occur
2. **Advanced Recovery Strategies**: AI-powered recovery decision making
3. **Real-time Error Monitoring**: Live error dashboard and alerts
4. **User Behavior Analysis**: Correlate errors with user actions
5. **Automated Error Resolution**: Self-healing systems for common issues

### Integration Opportunities

1. **External Error Tracking**: Integration with Sentry, LogRocket, etc.
2. **Performance Monitoring**: Correlate errors with performance metrics
3. **User Feedback Integration**: Connect error reports with user feedback
4. **A/B Testing**: Test different error handling strategies
5. **Analytics Integration**: Connect error data with business metrics

## Conclusion

The error handling and retry system provides a robust foundation for managing errors in the Frende application. By implementing comprehensive error categorization, intelligent retry strategies, and user-friendly recovery mechanisms, the system ensures a smooth user experience even when errors occur.

The modular architecture allows for easy customization and extension, while the comprehensive testing ensures reliability and maintainability. The system is designed to scale with the application and can be enhanced with additional features as needed.
