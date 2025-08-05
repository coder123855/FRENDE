import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Heart, User, MapPin, Building, Loader2, Eye } from 'lucide-react';

const UserCard = ({ 
  user, 
  compatibilityScore, 
  commonInterests = [], 
  onSendRequest, 
  onViewProfile,
  loading = false,
  disabled = false 
}) => {
  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getCompatibilityLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const formatAge = (age) => {
    if (!age) return '';
    return `${age} years old`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.profile_picture} />
              <AvatarFallback className="bg-gray-200">
                {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {user.age && (
                  <>
                    <span>{formatAge(user.age)}</span>
                    <span>•</span>
                  </>
                )}
                {user.profession && (
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {user.profession}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${getCompatibilityColor(compatibilityScore)} text-xs font-medium`}>
              {compatibilityScore}%
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {getCompatibilityLevel(compatibilityScore)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Location and Community */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {user.location && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {user.location}
            </div>
          )}
          {user.community && (
            <div className="flex items-center">
              <Building className="w-3 h-3 mr-1" />
              {user.community}
            </div>
          )}
        </div>

        {/* Common Interests */}
        {commonInterests.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Common interests:</p>
            <div className="flex flex-wrap gap-1">
              {commonInterests.slice(0, 3).map((interest, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {commonInterests.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{commonInterests.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Profile Text Preview */}
        {user.profile_text && (
          <div className="text-sm text-gray-600">
            <p className="line-clamp-2">
              {user.profile_text.length > 100 
                ? `${user.profile_text.substring(0, 100)}...` 
                : user.profile_text
              }
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onSendRequest(user.id)}
            disabled={loading || disabled}
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Heart className="w-4 h-4 mr-2" />
            )}
            Send Request
          </Button>
          <Button 
            onClick={() => onViewProfile(user.id)}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard; 