# Test Images Directory

This directory contains test images for E2E tests that require file uploads.

## Required Test Images

### valid-profile.jpg
- **Size**: 320x320 pixels
- **Format**: JPEG
- **Purpose**: Valid profile picture upload testing
- **Description**: A simple test image that meets all validation requirements

### large-image.jpg
- **Size**: 1024x1024 pixels
- **Format**: JPEG
- **Purpose**: Large image upload testing
- **Description**: A large image to test size validation

### invalid-format.txt
- **Size**: 100x100 pixels
- **Format**: TXT (invalid for image uploads)
- **Purpose**: Invalid format testing
- **Description**: A text file to test format validation

## Usage in Tests

Test images are referenced in the test data fixtures:

```javascript
const testImages = {
  validImage: {
    path: './fixtures/test-images/valid-profile.jpg',
    size: '320x320',
    format: 'JPEG'
  },
  // ... other images
};
```

## Creating Test Images

When adding new test images:

1. **Use Realistic Sizes**: Match the sizes used in production validation
2. **Keep File Sizes Small**: Test images should be under 1MB
3. **Use Common Formats**: JPEG, PNG for valid images
4. **Include Invalid Examples**: Test error handling with invalid files
5. **Document Purpose**: Update this README when adding new images

## Image Requirements

### Valid Profile Picture
- **Dimensions**: 320x320 pixels
- **Format**: JPEG or PNG
- **File Size**: < 30MB
- **Content**: Simple, clean image suitable for profile pictures

### Invalid Images for Testing
- **Wrong Format**: Text files, PDFs, etc.
- **Wrong Size**: Too small (< 100x100) or too large (> 2048x2048)
- **Corrupted Files**: Files that can't be processed
- **Empty Files**: Zero-byte files
