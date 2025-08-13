import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

const TaskLoadingSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Task header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Task description */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
          </div>

          {/* Task metadata */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gray-300 h-2 rounded-full w-1/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskLoadingSkeleton;
