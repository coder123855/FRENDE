import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import useCompatibleUsers from '../useCompatibleUsers';
import { userAPI } from '../../lib/api';
import { OptimisticProvider } from '../../contexts/OptimisticContext';

// Wrapper component for tests
const TestWrapper = ({ children }) => (
  <OptimisticProvider>
    {children}
  </OptimisticProvider>
);

jest.mock('../../lib/api', () => ({
  userAPI: {
    getCompatibleUsers: jest.fn()
  }
}));

describe('useCompatibleUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    expect(result.current.compatibleUsers).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.total).toBe(0);
  });

  it('should fetch compatible users on mount', async () => {
    const mockUsers = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      }
    ];

    userAPI.getCompatibleUsers.mockResolvedValue({ data: mockUsers });

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toEqual(mockUsers);
    expect(result.current.error).toBe(null);
    expect(userAPI.getCompatibleUsers).toHaveBeenCalledWith(10);
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch users');
    userAPI.getCompatibleUsers.mockRejectedValue(error);

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load compatible users');
    expect(result.current.compatibleUsers).toEqual([]);
  });

  it('should handle API errors with response data', async () => {
    const error = {
      response: {
        data: {
          detail: 'Failed to fetch users'
        }
      }
    };
    userAPI.getCompatibleUsers.mockRejectedValue(error);

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch users');
    expect(result.current.compatibleUsers).toEqual([]);
  });

  it('should load more users', async () => {
    const initialUsers = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      }
    ];

    const moreUsers = [
      {
        user: { id: 2, name: 'Jane', age: 28, profession: 'Designer' },
        compatibility_score: 75,
        common_interests: ['art', 'travel']
      }
    ];

    userAPI.getCompatibleUsers
      .mockResolvedValueOnce({ data: initialUsers })
      .mockResolvedValueOnce({ data: moreUsers });

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toEqual(initialUsers);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toEqual([...initialUsers, ...moreUsers]);
  });

  it('should refresh users', async () => {
    const initialUsers = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      }
    ];

    const refreshedUsers = [
      {
        user: { id: 2, name: 'Jane', age: 28, profession: 'Designer' },
        compatibility_score: 75,
        common_interests: ['art', 'travel']
      }
    ];

    userAPI.getCompatibleUsers
      .mockResolvedValueOnce({ data: initialUsers })
      .mockResolvedValueOnce({ data: refreshedUsers });

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toEqual(initialUsers);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toEqual(refreshedUsers);
  });

  it('should remove user from list', async () => {
    const users = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      },
      {
        user: { id: 2, name: 'Jane', age: 28, profession: 'Designer' },
        compatibility_score: 75,
        common_interests: ['art', 'travel']
      }
    ];

    userAPI.getCompatibleUsers.mockResolvedValue({ data: users });

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.compatibleUsers).toHaveLength(2);

    act(() => {
      result.current.removeUser(1);
    });

    expect(result.current.compatibleUsers).toHaveLength(1);
    expect(result.current.compatibleUsers[0].user.id).toBe(2);
  });

  it('should get user by id', async () => {
    const users = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      },
      {
        user: { id: 2, name: 'Jane', age: 28, profession: 'Designer' },
        compatibility_score: 75,
        common_interests: ['art', 'travel']
      }
    ];

    userAPI.getCompatibleUsers.mockResolvedValue({ data: users });

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const user = result.current.getUserById(1);
    expect(user).toEqual(users[0]);

    const nonExistentUser = result.current.getUserById(999);
    expect(nonExistentUser).toBeUndefined();
  });

  it('should handle hasMore correctly', async () => {
    const users = [
      {
        user: { id: 1, name: 'John', age: 25, profession: 'Developer' },
        compatibility_score: 85,
        common_interests: ['coding', 'music']
      }
    ];

    userAPI.getCompatibleUsers.mockResolvedValue({ data: users });

    const { result } = renderHook(() => useCompatibleUsers(1), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('should not load more when already loading', async () => {
    userAPI.getCompatibleUsers.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
    );

    const { result } = renderHook(() => useCompatibleUsers(), { wrapper: TestWrapper });

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.loading).toBe(true);

    // Try to load more while still loading
    act(() => {
      result.current.loadMore();
    });

    expect(result.current.loading).toBe(true);
    expect(userAPI.getCompatibleUsers).toHaveBeenCalledTimes(1);
  });
}); 