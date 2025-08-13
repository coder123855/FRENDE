import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const useTaskSubmission = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Submit task completion
  const submitTaskCompletion = useCallback(async (taskId, submissionData) => {
    if (!user) return null;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit task completion');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error submitting task completion:', err);
      setError(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // Upload evidence file
  const uploadEvidence = useCallback(async (taskId, file) => {
    if (!user) return null;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', taskId);

      const response = await fetch('/api/tasks/submissions/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload evidence');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error uploading evidence:', err);
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Validate a submission
  const validateSubmission = useCallback(async (submissionId, validationData) => {
    if (!user) return null;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/submissions/${submissionId}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to validate submission');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error validating submission:', err);
      setError(err.message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // Get submission details
  const getSubmissionDetails = useCallback(async (submissionId) => {
    if (!user) return null;

    try {
      const response = await fetch(`/api/tasks/submissions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching submission details:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Get pending validations
  const getPendingValidations = useCallback(async () => {
    if (!user) return [];

    try {
      const response = await fetch('/api/tasks/submissions/pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.submissions || [];
    } catch (err) {
      console.error('Error fetching pending validations:', err);
      setError(err.message);
      return [];
    }
  }, [user]);

  // Get user submissions
  const getUserSubmissions = useCallback(async (status = null) => {
    if (!user) return [];

    try {
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`/api/tasks/submissions/user?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.submissions || [];
    } catch (err) {
      console.error('Error fetching user submissions:', err);
      setError(err.message);
      return [];
    }
  }, [user]);

  // Get submission statistics
  const getSubmissionStatistics = useCallback(async () => {
    if (!user) return null;

    try {
      const response = await fetch('/api/tasks/submissions/statistics', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching submission statistics:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Validate file before upload
  const validateFile = useCallback((file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported. Please upload images, videos, or documents.');
    }

    return true;
  }, []);

  // Get file type category
  const getFileTypeCategory = useCallback((fileType) => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('application/') || fileType.startsWith('text/')) return 'document';
    return 'other';
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    // State
    submitting,
    uploading,
    error,
    
    // Actions
    submitTaskCompletion,
    uploadEvidence,
    validateSubmission,
    getSubmissionDetails,
    getPendingValidations,
    getUserSubmissions,
    getSubmissionStatistics,
    
    // Utilities
    validateFile,
    getFileTypeCategory,
    formatFileSize,
    
    // Clear error
    clearError: () => setError(null)
  };
};

export default useTaskSubmission; 