import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

const MatchingLoadingSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
          {/* User card header */}
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
            
            {/* User info */}
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
            </div>
          </div>

          {/* Compatibility score */}
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* User description */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, interestIndex) => (
              <div 
                key={interestIndex} 
                className="h-6 bg-gray-200 rounded-full px-3 animate-pulse"
                style={{ width: `${Math.random() * 40 + 60}px` }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchingLoadingSkeleton;
