import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Chat from '../Chat';

// Mock the chat hook
jest.mock('../../hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    isTyping: false,
    typingUsers: []
  })
}));

// Mock the socket hook
jest.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn()
  })
}));

// Mock the auth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'John Doe' },
    isAuthenticated: true
  })
}));

const mockSendMessage = jest.fn();
const mockMarkAsRead = jest.fn();

const mockMessages = [
  {
    id: 1,
    content: 'Hello! How are you?',
    sender_id: 2,
    sender_name: 'Jane Smith',
    timestamp: '2024-01-01T10:00:00Z',
    is_read: false
  },
  {
    id: 2,
    content: 'I\'m doing great, thanks!',
    sender_id: 1,
    sender_name: 'John Doe',
    timestamp: '2024-01-01T10:01:00Z',
    is_read: true
  }
];

describe('Chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementations
    require('../../hooks/useChat').useChat.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      error: null,
      sendMessage: mockSendMessage,
      markAsRead: mockMarkAsRead,
      isTyping: false,
      typingUsers: []
    });
  });

  describe('Rendering', () => {
    it('renders chat interface with all required elements', () => {
      render(<Chat matchId={1} />);

      expect(screen.getByTestId('chat-container')).toBeInTheDocument();
      expect(screen.getByTestId('messages-container')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('renders messages correctly', () => {
      render(<Chat matchId={1} />);

      expect(screen.getByText('Hello! How are you?')).toBeInTheDocument();
      expect(screen.getByText('I\'m doing great, thanks!')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders empty state when no messages', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [],
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
      expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();
    });

    it('renders typing indicator when someone is typing', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: true,
        typingUsers: ['Jane Smith']
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/Jane Smith is typing/i)).toBeInTheDocument();
    });

    it('renders multiple typing users correctly', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: true,
        typingUsers: ['Jane Smith', 'Bob Johnson']
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/Jane Smith and Bob Johnson are typing/i)).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('displays messages in correct order', () => {
      render(<Chat matchId={1} />);

      const messages = screen.getAllByTestId('message');
      expect(messages).toHaveLength(2);
      
      // First message should be from Jane
      expect(messages[0]).toHaveTextContent('Hello! How are you?');
      expect(messages[0]).toHaveTextContent('Jane Smith');
      
      // Second message should be from John
      expect(messages[1]).toHaveTextContent('I\'m doing great, thanks!');
      expect(messages[1]).toHaveTextContent('John Doe');
    });

    it('applies correct styling for own messages', () => {
      render(<Chat matchId={1} />);

      const ownMessage = screen.getByText('I\'m doing great, thanks!').closest('[data-testid="message"]');
      expect(ownMessage).toHaveClass('own-message');
    });

    it('applies correct styling for other messages', () => {
      render(<Chat matchId={1} />);

      const otherMessage = screen.getByText('Hello! How are you?').closest('[data-testid="message"]');
      expect(otherMessage).toHaveClass('other-message');
    });

    it('displays message timestamps correctly', () => {
      render(<Chat matchId={1} />);

      expect(screen.getByText(/10:00/i)).toBeInTheDocument();
      expect(screen.getByText(/10:01/i)).toBeInTheDocument();
    });

    it('shows read status for messages', () => {
      render(<Chat matchId={1} />);

      const readMessage = screen.getByText('I\'m doing great, thanks!').closest('[data-testid="message"]');
      expect(readMessage).toHaveAttribute('data-read', 'true');
    });

    it('shows unread status for messages', () => {
      render(<Chat matchId={1} />);

      const unreadMessage = screen.getByText('Hello! How are you?').closest('[data-testid="message"]');
      expect(unreadMessage).toHaveAttribute('data-read', 'false');
    });
  });

  describe('Message Input', () => {
    it('allows typing in message input', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Hello there!');

      expect(messageInput).toHaveValue('Hello there!');
    });

    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Hello there!');
      await user.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalledWith('Hello there!');
    });

    it('sends message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'Hello there!');
      await user.keyboard('{Enter}');

      expect(mockSendMessage).toHaveBeenCalledWith('Hello there!');
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.click(sendButton);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not send messages with only whitespace', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, '   ');
      await user.click(sendButton);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Hello there!');
      await user.click(sendButton);

      expect(messageInput).toHaveValue('');
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when messages are loading', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [],
        isLoading: true,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByTestId('chat-loading-skeleton')).toBeInTheDocument();
    });

    it('disables input when loading', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: true,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(messageInput).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('shows sending indicator when message is being sent', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: [],
        isSending: true
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when chat fails to load', () => {
      const errorMessage = 'Failed to load messages';
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [],
        isLoading: false,
        error: errorMessage,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('handles retry functionality', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to load messages';
      const mockRetry = jest.fn();
      
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [],
        isLoading: false,
        error: errorMessage,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: [],
        retry: mockRetry
      });

      render(<Chat matchId={1} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });

    it('displays error when message sending fails', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: [],
        sendError: 'Failed to send message'
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });
  });

  describe('Real-time Features', () => {
    it('marks messages as read when scrolled to bottom', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messagesContainer = screen.getByTestId('messages-container');
      
      // Simulate scroll to bottom
      fireEvent.scroll(messagesContainer, { target: { scrollTop: 1000 } });

      expect(mockMarkAsRead).toHaveBeenCalled();
    });

    it('auto-scrolls to bottom when new message arrives', () => {
      const { rerender } = render(<Chat matchId={1} />);

      const messagesContainer = screen.getByTestId('messages-container');
      const scrollToSpy = jest.spyOn(messagesContainer, 'scrollTo');

      // Add new message
      const newMessages = [...mockMessages, {
        id: 3,
        content: 'New message!',
        sender_id: 2,
        sender_name: 'Jane Smith',
        timestamp: '2024-01-01T10:02:00Z',
        is_read: false
      }];

      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: newMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      rerender(<Chat matchId={1} />);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    });

    it('shows connection status when disconnected', () => {
      require('../../hooks/useSocket').useSocket.mockReturnValue({
        socket: null,
        isConnected: false,
        connect: jest.fn(),
        disconnect: jest.fn()
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/attempting to reconnect/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<Chat matchId={1} />);

      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toHaveAttribute('role', 'log');
      expect(messagesContainer).toHaveAttribute('aria-live', 'polite');

      const messageInput = screen.getByTestId('message-input');
      expect(messageInput).toHaveAttribute('aria-label', 'Type your message');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Chat matchId={1} />);

      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.tab();
      expect(messageInput).toHaveFocus();

      await user.tab();
      expect(sendButton).toHaveFocus();
    });

    it('provides screen reader feedback for new messages', () => {
      render(<Chat matchId={1} />);

      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toHaveAttribute('aria-label', 'Chat messages');
    });

    it('announces typing status to screen readers', () => {
      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: mockMessages,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: true,
        typingUsers: ['Jane Smith']
      });

      render(<Chat matchId={1} />);

      const typingIndicator = screen.getByText(/Jane Smith is typing/i);
      expect(typingIndicator).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Chat matchId={1} />);

      const chatContainer = screen.getByTestId('chat-container');
      expect(chatContainer).toHaveClass('mobile-layout');
    });

    it('adapts layout for desktop screens', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<Chat matchId={1} />);

      const chatContainer = screen.getByTestId('chat-container');
      expect(chatContainer).toHaveClass('desktop-layout');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages gracefully', () => {
      const longMessage = 'a'.repeat(1000);
      const messagesWithLongMessage = [
        {
          id: 1,
          content: longMessage,
          sender_id: 2,
          sender_name: 'Jane Smith',
          timestamp: '2024-01-01T10:00:00Z',
          is_read: false
        }
      ];

      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: messagesWithLongMessage,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      const messageElement = screen.getByText(longMessage);
      expect(messageElement).toHaveClass('long-message');
    });

    it('handles messages with special characters', () => {
      const specialCharMessage = 'Message with emojis 🚀 and symbols ©®™ & <script>alert("xss")</script>';
      const messagesWithSpecialChars = [
        {
          id: 1,
          content: specialCharMessage,
          sender_id: 2,
          sender_name: 'Jane Smith',
          timestamp: '2024-01-01T10:00:00Z',
          is_read: false
        }
      ];

      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: messagesWithSpecialChars,
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText(/Message with emojis 🚀 and symbols ©®™/)).toBeInTheDocument();
    });

    it('handles missing sender information gracefully', () => {
      const messageWithoutSender = {
        id: 1,
        content: 'Hello!',
        sender_id: 2,
        sender_name: null,
        timestamp: '2024-01-01T10:00:00Z',
        is_read: false
      };

      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [messageWithoutSender],
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });

    it('handles invalid timestamps gracefully', () => {
      const messageWithInvalidTimestamp = {
        id: 1,
        content: 'Hello!',
        sender_id: 2,
        sender_name: 'Jane Smith',
        timestamp: 'invalid-date',
        is_read: false
      };

      require('../../hooks/useChat').useChat.mockReturnValue({
        messages: [messageWithInvalidTimestamp],
        isLoading: false,
        error: null,
        sendMessage: mockSendMessage,
        markAsRead: mockMarkAsRead,
        isTyping: false,
        typingUsers: []
      });

      render(<Chat matchId={1} />);

      expect(screen.getByText('Invalid time')).toBeInTheDocument();
    });
  });
});
