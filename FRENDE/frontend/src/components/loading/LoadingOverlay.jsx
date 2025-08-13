import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ 
  isLoading = false, 
  text = 'Loading...', 
  showSpinner = true,
  backdrop = true,
  zIndex = 'z-50',
  className = ''
}) => {
  if (!isLoading) return null;

  const overlayClasses = `
    fixed inset-0 flex items-center justify-center
    ${backdrop ? 'bg-black bg-opacity-50' : 'bg-transparent'}
    ${zIndex}
    ${className}
  `;

  return (
    <div className={overlayClasses}>
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
        {showSpinner && (
          <LoadingSpinner size="lg" color="blue" />
        )}
        {text && (
          <p className="text-gray-700 font-medium">{text}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
