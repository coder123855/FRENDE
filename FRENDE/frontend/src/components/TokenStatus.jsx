import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import tokenManager from '../lib/tokenManager';

/**
 * Component for displaying token status and management
 */
export const TokenStatus = ({ showDetails = false }) => {
    const { tokenInfo, getUserSessions, revokeSession, revokeAllSessions } = useAuth();
    const { manualRefresh, getTokenStatus } = useTokenRefresh();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentTokenInfo, setCurrentTokenInfo] = useState(null);

    useEffect(() => {
        if (showDetails) {
            loadSessions();
        }
        updateTokenInfo();
    }, [showDetails]);

    const updateTokenInfo = () => {
        setCurrentTokenInfo(getTokenStatus());
    };

    const loadSessions = async () => {
        try {
            setLoading(true);
            const sessionsData = await getUserSessions();
            setSessions(sessionsData);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshToken = async () => {
        try {
            setLoading(true);
            const result = await manualRefresh();
            if (result.success) {
                updateTokenInfo();
                alert('Token refreshed successfully!');
            } else {
                alert('Token refresh failed');
            }
        } catch (error) {
            alert('Token refresh failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            await revokeSession(sessionId);
            await loadSessions();
            alert('Session revoked successfully!');
        } catch (error) {
            alert('Failed to revoke session');
        }
    };

    const handleRevokeAllSessions = async () => {
        if (window.confirm('Are you sure you want to revoke all sessions? This will log you out from all devices.')) {
            try {
                await revokeAllSessions();
                await loadSessions();
                alert('All sessions revoked successfully!');
            } catch (error) {
                alert('Failed to revoke all sessions');
            }
        }
    };

    if (!currentTokenInfo) {
        return <div>Loading token status...</div>;
    }

    return (
        <div className="token-status">
            <div className="token-status-header">
                <h3>Authentication Status</h3>
                <button 
                    onClick={handleRefreshToken}
                    disabled={loading}
                    className="btn btn-sm btn-primary"
                >
                    {loading ? 'Refreshing...' : 'Refresh Token'}
                </button>
            </div>

            <div className="token-info">
                <div className="token-status-item">
                    <span>Access Token:</span>
                    <span className={currentTokenInfo.hasAccessToken ? 'status-ok' : 'status-error'}>
                        {currentTokenInfo.hasAccessToken ? 'Present' : 'Missing'}
                    </span>
                </div>
                
                <div className="token-status-item">
                    <span>Refresh Token:</span>
                    <span className={currentTokenInfo.hasRefreshToken ? 'status-ok' : 'status-error'}>
                        {currentTokenInfo.hasRefreshToken ? 'Present' : 'Missing'}
                    </span>
                </div>
                
                <div className="token-status-item">
                    <span>Token Status:</span>
                    <span className={
                        currentTokenInfo.isExpired ? 'status-error' :
                        currentTokenInfo.isExpiringSoon ? 'status-warning' : 'status-ok'
                    }>
                        {currentTokenInfo.isExpired ? 'Expired' :
                         currentTokenInfo.isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                    </span>
                </div>
                
                <div className="token-status-item">
                    <span>Refresh Status:</span>
                    <span className={currentTokenInfo.isRefreshing ? 'status-warning' : 'status-ok'}>
                        {currentTokenInfo.isRefreshing ? 'Refreshing...' : 'Idle'}
                    </span>
                </div>
            </div>

            {showDetails && (
                <div className="sessions-section">
                    <div className="sessions-header">
                        <h4>Active Sessions</h4>
                        <button 
                            onClick={handleRevokeAllSessions}
                            className="btn btn-sm btn-danger"
                        >
                            Revoke All
                        </button>
                    </div>
                    
                    {loading ? (
                        <div>Loading sessions...</div>
                    ) : (
                        <div className="sessions-list">
                            {sessions.length === 0 ? (
                                <div>No active sessions</div>
                            ) : (
                                sessions.map((session) => (
                                    <div key={session.id} className="session-item">
                                        <div className="session-info">
                                            <div>Session ID: {session.id}</div>
                                            <div>Created: {new Date(session.created_at).toLocaleString()}</div>
                                            <div>Last Activity: {new Date(session.last_activity).toLocaleString()}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleRevokeSession(session.id)}
                                            className="btn btn-sm btn-outline-danger"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .token-status {
                    padding: 1rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    background: #f8fafc;
                }
                
                .token-status-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .token-status-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .token-info {
                    display: grid;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .token-status-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem;
                    background: white;
                    border-radius: 0.25rem;
                }
                
                .status-ok {
                    color: #059669;
                    font-weight: 500;
                }
                
                .status-warning {
                    color: #d97706;
                    font-weight: 500;
                }
                
                .status-error {
                    color: #dc2626;
                    font-weight: 500;
                }
                
                .sessions-section {
                    border-top: 1px solid #e2e8f0;
                    padding-top: 1rem;
                }
                
                .sessions-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .sessions-header h4 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .sessions-list {
                    display: grid;
                    gap: 0.5rem;
                }
                
                .session-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    background: white;
                    border-radius: 0.25rem;
                    border: 1px solid #e2e8f0;
                }
                
                .session-info {
                    font-size: 0.875rem;
                }
                
                .session-info div {
                    margin-bottom: 0.25rem;
                }
                
                .btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.25rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background: #2563eb;
                }
                
                .btn-danger {
                    background: #dc2626;
                    color: white;
                }
                
                .btn-danger:hover:not(:disabled) {
                    background: #b91c1c;
                }
                
                .btn-outline-danger {
                    background: transparent;
                    color: #dc2626;
                    border: 1px solid #dc2626;
                }
                
                .btn-outline-danger:hover:not(:disabled) {
                    background: #dc2626;
                    color: white;
                }
                
                .btn-sm {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                }
            `}</style>
        </div>
    );
};
