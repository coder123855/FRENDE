import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CacheStatus from '../CacheStatus';

// Mock the useCacheStatus hook
jest.mock('../../hooks/useCache.js', () => ({
  useCacheStatus: jest.fn()
}));

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, className, ...props }) => (
    <div className={className} {...props}>{children}</div>
  );
  const MockCardHeader = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockCardContent = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockCardTitle = ({ children, ...props }) => <h3 {...props}>{children}</h3>;
  return {
    Card: MockCard,
    CardHeader: MockCardHeader,
    CardContent: MockCardContent,
    CardTitle: MockCardTitle
  };
});

jest.mock('../ui/badge', () => {
  const MockBadge = ({ children, variant, className, ...props }) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  );
  return { Badge: MockBadge };
});

jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, disabled, variant, size, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`button ${variant} ${size}`}
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

jest.mock('../ui/progress', () => {
  const MockProgress = ({ value, className, ...props }) => (
    <div className={`progress ${className}`} data-value={value} {...props}>
      <div className="progress-bar" style={{ width: `${value}%` }}></div>
    </div>
  );
  return { Progress: MockProgress };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Database: ({ className, ...props }) => <div className={`icon database ${className}`} {...props}>Database</div>,
  Activity: ({ className, ...props }) => <div className={`icon activity ${className}`} {...props}>Activity</div>,
  RefreshCw: ({ className, ...props }) => <div className={`icon refresh ${className}`} {...props}>Refresh</div>,
  Trash2: ({ className, ...props }) => <div className={`icon trash ${className}`} {...props}>Trash</div>,
  CheckCircle: ({ className, ...props }) => <div className={`icon check ${className}`} {...props}>Check</div>,
  AlertTriangle: ({ className, ...props }) => <div className={`icon alert ${className}`} {...props}>Alert</div>,
  Clock: ({ className, ...props }) => <div className={`icon clock ${className}`} {...props}>Clock</div>,
  HardDrive: ({ className, ...props }) => <div className={`icon harddrive ${className}`} {...props}>HardDrive</div>,
  Memory: ({ className, ...props }) => <div className={`icon memory ${className}`} {...props}>Memory</div>
}));

