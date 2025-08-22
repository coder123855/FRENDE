import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoadingSkeleton from './components/loading/LoadingSkeleton';
import './App.css';

// Lazy load components for code splitting
const MainLayout = lazy(() => import('./components/MainLayout'));
const LoginForm = lazy(() => import('./components/LoginForm'));
const RegisterForm = lazy(() => import('./components/RegisterForm'));
const Profile = lazy(() => import('./components/Profile'));
const MatchingInterface = lazy(() => import('./components/MatchingInterface'));
const ChatList = lazy(() => import('./components/ChatList'));
const Chat = lazy(() => import('./components/Chat'));
const TaskManager = lazy(() => import('./components/TaskManager'));
const HomeDashboard = lazy(() => import('./components/HomeDashboard'));
const Store = lazy(() => import('./components/Store'));
const MatchSuccess = lazy(() => import('./components/MatchSuccess'));

function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Suspense fallback={<LoadingSkeleton />}>
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
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="home" element={<HomeDashboard />} />
                  <Route path="matching" element={<MatchingInterface />} />
                  <Route path="chat" element={<ChatList />} />
                  <Route path="chat/:matchId" element={<Chat />} />
                  <Route path="tasks" element={<TaskManager />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="store" element={<Store />} />
                  <Route path="match-success/:matchId" element={<MatchSuccess />} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
