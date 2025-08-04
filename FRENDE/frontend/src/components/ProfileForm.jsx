import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import ImageUpload from './ImageUpload';
import Avatar from './ui/avatar';

const ProfileForm = ({ user, onSave, onCancel, className = "" }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    profession: '',
    profile_text: '',
    community: '',
    location: ''
  });
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age || '',
        profession: user.profession || '',
        profile_text: user.profile_text || '',
        community: user.community || '',
        location: user.location || ''
      });
      setProfilePictureUrl(user.profile_picture_url || '');
    }
  }, [user]);

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
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          profile_picture_url: profilePictureUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      onSave(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Profile</h2>
          <p className="text-gray-600">Update your profile information and picture</p>
        </div>

        {/* Profile Picture Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Avatar 
              src={profilePictureUrl} 
              name={formData.name || user?.name}
              size="3xl" 
              alt="Current profile picture"
              variant="gradient"
            />
          </div>
          
          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            currentImageUrl={profilePictureUrl}
            disabled={saving}
          />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
              disabled={saving}
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
              placeholder="Enter your age"
              disabled={saving}
            />
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
              placeholder="Enter your profession"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-1">
              Community
            </label>
            <Input
              id="community"
              type="text"
              value={formData.community}
              onChange={(e) => handleInputChange('community', e.target.value)}
              placeholder="Enter your community"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter your location"
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile_text" className="block text-sm font-medium text-gray-700 mb-1">
            About Me
          </label>
          <textarea
            id="profile_text"
            rows={4}
            value={formData.profile_text}
            onChange={(e) => handleInputChange('profile_text', e.target.value)}
            placeholder="Tell us about yourself (max 500 characters)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            maxLength={500}
            disabled={saving}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {formData.profile_text.length}/500 characters
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm; 