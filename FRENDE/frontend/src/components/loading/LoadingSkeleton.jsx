import React from 'react';

const LoadingSkeleton = ({ 
  type = 'text', 
  lines = 3, 
  className = '',
  width = 'full',
  height = 'auto'
}) => {
  const widthClasses = {
    full: 'w-full',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '2/3': 'w-2/3',
    '1/4': 'w-1/4',
    '3/4': 'w-3/4',
    'auto': 'w-auto'
  };

  const heightClasses = {
    auto: 'h-auto',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
    '2xl': 'h-16'
  };

  const baseClasses = `animate-pulse bg-gray-200 rounded ${widthClasses[width]} ${heightClasses[height]} ${className}`;

  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return (
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <div
                key={index}
                className={`${baseClasses} ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
              />
            ))}
          </div>
        );

      case 'title':
        return (
          <div className="space-y-2">
            <div className={`${baseClasses} h-8 w-3/4`} />
            <div className={`${baseClasses} h-6 w-1/2`} />
          </div>
        );

      case 'card':
        return (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
            </div>
          </div>
        );

      case 'avatar':
        return (
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className={`${baseClasses} h-10 w-24`} />
        );

      case 'image':
        return (
          <div className={`${baseClasses} aspect-video`} />
        );

      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  {index % 2 === 0 && (
                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-6 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: lines }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        );

      default:
        return <div className={baseClasses} />;
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;
