import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Coins, 
  TrendingUp, 
  Plus, 
  Minus, 
  Sparkles,
  Gift,
  Clock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const CoinBalance = ({ onPurchaseSlots, showPurchaseButton = true }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [lastReward, setLastReward] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    }
  }, [user]);

  const fetchCoinBalance = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/coins/balance', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.current_balance);
        setTotalEarned(data.total_earned || 0);
        setTotalSpent(data.total_spent || 0);
      }
    } catch (error) {
      console.error('Error fetching coin balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSlots = async () => {
    if (!user || !onPurchaseSlots) return;

    try {
      const result = await onPurchaseSlots();
      if (result) {
        // Update balance after purchase
        setBalance(result.new_balance);
        setTotalSpent(prev => prev + result.total_cost);
        
        // Show success animation
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
    } catch (error) {
      console.error('Error purchasing slots:', error);
    }
  };

  const animateReward = (amount) => {
    setLastReward(amount);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 3000);
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const getBalanceColor = () => {
    if (balance >= 100) return 'text-green-600';
    if (balance >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceSize = () => {
    if (balance >= 1000) return 'text-4xl';
    if (balance >= 100) return 'text-3xl';
    return 'text-2xl';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className={`relative overflow-hidden transition-all duration-300 ${
        showAnimation ? 'ring-2 ring-yellow-400 shadow-lg' : ''
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-500" />
            Coin Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`font-bold ${getBalanceSize()} ${getBalanceColor()} mb-2`}>
                {formatNumber(balance)}
                <span className="text-sm text-gray-500 ml-2">coins</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>+{formatNumber(totalEarned)} earned</span>
                </div>
                <div className="flex items-center gap-1">
                  <Minus className="w-4 h-4 text-red-500" />
                  <span>-{formatNumber(totalSpent)} spent</span>
                </div>
              </div>
            </div>
            
            {showAnimation && (
              <div className="absolute top-2 right-2 animate-bounce">
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {showPurchaseButton && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm mb-1">Need more slots?</h3>
                <p className="text-xs text-gray-600">Purchase additional matching slots</p>
              </div>
              <Button 
                onClick={handlePurchaseSlots}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Gift className="w-4 h-4 mr-1" />
                Buy Slots
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward Animation */}
      {showAnimation && lastReward && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-yellow-500 text-white px-6 py-3 rounded-full shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="font-bold">+{lastReward} coins!</span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Status */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="text-lg font-bold text-green-600">
            {formatNumber(totalEarned)}
          </div>
          <div className="text-xs text-green-600">Total Earned</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="text-lg font-bold text-red-600">
            {formatNumber(totalSpent)}
          </div>
          <div className="text-xs text-red-600">Total Spent</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="text-lg font-bold text-blue-600">
            {balance > 0 ? '+' : ''}{formatNumber(balance)}
          </div>
          <div className="text-xs text-blue-600">Current</div>
        </div>
      </div>

      {/* Balance Tips */}
      {balance < 25 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Low Balance</span>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Complete more tasks to earn coins for slot purchases!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoinBalance; 