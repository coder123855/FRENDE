import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Chat from '../Chat';
import { performanceUtils, testDataGenerators, performanceAssertions, performanceHelpers } from '../../utils/performance-test-utils';

// Mock the hooks and dependencies
jest.mock('../../hooks/useChat', () => ({
  useChat: jest.fn()
}));

jest.mock('../../hooks/useConversationStarter', () => ({
  useConversationStarter: jest.fn()
}));

jest.mock('../../hooks/useAutomaticGreeting', () => ({
  useAutomaticGreeting: jest.fn()
}));

jest.mock('../../hooks/useTaskChat', () => ({
  useTaskChat: jest.fn()
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../hooks/useOffline.js', () => ({
  useOfflineState: jest.fn()
}));

describe('Chat Component Performance Tests', () => {
  let mockUseChat;
  let mockUseConversationStarter;
  let mockUseAutomaticGreeting;
  let mockUseTaskChat;
  let mockUseAuth;
  let mockUseOfflineState;

  beforeEach(() => {
    // Setup default mock implementations
    mockUseChat = {
      messages: [],
      typingUsers: [],
      onlineUsers: [],
      isConnected: true,
      isLoading: false,
      error: null,
      isOfflineMode: false,
      sendMessage: jest.fn(),
      handleTyping: jest.fn(),
      lastMessageRef: { current: null },
      loadOlderMessages: jest.fn(),
      hasMore: false,
      isLoadingMore: false
    };

    mockUseConversationStarter = {
      conversationStarter: null,
      isLoading: false,
      isCurrentUserStarter: false,
      isExpired: false,
      hasGreetingBeenSent: false,
      timeLeft: null,
      assignConversationStarter: jest.fn(),
      markGreetingSent: jest.fn()
    };

    mockUseAutomaticGreeting = {
      sendManualGreeting: jest.fn(),
      markAutomaticGreetingSent: jest.fn()
    };

    mockUseTaskChat = {
      taskStatus: null,
      isLoading: false,
      error: null,
      submitTaskViaChat: jest.fn(),
      submissionHistory: []
    };

    mockUseAuth = {
      user: { id: 1, name: 'Test User' }
    };

    mockUseOfflineState = {
      isOnline: true
    };

    // Apply mocks
    const { useChat } = require('../../hooks/useChat');
    const { useConversationStarter } = require('../../hooks/useConversationStarter');
    const { useAutomaticGreeting } = require('../../hooks/useAutomaticGreeting');
    const { useTaskChat } = require('../../hooks/useTaskChat');
    const { useAuth } = require('../../hooks/useAuth');
    const { useOfflineState } = require('../../hooks/useOffline.js');

    useChat.mockReturnValue(mockUseChat);
    useConversationStarter.mockReturnValue(mockUseConversationStarter);
    useAutomaticGreeting.mockReturnValue(mockUseAutomaticGreeting);
    useTaskChat.mockReturnValue(mockUseTaskChat);
    useAuth.mockReturnValue(mockUseAuth);
    useOfflineState.mockReturnValue(mockUseOfflineState);
  });

  describe('Render Performance', () => {
    test('should render chat component efficiently with empty message list', async () => {
      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Chat matchId={1} />);
      }, 50);

      console.log('Empty chat render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 50);
    });

    test('should render chat component efficiently with small message list', async () => {
      const smallMessages = testDataGenerators.generateTestMessages(10, 1);
      mockUseChat.messages = smallMessages;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Chat matchId={1} />);
      }, 50);

      console.log('Small message list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 100);
    });

    test('should render chat component efficiently with large message list', async () => {
      const largeMessages = testDataGenerators.generateTestMessages(100, 1);
      mockUseChat.messages = largeMessages;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Chat matchId={1} />);
      }, 20);

      console.log('Large message list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 200);
    });

    test('should render chat component efficiently with very large message list', async () => {
      const veryLargeMessages = testDataGenerators.generateTestMessages(500, 1);
      mockUseChat.messages = veryLargeMessages;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Chat matchId={1} />);
      }, 10);

      console.log('Very large message list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 500);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain reasonable memory usage with large message lists', async () => {
      const initialMemory = performanceUtils.measureMemoryUsage();
      
      const largeMessages = testDataGenerators.generateTestMessages(1000, 1);
      mockUseChat.messages = largeMessages;

      // Render multiple times to simulate user interactions
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Chat matchId={1} />);
        unmount();
      }

      const finalMemory = performanceUtils.measureMemoryUsage();
      
      console.log('Memory usage with large message lists:', {
        initial: initialMemory,
        final: finalMemory,
        increase: initialMemory && finalMemory 
          ? finalMemory.usedMB - initialMemory.usedMB 
          : 'Not available'
      });

      performanceAssertions.assertMemoryUsage(initialMemory, finalMemory, 100);
    });

    test('should handle memory efficiently during message updates', async () => {
      const initialMemory = performanceUtils.measureMemoryUsage();
      
      const { rerender } = render(<Chat matchId={1} />);

      // Simulate multiple message updates
      for (let i = 0; i < 50; i++) {
        const messages = testDataGenerators.generateTestMessages(100 + i, 1);
        mockUseChat.messages = messages;
        
        rerender(<Chat matchId={1} />);
        
        // Small delay to simulate real usage
        await performanceHelpers.wait(10);
      }

      const finalMemory = performanceUtils.measureMemoryUsage();
      
      console.log('Memory usage during message updates:', {
        initial: initialMemory,
        final: finalMemory,
        increase: initialMemory && finalMemory 
          ? finalMemory.usedMB - initialMemory.usedMB 
          : 'Not available'
      });

      performanceAssertions.assertMemoryUsage(initialMemory, finalMemory, 50);
    });
  });

  describe('User Interaction Performance', () => {
    test('should handle message input efficiently', async () => {
      const { getByPlaceholderText } = render(<Chat matchId={1} />);
      const input = getByPlaceholderText('Type a message...');

      const inputMetrics = performanceUtils.measureExecutionTime(() => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      }, 100);

      console.log('Message input performance:', inputMetrics);
      expect(inputMetrics.average).toBeLessThan(10);
    });

    test('should handle message sending efficiently', async () => {
      const { getByPlaceholderText, getByRole } = render(<Chat matchId={1} />);
      const input = getByPlaceholderText('Type a message...');
      const sendButton = getByRole('button', { name: /send/i });

      const sendMetrics = performanceUtils.measureExecutionTime(() => {
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
      }, 50);

      console.log('Message sending performance:', sendMetrics);
      expect(sendMetrics.average).toBeLessThan(20);
    });

    test('should handle typing indicators efficiently', async () => {
      const { getByPlaceholderText } = render(<Chat matchId={1} />);
      const input = getByPlaceholderText('Type a message...');

      const typingMetrics = performanceUtils.measureExecutionTime(() => {
        fireEvent.keyDown(input, { key: 'a' });
      }, 100);

      console.log('Typing indicator performance:', typingMetrics);
      expect(typingMetrics.average).toBeLessThan(5);
    });
  });

  describe('Real-time Update Performance', () => {
    test('should handle new message updates efficiently', async () => {
      const { rerender } = render(<Chat matchId={1} />);

      const updateMetrics = performanceUtils.measureExecutionTime(() => {
        const newMessages = testDataGenerators.generateTestMessages(1, 1);
        mockUseChat.messages = newMessages;
        rerender(<Chat matchId={1} />);
      }, 50);

      console.log('New message update performance:', updateMetrics);
      expect(updateMetrics.average).toBeLessThan(50);
    });

    test('should handle typing indicator updates efficiently', async () => {
      const { rerender } = render(<Chat matchId={1} />);

      const typingUpdateMetrics = performanceUtils.measureExecutionTime(() => {
        mockUseChat.typingUsers = [{ id: 2, name: 'Other User' }];
        rerender(<Chat matchId={1} />);
      }, 50);

      console.log('Typing indicator update performance:', typingUpdateMetrics);
      expect(typingUpdateMetrics.average).toBeLessThan(30);
    });

    test('should handle online status updates efficiently', async () => {
      const { rerender } = render(<Chat matchId={1} />);

      const onlineUpdateMetrics = performanceUtils.measureExecutionTime(() => {
        mockUseChat.onlineUsers = [{ id: 2, name: 'Other User' }];
        rerender(<Chat matchId={1} />);
      }, 50);

      console.log('Online status update performance:', onlineUpdateMetrics);
      expect(onlineUpdateMetrics.average).toBeLessThan(30);
    });
  });

  describe('Scrolling Performance', () => {
    test('should handle scroll to bottom efficiently', async () => {
      const largeMessages = testDataGenerators.generateTestMessages(200, 1);
      mockUseChat.messages = largeMessages;

      const { container } = render(<Chat matchId={1} />);
      const chatContainer = container.querySelector('.chat-messages');

      if (chatContainer) {
        const scrollMetrics = performanceUtils.measureExecutionTime(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 50);

        console.log('Scroll to bottom performance:', scrollMetrics);
        expect(scrollMetrics.average).toBeLessThan(10);
      }
    });

    test('should handle load more messages efficiently', async () => {
      mockUseChat.hasMore = true;
      mockUseChat.loadOlderMessages = jest.fn();

      const { getByText } = render(<Chat matchId={1} />);
      const loadMoreButton = getByText(/load more/i);

      if (loadMoreButton) {
        const loadMoreMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(loadMoreButton);
        }, 20);

        console.log('Load more messages performance:', loadMoreMetrics);
        expect(loadMoreMetrics.average).toBeLessThan(50);
      }
    });
  });

  describe('Component Lifecycle Performance', () => {
    test('should mount and unmount efficiently', async () => {
      const lifecycleMetrics = performanceUtils.measureExecutionTime(() => {
        const { unmount } = render(<Chat matchId={1} />);
        unmount();
      }, 50);

      console.log('Component lifecycle performance:', lifecycleMetrics);
      expect(lifecycleMetrics.average).toBeLessThan(100);
    });

    test('should handle prop changes efficiently', async () => {
      const { rerender } = render(<Chat matchId={1} />);

      const propChangeMetrics = performanceUtils.measureExecutionTime(() => {
        rerender(<Chat matchId={2} />);
      }, 50);

      console.log('Prop change performance:', propChangeMetrics);
      expect(propChangeMetrics.average).toBeLessThan(50);
    });
  });

  describe('Integration Performance', () => {
    test('should handle complete chat workflow efficiently', async () => {
      const workflowTest = performanceHelpers.createPerformanceTest(async () => {
        const { getByPlaceholderText, getByRole, rerender } = render(<Chat matchId={1} />);
        const input = getByPlaceholderText('Type a message...');
        const sendButton = getByRole('button', { name: /send/i });

        // Simulate typing
        fireEvent.change(input, { target: { value: 'Hello, how are you?' } });
        
        // Simulate sending
        fireEvent.click(sendButton);
        
        // Simulate receiving response
        const newMessages = testDataGenerators.generateTestMessages(2, 1);
        mockUseChat.messages = newMessages;
        rerender(<Chat matchId={1} />);
        
        // Simulate typing indicator
        mockUseChat.typingUsers = [{ id: 2, name: 'Other User' }];
        rerender(<Chat matchId={1} />);
        
        // Wait for next frame
        await performanceHelpers.waitForNextFrame();
      }, { maxExecutionTime: 200, maxMemoryIncrease: 20 });

      await workflowTest();
    });
  });
});
