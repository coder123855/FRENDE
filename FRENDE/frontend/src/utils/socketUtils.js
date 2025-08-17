import { isValidEvent, getEventCategory } from '../lib/socketEvents';

/**
 * Socket Utility Functions
 * 
 * Helper functions for socket operations, event validation, and debugging
 */

/**
 * Validate socket event data
 * @param {string} eventName - The event name to validate
 * @param {any} data - The event data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateSocketEvent = (eventName, data) => {
    const errors = [];

    // Check if event name is valid
    if (!isValidEvent(eventName)) {
        errors.push(`Invalid event name: ${eventName}`);
    }

    // Basic data validation
    if (data === null || data === undefined) {
        errors.push('Event data cannot be null or undefined');
    }

    // Type-specific validation
    if (eventName === 'send_message') {
        if (!data.match_id) {
            errors.push('send_message requires match_id');
        }
        if (!data.message || typeof data.message !== 'string') {
            errors.push('send_message requires message string');
        }
    }

    if (eventName === 'join_chat_room' || eventName === 'leave_chat_room') {
        if (!data.match_id) {
            errors.push(`${eventName} requires match_id`);
        }
    }

    if (eventName === 'task_submission') {
        if (!data.match_id) {
            errors.push('task_submission requires match_id');
        }
        if (!data.task_id) {
            errors.push('task_submission requires task_id');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Sanitize socket event data
 * @param {string} eventName - The event name
 * @param {any} data - The event data to sanitize
 * @returns {any} Sanitized data
 */
export const sanitizeSocketEventData = (eventName, data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;

    // Sanitize message content
    if (sanitized.message && typeof sanitized.message === 'string') {
        // Remove HTML tags
        sanitized.message = sanitized.message.replace(/<[^>]*>/g, '');
        // Limit message length
        if (sanitized.message.length > 1000) {
            sanitized.message = sanitized.message.substring(0, 1000);
        }
    }

    // Ensure numeric fields are numbers
    if (sanitized.match_id) {
        sanitized.match_id = parseInt(sanitized.match_id, 10) || 0;
    }
    if (sanitized.task_id) {
        sanitized.task_id = parseInt(sanitized.task_id, 10) || 0;
    }
    if (sanitized.user_id) {
        sanitized.user_id = parseInt(sanitized.user_id, 10) || 0;
    }

    return sanitized;
};

/**
 * Check socket connection health
 * @param {Object} socket - Socket instance
 * @returns {Object} Health status
 */
export const checkSocketHealth = (socket) => {
    if (!socket) {
        return {
            isHealthy: false,
            status: 'no_socket',
            issues: ['Socket instance not provided']
        };
    }

    const issues = [];
    let status = 'healthy';

    // Check connection state
    if (!socket.isConnected()) {
        issues.push('Socket not connected');
        status = 'disconnected';
    }

    // Check connection state
    const connectionState = socket.getConnectionState();
    if (connectionState === 'error') {
        issues.push('Socket in error state');
        status = 'error';
    } else if (connectionState === 'connecting') {
        status = 'connecting';
    }

    // Check reconnect attempts
    const reconnectAttempts = socket.getReconnectAttempts();
    if (reconnectAttempts > 0) {
        issues.push(`Reconnect attempts: ${reconnectAttempts}`);
        if (reconnectAttempts >= 5) {
            status = 'max_reconnect_attempts';
        }
    }

    // Check event queue
    const eventQueueLength = socket.getEventQueueLength();
    if (eventQueueLength > 0) {
        issues.push(`Event queue length: ${eventQueueLength}`);
        if (eventQueueLength > 50) {
            status = 'queue_overflow';
        }
    }

    // Check socket ID
    const socketId = socket.getSocketId();
    if (!socketId) {
        issues.push('No socket ID');
        status = 'no_socket_id';
    }

    return {
        isHealthy: issues.length === 0,
        status,
        issues,
        connectionState,
        reconnectAttempts,
        eventQueueLength,
        socketId
    };
};

/**
 * Format socket event for logging
 * @param {string} eventName - Event name
 * @param {any} data - Event data
 * @param {string} direction - 'in' or 'out'
 * @returns {string} Formatted log message
 */
