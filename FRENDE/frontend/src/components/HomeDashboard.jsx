import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomeDashboard = () => {
  console.log('HomeDashboard component rendering...');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  console.log('HomeDashboard - user:', user);

  return (
    <div className="container mx-auto p-6">
      {/* Welcome Section */}
      <div className="modern-card text-center space-y-6 mb-8">
        <h1 className="text-4xl font-bold text-gradient-primary">Welcome to Frende!</h1>
        <p className="text-xl text-gray-600">Your AI-powered friend-finding platform</p>
        
        {user ? (
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <p className="text-green-800 font-semibold text-lg">✅ Welcome back, {user.name || 'Friend'}!</p>
            <p className="text-green-700 mt-2">Ready to make new connections?</p>
          </div>
        ) : (
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <p className="text-red-800 font-semibold text-lg">❌ No user data available</p>
            <p className="text-red-700 mt-2">Please log in to continue</p>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="modern-card text-center hover-lift">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">👤</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
          <p className="text-gray-600 mb-4">Update your profile and preferences</p>
          <button 
            onClick={() => navigate('/profile')}
            className="btn-modern w-full"
          >
            View Profile
          </button>
        </div>

        <div className="modern-card text-center hover-lift">
          <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">💝</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Friends</h3>
          <p className="text-gray-600 mb-4">Discover compatible friends</p>
          <button 
            onClick={() => navigate('/matching')}
            className="btn-modern w-full"
          >
            Start Matching
          </button>
        </div>

        <div className="modern-card text-center hover-lift">
          <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat</h3>
          <p className="text-gray-600 mb-4">Connect with your matches</p>
          <button 
            onClick={() => navigate('/chat')}
            className="btn-modern w-full"
          >
            Open Chats
          </button>
        </div>

        <div className="modern-card text-center hover-lift">
          <div className="w-16 h-16 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎯</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tasks</h3>
          <p className="text-gray-600 mb-4">Complete bonding activities</p>
          <button 
            onClick={() => navigate('/tasks')}
            className="btn-modern w-full"
          >
            View Tasks
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="modern-card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <div className="text-3xl font-bold text-blue-600">12</div>
            <div className="text-gray-600">Friends Found</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-3xl font-bold text-green-600">8</div>
            <div className="text-gray-600">Tasks Completed</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="text-3xl font-bold text-purple-600">24</div>
            <div className="text-gray-600">Messages Sent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
