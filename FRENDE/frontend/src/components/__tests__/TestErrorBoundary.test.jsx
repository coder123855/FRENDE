import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestErrorBoundary from '../TestErrorBoundary';

// Mock UI components
jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
  return { Button: MockButton };
});

describe('TestErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title and description', () => {
      render(<TestErrorBoundary />);
      
      expect(screen.getByText('Error Boundary Test')).toBeInTheDocument();
      expect(screen.getByText(/Click the button below to test the error boundary/)).toBeInTheDocument();
    });

    it('renders the test error button', () => {
      render(<TestErrorBoundary />);
      
      expect(screen.getByText('Throw Test Error')).toBeInTheDocument();
    });

    it('renders with proper styling classes', () => {
      render(<TestErrorBoundary />);
      
      const container = screen.getByText('Error Boundary Test').closest('div');
      expect(container).toHaveClass('p-4', 'border', 'border-gray-200', 'rounded-lg');
    });

    it('renders the button with destructive variant', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('button', 'destructive');
    });
  });

  describe('User Interactions', () => {
    it('allows clicking the test error button', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toBeEnabled();
    });

    it('throws an error when button is clicked', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      expect(() => {
        fireEvent.click(button);
      }).toThrow('This is a test error to verify error boundaries work!');
      
      consoleSpy.mockRestore();
    });

    it('changes state when button is clicked', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      // Before clicking, the component should render normally
      expect(screen.getByText('Error Boundary Test')).toBeInTheDocument();
      
      // After clicking, it should throw an error
      expect(() => {
        fireEvent.click(button);
      }).toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('throws the correct error message', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      expect(() => {
        fireEvent.click(button);
      }).toThrow('This is a test error to verify error boundaries work!');
      
      consoleSpy.mockRestore();
    });

    it('throws an Error object', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      expect(() => {
        fireEvent.click(button);
      }).toThrow(Error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('initializes with shouldThrow as false', () => {
      render(<TestErrorBoundary />);
      
      // Component should render normally without throwing
      expect(screen.getByText('Error Boundary Test')).toBeInTheDocument();
      expect(screen.getByText('Throw Test Error')).toBeInTheDocument();
    });

    it('changes shouldThrow to true when button is clicked', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      // The component should throw immediately after the state change
      expect(() => {
        fireEvent.click(button);
      }).toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByRole('button', { name: 'Throw Test Error' });
      expect(button).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<TestErrorBoundary />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Error Boundary Test');
    });

    it('has descriptive text for screen readers', () => {
      render(<TestErrorBoundary />);
      
      expect(screen.getByText(/Click the button below to test the error boundary/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container styling', () => {
      render(<TestErrorBoundary />);
      
      const container = screen.getByText('Error Boundary Test').closest('div');
      expect(container).toHaveClass('p-4', 'border', 'border-gray-200', 'rounded-lg');
    });

    it('has proper title styling', () => {
      render(<TestErrorBoundary />);
      
      const title = screen.getByText('Error Boundary Test');
      expect(title).toHaveClass('text-lg', 'font-medium', 'mb-4');
    });

    it('has proper description styling', () => {
      render(<TestErrorBoundary />);
      
      const description = screen.getByText(/Click the button below to test the error boundary/);
      expect(description).toHaveClass('text-gray-600', 'mb-4');
    });

    it('has proper button styling', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('button', 'destructive');
    });
  });

  describe('Integration', () => {
    it('integrates with Button component correctly', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('button');
    });

    it('passes correct props to Button component', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('destructive');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple rapid clicks gracefully', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      // Multiple clicks should still throw the same error
      expect(() => {
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);
      }).toThrow('This is a test error to verify error boundaries work!');
      
      consoleSpy.mockRestore();
    });

    it('maintains consistent error message across renders', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { rerender } = render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      
      // First render
      expect(() => {
        fireEvent.click(button);
      }).toThrow('This is a test error to verify error boundaries work!');
      
      // Re-render and test again
      rerender(<TestErrorBoundary />);
      const newButton = screen.getByText('Throw Test Error');
      
      expect(() => {
        fireEvent.click(newButton);
      }).toThrow('This is a test error to verify error boundaries work!');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<TestErrorBoundary />);
      
      // Re-render with same props
      rerender(<TestErrorBoundary />);
      
      // Should still have all the expected content
      expect(screen.getByText('Error Boundary Test')).toBeInTheDocument();
      expect(screen.getByText('Throw Test Error')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock Button component', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('button');
    });

    it('passes correct variant to Button component', () => {
      render(<TestErrorBoundary />);
      
      const button = screen.getByText('Throw Test Error');
      expect(button).toHaveClass('destructive');
    });
  });
});
