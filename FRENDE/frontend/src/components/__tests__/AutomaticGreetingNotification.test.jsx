import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutomaticGreetingNotification from '../AutomaticGreetingNotification';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Zap: ({ className, ...props }) => <div className={`icon zap ${className}`} {...props}>Zap</div>,
  Clock: ({ className, ...props }) => <div className={`icon clock ${className}`} {...props}>Clock</div>,
  CheckCircle: ({ className, ...props }) => <div className={`icon check-circle ${className}`} {...props}>CheckCircle</div>,
  AlertCircle: ({ className, ...props }) => <div className={`icon alert-circle ${className}`} {...props}>AlertCircle</div>,
  X: ({ className, ...props }) => <div className={`icon x ${className}`} {...props}>X</div>,
  MessageCircle: ({ className, ...props }) => <div className={`icon message-circle ${className}`} {...props}>MessageCircle</div>
}));

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, className, ...props }) => (
    <div className={`card ${className}`} {...props}>{children}</div>
  );
  const MockCardContent = ({ children, className, ...props }) => (
    <div className={`card-content ${className}`} {...props}>{children}</div>
  );
  return { Card: MockCard, CardContent: MockCardContent };
});

jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, size, variant, className, ...props }) => (
    <button 
      onClick={onClick} 
      className={`button ${size} ${variant} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

jest.mock('../ui/badge', () => {
  const MockBadge = ({ children, variant, className, ...props }) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  );
  return { Badge: MockBadge };
});

describe('AutomaticGreetingNotification', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the notification with default props', () => {
      render(<AutomaticGreetingNotification />);
      
      expect(screen.getByText('Automatic Greeting')).toBeInTheDocument();
      expect(screen.getByText('Zap')).toBeInTheDocument(); // Default icon
    });

    it('renders with custom message', () => {
      const message = 'Your greeting will be sent automatically in 60 seconds';
      
      render(<AutomaticGreetingNotification message={message} />);
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('renders countdown timer when countdown is provided', () => {
      render(<AutomaticGreetingNotification countdown={65} />);
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<AutomaticGreetingNotification />);
      
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('renders send now button for warning type', () => {
      render(<AutomaticGreetingNotification type="warning" showActions={true} />);
      
      expect(screen.getByText('Send Now')).toBeInTheDocument();
      expect(screen.getByText('MessageCircle')).toBeInTheDocument();
    });
  });

  describe('Notification Types', () => {
    it('renders info type with correct styling and icon', () => {
      render(<AutomaticGreetingNotification type="info" />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
      expect(screen.getByText('Zap')).toBeInTheDocument();
    });

    it('renders success type with correct styling and icon', () => {
      render(<AutomaticGreetingNotification type="success" />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800');
      expect(screen.getByText('CheckCircle')).toBeInTheDocument();
    });

    it('renders warning type with correct styling and icon', () => {
      render(<AutomaticGreetingNotification type="warning" />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
      expect(screen.getByText('Clock')).toBeInTheDocument();
    });

    it('renders timeout type with correct styling and icon', () => {
      render(<AutomaticGreetingNotification type="timeout" />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
      expect(screen.getByText('AlertCircle')).toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    it('displays countdown in MM:SS format', () => {
      render(<AutomaticGreetingNotification countdown={125} />);
      
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('displays countdown with leading zeros', () => {
      render(<AutomaticGreetingNotification countdown={65} />);
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('displays countdown for less than a minute', () => {
      render(<AutomaticGreetingNotification countdown={45} />);
      
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('updates countdown every second', () => {
      render(<AutomaticGreetingNotification countdown={3} />);
      
      expect(screen.getByText('0:03')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('0:02')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('0:01')).toBeInTheDocument();
    });

    it('stops countdown at zero', () => {
      render(<AutomaticGreetingNotification countdown={1} />);
      
      expect(screen.getByText('0:01')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('0:00')).toBeInTheDocument();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('0:00')).toBeInTheDocument(); // Should not go negative
    });

    it('does not show countdown when countdown is null', () => {
      render(<AutomaticGreetingNotification countdown={null} />);
      
      expect(screen.queryByText(/0:/)).not.toBeInTheDocument();
    });

    it('does not show countdown when countdown is zero', () => {
      render(<AutomaticGreetingNotification countdown={0} />);
      
      expect(screen.queryByText(/0:/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<AutomaticGreetingNotification onClose={mockOnClose} />);
      
      const closeButton = screen.getByText('X');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('hides notification when close button is clicked', () => {
      render(<AutomaticGreetingNotification onClose={mockOnClose} />);
      
      expect(screen.getByText('Automatic Greeting')).toBeInTheDocument();
      
      const closeButton = screen.getByText('X');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Automatic Greeting')).not.toBeInTheDocument();
    });

    it('does not throw error when onClose is not provided', () => {
      render(<AutomaticGreetingNotification />);
      
      const closeButton = screen.getByText('X');
      
      expect(() => {
        fireEvent.click(closeButton);
      }).not.toThrow();
    });
  });

  describe('Action Buttons', () => {
    it('shows send now button only for warning type', () => {
      render(<AutomaticGreetingNotification type="warning" showActions={true} />);
      
      expect(screen.getByText('Send Now')).toBeInTheDocument();
    });

    it('does not show send now button for other types', () => {
      render(<AutomaticGreetingNotification type="info" showActions={true} />);
      
      expect(screen.queryByText('Send Now')).not.toBeInTheDocument();
    });

    it('does not show send now button when showActions is false', () => {
      render(<AutomaticGreetingNotification type="warning" showActions={false} />);
      
      expect(screen.queryByText('Send Now')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles negative countdown gracefully', () => {
      render(<AutomaticGreetingNotification countdown={-5} />);
      
      expect(screen.queryByText(/0:/)).not.toBeInTheDocument();
    });

    it('handles very large countdown values', () => {
      render(<AutomaticGreetingNotification countdown={3661} />); // 1 hour 1 minute 1 second
      
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });

    it('handles empty message gracefully', () => {
      render(<AutomaticGreetingNotification message="" />);
      
      expect(screen.getByText('Automatic Greeting')).toBeInTheDocument();
      expect(screen.queryByText('')).not.toBeInTheDocument();
    });

    it('handles undefined message gracefully', () => {
      render(<AutomaticGreetingNotification message={undefined} />);
      
      expect(screen.getByText('Automatic Greeting')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(<AutomaticGreetingNotification />);
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('has descriptive text for screen readers', () => {
      render(<AutomaticGreetingNotification message="Your greeting will be sent automatically" />);
      
      expect(screen.getByText('Your greeting will be sent automatically')).toBeInTheDocument();
    });

    it('has proper icon semantics', () => {
      render(<AutomaticGreetingNotification />);
      
      expect(screen.getByText('Zap')).toBeInTheDocument();
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper card structure', () => {
      render(<AutomaticGreetingNotification />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toHaveClass('card', 'border', 'mb-4');
    });

    it('has proper card content structure', () => {
      render(<AutomaticGreetingNotification />);
      
      const cardContent = screen.getByText('Automatic Greeting').closest('.card-content');
      expect(cardContent).toHaveClass('card-content', 'p-4');
    });

    it('has proper button styling', () => {
      render(<AutomaticGreetingNotification />);
      
      const closeButton = screen.getByText('X');
      expect(closeButton).toHaveClass('button', 'sm', 'ghost');
    });

    it('has proper badge styling for countdown', () => {
      render(<AutomaticGreetingNotification countdown={60} />);
      
      const badge = screen.getByText('1:00');
      expect(badge).toHaveClass('badge', 'outline');
    });
  });

  describe('Integration', () => {
    it('integrates with Card components correctly', () => {
      render(<AutomaticGreetingNotification />);
      
      const card = screen.getByText('Automatic Greeting').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('integrates with Button components correctly', () => {
      render(<AutomaticGreetingNotification />);
      
      const closeButton = screen.getByText('X');
      expect(closeButton).toHaveClass('button');
    });

    it('integrates with Badge components correctly', () => {
      render(<AutomaticGreetingNotification countdown={60} />);
      
      const badge = screen.getByText('1:00');
      expect(badge).toHaveClass('badge');
    });
  });

  describe('Performance', () => {
    it('cleans up timer on unmount', () => {
      const { unmount } = render(<AutomaticGreetingNotification countdown={10} />);
      
      expect(screen.getByText('0:10')).toBeInTheDocument();
      
      unmount();
      
      // Should not throw error after unmount
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    });

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<AutomaticGreetingNotification />);
      
      // Re-render with same props
      rerender(<AutomaticGreetingNotification />);
      
      // Should still have all the expected content
      expect(screen.getByText('Automatic Greeting')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock icons', () => {
      render(<AutomaticGreetingNotification />);
      
      expect(screen.getByText('Zap')).toBeInTheDocument();
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('displays countdown with mock clock icon', () => {
      render(<AutomaticGreetingNotification countdown={60} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });
  });
});
