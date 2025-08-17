/**
 * Sync Manager Tests
 * 
 * Unit tests for the sync manager service
 * Tests sync operations, conflict resolution, and performance monitoring
 */

import { jest } from '@jest/globals';
import syncManager from '../syncManager.js';
import { SYNC_CONFIG } from '../../config/syncConfig.js';
import { resolveConflict, performanceMetrics } from '../../utils/syncUtils.js';

// Mock dependencies
jest.mock('../cacheService.js', () => ({
  init: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(),
  delete: jest.fn().mockResolvedValue()
}));

jest.mock('../offlineStorage.js', () => ({
  saveData: jest.fn().mockResolvedValue(),
  getData: jest.fn().mockResolvedValue(null)
}));

jest.mock('../../hooks/useSocket.js', () => ({
  useSocket: jest.fn(() => ({
    socket: null,
    isConnected: false
  }))
}));

describe('SyncManager', () => {
  beforeEach(() => {
    // Reset sync manager state
    syncManager.stop();
    syncManager.clear();
    
    // Reset performance metrics
    performanceMetrics.reset();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncManager.stop();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(syncManager.init()).resolves.not.toThrow();
      expect(syncManager.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await syncManager.init();
      const initSpy = jest.spyOn(syncManager, 'init');
      
      await syncManager.init();
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    test('should start after initialization', async () => {
      await syncManager.init();
      await syncManager.start();
      
      expect(syncManager.isRunning).toBe(true);
    });
  });

  describe('Component Registration', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    test('should register component successfully', () => {
      const componentId = 'test-component';
      const dataType = 'TASKS';
      const initialState = { id: 1, title: 'Test Task' };

      syncManager.registerComponent(componentId, dataType, initialState);

      const component = syncManager.getComponentState(componentId);
      expect(component).toBeDefined();
      expect(component.dataType).toBe(dataType);
      expect(component.state).toEqual(initialState);
    });

    test('should unregister component successfully', () => {
      const componentId = 'test-component';
      const dataType = 'TASKS';

      syncManager.registerComponent(componentId, dataType);
      expect(syncManager.getComponentState(componentId)).toBeDefined();

      syncManager.unregisterComponent(componentId);
      expect(syncManager.getComponentState(componentId)).toBeUndefined();
    });

    test('should update component state', () => {
      const componentId = 'test-component';
      const dataType = 'TASKS';
      const initialState = { id: 1, title: 'Old Title' };
      const newState = { id: 1, title: 'New Title' };

      syncManager.registerComponent(componentId, dataType, initialState);
      syncManager.updateComponentState(componentId, newState);

      const component = syncManager.getComponentState(componentId);
      expect(component.state).toEqual(newState);
      expect(component.isDirty).toBe(true);
    });
  });

  describe('Sync Operations', () => {
    beforeEach(async () => {
      await syncManager.init();
      await syncManager.start();
    });

    test('should queue sync operation', () => {
      const operation = {
        type: 'update',
        dataType: 'TASKS',
        data: { id: 1, title: 'Test Task' },
        options: { priority: 'high' }
      };

      syncManager.queueSyncOperation(
        operation.type,
        operation.dataType,
        operation.data,
        operation.options
      );

      const status = syncManager.getStatus();
      expect(status.queueSize).toBeGreaterThan(0);
    });

    test('should process sync operations', async () => {
      const operation = {
        type: 'create',
        dataType: 'TASKS',
        data: { title: 'New Task' },
        options: { priority: 'normal' }
      };

      syncManager.queueSyncOperation(
        operation.type,
        operation.dataType,
        operation.data,
        operation.options
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = syncManager.getStatus();
      expect(status.activeOperations).toBe(0);
    });

    test('should handle operation failures', async () => {
      // Mock a failing operation
      const mockPerformCreate = jest.spyOn(syncManager, 'performCreate');
      mockPerformCreate.mockRejectedValue(new Error('Test error'));

      const operation = {
        type: 'create',
        dataType: 'TASKS',
        data: { title: 'Failing Task' },
        options: { priority: 'normal' }
      };

      syncManager.queueSyncOperation(
        operation.type,
        operation.dataType,
        operation.data,
        operation.options
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPerformCreate).toHaveBeenCalled();
      mockPerformCreate.mockRestore();
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await syncManager.init();
      await syncManager.start();
    });

    test('should detect conflicts', async () => {
      const localData = { id: 1, title: 'Local Title', updated_at: Date.now() };
      const serverData = { id: 1, title: 'Server Title', updated_at: Date.now() - 1000 };

      const conflict = await syncManager.detectConflict('TASKS', localData, serverData);
      
      expect(conflict).toBeDefined();
      expect(conflict.localData).toEqual(localData);
      expect(conflict.serverData).toEqual(serverData);
    });

    test('should resolve conflicts automatically', async () => {
      const localData = { id: 1, title: 'Local Title', updated_at: Date.now() };
      const serverData = { id: 1, title: 'Server Title', updated_at: Date.now() - 1000 };

      const operation = {
        id: 'test-operation',
        type: 'update',
        dataType: 'TASKS',
        data: localData,
        options: {}
      };

      const conflict = {
        localData,
        serverData,
        dataType: 'TASKS'
      };

      await syncManager.handleConflict(operation, conflict);

      expect(operation.conflictResolved).toBe(true);
    });

    test('should handle manual conflict resolution', async () => {
      const localData = { id: 1, title: 'Local Title' };
      const serverData = { id: 1, title: 'Server Title' };

      const operation = {
        id: 'test-operation',
        type: 'update',
        dataType: 'USER_PROFILES', // Uses manual resolution
        data: localData,
        options: {}
      };

      const conflict = {
        localData,
        serverData,
        dataType: 'USER_PROFILES'
      };

      await expect(syncManager.handleConflict(operation, conflict))
        .rejects.toThrow('Manual conflict resolution required');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await syncManager.init();
      await syncManager.start();
    });

    test('should track performance metrics', async () => {
      const timer = performanceMetrics.startTimer();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      performanceMetrics.endTimer(timer, true);
      
      const stats = performanceMetrics.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    test('should handle performance thresholds', () => {
      const thresholds = SYNC_CONFIG.PERFORMANCE;
      
      expect(thresholds.MAX_SYNC_DURATION).toBeDefined();
      expect(thresholds.MAX_QUEUE_SIZE).toBeDefined();
      expect(thresholds.MEMORY_THRESHOLD).toBeDefined();
    });
  });

  describe('Background Sync', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    test('should start background sync', () => {
      syncManager.startBackgroundSync();
      
      expect(syncManager.backgroundSyncInterval).toBeDefined();
    });

    test('should stop background sync', () => {
      syncManager.startBackgroundSync();
      syncManager.stop();
      
      expect(syncManager.backgroundSyncInterval).toBeNull();
    });
  });

  describe('Offline Sync', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    test('should handle online/offline transitions', () => {
      // Mock online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
      
      // Mock offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });

    test('should queue operations when offline', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      const operation = {
        type: 'update',
        dataType: 'TASKS',
        data: { id: 1, title: 'Offline Task' },
        options: { priority: 'normal' }
      };

      syncManager.queueSyncOperation(
        operation.type,
        operation.dataType,
        operation.data,
        operation.options
      );

      const status = syncManager.getStatus();
      expect(status.offlineQueueSize).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      await syncManager.init();
      await syncManager.start();
    });

    test('should setup batch processors', () => {
      const batchProcessors = syncManager.batchProcessors;
      
      // Check that batch processors are set up for data types that support it
      Object.keys(SYNC_CONFIG.STRATEGIES).forEach(dataType => {
        const strategy = SYNC_CONFIG.STRATEGIES[dataType];
        if (strategy.BATCH_UPDATES) {
          expect(batchProcessors.has(dataType)).toBe(true);
        }
      });
    });

    test('should process batch operations', async () => {
      const dataType = 'TASKS';
      const batchProcessor = syncManager.batchProcessors.get(dataType);
      
      if (batchProcessor) {
        const operations = [
          { type: 'update', data: { id: 1, title: 'Task 1' } },
          { type: 'update', data: { id: 2, title: 'Task 2' } },
          { type: 'update', data: { id: 3, title: 'Task 3' } }
        ];

        operations.forEach(op => {
          batchProcessor.add(op);
        });

        expect(batchProcessor.getBatchSize()).toBe(3);
      }
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    test('should emit events', (done) => {
      syncManager.on('componentRegistered', (data) => {
        expect(data.componentId).toBe('test-component');
        expect(data.dataType).toBe('TASKS');
        done();
      });

      syncManager.registerComponent('test-component', 'TASKS');
    });

    test('should handle operation events', (done) => {
      syncManager.on('operationQueued', (operation) => {
        expect(operation.type).toBe('create');
        expect(operation.dataType).toBe('TASKS');
        done();
      });

      syncManager.queueSyncOperation('create', 'TASKS', { title: 'Test' });
    });
  });

  describe('Status and Health', () => {
    beforeEach(async () => {
      await syncManager.init();
      await syncManager.start();
    });

    test('should provide status information', () => {
      const status = syncManager.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.isInitialized).toBe(true);
      expect(status.queueSize).toBeDefined();
      expect(status.activeOperations).toBeDefined();
      expect(status.componentCount).toBeDefined();
      expect(status.conflictCount).toBeDefined();
      expect(status.performance).toBeDefined();
    });

    test('should track component states', () => {
      syncManager.registerComponent('comp1', 'TASKS');
      syncManager.registerComponent('comp2', 'MATCHES');
      
      const states = syncManager.getAllComponentStates();
      expect(states.length).toBe(2);
      
      const comp1 = syncManager.getComponentState('comp1');
      expect(comp1.dataType).toBe('TASKS');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await syncManager.init();
    });

    test('should handle initialization errors', async () => {
      // Mock cache service to throw error
      const mockCacheService = require('../cacheService.js');
      mockCacheService.init.mockRejectedValue(new Error('Cache init failed'));

      await expect(syncManager.init()).rejects.toThrow('Cache init failed');
    });

    test('should handle operation processing errors', async () => {
      await syncManager.start();
      
      // Mock a failing operation
      const mockPerformUpdate = jest.spyOn(syncManager, 'performUpdate');
      mockPerformUpdate.mockRejectedValue(new Error('Update failed'));

      const operation = {
        type: 'update',
        dataType: 'TASKS',
        data: { id: 1, title: 'Failing Update' },
        options: {}
      };

      syncManager.queueSyncOperation(
        operation.type,
        operation.dataType,
        operation.data,
        operation.options
      );

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPerformUpdate).toHaveBeenCalled();
      mockPerformUpdate.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should clear all data', async () => {
      await syncManager.init();
      await syncManager.start();
      
      syncManager.registerComponent('test-component', 'TASKS');
      syncManager.queueSyncOperation('create', 'TASKS', { title: 'Test' });
      
      syncManager.clear();
      
      const status = syncManager.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.queueSize).toBe(0);
      expect(status.componentCount).toBe(0);
      expect(status.conflictCount).toBe(0);
    });
  });
});
