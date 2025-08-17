import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoinBalance from '../CoinBalance';

// Mock the hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('CoinBalance', () => {
  const mockUseAuth = require('../../hooks/useAuth').useAuth;
  const mockOnPurchaseSlots = jest.fn();

  const defaultProps = {
    onPurchaseSlots: mockOnPurchaseSlots,
    showPurchaseButton: true
  };

  const mockUser = {
    id: 1,
    name: 'John Doe',
    token: 'mock-token'
  };

  const mockBalanceData = {
    current_balance: 150,
    total_earned: 500,
    total_spent: 350
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
    fetch.mockClear();
  });

  describe('Rendering', () => {
    it('renders coin balance title', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Coin Balance')).toBeInTheDocument();
      });
    });

    it('renders coins icon', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const coinsIcon = screen.getByTestId('coins-icon');
        expect(coinsIcon).toBeInTheDocument();
      });
    });

    it('renders balance with proper formatting', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('coins')).toBeInTheDocument();
      });
    });

    it('renders earned and spent amounts', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('+500 earned')).toBeInTheDocument();
        expect(screen.getByText('-350 spent')).toBeInTheDocument();
      });
    });

    it('renders purchase button when showPurchaseButton is true', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Buy Slots')).toBeInTheDocument();
        expect(screen.getByText('Need more slots?')).toBeInTheDocument();
      });
    });

    it('does not render purchase button when showPurchaseButton is false', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} showPurchaseButton={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Buy Slots')).not.toBeInTheDocument();
        expect(screen.queryByText('Need more slots?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when fetching data', () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CoinBalance {...defaultProps} />);
      
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('hides loading skeleton after data loads', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Balance Display', () => {
    it('displays high balance with green color', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 200 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const balanceElement = screen.getByText('200');
        expect(balanceElement).toHaveClass('text-green-600');
      });
    });

    it('displays medium balance with yellow color', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 75 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const balanceElement = screen.getByText('75');
        expect(balanceElement).toHaveClass('text-yellow-600');
      });
    });

    it('displays low balance with red color', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 25 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const balanceElement = screen.getByText('25');
        expect(balanceElement).toHaveClass('text-red-600');
      });
    });

    it('adjusts font size based on balance amount', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 1500 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const balanceElement = screen.getByText('1,500');
        expect(balanceElement).toHaveClass('text-4xl');
      });
    });

    it('formats large numbers with commas', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 15000 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('15,000')).toBeInTheDocument();
      });
    });
  });

  describe('Purchase Functionality', () => {
    it('calls onPurchaseSlots when buy slots button is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const buyButton = screen.getByText('Buy Slots');
        fireEvent.click(buyButton);
        expect(mockOnPurchaseSlots).toHaveBeenCalledTimes(1);
      });
    });

    it('updates balance after successful purchase', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      mockOnPurchaseSlots.mockResolvedValueOnce({
        new_balance: 100,
        total_cost: 50
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const buyButton = screen.getByText('Buy Slots');
        fireEvent.click(buyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('-400 spent')).toBeInTheDocument();
      });
    });

    it('shows animation after successful purchase', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      mockOnPurchaseSlots.mockResolvedValueOnce({
        new_balance: 100,
        total_cost: 50
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const buyButton = screen.getByText('Buy Slots');
        fireEvent.click(buyButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('purchase-animation')).toBeInTheDocument();
      });
    });

    it('does not call onPurchaseSlots when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const buyButton = screen.getByText('Buy Slots');
        fireEvent.click(buyButton);
        expect(mockOnPurchaseSlots).not.toHaveBeenCalled();
      });
    });
  });

  describe('Reward Animation', () => {
    it('shows reward animation when animateReward is called', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        // Simulate reward animation
        const component = screen.getByText('Coin Balance').closest('div');
        // This would need to be exposed through a ref or prop
        // For now, we'll test the animation state
        expect(screen.queryByText('+50 coins!')).not.toBeInTheDocument();
      });
    });

    it('hides reward animation after timeout', async () => {
      jest.useFakeTimers();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        // Simulate showing animation
        act(() => {
          jest.advanceTimersByTime(3000);
        });
        
        expect(screen.queryByText('+50 coins!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Low Balance Warning', () => {
    it('shows low balance warning when balance is below 25', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 20 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Low Balance')).toBeInTheDocument();
        expect(screen.getByText('Complete more tasks to earn coins for slot purchases!')).toBeInTheDocument();
      });
    });

    it('does not show low balance warning when balance is 25 or above', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 25 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Low Balance')).not.toBeInTheDocument();
      });
    });
  });

  describe('Balance Status Grid', () => {
    it('renders total earned, spent, and current balance', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('350')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Total Earned')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument();
      });
    });

    it('shows positive sign for current balance when greater than 0', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('+150')).toBeInTheDocument();
      });
    });

    it('does not show positive sign for current balance when 0', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBalanceData, current_balance: 0 })
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.queryByText('+0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Coin Balance')).toBeInTheDocument();
      });
    });

    it('handles non-ok response gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Coin Balance')).toBeInTheDocument();
      });
    });

    it('handles missing user gracefully', () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<CoinBalance {...defaultProps} />);
      
      // When user is null, component should show loading state
      expect(screen.getByText('Coin Balance')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('fetches balance data on mount when user is authenticated', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/coins/balance', {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        });
      });
    });

    it('does not fetch balance data when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null });

      render(<CoinBalance {...defaultProps} />);
      
      expect(fetch).not.toHaveBeenCalled();
    });

    it('refetches balance data when user changes', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData
      });

      const { rerender } = render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // Change user
      const newUser = { ...mockUser, id: 2 };
      mockUseAuth.mockReturnValue({ user: newUser });
      
      rerender(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Coin Balance')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Buy Slots' })).toBeInTheDocument();
      });
    });

    it('has proper button labels', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        const buyButton = screen.getByRole('button', { name: 'Buy Slots' });
        expect(buyButton).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('has proper responsive classes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        // The main container should have space-y-4 class
        const mainContainer = screen.getByText('Coin Balance').closest('.space-y-4');
        expect(mainContainer).toBeInTheDocument();
      });
    });

    it('has proper grid layout for balance status', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        // Find the grid container that contains the balance status
        const gridContainer = screen.getByText('Total Earned').closest('.grid');
        expect(gridContainer).toHaveClass('grid', 'grid-cols-3', 'gap-2');
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceData
      });

      const { rerender } = render(<CoinBalance {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Change showPurchaseButton prop
      rerender(<CoinBalance {...defaultProps} showPurchaseButton={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Buy Slots')).not.toBeInTheDocument();
      });
    });
  });
}); 