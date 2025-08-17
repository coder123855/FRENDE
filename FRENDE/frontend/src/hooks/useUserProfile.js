import { useState, useCallback, useEffect } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';

/**
 * Hook for managing user profile data and operations
 */
export const useUserProfile = (userId = null) => {
    const { user: currentUser } = useAuth();
    const targetUserId = userId || currentUser?.id;

    // State management
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draftProfile, setDraftProfile] = useState(null);

    // API hooks
    const getProfileApi = useApi(`/api/users/${targetUserId}/profile`, { immediate: false });
    const updateProfileApi = useApi(`/api/users/${targetUserId}/profile`, { method: 'PUT', immediate: false });
    const uploadAvatarApi = useApi(`/api/users/${targetUserId}/avatar`, { method: 'POST', immediate: false });

    // Load profile data
    const loadProfile = useCallback(async () => {
        if (!targetUserId) return;

        try {
            setLoading(true);
            setError(null);
            
            const result = await getProfileApi.execute();
            if (result) {
                setProfile(result);
                setDraftProfile(result);
            }
        } catch (err) {
            setError(err.message || 'Failed to load profile');
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    }, [targetUserId, getProfileApi]);

    // Update profile
    const updateProfile = useCallback(async (profileData) => {
        if (!targetUserId) throw new Error('User ID is required');

        try {
            setLoading(true);
            setError(null);

            const result = await updateProfileApi.execute(profileData);
            if (result) {
                setProfile(result);
                setDraftProfile(result);
                setIsEditing(false);
            }
            return result;
        } catch (err) {
            setError(err.message || 'Failed to update profile');
            console.error('Error updating profile:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [targetUserId, updateProfileApi]);

    // Upload avatar
    const uploadAvatar = useCallback(async (file) => {
        if (!targetUserId) throw new Error('User ID is required');

        try {
            setLoading(true);
            setError(null);

            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadAvatarApi.execute(formData, {
                'Content-Type': 'multipart/form-data'
            });

            if (result) {
                setProfile(prev => ({ ...prev, profile_picture_url: result.profile_picture_url }));
                setDraftProfile(prev => ({ ...prev, profile_picture_url: result.profile_picture_url }));
            }
            return result;
        } catch (err) {
            setError(err.message || 'Failed to upload avatar');
            console.error('Error uploading avatar:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [targetUserId, uploadAvatarApi]);

    // Start editing
    const startEditing = useCallback(() => {
        setIsEditing(true);
        setDraftProfile(profile);
    }, [profile]);

    // Cancel editing
    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setDraftProfile(profile);
        setError(null);
    }, [profile]);

    // Save draft changes
    const saveDraft = useCallback(async () => {
        if (!draftProfile) return;

        try {
            await updateProfile(draftProfile);
        } catch (err) {
            // Error is already handled in updateProfile
            throw err;
        }
    }, [draftProfile, updateProfile]);

    // Update draft field
    const updateDraftField = useCallback((field, value) => {
        setDraftProfile(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    // Validate profile data
    const validateProfile = useCallback((profileData) => {
        const errors = {};

        if (profileData.name && profileData.name.length > 50) {
            errors.name = 'Name must be less than 50 characters';
        }

        if (profileData.age && (profileData.age < 13 || profileData.age > 100)) {
            errors.age = 'Age must be between 13 and 100';
        }

        if (profileData.profile_text && profileData.profile_text.length > 500) {
            errors.profile_text = 'Profile text must be less than 500 characters';
        }

        if (profileData.interests && profileData.interests.length > 200) {
            errors.interests = 'Interests must be less than 200 characters';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, []);

    // Get profile statistics
    const getProfileStats = useCallback(() => {
        if (!profile) return null;

        return {
            profileCompleteness: calculateProfileCompleteness(profile),
            lastUpdated: profile.updated_at,
            memberSince: profile.created_at,
            profileViews: profile.profile_views || 0,
            matchCount: profile.match_count || 0,
            taskCompletionRate: profile.task_completion_rate || 0
        };
    }, [profile]);

    // Calculate profile completeness percentage
    const calculateProfileCompleteness = useCallback((profileData) => {
        const requiredFields = ['name', 'age', 'profile_text'];
        const optionalFields = ['profession', 'community', 'location', 'interests', 'profile_picture_url'];
        
        const totalFields = requiredFields.length + optionalFields.length;
        let completedFields = 0;

        // Check required fields
        requiredFields.forEach(field => {
            if (profileData[field] && profileData[field].toString().trim()) {
                completedFields++;
            }
        });

        // Check optional fields
        optionalFields.forEach(field => {
            if (profileData[field] && profileData[field].toString().trim()) {
                completedFields++;
            }
        });

        return Math.round((completedFields / totalFields) * 100);
    }, []);

    // Check if profile is complete
    const isProfileComplete = useCallback(() => {
        if (!profile) return false;
        return calculateProfileCompleteness(profile) >= 80;
    }, [profile, calculateProfileCompleteness]);

    // Load profile on mount or user change
    useEffect(() => {
        if (targetUserId) {
            loadProfile();
        }
    }, [targetUserId, loadProfile]);

    return {
        // Data and state
        profile,
        draftProfile,
        loading,
        error,
        isEditing,

        // Actions
        loadProfile,
        updateProfile,
        uploadAvatar,
        startEditing,
        cancelEditing,
        saveDraft,
        updateDraftField,

        // Validation
        validateProfile,

        // Computed values
        profileStats: getProfileStats(),
        profileCompleteness: profile ? calculateProfileCompleteness(profile) : 0,
        isProfileComplete: isProfileComplete(),

        // Utilities
        hasChanges: JSON.stringify(profile) !== JSON.stringify(draftProfile),
        canSave: isEditing && draftProfile && validateProfile(draftProfile).isValid,
        isOwnProfile: !userId || userId === currentUser?.id
    };
};
