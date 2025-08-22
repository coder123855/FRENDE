import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PWAInstallPrompt from '../PWAInstallPrompt';

// Mock pwaUtils
jest.mock('../../utils/pwaUtils', () => ({
  canInstall: true,
  notificationSupported: true,
  backgroundSyncSupported: true,
  pushSupported: true,
  showInstallPrompt: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders install prompt when PWA can be installed', () => {
    render(<PWAInstallPrompt />);
    
    expect(screen.getByText('Install Frende')).toBeInTheDocument();
    expect(screen.getByText('Install App')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  it('shows PWA features when available', () => {
    render(<PWAInstallPrompt />);
    
    expect(screen.getByText('Install to home screen')).toBeInTheDocument();
    expect(screen.getByText('Push notifications')).toBeInTheDocument();
    expect(screen.getByText('Background sync')).toBeInTheDocument();
    expect(screen.getByText('Offline support')).toBeInTheDocument();
  });

  it('handles install button click', async () => {
    const mockShowInstallPrompt = jest.fn();
    require('../../utils/pwaUtils').showInstallPrompt = mockShowInstallPrompt;
    
    render(<PWAInstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);
    
    await waitFor(() => {
      expect(mockShowInstallPrompt).toHaveBeenCalled();
    });
  });

  it('handles dismiss button click', () => {
    render(<PWAInstallPrompt />);
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(dismissButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'pwa_install_dismissed',
      expect.any(String)
    );
  });

  it('handles remind later button click', () => {
    render(<PWAInstallPrompt />);
    
    const laterButton = screen.getByText('Later');
    fireEvent.click(laterButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'pwa_install_remind',
      expect.any(String)
    );
  });

  it('does not show when recently dismissed', () => {
    const dismissedTime = Date.now().toString();
    localStorageMock.getItem.mockReturnValue(dismissedTime);
    
    render(<PWAInstallPrompt />);
    
    expect(screen.queryByText('Install Frende')).not.toBeInTheDocument();
  });

  it('does not show when remind time is in future', () => {
    const remindTime = (Date.now() + 24 * 60 * 60 * 1000).toString();
    localStorageMock.getItem.mockReturnValue(remindTime);
    
    render(<PWAInstallPrompt />);
    
    expect(screen.queryByText('Install Frende')).not.toBeInTheDocument();
  });

  it('does not show when app is already installed', () => {
    // Mock matchMedia to simulate installed app
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    
    render(<PWAInstallPrompt />);
    
    expect(screen.queryByText('Install Frende')).not.toBeInTheDocument();
  });

  it('shows loading state during installation', async () => {
    const mockShowInstallPrompt = jest.fn(() => new Promise(() => {})); // Never resolves
    require('../../utils/pwaUtils').showInstallPrompt = mockShowInstallPrompt;
    
    render(<PWAInstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);
    
    await waitFor(() => {
      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });
  });

  it('handles beforeinstallprompt event', () => {
    render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt');
    event.preventDefault = jest.fn();
    window.dispatchEvent(event);
    
    // The component should handle the event and show the prompt
    expect(screen.getByText('Install Frende')).toBeInTheDocument();
  });

  it('handles appinstalled event', () => {
    render(<PWAInstallPrompt />);
    
    // Simulate appinstalled event
    const event = new Event('appinstalled');
    window.dispatchEvent(event);
    
    // The component should hide the prompt
    expect(screen.queryByText('Install Frende')).not.toBeInTheDocument();
  });

  it('updates features when PWA capabilities change', () => {
    // Mock pwaUtils with limited features
    jest.doMock('../../utils/pwaUtils', () => ({
      canInstall: false,
      notificationSupported: false,
      backgroundSyncSupported: false,
      pushSupported: false,
      showInstallPrompt: jest.fn(),
    }));
    
    render(<PWAInstallPrompt />);
    
    // Should not show install prompt when canInstall is false
    expect(screen.queryByText('Install Frende')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<PWAInstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    expect(installButton).toHaveAttribute('type', 'button');
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    expect(dismissButton).toHaveAttribute('type', 'button');
  });

  it('has correct styling classes', () => {
    render(<PWAInstallPrompt />);
    
    const card = screen.getByText('Install Frende').closest('.shadow-lg');
    expect(card).toHaveClass('shadow-lg', 'border-2', 'border-primary/20');
    
    const installButton = screen.getByText('Install App');
    expect(installButton).toHaveClass('flex-1');
  });
});
