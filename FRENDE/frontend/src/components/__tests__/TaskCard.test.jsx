import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskCard from '../TaskCard';
import { OfflineProvider } from '../../contexts/OfflineContext';

const mockTask = {
  id: 1,
  title: 'Tell your friend about your first pet',
  description: 'Share the name and story of your first pet with your friend',
  reward: 10,
  type: 'bonding',
  difficulty: 'easy',
  estimated_time: 5,
  is_completed: false,
  expires_at: '2024-12-31T23:59:59Z',
  created_at: '2024-01-01T00:00:00Z'
};

const mockProps = {
  task: mockTask,
  onComplete: jest.fn(),
  onViewDetails: jest.fn(),
  onReplace: jest.fn(),
  isSubmitting: false,
  disabled: false
};

// Helper function to render with OfflineProvider
const renderWithOfflineProvider = (component) => {
  return render(
    <OfflineProvider>
      {component}
    </OfflineProvider>
  );
};

describe('TaskCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders task information correctly', () => {
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      expect(screen.getByText('Tell your friend about your first pet')).toBeInTheDocument();
      expect(screen.getByText('Share the name and story of your first pet with your friend')).toBeInTheDocument();
      expect(screen.getByText('10 coins')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
    });

    it('renders task type badge correctly', () => {
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      const typeBadge = screen.getByText('bonding');
      expect(typeBadge).toBeInTheDocument();
      expect(typeBadge).toHaveClass('badge-bonding');
    });

    it('renders difficulty indicator correctly', () => {
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      const difficultyBadge = screen.getByText('Easy');
      expect(difficultyBadge).toBeInTheDocument();
      expect(difficultyBadge).toHaveClass('difficulty-easy');
    });

    it('renders completion status correctly for incomplete task', () => {
      render(<TaskCard {...mockProps} />);

      expect(screen.getByText(/not completed/i)).toBeInTheDocument();
      expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    });

    it('renders completion status correctly for completed task', () => {
      const completedTask = { ...mockTask, is_completed: true };
      renderWithOfflineProvider(<TaskCard {...mockProps} task={completedTask} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.queryByText(/not completed/i)).not.toBeInTheDocument();
    });

    it('renders action buttons correctly', () => {
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /replace task/i })).toBeInTheDocument();
    });

    it('renders with custom className when provided', () => {
      renderWithOfflineProvider(<TaskCard {...mockProps} className="custom-class" />);

      const taskCard = screen.getByTestId('task-card');
      expect(taskCard).toHaveClass('custom-class');
    });
  });

  describe('User Interactions', () => {
    it('calls onComplete when complete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      await user.click(completeButton);

      expect(mockProps.onComplete).toHaveBeenCalledWith(mockTask.id);
    });

    it('calls onViewDetails when view details button is clicked', async () => {
      const user = userEvent.setup();
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockTask.id);
    });

    it('calls onReplace when replace button is clicked', async () => {
      const user = userEvent.setup();
      renderWithOfflineProvider(<TaskCard {...mockProps} />);

      const replaceButton = screen.getByRole('button', { name: /replace task/i });
      await user.click(replaceButton);

      expect(mockProps.onReplace).toHaveBeenCalledWith(mockTask.id);
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TaskCard {...mockProps} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      const replaceButton = screen.getByRole('button', { name: /replace task/i });

      await user.tab();
      expect(completeButton).toHaveFocus();

      await user.tab();
      expect(viewDetailsButton).toHaveFocus();

      await user.tab();
      expect(replaceButton).toHaveFocus();
    });

    it('handles Enter key press on buttons', async () => {
      const user = userEvent.setup();
      render(<TaskCard {...mockProps} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      await user.click(completeButton);
      await user.keyboard('{Enter}');

      expect(mockProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('shows loading state when isSubmitting is true', () => {
      render(<TaskCard {...mockProps} isSubmitting={true} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      expect(completeButton).toBeDisabled();
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    it('disables all buttons when isSubmitting is true', () => {
      render(<TaskCard {...mockProps} isSubmitting={true} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      const replaceButton = screen.getByRole('button', { name: /replace task/i });

      expect(completeButton).toBeDisabled();
      expect(viewDetailsButton).toBeDisabled();
      expect(replaceButton).toBeDisabled();
    });

    it('shows loading spinner during submission', () => {
      render(<TaskCard {...mockProps} isSubmitting={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Disabled States', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<TaskCard {...mockProps} disabled={true} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      const replaceButton = screen.getByRole('button', { name: /replace task/i });

      expect(completeButton).toBeDisabled();
      expect(viewDetailsButton).toBeDisabled();
      expect(replaceButton).toBeDisabled();
    });

    it('applies disabled styling when disabled prop is true', () => {
      render(<TaskCard {...mockProps} disabled={true} />);

      const taskCard = screen.getByTestId('task-card');
      expect(taskCard).toHaveClass('disabled');
    });
  });

  describe('Task Status', () => {
    it('shows completed status for completed tasks', () => {
      const completedTask = { ...mockTask, is_completed: true };
      render(<TaskCard {...mockProps} task={completedTask} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByTestId('task-card')).toHaveClass('completed');
    });

    it('shows expired status for expired tasks', () => {
      const expiredTask = { 
        ...mockTask, 
        expires_at: '2020-01-01T00:00:00Z' // Past date
      };
      render(<TaskCard {...mockProps} task={expiredTask} />);

      expect(screen.getByText(/expired/i)).toBeInTheDocument();
      expect(screen.getByTestId('task-card')).toHaveClass('expired');
    });

    it('shows expiring soon status for tasks expiring within 24 hours', () => {
      const expiringSoonTask = { 
        ...mockTask, 
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
      };
      render(<TaskCard {...mockProps} task={expiringSoonTask} />);

      expect(screen.getByText(/expiring soon/i)).toBeInTheDocument();
      expect(screen.getByTestId('task-card')).toHaveClass('expiring-soon');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<TaskCard {...mockProps} />);

      const taskCard = screen.getByTestId('task-card');
      expect(taskCard).toHaveAttribute('role', 'article');
      expect(taskCard).toHaveAttribute('aria-labelledby', 'task-title-1');

      const title = screen.getByText('Tell your friend about your first pet');
      expect(title).toHaveAttribute('id', 'task-title-1');
    });

    it('has proper button labels and descriptions', () => {
      render(<TaskCard {...mockProps} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });
      expect(completeButton).toHaveAttribute('aria-label', 'Complete task: Tell your friend about your first pet');

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      expect(viewDetailsButton).toHaveAttribute('aria-label', 'View details for task: Tell your friend about your first pet');
    });

    it('provides screen reader feedback for task status', () => {
      render(<TaskCard {...mockProps} />);

      const statusElement = screen.getByText(/not completed/i);
      expect(statusElement).toHaveAttribute('role', 'status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('supports keyboard navigation with proper focus management', async () => {
      const user = userEvent.setup();
      render(<TaskCard {...mockProps} />);

      const taskCard = screen.getByTestId('task-card');
      await user.tab();
      
      expect(taskCard).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TaskCard {...mockProps} />);

      const taskCard = screen.getByTestId('task-card');
      expect(taskCard).toHaveClass('mobile-layout');
    });

    it('adapts layout for desktop screens', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<TaskCard {...mockProps} />);

      const taskCard = screen.getByTestId('task-card');
      expect(taskCard).toHaveClass('desktop-layout');
    });

    it('handles long task titles gracefully', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'This is a very long task title that should be truncated when it exceeds the maximum width of the card container'
      };

      render(<TaskCard {...mockProps} task={longTitleTask} />);

      const title = screen.getByText(/This is a very long task title/);
      expect(title).toHaveClass('truncated');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing task data gracefully', () => {
      const incompleteTask = {
        id: 1,
        title: 'Test Task',
        description: null,
        reward: null,
        type: null,
        difficulty: null,
        estimated_time: null,
        is_completed: false,
        expires_at: null,
        created_at: null
      };

      render(<TaskCard {...mockProps} task={incompleteTask} />);

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('No description available')).toBeInTheDocument();
      expect(screen.getByText('0 coins')).toBeInTheDocument();
      expect(screen.getByText('Unknown difficulty')).toBeInTheDocument();
    });

    it('handles very large reward values', () => {
      const highRewardTask = { ...mockTask, reward: 999999 };
      render(<TaskCard {...mockProps} task={highRewardTask} />);

      expect(screen.getByText('999,999 coins')).toBeInTheDocument();
    });

    it('handles zero reward values', () => {
      const zeroRewardTask = { ...mockTask, reward: 0 };
      render(<TaskCard {...mockProps} task={zeroRewardTask} />);

      expect(screen.getByText('0 coins')).toBeInTheDocument();
    });

    it('handles special characters in task title and description', () => {
      const specialCharTask = {
        ...mockTask,
        title: 'Task with special chars: 🚀 & <script>alert("xss")</script>',
        description: 'Description with emojis 🎉 and symbols ©®™'
      };

      render(<TaskCard {...mockProps} task={specialCharTask} />);

      expect(screen.getByText(/Task with special chars: 🚀 &/)).toBeInTheDocument();
      expect(screen.getByText(/Description with emojis 🎉 and symbols ©®™/)).toBeInTheDocument();
    });

    it('handles different difficulty levels', () => {
      const difficulties = ['easy', 'medium', 'hard', 'expert'];
      
      difficulties.forEach(difficulty => {
        const taskWithDifficulty = { ...mockTask, difficulty };
        const { unmount } = render(<TaskCard {...mockProps} task={taskWithDifficulty} />);
        
        expect(screen.getByText(difficulty.charAt(0).toUpperCase() + difficulty.slice(1))).toBeInTheDocument();
        expect(screen.getByTestId('task-card')).toHaveClass(`difficulty-${difficulty}`);
        
        unmount();
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const { rerender } = render(<TaskCard {...mockProps} />);

      // Change a prop that shouldn't cause re-render
      rerender(<TaskCard {...mockProps} className="new-class" />);

      // The component should still render the same content
      expect(screen.getByText('Tell your friend about your first pet')).toBeInTheDocument();
    });

    it('handles rapid button clicks gracefully', async () => {
      const user = userEvent.setup();
      render(<TaskCard {...mockProps} />);

      const completeButton = screen.getByRole('button', { name: /complete task/i });

      // Rapid clicks
      await user.click(completeButton);
      await user.click(completeButton);
      await user.click(completeButton);

      // Should only call once due to debouncing or state management
      expect(mockProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
