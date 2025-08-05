import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Chat from './components/Chat';
import AvatarDemo from './components/AvatarDemo';
import ProfileForm from './components/ProfileForm';
import Profile from './components/Profile';
import MatchingInterface from './components/MatchingInterface';
import NotificationSystem from './components/NotificationSystem';

function App() {
  const [currentView, setCurrentView] = useState('demo'); // 'demo', 'profile', 'chat', 'profile-display'
  
  const mockUser = {
    id: 1,
    name: "John Doe",
    age: 25,
    profession: "Software Developer",
    profile_text: "I love coding and making new friends! I'm passionate about technology and always eager to learn new things. When I'm not coding, you can find me exploring new places or reading a good book.",
    community: "Tech",
    location: "San Francisco",
    profile_picture_url: null,
    available_slots: 2,
    coins: 50,
    total_slots_used: 0,
    created_at: "2024-01-01T00:00:00Z"
  };

  const handleProfileSave = (updatedUser) => {
    console.log('Profile saved:', updatedUser);
    alert('Profile saved successfully!');
  };

  const handleProfileCancel = () => {
    console.log('Profile edit cancelled');
    setCurrentView('profile-display');
  };

  const handleEditProfile = () => {
    setCurrentView('profile');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification System */}
      <NotificationSystem />
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Frende Demo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('demo')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'demo' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Avatar Demo
              </button>
              <button
                onClick={() => setCurrentView('profile-display')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'profile-display' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile Display
              </button>
              <button
                onClick={() => setCurrentView('profile')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'profile' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile Form
              </button>
              <button
                onClick={() => setCurrentView('chat')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'chat' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentView('matching')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'matching' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Matching
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'demo' && <AvatarDemo />}
        {currentView === 'profile-display' && (
          <div className="max-w-2xl mx-auto">
            <Profile 
              user={mockUser}
              onEdit={handleEditProfile}
            />
          </div>
        )}
        {currentView === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <ProfileForm 
              user={mockUser}
              onSave={handleProfileSave}
              onCancel={handleProfileCancel}
            />
          </div>
        )}
        {currentView === 'chat' && <Chat />}
        {currentView === 'matching' && <MatchingInterface />}
      </main>
    </div>
  );
}

export default App
