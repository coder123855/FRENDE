/**
 * Authentication Security Tests for Frende Frontend
 * Tests authentication component security, token handling, and authentication bypass
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import LoginForm from '../../components/LoginForm';
import RegisterForm from '../../components/RegisterForm';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

// Mock API client
jest.mock('../../lib/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('Authentication Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Login Form Security', () => {
    test('should prevent XSS in login form', async () => {
      const mockLogin = jest.fn();
      require('../../lib/api').login = mockLogin;

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        fireEvent.change(emailInput, { target: { value: payload } });
        fireEvent.change(passwordInput, { target: { value: payload } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should not execute XSS
          expect(screen.queryByText('XSS')).not.toBeInTheDocument();
        });

        // Should call login with sanitized input
        if (mockLogin.mock.calls.length > 0) {
          const lastCall = mockLogin.mock.calls[mockLogin.mock.calls.length - 1];
          const email = lastCall[0]?.email || '';
          const password = lastCall[0]?.password || '';
          
          // Check that XSS payloads are not present in raw form
          expect(email).not.toContain('<script>');
          expect(email).not.toContain('javascript:');
          expect(password).not.toContain('<script>');
          expect(password).not.toContain('javascript:');
        }
      }
    });

    test('should prevent SQL injection in login form', async () => {
      const mockLogin = jest.fn();
      require('../../lib/api').login = mockLogin;

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Test SQL injection payloads
      const sqlInjectionPayloads = [
        "admin'--",
        "admin' OR '1'='1'--",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
      ];

      for (const payload of sqlInjectionPayloads) {
        fireEvent.change(emailInput, { target: { value: payload } });
        fireEvent.change(passwordInput, { target: { value: payload } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should handle gracefully without exposing database errors
          expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
          expect(screen.queryByText(/sql/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should validate email format', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Test invalid email formats
      const invalidEmails = [
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@.com',
        'test@example..com',
        'test@example',
        'test@@example.com',
        'test@example.com.',
        '.test@example.com',
      ];

      for (const invalidEmail of invalidEmails) {
        fireEvent.change(emailInput, { target: { value: invalidEmail } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should show validation error
          expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
        });
      }
    });

    test('should prevent brute force attacks', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      require('../../lib/api').login = mockLogin;

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalledTimes(i + 1);
        });
      }

      // After multiple failed attempts, should show rate limiting message
      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });

      // Submit button should be disabled
      expect(submitButton).toBeDisabled();
    });

    test('should handle authentication errors securely', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Authentication failed'));
      require('../../lib/api').login = mockLogin;

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show generic error message
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        
        // Should not expose sensitive information
        expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/secret/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Register Form Security', () => {
    test('should prevent XSS in register form', async () => {
      const mockRegister = jest.fn();
      require('../../lib/api').register = mockRegister;

      render(
        <BrowserRouter>
          <AuthProvider>
            <RegisterForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        fireEvent.change(nameInput, { target: { value: payload } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should not execute XSS
          expect(screen.queryByText('XSS')).not.toBeInTheDocument();
        });
      }
    });

    test('should validate password strength', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <RegisterForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      // Test weak passwords
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'password123',
      ];

      for (const weakPassword of weakPasswords) {
        fireEvent.change(passwordInput, { target: { value: weakPassword } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should show password strength error
          expect(screen.getByText(/password is too weak/i)).toBeInTheDocument();
        });
      }

      // Test strong password
      fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should not show password strength error
        expect(screen.queryByText(/password is too weak/i)).not.toBeInTheDocument();
      });
    });

    test('should prevent registration with malicious data', async () => {
      const mockRegister = jest.fn();
      require('../../lib/api').register = mockRegister;

      render(
        <BrowserRouter>
          <AuthProvider>
            <RegisterForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      // Test malicious data
      const maliciousData = [
        { name: 'A'.repeat(101), email: 'test@example.com', password: 'SecurePassword123!' }, // Name too long
        { name: 'Test User', email: 'test@example.com', password: 'A'.repeat(129) }, // Password too long
        { name: 'Test User', email: 'test@example.com', password: 'short' }, // Password too short
      ];

      for (const data of maliciousData) {
        fireEvent.change(nameInput, { target: { value: data.name } });
        fireEvent.change(emailInput, { target: { value: data.email } });
        fireEvent.change(passwordInput, { target: { value: data.password } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should show validation error
          expect(screen.getByText(/invalid/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Token Security', () => {
    test('should store tokens securely', () => {
      const mockAuth = {
        login: jest.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
        }),
      };

      // Mock the auth context
      jest.spyOn(require('../../hooks/useAuth'), 'useAuth').mockReturnValue(mockAuth);

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      // Check that tokens are stored in appropriate storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'access_token',
        'test-access-token'
      );
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token',
        'test-refresh-token'
      );
    });

    test('should clear tokens on logout', () => {
      const mockAuth = {
        logout: jest.fn(),
      };

      jest.spyOn(require('../../hooks/useAuth'), 'useAuth').mockReturnValue(mockAuth);

      render(
        <BrowserRouter>
          <AuthProvider>
            <button onClick={mockAuth.logout}>Logout</button>
          </AuthProvider>
        </BrowserRouter>
      );

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // Check that tokens are cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    test('should handle expired tokens', async () => {
      const mockRefreshToken = jest.fn().mockRejectedValue(new Error('Token expired'));
      require('../../lib/api').refreshToken = mockRefreshToken;

      // Set expired token in storage
      localStorageMock.getItem.mockReturnValue('expired-token');

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should redirect to login when token is expired
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    test('should prevent token tampering', () => {
      // Set tampered token in storage
      localStorageMock.getItem.mockReturnValue('tampered.token.here');

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should not render protected content with tampered token
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Protected Route Security', () => {
    test('should redirect unauthenticated users', () => {
      // Mock unauthenticated state
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should not render protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should allow authenticated users', () => {
      // Mock authenticated state
      localStorageMock.getItem.mockReturnValue('valid-token');

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should render protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should handle authentication state changes', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Initially unauthenticated
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Set authenticated state
      localStorageMock.getItem.mockReturnValue('valid-token');

      rerender(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should now render protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Authentication Bypass Prevention', () => {
    test('should prevent direct access to protected routes', () => {
      // Mock unauthenticated state
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should not render protected content even if accessed directly
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should prevent token injection', () => {
      // Mock malicious token
      localStorageMock.getItem.mockReturnValue('malicious-token');

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should not render protected content with malicious token
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle missing authentication context', () => {
      // Render without AuthProvider
      render(
        <BrowserRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </BrowserRouter>
      );

      // Should not render protected content without auth context
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Session Security', () => {
    test('should handle session timeout', async () => {
      // Mock expired session
      const mockAuth = {
        isAuthenticated: false,
        user: null,
      };

      jest.spyOn(require('../../hooks/useAuth'), 'useAuth').mockReturnValue(mockAuth);

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </AuthProvider>
        </BrowserRouter>
      );

      // Should not render protected content with expired session
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('should handle concurrent authentication', () => {
      // Mock multiple authentication attempts
      const mockLogin = jest.fn();
      require('../../lib/api').login = mockLogin;

      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // Simulate rapid clicks
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should handle concurrent requests gracefully
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });
});
