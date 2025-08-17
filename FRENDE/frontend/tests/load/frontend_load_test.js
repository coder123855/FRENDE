/**
 * Frontend Load Testing for Frende Application
 * Tests browser performance and user interactions under load
 */

class FrontendLoadTest {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:3000',
            concurrentUsers: config.concurrentUsers || 10,
            durationSeconds: config.durationSeconds || 300,
            rampUpSeconds: config.rampUpSeconds || 60,
            rampDownSeconds: config.rampDownSeconds || 60,
            ...config
        };
        
        this.results = {
            startTime: null,
            endTime: null,
            userSessions: [],
            performanceMetrics: [],
            errors: []
        };
        
        this.isRunning = false;
        this.activeUsers = [];
        this.metricsCollector = new MetricsCollector();
    }

    /**
     * Start the frontend load test
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Load test is already running');
        }

        console.log(`Starting frontend load test with ${this.config.concurrentUsers} concurrent users`);
        this.isRunning = true;
        this.results.startTime = new Date();

        try {
            // Start metrics collection
            await this.metricsCollector.start();

            // Ramp up users
            await this.rampUpUsers();

            // Run test for specified duration
            await this.runTestDuration();

            // Ramp down users
            await this.rampDownUsers();

        } catch (error) {
            console.error('Error during load test:', error);
            this.results.errors.push({
                timestamp: new Date(),
                error: error.message,
                stack: error.stack
            });
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Stop the load test
     */
    async stop() {
        console.log('Stopping frontend load test');
        this.isRunning = false;
        await this.cleanup();
    }

    /**
     * Ramp up users gradually
     */
    async rampUpUsers() {
        const usersPerBatch = Math.ceil(this.config.concurrentUsers / 10);
        const batchInterval = this.config.rampUpSeconds / 10;

        console.log(`Ramping up ${this.config.concurrentUsers} users in batches of ${usersPerBatch}`);

        for (let i = 0; i < this.config.concurrentUsers; i += usersPerBatch) {
            const batchSize = Math.min(usersPerBatch, this.config.concurrentUsers - i);
            const batch = [];

            for (let j = 0; j < batchSize; j++) {
                const user = new VirtualUser(this.config, i + j);
                batch.push(user);
                this.activeUsers.push(user);
            }

            // Start batch
            await Promise.all(batch.map(user => user.start()));
            console.log(`Started batch: ${this.activeUsers.length}/${this.config.concurrentUsers} users active`);

            // Wait before next batch
            if (i + batchSize < this.config.concurrentUsers) {
                await this.sleep(batchInterval * 1000);
            }
        }
    }

    /**
     * Run test for specified duration
     */
    async runTestDuration() {
        console.log(`Running test for ${this.config.durationSeconds} seconds`);
        
        const startTime = Date.now();
        const endTime = startTime + (this.config.durationSeconds * 1000);

        while (this.isRunning && Date.now() < endTime) {
            // Collect performance metrics
            const metrics = await this.metricsCollector.collectMetrics();
            this.results.performanceMetrics.push({
                timestamp: new Date(),
                ...metrics
            });

            // Check for errors
            const errors = this.activeUsers.flatMap(user => user.getErrors());
            this.results.errors.push(...errors);

            await this.sleep(1000); // Collect metrics every second
        }
    }

    /**
     * Ramp down users gradually
     */
    async rampDownUsers() {
        console.log('Ramping down users');
        
        const batchSize = Math.ceil(this.activeUsers.length / 10);
        const batchInterval = this.config.rampDownSeconds / 10;

        while (this.activeUsers.length > 0) {
            const batch = this.activeUsers.splice(0, batchSize);
            await Promise.all(batch.map(user => user.stop()));
            
            console.log(`${this.activeUsers.length} users remaining`);
            
            if (this.activeUsers.length > 0) {
                await this.sleep(batchInterval * 1000);
            }
        }
    }

    /**
     * Cleanup after test
     */
    async cleanup() {
        console.log('Cleaning up load test');
        
        // Stop all active users
        await Promise.all(this.activeUsers.map(user => user.stop()));
        this.activeUsers = [];

        // Stop metrics collection
        await this.metricsCollector.stop();

        // Finalize results
        this.results.endTime = new Date();
        this.results.duration = this.results.endTime - this.results.startTime;
        
        this.isRunning = false;
    }

    /**
     * Get test results
     */
    getResults() {
        const allUserSessions = this.activeUsers.flatMap(user => user.getSessions());
        
        return {
            ...this.results,
            userSessions: allUserSessions,
            summary: this.generateSummary(allUserSessions),
            performanceSummary: this.generatePerformanceSummary()
        };
    }

    /**
     * Generate test summary
     */
    generateSummary(userSessions) {
        const totalSessions = userSessions.length;
        const successfulSessions = userSessions.filter(session => !session.error).length;
        const failedSessions = totalSessions - successfulSessions;

        const responseTimes = userSessions
            .filter(session => session.responseTime)
            .map(session => session.responseTime);

        const renderTimes = userSessions
            .filter(session => session.renderTime)
            .map(session => session.renderTime);

        return {
            totalSessions,
            successfulSessions,
            failedSessions,
            successRate: totalSessions > 0 ? successfulSessions / totalSessions : 0,
            averageResponseTime: responseTimes.length > 0 ? 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            averageRenderTime: renderTimes.length > 0 ? 
                renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
            p95ResponseTime: this.calculatePercentile(responseTimes, 95),
            p95RenderTime: this.calculatePercentile(renderTimes, 95),
            totalErrors: this.results.errors.length
        };
    }

    /**
     * Generate performance summary
     */
    generatePerformanceSummary() {
        if (this.results.performanceMetrics.length === 0) {
            return {};
        }

        const memoryUsage = this.results.performanceMetrics
            .map(m => m.memoryUsage)
            .filter(m => m !== null);

        const cpuUsage = this.results.performanceMetrics
            .map(m => m.cpuUsage)
            .filter(m => m !== null);

        return {
            averageMemoryUsage: memoryUsage.length > 0 ? 
                memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length : 0,
            maxMemoryUsage: memoryUsage.length > 0 ? Math.max(...memoryUsage) : 0,
            averageCpuUsage: cpuUsage.length > 0 ? 
                cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length : 0,
            maxCpuUsage: cpuUsage.length > 0 ? Math.max(...cpuUsage) : 0
        };
    }

    /**
     * Calculate percentile
     */
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Virtual User class - simulates a real user
 */
