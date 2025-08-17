import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Trash2, MessageCircle, Heart, Clock, AlertTriangle } from 'lucide-react';
import ExpirationTimer from './ExpirationTimer';

const MatchStatusCard = ({ 
  match, 
  onAccept, 
  onReject, 
  onDelete, 
  onChat,
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await action(match.id);
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock size={12} />
            Pending
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Heart size={12} />
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle size={12} />
            Expired
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle size={12} />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOtherUser = () => {
    // This would need to be adjusted based on how the match data is structured
    // For now, assuming the match has user1 and user2 properties
    return match.user1 || match.user2 || {};
  };

  const otherUser = getOtherUser();

  return (
    <Card className={`${className} transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser.profile_picture} />
              <AvatarFallback>
                {otherUser.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{otherUser.name || 'Unknown User'}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
                {match.status === 'pending' && match.expires_at && (
                  <ExpirationTimer 
                    expiresAt={match.expires_at}
                    onExpired={() => {
                      // Handle expiration - this will be handled by the hook
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {match.compatibility_score && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${getCompatibilityColor(match.compatibility_score)}`}>
                {match.compatibility_score}%
              </div>
              <div className="text-xs text-muted-foreground">Compatibility</div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {otherUser.profession && (
          <div className="text-sm text-muted-foreground mb-3">
            {otherUser.profession}
          </div>
        )}
        
        {otherUser.interests && otherUser.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {otherUser.interests.slice(0, 3).map((interest, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
            {otherUser.interests.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{otherUser.interests.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAction(onAccept)}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <CheckCircle size={14} />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(onReject)}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <XCircle size={14} />
                  Decline
                </Button>
              </>
            )}
            
            {match.status === 'active' && onChat && (
              <Button
                size="sm"
                onClick={() => onChat(match.id)}
                className="flex items-center gap-1"
              >
                <MessageCircle size={14} />
                Chat
              </Button>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction(onDelete)}
            disabled={loading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchStatusCard; 