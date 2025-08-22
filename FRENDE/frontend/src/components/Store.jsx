import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  ShoppingBag, 
  Coins, 
  Plus, 
  Users, 
  Sparkles, 
  Gift,
  Crown,
  Zap,
  Heart,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Store = () => {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(null);

  const storeItems = [
    {
      id: 1,
      name: 'Extra Match Slot',
      description: 'Get an additional slot to match with more people',
      price: 50,
      icon: Plus,
      color: 'from-blue-500 to-cyan-500',
      popular: false,
      category: 'slots'
    },
    {
      id: 2,
      name: 'Double Slots',
      description: 'Double your matching slots for 24 hours',
      price: 100,
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      popular: true,
      category: 'slots'
    },
    {
      id: 3,
      name: 'Priority Matching',
      description: 'Get priority in the matching queue for 1 hour',
      price: 75,
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      popular: false,
      category: 'features'
    },
    {
      id: 4,
      name: 'Super Like',
      description: 'Send a super like to show extra interest',
      price: 25,
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      popular: false,
      category: 'features'
    },
    {
      id: 5,
      name: 'Profile Boost',
      description: 'Boost your profile visibility for 24 hours',
      price: 150,
      icon: Star,
      color: 'from-purple-500 to-violet-500',
      popular: false,
      category: 'features'
    },
    {
      id: 6,
      name: 'VIP Status',
      description: 'Unlock exclusive features and priority support',
      price: 500,
      icon: Crown,
      color: 'from-amber-500 to-yellow-500',
      popular: false,
      category: 'premium'
    }
  ];

  const handlePurchase = async (item) => {
    if (user.coins < item.price) {
      alert('Insufficient coins! Complete tasks to earn more coins.');
      return;
    }

    setPurchasing(item.id);
    
    try {
      // TODO: Implement purchase API call
      console.log(`Purchasing ${item.name} for ${item.price} coins`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Successfully purchased ${item.name}!`);
    } catch (error) {
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const canAfford = (price) => {
    return (user?.coins || 0) >= price;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Frende Store
          </h1>
          <p className="text-gray-600 mt-2">Enhance your experience with premium features</p>
        </div>
        
        {/* Coin Balance */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
            <Coins className="w-6 h-6" />
            <span className="font-bold text-lg">{user?.coins || 0}</span>
          </div>
        </div>
      </div>

      {/* How to Earn Coins */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">How to Earn Coins</h3>
              <p className="text-green-700 text-sm">
                Complete tasks with your matches to earn coins! Each completed task gives you 10 coins.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeItems.map((item) => {
          const affordable = canAfford(item.price);
          
          return (
            <Card 
              key={item.id} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                !affordable ? 'opacity-60' : 'hover:scale-105'
              }`}
            >
              {item.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  POPULAR
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center mx-auto shadow-lg`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 mt-4">
                  {item.name}
                </CardTitle>
                <p className="text-gray-600 text-sm">
                  {item.description}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-lg">{item.price}</span>
                  </div>
                  
                  {!affordable && (
                    <div className="flex items-center space-x-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Need {item.price - (user?.coins || 0)} more</span>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={() => handlePurchase(item)}
                  disabled={!affordable || purchasing === item.id}
                  className={`w-full h-11 font-semibold rounded-lg transition-all duration-200 ${
                    affordable 
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {purchasing === item.id ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Purchasing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {affordable ? (
                        <>
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Purchase
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Need More Coins
                        </>
                      )}
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Categories */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-blue-900 mb-2">Matching Slots</h3>
              <p className="text-blue-700 text-sm">
                Increase your matching capacity to connect with more people
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-purple-900 mb-2">Premium Features</h3>
              <p className="text-purple-700 text-sm">
                Unlock special features to enhance your matching experience
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-amber-900 mb-2">VIP Status</h3>
              <p className="text-amber-700 text-sm">
                Get exclusive access to premium features and priority support
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Purchase History */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>Recent Purchases</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent purchases</p>
            <p className="text-sm text-gray-500">Your purchase history will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Store;
