import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import tokenManager from '../lib/tokenManager';

/**
 * Hook for managing token refresh and monitoring
 */
export const useTokenRefresh = () => {
    const { refreshTokens, logout } = useAuth();
    const refreshIntervalRef = useRef(null);
    const warningTimeoutRef = useRef(null);

    // Check token status and refresh if needed
    const checkAndRefreshToken = useCallback(async () => {
        try {
            const tokenInfo = tokenManager.getTokenInfo();
            
            if (!tokenInfo.hasAccessToken) {
                console.log('No access token found');
                return;
            }

            if (tokenInfo.isExpired) {
                console.log('Token expired, attempting refresh');
                await refreshTokens();
            } else if (tokenInfo.isExpiringSoon) {
                console.log('Token expiring soon, refreshing proactively');
                await refreshTokens();
            }
        } catch (error) {
            console.error('Token refresh check failed:', error);
            // If refresh fails, logout user
            await logout();
        }
    }, [refreshTokens, logout]);

    // Set up periodic token checks
    useEffect(() => {
        // Check token every 5 minutes
        refreshIntervalRef.current = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

        // Initial check
        checkAndRefreshToken();

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
        };
    }, [checkAndRefreshToken]);

    // Set up token refresh listener
    useEffect(() => {
        const handleTokenRefresh = (tokens) => {
            console.log('Token refresh successful');
        };

        tokenManager.onTokenRefresh(handleTokenRefresh);

        return () => {
            tokenManager.offTokenRefresh(handleTokenRefresh);
        };
    }, []);

    // Manual refresh function
    const manualRefresh = useCallback(async () => {
        try {
            await refreshTokens();
            return { success: true };
        } catch (error) {
            console.error('Manual token refresh failed:', error);
            return { success: false, error };
        }
    }, [refreshTokens]);

    // Get current token status
    const getTokenStatus = useCallback(() => {
        return tokenManager.getTokenInfo();
    }, []);

    return {
        checkAndRefreshToken,
        manualRefresh,
        getTokenStatus,
    };
};
