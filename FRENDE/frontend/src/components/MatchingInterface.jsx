import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Heart, X, Clock, CheckCircle, XCircle, Plus, Calendar, MessageCircle, RefreshCw, AlertCircle } from 'lucide-react';
import CoinBalance from './CoinBalance';
import SlotInfo from './SlotInfo';
import SlotPurchaseModal from './SlotPurchaseModal';
import PurchaseHistory from './PurchaseHistory';
import { useMatches } from '../hooks/useMatches';
import MatchStatusCard from './MatchStatusCard';
import UserCard from './UserCard';
import CompatibilityModal from './CompatibilityModal';
import useCompatibleUsers from '../hooks/useCompatibleUsers';
import { matchAPI } from '../lib/api';
import MatchingLoadingSkeleton from './loading/MatchingLoadingSkeleton';
import ErrorFallback from './error-states/ErrorFallback';



export default function MatchingInterface() {
  const [activeTab, setActiveTab] = useState("discover");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  
  // Coin and slot system state
  const [userCoins, setUserCoins] = useState(150); // Mock data
  const [slotInfo, setSlotInfo] = useState({
    availableSlots: 1,
    totalUsed: 3,
    purchaseCost: 50
  });
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Use the new match management hook
  const {
    matches,
    pendingMatches,
    activeMatches,
    expiredMatches,
    loading: matchesLoading,
    error: matchesError,
    fetchMatches,
    acceptMatch,
    rejectMatch,
    deleteMatch,
  } = useMatches();

  // Use the new compatible users hook
  const {
    compatibleUsers,
    loading: compatibleUsersLoading,
    error: compatibleUsersError,
    hasMore,
    loadMore,
    refresh: refreshCompatibleUsers,
    removeUser,
  } = useCompatibleUsers(10);

  // Initialize matches on component mount
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSendRequest = async (userId) => {
    setSendingRequest(true);
    try {
      // Create match request using the API
      await matchAPI.createMatch({ target_user_id: userId });
      
      // Remove user from compatible users list
      removeUser(userId);
      
      // Show success notification
      alert('Match request sent successfully!');
    } catch (error) {
      console.error('Failed to send request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleViewProfile = (userId) => {
    const userData = compatibleUsers.find(item => item.user.id === userId);
    if (userData) {
      setSelectedUser(userData.user);
      setShowCompatibilityModal(true);
    }
  };

  const handleAcceptRequest = async (matchId) => {
    try {
      await acceptMatch(matchId);
      // Success notification will be handled by the hook
    } catch (error) {
      console.error('Failed to accept match:', error);
      alert('Failed to accept match. Please try again.');
    }
  };

  const handleDeclineRequest = async (matchId) => {
    try {
      await rejectMatch(matchId);
      // Success notification will be handled by the hook
    } catch (error) {
      console.error('Failed to decline match:', error);
      alert('Failed to decline match. Please try again.');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    try {
      await deleteMatch(matchId);
      // Success notification will be handled by the hook
    } catch (error) {
      console.error('Failed to delete match:', error);
      alert('Failed to delete match. Please try again.');
    }
  };

  const handleChat = (matchId) => {
    // TODO: Navigate to chat interface
    console.log('Navigate to chat for match:', matchId);
  };



  const handlePurchaseSlot = async () => {
    try {
      // TODO: Replace with real API call
      console.log('Purchasing slot...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setUserCoins(prev => prev - slotInfo.purchaseCost);
      setSlotInfo(prev => ({
        ...prev,
        availableSlots: prev.availableSlots + 1
      }));
      
      setShowPurchaseModal(false);
      alert('Slot purchased successfully!');
    } catch (error) {
      console.error('Purchase failed:', error);
      throw new Error('Purchase failed. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Friends</h1>
            <p className="text-gray-600">Discover and connect with people who share your interests</p>
          </div>
          <div className="flex items-center space-x-4">
            <CoinBalance coins={userCoins} />
            <SlotInfo 
              availableSlots={slotInfo.availableSlots}
              totalUsed={slotInfo.totalUsed}
              purchaseCost={slotInfo.purchaseCost}
              onPurchaseClick={() => setShowPurchaseModal(true)}
              showPurchaseButton={slotInfo.availableSlots <= 1}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Active ({activeMatches.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Expired ({expiredMatches.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-6">
          {/* Error State */}
          {compatibleUsersError && (
            <ErrorFallback
              error={{ message: compatibleUsersError }}
              errorType="general"
              onRetry={refreshCompatibleUsers}
            />
          )}

          {/* Loading State */}
          {compatibleUsersLoading && compatibleUsers.length === 0 && (
            <div className="py-12">
              <MatchingLoadingSkeleton count={3} />
            </div>
          )}

          {/* Users Grid */}
          {!compatibleUsersLoading && !compatibleUsersError && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {compatibleUsers.map((userData) => (
                  <UserCard
                    key={userData.user.id}
                    user={userData.user}
                    compatibilityScore={userData.compatibility_score}
                    commonInterests={userData.common_interests || []}
                    onSendRequest={handleSendRequest}
                    onViewProfile={handleViewProfile}
                    loading={sendingRequest}
                    disabled={sendingRequest}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && !compatibleUsersLoading && (
                <div className="text-center mt-8">
                  <Button 
                    onClick={loadMore}
                    variant="outline"
                    className="px-8"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load More Users
                  </Button>
                </div>
              )}

              {/* Loading More State */}
              {compatibleUsersLoading && compatibleUsers.length > 0 && (
                <div className="text-center mt-8">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
                  <p className="text-gray-600 mt-2">Loading more users...</p>
                </div>
              )}

              {/* No Users State */}
              {compatibleUsers.length === 0 && !compatibleUsersLoading && !compatibleUsersError && (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No compatible users found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any users that match your preferences right now.
                  </p>
                  <Button onClick={refreshCompatibleUsers} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingMatches.map((match) => (
              <MatchStatusCard
                key={match.id}
                match={match}
                onAccept={handleAcceptRequest}
                onReject={handleDeclineRequest}
                onDelete={handleDeleteMatch}
                onChat={handleChat}
              />
            ))}
          </div>

          {pendingMatches.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending matches</h3>
              <p className="text-gray-600">When people send you match requests, they'll appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeMatches.map((match) => (
              <MatchStatusCard
                key={match.id}
                match={match}
                onAccept={handleAcceptRequest}
                onReject={handleDeclineRequest}
                onDelete={handleDeleteMatch}
                onChat={handleChat}
              />
            ))}
          </div>

          {activeMatches.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active matches</h3>
              <p className="text-gray-600">Your active conversations will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {expiredMatches.map((match) => (
              <MatchStatusCard
                key={match.id}
                match={match}
                onAccept={handleAcceptRequest}
                onReject={handleDeclineRequest}
                onDelete={handleDeleteMatch}
                onChat={handleChat}
              />
            ))}
          </div>

          {expiredMatches.length === 0 && (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No expired matches</h3>
              <p className="text-gray-600">Expired matches will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PurchaseHistory />
        </TabsContent>
      </Tabs>
      
      {/* Slot Purchase Modal */}
      <SlotPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchase={handlePurchaseSlot}
        currentCoins={userCoins}
        purchaseCost={slotInfo.purchaseCost}
        availableSlots={slotInfo.availableSlots}
      />

      {/* Compatibility Modal */}
      {selectedUser && (
        <CompatibilityModal
          isOpen={showCompatibilityModal}
          onClose={() => {
            setShowCompatibilityModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          compatibilityData={{
            compatibility_score: compatibleUsers.find(item => item.user.id === selectedUser.id)?.compatibility_score || 0,
            common_interests: compatibleUsers.find(item => item.user.id === selectedUser.id)?.common_interests || []
          }}
          onSendRequest={handleSendRequest}
          loading={sendingRequest}
        />
      )}
    </div>
  );
} 