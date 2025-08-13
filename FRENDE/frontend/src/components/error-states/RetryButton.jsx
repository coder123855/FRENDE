import React, { useState } from 'react';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';

const RetryButton = ({ 
  onRetry, 
  children = 'Try Again',
  variant = 'outline',
  size = 'default',
  className = '',
  disabled = false,
  showIcon = true,
  loadingText = 'Retrying...'
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      variant={variant}
      size={size}
      disabled={disabled || isRetrying}
      className={className}
    >
      {showIcon && (
        <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
      )}
      {isRetrying ? loadingText : children}
    </Button>
  );
};

export default RetryButton;
