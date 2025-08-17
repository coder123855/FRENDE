import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import tokenManager from '../lib/tokenManager';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [tokenInfo, setTokenInfo] = useState(null);

    // Initialize authentication state
    useEffect(() => {
        initializeAuth();
    }, []);

    // Set up token refresh listener
    useEffect(() => {
        const handleTokenRefresh = (tokens) => {
            console.log('Tokens refreshed successfully');
            // Update token info
            setTokenInfo(tokenManager.getTokenInfo());
        };

        tokenManager.onTokenRefresh(handleTokenRefresh);

        return () => {
            tokenManager.offTokenRefresh(handleTokenRefresh);
        };
    }, []);

    const initializeAuth = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if we have valid tokens
            const authStatus = await apiClient.getAuthStatus();
            setTokenInfo(authStatus.tokenInfo);

            if (authStatus.isAuthenticated) {
                // Fetch current user data
                const userData = await apiClient.get('/auth/me');
                setUser(userData);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            setError('Failed to initialize authentication');
            setUser(null);
            setIsAuthenticated(false);
            
            // Clear invalid tokens
            await tokenManager.clearTokens();
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback(async (credentials) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.post('/auth/login', credentials);
            
            // Store tokens securely
            if (response.access_token && response.refresh_token) {
                tokenManager.storeTokens(
                    response.access_token,
                    response.refresh_token,
                    response.session_id
                );
            }

            setUser(response.user);
            setIsAuthenticated(true);
            setTokenInfo(tokenManager.getTokenInfo());

            return response;
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.detail || 'Login failed');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.post('/auth/register', userData);
            
            // Auto-login after successful registration
            if (response.access_token && response.refresh_token) {
                tokenManager.storeTokens(
                    response.access_token,
                    response.refresh_token,
                    response.session_id
                );
            }

            setUser(response.user);
            setIsAuthenticated(true);
            setTokenInfo(tokenManager.getTokenInfo());

            return response;
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.response?.data?.detail || 'Registration failed');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            setLoading(true);
            
            // Call logout endpoint and clear tokens
            await apiClient.logout();
            
            setUser(null);
            setIsAuthenticated(false);
            setTokenInfo(null);
            setError(null);
        } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local state
            setUser(null);
            setIsAuthenticated(false);
            setTokenInfo(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshTokens = useCallback(async () => {
        try {
            const result = await tokenManager.refreshTokens();
            setTokenInfo(tokenManager.getTokenInfo());
            return result;
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, logout user
            await logout();
            throw error;
        }
    }, [logout]);

    const updateProfile = useCallback(async (profileData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.put('/auth/profile', profileData);
            setUser(response);
            return response;
        } catch (error) {
            console.error('Profile update error:', error);
            setError(error.response?.data?.detail || 'Profile update failed');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const changePassword = useCallback(async (passwordData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.post('/auth/change-password', passwordData);
            return response;
        } catch (error) {
            console.error('Password change error:', error);
            setError(error.response?.data?.detail || 'Password change failed');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const getUserSessions = useCallback(async () => {
        try {
            const response = await apiClient.get('/auth/sessions');
            return response;
        } catch (error) {
            console.error('Get sessions error:', error);
            throw error;
        }
    }, []);

    const revokeSession = useCallback(async (sessionId) => {
        try {
            const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
            return response;
        } catch (error) {
            console.error('Revoke session error:', error);
            throw error;
        }
    }, []);

    const revokeAllSessions = useCallback(async () => {
        try {
            const response = await apiClient.delete('/auth/sessions');
            return response;
        } catch (error) {
            console.error('Revoke all sessions error:', error);
            throw error;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        loading,
        error,
        isAuthenticated,
        tokenInfo,
        login,
        register,
        logout,
        refreshTokens,
        updateProfile,
        changePassword,
        getUserSessions,
        revokeSession,
        revokeAllSessions,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
