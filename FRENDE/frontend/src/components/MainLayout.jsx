import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';

function MainLayout() {
  console.log('MainLayout component rendering...');
  const { loading } = useAuth();
  
  console.log('MainLayout - loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-6 text-gray-700 text-lg font-medium">Loading your experience...</p>
        </div>
      </div>
    );
  }

  console.log('MainLayout - rendering main content');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Navigation */}
      <Navigation />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
