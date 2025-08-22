import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import pwaUtils from '../utils/pwaUtils';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installFeatures, setInstallFeatures] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Check if app is already installed
      const checkIfInstalled = () => {
        try {
          if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return true;
          }
          return false;
        } catch (err) {
          console.warn('Error checking if app is installed:', err);
          return false;
        }
      };

      // Check if PWA can be installed
      const checkInstallability = () => {
        try {
          const features = [];
          
          if (pwaUtils.canInstall) {
            features.push('Install to home screen');
          }
          
          if (pwaUtils.notificationSupported) {
            features.push('Push notifications');
          }
          
          if (pwaUtils.backgroundSyncSupported) {
            features.push('Background sync');
          }
          
          if (pwaUtils.pushSupported) {
            features.push('Offline support');
          }
          
          setInstallFeatures(features);
          
          // Show prompt if app is not installed and can be installed
          if (!checkIfInstalled() && pwaUtils.canInstall) {
            setShowPrompt(true);
          }
        } catch (err) {
          console.warn('Error checking installability:', err);
          setError('Unable to check PWA features');
        }
      };

      // Listen for install prompt events
      const handleBeforeInstallPrompt = (event) => {
        try {
          event.preventDefault();
          setShowPrompt(true);
        } catch (err) {
          console.warn('Error handling install prompt:', err);
        }
      };

      const handleAppInstalled = () => {
        try {
          setIsInstalled(true);
          setShowPrompt(false);
          setIsInstalling(false);
        } catch (err) {
          console.warn('Error handling app installed:', err);
        }
      };

      // Set up event listeners
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Initial check
      checkInstallability();

      // Check periodically for installability changes
      const interval = setInterval(checkInstallability, 5000);

      return () => {
        try {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
          clearInterval(interval);
        } catch (err) {
          console.warn('Error cleaning up event listeners:', err);
        }
      };
    } catch (err) {
      console.error('Error in PWAInstallPrompt useEffect:', err);
      setError('Failed to initialize PWA features');
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);
    
    try {
      await pwaUtils.showInstallPrompt();
      // The prompt will be handled by the pwaUtils
    } catch (error) {
      console.error('Install failed:', error);
      setError('Installation failed. Please try again.');
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    try {
      setShowPrompt(false);
      // Store dismissal in localStorage to avoid showing again immediately
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    } catch (err) {
      console.warn('Error dismissing prompt:', err);
      setShowPrompt(false);
    }
  };

  const handleRemindLater = () => {
    try {
      setShowPrompt(false);
      // Store reminder time (24 hours from now)
      const remindTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem('pwa_install_remind', remindTime.toString());
    } catch (err) {
      console.warn('Error setting reminder:', err);
      setShowPrompt(false);
    }
  };

  // Check if we should show the prompt based on dismissal/reminder settings
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const remindTime = localStorage.getItem('pwa_install_remind');
      
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
        
        // Show again after 7 days
        if (hoursSinceDismissed < 168) {
          setShowPrompt(false);
          return;
        }
      }
      
      if (remindTime) {
        const remindTimestamp = parseInt(remindTime);
        if (Date.now() < remindTimestamp) {
          setShowPrompt(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Error checking dismissal/reminder settings:', err);
    }
  }, []);

  // Don't render if installed or not showing prompt
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Install Frende App
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Install Frende as a PWA for a better experience with:
            </p>
            <div className="flex flex-wrap gap-1">
              {installFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleRemindLater}
              className="text-xs"
            >
              Later
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Info className="h-3 w-3" />
            You can install this app on your home screen for quick access
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
