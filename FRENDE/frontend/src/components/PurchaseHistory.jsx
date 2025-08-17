import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import React from 'react';
import { Calendar, Coins } from 'lucide-react';
import CoinBalance from './CoinBalance';

const mockPurchaseHistory = [
  {
    id: 1,
    coins_spent: 50,
    purchased_at: "2024-01-15T14:30:00Z",
    slot_number: 3
  },
  {
    id: 2,
    coins_spent: 50,
    purchased_at: "2024-01-13T09:15:00Z",
    slot_number: 2
  }
];

export default function PurchaseHistory() {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Purchase History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mockPurchaseHistory.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-600">Your slot purchases will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockPurchaseHistory.map((purchase) => (
              <div 
                key={purchase.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      #{purchase.slot_number}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Slot #{purchase.slot_number} Purchased
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(purchase.purchased_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Slot Purchase
                  </Badge>
                  <CoinBalance coins={purchase.coins_spent} showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 