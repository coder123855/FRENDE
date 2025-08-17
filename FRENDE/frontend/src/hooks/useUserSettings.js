import { useState, useCallback, useEffect } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';

/**
 * Hook for managing user settings and preferences
 */
export const useUserSettings = () => {
    const { user } = useAuth();

    // State management
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draftSettings, setDraftSettings] = useState(null);

    // API hooks
    const getSettingsApi = useApi('/api/users/settings', { immediate: false });
    const updateSettingsApi = useApi('/api/users/settings', { method: 'PUT', immediate: false });
    const updatePasswordApi = useApi('/api/users/password', { method: 'PUT', immediate: false });
    const updateEmailApi = useApi('/api/users/email', { method: 'PUT', immediate: false });
    const deleteAccountApi = useApi('/api/users/account', { method: 'DELETE', immediate: false });

    // Default settings
    const defaultSettings = {
        notifications: {
            matches: true,
            messages: true,
            tasks: true,
            reminders: true,
            email_notifications: true,
            push_notifications: true
        },
        privacy: {
            profile_visibility: 'public',
            show_online_status: true,
            show_last_seen: true,
            allow_profile_views: true
        },
        matching: {
            age_range_min: 18,
            age_range_max: 35,
            max_distance: 50,
            show_me_to: 'everyone',
            interested_in: 'everyone'
        },
        chat: {
            auto_greeting: true,
            typing_indicators: true,
            read_receipts: true,
            message_preview: true
        },
        accessibility: {
            high_contrast: false,
            large_text: false,
            screen_reader: false,
            reduced_motion: false
        },
        language: 'en',
        timezone: 'UTC',
        theme: 'system'
    };

    // Load settings
    const loadSettings = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            
            const result = await getSettingsApi.execute();
            if (result) {
                const mergedSettings = { ...defaultSettings, ...result };
                setSettings(mergedSettings);
                setDraftSettings(mergedSettings);
            }
        } catch (err) {
            setError(err.message || 'Failed to load settings');
            console.error('Error loading settings:', err);
            // Use default settings if loading fails
            setSettings(defaultSettings);
            setDraftSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    }, [user, getSettingsApi]);

    // Update settings
    const updateSettings = useCallback(async (newSettings) => {
        if (!user) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            const result = await updateSettingsApi.execute(newSettings);
            if (result) {
                const mergedSettings = { ...defaultSettings, ...result };
                setSettings(mergedSettings);
                setDraftSettings(mergedSettings);
                setIsEditing(false);
            }
            return result;
        } catch (err) {
            setError(err.message || 'Failed to update settings');
            console.error('Error updating settings:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, updateSettingsApi]);

    // Update password
    const updatePassword = useCallback(async (currentPassword, newPassword) => {
        if (!user) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            const result = await updatePasswordApi.execute({
                current_password: currentPassword,
                new_password: newPassword
            });

            return result;
        } catch (err) {
            setError(err.message || 'Failed to update password');
            console.error('Error updating password:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, updatePasswordApi]);

    // Update email
    const updateEmail = useCallback(async (newEmail, password) => {
        if (!user) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            const result = await updateEmailApi.execute({
                new_email: newEmail,
                password: password
            });

            return result;
        } catch (err) {
            setError(err.message || 'Failed to update email');
            console.error('Error updating email:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, updateEmailApi]);

    // Delete account
    const deleteAccount = useCallback(async (password, reason = '') => {
        if (!user) throw new Error('User not authenticated');

        try {
            setLoading(true);
            setError(null);

            const result = await deleteAccountApi.execute({
                password: password,
                reason: reason
            });

            return result;
        } catch (err) {
            setError(err.message || 'Failed to delete account');
            console.error('Error deleting account:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user, deleteAccountApi]);

    // Start editing
    const startEditing = useCallback(() => {
        setIsEditing(true);
        setDraftSettings(settings);
    }, [settings]);

    // Cancel editing
    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setDraftSettings(settings);
        setError(null);
    }, [settings]);

    // Save draft changes
    const saveDraft = useCallback(async () => {
        if (!draftSettings) return;

        try {
            await updateSettings(draftSettings);
        } catch (err) {
            // Error is already handled in updateSettings
            throw err;
        }
    }, [draftSettings, updateSettings]);

    // Update draft setting
    const updateDraftSetting = useCallback((category, key, value) => {
        setDraftSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    }, []);

    // Update draft setting directly
    const updateDraftSettingDirect = useCallback((key, value) => {
        setDraftSettings(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // Reset settings to default
    const resetToDefault = useCallback(async () => {
        try {
            await updateSettings(defaultSettings);
        } catch (err) {
            throw err;
        }
    }, [updateSettings]);

    // Export settings
    const exportSettings = useCallback(() => {
        if (!settings) return null;

        const exportData = {
            settings: settings,
            exported_at: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `frende-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }, [settings]);

    // Import settings
    const importSettings = useCallback(async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (importData.version !== '1.0') {
                        throw new Error('Unsupported settings version');
                    }

                    await updateSettings(importData.settings);
                    resolve(importData.settings);
                } catch (err) {
                    reject(err);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }, [updateSettings]);

    // Validate settings
    const validateSettings = useCallback((settingsData) => {
        const errors = {};

        // Validate age range
        if (settingsData.matching?.age_range_min > settingsData.matching?.age_range_max) {
            errors.age_range = 'Minimum age cannot be greater than maximum age';
        }

        if (settingsData.matching?.age_range_min < 13 || settingsData.matching?.age_range_max > 100) {
            errors.age_range = 'Age range must be between 13 and 100';
        }

        // Validate distance
        if (settingsData.matching?.max_distance < 1 || settingsData.matching?.max_distance > 1000) {
            errors.distance = 'Distance must be between 1 and 1000 km';
        }

        // Validate language
        const supportedLanguages = ['en', 'vi', 'es', 'fr', 'de', 'ja', 'ko', 'zh'];
        if (settingsData.language && !supportedLanguages.includes(settingsData.language)) {
            errors.language = 'Unsupported language';
        }

        // Validate theme
        const supportedThemes = ['light', 'dark', 'system'];
        if (settingsData.theme && !supportedThemes.includes(settingsData.theme)) {
            errors.theme = 'Unsupported theme';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }, []);

    // Load settings on mount
    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user, loadSettings]);

    return {
        // Data and state
        settings,
        draftSettings,
        loading,
        error,
        isEditing,

        // Actions
        loadSettings,
        updateSettings,
        updatePassword,
        updateEmail,
        deleteAccount,
        startEditing,
        cancelEditing,
        saveDraft,
        updateDraftSetting,
        updateDraftSettingDirect,
        resetToDefault,
        exportSettings,
        importSettings,

        // Validation
        validateSettings,

        // Utilities
        hasChanges: JSON.stringify(settings) !== JSON.stringify(draftSettings),
        canSave: isEditing && draftSettings && validateSettings(draftSettings).isValid,
        defaultSettings
    };
};
