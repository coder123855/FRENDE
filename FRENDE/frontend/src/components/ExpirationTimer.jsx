import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';

const ExpirationTimer = ({ expiresAt, onExpired, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        onExpired?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, total: diff });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  if (!expiresAt || isExpired) {
    return (
      <Badge variant="destructive" className={`flex items-center gap-1 ${className}`}>
        <AlertTriangle size={12} />
        Expired
      </Badge>
    );
  }

  if (!timeLeft) {
    return null;
  }

  const isExpiringSoon = timeLeft.total < 60 * 60 * 1000; // Less than 1 hour
  const isExpiringVerySoon = timeLeft.total < 15 * 60 * 1000; // Less than 15 minutes

  const getVariant = () => {
    if (isExpiringVerySoon) return 'destructive';
    if (isExpiringSoon) return 'secondary';
    return 'outline';
  };

  const formatTime = () => {
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    } else if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else {
      return `${timeLeft.seconds}s`;
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={`flex items-center gap-1 ${className} ${
        isExpiringVerySoon ? 'animate-pulse' : ''
      }`}
    >
      <Clock size={12} />
      {formatTime()}
    </Badge>
  );
};

export default ExpirationTimer; 