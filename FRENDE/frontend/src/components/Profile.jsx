import React from 'react';
import { Card } from './ui/card';
import Avatar from './ui/avatar';
import { Button } from './ui/button';
import SlotManager from './SlotManager';
import { useSlots } from '../hooks/useSlots';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Edit } from 'lucide-react';

const Profile = ({ className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

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
      <Card className={`p-4 sm:p-6 ${className}`}>
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
    <Card className={`p-4 sm:p-6 ${className}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Avatar and Basic Info */}
        <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-6">
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {user.name || 'Anonymous'}
            </h1>
            
            <div className="space-y-1 text-sm text-gray-600">
              <p>{formatAge(user.age)}</p>
              <p>{formatProfession(user.profession)}</p>
              <p>{formatLocation(user.location)}</p>
              <p>{formatCommunity(user.community)}</p>
            </div>

            {/* Edit Button */}
            <div className="mt-4 sm:mt-6 flex justify-center sm:justify-start">
              <Button
                onClick={handleEditProfile}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        {/* About Me Section */}
        <div className="border-t pt-4 sm:pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About Me</h2>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">
              {formatProfileText(user.profile_text)}
            </p>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="border-t pt-4 sm:pt-6">
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
        <div className="border-t pt-4 sm:pt-6">
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
        <div className="border-t pt-4 sm:pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Info</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">
                {slotInfo.available_slots || 0}
              </div>
              <div className="text-xs text-gray-500">Available Slots</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {user.coins || 0}
              </div>
              <div className="text-xs text-gray-500">Coins</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">
                {slotInfo.total_slots_used || 0}
              </div>
              <div className="text-xs text-gray-500">Slots Used</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-600">
                {calculateProfileCompletion(user)}%
              </div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const calculateProfileCompletion = (user) => {
  if (!user) return 0;
  
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