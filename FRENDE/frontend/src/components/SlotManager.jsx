import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const SlotManager = ({ slotInfo, onPurchaseSlot, loading, error, canPurchaseSlot, getSlotStatusMessage, getPurchaseButtonText }) => {
  const handlePurchaseClick = async () => {
    if (canPurchaseSlot && onPurchaseSlot) {
      try {
        await onPurchaseSlot();
      } catch (err) {
        // Error is handled by the hook
        console.error('Purchase failed:', err);
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Slot Management</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Coins:</span>
            <span className="text-lg font-semibold text-yellow-600">
              {slotInfo.coins || 0}
            </span>
          </div>
        </div>

        {/* Slot Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Available Slots</span>
            <span className="text-lg font-semibold text-blue-600">
              {slotInfo.available_slots || 0}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Used</span>
            <span className="text-sm text-gray-600">
              {slotInfo.total_slots_used || 0}
            </span>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center">
          <p className={`text-sm font-medium ${
            slotInfo.available_slots > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {getSlotStatusMessage()}
          </p>
        </div>

        {/* Purchase Button */}
        <div className="flex justify-center">
          <Button
            onClick={handlePurchaseClick}
            disabled={!canPurchaseSlot || loading}
            variant={canPurchaseSlot ? "default" : "outline"}
            size="sm"
            className="w-full max-w-xs"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              getPurchaseButtonText()
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Info Section */}
        <div className="border-t pt-4">
          <div className="space-y-2 text-xs text-gray-500">
            <p>• Slots reset automatically after 2 days</p>
            <p>• Each slot costs {slotInfo.slot_purchase_cost || 50} coins</p>
            <p>• You can have up to 2 slots maximum</p>
            <p>• Use slots to find new friends</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SlotManager; 