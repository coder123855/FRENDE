import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';
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

            console.log('AuthContext: Initializing authentication...');

            // Check if we have valid tokens
            const tokenInfo = tokenManager.getTokenInfo();
            console.log('AuthContext: Token info:', tokenInfo);
            setTokenInfo(tokenInfo);

            if (tokenInfo && tokenInfo.accessToken) {
                console.log('AuthContext: Found access token, fetching user data...');
                // Fetch current user data
                try {
                    const userData = await authAPI.me();
                    console.log('AuthContext: User data response:', userData);
                    
                    // Handle different response formats
                    let user = null;
                    if (userData.data && userData.data.user) {
                        user = userData.data.user;
                    } else if (userData.data) {
                        user = userData.data;
                    } else if (userData.user) {
                        user = userData.user;
                    } else {
                        user = userData;
                    }
                    
                    console.log('AuthContext: Extracted user data:', user);
                    setUser(user);
                    setIsAuthenticated(true);
                    console.log('AuthContext: User authenticated successfully');
                } catch (userError) {
                    console.error('AuthContext: Error fetching user data:', userError);
                    setError('Failed to fetch user data');
                    setUser(null);
                    setIsAuthenticated(false);
                    await tokenManager.clearTokens();
                }
            } else {
                console.log('AuthContext: No valid tokens found');
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('AuthContext: Auth initialization error:', error);
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

            console.log('AuthContext: Attempting login...');

            const response = await authAPI.login(credentials);
            console.log('AuthContext: Login response:', response);
            
            // Handle different response formats
            let tokens = null;
            let userData = null;
            
            if (response.data) {
                tokens = {
                    access_token: response.data.access_token,
                    refresh_token: response.data.refresh_token,
                    session_id: response.data.session_id
                };
                userData = response.data.user;
            } else if (response.access_token) {
                tokens = {
                    access_token: response.access_token,
                    refresh_token: response.refresh_token,
                    session_id: response.session_id
                };
                userData = response.user;
            }
            
            // Store tokens securely
            if (tokens && tokens.access_token && tokens.refresh_token) {
                console.log('AuthContext: Storing tokens...');
                tokenManager.storeTokens(
                    tokens.access_token,
                    tokens.refresh_token,
                    tokens.session_id
                );
            } else {
                console.error('AuthContext: No tokens found in response');
            }

            console.log('AuthContext: Setting user data:', userData);
            setUser(userData);
            setIsAuthenticated(true);
            setTokenInfo(tokenManager.getTokenInfo());

            return response;
        } catch (error) {
            console.error('AuthContext: Login error:', error);
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

            const response = await authAPI.register(userData);
            
            // Auto-login after successful registration
            if (response.data.access_token && response.data.refresh_token) {
                tokenManager.storeTokens(
                    response.data.access_token,
                    response.data.refresh_token,
                    response.data.session_id
                );
            }

            setUser(response.data.user);
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
            await authAPI.logout();
            
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

            const response = await authAPI.updateProfile(profileData);
            
            // Handle different response formats
            let userData = null;
            if (response.data) {
                userData = response.data;
            } else if (response.user) {
                userData = response.user;
            } else {
                userData = response;
            }
            
            setUser(userData);
            return userData;
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

            const response = await authAPI.changePassword(passwordData);
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
            const response = await authAPI.getUserSessions();
            return response;
        } catch (error) {
            console.error('Get sessions error:', error);
            throw error;
        }
    }, []);

    const revokeSession = useCallback(async (sessionId) => {
        try {
            const response = await authAPI.revokeSession(sessionId);
            return response;
        } catch (error) {
            console.error('Revoke session error:', error);
            throw error;
        }
    }, []);

    const revokeAllSessions = useCallback(async () => {
        try {
            const response = await authAPI.revokeAllSessions();
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
