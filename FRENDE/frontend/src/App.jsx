import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Chat from './components/Chat';
import AvatarDemo from './components/AvatarDemo';
import ProfileForm from './components/ProfileForm';

function App() {
  const [currentView, setCurrentView] = useState('demo'); // 'demo', 'profile', 'chat'
  
  const mockUser = {
    id: 1,
    name: "John Doe",
    age: 25,
    profession: "Software Developer",
    profile_text: "I love coding and making new friends!",
    community: "Tech",
    location: "San Francisco",
    profile_picture_url: null
  };

  const handleProfileSave = (updatedUser) => {
    console.log('Profile saved:', updatedUser);
    alert('Profile saved successfully!');
  };

  const handleProfileCancel = () => {
    console.log('Profile edit cancelled');
    setCurrentView('demo');
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'demo' && <AvatarDemo />}
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
      </main>
    </div>
  );
}

export default App