class VirtualUser {
    constructor(config, userId) {
        this.config = config;
        this.userId = userId;
        this.sessions = [];
        this.errors = [];
        this.isActive = false;
        this.currentSession = null;
    }

    /**
     * Start the virtual user
     */
    async start() {
        this.isActive = true;
        console.log(`Starting virtual user ${this.userId}`);
        
        // Start user session loop
        this.sessionLoop();
    }

    /**
     * Stop the virtual user
     */
    async stop() {
        this.isActive = false;
        console.log(`Stopping virtual user ${this.userId}`);
        
        if (this.currentSession) {
            await this.currentSession.end();
        }
    }

    /**
     * Main session loop
     */
    async sessionLoop() {
        while (this.isActive) {
            try {
                // Start new session
                this.currentSession = new UserSession(this.userId);
                await this.currentSession.start();

                // Simulate user behavior
                await this.simulateUserBehavior();

                // End session
                await this.currentSession.end();
                this.sessions.push(this.currentSession.getData());

                // Think time between sessions
                const thinkTime = Math.random() * 5000 + 2000; // 2-7 seconds
                await this.sleep(thinkTime);

            } catch (error) {
                console.error(`Error in virtual user ${this.userId}:`, error);
                this.errors.push({
                    timestamp: new Date(),
                    userId: this.userId,
                    error: error.message
                });
                
                // Wait before retrying
                await this.sleep(5000);
            }
        }
    }

    /**
     * Simulate realistic user behavior
     */
    async simulateUserBehavior() {
        const behaviors = [
            this.browseProfiles.bind(this),
            this.sendMatchRequest.bind(this),
            this.sendChatMessage.bind(this),
            this.completeTask.bind(this),
            this.updateProfile.bind(this)
        ];

        // Randomly select and execute behaviors
        const numBehaviors = Math.floor(Math.random() * 3) + 2; // 2-4 behaviors per session
        
        for (let i = 0; i < numBehaviors; i++) {
            if (!this.isActive) break;
            
            const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
            await behavior();
            
            // Think time between behaviors
            const thinkTime = Math.random() * 3000 + 1000; // 1-4 seconds
            await this.sleep(thinkTime);
        }
    }

