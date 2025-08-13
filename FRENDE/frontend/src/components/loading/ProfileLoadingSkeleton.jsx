import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

const ProfileLoadingSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile header */}
      <div className="flex items-center space-x-6">
        {/* Avatar */}
        <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse" />
        
        {/* Profile info */}
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
        </div>
        
        {/* Edit button */}
        <div className="w-20 h-10 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Profile description */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center space-y-2">
            <div className="h-8 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
          </div>
        ))}
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div 
              key={index} 
              className="h-8 bg-gray-200 rounded-full px-4 animate-pulse"
              style={{ width: `${Math.random() * 60 + 80}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileLoadingSkeleton;
