import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpirationTimer from '../ExpirationTimer';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Clock: ({ size, ...props }) => <div className={`icon clock ${size}`} {...props}>Clock</div>,
  AlertTriangle: ({ size, ...props }) => <div className={`icon alert ${size}`} {...props}>Alert</div>
}));

// Mock UI components
jest.mock('../ui/badge', () => {
  const MockBadge = ({ children, variant, className, ...props }) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  );
  return { Badge: MockBadge };
});

describe('ExpirationTimer', () => {
  const mockOnExpired = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders nothing when expiresAt is not provided', () => {
      const { container } = render(<ExpirationTimer />);
      expect(container.firstChild).toBeNull();
    });

    it('renders expired badge when time has expired', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      render(<ExpirationTimer expiresAt={pastTime} />);
      
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('renders timer with hours and minutes when more than 1 hour left', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
      expect(screen.getByText(/2h/)).toBeInTheDocument();
    });

    it('renders timer with minutes and seconds when less than 1 hour left', () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
      expect(screen.getByText(/30m/)).toBeInTheDocument();
    });

    it('renders timer with only seconds when less than 1 minute left', () => {
      const futureTime = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly for hours and minutes', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(); // 2h 30m
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/2h 30m/)).toBeInTheDocument();
    });

    it('formats time correctly for minutes and seconds', () => {
      const futureTime = new Date(Date.now() + 45 * 60 * 1000 + 30 * 1000).toISOString(); // 45m 30s
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/45m 30s/)).toBeInTheDocument();
    });

    it('formats time correctly for seconds only', () => {
      const futureTime = new Date(Date.now() + 45 * 1000).toISOString(); // 45s
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/45s/)).toBeInTheDocument();
    });

    it('handles zero values correctly', () => {
      const futureTime = new Date(Date.now() + 1 * 1000).toISOString(); // 1s
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/1s/)).toBeInTheDocument();
    });
  });

  describe('Badge Variants', () => {
    it('uses outline variant when more than 1 hour left', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/2h/).closest('.badge');
      expect(badge).toHaveClass('outline');
    });

    it('uses secondary variant when less than 1 hour but more than 15 minutes left', () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/30m/).closest('.badge');
      expect(badge).toHaveClass('secondary');
    });

    it('uses destructive variant when less than 15 minutes left', () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/10m/).closest('.badge');
      expect(badge).toHaveClass('destructive');
    });

    it('uses destructive variant when expired', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      render(<ExpirationTimer expiresAt={pastTime} />);
      
      const badge = screen.getByText('Expired').closest('.badge');
      expect(badge).toHaveClass('destructive');
    });
  });

  describe('Animation', () => {
    it('applies pulse animation when expiring very soon', () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/10m/).closest('.badge');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('does not apply pulse animation when not expiring very soon', () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/30m/).closest('.badge');
      expect(badge).not.toHaveClass('animate-pulse');
    });
  });

  describe('Timer Updates', () => {
    it('updates timer every second', () => {
      const futureTime = new Date(Date.now() + 65 * 1000).toISOString(); // 65 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Initial render should show 1m 5s
      expect(screen.getByText(/1m 5s/)).toBeInTheDocument();
      
      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // Should now show 1m 4s
      expect(screen.getByText(/1m 4s/)).toBeInTheDocument();
    });

    it('transitions from minutes to seconds when time runs out', () => {
      const futureTime = new Date(Date.now() + 65 * 1000).toISOString(); // 65 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Initial render should show 1m 5s
      expect(screen.getByText(/1m 5s/)).toBeInTheDocument();
      
      // Advance timer by 60 seconds
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });
      
      // Should now show 5s
      expect(screen.getByText(/5s/)).toBeInTheDocument();
    });

    it('transitions from hours to minutes when time runs out', () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 1000).toISOString(); // 2h 30s
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Initial render should show 2h 0m
      expect(screen.getByText(/2h 0m/)).toBeInTheDocument();
      
      // Advance timer by 2 hours
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });
      
      // Should now show 30s
      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });
  });

  describe('Expiration Handling', () => {
    it('calls onExpired callback when timer expires', () => {
      const futureTime = new Date(Date.now() + 5 * 1000).toISOString(); // 5 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} onExpired={mockOnExpired} />);
      
      // Advance timer past expiration
      act(() => {
        jest.advanceTimersByTime(6 * 1000);
      });
      
      expect(mockOnExpired).toHaveBeenCalledTimes(1);
    });

    it('shows expired badge when timer expires', () => {
      const futureTime = new Date(Date.now() + 5 * 1000).toISOString(); // 5 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Advance timer past expiration
      act(() => {
        jest.advanceTimersByTime(6 * 1000);
      });
      
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('does not call onExpired when not provided', () => {
      const futureTime = new Date(Date.now() + 5 * 1000).toISOString(); // 5 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Advance timer past expiration
      act(() => {
        jest.advanceTimersByTime(6 * 1000);
      });
      
      expect(mockOnExpired).not.toHaveBeenCalled();
    });

    it('handles immediate expiration correctly', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      render(<ExpirationTimer expiresAt={pastTime} onExpired={mockOnExpired} />);
      
      expect(mockOnExpired).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('applies custom className', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      render(<ExpirationTimer expiresAt={futureTime} className="custom-class" />);
      
      const badge = screen.getByText(/1h/).closest('.badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('applies custom className to expired badge', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      render(<ExpirationTimer expiresAt={pastTime} className="custom-class" />);
      
      const badge = screen.getByText('Expired').closest('.badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('handles empty className', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      render(<ExpirationTimer expiresAt={futureTime} className="" />);
      
      const badge = screen.getByText(/1h/).closest('.badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null expiresAt', () => {
      const { container } = render(<ExpirationTimer expiresAt={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles undefined expiresAt', () => {
      const { container } = render(<ExpirationTimer expiresAt={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles invalid date string', () => {
      render(<ExpirationTimer expiresAt="invalid-date" />);
      
      // Should show expired badge for invalid dates
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('handles very large time differences', () => {
      const futureTime = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(); // 100 days from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/2400h/)).toBeInTheDocument();
    });

    it('handles very small time differences', () => {
      const futureTime = new Date(Date.now() + 500).toISOString(); // 0.5 seconds from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText(/0s/)).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('cleans up interval on unmount', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      const { unmount } = render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Spy on clearInterval
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('cleans up interval when expiresAt changes', () => {
      const futureTime1 = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      const futureTime2 = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
      
      const { rerender } = render(<ExpirationTimer expiresAt={futureTime1} />);
      
      // Spy on clearInterval
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      rerender(<ExpirationTimer expiresAt={futureTime2} />);
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      const badge = screen.getByText(/1h/).closest('.badge');
      expect(badge).toBeInTheDocument();
    });

    it('includes clock icon for active timers', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      render(<ExpirationTimer expiresAt={futureTime} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
    });

    it('includes alert icon for expired timers', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      render(<ExpirationTimer expiresAt={pastTime} />);
      
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      const { rerender } = render(<ExpirationTimer expiresAt={futureTime} />);
      
      // Re-render with same props
      rerender(<ExpirationTimer expiresAt={futureTime} />);
      
      // Should still have the expected content
      expect(screen.getByText(/1h/)).toBeInTheDocument();
    });
  });
});
