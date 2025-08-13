import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

const ChatLoadingSkeleton = ({ count = 5, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`flex items-end space-x-2 max-w-xs ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
            {/* Avatar */}
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
            
            {/* Message bubble */}
            <div className={`flex flex-col space-y-1 ${index % 2 === 0 ? 'items-start' : 'items-end'}`}>
              {/* Message content */}
              <div className={`rounded-lg p-3 ${
                index % 2 === 0 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'bg-blue-500 text-white'
              }`}>
                <div className="space-y-1">
                  <div className={`h-3 bg-gray-300 rounded animate-pulse ${
                    index % 2 === 0 ? 'w-32' : 'w-24'
                  }`} />
                  {index % 3 === 0 && (
                    <div className={`h-3 bg-gray-300 rounded animate-pulse ${
                      index % 2 === 0 ? 'w-20' : 'w-16'
                    }`} />
                  )}
                </div>
              </div>
              
              {/* Timestamp */}
              <div className={`text-xs text-gray-500 ${index % 2 === 0 ? 'ml-1' : 'mr-1'}`}>
                <div className="w-12 h-2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatLoadingSkeleton;
