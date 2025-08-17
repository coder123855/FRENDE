import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AccessibilityContext = createContext();

export { AccessibilityContext };

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // small, normal, large
  const [announcements, setAnnouncements] = useState([]);
  const liveRegionRef = useRef(null);

  // Detect user's motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Announce to screen reader
  const announceToScreenReader = (message, priority = 'polite') => {
    const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAnnouncement = { id, message, priority, timestamp: Date.now() };
    
    setAnnouncements(prev => [...prev, newAnnouncement]);
    
    // Remove announcement after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  // Focus management
  const focusElement = (element) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  };

  const focusFirstFocusable = (container) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  const focusLastFocusable = (container) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  };

  // Toggle high contrast mode
  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
    document.documentElement.classList.toggle('high-contrast');
  };

  // Change font size
  const changeFontSize = (size) => {
    setFontSize(size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const value = {
    reducedMotion,
    highContrast,
    fontSize,
    announcements,
    announceToScreenReader,
    focusElement,
    focusFirstFocusable,
    focusLastFocusable,
    toggleHighContrast,
    changeFontSize,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      
      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
        aria-relevant="additions"
      >
        {announcements.map(announcement => (
          <div key={announcement.id} aria-live={announcement.priority}>
            {announcement.message}
          </div>
        ))}
      </div>
    </AccessibilityContext.Provider>
  );
};