export const formatSocketEventLog = (eventName, data, direction = 'out') => {
    const category = getEventCategory(eventName);
    const timestamp = new Date().toISOString();
    const dataPreview = data ? JSON.stringify(data).substring(0, 100) : 'null';
    
    return `[${timestamp}] Socket ${direction.toUpperCase()} - ${category}/${eventName}: ${dataPreview}`;
};

/**
 * Create socket event debouncer
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced function
 */
export const createSocketEventDebouncer = (callback, delay = 300) => {
    let timeoutId = null;
    
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            callback(...args);
        }, delay);
    };
};

/**
 * Create socket event throttler
 * @param {Function} callback - Function to throttle
 * @param {number} limit - Maximum calls per interval
 * @param {number} interval - Interval in milliseconds
 * @returns {Function} Throttled function
 */
export const createSocketEventThrottler = (callback, limit = 10, interval = 1000) => {
    let calls = 0;
    let lastReset = Date.now();
    
    return (...args) => {
        const now = Date.now();
        
        if (now - lastReset >= interval) {
            calls = 0;
            lastReset = now;
        }
        
        if (calls < limit) {
            calls++;
            callback(...args);
        } else {
            console.warn(`Socket event throttled: ${callback.name || 'anonymous'}`);
        }
    };
};

/**
 * Retry socket operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with operation result
 */
export const retrySocketOperation = async (operation, maxAttempts = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Socket operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

/**
 * Create socket event listener with error handling
 * @param {Object} socket - Socket instance
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Options
 * @returns {Function} Cleanup function
 */
export const createSafeSocketListener = (socket, event, handler, options = {}) => {
    const {
        validateData = true,
        sanitizeData = true,
        logEvents = false,
        retryOnError = false
    } = options;

    const safeHandler = async (data) => {
        try {
            // Validate event data
            if (validateData) {
                const validation = validateSocketEvent(event, data);
                if (!validation.isValid) {
                    console.error(`Socket event validation failed for ${event}:`, validation.errors);
                    return;
                }
            }

            // Sanitize event data
            let processedData = data;
            if (sanitizeData) {
                processedData = sanitizeSocketEventData(event, data);
            }

            // Log event if enabled
            if (logEvents) {
                console.log(formatSocketEventLog(event, processedData, 'in'));
            }

            // Execute handler
            if (retryOnError) {
                await retrySocketOperation(() => handler(processedData));
            } else {
                await handler(processedData);
            }
        } catch (error) {
            console.error(`Error in socket event handler for ${event}:`, error);
        }
    };

    // Register listener
    socket.on(event, safeHandler);

    // Return cleanup function
    return () => {
        socket.off(event, safeHandler);
    };
};

/**
 * Get socket statistics
 * @param {Object} socket - Socket instance
 * @returns {Object} Socket statistics
 */
export const getSocketStatistics = (socket) => {
    if (!socket) {
        return null;
    }

    const health = checkSocketHealth(socket);
    
    return {
        connectionState: socket.getConnectionState(),
        isConnected: socket.isConnected(),
        reconnectAttempts: socket.getReconnectAttempts(),
        eventQueueLength: socket.getEventQueueLength(),
        socketId: socket.getSocketId(),
        health,
        timestamp: new Date().toISOString()
    };
};

/**
 * Debug socket connection
 * @param {Object} socket - Socket instance
 * @param {boolean} verbose - Enable verbose logging
 */
export const debugSocket = (socket, verbose = false) => {
    if (!socket) {
        console.error('No socket instance provided for debugging');
        return;
    }

    const stats = getSocketStatistics(socket);
    
    console.group('Socket Debug Information');
    console.log('Connection State:', stats.connectionState);
    console.log('Connected:', stats.isConnected);
    console.log('Socket ID:', stats.socketId);
    console.log('Reconnect Attempts:', stats.reconnectAttempts);
    console.log('Event Queue Length:', stats.eventQueueLength);
    
    if (verbose) {
        console.log('Health Status:', stats.health);
        console.log('Full Statistics:', stats);
    }
    
    if (stats.health.issues.length > 0) {
        console.warn('Socket Issues:', stats.health.issues);
    }
    
    console.groupEnd();
};

export default {
    validateSocketEvent,
    sanitizeSocketEventData,
    checkSocketHealth,
    formatSocketEventLog,
    createSocketEventDebouncer,
    createSocketEventThrottler,
    retrySocketOperation,
    createSafeSocketListener,
    getSocketStatistics,
    debugSocket
};
