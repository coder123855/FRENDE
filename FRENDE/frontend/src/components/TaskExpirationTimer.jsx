import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const TaskExpirationTimer = ({ task, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!task.expires_at) return 0;
      
      const expirationTime = new Date(task.expires_at).getTime();
      const now = new Date().getTime();
      const difference = expirationTime - now;
      
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
        if (onExpired) onExpired(task);
        return 0;
      }
      
      // Set warning state if less than 2 hours remaining
      setIsWarning(difference < 2 * 60 * 60 * 1000);
      setTimeLeft(difference);
      return difference;
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every minute
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [task.expires_at, onExpired]);

  const formatTimeLeft = (milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = () => {
    if (isExpired) return 'destructive';
    if (isWarning) return 'warning';
    return 'default';
  };

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle className="w-4 h-4" />;
    if (isWarning) return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (isWarning) return 'Expiring Soon';
    return 'Active';
  };

  if (task.is_completed) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle className="w-4 h-4" />
        Completed
      </Badge>
    );
  }

  return (
    <Badge variant={getStatusColor()} className="flex items-center gap-1">
      {getStatusIcon()}
      {formatTimeLeft(timeLeft)}
      <span className="ml-1">({getStatusText()})</span>
    </Badge>
  );
};

export default TaskExpirationTimer; 