import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { OptimisticProvider } from './contexts/OptimisticContext';
import MainLayout from './components/MainLayout';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Profile from './components/Profile';
import MatchingInterface from './components/MatchingInterface';
import Chat from './components/Chat';
import TaskManager from './components/TaskManager';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/error-boundaries/ErrorBoundary';
import GlobalErrorNotification from './components/GlobalErrorNotification';
import ErrorReportingModal from './components/ErrorReportingModal';
import { GlobalOptimisticIndicator } from './components/OptimisticUpdateIndicator';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <LoadingProvider>
        <OfflineProvider>
                      <AccessibilityProvider>
              <ErrorProvider>
                <OptimisticProvider>
                  <AuthProvider>
                    <SocketProvider>
                  <Router>
                    <div className="App">
                      <Routes>
                        {/* Public routes */}
                        <Route 
                          path="/login" 
                          element={
                            <PublicRoute>
                              <LoginForm />
                            </PublicRoute>
                          } 
                        />
                        <Route 
                          path="/register" 
                          element={
                            <PublicRoute>
                              <RegisterForm />
                            </PublicRoute>
                          } 
                        />

                        {/* Protected routes */}
                        <Route 
                          path="/" 
                          element={
                            <ProtectedRoute>
                              <MainLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Navigate to="/matching" replace />} />
                          <Route path="matching" element={<MatchingInterface />} />
                          <Route path="chat/:matchId" element={<Chat />} />
                          <Route path="tasks" element={<TaskManager />} />
                          <Route path="profile" element={<Profile />} />
                        </Route>

                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                      
                      {/* Global error handling components */}
                      <GlobalErrorNotification />
                      <ErrorReportingModal isOpen={false} onClose={() => {}} />
                      
                      {/* Global optimistic update indicator */}
                      <GlobalOptimisticIndicator />
                    </div>
                  </Router>
                                      </SocketProvider>
                    </AuthProvider>
                  </OptimisticProvider>
                </ErrorProvider>
              </AccessibilityProvider>
        </OfflineProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App;
