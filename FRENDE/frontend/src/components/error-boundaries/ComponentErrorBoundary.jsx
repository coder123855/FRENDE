import React from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error
    });

    // Log component-specific error
    console.error('Component error caught:', {
      error,
      errorInfo,
      componentName: this.props.componentName || 'Unknown',
      timestamp: new Date().toISOString()
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // If a fallback component is provided, use it
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
          componentName: this.props.componentName
        });
      }

      // Default fallback UI
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              {this.props.componentName || 'Component'} Error
            </span>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {this.props.errorMessage || 'This component encountered an error and cannot be displayed.'}
          </p>
          <Button 
            onClick={this.handleRetry} 
            size="sm" 
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ComponentErrorBoundary
      componentName={options.componentName || Component.displayName || Component.name}
      fallback={options.fallback}
      errorMessage={options.errorMessage}
    >
      <Component {...props} />
    </ComponentErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ComponentErrorBoundary;
