# React Hooks API System Documentation

## Overview

The Frende application implements a comprehensive React hooks system for API calls and state management. This system provides standardized patterns for data fetching, caching, error handling, and state management across the application.

## Architecture

### Core Hooks

1. **useApi** - Base API hook for HTTP requests
2. **useCrud** - CRUD operations factory
3. **usePagination** - Pagination and infinite scroll
4. **useUserProfile** - User profile management
5. **useUserSettings** - User settings and preferences
6. **useUserStats** - User statistics and analytics

### Key Features

- **Standardized State Management** - Consistent loading, error, and data states
- **Automatic Retry Logic** - Configurable retry with exponential backoff
- **Request Cancellation** - AbortController integration for cleanup
- **Optimistic Updates** - Immediate UI updates with rollback on error
- **Caching** - In-memory caching with invalidation
- **Pagination Support** - Both offset and cursor-based pagination
- **Type Safety** - Full TypeScript support with proper typing
- **Error Handling** - Comprehensive error management and recovery
- **Performance Optimization** - Debouncing, throttling, and memoization

## Core Hooks

### useApi

Base hook for making HTTP requests with standardized state management.

```javascript
import { useApi } from '../hooks/useApi';

const MyComponent = () => {
    const { data, loading, error, execute, cancel, reset } = useApi('/api/users', {
        method: 'GET',
        retryCount: 3,
        retryDelay: 1000,
        timeout: 10000,
        onSuccess: (data) => console.log('Success:', data),
        onError: (error) => console.error('Error:', error),
        immediate: true
    });

    return (
        <div>
            {loading && <div>Loading...</div>}
            {error && <div>Error: {error.message}</div>}
            {data && <div>Data: {JSON.stringify(data)}</div>}
        </div>
    );
};
```

**Options:**
- `method` - HTTP method (GET, POST, PUT, PATCH, DELETE)
- `body` - Request body
- `headers` - Custom headers
- `immediate` - Execute on mount
- `retryCount` - Number of retry attempts
- `retryDelay` - Delay between retries
- `timeout` - Request timeout
- `onSuccess` - Success callback
- `onError` - Error callback
- `onFinally` - Finally callback
- `dependencies` - Dependencies for re-execution

**Returned Values:**
- `data` - Response data
- `loading` - Loading state
- `error` - Error state
- `status` - Request status (idle, loading, success, error)
- `execute` - Execute function
- `cancel` - Cancel function
- `reset` - Reset function
- `isIdle`, `isLoading`, `isSuccess`, `isError` - Status booleans

### useCrud

Factory hook for creating standardized CRUD operations.

```javascript
import { useCrud } from '../hooks/useCrud';

const UserManagement = () => {
    const {
        data: users,
        loading,
        error,
        list,
        get,
        create,
        update,
        patch,
        remove,
        batchCreate,
        batchUpdate,
        batchDelete,
        cache,
        optimisticUpdates
    } = useCrud('/api/users', {
        optimisticUpdates: true,
        batchOperations: true,
        onCacheUpdate: (key, data) => console.log('Cache updated:', key, data),
        onOptimisticError: (error, operation, id) => console.error('Optimistic error:', error)
    });

    const handleCreate = async (userData) => {
        try {
            await create(userData);
        } catch (error) {
            console.error('Failed to create user:', error);
        }
    };

    return (
        <div>
            {loading && <div>Loading...</div>}
            {users?.map(user => (
                <div key={user.id}>
                    {user.name}
                    <button onClick={() => update(user.id, { active: false })}>
                        Deactivate
                    </button>
                </div>
            ))}
        </div>
    );
};
```

**Options:**
- `cacheKey` - Cache key prefix
- `optimisticUpdates` - Enable optimistic updates
- `batchOperations` - Enable batch operations
- `onCacheUpdate` - Cache update callback
- `onOptimisticError` - Optimistic error callback

**Returned Values:**
- CRUD operations: `list`, `get`, `create`, `update`, `patch`, `remove`
- Batch operations: `batchCreate`, `batchUpdate`, `batchDelete`
- Cache management: `cache`, `getFromCache`, `updateCache`, `invalidateCache`
- Optimistic updates: `optimisticUpdates`, `getOptimisticUpdate`
- Loading states: `listLoading`, `getLoading`, `createLoading`, etc.
- Error states: `listError`, `getError`, `createError`, etc.

### usePagination

Hook for managing paginated data with infinite scroll support.

```javascript
import { usePagination } from '../hooks/usePagination';

const UserList = () => {
    const {
        data: users,
        loading,
        loadingMore,
        error,
        hasMore,
        loadNext,
        loadPrevious,
        goToPage,
        refresh,
        updateFilters,
        updateSearchParams,
        updateSort
    } = usePagination('/api/users', {
        pageSize: 20,
        paginationType: 'offset', // or 'cursor'
        searchParams: { status: 'active' },
        filters: { age_min: 18 },
        sortBy: 'created_at',
        sortOrder: 'desc',
        autoLoad: true,
        deduplicate: true
    });

    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            loadNext();
        }
    };

    return (
        <div>
            {users?.map(user => (
                <div key={user.id}>{user.name}</div>
            ))}
            {hasMore && (
                <button onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
};
```

