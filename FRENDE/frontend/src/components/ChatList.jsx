import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MessageCircle, Heart, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import { useAuth } from '../hooks/useAuth';

const ChatList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  
  const {
    matches,
    pendingMatches,
    activeMatches,
    expiredMatches,
    loading: matchesLoading,
    error: matchesError,
    fetchMatches,
  } = useMatches();

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleChat = (matchId) => {
    navigate(`/chat/${matchId}`);
  };

  const handleGoToMatching = () => {
    navigate('/matching');
  };

  if (matchesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your matches...</p>
        </div>
      </div>
    );
  }

  if (matchesError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Matches</h3>
          <p className="text-muted-foreground mb-4">{matchesError}</p>
          <Button onClick={fetchMatches} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const hasAnyMatches = activeMatches.length > 0 || pendingMatches.length > 0;

  if (!hasAnyMatches) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-12 h-12 text-primary-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Active Chats</h2>
            <p className="text-muted-foreground mb-6">
              You don't have any active matches yet. Start by finding new friends!
            </p>
            <Button onClick={handleGoToMatching} className="bg-gradient-to-r from-primary-500 to-secondary-500">
              <Heart className="w-4 h-4 mr-2" />
              Find Friends
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Chats</h1>
          <p className="text-muted-foreground">Connect with your matched friends</p>
        </div>
        <Button onClick={handleGoToMatching} variant="outline">
          <Heart className="w-4 h-4 mr-2" />
          Find More Friends
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-background-secondary rounded-lg p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Active ({activeMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Pending ({pendingMatches.length})
        </button>
      </div>

      {/* Active Matches */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeMatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Matches</h3>
                <p className="text-muted-foreground mb-4">
                  Accept some pending match requests to start chatting!
                </p>
                <Button onClick={() => setActiveTab('pending')} variant="outline">
                  View Pending Requests
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleChat(match.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={match.matched_user?.profile_picture_url} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {match.matched_user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{match.matched_user?.name || 'Unknown User'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {match.matched_user?.age} • {match.matched_user?.profession || 'No profession listed'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Matched {new Date(match.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Active
                      </Badge>
                      <MessageCircle className="w-5 h-5 text-primary-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pending Matches */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingMatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any pending match requests.
                </p>
                <Button onClick={handleGoToMatching} variant="outline">
                  Find New Friends
                </Button>
              </CardContent>
            </Card>
          ) : (
            pendingMatches.map((match) => (
              <Card key={match.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={match.matched_user?.profile_picture_url} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {match.matched_user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{match.matched_user?.name || 'Unknown User'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {match.matched_user?.age} • {match.matched_user?.profession || 'No profession listed'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Request sent {new Date(match.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Pending
                      </Badge>
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ChatList;
