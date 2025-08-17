import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className, ...props }) => <div className={`icon alert-triangle ${className}`} {...props}>AlertTriangle</div>,
  RefreshCw: ({ className, ...props }) => <div className={`icon refresh-cw ${className}`} {...props}>RefreshCw</div>,
  Home: ({ className, ...props }) => <div className={`icon home ${className}`} {...props}>Home</div>,
  Bug: ({ className, ...props }) => <div className={`icon bug ${className}`} {...props}>Bug</div>
}));

// Mock UI components
jest.mock('../../ui/card', () => {
  const MockCard = ({ children, className, ...props }) => (
    <div className={`card ${className}`} {...props}>{children}</div>
  );
  const MockCardContent = ({ children, className, ...props }) => (
    <div className={`card-content ${className}`} {...props}>{children}</div>
  );
  const MockCardHeader = ({ children, className, ...props }) => (
    <div className={`card-header ${className}`} {...props}>{children}</div>
  );
  const MockCardTitle = ({ children, className, ...props }) => (
    <h2 className={`card-title ${className}`} {...props}>{children}</h2>
  );
  return { 
    Card: MockCard, 
    CardContent: MockCardContent, 
    CardHeader: MockCardHeader, 
    CardTitle: MockCardTitle 
  };
});

jest.mock('../../ui/button', () => {
  const MockButton = ({ children, onClick, variant, className, ...props }) => (
    <button 
      onClick={onClick} 
      className={`button ${variant} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

// Mock console.error and window.dispatchEvent
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {});
const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleError.mockClear();
    mockDispatchEvent.mockClear();
    mockAlert.mockClear();
  });

  describe('Normal Rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches errors and renders error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('AlertTriangle')).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockConsoleError).toHaveBeenCalledWith('Error caught by boundary:', expect.objectContaining({
        error: expect.any(Error),
        errorInfo: expect.any(Object),
        errorId: expect.any(String)
      }));
    });

    it('dispatches custom error event', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app-error',
          detail: expect.objectContaining({
            error: expect.any(Error),
            errorInfo: expect.any(Object),
            errorId: expect.any(String)
          })
        })
      );
    });

    it('generates unique error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const errorCall = mockConsoleError.mock.calls[0];
      const errorId = errorCall[1].errorId;
      
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    });
  });

  describe('Error UI Rendering', () => {
    beforeEach(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    it('renders error title', () => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders error message', () => {
      expect(screen.getByText("We're sorry, but something unexpected happened. Our team has been notified.")).toBeInTheDocument();
    });

    it('renders retry button', () => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('RefreshCw')).toBeInTheDocument();
    });

    it('renders go home button', () => {
      expect(screen.getByText('Go Home')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders report error button', () => {
      expect(screen.getByText('Report Error')).toBeInTheDocument();
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    it('resets error state when retry button is clicked', () => {
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      // Should render children again
      expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('navigates to home when go home button is clicked', () => {
      const goHomeButton = screen.getByText('Go Home');
      
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });
      
      fireEvent.click(goHomeButton);
      
      expect(window.location.href).toBe('/');
    });

    it('shows alert when report error button is clicked', () => {
      const reportButton = screen.getByText('Report Error');
      fireEvent.click(reportButton);
      
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Error reported with ID:'));
    });

    it('logs error report when report error button is clicked', () => {
      const reportButton = screen.getByText('Report Error');
      fireEvent.click(reportButton);
      
      expect(mockConsoleError).toHaveBeenCalledWith('Error report:', expect.objectContaining({
        errorId: expect.any(String),
        message: 'Test error message',
        stack: expect.any(String),
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String)
      }));
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
      expect(screen.getByText('Error ID:')).toBeInTheDocument();
      expect(screen.getByText('Message:')).toBeInTheDocument();
      expect(screen.getByText('Stack:')).toBeInTheDocument();
    });

    it('does not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('can recover from error and render children again', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Normal component')).toBeInTheDocument();
      
      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('maintains error state until retry is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Re-render without error - should still show error UI
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);
      
      // Should not throw error
      expect(screen.getByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('handles undefined children', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>);
      
      // Should not throw error
      expect(screen.getByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('handles empty children', () => {
      render(<ErrorBoundary>{}</ErrorBoundary>);
      
      // Should not throw error
      expect(screen.getByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('handles multiple errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      
      // Trigger another error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    it('has proper button semantics', () => {
      const retryButton = screen.getByRole('button', { name: /try again/i });
      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      const reportButton = screen.getByRole('button', { name: /report error/i });
      
      expect(retryButton).toBeInTheDocument();
      expect(goHomeButton).toBeInTheDocument();
      expect(reportButton).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Something went wrong');
    });

    it('has descriptive text for screen readers', () => {
      expect(screen.getByText("We're sorry, but something unexpected happened. Our team has been notified.")).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    beforeEach(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    it('has proper card structure', () => {
      const card = screen.getByText('Something went wrong').closest('.card');
      expect(card).toHaveClass('card', 'w-full', 'max-w-md');
    });

    it('has proper card header structure', () => {
      const cardHeader = screen.getByText('Something went wrong').closest('.card-header');
      expect(cardHeader).toHaveClass('card-header', 'text-center');
    });

    it('has proper card content structure', () => {
      const cardContent = screen.getByText('Try Again').closest('.card-content');
      expect(cardContent).toHaveClass('card-content', 'space-y-4');
    });

    it('has proper button styling', () => {
      const retryButton = screen.getByText('Try Again');
      const goHomeButton = screen.getByText('Go Home');
      const reportButton = screen.getByText('Report Error');
      
      expect(retryButton).toHaveClass('button', 'w-full');
      expect(goHomeButton).toHaveClass('button', 'outline', 'w-full');
      expect(reportButton).toHaveClass('button', 'outline', 'w-full');
    });
  });

  describe('Integration', () => {
    it('integrates with Card components correctly', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const card = screen.getByText('Something went wrong').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('integrates with Button components correctly', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when no error occurs', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      // Re-render with same props
      rerender(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      // Should still have the expected content
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock icons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('AlertTriangle')).toBeInTheDocument();
      expect(screen.getByText('RefreshCw')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });
  });
});
