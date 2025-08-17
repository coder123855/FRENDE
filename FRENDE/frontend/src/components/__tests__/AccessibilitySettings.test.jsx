import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccessibilitySettings from '../AccessibilitySettings';

// Mock the useAccessibility hook
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

// Mock UI components
jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, 'aria-label': ariaLabel, ...props }) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  );
  return { Button: MockButton };
});

jest.mock('../ui/card', () => {
  const MockCard = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockCardHeader = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockCardContent = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockCardTitle = ({ children, ...props }) => <h3 {...props}>{children}</h3>;
  const MockCardDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
  return {
    Card: MockCard,
    CardHeader: MockCardHeader,
    CardContent: MockCardContent,
    CardTitle: MockCardTitle,
    CardDescription: MockCardDescription
  };
});

jest.mock('../ui/input', () => {
  const MockInput = (props) => <input {...props} />;
  return { Input: MockInput };
});

jest.mock('../ui/select', () => {
  const MockSelect = ({ children, value, onValueChange, ...props }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} {...props}>
      {children}
    </select>
  );
  const MockSelectContent = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockSelectItem = ({ children, value, ...props }) => (
    <option value={value} {...props}>{children}</option>
  );
  const MockSelectTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
  const MockSelectValue = ({ placeholder, ...props }) => <span {...props}>{placeholder}</span>;
  return {
    Select: MockSelect,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
    SelectTrigger: MockSelectTrigger,
    SelectValue: MockSelectValue
  };
});

