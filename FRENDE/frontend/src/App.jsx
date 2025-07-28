import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Chat from './components/Chat';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Chat />
    </div>
  );
}

export default App
