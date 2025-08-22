import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Camera,
  Sparkles,
  CheckCircle
} from 'lucide-react';


const Profile = ({ className = "" }) => {
  console.log('Profile component rendering...');
  const { user, loading, error, isAuthenticated, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    age: '',
    community: '',
    bio: ''
  });

  // Helper function to count words
  const countWords = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Update profile data when user data becomes available
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        username: user.username || '',
        age: user.age || '',
        community: user.community || '',
        bio: user.profile_text || ''
      });
    }
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Show no user data state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field, value) => {
    // Special handling for bio field to enforce word limit
    if (field === 'bio') {
      const wordCount = countWords(value);
      if (wordCount > 100) {
        return; // Don't update if over word limit
      }
    }
    
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Prevent multiple rapid saves
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);
    
    // Add a small delay to prevent rapid successive saves
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      // Prepare the data for API call
      const updateData = {
        name: profileData.name,
        username: profileData.username,
        age: profileData.age ? parseInt(profileData.age) : null,
        community: profileData.community,
        profile_text: profileData.bio
      };

      // Use the AuthContext updateProfile function to update both API and local state
      const response = await updateProfile(updateData);
      
      if (response) {
        console.log('Profile updated successfully:', response);
        setIsEditing(false);
        
        // Show success message
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      
      // Handle rate limiting errors specifically
      if (error.response?.status === 429) {
        alert('Too many requests. Please wait a moment and try again.');
      } else {
        alert('Failed to save profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setProfileData({
        name: user.name || '',
        username: user.username || '',
        age: user.age || '',
        community: user.community || '',
        bio: user.profile_text || ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Profile
            </h1>
          </div>
          <p className="text-lg text-gray-600">Manage your profile information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Edit Form */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Edit Profile</span>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                    <AvatarImage src={user?.profile_picture_url} alt={user?.name} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xl font-semibold">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute bottom-0 right-0 bg-primary-500 text-white p-2 rounded-full hover:bg-primary-600"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <Input
                    value={isEditing ? profileData.name : (user?.name || '')}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <Input
                    value={isEditing ? profileData.username : (user?.username || '')}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <Input
                    type="number"
                    value={isEditing ? profileData.age : (user?.age || '')}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                    placeholder="Enter your age"
                    min="13"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Community
                  </label>
                  <Input
                    value={isEditing ? profileData.community : (user?.community || '')}
                    onChange={(e) => handleInputChange('community', e.target.value)}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                    placeholder="e.g., University, Workplace, Hobby Group"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <Textarea
                    value={isEditing ? profileData.bio : (user?.profile_text || '')}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    className="min-h-[100px] bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                    placeholder="Tell others about yourself (max 100 words)..."
                  />
                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      {countWords(profileData.bio)}/100 words
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 h-11 border-gray-300 hover:border-primary-500 hover:bg-primary-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 h-11 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Preview */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>How Others See You</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Preview Avatar */}
                                 <div className="text-center">
                   <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg mx-auto">
                     <AvatarImage src={user?.profile_picture_url} />
                     <AvatarFallback className="bg-gray-200 text-gray-600 text-lg font-semibold">
                       {user?.name?.charAt(0) || 'U'}
                     </AvatarFallback>
                   </Avatar>
                 </div>

                {/* Preview Info */}
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {isEditing ? profileData.name : (user?.name || 'Anonymous')}
                    </h3>
                    <p className="text-gray-600">@{isEditing ? profileData.username : (user?.username || 'username')}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Age:</span>
                      <span className="text-sm font-medium">
                        {isEditing ? profileData.age : (user?.age || 'Not specified')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Community:</span>
                      <span className="text-sm font-medium">
                        {isEditing ? profileData.community : (user?.community || 'Not specified')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {isEditing ? profileData.bio : (user?.profile_text || 'No bio provided')}
                    </p>
                  </div>

                  {/* Stats Preview */}
                  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Coins</p>
                        <p className="font-semibold text-primary-600">{user?.coins || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available Slots</p>
                        <p className="font-semibold text-secondary-600">{user?.available_slots || 2}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile; 