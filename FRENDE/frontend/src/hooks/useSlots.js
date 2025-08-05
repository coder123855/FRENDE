import { useState, useEffect, useCallback } from 'react';
import { slotAPI } from '../lib/api';

export const useSlots = () => {
  const [slotInfo, setSlotInfo] = useState({
    available_slots: 0,
    total_slots_used: 0,
    coins: 0,
    slot_purchase_cost: 50
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch slot information
  const fetchSlotInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await slotAPI.getSlotInfo();
      setSlotInfo(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch slot information');
      console.error('Error fetching slot info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Purchase a slot
  const purchaseSlot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await slotAPI.purchaseSlot();
      
      // Update slot info with new data
      setSlotInfo(prev => ({
        ...prev,
        available_slots: response.data.available_slots,
        coins: response.data.coins
      }));
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to purchase slot';
      setError(errorMessage);
      console.error('Error purchasing slot:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get coin balance
  const getCoinBalance = useCallback(async () => {
    try {
      const response = await slotAPI.getCoinBalance();
      setSlotInfo(prev => ({
        ...prev,
        coins: response.data.coins
      }));
      return response.data.coins;
    } catch (err) {
      console.error('Error fetching coin balance:', err);
      return 0;
    }
  }, []);

  // Check if user can purchase a slot
  const canPurchaseSlot = useCallback(() => {
    return slotInfo.coins >= slotInfo.slot_purchase_cost;
  }, [slotInfo.coins, slotInfo.slot_purchase_cost]);

  // Check if user has available slots
  const hasAvailableSlots = useCallback(() => {
    return slotInfo.available_slots > 0;
  }, [slotInfo.available_slots]);

  // Get slot status message
  const getSlotStatusMessage = useCallback(() => {
    if (slotInfo.available_slots === 0) {
      return 'No slots available';
    } else if (slotInfo.available_slots === 1) {
      return '1 slot available';
    } else {
      return `${slotInfo.available_slots} slots available`;
    }
  }, [slotInfo.available_slots]);

  // Get purchase button text
  const getPurchaseButtonText = useCallback(() => {
    if (canPurchaseSlot()) {
      return `Purchase Slot (${slotInfo.slot_purchase_cost} coins)`;
    } else {
      return `Need ${slotInfo.slot_purchase_cost - slotInfo.coins} more coins`;
    }
  }, [slotInfo.coins, slotInfo.slot_purchase_cost, canPurchaseSlot]);

  // Initialize slot info on mount
  useEffect(() => {
    fetchSlotInfo();
  }, [fetchSlotInfo]);

  return {
    // State
    slotInfo,
    loading,
    error,
    
    // Actions
    fetchSlotInfo,
    purchaseSlot,
    getCoinBalance,
    
    // Computed values
    canPurchaseSlot: canPurchaseSlot(),
    hasAvailableSlots: hasAvailableSlots(),
    getSlotStatusMessage,
    getPurchaseButtonText,
    
    // Reset error
    clearError: () => setError(null)
  };
}; 