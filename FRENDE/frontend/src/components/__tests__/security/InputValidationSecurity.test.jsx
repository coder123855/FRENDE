/**
 * Input Validation Security Tests for Frende Frontend
 * Tests form input security, validation, and sanitization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ProfileForm from '../../components/ProfileForm';
import TaskSubmissionForm from '../../components/TaskSubmissionForm';
import ImageUpload from '../../components/ImageUpload';
import Chat from '../../components/Chat';

// Mock API client
jest.mock('../../lib/api', () => ({
  updateProfile: jest.fn(),
  submitTask: jest.fn(),
  uploadImage: jest.fn(),
  sendMessage: jest.fn(),
}));

// Mock file upload
const mockFile = new File(['fake-image-content'], 'test.jpg', { type: 'image/jpeg' });

describe('Input Validation Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Form Security', () => {
    test('should prevent XSS in profile form', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const profileTextInput = screen.getByLabelText(/profile text/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        'data:text/html,<script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        fireEvent.change(nameInput, { target: { value: payload } });
        fireEvent.change(profileTextInput, { target: { value: payload } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should not execute XSS
          expect(screen.queryByText('XSS')).not.toBeInTheDocument();
        });

        // Should call updateProfile with sanitized input
        if (mockUpdateProfile.mock.calls.length > 0) {
          const lastCall = mockUpdateProfile.mock.calls[mockUpdateProfile.mock.calls.length - 1];
          const name = lastCall[0]?.name || '';
          const profileText = lastCall[0]?.profile_text || '';
          
          // Check that XSS payloads are not present in raw form
          expect(name).not.toContain('<script>');
          expect(name).not.toContain('javascript:');
          expect(profileText).not.toContain('<script>');
          expect(profileText).not.toContain('javascript:');
        }
      }
    });

    test('should validate input length limits', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const profileTextInput = screen.getByLabelText(/profile text/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test name length limit (100 characters)
      const longName = 'A'.repeat(101);
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is too long/i)).toBeInTheDocument();
      });

      // Test profile text length limit (500 characters)
      const longProfileText = 'A'.repeat(501);
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      fireEvent.change(profileTextInput, { target: { value: longProfileText } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/profile text is too long/i)).toBeInTheDocument();
      });
    });

    test('should validate age input', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const ageInput = screen.getByLabelText(/age/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test invalid ages
      const invalidAges = [-1, 0, 12, 101, 150, 'invalid', '12.5'];
      
      for (const invalidAge of invalidAges) {
        fireEvent.change(ageInput, { target: { value: invalidAge } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/age must be between 13 and 100/i)).toBeInTheDocument();
        });
      }

      // Test valid ages
      const validAges = [13, 18, 25, 50, 100];
      
      for (const validAge of validAges) {
        fireEvent.change(ageInput, { target: { value: validAge } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByText(/age must be between 13 and 100/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should prevent SQL injection in profile form', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test SQL injection payloads
      const sqlInjectionPayloads = [
        "admin'--",
        "admin' OR '1'='1'--",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker','password'); --",
      ];

      for (const payload of sqlInjectionPayloads) {
        fireEvent.change(nameInput, { target: { value: payload } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should handle gracefully without exposing database errors
          expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
          expect(screen.queryByText(/sql/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should sanitize special characters', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test special characters
      const specialChars = [
        '<>&"\'',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ];

      for (const chars of specialChars) {
        fireEvent.change(nameInput, { target: { value: chars } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should not execute malicious code
          expect(screen.queryByText('alert(1)')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Task Submission Form Security', () => {
    test('should prevent XSS in task submission', async () => {
      const mockSubmitTask = jest.fn();
      require('../../lib/api').submitTask = mockSubmitTask;

      render(
        <BrowserRouter>
          <AuthProvider>
            <TaskSubmissionForm task={{ id: 1, title: 'Test Task' }} />
          </AuthProvider>
        </BrowserRouter>
      );

      const submissionTextInput = screen.getByLabelText(/submission text/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'data:text/html,<script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        fireEvent.change(submissionTextInput, { target: { value: payload } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should not execute XSS
          expect(screen.queryByText('XSS')).not.toBeInTheDocument();
        });
      }
    });

    test('should validate submission text length', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TaskSubmissionForm task={{ id: 1, title: 'Test Task' }} />
          </AuthProvider>
        </BrowserRouter>
      );

      const submissionTextInput = screen.getByLabelText(/submission text/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Test text length limit (1000 characters)
      const longText = 'A'.repeat(1001);
      fireEvent.change(submissionTextInput, { target: { value: longText } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/description must be less than 1000 characters/i)).toBeInTheDocument();
      });
    });

    test('should validate evidence URL', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TaskSubmissionForm task={{ id: 1, title: 'Test Task' }} />
          </AuthProvider>
        </BrowserRouter>
      );

      const evidenceUrlInput = screen.getByLabelText(/evidence url/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Test malicious URLs
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'http://malicious-site.com/steal?cookie=' + document.cookie,
      ];

      for (const url of maliciousUrls) {
        fireEvent.change(evidenceUrlInput, { target: { value: url } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/invalid url/i)).toBeInTheDocument();
        });
      }

      // Test valid URLs
      const validUrls = [
        'https://example.com/image.jpg',
        'http://example.com/document.pdf',
        'https://imgur.com/abc123.jpg',
      ];

      for (const url of validUrls) {
        fireEvent.change(evidenceUrlInput, { target: { value: url } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByText(/invalid url/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Image Upload Security', () => {
    test('should validate file type', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ImageUpload />
          </AuthProvider>
        </BrowserRouter>
      );

      const fileInput = screen.getByLabelText(/upload image/i);

      // Test malicious file types
      const maliciousFiles = [
        new File(['fake-content'], 'malicious.php', { type: 'application/x-php' }),
        new File(['fake-content'], 'malicious.js', { type: 'application/javascript' }),
        new File(['fake-content'], 'malicious.exe', { type: 'application/x-executable' }),
        new File(['fake-content'], 'malicious.sh', { type: 'application/x-sh' }),
      ];

      for (const file of maliciousFiles) {
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
        });
      }

      // Test valid file types
      const validFiles = [
        new File(['fake-content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['fake-content'], 'image.png', { type: 'image/png' }),
        new File(['fake-content'], 'image.gif', { type: 'image/gif' }),
      ];

      for (const file of validFiles) {
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should validate file size', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ImageUpload />
          </AuthProvider>
        </BrowserRouter>
      );

      const fileInput = screen.getByLabelText(/upload image/i);

      // Create a large file (31MB)
      const largeFile = new File(['x'.repeat(31 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
      });

      // Test valid file size
      const validFile = new File(['fake-content'], 'small.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText(/file is too large/i)).not.toBeInTheDocument();
      });
    });

    test('should prevent path traversal in filename', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ImageUpload />
          </AuthProvider>
        </BrowserRouter>
      );

      const fileInput = screen.getByLabelText(/upload image/i);

      // Test path traversal filenames
      const pathTraversalFiles = [
        new File(['fake-content'], '../../../etc/passwd', { type: 'image/jpeg' }),
        new File(['fake-content'], '..\\..\\..\\windows\\system32\\config\\sam', { type: 'image/jpeg' }),
        new File(['fake-content'], '....//....//....//etc/passwd', { type: 'image/jpeg' }),
      ];

      for (const file of pathTraversalFiles) {
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          expect(screen.getByText(/invalid filename/i)).toBeInTheDocument();
        });
      }
    });

    test('should prevent double extension attacks', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ImageUpload />
          </AuthProvider>
        </BrowserRouter>
      );

      const fileInput = screen.getByLabelText(/upload image/i);

      // Test double extension files
      const doubleExtensionFiles = [
        new File(['<?php system($_GET["cmd"]); ?>'], 'image.jpg.php', { type: 'image/jpeg' }),
        new File(['<script>alert("XSS")</script>'], 'image.jpg.js', { type: 'image/jpeg' }),
        new File(['fake-executable'], 'image.jpg.exe', { type: 'image/jpeg' }),
      ];

      for (const file of doubleExtensionFiles) {
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          expect(screen.getByText(/invalid filename/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Chat Security', () => {
    test('should prevent XSS in chat messages', async () => {
      const mockSendMessage = jest.fn();
      require('../../lib/api').sendMessage = mockSendMessage;

      render(
        <BrowserRouter>
          <AuthProvider>
            <Chat />
          </AuthProvider>
        </BrowserRouter>
      );

      const messageInput = screen.getByLabelText(/message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'data:text/html,<script>alert("XSS")</script>',
        '<iframe src=javascript:alert("XSS")>',
      ];

      for (const payload of xssPayloads) {
        fireEvent.change(messageInput, { target: { value: payload } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          // Should not execute XSS
          expect(screen.queryByText('XSS')).not.toBeInTheDocument();
        });

        // Should call sendMessage with sanitized input
        if (mockSendMessage.mock.calls.length > 0) {
          const lastCall = mockSendMessage.mock.calls[mockSendMessage.mock.calls.length - 1];
          const message = lastCall[0]?.message || '';
          
          // Check that XSS payloads are not present in raw form
          expect(message).not.toContain('<script>');
          expect(message).not.toContain('javascript:');
          expect(message).not.toContain('<iframe>');
        }
      }
    });

    test('should validate message length', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <Chat />
          </AuthProvider>
        </BrowserRouter>
      );

      const messageInput = screen.getByLabelText(/message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test message length limit (1000 characters)
      const longMessage = 'A'.repeat(1001);
      fireEvent.change(messageInput, { target: { value: longMessage } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/message is too long/i)).toBeInTheDocument();
      });
    });

    test('should prevent SQL injection in chat messages', async () => {
      const mockSendMessage = jest.fn();
      require('../../lib/api').sendMessage = mockSendMessage;

      render(
        <BrowserRouter>
          <AuthProvider>
            <Chat />
          </AuthProvider>
        </BrowserRouter>
      );

      const messageInput = screen.getByLabelText(/message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test SQL injection payloads
      const sqlInjectionPayloads = [
        "'; DROP TABLE messages; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO messages VALUES ('hacker','malicious'); --",
        "' OR '1'='1",
      ];

      for (const payload of sqlInjectionPayloads) {
        fireEvent.change(messageInput, { target: { value: payload } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          // Should handle gracefully without exposing database errors
          expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
          expect(screen.queryByText(/sql/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should sanitize special characters in chat', async () => {
      const mockSendMessage = jest.fn();
      require('../../lib/api').sendMessage = mockSendMessage;

      render(
        <BrowserRouter>
          <AuthProvider>
            <Chat />
          </AuthProvider>
        </BrowserRouter>
      );

      const messageInput = screen.getByLabelText(/message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test special characters
      const specialChars = [
        '<>&"\'',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ];

      for (const chars of specialChars) {
        fireEvent.change(messageInput, { target: { value: chars } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          // Should not execute malicious code
          expect(screen.queryByText('alert(1)')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Form Validation Security', () => {
    test('should prevent empty submissions', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('should prevent whitespace-only submissions', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('should handle null and undefined values', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test null value
      fireEvent.change(nameInput, { target: { value: null } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Test undefined value
      fireEvent.change(nameInput, { target: { value: undefined } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Sanitization', () => {
    test('should trim whitespace from inputs', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      fireEvent.change(nameInput, { target: { value: '  John Doe  ' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should call updateProfile with trimmed value
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John Doe'
          })
        );
      });
    });

    test('should handle Unicode characters', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      const unicodeNames = [
        'José García',
        '玛丽亚·张',
        'محمد أحمد',
        'Иван Петров',
        'שלום כהן',
      ];

      for (const name of unicodeNames) {
        fireEvent.change(nameInput, { target: { value: name } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          // Should accept Unicode characters
          expect(screen.queryByText(/invalid name/i)).not.toBeInTheDocument();
        });
      }
    });

    test('should prevent null byte injection', async () => {
      const mockUpdateProfile = jest.fn();
      require('../../lib/api').updateProfile = mockUpdateProfile;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProfileForm />
          </AuthProvider>
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Test null byte injection
      const nullByteName = 'John\x00Doe';
      fireEvent.change(nameInput, { target: { value: nullByteName } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should handle null bytes gracefully
        expect(screen.queryByText(/invalid name/i)).not.toBeInTheDocument();
      });
    });
  });
});
