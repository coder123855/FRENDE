import { Users, Plus, Clock } from 'lucide-react';
import { Button } from './ui/button';
import CoinBalance from './CoinBalance';

export default function SlotInfo({ 
  availableSlots, 
  totalUsed, 
  purchaseCost, 
  onPurchaseClick,
  showPurchaseButton = true 
}) {
  const isLowOnSlots = availableSlots <= 1;
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Available Slots</h3>
        </div>
        <span className={`text-2xl font-bold ${isLowOnSlots ? 'text-red-600' : 'text-blue-600'}`}>
          {availableSlots}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Total used:</span>
          <span className="font-medium">{totalUsed}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Purchase cost:</span>
          <CoinBalance coins={purchaseCost} showLabel={false} size="small" />
        </div>
        
        {isLowOnSlots && (
          <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 p-2 rounded">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">
              Running low on slots! Purchase more to keep matching.
            </span>
          </div>
        )}
      </div>
      
      {showPurchaseButton && (
        <Button 
          onClick={onPurchaseClick}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Purchase Slot ({purchaseCost} coins)
        </Button>
      )}
    </div>
  );
} 