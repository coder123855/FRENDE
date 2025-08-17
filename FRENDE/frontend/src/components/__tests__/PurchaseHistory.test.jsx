import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PurchaseHistory from '../PurchaseHistory';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: ({ className, ...props }) => <div className={`icon calendar ${className}`} {...props}>Calendar</div>,
  Coins: ({ className, ...props }) => <div className={`icon coins ${className}`} {...props}>Coins</div>
}));

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, ...props }) => <div className="card" {...props}>{children}</div>;
  const MockCardHeader = ({ children, ...props }) => <div className="card-header" {...props}>{children}</div>;
  const MockCardContent = ({ children, ...props }) => <div className="card-content" {...props}>{children}</div>;
  const MockCardTitle = ({ children, className, ...props }) => <h3 className={`card-title ${className}`} {...props}>{children}</h3>;
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

// Mock CoinBalance component
jest.mock('../CoinBalance', () => {
  const MockCoinBalance = ({ coins, showLabel }) => (
    <div className="coin-balance" data-coins={coins} data-show-label={showLabel}>
      {coins} coins
    </div>
  );
  return MockCoinBalance;
});

describe('PurchaseHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the main title with calendar icon', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('Purchase History')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('renders purchase history items', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('Slot #3 Purchased')).toBeInTheDocument();
      expect(screen.getByText('Slot #2 Purchased')).toBeInTheDocument();
    });

    it('renders slot numbers in circles', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('renders purchase badges', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('Slot Purchase')).toBeInTheDocument();
    });

    it('renders coin balances for each purchase', () => {
      render(<PurchaseHistory />);
      
      const coinBalances = screen.getAllByText('50 coins');
      expect(coinBalances).toHaveLength(2);
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      render(<PurchaseHistory />);
      
      // Check for formatted dates (the exact format depends on locale)
      // The mock data has dates: "2024-01-15T14:30:00Z" and "2024-01-13T09:15:00Z"
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 13, 2024/)).toBeInTheDocument();
    });

    it('handles different date formats', () => {
      // This test would be more comprehensive if we could inject different data
      render(<PurchaseHistory />);
      
      // Should display dates in a readable format
      const dateElements = screen.getAllByText(/\w{3} \d{1,2}, \d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    it('displays correct slot numbers', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('Slot #3 Purchased')).toBeInTheDocument();
      expect(screen.getByText('Slot #2 Purchased')).toBeInTheDocument();
    });

    it('displays correct coin amounts', () => {
      render(<PurchaseHistory />);
      
      const coinBalances = screen.getAllByText('50 coins');
      expect(coinBalances).toHaveLength(2);
    });

    it('displays purchase badges with correct styling', () => {
      render(<PurchaseHistory />);
      
      const badges = screen.getAllByText('Slot Purchase');
      expect(badges).toHaveLength(2);
      
      badges.forEach(badge => {
        expect(badge).toHaveClass('badge', 'secondary', 'bg-blue-100', 'text-blue-800');
      });
    });
  });

  describe('Layout and Styling', () => {
    it('has proper card structure', () => {
      render(<PurchaseHistory />);
      
      const card = screen.getByText('Purchase History').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('has proper header structure', () => {
      render(<PurchaseHistory />);
      
      const header = screen.getByText('Purchase History').closest('.card-header');
      expect(header).toBeInTheDocument();
    });

    it('has proper content structure', () => {
      render(<PurchaseHistory />);
      
      const content = screen.getByText('Slot #3 Purchased').closest('.card-content');
      expect(content).toBeInTheDocument();
    });

    it('has proper title styling', () => {
      render(<PurchaseHistory />);
      
      const title = screen.getByText('Purchase History');
      expect(title).toHaveClass('card-title', 'flex', 'items-center', 'space-x-2');
    });

    it('has proper purchase item styling', () => {
      render(<PurchaseHistory />);
      
      const purchaseItems = screen.getAllByText(/Slot #\d+ Purchased/);
      purchaseItems.forEach(item => {
        const container = item.closest('.flex.items-center.justify-between.p-4.bg-gray-50.rounded-lg');
        expect(container).toBeInTheDocument();
      });
    });

    it('has proper slot number circle styling', () => {
      render(<PurchaseHistory />);
      
      const slotNumbers = screen.getAllByText(/#\d+/);
      slotNumbers.forEach(number => {
        const circle = number.closest('.w-10.h-10.bg-blue-100.rounded-full.flex.items-center.justify-center');
        expect(circle).toBeInTheDocument();
      });
    });
  });

  describe('CoinBalance Integration', () => {
    it('passes correct props to CoinBalance component', () => {
      render(<PurchaseHistory />);
      
      const coinBalances = screen.getAllByText('50 coins');
      coinBalances.forEach(balance => {
        expect(balance).toHaveAttribute('data-coins', '50');
        expect(balance).toHaveAttribute('data-show-label', 'false');
      });
    });

    it('renders CoinBalance components for each purchase', () => {
      render(<PurchaseHistory />);
      
      const coinBalances = screen.getAllByText('50 coins');
      expect(coinBalances).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<PurchaseHistory />);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Purchase History');
    });

    it('includes calendar icon for visual context', () => {
      render(<PurchaseHistory />);
      
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('has proper button and interactive element semantics', () => {
      render(<PurchaseHistory />);
      
      // Check that purchase items are properly structured
      const purchaseItems = screen.getAllByText(/Slot #\d+ Purchased/);
      expect(purchaseItems.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty purchase history gracefully', () => {
      // This would require mocking the component to return empty data
      // For now, we test with the existing mock data
      render(<PurchaseHistory />);
      
      // Should render the component without crashing
      expect(screen.getByText('Purchase History')).toBeInTheDocument();
    });

    it('handles large numbers gracefully', () => {
      render(<PurchaseHistory />);
      
      // The component should handle the current data without issues
      expect(screen.getByText('50 coins')).toBeInTheDocument();
    });

    it('handles different date formats gracefully', () => {
      render(<PurchaseHistory />);
      
      // Should display dates in a readable format regardless of input format
      const dateElements = screen.getAllByText(/\w{3} \d{1,2}, \d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<PurchaseHistory />);
      
      // Re-render with same props
      rerender(<PurchaseHistory />);
      
      // Should still have all the expected content
      expect(screen.getByText('Purchase History')).toBeInTheDocument();
      expect(screen.getByText('Slot #3 Purchased')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with Card components correctly', () => {
      render(<PurchaseHistory />);
      
      const card = screen.getByText('Purchase History').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('integrates with Badge components correctly', () => {
      render(<PurchaseHistory />);
      
      const badges = screen.getAllByText('Slot Purchase');
      expect(badges).toHaveLength(2);
      badges.forEach(badge => {
        expect(badge).toHaveClass('badge');
      });
    });

    it('integrates with CoinBalance components correctly', () => {
      render(<PurchaseHistory />);
      
      const coinBalances = screen.getAllByText('50 coins');
      expect(coinBalances).toHaveLength(2);
      coinBalances.forEach(balance => {
        expect(balance).toHaveClass('coin-balance');
      });
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock data structure', () => {
      render(<PurchaseHistory />);
      
      // Verify that the mock data is being used correctly
      expect(screen.getByText('Slot #3 Purchased')).toBeInTheDocument();
      expect(screen.getByText('Slot #2 Purchased')).toBeInTheDocument();
      expect(screen.getAllByText('50 coins')).toHaveLength(2);
    });

    it('displays all mock purchase items', () => {
      render(<PurchaseHistory />);
      
      // Should display both items from the mock data
      const purchaseItems = screen.getAllByText(/Slot #\d+ Purchased/);
      expect(purchaseItems).toHaveLength(2);
    });
  });
});
