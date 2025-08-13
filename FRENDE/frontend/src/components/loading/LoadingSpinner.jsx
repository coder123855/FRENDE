import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '',
  text = '',
  showText = false
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinnerClasses = `${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`;

  if (showText && text) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        <Loader2 className={spinnerClasses} />
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    );
  }

  return <Loader2 className={spinnerClasses} />;
};

export default LoadingSpinner;
