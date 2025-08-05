import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import CoinBalance from './CoinBalance';

export default function SlotPurchaseModal({ 
  isOpen, 
  onClose, 
  onPurchase, 
  currentCoins, 
  purchaseCost,
  availableSlots 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const canAfford = currentCoins >= purchaseCost;
  const willHaveSlots = availableSlots + 1;
  
  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onPurchase();
      // Success - modal will be closed by parent
    } catch (error) {
      console.error('Purchase failed:', error);
      setError(error.message || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <span>Purchase Additional Slot</span>
          </DialogTitle>
          <DialogDescription>
            Get more slots to find more friends! Each slot allows you to send one match request.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Available slots:</span>
                <span className="font-medium">{availableSlots}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>After purchase:</span>
                <span className="font-medium text-green-600">{willHaveSlots}</span>
              </div>
            </div>
          </div>
          
          {/* Cost Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Purchase Details</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="text-gray-700">Cost:</span>
                <CoinBalance coins={purchaseCost} showLabel={false} />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="text-gray-700">Your balance:</span>
                <CoinBalance coins={currentCoins} showLabel={false} />
              </div>
              
              {canAfford && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span className="text-green-700">Remaining after purchase:</span>
                  <CoinBalance coins={currentCoins - purchaseCost} showLabel={false} />
                </div>
              )}
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          
          {/* Insufficient Coins Warning */}
          {!canAfford && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Insufficient coins</p>
                <p>Complete tasks with your matches to earn more coins!</p>
              </div>
            </div>
          )}
          
          {/* Benefits */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Benefits</span>
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Send more match requests</li>
              <li>• Find more compatible friends</li>
              <li>• Increase your chances of making connections</li>
              <li>• Slots reset every 2 days automatically</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={!canAfford || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Purchasing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Purchase Slot ({purchaseCost} coins)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 