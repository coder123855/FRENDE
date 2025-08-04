import React, { useState } from 'react';
import DefaultAvatar from './default-avatar';

const Avatar = ({ 
  src, 
  alt = "Profile picture", 
  size = "md", 
  className = "",
  fallback = null,
  name = null,
  variant = "silhouette" // Pass through to DefaultAvatar
}) => {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8", 
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
    "3xl": "w-32 h-32"
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // If no src or image failed to load, show default avatar
  if (!src || imageError) {
    return fallback || <DefaultAvatar size={size} name={name} variant={variant} className={className} />;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
        onError={handleImageError}
      />
    </div>
  );
};

export default Avatar; 