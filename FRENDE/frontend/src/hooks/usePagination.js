import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi } from './useApi';

/**
 * Pagination hook for managing paginated data with infinite scroll support
 */
export const usePagination = (endpoint, options = {}) => {
    const {
        pageSize = 20,
        initialPage = 1,
        paginationType = 'offset', // 'offset' or 'cursor'
        searchParams = {},
        filters = {},
        sortBy = null,
        sortOrder = 'asc',
        autoLoad = true,
        deduplicate = true,
        onDataChange,
        onError
    } = options;

    // State management
    const [data, setData] = useState([]);
    const [page, setPage] = useState(initialPage);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [cursor, setCursor] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [prevCursor, setPrevCursor] = useState(null);

    // Refs for tracking
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef(null);
    const dataIdsRef = useRef(new Set());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Build query parameters
    const buildQueryParams = useCallback((currentPage, currentCursor = null) => {
        const params = {
            ...searchParams,
            ...filters
        };

        if (paginationType === 'offset') {
            params.page = currentPage;
            params.size = pageSize;
        } else if (paginationType === 'cursor') {
            params.size = pageSize;
            if (currentCursor) {
                params.cursor = currentCursor;
            }
        }

        if (sortBy) {
            params.sort_by = sortBy;
            params.sort_order = sortOrder;
        }

        return params;
    }, [paginationType, pageSize, searchParams, filters, sortBy, sortOrder]);

    // Deduplicate data
    const deduplicateData = useCallback((newData) => {
        if (!deduplicate) return newData;

        const uniqueData = [];
        const seenIds = new Set();

        newData.forEach(item => {
            const id = item.id || item._id || JSON.stringify(item);
            if (!seenIds.has(id)) {
                seenIds.add(id);
                uniqueData.push(item);
            }
        });

        return uniqueData;
    }, [deduplicate]);

    // Fetch data
    const fetchData = useCallback(async (targetPage = 1, targetCursor = null, append = false) => {
        if (!endpoint) return;

        const isInitialLoad = !append;
        const loadingState = isInitialLoad ? setLoading : setLoadingMore;
        
        loadingState(true);
        setError(null);

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        try {
            const params = buildQueryParams(targetPage, targetCursor);
            const queryString = new URLSearchParams(params).toString();
            const requestUrl = queryString ? `${endpoint}?${queryString}` : endpoint;

            const response = await fetch(requestUrl, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!isMountedRef.current) return;

            const newData = result.data || result.items || result;
            const deduplicatedData = deduplicateData(newData);

            if (append) {
                setData(prev => [...prev, ...deduplicatedData]);
            } else {
                setData(deduplicatedData);
            }

            // Update pagination state
            if (paginationType === 'offset') {
                setPage(targetPage);
                setTotalItems(result.total || result.total_items || 0);
                setTotalPages(result.total_pages || Math.ceil((result.total || 0) / pageSize));
                setHasMore(targetPage < (result.total_pages || Math.ceil((result.total || 0) / pageSize)));
            } else if (paginationType === 'cursor') {
                setCursor(targetCursor);
                setNextCursor(result.next_cursor || null);
                setPrevCursor(result.prev_cursor || null);
                setHasMore(!!result.next_cursor);
            }

            if (onDataChange) {
                onDataChange(deduplicatedData, append);
            }

            return result;
        } catch (error) {
            if (!isMountedRef.current) return;

            if (error.name !== 'AbortError') {
                setError(error);
                if (onError) {
                    onError(error);
                }
            }
            throw error;
        } finally {
            if (isMountedRef.current) {
                loadingState(false);
            }
        }
    }, [endpoint, buildQueryParams, deduplicateData, paginationType, pageSize, onDataChange, onError]);

    // Load initial data
    const loadInitial = useCallback(async () => {
        setPage(initialPage);
        setCursor(null);
        setData([]);
        setHasMore(true);
        setError(null);
        
        return fetchData(initialPage, null, false);
    }, [initialPage, fetchData]);

    // Load next page
    const loadNext = useCallback(async () => {
        if (loading || loadingMore || !hasMore) return;

        if (paginationType === 'offset') {
            return fetchData(page + 1, null, true);
        } else if (paginationType === 'cursor') {
            return fetchData(null, nextCursor, true);
        }
    }, [loading, loadingMore, hasMore, page, nextCursor, paginationType, fetchData]);

    // Load previous page
    const loadPrevious = useCallback(async () => {
        if (loading || loadingMore || !prevCursor) return;

        if (paginationType === 'cursor') {
            return fetchData(null, prevCursor, false);
        }
    }, [loading, loadingMore, prevCursor, paginationType, fetchData]);

    // Go to specific page (offset pagination only)
    const goToPage = useCallback(async (targetPage) => {
        if (paginationType !== 'offset' || loading || loadingMore) return;
        
        if (targetPage < 1 || targetPage > totalPages) return;

        return fetchData(targetPage, null, false);
    }, [paginationType, loading, loadingMore, totalPages, fetchData]);

    // Refresh data
    const refresh = useCallback(async () => {
        if (paginationType === 'offset') {
            return fetchData(page, null, false);
        } else if (paginationType === 'cursor') {
            return fetchData(null, cursor, false);
        }
    }, [paginationType, page, cursor, fetchData]);

    // Update filters and reload
    const updateFilters = useCallback(async (newFilters) => {
        Object.assign(filters, newFilters);
        return loadInitial();
    }, [filters, loadInitial]);

    // Update search params and reload
    const updateSearchParams = useCallback(async (newSearchParams) => {
        Object.assign(searchParams, newSearchParams);
        return loadInitial();
    }, [searchParams, loadInitial]);

    // Update sort and reload
    const updateSort = useCallback(async (newSortBy, newSortOrder = 'asc') => {
        sortBy = newSortBy;
        sortOrder = newSortOrder;
        return loadInitial();
    }, [sortBy, sortOrder, loadInitial]);

    // Auto-load initial data
    useEffect(() => {
        if (autoLoad) {
            loadInitial();
        }
    }, [autoLoad, loadInitial]);

    // Update data IDs for deduplication
    useEffect(() => {
        if (deduplicate) {
            dataIdsRef.current = new Set(data.map(item => item.id || item._id || JSON.stringify(item)));
        }
    }, [data, deduplicate]);

    return {
        // Data and state
        data,
        loading,
        loadingMore,
        error,
        hasMore,
        totalItems,
        totalPages,
        page,
        cursor,
        nextCursor,
        prevCursor,

        // Actions
        loadInitial,
        loadNext,
        loadPrevious,
        goToPage,
        refresh,
        updateFilters,
        updateSearchParams,
        updateSort,

        // Utilities
        isEmpty: data.length === 0,
        isFirstPage: paginationType === 'offset' ? page === 1 : !prevCursor,
        isLastPage: paginationType === 'offset' ? page === totalPages : !hasMore,
        canLoadMore: hasMore && !loading && !loadingMore,
        canLoadPrevious: paginationType === 'cursor' && !!prevCursor && !loading && !loadingMore,

        // Pagination info
        paginationType,
        pageSize,
        currentPage: page,
        totalCount: totalItems
    };
};
