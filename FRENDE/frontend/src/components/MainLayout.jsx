import { useAuth } from '../contexts/AuthContext';
import { useOfflineState, useSync } from '../hooks/useOffline.js';
import { useAccessibility } from '../hooks/useAccessibility';
import Navigation from './Navigation';
import NotificationSystem from './NotificationSystem';
import OfflineStatus from './offline/OfflineStatus';

function MainLayout({ children }) {
  const { loading } = useAuth();
  const { isOnline, syncInProgress } = useOfflineState();
  const { syncStatus } = useSync();
  const { highContrast, fontSize, reducedMotion } = useAccessibility();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 ${highContrast ? 'high-contrast' : ''}`}
      data-font-size={fontSize}
      data-reduced-motion={reducedMotion}
    >
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Notification System */}
      <NotificationSystem />
      
      {/* Offline Status Bar */}
      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2 text-orange-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
              </svg>
              <span className="text-sm font-medium">You are offline</span>
            </div>
            <div className="flex items-center space-x-2">
              {syncInProgress && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-600"></div>
                  <span className="text-xs">Syncing...</span>
                </div>
              )}
              <span className="text-xs text-orange-600">
                {syncStatus.pendingActions} pending actions
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <Navigation />

      {/* Content */}
      <main 
        id="main-content"
        className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        role="main"
      >
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
