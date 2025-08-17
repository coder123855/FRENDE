/**
 * Performance testing utilities for frontend components
 */

// Performance measurement utilities
export const performanceUtils = {
  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @param {number} iterations - Number of iterations to run
   * @returns {Object} Performance metrics
   */
  measureExecutionTime: (fn, iterations = 100) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      average: avg,
      min,
      max,
      times,
      iterations
    };
  },

  /**
   * Measure memory usage
   * @returns {Object} Memory usage information
   */
  measureMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usedMB: performance.memory.usedJSHeapSize / 1024 / 1024,
        totalMB: performance.memory.totalJSHeapSize / 1024 / 1024,
        limitMB: performance.memory.jsHeapSizeLimit / 1024 / 1024
      };
    }
    return null;
  },

  /**
   * Measure component render time
   * @param {Function} renderFn - Function that renders the component
   * @param {number} iterations - Number of render iterations
   * @returns {Object} Render performance metrics
   */
  measureRenderTime: (renderFn, iterations = 50) => {
    const renderTimes = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      renderTimes.push(end - start);
    }
    
    const avg = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const min = Math.min(...renderTimes);
    const max = Math.max(...renderTimes);
    
    return {
      average: avg,
      min,
      max,
      renderTimes,
      iterations
    };
  },

  /**
   * Measure network request performance
   * @param {Function} requestFn - Function that makes the request
   * @param {number} iterations - Number of request iterations
   * @returns {Promise<Object>} Network performance metrics
   */
  measureNetworkPerformance: async (requestFn, iterations = 10) => {
    const requestTimes = [];
    const successCount = 0;
    const errorCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await requestFn();
        successCount++;
      } catch (error) {
        errorCount++;
      }
      const end = performance.now();
      requestTimes.push(end - start);
    }
    
    const avg = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
    const min = Math.min(...requestTimes);
    const max = Math.max(...requestTimes);
    
    return {
      average: avg,
      min,
      max,
      requestTimes,
      iterations,
      successCount,
      errorCount,
      successRate: successCount / iterations
    };
  }
};