    /**
     * Browse user profiles
     */
    async browseProfiles() {
        const startTime = performance.now();
        
        try {
            // Simulate API call to get compatible users
            const response = await fetch(`${this.config.baseUrl}/api/matching/compatible-users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const endTime = performance.now();
            
            this.currentSession.recordAction('browse_profiles', endTime - startTime, data.length);
            
        } catch (error) {
            this.currentSession.recordError('browse_profiles', error.message);
            throw error;
        }
    }

    /**
     * Send match request
     */
    async sendMatchRequest() {
        const startTime = performance.now();
        
        try {
            const targetUserId = Math.floor(Math.random() * 1000) + 1;
            
            const response = await fetch(`${this.config.baseUrl}/api/matching/send-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    target_user_id: targetUserId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const endTime = performance.now();
            this.currentSession.recordAction('send_match_request', endTime - startTime);
            
        } catch (error) {
            this.currentSession.recordError('send_match_request', error.message);
            throw error;
        }
    }

    /**
     * Send chat message
     */
    async sendChatMessage() {
        const startTime = performance.now();
        
        try {
            const matchId = Math.floor(Math.random() * 100) + 1;
            const message = `Hello from user ${this.userId}! ${Date.now()}`;
            
            const response = await fetch(`${this.config.baseUrl}/api/chat/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    match_id: matchId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const endTime = performance.now();
            this.currentSession.recordAction('send_chat_message', endTime - startTime);
            
        } catch (error) {
            this.currentSession.recordError('send_chat_message', error.message);
            throw error;
        }
    }

    /**
     * Complete a task
     */
    async completeTask() {
        const startTime = performance.now();
        
        try {
            const taskId = Math.floor(Math.random() * 50) + 1;
            
            const response = await fetch(`${this.config.baseUrl}/api/tasks/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    task_id: taskId,
                    completion_data: {
                        completed: true,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const endTime = performance.now();
            this.currentSession.recordAction('complete_task', endTime - startTime);
            
        } catch (error) {
            this.currentSession.recordError('complete_task', error.message);
            throw error;
        }
    }

    /**
     * Update profile
     */
    async updateProfile() {
        const startTime = performance.now();
        
        try {
            const response = await fetch(`${this.config.baseUrl}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    bio: `Updated bio from user ${this.userId} at ${Date.now()}`
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const endTime = performance.now();
            this.currentSession.recordAction('update_profile', endTime - startTime);
            
        } catch (error) {
            this.currentSession.recordError('update_profile', error.message);
            throw error;
        }
    }

    /**
     * Get authentication token (simulated)
     */
    getAuthToken() {
        // In a real implementation, this would handle authentication
        return `token_${this.userId}_${Date.now()}`;
    }

    /**
     * Get user sessions
     */
    getSessions() {
        return this.sessions;
    }

    /**
     * Get user errors
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * User Session class - tracks individual user sessions
 */
class UserSession {
    constructor(userId) {
        this.userId = userId;
        this.startTime = null;
        this.endTime = null;
        this.actions = [];
        this.errors = [];
        this.renderTime = null;
        this.responseTime = null;
    }

    /**
     * Start the session
     */
    async start() {
        this.startTime = new Date();
        
        // Measure initial page load time
        const loadStart = performance.now();
        
        // Simulate page load
        await this.simulatePageLoad();
        
        const loadEnd = performance.now();
        this.renderTime = loadEnd - loadStart;
    }

    /**
     * End the session
     */
    async end() {
        this.endTime = new Date();
        
        // Calculate total response time
        if (this.actions.length > 0) {
            this.responseTime = this.actions.reduce((total, action) => total + action.duration, 0);
        }
    }

    /**
     * Record an action
     */
    recordAction(type, duration, data = null) {
        this.actions.push({
            type,
            duration,
            timestamp: new Date(),
            data
        });
    }

    /**
     * Record an error
     */
    recordError(type, message) {
        this.errors.push({
            type,
            message,
            timestamp: new Date()
        });
    }

    /**
     * Simulate page load
     */
    async simulatePageLoad() {
        // Simulate network delay and rendering time
        const networkDelay = Math.random() * 1000 + 200; // 200-1200ms
        const renderDelay = Math.random() * 500 + 100; // 100-600ms
        
        await this.sleep(networkDelay + renderDelay);
    }

    /**
     * Get session data
     */
    getData() {
        return {
            userId: this.userId,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime ? this.endTime - this.startTime : 0,
            actions: this.actions,
            errors: this.errors,
            renderTime: this.renderTime,
            responseTime: this.responseTime,
            error: this.errors.length > 0
        };
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Metrics Collector class - collects browser performance metrics
 */
class MetricsCollector {
    constructor() {
        this.isCollecting = false;
        this.metrics = [];
    }

    /**
     * Start collecting metrics
     */
    async start() {
        this.isCollecting = true;
        console.log('Started collecting performance metrics');
    }

    /**
     * Stop collecting metrics
     */
    async stop() {
        this.isCollecting = false;
        console.log('Stopped collecting performance metrics');
    }

    /**
     * Collect current metrics
     */
    async collectMetrics() {
        const metrics = {
            timestamp: new Date(),
            memoryUsage: this.getMemoryUsage(),
            cpuUsage: await this.getCpuUsage(),
            networkInfo: this.getNetworkInfo(),
            performanceTiming: this.getPerformanceTiming()
        };

        this.metrics.push(metrics);
        return metrics;
    }

    /**
     * Get memory usage
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * Get CPU usage (simulated)
     */
    async getCpuUsage() {
        // In a real implementation, this would use Performance API or other methods
        // For now, we'll simulate CPU usage
        return Math.random() * 100;
    }

    /**
     * Get network information
     */
    getNetworkInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            };
        }
        return null;
    }

    /**
     * Get performance timing
     */
    getPerformanceTiming() {
        if (performance.timing) {
            const timing = performance.timing;
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                loadComplete: timing.loadEventEnd - timing.loadEventStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart
            };
        }
        return null;
    }

    /**
     * Get all collected metrics
     */
    getMetrics() {
        return this.metrics;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FrontendLoadTest,
        VirtualUser,
        UserSession,
        MetricsCollector
    };
}

// Example usage
if (typeof window !== 'undefined') {
    window.FrontendLoadTest = FrontendLoadTest;
    window.VirtualUser = VirtualUser;
    window.UserSession = UserSession;
    window.MetricsCollector = MetricsCollector;
}
