import React from 'react';

const DefaultAvatar = ({ 
  size = "md", 
  name = null, 
  variant = "silhouette", // "silhouette", "initials", "gradient"
  className = "" 
}) => {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8", 
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
    "3xl": "w-32 h-32"
  };

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl"
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name) => {
    if (!name) return 'from-gray-300 to-gray-400';
    
    // Generate consistent color based on name
    const colors = [
      'from-blue-300 to-blue-400',
      'from-green-300 to-green-400',
      'from-purple-300 to-purple-400',
      'from-pink-300 to-pink-400',
      'from-indigo-300 to-indigo-400',
      'from-yellow-300 to-yellow-400',
      'from-red-300 to-red-400',
      'from-teal-300 to-teal-400'
    ];
    
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderSilhouette = () => (
    <svg
      className="w-full h-full p-2"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );

  const renderInitials = () => (
    <span className="font-semibold text-gray-700">
      {getInitials(name)}
    </span>
  );

  const renderGradient = () => (
    <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
      {name ? renderInitials() : renderSilhouette()}
    </div>
  );

  const getBackgroundClass = () => {
    if (variant === "gradient" && name) {
      return `bg-gradient-to-br ${getRandomColor(name)}`;
    }
    return "bg-gradient-to-br from-gray-300 to-gray-400";
  };

  const renderContent = () => {
    switch (variant) {
      case "initials":
        return renderInitials();
      case "gradient":
        return renderGradient();
      case "silhouette":
      default:
        return renderSilhouette();
    }
  };

  return (
    <div className={`${sizeClasses[size]} ${textSizes[size]} ${getBackgroundClass()} rounded-full flex items-center justify-center text-gray-600 font-medium border-2 border-gray-200 shadow-sm ${className}`}>
      {renderContent()}
    </div>
  );
};

export default DefaultAvatar; 