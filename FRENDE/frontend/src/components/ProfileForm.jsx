import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import Select from './ui/select';
import MultiSelect from './ui/multi-select';
import ImageUpload from './ImageUpload';
import Avatar from './ui/avatar';
import { useCompatibilityOptions } from '../hooks/useCompatibilityOptions';
import { userAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProfileForm = ({ onSave, className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    profession: user?.profession || '',
    profile_text: user?.profile_text || '',
    community: user?.community || '',
    location: user?.location || '',
    interests: [],
    age_preference_min: '',
    age_preference_max: ''
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Get compatibility options
  const {
    getCommunityOptions,
    getLocationOptions,
    getInterestOptions,
    parseInterests,
    stringifyInterests,
    validateAgePreferences,
    loading: optionsLoading,
    error: optionsError
  } = useCompatibilityOptions();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age || '',
        profession: user.profession || '',
        profile_text: user.profile_text || '',
        community: user.community || '',
        location: user.location || '',
        interests: parseInterests(user.interests),
        age_preference_min: user.age_preference_min || '',
        age_preference_max: user.age_preference_max || ''
      });
      setProfilePictureUrl(user.profile_picture_url || '');
    }
  }, [user, parseInterests]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (imageUrl) => {
    setProfilePictureUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setProfilePictureUrl('');
  };

  const validateForm = () => {
    if (formData.age && (formData.age < 13 || formData.age > 100)) {
      return 'Age must be between 13 and 100.';
    }
    
    if (formData.profile_text && formData.profile_text.length > 500) {
      return 'Profile text must be 500 characters or less.';
    }
    
    // Validate age preferences
    const ageError = validateAgePreferences(
      formData.age_preference_min ? parseInt(formData.age_preference_min) : null,
      formData.age_preference_max ? parseInt(formData.age_preference_max) : null
    );
    if (ageError) {
      return ageError;
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSaving(true);
    
    try {
      const updatedData = {
        ...formData,
        interests: stringifyInterests(formData.interests),
        profile_picture_url: profilePictureUrl
      };
      
      const result = await userAPI.updateProfile(updatedData);
      
      if (result.success) {
        onSave && onSave(result.data);
        navigate('/profile');
      } else {
        setError(result.error || 'Failed to save profile');
      }
    } catch (err) {
      setError('An error occurred while saving your profile');
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('Profile edit cancelled');
    navigate('/profile');
  };

  if (optionsLoading) {
    return (
      <Card className={`p-4 sm:p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading form options...</p>
        </div>
      </Card>
    );
  }

  if (optionsError) {
    return (
      <Card className={`p-4 sm:p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading form options. Please try again.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Edit Profile</h1>
          <p className="text-sm text-gray-600">Update your profile information</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-shrink-0">
              <Avatar 
                src={profilePictureUrl} 
                name={formData.name}
                size="xl" 
                alt="Profile picture"
                variant="gradient"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImageUrl={profilePictureUrl}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <Input
              id="age"
              type="number"
              min="13"
              max="100"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              className="w-full"
              placeholder="Enter your age"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
            Profession
          </label>
          <Input
            id="profession"
            type="text"
            value={formData.profession}
            onChange={(e) => handleInputChange('profession', e.target.value)}
            className="w-full"
            placeholder="What do you do?"
          />
        </div>

        {/* Location and Community */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-1">
              Community
            </label>
            <Select
              id="community"
              value={formData.community}
              onChange={(value) => handleInputChange('community', value)}
              options={getCommunityOptions()}
              placeholder="Select your community"
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <Select
              id="location"
              value={formData.location}
              onChange={(value) => handleInputChange('location', value)}
              options={getLocationOptions()}
              placeholder="Select your location"
              className="w-full"
            />
          </div>
        </div>

        {/* Interests */}
        <div>
          <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
            Interests
          </label>
          <MultiSelect
            id="interests"
            value={formData.interests}
            onChange={(value) => handleInputChange('interests', value)}
            options={getInterestOptions()}
            placeholder="Select your interests"
            className="w-full"
          />
        </div>

        {/* Age Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="age_preference_min" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Age Preference
            </label>
            <Input
              id="age_preference_min"
              type="number"
              min="13"
              max="100"
              value={formData.age_preference_min}
              onChange={(e) => handleInputChange('age_preference_min', e.target.value)}
              className="w-full"
              placeholder="Min age"
            />
          </div>

          <div>
            <label htmlFor="age_preference_max" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Age Preference
            </label>
            <Input
              id="age_preference_max"
              type="number"
              min="13"
              max="100"
              value={formData.age_preference_max}
              onChange={(e) => handleInputChange('age_preference_max', e.target.value)}
              className="w-full"
              placeholder="Max age"
            />
          </div>
        </div>

        {/* Profile Text */}
        <div>
          <label htmlFor="profile_text" className="block text-sm font-medium text-gray-700 mb-1">
            About Me
          </label>
          <textarea
            id="profile_text"
            value={formData.profile_text}
            onChange={(e) => handleInputChange('profile_text', e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tell us about yourself (max 500 characters)"
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {formData.profile_text.length}/500 characters
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm; 