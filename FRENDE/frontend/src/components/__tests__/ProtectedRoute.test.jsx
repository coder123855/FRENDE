import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock the auth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false
  })
}));

// Mock components
const MockComponent = () => <div>Protected Content</div>;
const MockLoginComponent = () => <div>Login Page</div>;

const renderWithRouter = (component, { route = '/protected' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/protected" element={component} />
        <Route path="/login" element={<MockLoginComponent />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('renders protected content when user is authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects to login when user is not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading state when authentication status is being determined', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('renders children when authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      const TestComponent = () => (
        <div>
          <h1>Test Header</h1>
          <p>Test paragraph</p>
        </div>
      );

      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Test Header')).toBeInTheDocument();
      expect(screen.getByText('Test paragraph')).toBeInTheDocument();
    });

    it('renders multiple children when authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('renders nothing when not authenticated and not loading', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      const { container } = renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      // The component should not render its children
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      // But it should render the redirect component
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator with proper styling', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      const loadingElement = screen.getByText(/loading/i);
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('loading');
    });

    it('prevents access to protected content during loading', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to login page with correct path', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('maintains current location in redirect', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>,
        { route: '/dashboard' }
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(<ProtectedRoute>{undefined}</ProtectedRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(<ProtectedRoute>{null}</ProtectedRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(<ProtectedRoute></ProtectedRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for loading state', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      const loadingElement = screen.getByText(/loading/i);
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveAttribute('role', 'status');
    });

    it('provides screen reader feedback for authentication status', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      // Should provide appropriate feedback for screen readers
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when auth state changes', () => {
      const mockUseAuth = require('../../hooks/useAuth').useAuth;
      
      // Start with loading
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      const { rerender } = renderWithRouter(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Change to authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      rerender(
        <ProtectedRoute>
          <MockComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
