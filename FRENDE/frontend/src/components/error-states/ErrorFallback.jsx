import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, Wifi, WifiOff, Server, User, Home } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import RetryButton from './RetryButton';

const ErrorFallback = ({ 
  error, 
  errorType = 'general',
  onRetry,
  onGoHome,
  onGoBack,
  className = ''
}) => {
  const getErrorConfig = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: WifiOff,
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Check if the service is available'
          ]
        };
      case 'server':
        return {
          icon: Server,
          title: 'Server Error',
          message: 'The server encountered an error. Please try again later.',
          suggestions: [
            'Try again in a few minutes',
            'Check if the service is down',
            'Contact support if the problem persists'
          ]
        };
      case 'auth':
        return {
          icon: User,
          title: 'Authentication Error',
          message: 'Your session has expired or you need to log in again.',
          suggestions: [
            'Try logging in again',
            'Clear your browser cache',
            'Check if your account is still active'
          ]
        };
      case 'notFound':
        return {
          icon: AlertTriangle,
          title: 'Page Not Found',
          message: 'The page you\'re looking for doesn\'t exist or has been moved.',
          suggestions: [
            'Check the URL for typos',
            'Go back to the previous page',
            'Return to the home page'
          ]
        };
      default:
        return {
          icon: AlertTriangle,
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Check your internet connection',
            'Contact support if the problem persists'
          ]
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center justify-center min-h-64 p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            {config.message}
          </p>

          {error && (
            <ErrorDisplay
              error={error}
              type="error"
              showDetails={process.env.NODE_ENV === 'development'}
              className="mt-4"
            />
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Suggestions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {config.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {onRetry && (
              <RetryButton onRetry={onRetry} className="w-full">
                Try Again
              </RetryButton>
            )}
            
            {onGoBack && (
              <Button onClick={onGoBack} variant="outline" className="w-full">
                Go Back
              </Button>
            )}
            
            {onGoHome && (
              <Button onClick={onGoHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorFallback;
