import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const friend = {
  name: 'Regina',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  status: 'Active 14 minutes ago',
};

const initialMessages = [
  { id: 1, sender: 'You', text: 'Hi! Ready to chat?' },
  { id: 2, sender: 'Friend', text: 'Hello! Yes, let’s go!' },
];

export default function Chat() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() === '') return;
    setMessages([...messages, { id: Date.now(), sender: 'You', text: input }]);
    setInput('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f0f2f5]">
      <div className="w-full max-w-md flex flex-col h-[80vh] bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
          <img src={friend.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-base truncate">{friend.name}</div>
            <div className="text-xs text-gray-500 truncate">{friend.status}</div>
          </div>
          <div className="flex gap-2 text-blue-500">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M6.5 20h11a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.5"/><path d="M12 15v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M17 8.5V7a5 5 0 0 0-10 0v1.5" stroke="currentColor" strokeWidth="1.5"/><rect width="18" height="12" x="3" y="8.5" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 bg-[#f0f2f5]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender !== 'You' && (
                <img src={friend.avatar} alt="avatar" className="w-7 h-7 rounded-full mr-2 object-cover self-end" />
              )}
              <div
                className={`px-4 py-2 max-w-[75%] break-words text-base shadow-sm ${
                  msg.sender === 'You'
                    ? 'bg-[#0084ff] text-white rounded-full'
                    : 'bg-gray-200 text-gray-900 rounded-xl'
                }`}
                style={{ marginLeft: msg.sender !== 'You' ? 0 : 'auto', marginRight: msg.sender === 'You' ? 0 : 'auto' }}
              >
                {msg.text}
              </div>
              {msg.sender === 'You' && <div className="w-7" />}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t bg-white rounded-b-xl">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 rounded-full bg-[#f0f2f5] border-0 focus:ring-0"
          />
          <Button onClick={handleSend} type="button" className="font-semibold rounded-full px-4 py-2">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
} 