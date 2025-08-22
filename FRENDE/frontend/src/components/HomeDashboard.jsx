import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomeDashboard = () => {
  console.log('HomeDashboard component rendering...');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  console.log('HomeDashboard - user:', user);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Home Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome to Frende! This is a test to see if the routing works.</p>
        
        {user ? (
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-green-800">✅ User is authenticated: {user.name || 'Unknown'}</p>
          </div>
        ) : (
          <div className="bg-red-100 p-4 rounded-lg">
            <p className="text-red-800">❌ No user data available</p>
          </div>
        )}
        
        <div className="mt-8">
          <button 
            onClick={() => navigate('/profile')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
