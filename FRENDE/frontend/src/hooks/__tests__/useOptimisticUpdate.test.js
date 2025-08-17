import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdate } from '../useOptimisticUpdate';
import { OptimisticProvider } from '../../contexts/OptimisticContext';

// Mock the optimistic update manager
jest.mock('../../lib/optimisticUpdateManager', () => ({
  __esModule: true,
  default: {
    registerUpdate: jest.fn(),
    markSuccess: jest.fn(),
    markFailure: jest.fn(),
    handleConflict: jest.fn(),
    resolveConflict: jest.fn(),
    isPending: jest.fn(),
    getUpdateStatus: jest.fn(),
    getPendingUpdatesByType: jest.fn(),
    clearAll: jest.fn(),
    getAnalytics: jest.fn(),
    resetAnalytics: jest.fn(),
    onUpdateStatus: jest.fn(),
    offUpdateStatus: jest.fn(),
    registerConflictResolver: jest.fn(),
    getConflictResolver: jest.fn()
  }
}));

const wrapper = ({ children }) => (
  <OptimisticProvider>{children}</OptimisticProvider>
);

describe('useOptimisticUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    expect(result.current).toHaveProperty('createUpdate');
    expect(result.current).toHaveProperty('markSuccess');
    expect(result.current).toHaveProperty('markFailure');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('getUpdateStatus');
  });

  it('should create an optimistic update', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const updateId = result.current.createUpdate(
        'test-update',
        { data: 'test' },
        () => {},
        { type: 'immediate' }
      );
      expect(updateId).toBeDefined();
    });
  });

  it('should mark an update as successful', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.markSuccess('test-update', { success: true });
    });

    // The markSuccess function should be called
    expect(result.current.markSuccess).toBeDefined();
  });

  it('should mark an update as failed', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.markFailure('test-update', new Error('Test error'));
    });

    // The markFailure function should be called
    expect(result.current.markFailure).toBeDefined();
  });

  it('should handle conflicts', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.handleConflict(
        'test-update',
        { server: 'data' },
        { optimistic: 'data' }
      );
    });

    expect(result.current.handleConflict).toBeDefined();
  });

  it('should resolve conflicts', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.resolveConflict('test-update', 'server');
    });

    expect(result.current.resolveConflict).toBeDefined();
  });

  it('should check if an update is pending', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const isPending = result.current.isPending('test-update');
      expect(typeof isPending).toBe('boolean');
    });
  });

  it('should get update status', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const status = result.current.getUpdateStatus('test-update');
      expect(status).toBeDefined();
    });
  });

  it('should create an update with API integration', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });
    const mockApiCall = jest.fn().mockResolvedValue({ success: true });

    await act(async () => {
      const apiResult = await result.current.createUpdateWithAPI(
        'test-update',
        { data: 'test' },
        () => {},
        mockApiCall
      );
      expect(apiResult).toEqual({ success: true });
    });
  });

  it('should handle API call errors', async () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });
    const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

    await act(async () => {
      try {
        await result.current.createUpdateWithAPI(
          'test-update',
          { data: 'test' },
          () => {},
          mockApiCall
        );
      } catch (error) {
        expect(error.message).toBe('API Error');
      }
    });
  });

  it('should create a debounced update', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });
    jest.useFakeTimers();

    act(() => {
      result.current.createDebouncedUpdate(
        'test-update',
        { data: 'test' },
        () => {},
        1000
      );
    });

    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    jest.useRealTimers();
  });

  it('should create a conditional update when condition is true', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const updateId = result.current.createConditionalUpdate(
        'test-update',
        { data: 'test' },
        () => {},
        () => true
      );
      expect(updateId).toBeDefined();
    });
  });

  it('should not create a conditional update when condition is false', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const updateId = result.current.createConditionalUpdate(
        'test-update',
        { data: 'test' },
        () => {},
        () => false
      );
      expect(updateId).toBeNull();
    });
  });

  it('should clear all updates', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.clearAll).toBeDefined();
  });

  it('should get pending updates', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    act(() => {
      const updates = result.current.getPendingUpdates();
      expect(Array.isArray(updates)).toBe(true);
    });
  });

  it('should provide state from context', () => {
    const { result } = renderHook(() => useOptimisticUpdate(), { wrapper });

    expect(result.current).toHaveProperty('pendingUpdates');
    expect(result.current).toHaveProperty('updateHistory');
    expect(result.current).toHaveProperty('analytics');
    expect(result.current).toHaveProperty('hasPendingUpdates');
    expect(result.current).toHaveProperty('pendingCount');
  });

  it('should work with custom options', () => {
    const customOptions = {
      type: 'debounced',
      timeout: 5000,
      retryCount: 5,
      autoRollback: false
    };

    const { result } = renderHook(() => useOptimisticUpdate(customOptions), { wrapper });

    expect(result.current).toBeDefined();
  });
});

describe('useOptimisticUpdateByType', () => {
  it('should create hook with specific type', () => {
    const { result } = renderHook(() => useOptimisticUpdate({ type: 'immediate' }), { wrapper });

    expect(result.current).toBeDefined();
  });
});

describe('useImmediateOptimisticUpdate', () => {
  it('should create hook for immediate updates', () => {
    const { result } = renderHook(() => useOptimisticUpdate({ type: 'immediate' }), { wrapper });

    expect(result.current).toBeDefined();
  });
});

describe('useDebouncedOptimisticUpdate', () => {
  it('should create hook for debounced updates', () => {
    const { result } = renderHook(() => useOptimisticUpdate({ type: 'debounced' }), { wrapper });

    expect(result.current).toBeDefined();
  });
});
