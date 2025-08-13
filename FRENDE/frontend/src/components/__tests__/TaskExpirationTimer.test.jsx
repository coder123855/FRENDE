import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskExpirationTimer from '../TaskExpirationTimer';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User' }
  })
}));

describe('TaskExpirationTimer', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    is_completed: false,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    final_coin_reward: 10
  };

  const mockCompletedTask = {
    ...mockTask,
    is_completed: true
  };

  const mockExpiredTask = {
    ...mockTask,
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders countdown timer for active task', () => {
    render(<TaskExpirationTimer task={mockTask} />);
    
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/h/)).toBeInTheDocument(); // Should show hours
  });

  test('renders completed status for completed task', () => {
    render(<TaskExpirationTimer task={mockCompletedTask} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  test('renders expired status for expired task', () => {
    render(<TaskExpirationTimer task={mockExpiredTask} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  test('calls onExpired callback when task expires', async () => {
    const mockOnExpired = jest.fn();
    const expiredTask = {
      ...mockTask,
      expires_at: new Date(Date.now() - 1000).toISOString() // Just expired
    };

    render(<TaskExpirationTimer task={expiredTask} onExpired={mockOnExpired} />);
    
    await waitFor(() => {
      expect(mockOnExpired).toHaveBeenCalledWith(expiredTask);
    });
  });

  test('shows warning when task is about to expire', () => {
    const warningTask = {
      ...mockTask,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    };

    render(<TaskExpirationTimer task={warningTask} />);
    
    expect(screen.getByText(/Expiring Soon/)).toBeInTheDocument();
  });

  test('formats time correctly for different durations', () => {
    const oneDayTask = {
      ...mockTask,
      expires_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString() // 25 hours from now
    };

    render(<TaskExpirationTimer task={oneDayTask} />);
    
    expect(screen.getByText(/1d/)).toBeInTheDocument();
  });
}); 