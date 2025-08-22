import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import OptimizedAvatar from './ui/OptimizedAvatar';
import { Badge } from './ui/badge';
import { Heart, User, MapPin, Building, Loader2, Eye, Sparkles } from 'lucide-react';

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
    if (score >= 80) return 'bg-gradient-to-r from-success-500 to-success-600 text-white';
    if (score >= 60) return 'bg-gradient-to-r from-accent-500 to-accent-600 text-white';
    if (score >= 40) return 'bg-gradient-to-r from-warning-500 to-warning-600 text-white';
    return 'bg-gradient-to-r from-error-500 to-error-600 text-white';
  };

  const getCompatibilityLevel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Great Match';
    if (score >= 40) return 'Good Match';
    return 'Fair Match';
  };

  const getCompatibilityIcon = (score) => {
    if (score >= 80) return <Sparkles className="w-3 h-3" />;
    if (score >= 60) return <Heart className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const formatAge = (age) => {
    if (!age) return '';
    return `${age} years old`;
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-border/50 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <OptimizedAvatar
                src={user.profile_picture_url}
                name={user.name}
                size="md"
                className="w-16 h-16 ring-4 ring-white shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                {getCompatibilityIcon(compatibilityScore)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-foreground mb-1 truncate">{user.name}</h3>
              <div className="flex items-center space-x-3 text-sm text-foreground-secondary">
                {user.age && (
                  <span className="flex items-center">
                    <span className="w-1 h-1 bg-foreground-secondary rounded-full mr-2"></span>
                    {formatAge(user.age)}
                  </span>
                )}
                {user.profession && (
                  <span className="flex items-center">
                    <Building className="w-3 h-3 mr-1" />
                    {user.profession}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${getCompatibilityColor(compatibilityScore)} text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>
              {compatibilityScore}%
            </Badge>
            <div className="text-xs text-muted-foreground mt-1 font-medium">
              {getCompatibilityLevel(compatibilityScore)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Location and Community */}
        <div className="flex items-center space-x-4 text-sm text-foreground-secondary">
          {user.location && (
            <div className="flex items-center bg-background-secondary px-3 py-1.5 rounded-lg">
              <MapPin className="w-3 h-3 mr-1.5 text-primary-500" />
              <span className="font-medium">{user.location}</span>
            </div>
          )}
          {user.community && (
            <div className="flex items-center bg-background-secondary px-3 py-1.5 rounded-lg">
              <Building className="w-3 h-3 mr-1.5 text-secondary-500" />
              <span className="font-medium">{user.community}</span>
            </div>
          )}
        </div>

        {/* Common Interests */}
        {commonInterests.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Common interests</p>
            <div className="flex flex-wrap gap-2">
              {commonInterests.slice(0, 3).map((interest, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-primary-50 text-primary-700 border-primary-200 font-medium">
                  {interest}
                </Badge>
              ))}
              {commonInterests.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-secondary-50 text-secondary-700 border-secondary-200 font-medium">
                  +{commonInterests.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Profile Text Preview */}
        {user.profile_text && (
          <div className="bg-background-secondary p-3 rounded-xl">
            <p className="text-sm text-foreground-secondary leading-relaxed line-clamp-2">
              {user.profile_text.length > 120 
                ? `${user.profile_text.substring(0, 120)}...` 
                : user.profile_text
              }
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={() => onSendRequest(user.id)}
            disabled={loading || disabled}
            className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold shadow-md hover:shadow-lg"
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
            className="flex items-center border-2 hover:border-primary-300 hover:bg-primary-50"
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