/**
 * Sentry Error Boundary component for React error handling
 * Captures React component errors and reports them to Sentry
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { captureException } from '../../lib/sentry.js';

/**
 * Error Boundary component that captures React errors and reports to Sentry
 */
export function SentryErrorBoundary({ children, fallback, ...props }) {
  return (
    <Sentry.ErrorBoundary
      fallback={fallback || DefaultErrorFallback}
      beforeCapture={(scope) => {
        scope.setTag('error_boundary', true);
        scope.setLevel('error');
      }}
      {...props}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, componentStack, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            We've encountered an unexpected error. Our team has been notified.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                <div className="mb-2">
                  <strong>Error:</strong> {error?.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">{componentStack}</pre>
                </div>
              </div>
            </details>
          )}
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={resetError}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with Sentry error boundary
 */
export function withSentryErrorBoundary(Component, options = {}) {
  return function WrappedComponent(props) {
    return (
      <SentryErrorBoundary {...options}>
        <Component {...props} />
      </SentryErrorBoundary>
    );
  };
}

/**
 * Hook to manually capture errors in components
 */
export function useSentryErrorCapture() {
  const captureError = React.useCallback((error, context = {}) => {
    captureException(error, {
      ...context,
      error_source: 'manual_capture',
    });
  }, []);

  return { captureError };
}

/**
 * Hook to add breadcrumbs for user actions
 */
export function useSentryBreadcrumbs() {
  const addBreadcrumb = React.useCallback((message, category = 'ui.action', data = {}) => {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }, []);

  return { addBreadcrumb };
}
