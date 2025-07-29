import React, { useState } from 'react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() === '') return;
    
    const newMessage = {
      id: Date.now(),
      sender: 'currentUser', // Use a more descriptive identifier
      text: input
    };
    
    setMessages([...messages, newMessage]);
    setInput('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end ${msg.sender === 'currentUser' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender !== 'currentUser' && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 mr-2">
                {msg.sender.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.sender === 'currentUser'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
              style={{ 
                marginLeft: msg.sender !== 'currentUser' ? 0 : 'auto', 
                marginRight: msg.sender === 'currentUser' ? 0 : 'auto' 
              }}
            >
              {msg.text}
            </div>
            
            {msg.sender === 'currentUser' && <div className="w-7" />}
          </div>
        ))}
      </div>
      
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat; 