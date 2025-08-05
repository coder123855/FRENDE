import React from 'react';
import { Card } from './ui/card';
import Avatar from './ui/avatar';
import { Button } from './ui/button';
import SlotManager from './SlotManager';
import { useSlots } from '../hooks/useSlots';

const Profile = ({ user, onEdit, className = "" }) => {
  const {
    slotInfo,
    loading: slotLoading,
    error: slotError,
    purchaseSlot,
    canPurchaseSlot,
    getSlotStatusMessage,
    getPurchaseButtonText,
    clearError
  } = useSlots();

  if (!user) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No profile data available</p>
        </div>
      </Card>
    );
  }

  const formatAge = (age) => {
    if (!age) return 'Not specified';
    return `${age} years old`;
  };

  const formatLocation = (location) => {
    if (!location) return 'Not specified';
    return location;
  };

  const formatCommunity = (community) => {
    if (!community) return 'Not specified';
    return community;
  };

  const formatProfession = (profession) => {
    if (!profession) return 'Not specified';
    return profession;
  };

  const formatProfileText = (text) => {
    if (!text) return 'No description provided';
    return text;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header with Avatar and Basic Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar 
              src={user.profile_picture_url} 
              name={user.name}
              size="3xl" 
              alt="Profile picture"
              variant="gradient"
            />
          </div>

          {/* Basic Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {user.name || 'Anonymous'}
            </h1>
            
            <div className="space-y-1 text-sm text-gray-600">
              <p>{formatAge(user.age)}</p>
              <p>{formatProfession(user.profession)}</p>
              <p>{formatLocation(user.location)}</p>
              <p>{formatCommunity(user.community)}</p>
            </div>

            {/* Edit Button */}
            {onEdit && (
              <div className="mt-4">
                <Button
                  onClick={onEdit}
                  variant="outline"
                  size="sm"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* About Me Section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About Me</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">
              {formatProfileText(user.profile_text)}
            </p>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Profile Completion</h3>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${calculateProfileCompletion(user)}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {calculateProfileCompletion(user)}% complete
          </p>
        </div>

        {/* Slot Manager */}
        <div className="border-t pt-6">
          <SlotManager
            slotInfo={slotInfo}
            onPurchaseSlot={purchaseSlot}
            loading={slotLoading}
            error={slotError}
            canPurchaseSlot={canPurchaseSlot}
            getSlotStatusMessage={getSlotStatusMessage}
            getPurchaseButtonText={getPurchaseButtonText}
          />
        </div>

        {/* Quick Stats */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Info</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {slotInfo.available_slots || 0}
              </div>
              <div className="text-xs text-gray-500">Available Slots</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {slotInfo.coins || 0}
              </div>
              <div className="text-xs text-gray-500">Coins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {slotInfo.total_slots_used || 0}
              </div>
              <div className="text-xs text-gray-500">Slots Used</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {user.created_at ? 'Active' : 'New'}
              </div>
              <div className="text-xs text-gray-500">Status</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (user) => {
  const fields = [
    user.name,
    user.age,
    user.profession,
    user.profile_text,
    user.community,
    user.location,
    user.profile_picture_url
  ];
  
  const completedFields = fields.filter(field => field && field.toString().trim() !== '').length;
  return Math.round((completedFields / fields.length) * 100);
};

export default Profile; 