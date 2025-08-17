import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';

/**
 * CRUD hook factory for creating standardized CRUD operations
 */
export const useCrud = (baseEndpoint, options = {}) => {
    const {
        cacheKey = baseEndpoint,
        optimisticUpdates = true,
        batchOperations = false,
        onCacheUpdate,
        onOptimisticError
    } = options;

    // State for managing multiple operations
    const [operations, setOperations] = useState(new Map());
    const [cache, setCache] = useState(new Map());
    const optimisticUpdatesRef = useRef(new Map());

    // Create API hooks for each operation
    const listApi = useApi(`${baseEndpoint}`, { immediate: false });
    const getApi = useApi(`${baseEndpoint}/:id`, { immediate: false });
    const createApi = useApi(`${baseEndpoint}`, { method: 'POST', immediate: false });
    const updateApi = useApi(`${baseEndpoint}/:id`, { method: 'PUT', immediate: false });
    const patchApi = useApi(`${baseEndpoint}/:id`, { method: 'PATCH', immediate: false });
    const deleteApi = useApi(`${baseEndpoint}/:id`, { method: 'DELETE', immediate: false });

    // Cache management
    const updateCache = useCallback((key, data) => {
        setCache(prev => new Map(prev).set(key, data));
        if (onCacheUpdate) {
            onCacheUpdate(key, data);
        }
    }, [onCacheUpdate]);

    const invalidateCache = useCallback((pattern) => {
        setCache(prev => {
            const newCache = new Map(prev);
            for (const [key] of newCache) {
                if (key.includes(pattern)) {
                    newCache.delete(key);
                }
            }
            return newCache;
        });
    }, []);

    const getFromCache = useCallback((key) => {
        return cache.get(key);
    }, [cache]);

    // Optimistic update management
    const addOptimisticUpdate = useCallback((id, update) => {
        optimisticUpdatesRef.current.set(id, update);
    }, []);

    const removeOptimisticUpdate = useCallback((id) => {
        optimisticUpdatesRef.current.delete(id);
    }, []);

    const getOptimisticUpdate = useCallback((id) => {
        return optimisticUpdatesRef.current.get(id);
    }, []);

    // CRUD Operations
    const list = useCallback(async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;
        
        const result = await listApi.execute(null, null, endpoint);
        if (result) {
            updateCache(cacheKey, result);
        }
        return result;
    }, [baseEndpoint, cacheKey, listApi, updateCache]);

    const get = useCallback(async (id) => {
        const cacheKey = `${baseEndpoint}/${id}`;
        const cached = getFromCache(cacheKey);
        
        if (cached) {
            return cached;
        }

        const endpoint = `${baseEndpoint}/${id}`;
        const result = await getApi.execute(null, null, endpoint);
        if (result) {
            updateCache(cacheKey, result);
        }
        return result;
    }, [baseEndpoint, getApi, getFromCache, updateCache]);

    const create = useCallback(async (data) => {
        // Optimistic update for create
        if (optimisticUpdates) {
            const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const optimisticData = { id: optimisticId, ...data, _isOptimistic: true };
            
            // Add to cache immediately
            updateCache(cacheKey, optimisticData);
            invalidateCache(baseEndpoint);
            
            // Register optimistic update
            addOptimisticUpdate(optimisticId, { 
                type: 'create', 
                data: optimisticData, 
                original: null 
            });
        }

        try {
            const result = await createApi.execute(data);
            if (result && optimisticUpdates) {
                // Replace optimistic data with real data
                updateCache(cacheKey, result);
                invalidateCache(baseEndpoint);
                removeOptimisticUpdate(result.id || `temp_${Date.now()}`);
            }
            return result;
        } catch (error) {
            // Rollback optimistic update
            if (optimisticUpdates) {
                invalidateCache(baseEndpoint);
                if (onOptimisticError) {
                    onOptimisticError(error, 'create', null);
                }
            }
            throw error;
        }
    }, [baseEndpoint, cacheKey, createApi, optimisticUpdates, updateCache, invalidateCache, addOptimisticUpdate, removeOptimisticUpdate, onOptimisticError]);

    const update = useCallback(async (id, data) => {
        const cacheKey = `${baseEndpoint}/${id}`;
        const originalData = getFromCache(cacheKey);

        // Optimistic update
        if (optimisticUpdates && originalData) {
            const optimisticData = { ...originalData, ...data };
            updateCache(cacheKey, optimisticData);
            addOptimisticUpdate(id, { type: 'update', data: optimisticData, original: originalData });
        }

        try {
            const endpoint = `${baseEndpoint}/${id}`;
            const result = await updateApi.execute(data, null, endpoint);
            
            if (result) {
                updateCache(cacheKey, result);
                removeOptimisticUpdate(id);
            }
            return result;
        } catch (error) {
            // Rollback optimistic update
            if (optimisticUpdates && originalData) {
                updateCache(cacheKey, originalData);
                removeOptimisticUpdate(id);
                if (onOptimisticError) {
                    onOptimisticError(error, 'update', id);
                }
            }
            throw error;
        }
    }, [baseEndpoint, updateApi, optimisticUpdates, getFromCache, updateCache, addOptimisticUpdate, removeOptimisticUpdate, onOptimisticError]);

    const patch = useCallback(async (id, data) => {
        const cacheKey = `${baseEndpoint}/${id}`;
        const originalData = getFromCache(cacheKey);

        // Optimistic update
        if (optimisticUpdates && originalData) {
            const optimisticData = { ...originalData, ...data };
            updateCache(cacheKey, optimisticData);
            addOptimisticUpdate(id, { type: 'patch', data: optimisticData, original: originalData });
        }

        try {
            const endpoint = `${baseEndpoint}/${id}`;
            const result = await patchApi.execute(data, null, endpoint);
            
            if (result) {
                updateCache(cacheKey, result);
                removeOptimisticUpdate(id);
            }
            return result;
        } catch (error) {
            // Rollback optimistic update
            if (optimisticUpdates && originalData) {
                updateCache(cacheKey, originalData);
                removeOptimisticUpdate(id);
                if (onOptimisticError) {
                    onOptimisticError(error, 'patch', id);
                }
            }
            throw error;
        }
    }, [baseEndpoint, patchApi, optimisticUpdates, getFromCache, updateCache, addOptimisticUpdate, removeOptimisticUpdate, onOptimisticError]);

    const remove = useCallback(async (id) => {
        const cacheKey = `${baseEndpoint}/${id}`;
        const originalData = getFromCache(cacheKey);

        // Optimistic update
        if (optimisticUpdates && originalData) {
            updateCache(cacheKey, null);
            addOptimisticUpdate(id, { type: 'delete', data: null, original: originalData });
        }

        try {
            const endpoint = `${baseEndpoint}/${id}`;
            const result = await deleteApi.execute(null, null, endpoint);
            
            if (result) {
                updateCache(cacheKey, null);
                removeOptimisticUpdate(id);
                // Invalidate list cache
                invalidateCache(baseEndpoint);
            }
            return result;
        } catch (error) {
            // Rollback optimistic update
            if (optimisticUpdates && originalData) {
                updateCache(cacheKey, originalData);
                removeOptimisticUpdate(id);
                if (onOptimisticError) {
                    onOptimisticError(error, 'delete', id);
                }
            }
            throw error;
        }
    }, [baseEndpoint, deleteApi, optimisticUpdates, getFromCache, updateCache, addOptimisticUpdate, removeOptimisticUpdate, invalidateCache, onOptimisticError]);

    // Batch operations
    const batchCreate = useCallback(async (items) => {
        if (!batchOperations) {
            throw new Error('Batch operations not enabled');
        }

        const results = await Promise.allSettled(
            items.map(item => create(item))
        );

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

        return { successful, failed };
    }, [batchOperations, create]);

    const batchUpdate = useCallback(async (updates) => {
        if (!batchOperations) {
            throw new Error('Batch operations not enabled');
        }

        const results = await Promise.allSettled(
            updates.map(({ id, data }) => update(id, data))
        );

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

        return { successful, failed };
    }, [batchOperations, update]);

    const batchDelete = useCallback(async (ids) => {
        if (!batchOperations) {
            throw new Error('Batch operations not enabled');
        }

        const results = await Promise.allSettled(
            ids.map(id => remove(id))
        );

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

        return { successful, failed };
    }, [batchOperations, remove]);

    return {
        // CRUD operations
        list,
        get,
        create,
        update,
        patch,
        remove,

        // Batch operations
        batchCreate,
        batchUpdate,
        batchDelete,

        // Cache management
        cache,
        getFromCache,
        updateCache,
        invalidateCache,

        // Optimistic updates
        optimisticUpdates: optimisticUpdatesRef.current,
        getOptimisticUpdate,

        // API states
        listLoading: listApi.loading,
        getLoading: getApi.loading,
        createLoading: createApi.loading,
        updateLoading: updateApi.loading,
        patchLoading: patchApi.loading,
        deleteLoading: deleteApi.loading,

        // API errors
        listError: listApi.error,
        getError: getApi.error,
        createError: createApi.error,
        updateError: updateApi.error,
        patchError: patchApi.error,
        deleteError: deleteApi.error,

        // Utilities
        isLoading: listApi.loading || getApi.loading || createApi.loading || updateApi.loading || patchApi.loading || deleteApi.loading,
        hasError: !!(listApi.error || getApi.error || createApi.error || updateApi.error || patchApi.error || deleteApi.error)
    };
};
