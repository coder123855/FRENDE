import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Settings, HelpCircle } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import RetryButton from './RetryButton';

const ErrorRecovery = ({ 
  error, 
  errorType = 'general',
  onRetry,
  onGoHome,
  onGoBack,
  onReset,
  onContactSupport,
  className = ''
}) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    try {
      await onReset?.();
    } catch (error) {
      console.error('Reset failed:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const getRecoveryOptions = () => {
    const baseOptions = [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Attempt to reload the content',
        icon: RefreshCw,
        action: onRetry,
        primary: true
      },
      {
        id: 'goBack',
        label: 'Go Back',
        description: 'Return to the previous page',
        icon: ArrowLeft,
        action: onGoBack
      },
      {
        id: 'goHome',
        label: 'Go Home',
        description: 'Return to the main page',
        icon: Home,
        action: onGoHome
      }
    ];

    // Add type-specific options
    switch (errorType) {
      case 'auth':
        baseOptions.push({
          id: 'reset',
          label: 'Reset Session',
          description: 'Clear your session and start fresh',
          icon: Settings,
          action: handleReset,
          loading: isResetting
        });
        break;
      case 'network':
        baseOptions.push({
          id: 'checkConnection',
          label: 'Check Connection',
          description: 'Verify your internet connection',
          icon: HelpCircle,
          action: () => window.location.reload()
        });
        break;
      default:
        break;
    }

    // Add support option if available
    if (onContactSupport) {
      baseOptions.push({
        id: 'support',
        label: 'Contact Support',
        description: 'Get help from our support team',
        icon: HelpCircle,
        action: onContactSupport
      });
    }

    return baseOptions;
  };

  const recoveryOptions = getRecoveryOptions();

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle className="text-lg">Error Recovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <ErrorDisplay
              error={error}
              type="error"
              showDetails={process.env.NODE_ENV === 'development'}
            />
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              Recovery Options:
            </h4>
            <div className="grid gap-3">
              {recoveryOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    
                    {option.primary ? (
                      <RetryButton
                        onRetry={option.action}
                        variant="default"
                        size="sm"
                        disabled={option.loading}
                      >
                        {option.loading ? 'Resetting...' : option.label}
                      </RetryButton>
                    ) : (
                      <Button
                        onClick={option.action}
                        variant="outline"
                        size="sm"
                        disabled={option.loading}
                      >
                        {option.label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If the problem persists, please contact our support team for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorRecovery;
