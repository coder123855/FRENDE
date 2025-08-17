# Token Management System Documentation

## Overview

The Frende application implements a comprehensive token management system that provides secure authentication, automatic token refresh, and session management. This system ensures users remain authenticated seamlessly while maintaining security best practices.

## Architecture

### Components

1. **TokenManager** (`lib/tokenManager.js`) - Core token storage and management
2. **ApiClient** (`lib/apiClient.js`) - HTTP client with automatic token handling
3. **AuthContext** (`contexts/AuthContext.jsx`) - React context for authentication state
4. **useTokenRefresh** (`hooks/useTokenRefresh.js`) - Hook for token refresh logic
5. **TokenStatus** (`components/TokenStatus.jsx`) - UI component for token management

### Backend Components

1. **TokenService** (`services/token_service.py`) - Server-side token management
2. **Security Module** (`core/security.py`) - Token creation and validation
3. **Database Models** - Refresh tokens, sessions, and blacklisted tokens
4. **Auth API** (`api/auth.py`) - Authentication endpoints

## Features

### 🔐 Secure Token Storage
- **Encryption**: Tokens are encrypted using AES-256 before storage
- **Local Storage**: Secure storage in browser's localStorage
- **Environment Keys**: Production encryption keys from environment variables

### 🔄 Automatic Token Refresh
- **Proactive Refresh**: Tokens refresh 10 minutes before expiry
- **Automatic Retry**: Failed requests automatically retry with new tokens
- **Background Monitoring**: Periodic token health checks every 5 minutes

### 🛡️ Security Features
- **Token Rotation**: Automatic refresh token rotation
- **Session Management**: Track and manage multiple active sessions
- **Token Blacklisting**: Revoke compromised tokens
- **Secure Logout**: Server-side token invalidation

### 📱 User Experience
- **Seamless Authentication**: No user interruption during token refresh
- **Session Persistence**: Users stay logged in across browser sessions
- **Multi-Device Support**: Manage sessions across multiple devices

## Usage

### Basic Authentication

```javascript
import { useAuth } from '../hooks/useAuth';

function LoginComponent() {
    const { login, isAuthenticated, user } = useAuth();

    const handleLogin = async (credentials) => {
        try {
            await login(credentials);
            // User is now authenticated
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <div>
            {isAuthenticated ? (
                <p>Welcome, {user.username}!</p>
            ) : (
                <LoginForm onSubmit={handleLogin} />
            )}
        </div>
    );
}
```

### Token Refresh Monitoring

```javascript
import { useTokenRefresh } from '../hooks/useTokenRefresh';

function App() {
    const { manualRefresh, getTokenStatus } = useTokenRefresh();

    const handleManualRefresh = async () => {
        const result = await manualRefresh();
        if (result.success) {
            console.log('Token refreshed successfully');
        }
    };

    const checkTokenHealth = () => {
        const status = getTokenStatus();
        console.log('Token status:', status);
    };

    return (
        <div>
            <button onClick={handleManualRefresh}>Refresh Token</button>
            <button onClick={checkTokenHealth}>Check Status</button>
        </div>
    );
}
```

### Session Management

```javascript
import { useAuth } from '../hooks/useAuth';

function SecuritySettings() {
    const { getUserSessions, revokeSession, revokeAllSessions } = useAuth();

    const handleRevokeSession = async (sessionId) => {
        try {
            await revokeSession(sessionId);
            console.log('Session revoked');
        } catch (error) {
            console.error('Failed to revoke session:', error);
        }
    };

    const handleRevokeAllSessions = async () => {
        if (confirm('Revoke all sessions?')) {
            try {
                await revokeAllSessions();
                console.log('All sessions revoked');
            } catch (error) {
                console.error('Failed to revoke all sessions:', error);
            }
        }
    };

    return (
        <div>
            <button onClick={handleRevokeAllSessions}>
                Logout from All Devices
            </button>
        </div>
    );
}
```

### Token Status Display

```javascript
import { TokenStatus } from '../components/TokenStatus';

function DebugPanel() {
    return (
        <div>
            <h3>Authentication Debug</h3>
            <TokenStatus showDetails={true} />
        </div>
    );
}
```

## API Reference

### TokenManager

#### Methods

- `storeTokens(accessToken, refreshToken, sessionId)` - Store encrypted tokens
- `getAccessToken()` - Get decrypted access token
- `getRefreshToken()` - Get decrypted refresh token
- `isTokenExpired()` - Check if access token is expired
- `isTokenExpiringSoon()` - Check if token expires within 10 minutes
- `refreshTokens()` - Refresh tokens using refresh token
- `getValidAccessToken()` - Get valid token (refresh if needed)
- `clearTokens()` - Remove all stored tokens
- `logout()` - Server logout and clear tokens

