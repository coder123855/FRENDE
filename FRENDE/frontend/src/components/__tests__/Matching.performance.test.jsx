import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import Matching from '../Matching';
import { performanceUtils, testDataGenerators, performanceAssertions, performanceHelpers } from '../../utils/performance-test-utils';

// Mock the hooks and dependencies
jest.mock('../../hooks/useMatches', () => ({
  useMatches: jest.fn()
}));

jest.mock('../../hooks/useCompatibleUsers', () => ({
  useCompatibleUsers: jest.fn()
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../hooks/useSocket', () => ({
  useSocket: jest.fn()
}));

describe('Matching Component Performance Tests', () => {
  let mockUseMatches;
  let mockUseCompatibleUsers;
  let mockUseAuth;
  let mockUseSocket;

  beforeEach(() => {
    // Setup default mock implementations
    mockUseMatches = {
      matches: [],
      pendingMatches: [],
      activeMatches: [],
      expiredMatches: [],
      loading: false,
      error: null,
      selectedStatus: 'all',
      acceptMatch: jest.fn(),
      rejectMatch: jest.fn(),
      setSelectedStatus: jest.fn()
    };

    mockUseCompatibleUsers = {
      compatibleUsers: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      removeUser: jest.fn()
    };

    mockUseAuth = {
      user: { id: 1, name: 'Test User' }
    };

    mockUseSocket = {
      isConnected: true,
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Apply mocks
    const { useMatches } = require('../../hooks/useMatches');
    const { useCompatibleUsers } = require('../../hooks/useCompatibleUsers');
    const { useAuth } = require('../../hooks/useAuth');
    const { useSocket } = require('../../hooks/useSocket');

    useMatches.mockReturnValue(mockUseMatches);
    useCompatibleUsers.mockReturnValue(mockUseCompatibleUsers);
    useAuth.mockReturnValue(mockUseAuth);
    useSocket.mockReturnValue(mockUseSocket);
  });

  describe('Render Performance', () => {
    test('should render matching component efficiently with empty user list', async () => {
      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Matching />);
      }, 50);

      console.log('Empty matching render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 50);
    });

    test('should render matching component efficiently with small user list', async () => {
      const smallUsers = testDataGenerators.generateTestUsers(10);
      mockUseCompatibleUsers.compatibleUsers = smallUsers;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Matching />);
      }, 50);

      console.log('Small user list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 100);
    });

    test('should render matching component efficiently with large user list', async () => {
      const largeUsers = testDataGenerators.generateTestUsers(100);
      mockUseCompatibleUsers.compatibleUsers = largeUsers;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Matching />);
      }, 20);

      console.log('Large user list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 300);
    });

    test('should render matching component efficiently with very large user list', async () => {
      const veryLargeUsers = testDataGenerators.generateTestUsers(500);
      mockUseCompatibleUsers.compatibleUsers = veryLargeUsers;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Matching />);
      }, 10);

      console.log('Very large user list render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 800);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain reasonable memory usage with large user lists', async () => {
      const initialMemory = performanceUtils.measureMemoryUsage();
      
      const largeUsers = testDataGenerators.generateTestUsers(1000);
      mockUseCompatibleUsers.compatibleUsers = largeUsers;

      // Render multiple times to simulate user interactions
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Matching />);
        unmount();
      }

      const finalMemory = performanceUtils.measureMemoryUsage();
      
      console.log('Memory usage with large user lists:', {
        initial: initialMemory,
        final: finalMemory,
        increase: initialMemory && finalMemory 
          ? finalMemory.usedMB - initialMemory.usedMB 
          : 'Not available'
      });

      performanceAssertions.assertMemoryUsage(initialMemory, finalMemory, 100);
    });

    test('should handle memory efficiently during user list updates', async () => {
      const initialMemory = performanceUtils.measureMemoryUsage();
      
      const { rerender } = render(<Matching />);

      // Simulate multiple user list updates
      for (let i = 0; i < 50; i++) {
        const users = testDataGenerators.generateTestUsers(100 + i);
        mockUseCompatibleUsers.compatibleUsers = users;
        
        rerender(<Matching />);
        
        // Small delay to simulate real usage
        await performanceHelpers.wait(10);
      }

      const finalMemory = performanceUtils.measureMemoryUsage();
      
      console.log('Memory usage during user list updates:', {
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
    test('should handle user card clicks efficiently', async () => {
      const users = testDataGenerators.generateTestUsers(10);
      mockUseCompatibleUsers.compatibleUsers = users;

      const { getAllByTestId } = render(<Matching />);
      const userCards = getAllByTestId('user-card');

      if (userCards.length > 0) {
        const clickMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(userCards[0]);
        }, 100);

        console.log('User card click performance:', clickMetrics);
        expect(clickMetrics.average).toBeLessThan(10);
      }
    });

    test('should handle send request efficiently', async () => {
      const users = testDataGenerators.generateTestUsers(10);
      mockUseCompatibleUsers.compatibleUsers = users;

      const { getAllByText } = render(<Matching />);
      const sendButtons = getAllByText(/send request/i);

      if (sendButtons.length > 0) {
        const sendMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(sendButtons[0]);
        }, 50);

        console.log('Send request performance:', sendMetrics);
        expect(sendMetrics.average).toBeLessThan(20);
      }
    });

    test('should handle status filter changes efficiently', async () => {
      const { getByRole } = render(<Matching />);
      const statusSelect = getByRole('combobox');

      if (statusSelect) {
        const filterMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.change(statusSelect, { target: { value: 'active' } });
        }, 100);

        console.log('Status filter change performance:', filterMetrics);
        expect(filterMetrics.average).toBeLessThan(10);
      }
    });

    test('should handle load more efficiently', async () => {
      mockUseCompatibleUsers.hasMore = true;
      mockUseCompatibleUsers.loadMore = jest.fn();

      const { getByText } = render(<Matching />);
      const loadMoreButton = getByText(/load more/i);

      if (loadMoreButton) {
        const loadMoreMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(loadMoreButton);
        }, 50);

        console.log('Load more performance:', loadMoreMetrics);
        expect(loadMoreMetrics.average).toBeLessThan(20);
      }
    });
  });

  describe('Compatibility Calculation Performance', () => {
    test('should handle compatibility badge rendering efficiently', async () => {
      const users = testDataGenerators.generateTestUsers(100);
      mockUseCompatibleUsers.compatibleUsers = users;

      const renderMetrics = performanceUtils.measureRenderTime(() => {
        render(<Matching />);
      }, 20);

      console.log('Compatibility badge render performance:', renderMetrics);
      performanceAssertions.assertRenderTime(renderMetrics, 300);
    });

    test('should handle compatibility score updates efficiently', async () => {
      const { rerender } = render(<Matching />);

      const updateMetrics = performanceUtils.measureExecutionTime(() => {
        const users = testDataGenerators.generateTestUsers(50);
        // Update compatibility scores
        users.forEach(user => {
          user.compatibility_score = Math.floor(Math.random() * 40) + 60;
        });
        mockUseCompatibleUsers.compatibleUsers = users;
        rerender(<Matching />);
      }, 50);

      console.log('Compatibility score update performance:', updateMetrics);
      expect(updateMetrics.average).toBeLessThan(100);
    });
  });

  describe('Real-time Update Performance', () => {
    test('should handle new user updates efficiently', async () => {
      const { rerender } = render(<Matching />);

      const updateMetrics = performanceUtils.measureExecutionTime(() => {
        const newUsers = testDataGenerators.generateTestUsers(1);
        mockUseCompatibleUsers.compatibleUsers = newUsers;
        rerender(<Matching />);
      }, 50);

      console.log('New user update performance:', updateMetrics);
      expect(updateMetrics.average).toBeLessThan(50);
    });

    test('should handle user removal efficiently', async () => {
      const users = testDataGenerators.generateTestUsers(50);
      mockUseCompatibleUsers.compatibleUsers = users;

      const { rerender } = render(<Matching />);

      const removalMetrics = performanceUtils.measureExecutionTime(() => {
        const remainingUsers = users.slice(1); // Remove first user
        mockUseCompatibleUsers.compatibleUsers = remainingUsers;
        rerender(<Matching />);
      }, 50);

      console.log('User removal performance:', removalMetrics);
      expect(removalMetrics.average).toBeLessThan(50);
    });

    test('should handle loading state changes efficiently', async () => {
      const { rerender } = render(<Matching />);

      const loadingMetrics = performanceUtils.measureExecutionTime(() => {
        mockUseCompatibleUsers.loading = true;
        rerender(<Matching />);
      }, 50);

      console.log('Loading state change performance:', loadingMetrics);
      expect(loadingMetrics.average).toBeLessThan(20);
    });
  });

  describe('Scrolling Performance', () => {
    test('should handle scroll through user list efficiently', async () => {
      const largeUsers = testDataGenerators.generateTestUsers(200);
      mockUseCompatibleUsers.compatibleUsers = largeUsers;

      const { container } = render(<Matching />);
      const userList = container.querySelector('.user-list');

      if (userList) {
        const scrollMetrics = performanceUtils.measureExecutionTime(() => {
          userList.scrollTop = userList.scrollHeight;
        }, 50);

        console.log('User list scroll performance:', scrollMetrics);
        expect(scrollMetrics.average).toBeLessThan(10);
      }
    });

    test('should handle infinite scroll efficiently', async () => {
      mockUseCompatibleUsers.hasMore = true;
      mockUseCompatibleUsers.loadMore = jest.fn();

      const { container } = render(<Matching />);
      const userList = container.querySelector('.user-list');

      if (userList) {
        const infiniteScrollMetrics = performanceUtils.measureExecutionTime(() => {
          // Simulate scroll to bottom
          userList.scrollTop = userList.scrollHeight;
          // Trigger load more
          mockUseCompatibleUsers.loadMore();
        }, 20);

        console.log('Infinite scroll performance:', infiniteScrollMetrics);
        expect(infiniteScrollMetrics.average).toBeLessThan(50);
      }
    });
  });

  describe('Component Lifecycle Performance', () => {
    test('should mount and unmount efficiently', async () => {
      const lifecycleMetrics = performanceUtils.measureExecutionTime(() => {
        const { unmount } = render(<Matching />);
        unmount();
      }, 50);

      console.log('Component lifecycle performance:', lifecycleMetrics);
      expect(lifecycleMetrics.average).toBeLessThan(100);
    });

    test('should handle prop changes efficiently', async () => {
      const { rerender } = render(<Matching />);

      const propChangeMetrics = performanceUtils.measureExecutionTime(() => {
        rerender(<Matching key="changed" />);
      }, 50);

      console.log('Prop change performance:', propChangeMetrics);
      expect(propChangeMetrics.average).toBeLessThan(50);
    });
  });

  describe('Match Management Performance', () => {
    test('should handle match acceptance efficiently', async () => {
      const matches = testDataGenerators.generateTestMatches(10);
      mockUseMatches.pendingMatches = matches;

      const { getAllByText } = render(<Matching />);
      const acceptButtons = getAllByText(/accept/i);

      if (acceptButtons.length > 0) {
        const acceptMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(acceptButtons[0]);
        }, 50);

        console.log('Match acceptance performance:', acceptMetrics);
        expect(acceptMetrics.average).toBeLessThan(20);
      }
    });

    test('should handle match rejection efficiently', async () => {
      const matches = testDataGenerators.generateTestMatches(10);
      mockUseMatches.pendingMatches = matches;

      const { getAllByText } = render(<Matching />);
      const rejectButtons = getAllByText(/reject/i);

      if (rejectButtons.length > 0) {
        const rejectMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.click(rejectButtons[0]);
        }, 50);

        console.log('Match rejection performance:', rejectMetrics);
        expect(rejectMetrics.average).toBeLessThan(20);
      }
    });

    test('should handle match status filtering efficiently', async () => {
      const { getByRole } = render(<Matching />);
      const statusSelect = getByRole('combobox');

      if (statusSelect) {
        const filterMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.change(statusSelect, { target: { value: 'pending' } });
        }, 100);

        console.log('Match status filter performance:', filterMetrics);
        expect(filterMetrics.average).toBeLessThan(10);
      }
    });
  });

  describe('Integration Performance', () => {
    test('should handle complete matching workflow efficiently', async () => {
      const workflowTest = performanceHelpers.createPerformanceTest(async () => {
        const { getAllByText, getByRole, rerender } = render(<Matching />);
        
        // Simulate loading users
        const users = testDataGenerators.generateTestUsers(50);
        mockUseCompatibleUsers.compatibleUsers = users;
        rerender(<Matching />);
        
        // Simulate sending request
        const sendButtons = getAllByText(/send request/i);
        if (sendButtons.length > 0) {
          fireEvent.click(sendButtons[0]);
        }
        
        // Simulate status filter change
        const statusSelect = getByRole('combobox');
        if (statusSelect) {
          fireEvent.change(statusSelect, { target: { value: 'pending' } });
        }
        
        // Simulate match acceptance
        const matches = testDataGenerators.generateTestMatches(5);
        mockUseMatches.pendingMatches = matches;
        rerender(<Matching />);
        
        const acceptButtons = getAllByText(/accept/i);
        if (acceptButtons.length > 0) {
          fireEvent.click(acceptButtons[0]);
        }
        
        // Wait for next frame
        await performanceHelpers.waitForNextFrame();
      }, { maxExecutionTime: 300, maxMemoryIncrease: 30 });

      await workflowTest();
    });
  });

  describe('Search and Filter Performance', () => {
    test('should handle search functionality efficiently', async () => {
      const { getByPlaceholderText } = render(<Matching />);
      const searchInput = getByPlaceholderText(/search/i);

      if (searchInput) {
        const searchMetrics = performanceUtils.measureExecutionTime(() => {
          fireEvent.change(searchInput, { target: { value: 'test' } });
        }, 100);

        console.log('Search performance:', searchMetrics);
        expect(searchMetrics.average).toBeLessThan(10);
      }
    });

    test('should handle multiple filter changes efficiently', async () => {
      const { getByRole } = render(<Matching />);
      const filterSelect = getByRole('combobox');

      if (filterSelect) {
        const filterMetrics = performanceUtils.measureExecutionTime(() => {
          // Simulate multiple filter changes
          fireEvent.change(filterSelect, { target: { value: 'community' } });
          fireEvent.change(filterSelect, { target: { value: 'location' } });
          fireEvent.change(filterSelect, { target: { value: 'age' } });
        }, 50);

        console.log('Multiple filter changes performance:', filterMetrics);
        expect(filterMetrics.average).toBeLessThan(30);
      }
    });
  });
});
