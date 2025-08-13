import React from 'react';
import { AlertTriangle, AlertCircle, XCircle, Info } from 'lucide-react';

const ErrorDisplay = ({ 
  error, 
  type = 'error', 
  title, 
  message, 
  showIcon = true,
  showDetails = false,
  className = '',
  onRetry,
  onDismiss
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          title: title || 'Error',
          message: message || error?.message || 'An error occurred'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          title: title || 'Warning',
          message: message || 'Something to be aware of'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          title: title || 'Information',
          message: message || 'Here is some information'
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          title: title || 'Notice',
          message: message || 'Something happened'
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-start space-x-3">
        {showIcon && (
          <IconComponent className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`${config.textColor} hover:opacity-75 transition-opacity`}
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className={`text-sm ${config.textColor} mt-1`}>
            {config.message}
          </p>

          {showDetails && error && (
            <details className="mt-3">
              <summary className={`text-xs ${config.textColor} cursor-pointer hover:opacity-75`}>
                Show error details
              </summary>
              <div className="mt-2 p-2 bg-white rounded border text-xs font-mono text-gray-700 overflow-auto">
                <div><strong>Message:</strong> {error.message}</div>
                {error.stack && (
                  <div className="mt-1">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 text-sm font-medium ${config.textColor} hover:opacity-75 transition-opacity`}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
