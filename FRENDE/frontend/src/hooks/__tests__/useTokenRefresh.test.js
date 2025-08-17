import { renderHook, act } from '@testing-library/react';
import { useTokenRefresh } from '../useTokenRefresh';
import { useAuth } from '../useAuth';
import tokenManager from '../../lib/tokenManager';

// Mock dependencies
jest.mock('../useAuth');
jest.mock('../../lib/tokenManager');

describe('useTokenRefresh', () => {
    let mockRefreshTokens;
    let mockLogout;
    let mockGetTokenInfo;
    let mockOnTokenRefresh;
    let mockOffTokenRefresh;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup mock functions
        mockRefreshTokens = jest.fn();
        mockLogout = jest.fn();
        mockGetTokenInfo = jest.fn();
        mockOnTokenRefresh = jest.fn();
        mockOffTokenRefresh = jest.fn();

        // Mock useAuth
        useAuth.mockReturnValue({
            refreshTokens: mockRefreshTokens,
            logout: mockLogout,
        });

        // Mock tokenManager
        tokenManager.getTokenInfo = mockGetTokenInfo;
        tokenManager.onTokenRefresh = mockOnTokenRefresh;
        tokenManager.offTokenRefresh = mockOffTokenRefresh;

        // Mock timers
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('initialization', () => {
        it('should set up token refresh listener on mount', () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            renderHook(() => useTokenRefresh());

            expect(mockOnTokenRefresh).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should clean up token refresh listener on unmount', () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            const { unmount } = renderHook(() => useTokenRefresh());

            unmount();

            expect(mockOffTokenRefresh).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should start periodic token checks', () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            renderHook(() => useTokenRefresh());

            // Fast-forward time to trigger periodic check
            act(() => {
                jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
            });

            expect(mockGetTokenInfo).toHaveBeenCalledTimes(2); // Initial + periodic
        });
    });

    describe('checkAndRefreshToken', () => {
        it('should do nothing when no access token is present', async () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: false,
            });

            const { result } = renderHook(() => useTokenRefresh());

            await act(async () => {
                await result.current.checkAndRefreshToken();
            });

            expect(mockRefreshTokens).not.toHaveBeenCalled();
        });

        it('should refresh token when expired', async () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: true,
            });

            const { result } = renderHook(() => useTokenRefresh());

            await act(async () => {
                await result.current.checkAndRefreshToken();
            });

            expect(mockRefreshTokens).toHaveBeenCalled();
        });

        it('should refresh token when expiring soon', async () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: true,
            });

            const { result } = renderHook(() => useTokenRefresh());

            await act(async () => {
                await result.current.checkAndRefreshToken();
            });

            expect(mockRefreshTokens).toHaveBeenCalled();
        });

        it('should not refresh token when valid', async () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            const { result } = renderHook(() => useTokenRefresh());

            await act(async () => {
                await result.current.checkAndRefreshToken();
            });

            expect(mockRefreshTokens).not.toHaveBeenCalled();
        });

        it('should logout user when refresh fails', async () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: true,
            });
            mockRefreshTokens.mockRejectedValue(new Error('Refresh failed'));

            const { result } = renderHook(() => useTokenRefresh());

            await act(async () => {
                await result.current.checkAndRefreshToken();
            });

            expect(mockLogout).toHaveBeenCalled();
        });
    });

    describe('manualRefresh', () => {
        it('should successfully refresh tokens', async () => {
            mockRefreshTokens.mockResolvedValue({ accessToken: 'new-token' });

            const { result } = renderHook(() => useTokenRefresh());

            let refreshResult;
            await act(async () => {
                refreshResult = await result.current.manualRefresh();
            });

            expect(refreshResult).toEqual({ success: true });
            expect(mockRefreshTokens).toHaveBeenCalled();
        });

        it('should handle refresh failure', async () => {
            const refreshError = new Error('Refresh failed');
            mockRefreshTokens.mockRejectedValue(refreshError);

            const { result } = renderHook(() => useTokenRefresh());

            let refreshResult;
            await act(async () => {
                refreshResult = await result.current.manualRefresh();
            });

            expect(refreshResult).toEqual({ success: false, error: refreshError });
            expect(mockRefreshTokens).toHaveBeenCalled();
        });
    });

    describe('getTokenStatus', () => {
        it('should return current token status', () => {
            const mockTokenInfo = {
                hasAccessToken: true,
                hasRefreshToken: true,
                isExpired: false,
                isExpiringSoon: false,
                isRefreshing: false,
            };
            mockGetTokenInfo.mockReturnValue(mockTokenInfo);

            const { result } = renderHook(() => useTokenRefresh());

            const tokenStatus = result.current.getTokenStatus();

            expect(tokenStatus).toEqual(mockTokenInfo);
            expect(mockGetTokenInfo).toHaveBeenCalled();
        });
    });

    describe('periodic token checks', () => {
        it('should check tokens every 5 minutes', () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            renderHook(() => useTokenRefresh());

            // Initial check
            expect(mockGetTokenInfo).toHaveBeenCalledTimes(1);

            // After 5 minutes
            act(() => {
                jest.advanceTimersByTime(5 * 60 * 1000);
            });
            expect(mockGetTokenInfo).toHaveBeenCalledTimes(2);

            // After 10 minutes
            act(() => {
                jest.advanceTimersByTime(5 * 60 * 1000);
            });
            expect(mockGetTokenInfo).toHaveBeenCalledTimes(3);
        });

        it('should clean up intervals on unmount', () => {
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            const { unmount } = renderHook(() => useTokenRefresh());

            // Verify interval is set up
            expect(mockGetTokenInfo).toHaveBeenCalledTimes(1);

            unmount();

            // Fast-forward time - should not trigger more calls
            act(() => {
                jest.advanceTimersByTime(5 * 60 * 1000);
            });

            expect(mockGetTokenInfo).toHaveBeenCalledTimes(1);
        });
    });

    describe('token refresh listener', () => {
        it('should log successful token refresh', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockGetTokenInfo.mockReturnValue({
                hasAccessToken: true,
                isExpired: false,
                isExpiringSoon: false,
            });

            renderHook(() => useTokenRefresh());

            // Get the callback function that was passed to onTokenRefresh
            const refreshCallback = mockOnTokenRefresh.mock.calls[0][0];

            // Simulate token refresh
            act(() => {
                refreshCallback({ accessToken: 'new-token' });
            });

            expect(consoleSpy).toHaveBeenCalledWith('Token refresh successful');

            consoleSpy.mockRestore();
        });
    });
});