describe('CacheStatus', () => {
  const mockUseCacheStatus = require('../../hooks/useCache.js').useCacheStatus;
  const mockClearCache = jest.fn();
  const mockRefresh = jest.fn();

  const defaultMockStats = {
    hits: 1500,
    misses: 300,
    sets: 800,
    deletes: 100,
    errors: 5,
    hitRate: 0.833, // 83.3%
    memorySize: 52428800, // 50MB
    memoryMaxSize: 104857600 // 100MB
  };

  const defaultMockValues = {
    stats: defaultMockStats,
    cacheSize: 1250,
    loading: false,
    clearCache: mockClearCache,
    refresh: mockRefresh
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCacheStatus.mockReturnValue(defaultMockValues);
  });

  describe('Rendering', () => {
    it('renders the main title with database icon', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Cache Status')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
    });

    it('renders performance overview section', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Hit Rate')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Total Entries')).toBeInTheDocument();
    });

    it('renders progress bars', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    });

    it('renders statistics grid', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Cache Hits')).toBeInTheDocument();
      expect(screen.getByText('Cache Misses')).toBeInTheDocument();
      expect(screen.getByText('Cache Sets')).toBeInTheDocument();
      expect(screen.getByText('Cache Deletes')).toBeInTheDocument();
    });

    it('renders request summary', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('1,800')).toBeInTheDocument(); // 1500 + 300
    });

    it('renders health status', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Cache Health')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading is true', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        loading: true
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Loading cache status...')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('disables action buttons during loading', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        loading: true
      });
      
      render(<CacheStatus />);
      
      const refreshButton = screen.getByText('Refresh').closest('button');
      const clearButton = screen.getByText('Trash').closest('button');
      
      expect(refreshButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });

    it('shows spinning refresh icon during loading', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        loading: true
      });
      
      render(<CacheStatus />);
      
      const refreshIcon = screen.getByText('Refresh').closest('.icon');
      expect(refreshIcon).toHaveClass('animate-spin');
    });
  });

  describe('Error State', () => {
    it('shows error state when stats is null', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: null
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Cache service not available')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('shows error count when errors exist', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not show error count when no errors', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, errors: 0 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.queryByText('Errors')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls refresh function when refresh button is clicked', () => {
      render(<CacheStatus />);
      
      const refreshButton = screen.getByText('Refresh').closest('button');
      fireEvent.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls clearCache function when clear button is clicked', () => {
      render(<CacheStatus />);
      
      const clearButton = screen.getByText('Trash').closest('button');
      fireEvent.click(clearButton);
      
      expect(mockClearCache).toHaveBeenCalledTimes(1);
    });

    it('does not call functions when buttons are disabled', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        loading: true
      });
      
      render(<CacheStatus />);
      
      const refreshButton = screen.getByText('Refresh').closest('button');
      const clearButton = screen.getByText('Trash').closest('button');
      
      fireEvent.click(refreshButton);
      fireEvent.click(clearButton);
      
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockClearCache).not.toHaveBeenCalled();
    });
  });

  describe('Data Display', () => {
    it('displays hit rate with correct formatting', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('83.3%')).toBeInTheDocument();
    });

    it('displays memory usage with correct formatting', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });

    it('displays cache size with correct formatting', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('displays statistics with correct formatting', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('1,500')).toBeInTheDocument(); // hits
      expect(screen.getByText('300')).toBeInTheDocument(); // misses
      expect(screen.getByText('800')).toBeInTheDocument(); // sets
      expect(screen.getByText('100')).toBeInTheDocument(); // deletes
    });

    it('displays total requests correctly', () => {
      render(<CacheStatus />);
      
      expect(screen.getByText('1,800')).toBeInTheDocument(); // hits + misses
    });
  });

  describe('Hit Rate Badge Logic', () => {
    it('shows excellent badge for hit rate >= 80%', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.85 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('shows good badge for hit rate >= 60% and < 80%', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.75 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('shows poor badge for hit rate < 60%', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.55 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  describe('Health Status Logic', () => {
    it('shows healthy status when hit rate >= 60% and no errors', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, errors: 0 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Check')).toBeInTheDocument();
    });

    it('shows needs attention when hit rate < 60%', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.55 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('shows needs attention when errors > 0', () => {
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, errors: 1 }
      });
      
      render(<CacheStatus />);
      
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('renders memory usage progress bar with correct value', () => {
      render(<CacheStatus />);
      
      const memoryProgress = screen.getByText('Memory Usage').closest('div').querySelector('.progress');
      expect(memoryProgress).toHaveAttribute('data-value', '50');
    });

    it('renders hit rate progress bar with correct value', () => {
      render(<CacheStatus />);
      
      const hitRateProgress = screen.getByText('Cache Hit Rate').closest('div').querySelector('.progress');
      expect(hitRateProgress).toHaveAttribute('data-value', '83.3');
    });
  });

  describe('Color Coding', () => {
    it('applies correct colors for hit rate', () => {
      // Test excellent hit rate
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.85 }
      });
      
      const { rerender } = render(<CacheStatus />);
      expect(screen.getByText('85.0%')).toHaveClass('text-green-600');
      
      // Test good hit rate
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.75 }
      });
      
      rerender(<CacheStatus />);
      expect(screen.getByText('75.0%')).toHaveClass('text-yellow-600');
      
      // Test poor hit rate
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hitRate: 0.55 }
      });
      
      rerender(<CacheStatus />);
      expect(screen.getByText('55.0%')).toHaveClass('text-red-600');
    });

    it('applies correct colors for memory usage', () => {
      // Test low memory usage
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, memorySize: 20971520, memoryMaxSize: 104857600 } // 20MB / 100MB
      });
      
      const { rerender } = render(<CacheStatus />);
      expect(screen.getByText('20.0%')).toHaveClass('text-green-600');
      
      // Test medium memory usage
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, memorySize: 73400320, memoryMaxSize: 104857600 } // 70MB / 100MB
      });
      
      rerender(<CacheStatus />);
      expect(screen.getByText('70.0%')).toHaveClass('text-yellow-600');
      
      // Test high memory usage
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, memorySize: 94371840, memoryMaxSize: 104857600 } // 90MB / 100MB
      });
      
      rerender(<CacheStatus />);
      expect(screen.getByText('90.0%')).toHaveClass('text-red-600');
    });
  });

  describe('Hook Integration', () => {
    it('integrates with useCacheStatus hook correctly', () => {
      render(<CacheStatus />);
      
      expect(mockUseCacheStatus).toHaveBeenCalled();
    });

    it('handles hook state changes correctly', () => {
      const { rerender } = render(<CacheStatus />);
      
      // Change hook state
      mockUseCacheStatus.mockReturnValue({
        ...defaultMockValues,
        stats: { ...defaultMockStats, hits: 2000, misses: 500 }
      });
      
      rerender(<CacheStatus />);
      
      expect(screen.getByText('2,000')).toBeInTheDocument(); // updated hits
      expect(screen.getByText('500')).toBeInTheDocument(); // updated misses
      expect(screen.getByText('2,500')).toBeInTheDocument(); // updated total requests
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<CacheStatus />);
      
      const mainTitle = screen.getByRole('heading', { level: 3 });
      expect(mainTitle).toHaveTextContent('Cache Status');
    });

    it('has proper button labels', () => {
      render(<CacheStatus />);
      
      const refreshButton = screen.getByRole('button');
      const clearButton = screen.getAllByRole('button')[1];
      
      expect(refreshButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();
    });

    it('has proper progress bar semantics', () => {
      render(<CacheStatus />);
      
      const progressBars = document.querySelectorAll('.progress');
      expect(progressBars).toHaveLength(2);
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container structure', () => {
      render(<CacheStatus />);
      
      const container = screen.getByText('Cache Status').closest('.w-full');
      expect(container).toBeInTheDocument();
    });

    it('has proper grid layouts', () => {
      render(<CacheStatus />);
      
      // Check for grid classes in the rendered content
      const gridElements = document.querySelectorAll('.grid');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('has proper responsive design classes', () => {
      render(<CacheStatus />);
      
      // Check for responsive classes
      const responsiveElements = document.querySelectorAll('.md\\:grid-cols-3, .md\\:grid-cols-4');
      expect(responsiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles missing hook functions gracefully', () => {
      mockUseCacheStatus.mockReturnValue({
        stats: defaultMockStats,
        cacheSize: 1250,
        loading: false,
        clearCache: undefined,
        refresh: undefined
      });
      
      render(<CacheStatus />);
      
      // Should render without crashing
      expect(screen.getByText('Cache Status')).toBeInTheDocument();
    });

    it('handles undefined hook values gracefully', () => {
      mockUseCacheStatus.mockReturnValue({
        stats: undefined,
        cacheSize: undefined,
        loading: false,
        clearCache: mockClearCache,
        refresh: mockRefresh
      });
      
      render(<CacheStatus />);
      
      // Should render without crashing
      expect(screen.getByText('Cache Status')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const { rerender } = render(<CacheStatus />);
      
      // Re-render with same hook values
      rerender(<CacheStatus />);
      
      // Should still have all the expected content
      expect(screen.getByText('Cache Status')).toBeInTheDocument();
    });
  });
});
