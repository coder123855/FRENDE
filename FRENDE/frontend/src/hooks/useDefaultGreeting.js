import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export const useDefaultGreeting = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getDefaultGreeting = useCallback(async (userName, templateId = null) => {
        if (!user) return null;

        try {
            const url = new URL(`/api/automatic-greeting/default-greeting/${encodeURIComponent(userName)}`, window.location.origin);
            if (templateId) {
                url.searchParams.set('template_id', templateId);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.greeting;
            } else {
                throw new Error('Failed to get default greeting');
            }
        } catch (err) {
            console.error('Error getting default greeting:', err);
            return null;
        }
    }, [user]);

    const getRandomGreeting = useCallback(async (userName) => {
        if (!user) return null;

        try {
            const response = await fetch(`/api/automatic-greeting/default-greeting/${encodeURIComponent(userName)}?random=true`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.greeting;
            } else {
                throw new Error('Failed to get random greeting');
            }
        } catch (err) {
            console.error('Error getting random greeting:', err);
            return null;
        }
    }, [user]);

    const getGreetingTemplates = useCallback(async () => {
        if (!user) return [];

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/automatic-greeting/templates', {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTemplates(data.templates || []);
                return data.templates || [];
            } else {
                throw new Error('Failed to get greeting templates');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error getting greeting templates:', err);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const getTemplateById = useCallback(async (templateId) => {
        if (!user || !templateId) return null;

        try {
            const response = await fetch(`/api/automatic-greeting/templates/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error('Failed to get template');
            }
        } catch (err) {
            console.error('Error getting template:', err);
            return null;
        }
    }, [user]);

    const saveUserPreference = useCallback(async (templateId) => {
        if (!user || !templateId) return false;

        try {
            const response = await fetch('/api/automatic-greeting/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ template_id: templateId })
            });

            if (response.ok) {
                console.log(`User preference saved: ${templateId}`);
                return true;
            } else {
                throw new Error('Failed to save preference');
            }
        } catch (err) {
            console.error('Error saving preference:', err);
            return false;
        }
    }, [user]);

    const getUserPreference = useCallback(async () => {
        if (!user) return null;

        try {
            const response = await fetch('/api/automatic-greeting/preferences', {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.template_id;
            } else {
                throw new Error('Failed to get user preference');
            }
        } catch (err) {
            console.error('Error getting user preference:', err);
            return null;
        }
    }, [user]);

    const personalizeGreeting = useCallback((template, userName, userData = null) => {
        try {
            // Basic name substitution
            let personalized = template.replace(/{name}/g, userName);
            
            // Add user-specific personalization if data is available
            if (userData) {
                // Could add age, interests, etc. for more personalization
                if (userData.age) {
                    personalized = personalized.replace(/{age}/g, userData.age);
                }
                if (userData.interests && userData.interests.length > 0) {
                    const randomInterest = userData.interests[Math.floor(Math.random() * userData.interests.length)];
                    personalized = personalized.replace(/{interest}/g, randomInterest);
                }
            }
            
            return personalized;
        } catch (err) {
            console.error('Error personalizing greeting:', err);
            return template.replace(/{name}/g, userName);
        }
    }, []);

    const validateTemplate = useCallback((template) => {
        try {
            // Check if template has required placeholder
            if (!template.includes('{name}')) {
                return { valid: false, error: 'Template must include {name} placeholder' };
            }
            
            // Check template length
            if (template.length > 500) {
                return { valid: false, error: 'Template too long (max 500 characters)' };
            }
            
            // Check for potentially harmful content
            const harmfulWords = ['script', 'javascript', 'onload', 'onerror'];
            const templateLower = template.toLowerCase();
            for (const word of harmfulWords) {
                if (templateLower.includes(word)) {
                    return { valid: false, error: 'Template contains potentially harmful content' };
                }
            }
            
            return { valid: true };
        } catch (err) {
            return { valid: false, error: 'Invalid template format' };
        }
    }, []);

    const sanitizeUserName = useCallback((userName) => {
        try {
            // Remove potentially harmful characters
            let sanitized = userName.trim();
            
            // Limit length
            if (sanitized.length > 50) {
                sanitized = sanitized.substring(0, 50);
            }
            
            // Remove HTML tags
            sanitized = sanitized.replace(/<[^>]*>/g, '');
            
            // Remove special characters that could be used for XSS
            sanitized = sanitized.replace(/[<>\"'&]/g, '');
            
            return sanitized;
        } catch (err) {
            console.error('Error sanitizing user name:', err);
            return 'User';
        }
    }, []);

    const getDefaultTemplate = useCallback(() => {
        return templates.find(template => template.is_default) || {
            id: 'default',
            template: "Hello, my name is {name}, I am shy and can't think of a cool opening line :( Wanna be friends?",
            name: 'Default Shy Greeting',
            is_default: true
        };
    }, [templates]);

    const getTemplateOptions = useCallback(() => {
        return templates.map(template => ({
            value: template.id,
            label: template.name,
            template: template.template
        }));
    }, [templates]);

    const previewGreeting = useCallback((templateId, userName) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return null;
        
        return personalizeGreeting(template.template, userName);
    }, [templates, personalizeGreeting]);

    return {
        templates,
        isLoading,
        error,
        getDefaultGreeting,
        getRandomGreeting,
        getGreetingTemplates,
        getTemplateById,
        saveUserPreference,
        getUserPreference,
        personalizeGreeting,
        validateTemplate,
        sanitizeUserName,
        getDefaultTemplate,
        getTemplateOptions,
        previewGreeting,
        reload: getGreetingTemplates
    };
}; 