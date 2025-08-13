import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoinBalance from '../CoinBalance';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', token: 'test-token' }
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('CoinBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders coin balance with loading state', () => {
    // Mock fetch to return loading state
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_balance: 0,
        total_earned: 0,
        total_spent: 0
      })
    });

    render(<CoinBalance />);
    
    expect(screen.getByText('Coin Balance')).toBeInTheDocument();
    expect(screen.getByText('0 coins')).toBeInTheDocument();
  });

  test('renders coin balance with actual balance', async () => {
    // Mock fetch to return balance data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_balance: 150,
        total_earned: 200,
        total_spent: 50
      })
    });

    render(<CoinBalance />);
    
    await waitFor(() => {
      expect(screen.getByText('150 coins')).toBeInTheDocument();
      expect(screen.getByText('+200 earned')).toBeInTheDocument();
      expect(screen.getByText('-50 spent')).toBeInTheDocument();
    });
  });

  test('shows purchase button when enabled', () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_balance: 100,
        total_earned: 200,
        total_spent: 100
      })
    });

    render(<CoinBalance showPurchaseButton={true} />);
    
    expect(screen.getByText('Buy Slots')).toBeInTheDocument();
  });

  test('hides purchase button when disabled', () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_balance: 100,
        total_earned: 200,
        total_spent: 100
      })
    });

    render(<CoinBalance showPurchaseButton={false} />);
    
    expect(screen.queryByText('Buy Slots')).not.toBeInTheDocument();
  });

  test('shows low balance warning when balance is low', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_balance: 10,
        total_earned: 200,
        total_spent: 190
      })
    });

    render(<CoinBalance />);
    
    await waitFor(() => {
      expect(screen.getByText('Low Balance')).toBeInTheDocument();
      expect(screen.getByText(/Complete more tasks to earn coins/)).toBeInTheDocument();
    });
  });

  test('handles fetch error gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CoinBalance />);
    
    // Should still render the component even if fetch fails
    expect(screen.getByText('Coin Balance')).toBeInTheDocument();
  });
}); 