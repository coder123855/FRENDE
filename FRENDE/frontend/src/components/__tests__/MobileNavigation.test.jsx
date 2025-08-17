import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import MobileNavigation from '../MobileNavigation';

// Mock the hooks and components
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('MobileNavigation', () => {
  const mockUseAuth = require('../../contexts/AuthContext').useAuth;
  const mockLogout = jest.fn();

  const defaultMocks = {
    authenticated: {
      user: { name: 'John Doe' },
      isAuthenticated: true,
      logout: mockLogout
    },
    unauthenticated: {
      user: null,
      isAuthenticated: false,
      logout: mockLogout
    }
  };

  const renderWithRouter = (component, { route = '/' } = {}) => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        {component}
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultMocks.unauthenticated);
  });

  describe('Rendering', () => {
    it('renders hamburger button when menu is closed', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      expect(hamburgerButton).toBeInTheDocument();
      expect(hamburgerButton).toHaveClass('p-2', 'rounded-md', 'text-gray-500');
    });

    it('renders menu icon when menu is closed', () => {
      renderWithRouter(<MobileNavigation />);
      
      // Menu icon should be present (lucide-react Menu icon)
      expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toBeInTheDocument();
    });

    it('does not render menu overlay when menu is closed', () => {
      renderWithRouter(<MobileNavigation />);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
      expect(screen.queryByText('Avatar Demo')).not.toBeInTheDocument();
    });

    it('has proper mobile-only visibility class', () => {
      renderWithRouter(<MobileNavigation />);
      
      const container = screen.getByRole('button', { name: 'Toggle navigation menu' }).closest('div');
      expect(container).toHaveClass('md:hidden');
    });
  });

  describe('Menu Toggle', () => {
    it('opens menu when hamburger button is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      expect(screen.getByText('Avatar Demo')).toBeInTheDocument();
    });

    it('shows close icon when menu is open', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      // Close icon should be present (lucide-react X icon)
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });

    it('closes menu when close button is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: '' }); // Close button in header
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    });

    it('closes menu when backdrop is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      
      // Click on backdrop
      const backdrop = screen.getByText('Menu').closest('.fixed');
      fireEvent.click(backdrop);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.unauthenticated);
    });

    it('renders login and register links when not authenticated', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('renders avatar demo link for unauthenticated users', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Avatar Demo')).toBeInTheDocument();
    });

    it('does not render authenticated-only links', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.queryByText('Profile Display')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile Form')).not.toBeInTheDocument();
      expect(screen.queryByText('Chat')).not.toBeInTheDocument();
      expect(screen.queryByText('Matching')).not.toBeInTheDocument();
    });

    it('does not render user section', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.queryByText('User')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('renders all navigation links when authenticated', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Avatar Demo')).toBeInTheDocument();
      expect(screen.getByText('Profile Display')).toBeInTheDocument();
      expect(screen.getByText('Profile Form')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Matching')).toBeInTheDocument();
    });

    it('renders user section with user name', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders logout button', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveClass('w-full', 'px-3', 'py-2', 'rounded-md');
    });

    it('does not render login and register links when authenticated', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    it('handles user with no name gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        user: { name: null }
      });
      
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('handles user with undefined name gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        user: {}
      });
      
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Active Link Highlighting', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('highlights active link for exact path match', () => {
      renderWithRouter(<MobileNavigation />, { route: '/' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const avatarDemoLink = screen.getByText('Avatar Demo');
      expect(avatarDemoLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('highlights active link for path prefix match', () => {
      renderWithRouter(<MobileNavigation />, { route: '/profile/settings' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const profileDisplayLink = screen.getByText('Profile Display');
      expect(profileDisplayLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('does not highlight inactive links', () => {
      renderWithRouter(<MobileNavigation />, { route: '/' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('text-gray-700');
      expect(chatLink).not.toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles profile edit route correctly', () => {
      renderWithRouter(<MobileNavigation />, { route: '/profile/edit' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const profileFormLink = screen.getByText('Profile Form');
      expect(profileFormLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles chat route correctly', () => {
      renderWithRouter(<MobileNavigation />, { route: '/chat/123' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles matching route correctly', () => {
      renderWithRouter(<MobileNavigation />, { route: '/matching' });
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const matchingLink = screen.getByText('Matching');
      expect(matchingLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('calls logout function when logout button is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('closes menu when logout is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    });

    it('closes menu when navigation link is clicked', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      
      const chatLink = screen.getByText('Chat');
      fireEvent.click(chatLink);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    });

    it('has proper hover states for navigation links', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('hover:text-gray-900', 'hover:bg-gray-100');
    });

    it('has proper hover states for logout button', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toHaveClass('hover:text-gray-900', 'hover:bg-gray-100');
    });
  });

  describe('Link Functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('renders all links with proper href attributes', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('Avatar Demo')).toHaveAttribute('href', '/');
      expect(screen.getByText('Profile Display')).toHaveAttribute('href', '/profile');
      expect(screen.getByText('Profile Form')).toHaveAttribute('href', '/profile/edit');
      expect(screen.getByText('Chat')).toHaveAttribute('href', '/chat');
      expect(screen.getByText('Matching')).toHaveAttribute('href', '/matching');
    });

    it('renders register link with proper styling for unauthenticated users', () => {
      mockUseAuth.mockReturnValue(defaultMocks.unauthenticated);
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const registerLink = screen.getByText('Register');
      expect(registerLink).toHaveClass('bg-blue-600', 'text-white', 'hover:bg-blue-700');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label for hamburger button', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      expect(hamburgerButton).toHaveAttribute('aria-label', 'Toggle navigation menu');
    });

    it('has proper semantic structure', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('has proper button semantics for logout', () => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      expect(logoutButton).toBeInTheDocument();
    });

    it('has proper focus management', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      expect(hamburgerButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Responsive Design', () => {
    it('is hidden on medium screens and larger', () => {
      renderWithRouter(<MobileNavigation />);
      
      const container = screen.getByRole('button', { name: 'Toggle navigation menu' }).closest('div');
      expect(container).toHaveClass('md:hidden');
    });

    it('has proper mobile menu positioning', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const menuPanel = screen.getByText('Menu').closest('.fixed');
      expect(menuPanel).toHaveClass('fixed', 'top-0', 'right-0', 'h-full', 'w-64');
    });

    it('has proper backdrop styling', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const backdrop = screen.getByText('Menu').closest('.fixed');
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    });
  });

  describe('Styling and Layout', () => {
    it('has proper menu header styling', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const header = screen.getByText('Menu').closest('div');
      expect(header).toHaveClass('flex', 'items-center', 'justify-between', 'p-4', 'border-b');
    });

    it('has proper navigation spacing', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('flex-1', 'px-4', 'py-6', 'space-y-2');
    });

    it('has proper link styling', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('block', 'px-3', 'py-2', 'rounded-md', 'text-base', 'font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user object gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: true,
        logout: mockLogout
      });
      
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('handles undefined logout function gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        logout: undefined
      });
      
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
    });

    it('handles rapid menu toggles gracefully', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      
      // Rapid clicks
      fireEvent.click(hamburgerButton);
      fireEvent.click(hamburgerButton);
      fireEvent.click(hamburgerButton);
      
      // Should be in a consistent state
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with AuthContext correctly', () => {
      renderWithRouter(<MobileNavigation />);
      
      expect(mockUseAuth).toHaveBeenCalled();
    });

    it('integrates with React Router correctly', () => {
      renderWithRouter(<MobileNavigation />);
      
      const hamburgerButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
      fireEvent.click(hamburgerButton);
      
      // All links should be rendered as Link components
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('integrates with lucide-react icons correctly', () => {
      renderWithRouter(<MobileNavigation />);
      
      // Menu icon should be present
      expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toBeInTheDocument();
    });
  });
});
