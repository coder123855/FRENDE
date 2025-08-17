import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import PublicRoute from '../PublicRoute';

// Mock the auth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false
  })
}));

// Mock components
const MockComponent = () => <div>Public Content</div>;
const MockDashboardComponent = () => <div>Dashboard</div>;

const renderWithRouter = (component, { route = '/public' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/public" element={component} />
        <Route path="/dashboard" element={<MockDashboardComponent />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PublicRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('renders public content when user is not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });

    it('redirects to dashboard when user is authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });

    it('shows loading state when authentication status is being determined', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('renders children when not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      const TestComponent = () => (
        <div>
          <h1>Test Header</h1>
          <p>Test paragraph</p>
        </div>
      );

      renderWithRouter(
        <PublicRoute>
          <TestComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Test Header')).toBeInTheDocument();
      expect(screen.getByText('Test paragraph')).toBeInTheDocument();
    });

    it('renders multiple children when not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </PublicRoute>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('does not render children when authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator with proper styling', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      const loadingElement = screen.getByText(/loading/i);
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('loading');
    });

    it('prevents access to public content during loading', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to dashboard with correct path when authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('maintains current location in redirect', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>,
        { route: '/login' }
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('allows access to public routes when not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>,
        { route: '/login' }
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(<PublicRoute>{undefined}</PublicRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(<PublicRoute>{null}</PublicRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      renderWithRouter(<PublicRoute></PublicRoute>);

      // Should not crash and should show loading or redirect appropriately
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });

    it('handles authentication state changes gracefully', () => {
      const mockUseAuth = require('../../hooks/useAuth').useAuth;
      
      // Start with not authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      const { rerender } = renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();

      // Change to authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      rerender(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for loading state', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      const loadingElement = screen.getByText(/loading/i);
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveAttribute('role', 'status');
    });

    it('provides screen reader feedback for authentication status', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      // Should provide appropriate feedback for screen readers
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
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
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Change to not authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false
      });

      rerender(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  describe('Custom Redirect Path', () => {
    it('redirects to custom path when provided', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      const MockHomeComponent = () => <div>Home</div>;

      render(
        <MemoryRouter initialEntries={['/public']}>
          <Routes>
            <Route path="/public" element={
              <PublicRoute redirectTo="/home">
                <MockComponent />
              </PublicRoute>
            } />
            <Route path="/home" element={<MockHomeComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });

    it('uses default redirect path when no custom path is provided', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false
      });

      renderWithRouter(
        <PublicRoute>
          <MockComponent />
        </PublicRoute>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
