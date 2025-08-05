import { Coins } from 'lucide-react';

export default function CoinBalance({ coins, showLabel = true, size = "default" }) {
  const sizeClasses = {
    small: "w-4 h-4 text-xs",
    default: "w-6 h-6 text-sm",
    large: "w-8 h-8 text-base"
  };

  const textClasses = {
    small: "text-sm",
    default: "text-base",
    large: "text-lg"
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses[size]} bg-yellow-400 rounded-full flex items-center justify-center`}>
        <Coins className="w-3 h-3 text-yellow-800" />
      </div>
      <span className={`font-semibold text-gray-900 ${textClasses[size]}`}>
        {coins.toLocaleString()}
      </span>
      {showLabel && (
        <span className={`text-gray-600 ${textClasses[size]}`}>
          coins
        </span>
      )}
    </div>
  );
} 