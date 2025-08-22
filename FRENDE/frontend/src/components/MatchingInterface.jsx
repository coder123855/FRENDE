import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Heart, X, Clock, CheckCircle, XCircle, Plus, Calendar, MessageCircle, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
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
  const navigate = useNavigate();
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
      const response = await matchAPI.createMatch({ target_user_id: userId });
      
      // Remove user from compatible users list
      removeUser(userId);
      
      // Navigate to match success page if we have a match ID
      if (response && response.match_id) {
        navigate(`/match-success/${response.match_id}`);
      } else {
        // Show success notification
        alert('Match request sent successfully!');
      }
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
    navigate(`/chat/${matchId}`);
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
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Find Friends
          </h1>
        </div>
        <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
          Discover and connect with people who share your interests and values
        </p>
        
        {/* Stats Bar */}
        <div className="flex items-center justify-center space-x-6 mt-8">
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

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-background-secondary p-1 rounded-2xl shadow-sm">
          <TabsTrigger value="discover" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pending</span>
            {pendingMatches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingMatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Active</span>
            {activeMatches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeMatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Expired</span>
            {expiredMatches.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {expiredMatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-8 space-y-6">
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
                    size="lg"
                    className="px-8 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load More Friends
                  </Button>
                </div>
              )}

              {/* Loading More State */}
              {compatibleUsersLoading && compatibleUsers.length > 0 && (
                <div className="text-center mt-8">
                  <Loader2 className="w-8 h-8 text-primary-400 mx-auto animate-spin" />
                  <p className="text-foreground-secondary mt-2">Finding more friends for you...</p>
                </div>
              )}

              {/* No Users State */}
              {compatibleUsers.length === 0 && !compatibleUsersLoading && !compatibleUsersError && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-10 h-10 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">No compatible friends found</h3>
                  <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                    We couldn't find any users that match your preferences right now. Try refreshing or check back later!
                  </p>
                  <Button onClick={refreshCompatibleUsers} variant="outline" size="lg" className="rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Search
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-warning-100 to-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-warning-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No pending matches</h3>
              <p className="text-foreground-secondary">When people send you match requests, they'll appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-success-100 to-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-success-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No active conversations</h3>
              <p className="text-foreground-secondary">Your active conversations will appear here once you start chatting!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-neutral-100 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-neutral-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No expired matches</h3>
              <p className="text-foreground-secondary">Expired matches will appear here when they time out.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-8">
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