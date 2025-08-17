import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../lib/apiClient';
import { retryManager } from '../lib/retryManager';
import { retryConfigManager } from '../lib/retryConfig';

/**
 * Base API hook for making HTTP requests with standardized state management
 * Enhanced with advanced retry strategies and circuit breaker pattern
 */
export const useApi = (endpoint, options = {}) => {
    const {
        method = 'GET',
        body = null,
        headers = {},
        immediate = true,
        retryCount = null, // Will be overridden by retry config
        retryDelay = null, // Will be overridden by retry config
        timeout = 10000,
        onSuccess,
        onError,
        onFinally,
        dependencies = [],
        useRetryManager = true // Enable advanced retry management
    } = options;

    // State management
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    // Refs for cleanup and tracking
    const abortControllerRef = useRef(null);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Execute API request
    const execute = useCallback(async (requestBody = body, requestHeaders = headers) => {
        if (!endpoint) return;

        // Get retry configuration
        const retryConfig = useRetryManager ? retryConfigManager.getConfig(endpoint) : {
            maxRetries: retryCount || 3,
            baseDelay: retryDelay || 1000,
            maxDelay: 30000,
            strategy: 'exponential_backoff'
        };

        // Configure retry manager for this endpoint
        if (useRetryManager) {
            retryManager.configureEndpoint(endpoint, retryConfig);
        }

        // Reset state
        setLoading(true);
        setError(null);
        setStatus('loading');
        retryCountRef.current = 0;

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        const makeRequest = async (attempt = 0) => {
            try {
                const config = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...requestHeaders
                    },
                    signal: abortControllerRef.current.signal,
                    timeout
                };

                if (requestBody && method !== 'GET') {
                    config.body = JSON.stringify(requestBody);
                }

                const response = await apiClient.request({
                    url: endpoint,
                    ...config
                });

                if (!isMountedRef.current) return;

                // Record success for circuit breaker
                if (useRetryManager) {
                    retryManager.recordSuccess(endpoint);
                }

                setData(response);
                setStatus('success');
                setLoading(false);

                if (onSuccess) {
                    onSuccess(response);
                }

                return response;
            } catch (err) {
                if (!isMountedRef.current) return;

                // Handle abort
                if (err.name === 'AbortError') {
                    return;
                }

                // Record failure for circuit breaker
                if (useRetryManager) {
                    retryManager.recordFailure(endpoint);
                }

                // Handle retry logic
                const shouldRetryRequest = useRetryManager 
                    ? retryManager.shouldRetry(err, endpoint, attempt)
                    : shouldRetry(err) && attempt < (retryCount || 3);

                if (shouldRetryRequest) {
                    retryCountRef.current = attempt + 1;
                    
                    // Calculate delay using retry manager or fallback
                    const delay = useRetryManager 
                        ? retryManager.calculateDelay(endpoint, attempt)
                        : (retryDelay || 1000) * Math.pow(2, attempt);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return makeRequest(attempt + 1);
                }

                // Final error handling
                setError(err);
                setStatus('error');
                setLoading(false);

                if (onError) {
                    onError(err);
                }

                throw err;
            }
        };

        return makeRequest();
    }, [endpoint, method, body, headers, retryCount, retryDelay, timeout, onSuccess, onError, useRetryManager]);

    // Determine if request should be retried
    const shouldRetry = (error) => {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        const retryableMethods = ['GET', 'POST', 'PUT', 'PATCH'];
        
        return (
            retryableMethods.includes(method) &&
            (retryableStatuses.includes(error.response?.status) || !error.response)
        );
    };

    // Cancel current request
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Reset hook state
    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setStatus('idle');
        retryCountRef.current = 0;
    }, []);

    // Execute immediately if requested
    useEffect(() => {
        if (immediate && endpoint) {
            execute();
        }
    }, [immediate, endpoint, ...dependencies]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (onFinally) {
                onFinally();
            }
        };
    }, [onFinally]);

    return {
        // Data and state
        data,
        loading,
        error,
        status,
        
        // Actions
        execute,
        cancel,
        reset,
        
        // Utilities
        isIdle: status === 'idle',
        isLoading: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
        retryCount: retryCountRef.current
    };
};
