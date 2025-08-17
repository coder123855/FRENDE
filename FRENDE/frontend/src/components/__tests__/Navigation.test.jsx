import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Navigation from '../Navigation';

// Mock the hooks and components
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../MobileNavigation', () => {
  return function MockMobileNavigation() {
    return <div data-testid="mobile-navigation">Mobile Navigation</div>;
  };
});

describe('Navigation', () => {
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
    it('renders the app title', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Frende Demo')).toBeInTheDocument();
      expect(screen.getByText('Frende Demo')).toHaveClass('text-xl', 'font-semibold', 'text-gray-900');
    });

    it('renders mobile navigation component', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });

    it('has proper navigation structure', () => {
      renderWithRouter(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('bg-white', 'shadow-sm', 'border-b');
    });
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.unauthenticated);
    });

    it('renders login and register links when not authenticated', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('renders avatar demo link for unauthenticated users', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Avatar Demo')).toBeInTheDocument();
    });

    it('does not render authenticated-only links', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.queryByText('Profile Display')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile Form')).not.toBeInTheDocument();
      expect(screen.queryByText('Chat')).not.toBeInTheDocument();
      expect(screen.queryByText('Matching')).not.toBeInTheDocument();
      expect(screen.queryByText('Accessibility')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('does not render user profile section', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.queryByText('User')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('renders all navigation links when authenticated', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Avatar Demo')).toBeInTheDocument();
      expect(screen.getByText('Profile Display')).toBeInTheDocument();
      expect(screen.getByText('Profile Form')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Matching')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
    });

    it('renders user profile section with user name', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders logout button', () => {
      renderWithRouter(<Navigation />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium');
    });

    it('does not render login and register links when authenticated', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    it('handles user with no name gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        user: { name: null }
      });
      
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('handles user with undefined name gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        user: {}
      });
      
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Active Link Highlighting', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('highlights active link for exact path match', () => {
      renderWithRouter(<Navigation />, { route: '/' });
      
      const avatarDemoLink = screen.getByText('Avatar Demo');
      expect(avatarDemoLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('highlights active link for path prefix match', () => {
      renderWithRouter(<Navigation />, { route: '/profile/settings' });
      
      const profileDisplayLink = screen.getByText('Profile Display');
      expect(profileDisplayLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('does not highlight inactive links', () => {
      renderWithRouter(<Navigation />, { route: '/' });
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('text-gray-500');
      expect(chatLink).not.toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles profile edit route correctly', () => {
      renderWithRouter(<Navigation />, { route: '/profile/edit' });
      
      const profileFormLink = screen.getByText('Profile Form');
      expect(profileFormLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles chat route correctly', () => {
      renderWithRouter(<Navigation />, { route: '/chat/123' });
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles matching route correctly', () => {
      renderWithRouter(<Navigation />, { route: '/matching' });
      
      const matchingLink = screen.getByText('Matching');
      expect(matchingLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles accessibility route correctly', () => {
      renderWithRouter(<Navigation />, { route: '/accessibility' });
      
      const accessibilityLink = screen.getByText('Accessibility');
      expect(accessibilityLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('calls logout function when logout button is clicked', () => {
      renderWithRouter(<Navigation />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('has proper hover states for navigation links', () => {
      renderWithRouter(<Navigation />);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('hover:text-gray-700');
    });

    it('has proper hover states for logout button', () => {
      renderWithRouter(<Navigation />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toHaveClass('hover:text-gray-700', 'hover:bg-gray-100');
    });
  });

  describe('Link Functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('renders all links with proper href attributes', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('Avatar Demo')).toHaveAttribute('href', '/');
      expect(screen.getByText('Profile Display')).toHaveAttribute('href', '/profile');
      expect(screen.getByText('Profile Form')).toHaveAttribute('href', '/profile/edit');
      expect(screen.getByText('Chat')).toHaveAttribute('href', '/chat');
      expect(screen.getByText('Matching')).toHaveAttribute('href', '/matching');
      expect(screen.getByText('Accessibility')).toHaveAttribute('href', '/accessibility');
    });

    it('renders register link with proper styling', () => {
      mockUseAuth.mockReturnValue(defaultMocks.unauthenticated);
      renderWithRouter(<Navigation />);
      
      const registerLink = screen.getByText('Register');
      expect(registerLink).toHaveClass('bg-blue-600', 'text-white', 'hover:bg-blue-700');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('has proper ARIA label for accessibility link', () => {
      renderWithRouter(<Navigation />);
      
      const accessibilityLink = screen.getByText('Accessibility');
      expect(accessibilityLink).toHaveAttribute('aria-label', 'Accessibility settings');
    });

    it('has proper semantic structure', () => {
      renderWithRouter(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('has proper button semantics for logout', () => {
      renderWithRouter(<Navigation />);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('hides desktop navigation on mobile', () => {
      renderWithRouter(<Navigation />);
      
      const desktopNav = screen.getByText('Avatar Demo').closest('div');
      expect(desktopNav).toHaveClass('hidden', 'md:flex');
    });

    it('has proper responsive container', () => {
      renderWithRouter(<Navigation />);
      
      const container = screen.getByText('Frende Demo').closest('div');
      expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });

    it('has proper responsive height', () => {
      renderWithRouter(<Navigation />);
      
      const navContainer = screen.getByText('Frende Demo').closest('div');
      expect(navContainer).toHaveClass('h-16');
    });
  });

  describe('Styling and Layout', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(defaultMocks.authenticated);
    });

    it('has proper spacing between navigation items', () => {
      renderWithRouter(<Navigation />);
      
      const navItems = screen.getByText('Avatar Demo').closest('div');
      expect(navItems).toHaveClass('space-x-4');
    });

    it('has proper user profile section styling', () => {
      renderWithRouter(<Navigation />);
      
      const userSection = screen.getByText('John Doe').closest('div');
      expect(userSection).toHaveClass('ml-4', 'pl-4', 'border-l', 'border-gray-300');
    });

    it('has proper link styling', () => {
      renderWithRouter(<Navigation />);
      
      const chatLink = screen.getByText('Chat');
      expect(chatLink).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user object gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: true,
        logout: mockLogout
      });
      
      renderWithRouter(<Navigation />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('handles undefined logout function gracefully', () => {
      mockUseAuth.mockReturnValue({
        ...defaultMocks.authenticated,
        logout: undefined
      });
      
      renderWithRouter(<Navigation />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with AuthContext correctly', () => {
      renderWithRouter(<Navigation />);
      
      expect(mockUseAuth).toHaveBeenCalled();
    });

    it('integrates with React Router correctly', () => {
      renderWithRouter(<Navigation />);
      
      // All links should be rendered as Link components
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('integrates with MobileNavigation component', () => {
      renderWithRouter(<Navigation />);
      
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });
  });
});
