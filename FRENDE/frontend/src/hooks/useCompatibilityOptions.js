import { useState, useEffect, useCallback } from 'react';
import { compatibilityAPI } from '../lib/api';

export const useCompatibilityOptions = () => {
  const [options, setOptions] = useState({
    communities: [],
    locations: [],
    interest_categories: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch compatibility options
  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await compatibilityAPI.getOptions();
      setOptions(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch compatibility options');
      console.error('Error fetching compatibility options:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Parse interests from JSON string
  const parseInterests = useCallback((interestsString) => {
    if (!interestsString) return [];
    try {
      return JSON.parse(interestsString);
    } catch (err) {
      console.error('Error parsing interests:', err);
      return [];
    }
  }, []);

  // Stringify interests to JSON string
  const stringifyInterests = useCallback((interestsArray) => {
    if (!Array.isArray(interestsArray)) return '';
    try {
      return JSON.stringify(interestsArray);
    } catch (err) {
      console.error('Error stringifying interests:', err);
      return '';
    }
  }, []);

  // Get community options with "Other" option
  const getCommunityOptions = useCallback(() => {
    return [...options.communities, 'Other'];
  }, [options.communities]);

  // Get location options with "Other" option
  const getLocationOptions = useCallback(() => {
    return [...options.locations, 'Other'];
  }, [options.locations]);

  // Get interest options with "Other" option
  const getInterestOptions = useCallback(() => {
    return [...options.interest_categories, 'Other'];
  }, [options.interest_categories]);

  // Validate age preferences
  const validateAgePreferences = useCallback((min, max) => {
    if (min && max && min > max) {
      return 'Minimum age cannot be greater than maximum age';
    }
    if (min && (min < 18 || min > 100)) {
      return 'Minimum age must be between 18 and 100';
    }
    if (max && (max < 18 || max > 100)) {
      return 'Maximum age must be between 18 and 100';
    }
    return null;
  }, []);

  // Initialize options on mount
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    // State
    options,
    loading,
    error,
    
    // Actions
    fetchOptions,
    
    // Utilities
    parseInterests,
    stringifyInterests,
    getCommunityOptions,
    getLocationOptions,
    getInterestOptions,
    validateAgePreferences,
    
    // Reset error
    clearError: () => setError(null)
  };
}; 