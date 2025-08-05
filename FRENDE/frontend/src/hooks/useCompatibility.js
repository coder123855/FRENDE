import { useState, useEffect, useCallback } from 'react';
import { compatibilityAPI } from '../lib/api';

export const useCompatibility = () => {
  const [options, setOptions] = useState({
    communities: [],
    locations: [],
    interest_categories: []
  });
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch compatibility options (communities, locations, interests)
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

  // Preview compatibility with a target user
  const previewCompatibility = useCallback(async (targetUserId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await compatibilityAPI.previewCompatibility(targetUserId);
      setCompatibilityData(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate compatibility');
      console.error('Error calculating compatibility:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear compatibility data
  const clearCompatibility = useCallback(() => {
    setCompatibilityData(null);
    setError(null);
  }, []);

  // Get compatibility score level
  const getCompatibilityLevel = useCallback((score) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100' };
  }, []);

  // Check if compatibility is good enough for matching
  const isCompatibleForMatching = useCallback((score, threshold = 50) => {
    return score >= threshold;
  }, []);

  // Load options on mount
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    options,
    compatibilityData,
    loading,
    error,
    fetchOptions,
    previewCompatibility,
    clearCompatibility,
    getCompatibilityLevel,
    isCompatibleForMatching,
    clearError: () => setError(null)
  };
}; 