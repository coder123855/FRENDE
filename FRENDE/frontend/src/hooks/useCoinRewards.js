import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const useCoinRewards = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch coin balance
  const fetchCoinBalance = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coins/balance', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBalance(data.current_balance || 0);
      setTotalEarned(data.total_earned || 0);
      setTotalSpent(data.total_spent || 0);
    } catch (err) {
      console.error('Error fetching coin balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Purchase slots with coins
  const purchaseSlots = useCallback(async (slotCount) => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coins/purchase-slots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slot_count: slotCount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to purchase slots');
      }

      const result = await response.json();
      
      // Update local state
      setBalance(result.new_balance);
      setTotalSpent(prev => prev + result.total_cost);
      
      return result;
    } catch (err) {
      console.error('Error purchasing slots:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get reward summary
  const getRewardSummary = useCallback(async () => {
    if (!user) return null;

    try {
      const response = await fetch('/api/coins/reward-summary', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching reward summary:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Get transaction history
  const getTransactionHistory = useCallback(async (limit = 50) => {
    if (!user) return [];

    try {
      const response = await fetch(`/api/coins/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError(err.message);
      return [];
    }
  }, [user]);

  // Simulate coin reward (for testing)
  const simulateReward = useCallback((amount) => {
    setBalance(prev => prev + amount);
    setTotalEarned(prev => prev + amount);
  }, []);

  // Check if user has enough coins for slot purchase
  const canPurchaseSlots = useCallback((slotCount = 1) => {
    const slotCost = 25; // 25 coins per slot
    const totalCost = slotCount * slotCost;
    return balance >= totalCost;
  }, [balance]);

  // Get slot purchase cost
  const getSlotPurchaseCost = useCallback((slotCount = 1) => {
    const slotCost = 25; // 25 coins per slot
    return slotCount * slotCost;
  }, []);

  // Initialize balance on mount
  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    }
  }, [user, fetchCoinBalance]);

  return {
    // State
    balance,
    totalEarned,
    totalSpent,
    loading,
    error,
    
    // Actions
    fetchCoinBalance,
    purchaseSlots,
    getRewardSummary,
    getTransactionHistory,
    simulateReward,
    
    // Computed values
    canPurchaseSlots,
    getSlotPurchaseCost,
    
    // Utilities
    hasEnoughCoins: (amount) => balance >= amount,
    getBalancePercentage: (target) => (balance / target) * 100
  };
};

export default useCoinRewards;

// Named export for consistency
export { useCoinRewards }; 