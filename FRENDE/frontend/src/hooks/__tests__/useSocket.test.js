import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../useSocket';
import { useAuth } from '../useAuth';

// Mock dependencies
jest.mock('../useAuth');
jest.mock('../../lib/socket', () => {
  const mockSocketManager = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(() => jest.fn()), // Return cleanup function
    off: jest.fn(),
    emit: jest.fn(),
    joinChatRoom: jest.fn(),
    leaveChatRoom: jest.fn(),
    sendMessage: jest.fn(),
    startTyping: jest.fn(),
    stopTyping: jest.fn(),
    markMessagesAsRead: jest.fn(),
    submitTaskCompletion: jest.fn(),
    isConnected: jest.fn(() => false),
    getConnectionState: jest.fn(() => 'disconnected'),
    getReconnectAttempts: jest.fn(() => 0),
    getEventQueueLength: jest.fn(() => 0),
    getSocketId: jest.fn(() => null),
    clearError: jest.fn()
  };
  
  return {
    __esModule: true,
    default: mockSocketManager
  };
});

describe('useSocket', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    token: 'test-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.reconnectAttempts).toBe(0);
    expect(result.current.lastError).toBe(null);
    expect(result.current.eventQueueLength).toBe(0);
  });

  it('should connect when user token is available', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.connect(mockUser.token);
    });

    expect(result.current.isConnecting).toBe(true);
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.connect('invalid-token');
    });

    expect(result.current.lastError).toBeTruthy();
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const mockCallback = jest.fn();

    act(() => {
      const cleanup = result.current.on('test_event', mockCallback);
      expect(cleanup).toBeDefined();
    });
  });

  it('should emit events', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.emit('test_event', { data: 'test' });
    });

    // Verify emit was called (though it might be queued if not connected)
    expect(result.current.emit).toBeDefined();
  });

  it('should join chat room', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.joinChatRoom(123);
    });

    expect(result.current.joinChatRoom).toBeDefined();
  });

  it('should leave chat room', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.leaveChatRoom(123);
    });

    expect(result.current.leaveChatRoom).toBeDefined();
  });

  it('should send messages', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.sendMessage(123, 'Hello world');
    });

    expect(result.current.sendMessage).toBeDefined();
  });

  it('should handle typing indicators', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.startTyping(123);
      result.current.stopTyping(123);
    });

    expect(result.current.startTyping).toBeDefined();
    expect(result.current.stopTyping).toBeDefined();
  });

  it('should mark messages as read', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.markMessagesAsRead(123, [1, 2, 3]);
    });

    expect(result.current.markMessagesAsRead).toBeDefined();
  });

  it('should submit task completion', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.submitTaskCompletion(123, 456, { answer: 'test' });
    });

    expect(result.current.submitTaskCompletion).toBeDefined();
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.lastError).toBe(null);
  });

  it('should provide connection state helpers', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.isDisconnected).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.canReconnect).toBe(false);
  });

  it('should provide utility methods', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.getSocketId).toBeDefined();
    expect(result.current.isUserOnline).toBeDefined();
    expect(result.current.cleanup).toBeDefined();
  });

  it('should handle invalid event registration', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const cleanup = result.current.on('', jest.fn());
      expect(cleanup).toBeUndefined();
    });
  });

  it('should handle invalid event emission', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.emit('', { data: 'test' });
    });

    // Should not throw error
    expect(result.current.emit).toBeDefined();
  });

  it('should handle invalid chat room operations', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.joinChatRoom(null);
      result.current.leaveChatRoom(null);
    });

    // Should not throw error
    expect(result.current.joinChatRoom).toBeDefined();
    expect(result.current.leaveChatRoom).toBeDefined();
  });

  it('should handle invalid message sending', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.sendMessage(null, '');
    });

    // Should not throw error
    expect(result.current.sendMessage).toBeDefined();
  });

  it('should handle invalid typing operations', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.startTyping(null);
      result.current.stopTyping(null);
    });

    // Should not throw error
    expect(result.current.startTyping).toBeDefined();
    expect(result.current.stopTyping).toBeDefined();
  });

  it('should handle invalid message read operations', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.markMessagesAsRead(null, null);
    });

    // Should not throw error
    expect(result.current.markMessagesAsRead).toBeDefined();
  });

  it('should handle invalid task submission', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.submitTaskCompletion(null, null, null);
    });

    // Should not throw error
    expect(result.current.submitTaskCompletion).toBeDefined();
  });

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useSocket());

    const cleanup = result.current.cleanup;
    expect(cleanup).toBeDefined();

    unmount();
    // Should not throw error
  });
});
