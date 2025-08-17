import React, { useState, useRef } from 'react';
import { useError } from '../contexts/ErrorContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  AlertTriangle, 
  X, 
  Camera, 
  Send, 
  User, 
  Calendar,
  MapPin,
  Monitor,
  Globe
} from 'lucide-react';

const ErrorReportingModal = ({ isOpen, onClose, error = null }) => {
  const { reportError } = useError();
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setDescription('');
      setUserEmail('');
      setScreenshot(null);
      setSubmitted(false);
    }
  }, [isOpen]);

  // Handle screenshot capture
  const handleScreenshotCapture = async () => {
    try {
      // In a real implementation, you would use a screenshot library
      // For now, we'll simulate it
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // This is a simplified version - in reality you'd need a proper screenshot library
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
        setScreenshot(file);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const errorReport = {
        error: error,
        description: description,
        userEmail: userEmail,
        screenshot: screenshot,
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          screenResolution: `${screen.width}x${screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          online: navigator.onLine
        }
      };

      // Report the error
      await reportError(errorReport);

      setSubmitted(true);
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit error report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get error context information
  const getErrorContext = () => {
    if (!error) return null;

    return {
      type: error.type || 'unknown',
      category: error.category || 'unknown',
      severity: error.severity || 'medium',
      message: error.message || 'No message',
      timestamp: error.timestamp || new Date().toISOString(),
      url: error.url || window.location.href
    };
  };

  const errorContext = getErrorContext();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle>Report Error</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Report Submitted
              </h3>
              <p className="text-gray-600">
                Thank you for your report. Our team will investigate this issue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Information */}
              {errorContext && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Error Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{errorContext.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <span className="ml-2 font-medium">{errorContext.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Severity:</span>
                      <span className="ml-2 font-medium">{errorContext.severity}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <span className="ml-2 font-medium">
                        {new Date(errorContext.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-gray-600">Message:</span>
                    <p className="text-sm font-medium mt-1">{errorContext.message}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  What were you doing when this error occurred? *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what you were trying to do when the error occurred..."
                  className="mt-2"
                  rows={4}
                  required
                />
              </div>

              {/* User Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Your Email (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll only use this to follow up on your report if needed.
                </p>
              </div>

              {/* Screenshot */}
              <div>
                <Label className="text-sm font-medium">Screenshot (optional)</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleScreenshotCapture}
                      disabled={isSubmitting}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Screenshot
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      Upload Image
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {screenshot && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">
                        {screenshot.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScreenshot(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">URL:</span>
                    <span className="font-medium truncate">{window.location.href}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Screen:</span>
                    <span className="font-medium">{screen.width}x{screen.height}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Timezone:</span>
                    <span className="font-medium">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!description.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReportingModal;