#### Properties

- `isRefreshing` - Whether token refresh is in progress
- `refreshCallbacks` - Array of refresh event callbacks

### useAuth Hook

#### State

- `user` - Current user object
- `loading` - Authentication operation in progress
- `error` - Authentication error message
- `isAuthenticated` - User authentication status
- `tokenInfo` - Current token information

#### Methods

- `login(credentials)` - Authenticate user
- `register(userData)` - Register new user
- `logout()` - Logout user
- `refreshTokens()` - Manually refresh tokens
- `updateProfile(profileData)` - Update user profile
- `changePassword(passwordData)` - Change user password
- `getUserSessions()` - Get active sessions
- `revokeSession(sessionId)` - Revoke specific session
- `revokeAllSessions()` - Revoke all sessions

### useTokenRefresh Hook

#### Methods

- `checkAndRefreshToken()` - Check and refresh if needed
- `manualRefresh()` - Manually refresh tokens
- `getTokenStatus()` - Get current token status

## Configuration

### Environment Variables

```bash
# Frontend
VITE_API_URL=http://localhost:8000
VITE_TOKEN_ENCRYPTION_KEY=your-secure-encryption-key

# Backend
JWT_SECRET_KEY=your-jwt-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30
TOKEN_ROTATION_ENABLED=true
MAX_ACTIVE_SESSIONS=5
```

### Token Expiration Settings

- **Access Token**: 24 hours (1440 minutes)
- **Refresh Token**: 30 days
- **Proactive Refresh**: 10 minutes before expiry
- **Health Check Interval**: 5 minutes

## Security Considerations

### Token Storage
- Tokens are encrypted before storage
- Encryption keys should be environment-specific
- Tokens are automatically cleared on logout

### Token Refresh
- Refresh tokens are rotated on each use
- Failed refresh attempts trigger logout
- Refresh requests are deduplicated

### Session Management
- Multiple sessions are tracked per user
- Sessions can be individually revoked
- Inactive sessions are automatically cleaned up

### Error Handling
- Network errors trigger automatic retry
- Authentication failures clear tokens
- Invalid tokens trigger immediate logout

## Troubleshooting

### Common Issues

1. **Token Refresh Fails**
   - Check network connectivity
   - Verify refresh token is valid
   - Check server logs for errors

2. **User Logged Out Unexpectedly**
   - Check token expiration settings
   - Verify refresh token rotation
   - Check for server-side token invalidation

3. **Multiple Refresh Attempts**
   - Ensure refresh deduplication is working
   - Check for race conditions in token refresh

### Debug Tools

```javascript
// Check token status
const tokenInfo = tokenManager.getTokenInfo();
console.log('Token Info:', tokenInfo);

// Manual token refresh
const result = await tokenManager.refreshTokens();
console.log('Refresh Result:', result);

// Check API client status
const authStatus = await apiClient.getAuthStatus();
console.log('Auth Status:', authStatus);
```

### Logging

Enable debug logging in development:

```javascript
// In development environment
if (import.meta.env.DEV) {
    console.log('Token refresh:', tokenInfo);
    console.log('API request:', requestConfig);
    console.log('API response:', response);
}
```

## Best Practices

1. **Always use the useAuth hook** for authentication state
2. **Handle authentication errors gracefully** in components
3. **Use TokenStatus component** for debugging authentication issues
4. **Implement proper error boundaries** for authentication failures
5. **Test token refresh scenarios** in development
6. **Monitor token expiration** in production environments

## Migration Guide

### From Simple Token Storage

If migrating from a simple localStorage token system:

1. Replace direct localStorage access with TokenManager
2. Update API calls to use the new ApiClient
3. Replace authentication state with useAuth hook
4. Add token refresh monitoring with useTokenRefresh
5. Update error handling for token refresh scenarios

### Example Migration

```javascript
// Before
const token = localStorage.getItem('auth_token');
const response = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` }
});

// After
const { user } = useAuth();
const response = await apiClient.get('/api/data');
```

## Testing

### Unit Tests

Run token management tests:

```bash
npm test -- useTokenRefresh.test.js
npm test -- tokenManager.test.js
```

### Integration Tests

Test token refresh flow:

```javascript
// Test automatic token refresh
const { result } = renderHook(() => useTokenRefresh());
await act(async () => {
    await result.current.checkAndRefreshToken();
});
```

### E2E Tests

Test complete authentication flow:

```javascript
// Login and verify token refresh
await login(userCredentials);
await waitFor(() => expect(isAuthenticated).toBe(true));
// Simulate token expiration
// Verify automatic refresh
```
