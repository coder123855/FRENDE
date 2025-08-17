import { useCallback, useRef } from 'react';
import { useOptimistic } from '../contexts/OptimisticContext';

/**
 * Hook for managing optimistic updates
 * @param {Object} options - Configuration options
 * @returns {Object} Optimistic update functions and state
 */
export const useOptimisticUpdate = (options = {}) => {
    const {
        type = 'immediate',
        timeout = 30000,
        retryCount = 3,
        onSuccess,
        onError,
        onConflict,
        autoRollback = true
    } = options;

    const optimistic = useOptimistic();
    const updateRefs = useRef(new Map());

    /**
     * Create an optimistic update
     * @param {string} id - Unique identifier for the update
     * @param {Object} update - Update data
     * @param {Function} rollbackFn - Function to call for rollback
     * @param {Object} updateOptions - Additional options for this specific update
     */
    const createUpdate = useCallback((id, update, rollbackFn, updateOptions = {}) => {
        const finalOptions = {
            type,
            timeout,
            retryCount,
            onSuccess,
            onError,
            onConflict,
            autoRollback,
            ...updateOptions
        };

        const updateId = optimistic.registerUpdate(id, update, rollbackFn, finalOptions);
        updateRefs.current.set(updateId, { id, update, rollbackFn, options: finalOptions });

        return updateId;
    }, [optimistic, type, timeout, retryCount, onSuccess, onError, onConflict, autoRollback]);

    /**
     * Mark an update as successful
     * @param {string} id - Update identifier
     * @param {*} result - Result from server
     */
    const markSuccess = useCallback((id, result) => {
        optimistic.markSuccess(id, result);
        updateRefs.current.delete(id);
    }, [optimistic]);

    /**
     * Mark an update as failed
     * @param {string} id - Update identifier
     * @param {Error} error - Error that occurred
     */
    const markFailure = useCallback((id, error) => {
        optimistic.markFailure(id, error);
        updateRefs.current.delete(id);
    }, [optimistic]);

    /**
     * Handle conflict between optimistic and server data
     * @param {string} id - Update identifier
     * @param {Object} serverData - Data from server
     * @param {Object} optimisticData - Optimistic data
     */
    const handleConflict = useCallback((id, serverData, optimisticData) => {
        optimistic.handleConflict(id, serverData, optimisticData);
    }, [optimistic]);

    /**
     * Resolve a conflict
     * @param {string} id - Update identifier
     * @param {string} resolution - Resolution strategy
     */
    const resolveConflict = useCallback((id, resolution) => {
        optimistic.resolveConflict(id, resolution);
    }, [optimistic]);

    /**
     * Check if an update is pending
     * @param {string} id - Update identifier
     * @returns {boolean} True if update is pending
     */
    const isPending = useCallback((id) => {
        return optimistic.isPending(id);
    }, [optimistic]);

    /**
     * Get update status
     * @param {string} id - Update identifier
     * @returns {string|null} Update status
     */
    const getUpdateStatus = useCallback((id) => {
        return optimistic.getUpdateStatus(id);
    }, [optimistic]);

    /**
     * Create an optimistic update with automatic API integration
     * @param {string} id - Unique identifier
     * @param {Object} update - Update data
     * @param {Function} rollbackFn - Rollback function
     * @param {Function} apiCall - API function to call
     * @param {Object} apiOptions - Options for API call
     */
    const createUpdateWithAPI = useCallback(async (id, update, rollbackFn, apiCall, apiOptions = {}) => {
        const updateId = createUpdate(id, update, rollbackFn, {
            onSuccess: (result) => {
                if (apiOptions.onSuccess) {
                    apiOptions.onSuccess(result);
                }
            },
            onError: (error) => {
                if (apiOptions.onError) {
                    apiOptions.onError(error);
                }
            },
            onConflict: (serverData, optimisticData) => {
                if (apiOptions.onConflict) {
                    apiOptions.onConflict(serverData, optimisticData);
                }
            }
        });

        try {
            const result = await apiCall();
            markSuccess(updateId, result);
            return result;
        } catch (error) {
            markFailure(updateId, error);
            throw error;
        }
    }, [createUpdate, markSuccess, markFailure]);

    /**
     * Create a debounced optimistic update
     * @param {string} id - Unique identifier
     * @param {Object} update - Update data
     * @param {Function} rollbackFn - Rollback function
     * @param {number} delay - Delay in milliseconds
     * @param {Object} options - Additional options
     */
    const createDebouncedUpdate = useCallback((id, update, rollbackFn, delay = 1000, options = {}) => {
        const debouncedId = `${id}_debounced`;
        
        // Clear existing timeout if any
        if (updateRefs.current.has(debouncedId)) {
            clearTimeout(updateRefs.current.get(debouncedId).timeoutId);
        }

        const timeoutId = setTimeout(() => {
            createUpdate(id, update, rollbackFn, { type: 'debounced', ...options });
            updateRefs.current.delete(debouncedId);
        }, delay);

        updateRefs.current.set(debouncedId, { timeoutId, type: 'debounced' });
    }, [createUpdate]);

    /**
     * Create a conditional optimistic update
     * @param {string} id - Unique identifier
     * @param {Object} update - Update data
     * @param {Function} rollbackFn - Rollback function
     * @param {Function} condition - Condition function that returns boolean
     * @param {Object} options - Additional options
     */
    const createConditionalUpdate = useCallback((id, update, rollbackFn, condition, options = {}) => {
        if (condition()) {
            return createUpdate(id, update, rollbackFn, { type: 'conditional', ...options });
        }
        return null;
    }, [createUpdate]);

    /**
     * Create a progressive optimistic update
     * @param {string} id - Unique identifier
     * @param {Array} stages - Array of update stages
     * @param {Function} rollbackFn - Rollback function
     * @param {Object} options - Additional options
     */
    const createProgressiveUpdate = useCallback((id, stages, rollbackFn, options = {}) => {
        const stageResults = [];
        let currentStage = 0;

        const executeStage = async () => {
            if (currentStage >= stages.length) {
                return stageResults;
            }

            const stage = stages[currentStage];
            const stageId = `${id}_stage_${currentStage}`;
            
            try {
                const result = await stage.execute();
                stageResults.push(result);
                currentStage++;
                
                if (currentStage < stages.length) {
                    return executeStage();
                }
                
                return stageResults;
            } catch (error) {
                // Rollback all previous stages
                for (let i = stageResults.length - 1; i >= 0; i--) {
                    if (stages[i].rollback) {
                        await stages[i].rollback(stageResults[i]);
                    }
                }
                throw error;
            }
        };

        return executeStage();
    }, []);

    /**
     * Clear all pending updates
     */
    const clearAll = useCallback(() => {
        optimistic.clearAll();
        updateRefs.current.clear();
    }, [optimistic]);

    /**
     * Get all pending updates for this hook
     */
    const getPendingUpdates = useCallback(() => {
        return Array.from(updateRefs.current.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }, []);

    return {
        // Core functions
        createUpdate,
        markSuccess,
        markFailure,
        handleConflict,
        resolveConflict,
        isPending,
        getUpdateStatus,
        
        // Advanced functions
        createUpdateWithAPI,
        createDebouncedUpdate,
        createConditionalUpdate,
        createProgressiveUpdate,
        
        // Utility functions
        clearAll,
        getPendingUpdates,
        
        // State from context
        pendingUpdates: optimistic.pendingUpdates,
        updateHistory: optimistic.updateHistory,
        analytics: optimistic.analytics,
        hasPendingUpdates: optimistic.hasPendingUpdates,
        pendingCount: optimistic.pendingCount
    };
};

/**
 * Hook for optimistic updates with specific type
 * @param {string} type - Update type
 * @param {Object} options - Additional options
 */
export const useOptimisticUpdateByType = (type, options = {}) => {
    return useOptimisticUpdate({ type, ...options });
};

/**
 * Hook for immediate optimistic updates
 * @param {Object} options - Additional options
 */
export const useImmediateOptimisticUpdate = (options = {}) => {
    return useOptimisticUpdate({ type: 'immediate', ...options });
};

/**
 * Hook for debounced optimistic updates
 * @param {Object} options - Additional options
 */
export const useDebouncedOptimisticUpdate = (options = {}) => {
    return useOptimisticUpdate({ type: 'debounced', ...options });
};
