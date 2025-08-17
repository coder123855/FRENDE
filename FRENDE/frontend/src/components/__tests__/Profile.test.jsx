import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Profile from '../Profile';

// Mock the user profile hook
jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: null,
    isLoading: false,
    error: null,
    updateProfile: jest.fn(),
    uploadImage: jest.fn()
  })
}));

// Mock the auth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false
  })
}));

const mockUpdateProfile = jest.fn();
const mockUploadImage = jest.fn();

const mockProfile = {
  id: 1,
  name: 'John Doe',
  age: 25,
  profession: 'Software Engineer',
  profile_picture: 'https://example.com/avatar.jpg',
  location: 'San Francisco',
  community: 'Tech',
  profile_text: 'I love coding and hiking in my free time. Always looking to meet new people and learn new things!',
  interests: ['coding', 'hiking', 'coffee', 'travel']
};

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementations
    require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      uploadImage: mockUploadImage
    });
    require('../../hooks/useAuth').useAuth.mockReturnValue({
      user: { id: 1 },
      isAuthenticated: true
    });
  });

  describe('Rendering', () => {
    it('renders profile information correctly', () => {
      render(<Profile />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('25 years old')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('San Francisco')).toBeInTheDocument();
      expect(screen.getByText('Tech')).toBeInTheDocument();
      expect(screen.getByText(/I love coding and hiking in my free time/)).toBeInTheDocument();
    });

    it('renders profile picture when available', () => {
      render(<Profile />);

      const profileImage = screen.getByAltText(/profile picture/i);
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders default avatar when no profile picture is available', () => {
      const profileWithoutPicture = { ...mockProfile, profile_picture: null };
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: profileWithoutPicture,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      const defaultAvatar = screen.getByAltText(/default avatar/i);
      expect(defaultAvatar).toBeInTheDocument();
    });

    it('renders edit button when user is authenticated', () => {
      render(<Profile />);

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('does not render edit button when user is not authenticated', () => {
      require('../../hooks/useAuth').useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      render(<Profile />);

      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });

    it('renders interests when available', () => {
      render(<Profile />);

      expect(screen.getByText('coding')).toBeInTheDocument();
      expect(screen.getByText('hiking')).toBeInTheDocument();
      expect(screen.getByText('coffee')).toBeInTheDocument();
      expect(screen.getByText('travel')).toBeInTheDocument();
    });

    it('handles missing interests gracefully', () => {
      const profileWithoutInterests = { ...mockProfile, interests: null };
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: profileWithoutInterests,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      expect(screen.queryByText('coding')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton when profile is loading', () => {
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: null,
        isLoading: true,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      expect(screen.getByTestId('profile-loading-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('shows loading indicator during image upload', () => {
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: mockProfile,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage,
        isUploading: true
      });

      render(<Profile />);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when profile loading fails', () => {
      const errorMessage = 'Failed to load profile';
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: null,
        isLoading: false,
        error: errorMessage,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('handles retry functionality', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to load profile';
      const mockRetry = jest.fn();
      
      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: null,
        isLoading: false,
        error: errorMessage,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage,
        retry: mockRetry
      });

      render(<Profile />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('opens edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/profession/i)).toBeInTheDocument();
    });

    it('closes edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Cancel edit
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should be back to view mode
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });

    it('saves profile changes when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Modify name
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        ...mockProfile,
        name: 'Jane Smith'
      });
    });

    it('handles image upload when file is selected', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Find file input
      const fileInput = screen.getByLabelText(/profile picture/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      expect(mockUploadImage).toHaveBeenCalledWith(file);
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty name field', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Clear name field
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid age', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Enter invalid age
      const ageInput = screen.getByLabelText(/age/i);
      await user.clear(ageInput);
      await user.type(ageInput, '150');

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/age must be between 13 and 120/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for profile text too long', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Open edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Enter long profile text
      const profileTextInput = screen.getByLabelText(/profile text/i);
      const longText = 'a'.repeat(501);
      await user.clear(profileTextInput);
      await user.type(profileTextInput, longText);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/profile text must be 500 characters or less/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<Profile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      expect(editButton).toHaveAttribute('aria-label', 'Edit profile');

      const profileImage = screen.getByAltText(/profile picture/i);
      expect(profileImage).toHaveAttribute('alt', 'Profile picture of John Doe');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      
      await user.tab();
      expect(editButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<Profile />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Profile');
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

      render(<Profile />);

      // Check for mobile-specific classes or layout
      const profileContainer = screen.getByTestId('profile-container');
      expect(profileContainer).toHaveClass('mobile-layout');
    });

    it('adapts layout for desktop screens', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<Profile />);

      // Check for desktop-specific classes or layout
      const profileContainer = screen.getByTestId('profile-container');
      expect(profileContainer).toHaveClass('desktop-layout');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing profile data gracefully', () => {
      const incompleteProfile = {
        id: 1,
        name: 'John Doe',
        age: null,
        profession: null,
        profile_picture: null,
        location: null,
        community: null,
        profile_text: null,
        interests: null
      };

      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: incompleteProfile,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Age not specified')).toBeInTheDocument();
      expect(screen.getByText('Profession not specified')).toBeInTheDocument();
    });

    it('handles very long profile text with truncation', () => {
      const longProfileText = 'a'.repeat(1000);
      const profileWithLongText = { ...mockProfile, profile_text: longProfileText };

      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: profileWithLongText,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      const truncatedText = screen.getByText(/a{100}/);
      expect(truncatedText).toBeInTheDocument();
      expect(screen.getByText(/show more/i)).toBeInTheDocument();
    });

    it('handles special characters in profile data', () => {
      const profileWithSpecialChars = {
        ...mockProfile,
        name: 'José María',
        profession: 'Software Engineer & Designer',
        profile_text: 'I love coding! 🚀 And hiking 🏔️'
      };

      require('../../hooks/useUserProfile').useUserProfile.mockReturnValue({
        profile: profileWithSpecialChars,
        isLoading: false,
        error: null,
        updateProfile: mockUpdateProfile,
        uploadImage: mockUploadImage
      });

      render(<Profile />);

      expect(screen.getByText('José María')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer & Designer')).toBeInTheDocument();
      expect(screen.getByText(/I love coding! 🚀 And hiking 🏔️/)).toBeInTheDocument();
    });
  });
});
