import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import optimisticUpdateManager from '../lib/optimisticUpdateManager';

const OptimisticContext = createContext();

export const useOptimistic = () => {
    const context = useContext(OptimisticContext);
    if (!context) {
        throw new Error('useOptimistic must be used within an OptimisticProvider');
    }
    return context;
};

export const OptimisticProvider = ({ children }) => {
    const [pendingUpdates, setPendingUpdates] = useState(new Map());
    const [updateHistory, setUpdateHistory] = useState([]);
    const [analytics, setAnalytics] = useState({
        totalUpdates: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        rollbacks: 0,
        conflicts: 0
    });

    // Listen for optimistic update status changes
    useEffect(() => {
        const handleUpdateStatus = (event) => {
            const { id, status, data, timestamp } = event.detail;
            
            setPendingUpdates(prev => {
                const newMap = new Map(prev);
                
                if (status === 'success' || status === 'failed') {
                    newMap.delete(id);
                } else {
                    newMap.set(id, { status, data, timestamp });
                }
                
                return newMap;
            });

            // Add to history
            setUpdateHistory(prev => [
                { id, status, data, timestamp },
                ...prev.slice(0, 99) // Keep last 100 updates
            ]);

            // Update analytics
            setAnalytics(optimisticUpdateManager.getAnalytics());
        };

        window.addEventListener('optimistic-update-status', handleUpdateStatus);

        return () => {
            window.removeEventListener('optimistic-update-status', handleUpdateStatus);
        };
    }, []);

    // Initialize pending updates from manager
    useEffect(() => {
        const updates = optimisticUpdateManager.getPendingUpdates();
        const updatesMap = new Map();
        
        updates.forEach(update => {
            updatesMap.set(update.id, {
                status: update.status,
                data: update.update,
                timestamp: update.timestamp
            });
        });
        
        setPendingUpdates(updatesMap);
        setAnalytics(optimisticUpdateManager.getAnalytics());
    }, []);

    // Register an optimistic update
    const registerUpdate = useCallback((id, update, rollbackFn, options = {}) => {
        return optimisticUpdateManager.registerUpdate(id, update, rollbackFn, options);
    }, []);

    // Mark an update as successful
    const markSuccess = useCallback((id, result) => {
        optimisticUpdateManager.markSuccess(id, result);
    }, []);

    // Mark an update as failed
    const markFailure = useCallback((id, error) => {
        optimisticUpdateManager.markFailure(id, error);
    }, []);

    // Handle conflict
    const handleConflict = useCallback((id, serverData, optimisticData) => {
        optimisticUpdateManager.handleConflict(id, serverData, optimisticData);
    }, []);

    // Resolve conflict
    const resolveConflict = useCallback((id, resolution) => {
        optimisticUpdateManager.resolveConflict(id, resolution);
    }, []);

    // Check if an update is pending
    const isPending = useCallback((id) => {
        return optimisticUpdateManager.isPending(id);
    }, []);

    // Get update status
    const getUpdateStatus = useCallback((id) => {
        return optimisticUpdateManager.getUpdateStatus(id);
    }, []);

    // Get pending updates by type
    const getPendingUpdatesByType = useCallback((type) => {
        return optimisticUpdateManager.getPendingUpdatesByType(type);
    }, []);

    // Clear all pending updates
    const clearAll = useCallback(() => {
        optimisticUpdateManager.clearAll();
        setPendingUpdates(new Map());
    }, []);

    // Get all pending updates
    const getAllPendingUpdates = useCallback(() => {
        return Array.from(pendingUpdates.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }, [pendingUpdates]);

    // Get update history
    const getUpdateHistory = useCallback(() => {
        return updateHistory;
    }, [updateHistory]);

    // Clear update history
    const clearHistory = useCallback(() => {
        setUpdateHistory([]);
    }, []);

    // Get analytics
    const getAnalytics = useCallback(() => {
        return analytics;
    }, [analytics]);

    // Reset analytics
    const resetAnalytics = useCallback(() => {
        optimisticUpdateManager.resetAnalytics();
        setAnalytics(optimisticUpdateManager.getAnalytics());
    }, []);

    // Register conflict resolver
    const registerConflictResolver = useCallback((type, resolver) => {
        optimisticUpdateManager.registerConflictResolver(type, resolver);
    }, []);

    // Get conflict resolver
    const getConflictResolver = useCallback((type) => {
        return optimisticUpdateManager.getConflictResolver(type);
    }, []);

    const value = {
        // State
        pendingUpdates: getAllPendingUpdates(),
        updateHistory: getUpdateHistory(),
        analytics: getAnalytics(),
        
        // Actions
        registerUpdate,
        markSuccess,
        markFailure,
        handleConflict,
        resolveConflict,
        isPending,
        getUpdateStatus,
        getPendingUpdatesByType,
        clearAll,
        clearHistory,
        resetAnalytics,
        registerConflictResolver,
        getConflictResolver,
        
        // Utilities
        hasPendingUpdates: pendingUpdates.size > 0,
        pendingCount: pendingUpdates.size
    };

    return (
        <OptimisticContext.Provider value={value}>
            {children}
        </OptimisticContext.Provider>
    );
};

// Debug component for development
export const OptimisticDebug = () => {
    const { pendingUpdates, analytics, clearAll, clearHistory, resetAnalytics } = useOptimistic();

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
            <div className="font-bold mb-2">Optimistic Updates Debug</div>
            <div className="space-y-1">
                <div>Pending: {pendingUpdates.length}</div>
                <div>Total: {analytics.totalUpdates}</div>
                <div>Success: {analytics.successfulUpdates}</div>
                <div>Failed: {analytics.failedUpdates}</div>
                <div>Rollbacks: {analytics.rollbacks}</div>
                <div>Conflicts: {analytics.conflicts}</div>
            </div>
            <div className="mt-2 space-x-2">
                <button 
                    onClick={clearAll}
                    className="bg-red-600 px-2 py-1 rounded text-xs"
                >
                    Clear All
                </button>
                <button 
                    onClick={clearHistory}
                    className="bg-gray-600 px-2 py-1 rounded text-xs"
                >
                    Clear History
                </button>
                <button 
                    onClick={resetAnalytics}
                    className="bg-blue-600 px-2 py-1 rounded text-xs"
                >
                    Reset Analytics
                </button>
            </div>
        </div>
    );
};
