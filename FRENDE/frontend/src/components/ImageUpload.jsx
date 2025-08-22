import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import imageOptimizer from '../utils/imageOptimization';
import imagePerformanceMonitor from '../utils/imagePerformance';

const ImageUpload = ({ 
  onImageUpload, 
  onImageRemove, 
  currentImageUrl, 
  className = "",
  disabled = false 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const validation = imageOptimizer.validateImage(file, {
      maxSize: 30 * 1024 * 1024, // 30MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxWidth: 4096,
      maxHeight: 4096
    });
    
    return validation.valid ? null : validation.error;
  };

  const handleFileSelect = async (file) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Get image dimensions and generate preview
    try {
      const dimensions = await imageOptimizer.getImageDimensions(file);
      console.log('Image dimensions:', dimensions);
      
      // Create optimized preview
      const optimizedFile = await imageOptimizer.compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        format: imageOptimizer.getOptimalFormat()
      });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(optimizedFile);

      // Upload optimized file
      setUploading(true);
      const formData = new FormData();
      formData.append('file', optimizedFile);
      
      const response = await fetch('/api/users/me/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const userData = await response.json();
      
      // Track upload performance
      imagePerformanceMonitor.trackImageLoad(
        userData.profile_picture_url, 
        0, // Upload time not tracked here
        optimizedFile.size,
        optimizedFile.type.split('/')[1]
      );
      
      onImageUpload(userData.profile_picture_url);
      setPreview(null); // Clear preview after successful upload
    } catch (err) {
      setError(err.message);
      setPreview(null);
      
      // Track error
      imagePerformanceMonitor.trackImageError(file.name, err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    try {
      const response = await fetch('/api/users/me/profile-picture', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Delete failed');
      }

      onImageRemove();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const imageUrl = preview || currentImageUrl;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        {imageUrl ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={imageUrl}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Click to change or drag a new image here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Upload Profile Picture
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Drag and drop an image here, or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-2">
                JPEG or PNG, max 30MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1"
        >
          {uploading ? 'Uploading...' : 'Choose File'}
        </Button>
        
        {currentImageUrl && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemoveImage}
            disabled={disabled || uploading}
            className="flex-1"
          >
            {uploading ? 'Removing...' : 'Remove'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload; 