**Options:**
- `pageSize` - Items per page
- `initialPage` - Starting page
- `paginationType` - 'offset' or 'cursor'
- `searchParams` - Search parameters
- `filters` - Filter parameters
- `sortBy` - Sort field
- `sortOrder` - Sort direction
- `autoLoad` - Load on mount
- `deduplicate` - Remove duplicates

**Returned Values:**
- Data: `data`, `loading`, `loadingMore`, `error`
- Pagination: `hasMore`, `page`, `totalItems`, `totalPages`
- Cursor: `cursor`, `nextCursor`, `prevCursor`
- Actions: `loadInitial`, `loadNext`, `loadPrevious`, `goToPage`, `refresh`
- Filters: `updateFilters`, `updateSearchParams`, `updateSort`
- Utilities: `isEmpty`, `isFirstPage`, `isLastPage`, `canLoadMore`

## Specialized Hooks

### useUserProfile

Hook for managing user profile data and operations.

```javascript
import { useUserProfile } from '../hooks/useUserProfile';

const ProfileEditor = () => {
    const {
        profile,
        draftProfile,
        loading,
        error,
        isEditing,
        startEditing,
        cancelEditing,
        saveDraft,
        updateDraftField,
        uploadAvatar,
        profileCompleteness,
        isProfileComplete
    } = useUserProfile();

    const handleSave = async () => {
        try {
            await saveDraft();
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    return (
        <div>
            {isEditing ? (
                <div>
                    <input
                        value={draftProfile?.name || ''}
                        onChange={(e) => updateDraftField('name', e.target.value)}
                    />
                    <button onClick={handleSave}>Save</button>
                    <button onClick={cancelEditing}>Cancel</button>
                </div>
            ) : (
                <div>
                    <div>{profile?.name}</div>
                    <button onClick={startEditing}>Edit</button>
                </div>
            )}
            <div>Profile completeness: {profileCompleteness}%</div>
        </div>
    );
};
```

### useUserSettings

Hook for managing user settings and preferences.

```javascript
import { useUserSettings } from '../hooks/useUserSettings';

const SettingsPanel = () => {
    const {
        settings,
        draftSettings,
        loading,
        error,
        isEditing,
        startEditing,
        cancelEditing,
        saveDraft,
        updateDraftSetting,
        updatePassword,
        updateEmail,
        deleteAccount,
        exportSettings,
        importSettings
    } = useUserSettings();

    const handleNotificationToggle = (enabled) => {
        updateDraftSetting('notifications', 'messages', enabled);
    };

    return (
        <div>
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={draftSettings?.notifications?.messages || false}
                        onChange={(e) => handleNotificationToggle(e.target.checked)}
                    />
                    Message notifications
                </label>
            </div>
            {isEditing && (
                <div>
                    <button onClick={saveDraft}>Save</button>
                    <button onClick={cancelEditing}>Cancel</button>
                </div>
            )}
        </div>
    );
};
```

### useUserStats

Hook for managing user statistics and analytics.

```javascript
import { useUserStats } from '../hooks/useUserStats';

const UserDashboard = () => {
    const {
        stats,
        loading,
        error,
        timeRange,
        setTimeRange,
        computedStats,
        timeBasedStats,
        achievementProgress,
        recentActivity,
        exportStats
    } = useUserStats();

    return (
        <div>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
            </select>
            
            {computedStats && (
                <div>
                    <div>Total matches: {computedStats.totalMatches}</div>
                    <div>Task completion: {computedStats.taskCompletionRate}%</div>
                    <div>Engagement score: {computedStats.engagementScore}</div>
                    <div>User rank: {computedStats.userRank}</div>
                </div>
            )}
        </div>
    );
};
```

## Best Practices

### Error Handling

```javascript
const MyComponent = () => {
    const { data, loading, error, execute } = useApi('/api/data', {
        onError: (error) => {
            // Log error for debugging
            console.error('API Error:', error);
            
            // Show user-friendly message
            if (error.response?.status === 404) {
                showNotification('Data not found', 'error');
            } else if (error.response?.status === 401) {
                showNotification('Please log in again', 'error');
            } else {
                showNotification('Something went wrong', 'error');
            }
        }
    });

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => execute()} />;
    }

    return <DataDisplay data={data} loading={loading} />;
};
```

### Optimistic Updates

```javascript
const TaskList = () => {
    const { data: tasks, update, optimisticUpdates } = useCrud('/api/tasks', {
        optimisticUpdates: true,
        onOptimisticError: (error, operation, id) => {
            showNotification(`Failed to ${operation} task`, 'error');
        }
    });

    const handleComplete = async (taskId) => {
        try {
            await update(taskId, { completed: true });
            showNotification('Task completed!', 'success');
        } catch (error) {
            // Error is handled by onOptimisticError
        }
    };

    return (
        <div>
            {tasks?.map(task => (
                <div key={task.id}>
                    {task.title}
                    <button 
                        onClick={() => handleComplete(task.id)}
                        disabled={optimisticUpdates.has(task.id)}
                    >
                        {optimisticUpdates.has(task.id) ? 'Updating...' : 'Complete'}
                    </button>
                </div>
            ))}
        </div>
    );
};
```

