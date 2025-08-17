import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for Jest environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock import.meta for Jest environment
global.import = {
  meta: {
    env: {
      VITE_TOKEN_ENCRYPTION_KEY: 'test-encryption-key',
      VITE_API_BASE_URL: 'http://localhost:8000',
      VITE_SOCKET_URL: 'ws://localhost:8000',
      NODE_ENV: 'test'
    }
  }
};

// Mock React hooks with default implementations
jest.mock('./hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null
  }))
}));

jest.mock('./hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(() => ({
    profile: null,
    isLoading: false,
    error: null,
    updateProfile: jest.fn(),
    uploadImage: jest.fn()
  }))
}));

jest.mock('./hooks/useChat', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    markAsRead: jest.fn()
  }))
}));

jest.mock('./hooks/useSocket', () => ({
  useSocket: jest.fn(() => ({
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}; 