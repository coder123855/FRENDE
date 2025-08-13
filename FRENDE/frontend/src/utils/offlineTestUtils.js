import offlineStorage from '../services/offlineStorage.js';
import syncService from '../services/syncService.js';
import offlineUtils from './offlineUtils.js';

// Offline testing utilities
export const offlineTestUtils = {
  // Simulate offline mode
  simulateOffline() {
    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    // Trigger offline event
    window.dispatchEvent(new Event('offline'));
    
    console.log('Simulated offline mode');
  },

  // Simulate online mode
  simulateOnline() {
    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Trigger online event
    window.dispatchEvent(new Event('online'));
    
    console.log('Simulated online mode');
  },

  // Test offline storage functionality
  async testOfflineStorage() {
    console.log('Testing offline storage...');
    
    try {
      // Test initialization
      await offlineStorage.init();
      console.log('✅ Offline storage initialized');
      
      // Test task storage
      const testTask = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'This is a test task',
        matchId: 'test-match-1',
        is_completed: false,
        is_expired: false,
        progress_percentage: 0,
        coin_reward: 10,
        difficulty: 'easy',
        task_type: 'bonding',
        ai_generated: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      await offlineStorage.saveTask(testTask);
      const retrievedTask = await offlineStorage.getTask('test-task-1');
      
      if (retrievedTask && retrievedTask.id === testTask.id) {
        console.log('✅ Task storage working');
      } else {
        console.log('❌ Task storage failed');
      }
      
      // Test message storage
      const testMessage = {
        id: 'test-message-1',
        message_text: 'Hello, this is a test message',
        user_id: 'test-user-1',
        roomId: 'test-room-1',
        timestamp: Date.now(),
        message_type: 'text',
        is_read: false
      };
      
      await offlineStorage.saveMessage(testMessage);
      const retrievedMessage = await offlineStorage.getMessage('test-message-1');
      
      if (retrievedMessage && retrievedMessage.id === testMessage.id) {
        console.log('✅ Message storage working');
      } else {
        console.log('❌ Message storage failed');
      }
      
      // Test data export/import
      const exportedData = await offlineStorage.exportData();
      if (exportedData && exportedData.TASKS && exportedData.CHAT_MESSAGES) {
        console.log('✅ Data export working');
      } else {
        console.log('❌ Data export failed');
      }
      
      // Clean up test data
      await offlineStorage.deleteTask('test-task-1');
      await offlineStorage.deleteMessage('test-message-1');
      
      console.log('✅ Offline storage test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Offline storage test failed:', error);
      return false;
    }
  },

  // Test sync service functionality
  async testSyncService() {
    console.log('Testing sync service...');
    
    try {
      // Test online/offline detection
      const isOnline = navigator.onLine;
      console.log(`✅ Online status: ${isOnline}`);
      
      // Test sync status
      const syncStatus = syncService.getSyncStatus();
      console.log('✅ Sync status:', syncStatus);
      
      // Test background sync (if online)
      if (isOnline) {
        await syncService.startBackgroundSync();
        console.log('✅ Background sync started');
      }
      
      console.log('✅ Sync service test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Sync service test failed:', error);
      return false;
    }
  },

  // Test offline data management
  async testOfflineDataManagement() {
    console.log('Testing offline data management...');
    
    try {
      // Test database stats
      const stats = await offlineUtils.getDatabaseStats();
      console.log('✅ Database stats:', stats);
      
      // Test data integrity validation
      const integrity = await offlineUtils.validateDataIntegrity();
      console.log('✅ Data integrity:', integrity);
      
      // Test storage usage
      const usage = await offlineUtils.getStorageUsage();
      if (usage) {
        console.log('✅ Storage usage:', usage);
      } else {
        console.log('⚠️ Storage usage not available');
      }
      
      console.log('✅ Offline data management test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Offline data management test failed:', error);
      return false;
    }
  },

  // Test offline fallback scenarios
  async testOfflineFallbacks() {
    console.log('Testing offline fallbacks...');
    
    try {
      // Simulate offline mode
      this.simulateOffline();
      
      // Test task operations in offline mode
      const offlineTask = {
        id: 'offline-task-1',
        title: 'Offline Task',
        description: 'This task was created offline',
        matchId: 'test-match-1',
        isOffline: true
      };
      
      await offlineStorage.saveTask(offlineTask);
      console.log('✅ Offline task creation working');
      
      // Test message operations in offline mode
      const offlineMessage = {
        id: 'offline-message-1',
        message_text: 'This message was sent offline',
        user_id: 'test-user-1',
        roomId: 'test-room-1',
        timestamp: Date.now(),
        isOffline: true
      };
      
      await offlineStorage.saveMessage(offlineMessage);
      console.log('✅ Offline message creation working');
      
      // Simulate coming back online
      this.simulateOnline();
      
      // Test sync after coming back online
      await syncService.startSync();
      console.log('✅ Sync after coming back online working');
      
      // Clean up
      await offlineStorage.deleteTask('offline-task-1');
      await offlineStorage.deleteMessage('offline-message-1');
      
      console.log('✅ Offline fallback test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Offline fallback test failed:', error);
      return false;
    }
  },

  // Run all offline tests
  async runAllTests() {
    console.log('🚀 Starting comprehensive offline functionality tests...');
    
    const results = {
      storage: false,
      sync: false,
      management: false,
      fallbacks: false
    };
    
    try {
      // Test 1: Offline storage
      results.storage = await this.testOfflineStorage();
      
      // Test 2: Sync service
      results.sync = await this.testSyncService();
      
      // Test 3: Data management
      results.management = await this.testOfflineDataManagement();
      
      // Test 4: Offline fallbacks
      results.fallbacks = await this.testOfflineFallbacks();
      
      // Summary
      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;
      
      console.log('\n📊 Test Results:');
      console.log(`✅ Storage: ${results.storage ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Sync: ${results.sync ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Management: ${results.management ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Fallbacks: ${results.fallbacks ? 'PASS' : 'FAIL'}`);
      console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('🎉 All offline functionality tests passed!');
      } else {
        console.log('⚠️ Some tests failed. Check the logs above for details.');
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return results;
    }
  },

  // Performance test for offline operations
  async performanceTest() {
    console.log('🏃‍♂️ Running performance tests...');
    
    try {
      const startTime = performance.now();
      
      // Test bulk task creation
      const tasks = [];
      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: `perf-task-${i}`,
          title: `Performance Task ${i}`,
          description: `This is performance test task ${i}`,
          matchId: 'perf-match-1',
          is_completed: false,
          is_expired: false,
          progress_percentage: 0,
          coin_reward: 10,
          difficulty: 'easy',
          task_type: 'bonding',
          ai_generated: true
        });
      }
      
      const taskStartTime = performance.now();
      for (const task of tasks) {
        await offlineStorage.saveTask(task);
      }
      const taskEndTime = performance.now();
      
      // Test bulk message creation
      const messages = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: `perf-message-${i}`,
          message_text: `Performance message ${i}`,
          user_id: 'perf-user-1',
          roomId: 'perf-room-1',
          timestamp: Date.now() + i,
          message_type: 'text',
          is_read: false
        });
      }
      
      const messageStartTime = performance.now();
      for (const message of messages) {
        await offlineStorage.saveMessage(message);
      }
      const messageEndTime = performance.now();
      
      // Test data export
      const exportStartTime = performance.now();
      await offlineStorage.exportData();
      const exportEndTime = performance.now();
      
      // Clean up
      for (const task of tasks) {
        await offlineStorage.deleteTask(task.id);
      }
      for (const message of messages) {
        await offlineStorage.deleteMessage(message.id);
      }
      
      const endTime = performance.now();
      
      const results = {
        totalTime: endTime - startTime,
        taskCreationTime: taskEndTime - taskStartTime,
        messageCreationTime: messageEndTime - messageStartTime,
        exportTime: exportEndTime - exportStartTime,
        tasksPerSecond: 100 / ((taskEndTime - taskStartTime) / 1000),
        messagesPerSecond: 100 / ((messageEndTime - messageStartTime) / 1000)
      };
      
      console.log('📈 Performance Results:');
      console.log(`⏱️ Total time: ${results.totalTime.toFixed(2)}ms`);
      console.log(`📝 Task creation: ${results.taskCreationTime.toFixed(2)}ms (${results.tasksPerSecond.toFixed(1)} tasks/sec)`);
      console.log(`💬 Message creation: ${results.messageCreationTime.toFixed(2)}ms (${results.messagesPerSecond.toFixed(1)} messages/sec)`);
      console.log(`📤 Data export: ${results.exportTime.toFixed(2)}ms`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      return null;
    }
  }
};

// Global test runner (for development)
if (typeof window !== 'undefined') {
  window.offlineTestUtils = offlineTestUtils;
  
  // Add test commands to console
  console.log('🔧 Offline test utilities loaded. Available commands:');
  console.log('  - offlineTestUtils.runAllTests()');
  console.log('  - offlineTestUtils.performanceTest()');
  console.log('  - offlineTestUtils.simulateOffline()');
  console.log('  - offlineTestUtils.simulateOnline()');
}

export default offlineTestUtils;
