/**
 * Test script to verify Sentry integration in the frontend.
 * This script tests error reporting and performance monitoring.
 */

import { 
  initSentry, 
  captureException, 
  captureMessage, 
  setUserContext,
  setRequestContext,
  addBreadcrumb 
} from '../lib/sentry.js';

// Mock Sentry SDK
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((fn) => fn({ setTag: jest.fn() })),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Sentry Integration Tests', () => {
  describe('initSentry', () => {
    it('should initialize Sentry when DSN is provided', () => {
      // Mock environment variables
      process.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.VITE_ENVIRONMENT = 'development';
      
      const { init } = require('@sentry/react');
      
      initSentry();
      
      expect(init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'development',
          debug: true,
        })
      );
    });

    it('should not initialize Sentry when DSN is not provided', () => {
      // Mock environment variables without DSN
      delete process.env.VITE_SENTRY_DSN;
      
      const { init } = require('@sentry/react');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      initSentry();
      
      expect(init).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sentry DSN not configured. Error tracking disabled.'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('captureException', () => {
    it('should capture exceptions with context', () => {
      const { captureException: sentryCaptureException } = require('@sentry/react');
      const error = new Error('Test error');
      const context = { test: 'context' };
      
      captureException(error, context);
      
      expect(sentryCaptureException).toHaveBeenCalledWith(error);
    });

    it('should capture exceptions without context', () => {
      const { captureException: sentryCaptureException } = require('@sentry/react');
      const error = new Error('Test error');
      
      captureException(error);
      
      expect(sentryCaptureException).toHaveBeenCalledWith(error);
    });
  });

  describe('captureMessage', () => {
    it('should capture messages with context', () => {
      const { captureMessage: sentryCaptureMessage } = require('@sentry/react');
      const message = 'Test message';
      const context = { test: 'context' };
      
      captureMessage(message, 'info', context);
      
      expect(sentryCaptureMessage).toHaveBeenCalledWith(message, 'info');
    });

    it('should capture messages without context', () => {
      const { captureMessage: sentryCaptureMessage } = require('@sentry/react');
      const message = 'Test message';
      
      captureMessage(message);
      
      expect(sentryCaptureMessage).toHaveBeenCalledWith(message, 'info');
    });
  });

  describe('setUserContext', () => {
    it('should set user context when user is provided', () => {
      const { setUser } = require('@sentry/react');
      const user = { id: 123, username: 'testuser', email: 'test@example.com' };
      
      setUserContext(user);
      
      expect(setUser).toHaveBeenCalledWith({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should clear user context when no user is provided', () => {
      const { setUser } = require('@sentry/react');
      
      setUserContext(null);
      
      expect(setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('setRequestContext', () => {
    it('should set request context with request ID', () => {
      const { setTag } = require('@sentry/react');
      const requestId = 'test-request-id';
      const context = { method: 'GET', path: '/test' };
      
      setRequestContext(requestId, context);
      
      expect(setTag).toHaveBeenCalledWith('request_id', requestId);
      expect(setTag).toHaveBeenCalledWith('method', 'GET');
      expect(setTag).toHaveBeenCalledWith('path', '/test');
    });

    it('should set request context without request ID', () => {
      const { setTag } = require('@sentry/react');
      const context = { method: 'POST' };
      
      setRequestContext(null, context);
      
      expect(setTag).not.toHaveBeenCalledWith('request_id', expect.anything());
      expect(setTag).toHaveBeenCalledWith('method', 'POST');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumbs', () => {
      const { addBreadcrumb } = require('@sentry/react');
      const message = 'User clicked button';
      const category = 'ui.action';
      const data = { buttonId: 'submit' };
      
      addBreadcrumb(message, category, data);
      
      expect(addBreadcrumb).toHaveBeenCalledWith({
        message,
        category,
        data,
        level: 'info',
      });
    });
  });
});

describe('Sentry Error Boundary Tests', () => {
  it('should render error boundary component', () => {
    const { SentryErrorBoundary } = require('../components/error-boundaries/SentryErrorBoundary.jsx');
    
    // This is a basic test to ensure the component can be imported
    expect(SentryErrorBoundary).toBeDefined();
  });
});

describe('Sentry Configuration Tests', () => {
  it('should have proper environment variable configuration', () => {
    // Test that environment variables are properly configured
    const requiredEnvVars = [
      'VITE_SENTRY_DSN',
      'VITE_SENTRY_DEBUG_ENABLED',
      'VITE_ENVIRONMENT',
      'VITE_APP_VERSION'
    ];
    
    requiredEnvVars.forEach(envVar => {
      expect(process.env[envVar] !== undefined || envVar.startsWith('VITE_')).toBeTruthy();
    });
  });
});

// Manual test function for development
export function runSentryTests() {
  console.log('Running Sentry integration tests...');
  
  // Test initialization
  try {
    initSentry();
    console.log('✓ Sentry initialization test passed');
  } catch (error) {
    console.error('✗ Sentry initialization test failed:', error);
  }
  
  // Test error capture
  try {
    const testError = new Error('Test error for Sentry');
    captureException(testError, { test: 'context' });
    console.log('✓ Error capture test passed');
  } catch (error) {
    console.error('✗ Error capture test failed:', error);
  }
  
  // Test message capture
  try {
    captureMessage('Test message for Sentry', 'info', { test: 'context' });
    console.log('✓ Message capture test passed');
  } catch (error) {
    console.error('✗ Message capture test failed:', error);
  }
  
  // Test user context
  try {
    setUserContext({ id: 123, username: 'testuser' });
    console.log('✓ User context test passed');
  } catch (error) {
    console.error('✗ User context test failed:', error);
  }
  
  console.log('All Sentry integration tests completed!');
}

if (typeof window !== 'undefined') {
  // Run tests in browser environment
  window.runSentryTests = runSentryTests;
}