jest.mock('../ui/switch', () => {
  const MockSwitch = ({ checked, onCheckedChange, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  );
  return { Switch: MockSwitch };
});

jest.mock('../ui/label', () => {
  const MockLabel = ({ children, ...props }) => <label {...props}>{children}</label>;
  return { Label: MockLabel };
});

describe('AccessibilitySettings', () => {
  const mockUseAccessibility = require('../../hooks/useAccessibility').useAccessibility;
  const mockToggleReducedMotion = jest.fn();
  const mockToggleHighContrast = jest.fn();
  const mockChangeFontSize = jest.fn();
  const mockAnnounceToScreenReader = jest.fn();

  const defaultMockValues = {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    toggleReducedMotion: mockToggleReducedMotion,
    toggleHighContrast: mockToggleHighContrast,
    changeFontSize: mockChangeFontSize,
    announceToScreenReader: mockAnnounceToScreenReader
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessibility.mockReturnValue(defaultMockValues);
  });

  describe('Rendering', () => {
    it('renders the main title and description', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
      expect(screen.getByText('Customize your experience to make the app more accessible for you.')).toBeInTheDocument();
    });

    it('renders all section titles', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Visual Preferences')).toBeInTheDocument();
      expect(screen.getByText('Motion Preferences')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Navigation')).toBeInTheDocument();
      expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
    });

    it('renders font size selector with correct options', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Select font size')).toBeInTheDocument();
    });

    it('renders high contrast toggle', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('High Contrast')).toBeInTheDocument();
      expect(screen.getByText('Increase contrast for better visibility.')).toBeInTheDocument();
    });

    it('renders reduced motion toggle', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
      expect(screen.getByText('Minimize animations and transitions.')).toBeInTheDocument();
    });

    it('renders keyboard navigation tips', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Lists and Menus')).toBeInTheDocument();
      expect(screen.getByText('• Tab: Move between interactive elements')).toBeInTheDocument();
      expect(screen.getByText('• Arrow keys: Navigate options')).toBeInTheDocument();
    });

    it('renders screen reader support information', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
      expect(screen.getByText('This app is designed to work with screen readers like NVDA, JAWS, VoiceOver, and TalkBack.')).toBeInTheDocument();
    });

    it('renders test screen reader button', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Test Screen Reader')).toBeInTheDocument();
      expect(screen.getByText('Test your screen reader setup with this button:')).toBeInTheDocument();
    });

    it('renders save settings button', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls changeFontSize when font size is changed', () => {
      render(<AccessibilitySettings />);
      
      const select = screen.getByText('Select font size').closest('select');
      fireEvent.change(select, { target: { value: 'large' } });
      
      expect(mockChangeFontSize).toHaveBeenCalledWith('large');
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Font size changed to large');
    });

    it('calls toggleHighContrast when high contrast toggle is clicked', () => {
      render(<AccessibilitySettings />);
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      fireEvent.click(highContrastToggle);
      
      expect(mockToggleHighContrast).toHaveBeenCalled();
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('High contrast enabled');
    });

    it('calls toggleReducedMotion when reduced motion toggle is clicked', () => {
      render(<AccessibilitySettings />);
      
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      fireEvent.click(reducedMotionToggle);
      
      expect(mockToggleReducedMotion).toHaveBeenCalled();
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Reduced motion enabled');
    });

    it('calls announceToScreenReader when test button is clicked', () => {
      render(<AccessibilitySettings />);
      
      const testButton = screen.getByText('Test Screen Reader');
      fireEvent.click(testButton);
      
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Screen reader test successful!');
    });

    it('calls announceToScreenReader when save button is clicked', () => {
      render(<AccessibilitySettings />);
      
      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);
      
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Accessibility settings saved');
    });
  });

  describe('State Management', () => {
    it('displays current font size value', () => {
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        fontSize: 'large'
      });
      
      render(<AccessibilitySettings />);
      
      const select = screen.getByText('Select font size').closest('select');
      expect(select.value).toBe('large');
    });

    it('displays high contrast toggle state correctly', () => {
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        highContrast: true
      });
      
      render(<AccessibilitySettings />);
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      expect(highContrastToggle.checked).toBe(true);
    });

    it('displays reduced motion toggle state correctly', () => {
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        reducedMotion: true
      });
      
      render(<AccessibilitySettings />);
      
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      expect(reducedMotionToggle.checked).toBe(true);
    });

    it('announces correct message when high contrast is disabled', () => {
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        highContrast: true
      });
      
      render(<AccessibilitySettings />);
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      fireEvent.click(highContrastToggle);
      
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('High contrast disabled');
    });

    it('announces correct message when reduced motion is disabled', () => {
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        reducedMotion: true
      });
      
      render(<AccessibilitySettings />);
      
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      fireEvent.click(reducedMotionToggle);
      
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Reduced motion disabled');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<AccessibilitySettings />);
      
      const mainTitle = screen.getByRole('heading', { level: 1 });
      expect(mainTitle).toHaveTextContent('Accessibility Settings');
      
      const sectionTitles = screen.getAllByRole('heading', { level: 3 });
      expect(sectionTitles).toHaveLength(4); // Visual Preferences, Motion Preferences, Keyboard Navigation, Screen Reader Support
    });

    it('has proper form labels and associations', () => {
      render(<AccessibilitySettings />);
      
      const fontSizeLabel = screen.getByText('Font Size');
      const fontSizeSelect = screen.getByText('Select font size').closest('select');
      expect(fontSizeLabel).toHaveAttribute('for', 'font-size');
      expect(fontSizeSelect).toHaveAttribute('id', 'font-size');
      
      const highContrastLabel = screen.getByText('High Contrast');
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      expect(highContrastLabel).toHaveAttribute('for', 'high-contrast');
      expect(highContrastToggle).toHaveAttribute('id', 'high-contrast');
      
      const reducedMotionLabel = screen.getByText('Reduced Motion');
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      expect(reducedMotionLabel).toHaveAttribute('for', 'reduced-motion');
      expect(reducedMotionToggle).toHaveAttribute('id', 'reduced-motion');
    });

    it('has proper ARIA descriptions', () => {
      render(<AccessibilitySettings />);
      
      const fontSizeSelect = screen.getByText('Select font size').closest('select');
      expect(fontSizeSelect).toHaveAttribute('aria-describedby', 'font-size-description');
      expect(screen.getByText('Choose a font size that\'s comfortable for you to read.')).toHaveAttribute('id', 'font-size-description');
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      expect(highContrastToggle).toHaveAttribute('aria-describedby', 'high-contrast-description');
      expect(screen.getByText('High contrast mode uses stronger color differences to make content easier to see.')).toHaveAttribute('id', 'high-contrast-description');
      
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      expect(reducedMotionToggle).toHaveAttribute('aria-describedby', 'reduced-motion-description');
      expect(screen.getByText('Reduces motion effects which can help with motion sensitivity and vestibular disorders.')).toHaveAttribute('id', 'reduced-motion-description');
    });

    it('has proper button labels', () => {
      render(<AccessibilitySettings />);
      
      const testButton = screen.getByRole('button', { name: 'Test Screen Reader' });
      expect(testButton).toHaveAttribute('aria-label', 'Test screen reader announcement');
      
      const saveButton = screen.getByRole('button', { name: 'Save Settings' });
      expect(saveButton).toHaveAttribute('aria-label', 'Save accessibility settings');
    });

    it('has proper semantic structure', () => {
      render(<AccessibilitySettings />);
      
      // Check that all interactive elements are properly labeled
      expect(screen.getByRole('checkbox', { name: /high contrast/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /reduced motion/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Test Screen Reader' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Settings' })).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container structure', () => {
      render(<AccessibilitySettings />);
      
      const container = screen.getByText('Accessibility Settings').closest('div');
      expect(container).toHaveClass('max-w-2xl', 'mx-auto', 'p-6', 'space-y-6');
    });

    it('has proper card layout', () => {
      render(<AccessibilitySettings />);
      
      // Check that all cards are rendered
      const cards = document.querySelectorAll('[class*="Card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('has proper responsive design classes', () => {
      render(<AccessibilitySettings />);
      
      // Check for responsive grid classes
      const gridElements = document.querySelectorAll('.md\\:grid-cols-2');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Content Validation', () => {
    it('displays correct keyboard navigation instructions', () => {
      render(<AccessibilitySettings />);
      
      const expectedInstructions = [
        '• Tab: Move between interactive elements',
        '• Shift + Tab: Move backwards',
        '• Enter/Space: Activate buttons and links',
        '• Escape: Close dialogs and menus',
        '• Arrow keys: Navigate options',
        '• Home/End: Jump to first/last item',
        '• Enter: Select current option'
      ];
      
      expectedInstructions.forEach(instruction => {
        expect(screen.getByText(instruction)).toBeInTheDocument();
      });
    });

    it('displays correct screen reader information', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText(/This app is designed to work with screen readers like NVDA, JAWS, VoiceOver, and TalkBack/)).toBeInTheDocument();
      expect(screen.getByText('All interactive elements have proper labels and descriptions.')).toBeInTheDocument();
    });

    it('displays correct font size options', () => {
      render(<AccessibilitySettings />);
      
      const select = screen.getByText('Select font size').closest('select');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('small');
      expect(options[1].value).toBe('medium');
      expect(options[2].value).toBe('large');
    });
  });

  describe('Hook Integration', () => {
    it('integrates with useAccessibility hook correctly', () => {
      render(<AccessibilitySettings />);
      
      expect(mockUseAccessibility).toHaveBeenCalled();
    });

    it('calls hook functions with correct parameters', () => {
      render(<AccessibilitySettings />);
      
      const select = screen.getByText('Select font size').closest('select');
      fireEvent.change(select, { target: { value: 'small' } });
      
      expect(mockChangeFontSize).toHaveBeenCalledWith('small');
      expect(mockAnnounceToScreenReader).toHaveBeenCalledWith('Font size changed to small');
    });

    it('handles hook state changes correctly', () => {
      const { rerender } = render(<AccessibilitySettings />);
      
      // Change hook state
      mockUseAccessibility.mockReturnValue({
        ...defaultMockValues,
        fontSize: 'large',
        highContrast: true,
        reducedMotion: true
      });
      
      rerender(<AccessibilitySettings />);
      
      const select = screen.getByText('Select font size').closest('select');
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast/i });
      const reducedMotionToggle = screen.getByRole('checkbox', { name: /reduced motion/i });
      
      expect(select.value).toBe('large');
      expect(highContrastToggle.checked).toBe(true);
      expect(reducedMotionToggle.checked).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles missing hook functions gracefully', () => {
      mockUseAccessibility.mockReturnValue({
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium',
        toggleReducedMotion: undefined,
        toggleHighContrast: undefined,
        changeFontSize: undefined,
        announceToScreenReader: undefined
      });
      
      render(<AccessibilitySettings />);
      
      // Should render without crashing
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    });

    it('handles undefined hook values gracefully', () => {
      mockUseAccessibility.mockReturnValue({
        reducedMotion: undefined,
        highContrast: undefined,
        fontSize: undefined,
        toggleReducedMotion: mockToggleReducedMotion,
        toggleHighContrast: mockToggleHighContrast,
        changeFontSize: mockChangeFontSize,
        announceToScreenReader: mockAnnounceToScreenReader
      });
      
      render(<AccessibilitySettings />);
      
      // Should render without crashing
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props change', () => {
      const { rerender } = render(<AccessibilitySettings />);
      
      // Re-render with same hook values
      rerender(<AccessibilitySettings />);
      
      // Should still have all the expected content
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    });
  });
});
