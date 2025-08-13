import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log route-specific error
    console.error('Route error caught:', {
      error,
      errorInfo,
      route: this.props.routeType || 'unknown',
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <RouteErrorFallback 
          routeType={this.props.routeType}
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

const RouteErrorFallback = ({ routeType, error, onRetry }) => {
  const navigate = useNavigate();

  const getRouteSpecificContent = () => {
    switch (routeType) {
      case 'auth':
        return {
          title: 'Authentication Error',
          message: 'There was a problem with the authentication process. Please try logging in again.',
          primaryAction: {
            label: 'Go to Login',
            action: () => navigate('/login')
          }
        };
      case 'protected':
        return {
          title: 'Protected Route Error',
          message: 'There was a problem loading this page. Please check your authentication and try again.',
          primaryAction: {
            label: 'Go to Profile',
            action: () => navigate('/profile')
          }
        };
      case 'public':
        return {
          title: 'Page Error',
          message: 'There was a problem loading this page. Please try again or go back to the home page.',
          primaryAction: {
            label: 'Go Home',
            action: () => navigate('/')
          }
        };
      default:
        return {
          title: 'Something went wrong',
          message: 'There was an unexpected error. Please try again.',
          primaryAction: {
            label: 'Go Home',
            action: () => navigate('/')
          }
        };
    }
  };

  const content = getRouteSpecificContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            {content.message}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="bg-gray-100 p-3 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error Details (Development)
              </summary>
              <div className="text-xs text-gray-600">
                <div><strong>Message:</strong> {error.message}</div>
                <div><strong>Route Type:</strong> {routeType}</div>
              </div>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button onClick={content.primaryAction.action} variant="outline" className="w-full">
              {content.primaryAction.label === 'Go Home' ? (
                <Home className="w-4 h-4 mr-2" />
              ) : (
                <ArrowLeft className="w-4 h-4 mr-2" />
              )}
              {content.primaryAction.label}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component to provide navigation context
const RouteErrorBoundaryWithNavigation = (props) => {
  return (
    <RouteErrorBoundary {...props} />
  );
};

export default RouteErrorBoundaryWithNavigation;
