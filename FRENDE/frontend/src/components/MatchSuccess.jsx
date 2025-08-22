import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMatches } from '../hooks/useMatches';

const MatchSuccess = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { user } = useAuth();
  const { activeMatches } = useMatches();
  const [showConfetti, setShowConfetti] = useState(false);
  const [match, setMatch] = useState(null);

  useEffect(() => {
    // Find the match from active matches
    const foundMatch = activeMatches.find(m => m.id === parseInt(matchId));
    setMatch(foundMatch);

    // Trigger confetti animation
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [matchId, activeMatches]);

  const handleStartChat = () => {
    navigate(`/chat/${matchId}`);
  };

  const handleContinueMatching = () => {
    navigate('/matching');
  };

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Match Not Found</h1>
          <p className="text-gray-600 mb-6">The match you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/matching')}>
            Back to Matching
          </Button>
        </div>
      </div>
    );
  }

  const matchedUser = match.matched_user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
            Match Successful! 🎉
          </h1>
          <p className="text-xl text-gray-600 max-w-md mx-auto">
            You and {matchedUser?.name || 'your new friend'} are now connected!
          </p>
        </div>

        {/* Match Display */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-8 mb-8">
              {/* Your Profile */}
              <div className="text-center">
                <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg mx-auto mb-4">
                  <AvatarImage src={user?.profile_picture_url} />
                  <AvatarFallback className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xl font-semibold">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900">{user?.name}</h3>
                <p className="text-sm text-gray-600">{user?.age} years old</p>
              </div>

              {/* Connecting Heart */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
              </div>

              {/* Matched User Profile */}
              <div className="text-center">
                <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg mx-auto mb-4">
                  <AvatarImage src={matchedUser?.profile_picture_url} />
                  <AvatarFallback className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xl font-semibold">
                    {matchedUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900">{matchedUser?.name}</h3>
                <p className="text-sm text-gray-600">{matchedUser?.age} years old</p>
              </div>
            </div>

            {/* Compatibility Info */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full mb-4">
                <Star className="w-4 h-4" />
                <span className="font-semibold">Great Compatibility!</span>
              </div>
              <p className="text-gray-600">
                You both share similar interests and are from the same community.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleStartChat}
            size="lg"
            className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Start Chatting
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button
            onClick={handleContinueMatching}
            variant="outline"
            size="lg"
            className="border-2 border-primary-200 text-primary-700 hover:bg-primary-50 font-semibold px-8 py-4 rounded-xl transition-all duration-200"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Find More Friends
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for a Great Conversation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-gray-700">Start with a friendly greeting</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-gray-700">Ask about shared interests</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-gray-700">Complete tasks together</p>
            </div>
          </div>
        </div>

        {/* Celebration Animation */}
        <div className="fixed bottom-4 right-4">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSuccess;