// Test data generators
export const testDataGenerators = {
  /**
   * Generate test users for performance testing
   * @param {number} count - Number of users to generate
   * @returns {Array} Array of test user objects
   */
  generateTestUsers: (count = 100) => {
    const users = [];
    const communities = ['tech', 'sports', 'music', 'art', 'science', 'business', 'education'];
    const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio'];
    
    for (let i = 0; i < count; i++) {
      users.push({
        id: i + 1,
        username: `testuser_${i}`,
        name: `Test User ${i}`,
        age: Math.floor(Math.random() * 47) + 18, // 18-65
        profession: `Profession ${i}`,
        community: communities[Math.floor(Math.random() * communities.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        profile_text: `This is a test profile for user ${i} with some interesting details about their hobbies and interests.`,
        available_slots: Math.floor(Math.random() * 3),
        coins: Math.floor(Math.random() * 1000),
        compatibility_score: Math.floor(Math.random() * 40) + 60 // 60-100
      });
    }
    
    return users;
  },

  /**
   * Generate test messages for performance testing
   * @param {number} count - Number of messages to generate
   * @param {number} matchId - Match ID for the messages
   * @returns {Array} Array of test message objects
   */
  generateTestMessages: (count = 100, matchId = 1) => {
    const messages = [];
    const messageTypes = ['text', 'task_submission'];
    const sampleTexts = [
      'Hello! How are you doing today?',
      'That sounds really interesting!',
      'I love that idea, let\'s try it!',
      'Thanks for sharing that with me.',
      'What do you think about this?',
      'I had a great time chatting with you!',
      'Let\'s catch up soon!',
      'That\'s amazing! Tell me more.',
      'I completely agree with you.',
      'What are your plans for the weekend?'
    ];
    
    for (let i = 0; i < count; i++) {
      messages.push({
        id: i + 1,
        match_id: matchId,
        sender_id: (i % 2) + 1, // Alternate between 2 users
        message_text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
        message_type: messageTypes[Math.floor(Math.random() * messageTypes.length)],
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
        sender_name: `User ${(i % 2) + 1}`
      });
    }
    
    return messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  /**
   * Generate test matches for performance testing
   * @param {number} count - Number of matches to generate
   * @returns {Array} Array of test match objects
   */
  generateTestMatches: (count = 50) => {
    const matches = [];
    const statuses = ['pending', 'active', 'completed', 'expired'];
    
    for (let i = 0; i < count; i++) {
      matches.push({
        id: i + 1,
        user1_id: i * 2 + 1,
        user2_id: i * 2 + 2,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        compatibility_score: Math.floor(Math.random() * 40) + 60,
        created_at: new Date(Date.now() - Math.random() * 604800000).toISOString(), // Random time in last week
        chat_room_id: `room_${i + 1}`,
        user1: {
          id: i * 2 + 1,
          name: `User ${i * 2 + 1}`,
          profile_text: `Profile for user ${i * 2 + 1}`
        },
        user2: {
          id: i * 2 + 2,
          name: `User ${i * 2 + 2}`,
          profile_text: `Profile for user ${i * 2 + 2}`
        }
      });
    }
    
    return matches;
  }
};

// Performance assertions
export const performanceAssertions = {
  /**
   * Assert render time is within acceptable limits
   * @param {Object} metrics - Render performance metrics
   * @param {number} maxAvgMs - Maximum average render time in milliseconds
   */
  assertRenderTime: (metrics, maxAvgMs = 100) => {
    expect(metrics.average).toBeLessThan(maxAvgMs);
    expect(metrics.max).toBeLessThan(maxAvgMs * 2);
  },

  /**
   * Assert memory usage is within acceptable limits
   * @param {Object} initialMemory - Initial memory usage
   * @param {Object} finalMemory - Final memory usage
   * @param {number} maxIncreaseMB - Maximum memory increase in MB
   */
  assertMemoryUsage: (initialMemory, finalMemory, maxIncreaseMB = 50) => {
    if (initialMemory && finalMemory) {
      const increase = finalMemory.usedMB - initialMemory.usedMB;
      expect(increase).toBeLessThan(maxIncreaseMB);
    }
  },

  /**
   * Assert network performance is within acceptable limits
   * @param {Object} metrics - Network performance metrics
   * @param {number} maxAvgMs - Maximum average request time in milliseconds
   * @param {number} minSuccessRate - Minimum success rate (0-1)
   */
  assertNetworkPerformance: (metrics, maxAvgMs = 1000, minSuccessRate = 0.9) => {
    expect(metrics.average).toBeLessThan(maxAvgMs);
    expect(metrics.successRate).toBeGreaterThanOrEqual(minSuccessRate);
  }
};

// Performance test helpers
export const performanceHelpers = {
  /**
   * Wait for a specified number of milliseconds
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after the delay
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Wait for next frame (useful for measuring render performance)
   * @returns {Promise} Promise that resolves on next frame
   */
  waitForNextFrame: () => new Promise(resolve => requestAnimationFrame(resolve)),

  /**
   * Create a performance test wrapper
   * @param {Function} testFn - Test function to wrap
   * @param {Object} options - Test options
   * @returns {Function} Wrapped test function
   */
  createPerformanceTest: (testFn, options = {}) => {
    return async () => {
      const startMemory = performanceUtils.measureMemoryUsage();
      const startTime = performance.now();
      
      await testFn();
      
      const endTime = performance.now();
      const endMemory = performanceUtils.measureMemoryUsage();
      
      const executionTime = endTime - startTime;
      
      console.log('Performance Test Results:', {
        executionTime: `${executionTime.toFixed(2)}ms`,
        memoryIncrease: startMemory && endMemory 
          ? `${(endMemory.usedMB - startMemory.usedMB).toFixed(2)}MB`
          : 'Not available'
      });
      
      if (options.maxExecutionTime) {
        expect(executionTime).toBeLessThan(options.maxExecutionTime);
      }
      
      if (options.maxMemoryIncrease && startMemory && endMemory) {
        const memoryIncrease = endMemory.usedMB - startMemory.usedMB;
        expect(memoryIncrease).toBeLessThan(options.maxMemoryIncrease);
      }
    };
  }
};

export default {
  performanceUtils,
  testDataGenerators,
  performanceAssertions,
  performanceHelpers
};
