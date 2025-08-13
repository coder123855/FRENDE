import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import Chat from './components/Chat';
import AvatarDemo from './components/AvatarDemo';
import ProfileForm from './components/ProfileForm';
import Profile from './components/Profile';
import MatchingInterface from './components/MatchingInterface';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AccessibilitySettings from './components/AccessibilitySettings';
import NotificationSystem from './components/NotificationSystem';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import ErrorBoundary from './components/error-boundaries/ErrorBoundary';
import RouteErrorBoundary from './components/error-boundaries/RouteErrorBoundary';
import OfflineIndicator from './components/error-states/OfflineIndicator';
import TestErrorBoundary from './components/TestErrorBoundary';

function App() {
  const handleProfileSave = (updatedUser) => {
    console.log('Profile saved:', updatedUser);
    alert('Profile saved successfully!');
  };

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <OfflineProvider>
          <AccessibilityProvider>
            <AuthProvider>
            <BrowserRouter>
              <OfflineIndicator showBanner={true} />
              <NotificationSystem />
              <MainLayout>
              <Routes>
                <Route path="/" element={
                  <RouteErrorBoundary routeType="public">
                    <AvatarDemo />
                  </RouteErrorBoundary>
                } />
                
                {/* Public Routes - Only accessible to unauthenticated users */}
                <Route 
                  path="/login" 
                  element={
                    <RouteErrorBoundary routeType="auth">
                      <PublicRoute>
                        <LoginForm />
                      </PublicRoute>
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <RouteErrorBoundary routeType="auth">
                      <PublicRoute>
                        <RegisterForm />
                      </PublicRoute>
                    </RouteErrorBoundary>
                  } 
                />
                
                {/* Protected Routes - Only accessible to authenticated users */}
                <Route 
                  path="/profile" 
                  element={
                    <RouteErrorBoundary routeType="protected">
                      <ProtectedRoute>
                        <div className="max-w-2xl mx-auto">
                          <Profile />
                        </div>
                      </ProtectedRoute>
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/profile/edit" 
                  element={
                    <RouteErrorBoundary routeType="protected">
                      <ProtectedRoute>
                        <div className="max-w-2xl mx-auto">
                          <ProfileForm onSave={handleProfileSave} />
                        </div>
                      </ProtectedRoute>
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <RouteErrorBoundary routeType="protected">
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/matching" 
                  element={
                    <RouteErrorBoundary routeType="protected">
                      <ProtectedRoute>
                        <MatchingInterface />
                      </ProtectedRoute>
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/test-error" 
                  element={
                    <RouteErrorBoundary routeType="public">
                      <TestErrorBoundary />
                    </RouteErrorBoundary>
                  } 
                />
                <Route 
                  path="/accessibility" 
                  element={
                    <RouteErrorBoundary routeType="protected">
                      <ProtectedRoute>
                        <AccessibilitySettings />
                      </ProtectedRoute>
                    </RouteErrorBoundary>
                  } 
                />
              </Routes>
            </MainLayout>
          </BrowserRouter>
            </AuthProvider>
          </AccessibilityProvider>
        </OfflineProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App
