import React from 'react';
import { useAccessibility } from '../hooks/useAccessibility';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const AccessibilitySettings = () => {
  const {
    reducedMotion,
    highContrast,
    fontSize,
    toggleReducedMotion,
    toggleHighContrast,
    changeFontSize,
    announceToScreenReader
  } = useAccessibility();

  const handleFontSizeChange = (newSize) => {
    changeFontSize(newSize);
    announceToScreenReader(`Font size changed to ${newSize}`);
  };

  const handleMotionToggle = () => {
    toggleReducedMotion();
    announceToScreenReader(`Reduced motion ${reducedMotion ? 'disabled' : 'enabled'}`);
  };

  const handleContrastToggle = () => {
    toggleHighContrast();
    announceToScreenReader(`High contrast ${highContrast ? 'disabled' : 'enabled'}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" id="accessibility-settings-title">
          Accessibility Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your experience to make the app more accessible for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual Preferences</CardTitle>
          <CardDescription>
            Adjust visual settings to improve readability and comfort.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="space-y-2">
            <Label htmlFor="font-size" className="text-base font-medium">
              Font Size
            </Label>
            <Select value={fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger id="font-size" aria-describedby="font-size-description">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
            <p id="font-size-description" className="text-sm text-muted-foreground">
              Choose a font size that's comfortable for you to read.
            </p>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                High Contrast
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility.
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={handleContrastToggle}
              aria-describedby="high-contrast-description"
            />
          </div>
          <p id="high-contrast-description" className="text-sm text-muted-foreground">
            High contrast mode uses stronger color differences to make content easier to see.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motion Preferences</CardTitle>
          <CardDescription>
            Control animations and motion effects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion" className="text-base font-medium">
                Reduced Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions.
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={handleMotionToggle}
              aria-describedby="reduced-motion-description"
            />
          </div>
          <p id="reduced-motion-description" className="text-sm text-muted-foreground">
            Reduces motion effects which can help with motion sensitivity and vestibular disorders.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyboard Navigation</CardTitle>
          <CardDescription>
            Tips for using the app with a keyboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Navigation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Tab: Move between interactive elements</li>
                  <li>• Shift + Tab: Move backwards</li>
                  <li>• Enter/Space: Activate buttons and links</li>
                  <li>• Escape: Close dialogs and menus</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Lists and Menus</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Arrow keys: Navigate options</li>
                  <li>• Home/End: Jump to first/last item</li>
                  <li>• Enter: Select current option</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screen Reader Support</CardTitle>
          <CardDescription>
            Information about screen reader compatibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This app is designed to work with screen readers like NVDA, JAWS, VoiceOver, and TalkBack. 
              All interactive elements have proper labels and descriptions.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Quick Test</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Test your screen reader setup with this button:
              </p>
              <Button 
                onClick={() => announceToScreenReader('Screen reader test successful!')}
                aria-label="Test screen reader announcement"
              >
                Test Screen Reader
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => announceToScreenReader('Accessibility settings saved')}
          aria-label="Save accessibility settings"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
