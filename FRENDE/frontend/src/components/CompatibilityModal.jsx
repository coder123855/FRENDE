import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Heart, X, User, MapPin, Building, Star, Users } from 'lucide-react';
import CompatibilityBadge from './CompatibilityBadge';

const CompatibilityModal = ({ 
  isOpen, 
  onClose, 
  user, 
  compatibilityData, 
  onSendRequest,
  loading = false 
}) => {
  if (!user || !compatibilityData) return null;

  const { compatibility_score, common_interests } = compatibilityData;

  const getCompatibilityFactors = () => {
    // This would come from the backend compatibility calculation
    // For now, we'll create a mock breakdown
    return [
      {
        factor: 'Age Compatibility',
        score: Math.min(100, Math.max(0, 100 - Math.abs((user.age || 25) - 25) * 2)),
        details: 'Similar age range for better connection'
      },
      {
        factor: 'Location',
        score: user.location ? 80 : 0,
        details: user.location ? 'Same location for easier meetups' : 'Location not specified'
      },
      {
        factor: 'Community',
        score: user.community ? 75 : 0,
        details: user.community ? 'Shared community interests' : 'Community not specified'
      },
      {
        factor: 'Common Interests',
        score: common_interests.length > 0 ? Math.min(100, common_interests.length * 20) : 0,
        details: `${common_interests.length} shared interests`
      }
    ];
  };

  const factors = getCompatibilityFactors();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profile_picture} />
                <AvatarFallback className="bg-gray-200">
                  {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                </AvatarFallback>
              </Avatar>
              <span>Compatibility with {user.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Compatibility Score */}
          <div className="text-center p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
            <div className="mb-4">
              <CompatibilityBadge 
                score={compatibility_score} 
                size="lg" 
                showLevel={true}
                className="justify-center"
              />
            </div>
            <p className="text-sm text-gray-600">
              Based on age, location, community, and shared interests
            </p>
          </div>

          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{user.name}</span>
                {user.age && <span className="text-gray-600">({user.age} years old)</span>}
              </div>
              {user.profession && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{user.profession}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {user.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{user.location}</span>
                </div>
              )}
              {user.community && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{user.community}</span>
                </div>
              )}
            </div>
          </div>

          {/* Compatibility Factors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Compatibility Breakdown</h3>
            <div className="space-y-3">
              {factors.map((factor, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">{factor.factor}</span>
                    <span className="text-sm font-medium text-gray-600">
                      {factor.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${factor.score}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{factor.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Common Interests */}
          {common_interests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Common Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {common_interests.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Profile Text */}
          {user.profile_text && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">About {user.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {user.profile_text}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => onSendRequest(user.id)}
              disabled={loading}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending Request...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Send Match Request
                </div>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompatibilityModal; 