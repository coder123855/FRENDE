import { renderHook, act } from '@testing-library/react';
import { useApi } from '../useApi';

// Mock apiClient
jest.mock('../../lib/apiClient', () => ({
    request: jest.fn()
}));

import apiClient from '../../lib/apiClient';

describe('useApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initial state', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useApi('/test', { immediate: false }));

            expect(result.current.data).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.status).toBe('idle');
            expect(result.current.isIdle).toBe(true);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isSuccess).toBe(false);
            expect(result.current.isError).toBe(false);
            expect(result.current.retryCount).toBe(0);
        });

        it('should execute immediately when immediate is true', async () => {
            const mockResponse = { data: 'test' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { immediate: true }));

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(result.current.data).toEqual(mockResponse);
            expect(result.current.isSuccess).toBe(true);
            expect(result.current.loading).toBe(false);
        });
    });

    describe('execute method', () => {
        it('should make API request successfully', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { immediate: false }));

            await act(async () => {
                await result.current.execute();
            });

            expect(apiClient.request).toHaveBeenCalledWith({
                url: '/test',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: expect.any(AbortSignal),
                timeout: 10000
            });
            expect(result.current.data).toEqual(mockResponse);
            expect(result.current.isSuccess).toBe(true);
            expect(result.current.loading).toBe(false);
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
            expect(result.current.loading).toBe(false);
        });

        it('should execute with custom body and headers', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { 
                method: 'POST', 
                body: { test: 'data' },
                headers: { 'Custom-Header': 'value' },
                immediate: false 
            }));

            await act(async () => {
                await result.current.execute();
            });

            expect(apiClient.request).toHaveBeenCalledWith({
                url: '/test',
                method: 'POST',
                body: JSON.stringify({ test: 'data' }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Custom-Header': 'value'
                },
                signal: expect.any(AbortSignal),
                timeout: 10000
            });
        });

        it('should execute with custom parameters', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { immediate: false }));

            await act(async () => {
                await result.current.execute({ custom: 'body' }, { 'Custom-Header': 'value' });
            });

            expect(apiClient.request).toHaveBeenCalledWith({
                url: '/test',
                method: 'GET',
                body: JSON.stringify({ custom: 'body' }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Custom-Header': 'value'
                },
                signal: expect.any(AbortSignal),
                timeout: 10000
            });
        });
    });

    describe('retry logic', () => {
        it('should retry failed requests', async () => {
            const mockError = { response: { status: 500 } };
            apiClient.request
                .mockRejectedValueOnce(mockError)
                .mockRejectedValueOnce(mockError)
                .mockResolvedValueOnce({ data: 'success' });

            const { result } = renderHook(() => useApi('/test', { 
                retryCount: 3,
                retryDelay: 100,
                immediate: false 
            }));

            await act(async () => {
                await result.current.execute();
            });

            expect(apiClient.request).toHaveBeenCalledTimes(3);
            expect(result.current.data).toEqual({ data: 'success' });
            expect(result.current.isSuccess).toBe(true);
        });

        it('should not retry non-retryable errors', async () => {
            const mockError = { response: { status: 400 } };
            apiClient.request.mockRejectedValue(mockError);

            const { result } = renderHook(() => useApi('/test', { 
                retryCount: 3,
                immediate: false 
            }));

            await act(async () => {
                try {
                    await result.current.execute();
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(apiClient.request).toHaveBeenCalledTimes(1);
            expect(result.current.isError).toBe(true);
        });

        it('should not retry DELETE requests', async () => {
            const mockError = { response: { status: 500 } };
            apiClient.request.mockRejectedValue(mockError);

            const { result } = renderHook(() => useApi('/test', { 
                method: 'DELETE',
                retryCount: 3,
                immediate: false 
            }));

            await act(async () => {
                try {
                    await result.current.execute();
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(apiClient.request).toHaveBeenCalledTimes(1);
            expect(result.current.isError).toBe(true);
        });
    });

    describe('cancel method', () => {
        it('should cancel ongoing request', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { immediate: false }));

            act(() => {
                result.current.execute();
                result.current.cancel();
            });

            expect(result.current.loading).toBe(false);
        });
    });

    describe('reset method', () => {
        it('should reset hook state', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useApi('/test', { immediate: false }));

            await act(async () => {
                await result.current.execute();
            });

            expect(result.current.data).toEqual(mockResponse);
            expect(result.current.isSuccess).toBe(true);

            act(() => {
                result.current.reset();
            });

            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeNull();
            expect(result.current.status).toBe('idle');
            expect(result.current.retryCount).toBe(0);
        });
    });

    describe('callbacks', () => {
        it('should call onSuccess callback', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);
            const onSuccess = jest.fn();

            const { result } = renderHook(() => useApi('/test', { 
                onSuccess,
                immediate: false 
            }));

            await act(async () => {
                await result.current.execute();
            });

            expect(onSuccess).toHaveBeenCalledWith(mockResponse);
        });

        it('should call onError callback', async () => {
            const mockError = new Error('API Error');
            apiClient.request.mockRejectedValue(mockError);
            const onError = jest.fn();

            const { result } = renderHook(() => useApi('/test', { 
                onError,
                immediate: false 
            }));

            await act(async () => {
                try {
                    await result.current.execute();
                } catch (error) {
                    // Expected to throw
                }
            });

            expect(onError).toHaveBeenCalledWith(mockError);
        });

        it('should call onFinally callback', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);
            const onFinally = jest.fn();

            const { result } = renderHook(() => useApi('/test', { 
                onFinally,
                immediate: false 
            }));

            await act(async () => {
                await result.current.execute();
            });

            // onFinally is called in cleanup effect
            expect(onFinally).toHaveBeenCalled();
        });
    });

    describe('dependencies', () => {
        it('should re-execute when dependencies change', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result, rerender } = renderHook(
                ({ endpoint }) => useApi(endpoint, { 
                    dependencies: [endpoint],
                    immediate: true 
                }),
                { initialProps: { endpoint: '/test1' } }
            );

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(apiClient.request).toHaveBeenCalledTimes(1);

            rerender({ endpoint: '/test2' });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(apiClient.request).toHaveBeenCalledTimes(2);
        });
    });

    describe('cleanup', () => {
        it('should abort request on unmount', async () => {
            const mockResponse = { data: 'success' };
            apiClient.request.mockResolvedValue(mockResponse);

            const { result, unmount } = renderHook(() => useApi('/test', { immediate: false }));

            act(() => {
                result.current.execute();
            });

            unmount();

            // The abort controller should be called on unmount
            expect(result.current.loading).toBe(false);
        });
    });
});
