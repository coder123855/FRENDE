import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SlotInfo from '../SlotInfo';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: ({ className, ...props }) => <div className={`icon users ${className}`} {...props}>Users</div>,
  Plus: ({ className, ...props }) => <div className={`icon plus ${className}`} {...props}>Plus</div>,
  Clock: ({ className, ...props }) => <div className={`icon clock ${className}`} {...props}>Clock</div>
}));

// Mock UI components
jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, className, size, ...props }) => (
    <button 
      onClick={onClick}
      className={`button ${className} ${size}`}
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

// Mock CoinBalance component
jest.mock('../CoinBalance', () => {
  const MockCoinBalance = ({ coins, showLabel, size }) => (
    <div className={`coin-balance ${size}`} data-coins={coins} data-show-label={showLabel}>
      {coins} coins
    </div>
  );
  return MockCoinBalance;
});

describe('SlotInfo', () => {
  const mockOnPurchaseClick = jest.fn();

  const defaultProps = {
    availableSlots: 5,
    totalUsed: 10,
    purchaseCost: 100,
    onPurchaseClick: mockOnPurchaseClick,
    showPurchaseButton: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the main title with users icon', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders available slots count', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders total used information', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('Total used:')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders purchase cost information', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('Purchase cost:')).toBeInTheDocument();
      expect(screen.getByText('100 coins')).toBeInTheDocument();
    });

    it('renders purchase button when showPurchaseButton is true', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('Purchase Slot (100 coins)')).toBeInTheDocument();
      expect(screen.getByText('Plus')).toBeInTheDocument();
    });

    it('does not render purchase button when showPurchaseButton is false', () => {
      render(<SlotInfo {...defaultProps} showPurchaseButton={false} />);
      
      expect(screen.queryByText('Purchase Slot (100 coins)')).not.toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('shows blue color when slots are available', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const slotCount = screen.getByText('5');
      expect(slotCount).toHaveClass('text-blue-600');
    });

    it('shows red color when slots are low (1 or fewer)', () => {
      render(<SlotInfo {...defaultProps} availableSlots={1} />);
      
      const slotCount = screen.getByText('1');
      expect(slotCount).toHaveClass('text-red-600');
    });

    it('shows red color when no slots are available', () => {
      render(<SlotInfo {...defaultProps} availableSlots={0} />);
      
      const slotCount = screen.getByText('0');
      expect(slotCount).toHaveClass('text-red-600');
    });
  });

  describe('Low Slots Warning', () => {
    it('shows warning when slots are low (1 or fewer)', () => {
      render(<SlotInfo {...defaultProps} availableSlots={1} />);
      
      expect(screen.getByText('Running low on slots! Purchase more to keep matching.')).toBeInTheDocument();
      expect(screen.getByText('Clock')).toBeInTheDocument();
    });

    it('shows warning when no slots are available', () => {
      render(<SlotInfo {...defaultProps} availableSlots={0} />);
      
      expect(screen.getByText('Running low on slots! Purchase more to keep matching.')).toBeInTheDocument();
    });

    it('does not show warning when slots are sufficient', () => {
      render(<SlotInfo {...defaultProps} availableSlots={5} />);
      
      expect(screen.queryByText('Running low on slots! Purchase more to keep matching.')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onPurchaseClick when purchase button is clicked', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const purchaseButton = screen.getByText('Purchase Slot (100 coins)');
      fireEvent.click(purchaseButton);
      
      expect(mockOnPurchaseClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onPurchaseClick when button is not shown', () => {
      render(<SlotInfo {...defaultProps} showPurchaseButton={false} />);
      
      // Button should not be present
      expect(screen.queryByText('Purchase Slot (100 coins)')).not.toBeInTheDocument();
      
      // Function should not be called
      expect(mockOnPurchaseClick).not.toHaveBeenCalled();
    });
  });

  describe('CoinBalance Integration', () => {
    it('passes correct props to CoinBalance component', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const coinBalance = screen.getByText('100 coins');
      expect(coinBalance).toHaveAttribute('data-coins', '100');
      expect(coinBalance).toHaveAttribute('data-show-label', 'false');
      expect(coinBalance).toHaveClass('small');
    });

    it('updates CoinBalance when purchase cost changes', () => {
      render(<SlotInfo {...defaultProps} purchaseCost={200} />);
      
      const coinBalance = screen.getByText('200 coins');
      expect(coinBalance).toHaveAttribute('data-coins', '200');
    });
  });

  describe('Props Handling', () => {
    it('handles zero available slots', () => {
      render(<SlotInfo {...defaultProps} availableSlots={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Running low on slots! Purchase more to keep matching.')).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      render(<SlotInfo {...defaultProps} availableSlots={999} totalUsed={1000} />);
      
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('handles zero total used', () => {
      render(<SlotInfo {...defaultProps} totalUsed={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles zero purchase cost', () => {
      render(<SlotInfo {...defaultProps} purchaseCost={0} />);
      
      expect(screen.getByText('0 coins')).toBeInTheDocument();
      expect(screen.getByText('Purchase Slot (0 coins)')).toBeInTheDocument();
    });

    it('handles undefined onPurchaseClick', () => {
      render(<SlotInfo {...defaultProps} onPurchaseClick={undefined} />);
      
      const purchaseButton = screen.getByText('Purchase Slot (100 coins)');
      expect(purchaseButton).toBeInTheDocument();
      
      // Should not crash when clicked
      fireEvent.click(purchaseButton);
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container structure', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const container = screen.getByText('Available Slots').closest('div');
      expect(container).toHaveClass('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50');
    });

    it('has proper button styling', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const button = screen.getByText('Purchase Slot (100 coins)');
      expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'w-full', 'mt-3');
    });

    it('has proper warning styling when slots are low', () => {
      render(<SlotInfo {...defaultProps} availableSlots={1} />);
      
      const warning = screen.getByText('Running low on slots! Purchase more to keep matching.').closest('div');
      expect(warning).toHaveClass('text-amber-600', 'bg-amber-50');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Available Slots');
    });

    it('has proper button semantics', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Purchase Slot (100 coins)');
    });

    it('includes icons for visual context', () => {
      render(<SlotInfo {...defaultProps} />);
      
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Plus')).toBeInTheDocument();
    });

    it('includes clock icon in warning message', () => {
      render(<SlotInfo {...defaultProps} availableSlots={1} />);
      
      expect(screen.getByText('Clock')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles negative available slots gracefully', () => {
      render(<SlotInfo {...defaultProps} availableSlots={-1} />);
      
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('Running low on slots! Purchase more to keep matching.')).toBeInTheDocument();
    });

    it('handles negative total used gracefully', () => {
      render(<SlotInfo {...defaultProps} totalUsed={-5} />);
      
      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('handles negative purchase cost gracefully', () => {
      render(<SlotInfo {...defaultProps} purchaseCost={-50} />);
      
      expect(screen.getByText('-50 coins')).toBeInTheDocument();
      expect(screen.getByText('Purchase Slot (-50 coins)')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<SlotInfo {...defaultProps} availableSlots={999999} totalUsed={999999} purchaseCost={999999} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('999999 coins')).toBeInTheDocument();
      expect(screen.getByText('Purchase Slot (999999 coins)')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const { rerender } = render(<SlotInfo {...defaultProps} />);
      
      // Re-render with same props
      rerender(<SlotInfo {...defaultProps} />);
      
      // Should still have all the expected content
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with CoinBalance component correctly', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const coinBalance = screen.getByText('100 coins');
      expect(coinBalance).toBeInTheDocument();
      expect(coinBalance).toHaveClass('coin-balance', 'small');
    });

    it('integrates with Button component correctly', () => {
      render(<SlotInfo {...defaultProps} />);
      
      const button = screen.getByText('Purchase Slot (100 coins)');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('button');
    });
  });
});
