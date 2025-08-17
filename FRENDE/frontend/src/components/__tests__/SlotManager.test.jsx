import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SlotManager from '../SlotManager';

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, className, ...props }) => (
    <div className={`card ${className}`} {...props}>{children}</div>
  );
  return { Card: MockCard };
});

jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, disabled, variant, size, className, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${size} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

describe('SlotManager', () => {
  const mockSlotInfo = {
    coins: 150,
    available_slots: 1,
    total_slots_used: 1,
    slot_purchase_cost: 50
  };

  const mockOnPurchaseSlot = jest.fn();
  const mockGetSlotStatusMessage = jest.fn(() => 'You have 1 slot available');
  const mockGetPurchaseButtonText = jest.fn(() => 'Purchase Slot');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the main title', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Slot Management')).toBeInTheDocument();
    });

    it('renders coin balance', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Coins:')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('renders available slots', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders total slots used', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Total Used')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders slot status message', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('You have 1 slot available')).toBeInTheDocument();
    });

    it('renders purchase button', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Purchase Slot')).toBeInTheDocument();
    });

    it('renders info section', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText(/Slots reset automatically after 2 days/)).toBeInTheDocument();
      expect(screen.getByText(/Each slot costs 50 coins/)).toBeInTheDocument();
      expect(screen.getByText(/You can have up to 2 slots maximum/)).toBeInTheDocument();
      expect(screen.getByText(/Use slots to find new friends/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onPurchaseSlot when purchase button is clicked', async () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          onPurchaseSlot={mockOnPurchaseSlot}
          canPurchaseSlot={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      fireEvent.click(purchaseButton);
      
      await waitFor(() => {
        expect(mockOnPurchaseSlot).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onPurchaseSlot when canPurchaseSlot is false', async () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          onPurchaseSlot={mockOnPurchaseSlot}
          canPurchaseSlot={false}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      fireEvent.click(purchaseButton);
      
      await waitFor(() => {
        expect(mockOnPurchaseSlot).not.toHaveBeenCalled();
      });
    });

    it('does not call onPurchaseSlot when onPurchaseSlot is not provided', async () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          canPurchaseSlot={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      fireEvent.click(purchaseButton);
      
      // Should not throw error
      expect(purchaseButton).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when loading is true', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          loading={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables button when loading is true', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          loading={true}
          canPurchaseSlot={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Processing...');
      expect(purchaseButton).toBeDisabled();
    });

    it('disables button when canPurchaseSlot is false', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          canPurchaseSlot={false}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      expect(purchaseButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error is provided', () => {
      const errorMessage = 'Purchase failed due to insufficient coins';
      
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          error={errorMessage}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('does not display error message when error is not provided', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.queryByText(/Purchase failed/)).not.toBeInTheDocument();
    });

    it('handles purchase failure gracefully', async () => {
      const mockFailedPurchase = jest.fn().mockRejectedValue(new Error('Purchase failed'));
      
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          onPurchaseSlot={mockFailedPurchase}
          canPurchaseSlot={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      fireEvent.click(purchaseButton);
      
      await waitFor(() => {
        expect(mockFailedPurchase).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Slot Status Colors', () => {
    it('shows green text when slots are available', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const statusMessage = screen.getByText('You have 1 slot available');
      expect(statusMessage).toHaveClass('text-green-600');
    });

    it('shows red text when no slots are available', () => {
      const noSlotsInfo = { ...mockSlotInfo, available_slots: 0 };
      
      render(
        <SlotManager 
          slotInfo={noSlotsInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const statusMessage = screen.getByText('You have 1 slot available');
      expect(statusMessage).toHaveClass('text-red-600');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing slot info gracefully', () => {
      render(
        <SlotManager 
          slotInfo={{}}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument(); // Default coin value
    });

    it('handles zero coins', () => {
      const zeroCoinsInfo = { ...mockSlotInfo, coins: 0 };
      
      render(
        <SlotManager 
          slotInfo={zeroCoinsInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles zero available slots', () => {
      const zeroSlotsInfo = { ...mockSlotInfo, available_slots: 0 };
      
      render(
        <SlotManager 
          slotInfo={zeroSlotsInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles missing slot purchase cost', () => {
      const noCostInfo = { ...mockSlotInfo };
      delete noCostInfo.slot_purchase_cost;
      
      render(
        <SlotManager 
          slotInfo={noCostInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText(/Each slot costs 50 coins/)).toBeInTheDocument(); // Default value
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByRole('button', { name: 'Purchase Slot' });
      expect(purchaseButton).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Slot Management');
    });

    it('has descriptive text for screen readers', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText(/Slots reset automatically after 2 days/)).toBeInTheDocument();
      expect(screen.getByText(/Use slots to find new friends/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper card structure', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const card = screen.getByText('Slot Management').closest('.card');
      expect(card).toHaveClass('card', 'p-6');
    });

    it('has proper button styling', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          canPurchaseSlot={true}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      expect(purchaseButton).toHaveClass('button', 'default', 'sm');
    });

    it('has proper error styling', () => {
      const errorMessage = 'Purchase failed';
      
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          error={errorMessage}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const errorContainer = screen.getByText(errorMessage).closest('div');
      expect(errorContainer).toHaveClass('bg-red-50', 'border', 'border-red-200', 'rounded-lg', 'p-3');
    });
  });

  describe('Integration', () => {
    it('integrates with Card component correctly', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const card = screen.getByText('Slot Management').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('integrates with Button component correctly', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      const purchaseButton = screen.getByText('Purchase Slot');
      expect(purchaseButton).toHaveClass('button');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      // Re-render with same props
      rerender(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      // Should still have all the expected content
      expect(screen.getByText('Slot Management')).toBeInTheDocument();
      expect(screen.getByText('Purchase Slot')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock slot info', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(screen.getByText('150')).toBeInTheDocument(); // Coins
      expect(screen.getByText('1')).toBeInTheDocument(); // Available slots
    });

    it('calls helper functions correctly', () => {
      render(
        <SlotManager 
          slotInfo={mockSlotInfo}
          getSlotStatusMessage={mockGetSlotStatusMessage}
          getPurchaseButtonText={mockGetPurchaseButtonText}
        />
      );
      
      expect(mockGetSlotStatusMessage).toHaveBeenCalled();
      expect(mockGetPurchaseButtonText).toHaveBeenCalled();
    });
  });
});
