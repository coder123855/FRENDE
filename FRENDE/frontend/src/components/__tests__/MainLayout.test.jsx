import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '../MainLayout';

// Mock the hooks and components
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../hooks/useOffline.js', () => ({
  useOfflineState: jest.fn(),
  useSync: jest.fn()
}));

jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

jest.mock('../Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation Component</div>;
  };
});

jest.mock('../NotificationSystem', () => {
  return function MockNotificationSystem() {
    return <div data-testid="notification-system">Notification System</div>;
  };
});

jest.mock('../offline/OfflineStatus', () => {
  return function MockOfflineStatus() {
    return <div data-testid="offline-status">Offline Status</div>;
  };
});

describe('MainLayout', () => {
  const mockUseAuth = require('../../contexts/AuthContext').useAuth;
  const mockUseOfflineState = require('../../hooks/useOffline.js').useOfflineState;
  const mockUseSync = require('../../hooks/useOffline.js').useSync;
  const mockUseAccessibility = require('../../hooks/useAccessibility').useAccessibility;

  const defaultProps = {
    children: <div data-testid="test-children">Test Content</div>
  };

  const defaultMocks = {
    auth: {
      loading: false
    },
    offline: {
      isOnline: true,
      syncInProgress: false
    },
    sync: {
      syncStatus: {
        pendingActions: 0
      }
    },
    accessibility: {
      highContrast: false,
      fontSize: 'medium',
      reducedMotion: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockUseAuth.mockReturnValue(defaultMocks.auth);
    mockUseOfflineState.mockReturnValue(defaultMocks.offline);
    mockUseSync.mockReturnValue(defaultMocks.sync);
    mockUseAccessibility.mockReturnValue(defaultMocks.accessibility);
  });

  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders navigation component', () => {
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });

    it('renders notification system', () => {
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByTestId('notification-system')).toBeInTheDocument();
    });

    it('renders main content with proper role and id', () => {
      render(<MainLayout {...defaultProps} />);
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toHaveAttribute('id', 'main-content');
    });

    it('renders skip to main content link', () => {
      render(<MainLayout {...defaultProps} />);
      
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
      expect(skipLink).toHaveClass('skip-link');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({ loading: true });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('does not render children when loading', () => {
      mockUseAuth.mockReturnValue({ loading: true });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigation')).not.toBeInTheDocument();
    });

    it('shows loading spinner with proper styling', () => {
      mockUseAuth.mockReturnValue({ loading: true });
      
      render(<MainLayout {...defaultProps} />);
      
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-12', 'w-12', 'border-b-2', 'border-blue-600');
    });
  });

  describe('Offline State', () => {
    it('shows offline status bar when user is offline', () => {
      mockUseOfflineState.mockReturnValue({
        isOnline: false,
        syncInProgress: false
      });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByText('You are offline')).toBeInTheDocument();
      expect(screen.getByText('0 pending actions')).toBeInTheDocument();
    });

    it('does not show offline status bar when user is online', () => {
      mockUseOfflineState.mockReturnValue({
        isOnline: true,
        syncInProgress: false
      });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.queryByText('You are offline')).not.toBeInTheDocument();
    });

    it('shows sync progress when syncing', () => {
      mockUseOfflineState.mockReturnValue({
        isOnline: false,
        syncInProgress: true
      });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('shows correct number of pending actions', () => {
      mockUseOfflineState.mockReturnValue({
        isOnline: false,
        syncInProgress: false
      });
      mockUseSync.mockReturnValue({
        syncStatus: {
          pendingActions: 5
        }
      });
      
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByText('5 pending actions')).toBeInTheDocument();
    });

    it('applies correct styling to offline status bar', () => {
      mockUseOfflineState.mockReturnValue({
        isOnline: false,
        syncInProgress: false
      });
      
      render(<MainLayout {...defaultProps} />);
      
      const offlineBar = screen.getByText('You are offline').closest('div');
      expect(offlineBar).toHaveClass('bg-orange-50', 'border-b', 'border-orange-200');
    });
  });

  describe('Accessibility Features', () => {
    it('applies high contrast class when enabled', () => {
      mockUseAccessibility.mockReturnValue({
        highContrast: true,
        fontSize: 'medium',
        reducedMotion: false
      });
      
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      expect(container).toHaveClass('high-contrast');
    });

    it('applies font size data attribute', () => {
      mockUseAccessibility.mockReturnValue({
        highContrast: false,
        fontSize: 'large',
        reducedMotion: false
      });
      
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      expect(container).toHaveAttribute('data-font-size', 'large');
    });

    it('applies reduced motion data attribute', () => {
      mockUseAccessibility.mockReturnValue({
        highContrast: false,
        fontSize: 'medium',
        reducedMotion: true
      });
      
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      expect(container).toHaveAttribute('data-reduced-motion', 'true');
    });

    it('applies all accessibility attributes together', () => {
      mockUseAccessibility.mockReturnValue({
        highContrast: true,
        fontSize: 'small',
        reducedMotion: true
      });
      
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      expect(container).toHaveClass('high-contrast');
      expect(container).toHaveAttribute('data-font-size', 'small');
      expect(container).toHaveAttribute('data-reduced-motion', 'true');
    });
  });

  describe('Layout Structure', () => {
    it('has proper container structure', () => {
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      expect(container).toHaveClass('min-h-screen', 'bg-gray-50');
    });

    it('has proper main content styling', () => {
      render(<MainLayout {...defaultProps} />);
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'py-4');
    });

    it('renders content in proper order', () => {
      render(<MainLayout {...defaultProps} />);
      
      const container = screen.getByTestId('test-children').closest('div');
      const children = container.children;
      
      // Check that skip link comes first
      expect(children[0]).toHaveTextContent('Skip to main content');
      
      // Check that notification system is present
      expect(screen.getByTestId('notification-system')).toBeInTheDocument();
      
      // Check that navigation is present
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      
      // Check that main content is present
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive padding classes', () => {
      render(<MainLayout {...defaultProps} />);
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('px-4', 'py-4', 'sm:px-6', 'sm:py-6', 'lg:px-8', 'lg:py-8');
    });
  });

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      render(<MainLayout />);
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      render(<MainLayout children={null} />);
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const { rerender } = render(<MainLayout {...defaultProps} />);
      
      // Change children
      rerender(<MainLayout children={<div data-testid="new-children">New Content</div>} />);
      
      expect(screen.getByTestId('new-children')).toBeInTheDocument();
      expect(screen.getByText('New Content')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with all required hooks', () => {
      render(<MainLayout {...defaultProps} />);
      
      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseOfflineState).toHaveBeenCalled();
      expect(mockUseSync).toHaveBeenCalled();
      expect(mockUseAccessibility).toHaveBeenCalled();
    });

    it('renders all required child components', () => {
      render(<MainLayout {...defaultProps} />);
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('notification-system')).toBeInTheDocument();
      expect(screen.getByTestId('test-children')).toBeInTheDocument();
    });
  });
});
