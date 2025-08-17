import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ImageUpload from '../ImageUpload';

// Mock file reader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/jpeg;base64,test',
  onload: null,
  onerror: null
};

global.FileReader = jest.fn(() => mockFileReader);

// Mock canvas
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8Array(1000) })),
    putImageData: jest.fn()
  })),
  toBlob: jest.fn((callback) => callback(new Blob(['test'], { type: 'image/jpeg' }))),
  width: 320,
  height: 320
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

describe('ImageUpload', () => {
  const mockOnUpload = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader.result = 'data:image/jpeg;base64,test';
  });

  describe('Rendering', () => {
    it('renders upload area with proper text', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      expect(screen.getByText(/upload profile picture/i)).toBeInTheDocument();
      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
      expect(screen.getByText(/jpeg, png up to 30mb/i)).toBeInTheDocument();
    });

    it('renders file input with proper attributes', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png');
      expect(fileInput).toHaveAttribute('multiple', 'false');
    });

    it('renders with custom className when provided', () => {
      render(
        <ImageUpload 
          onUpload={mockOnUpload} 
          onError={mockOnError}
          className="custom-class"
        />
      );

      const uploadArea = screen.getByTestId('image-upload-area');
      expect(uploadArea).toHaveClass('custom-class');
    });

    it('renders with current image when provided', () => {
      const currentImage = 'https://example.com/current.jpg';
      render(
        <ImageUpload 
          onUpload={mockOnUpload} 
          onError={mockOnError}
          currentImage={currentImage}
        />
      );

      const image = screen.getByAltText(/current profile picture/i);
      expect(image).toHaveAttribute('src', currentImage);
    });
  });

  describe('File Selection', () => {
    it('handles valid image file selection', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('handles drag and drop of valid image file', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(uploadArea, file);

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('shows preview when image is selected', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(screen.getByAltText(/image preview/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Validation', () => {
    it('rejects non-image files', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await user.upload(fileInput, file);

      expect(mockOnError).toHaveBeenCalledWith('Please select a valid image file (JPEG or PNG)');
    });

    it('rejects files larger than 30MB', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const largeFile = new File(['x'.repeat(31 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, largeFile);

      expect(mockOnError).toHaveBeenCalledWith('File size must be less than 30MB');
    });

    it('rejects unsupported image formats', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });

      await user.upload(fileInput, file);

      expect(mockOnError).toHaveBeenCalledWith('Please select a valid image file (JPEG or PNG)');
    });

    it('validates file size correctly', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const validFile = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, validFile);

      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Image Processing', () => {
    it('crops image to 320x320 when selected', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
        expect(mockCanvas.toBlob).toHaveBeenCalled();
      });
    });

    it('calls onUpload with processed image blob', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(expect.any(Blob));
      });
    });

    it('handles image processing errors gracefully', async () => {
      const user = userEvent.setup();
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(null); // Simulate error
      });

      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to process image');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator during image processing', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      expect(screen.getByText(/processing image/i)).toBeInTheDocument();
    });

    it('hides loading indicator after processing completes', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(screen.queryByText(/processing image/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles file reader errors', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader error
      mockFileReader.onerror();

      expect(mockOnError).toHaveBeenCalledWith('Failed to read image file');
    });

    it('handles invalid image data', async () => {
      const user = userEvent.setup();
      mockFileReader.result = 'invalid-data';

      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Invalid image format');
      });
    });
  });

  describe('User Interactions', () => {
    it('allows clicking on upload area to select file', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      await user.click(uploadArea);

      // Should trigger file input click
      const fileInput = screen.getByLabelText(/upload profile picture/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('shows remove button when image is selected', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
    });

    it('removes selected image when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        const removeButton = screen.getByRole('button', { name: /remove/i });
        user.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.queryByAltText(/image preview/i)).not.toBeInTheDocument();
        expect(screen.getByText(/upload profile picture/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      expect(uploadArea).toHaveAttribute('role', 'button');
      expect(uploadArea).toHaveAttribute('aria-label', 'Upload profile picture');

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      expect(fileInput).toHaveAttribute('aria-describedby');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      
      await user.tab();
      expect(uploadArea).toHaveFocus();

      await user.keyboard('{Enter}');
      // Should trigger file selection
    });

    it('provides screen reader feedback for file selection', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      // Simulate file reader onload
      mockFileReader.onload();

      await waitFor(() => {
        expect(screen.getByText(/image selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      expect(uploadArea).toHaveClass('mobile-layout');
    });

    it('adapts layout for desktop screens', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const uploadArea = screen.getByTestId('image-upload-area');
      expect(uploadArea).toHaveClass('desktop-layout');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple rapid file selections', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file1);
      await user.upload(fileInput, file2);

      // Should handle the second file selection properly
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file2);
    });

    it('handles empty file selection', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      
      // Simulate empty file selection
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('handles file with no type', async () => {
      const user = userEvent.setup();
      render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

      const fileInput = screen.getByLabelText(/upload profile picture/i);
      const file = new File(['test'], 'test', {});

      await user.upload(fileInput, file);

      expect(mockOnError).toHaveBeenCalledWith('Please select a valid image file (JPEG or PNG)');
    });
  });
});
