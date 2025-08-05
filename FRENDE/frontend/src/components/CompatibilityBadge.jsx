import React from 'react';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CompatibilityBadge = ({ 
  score, 
  size = 'default',
  showIcon = true,
  showLevel = true,
  className = ''
}) => {
  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'bg-green-500 hover:bg-green-600 text-white';
    if (score >= 60) return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    if (score >= 40) return 'bg-orange-500 hover:bg-orange-600 text-white';
    return 'bg-red-500 hover:bg-red-600 text-white';
  };

  const getCompatibilityLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getCompatibilityIcon = (score) => {
    if (score >= 80) return <TrendingUp className="w-3 h-3" />;
    if (score >= 60) return <TrendingUp className="w-3 h-3" />;
    if (score >= 40) return <Minus className="w-3 h-3" />;
    return <TrendingDown className="w-3 h-3" />;
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-2';
      default:
        return 'text-sm px-3 py-1';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        className={`${getCompatibilityColor(score)} ${getSizeClasses(size)} font-medium transition-colors duration-200`}
      >
        <div className="flex items-center gap-1">
          {showIcon && getCompatibilityIcon(score)}
          <span>{score}%</span>
        </div>
      </Badge>
      {showLevel && (
        <span className={`text-xs font-medium ${
          score >= 80 ? 'text-green-600' : 
          score >= 60 ? 'text-yellow-600' : 
          score >= 40 ? 'text-orange-600' : 'text-red-600'
        }`}>
          {getCompatibilityLevel(score)}
        </span>
      )}
    </div>
  );
};

export default CompatibilityBadge; 