### Caching Strategy

```javascript
const UserProfile = ({ userId }) => {
    const { profile, getFromCache, updateCache } = useUserProfile(userId);

    // Check cache first
    const cachedProfile = getFromCache(`/api/users/${userId}/profile`);
    
    if (cachedProfile) {
        return <ProfileDisplay profile={cachedProfile} />;
    }

    return <ProfileDisplay profile={profile} loading={loading} />;
};
```

### Pagination with Infinite Scroll

```javascript
import { useEffect, useRef } from 'react';

const InfiniteUserList = () => {
    const observerRef = useRef();
    const {
        data: users,
        loading,
        loadingMore,
        hasMore,
        loadNext
    } = usePagination('/api/users', {
        pageSize: 20,
        autoLoad: true
    });

    const lastElementRef = useRef();

    useEffect(() => {
        if (loading) return;

        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore) {
                loadNext();
            }
        });

        if (lastElementRef.current) {
            observerRef.current.observe(lastElementRef.current);
        }
    }, [loading, hasMore, loadingMore, loadNext]);

    return (
        <div>
            {users?.map((user, index) => (
                <div 
                    key={user.id}
                    ref={index === users.length - 1 ? lastElementRef : null}
                >
                    {user.name}
                </div>
            ))}
            {loadingMore && <div>Loading more...</div>}
        </div>
    );
};
```

## Testing

### Unit Testing Hooks

```javascript
import { renderHook, act } from '@testing-library/react';
import { useApi } from '../hooks/useApi';

describe('useApi', () => {
    it('should make API request successfully', async () => {
        const mockResponse = { data: 'success' };
        apiClient.request.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useApi('/test', { immediate: false }));

        await act(async () => {
            await result.current.execute();
        });

        expect(result.current.data).toEqual(mockResponse);
        expect(result.current.isSuccess).toBe(true);
    });

    it('should handle API errors', async () => {
        const mockError = new Error('API Error');
        apiClient.request.mockRejectedValue(mockError);

        const { result } = renderHook(() => useApi('/test', { immediate: false }));

        await act(async () => {
            try {
                await result.current.execute();
            } catch (error) {
                // Expected to throw
            }
        });

        expect(result.current.error).toEqual(mockError);
        expect(result.current.isError).toBe(true);
    });
});
```

## Performance Considerations

### Memoization

```javascript
const MyComponent = () => {
    const { data, loading } = useApi('/api/data', {
        dependencies: [userId], // Re-execute when userId changes
        immediate: true
    });

    // Memoize expensive computations
    const processedData = useMemo(() => {
        return data ? processData(data) : null;
    }, [data]);

    return <DataDisplay data={processedData} loading={loading} />;
};
```

### Debouncing

```javascript
const SearchComponent = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const { data, loading, updateSearchParams } = usePagination('/api/search', {
        autoLoad: false
    });

    const debouncedSearch = useCallback(
        debounce((term) => {
            updateSearchParams({ q: term });
        }, 300),
        [updateSearchParams]
    );

    useEffect(() => {
        if (searchTerm) {
            debouncedSearch(searchTerm);
        }
    }, [searchTerm, debouncedSearch]);

    return (
        <div>
            <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
            />
            {loading && <div>Searching...</div>}
            <SearchResults data={data} />
        </div>
    );
};
```

## Migration Guide

### From Direct API Calls

**Before:**
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
    setLoading(true);
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
    } catch (err) {
        setError(err);
    } finally {
        setLoading(false);
    }
};
```

**After:**
```javascript
const { data, loading, error, execute } = useApi('/api/data', {
    immediate: true
});
```

### From Custom Hooks

**Before:**
```javascript
const useCustomData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/data');
            setData(response.data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, fetchData };
};
```

**After:**
```javascript
const useCustomData = () => {
    return useApi('/api/data', { immediate: false });
};
```

## Troubleshooting

### Common Issues

1. **Infinite Re-renders**
   - Check dependencies array in useEffect
   - Ensure callback functions are memoized with useCallback

2. **Memory Leaks**
   - Always cleanup intervals and event listeners
   - Use AbortController for request cancellation

3. **Stale Data**
   - Use cache invalidation strategies
   - Implement proper cache keys

4. **Performance Issues**
   - Implement debouncing for search/filter operations
   - Use pagination for large datasets
   - Memoize expensive computations

### Debug Mode

```javascript
const { data, loading, error } = useApi('/api/data', {
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.error('Error:', error),
    onFinally: () => console.log('Request completed')
});
```

## Conclusion

The React hooks API system provides a robust foundation for data management in the Frende application. By following the patterns and best practices outlined in this documentation, developers can create maintainable, performant, and user-friendly components that handle complex data operations with ease.
