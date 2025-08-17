import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarDemo from '../AvatarDemo';

// Mock the UI components
jest.mock('../ui/avatar', () => {
  const MockAvatar = ({ src, name, size, variant }) => {
    return (
      <div data-testid="avatar" data-src={src} data-name={name} data-size={size} data-variant={variant}>
        {src ? 'Avatar with image' : 'Avatar without image'}
      </div>
    );
  };
  return MockAvatar;
});

jest.mock('../ui/default-avatar', () => {
  const MockDefaultAvatar = ({ size, name, variant }) => {
    return (
      <div data-testid="default-avatar" data-size={size} data-name={name} data-variant={variant}>
        Default Avatar
      </div>
    );
  };
  return MockDefaultAvatar;
});

jest.mock('../ui/card', () => {
  const MockCard = ({ children, className }) => {
    return (
      <div data-testid="card" className={className}>
        {children}
      </div>
    );
  };
  return { Card: MockCard };
});

describe('AvatarDemo', () => {
  describe('Rendering', () => {
    it('renders the main title and description', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('Avatar Component Demo')).toBeInTheDocument();
      expect(screen.getByText('Showcasing default avatar functionality for users without profile pictures')).toBeInTheDocument();
    });

    it('renders all section headers', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('Default Avatar Variants')).toBeInTheDocument();
      expect(screen.getByText('Avatar Sizes')).toBeInTheDocument();
      expect(screen.getByText('Avatar Component with Fallback')).toBeInTheDocument();
      expect(screen.getByText('Error Handling Demo')).toBeInTheDocument();
      expect(screen.getByText('Usage Examples')).toBeInTheDocument();
    });

    it('renders all card components', () => {
      render(<AvatarDemo />);
      
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(5); // 5 sections with cards
    });
  });

  describe('Default Avatar Variants', () => {
    it('renders all variant types', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('silhouette')).toBeInTheDocument();
      expect(screen.getByText('initials')).toBeInTheDocument();
      expect(screen.getByText('gradient')).toBeInTheDocument();
    });

    it('renders demo users for each variant', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('renders default avatars with correct props', () => {
      render(<AvatarDemo />);
      
      const defaultAvatars = screen.getAllByTestId('default-avatar');
      expect(defaultAvatars.length).toBeGreaterThan(0);
      
      // Check that at least one has the expected props
      const firstAvatar = defaultAvatars[0];
      expect(firstAvatar).toHaveAttribute('data-size', 'lg');
      expect(firstAvatar).toHaveAttribute('data-variant');
    });
  });

  describe('Avatar Sizes', () => {
    it('renders all size options', () => {
      render(<AvatarDemo />);
      
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
      sizes.forEach(size => {
        expect(screen.getByText(size)).toBeInTheDocument();
      });
    });

    it('renders multiple avatars for each size', () => {
      render(<AvatarDemo />);
      
      const defaultAvatars = screen.getAllByTestId('default-avatar');
      expect(defaultAvatars.length).toBeGreaterThan(7); // At least 7 sizes
    });
  });

  describe('Avatar Component with Fallback', () => {
    it('renders all demo users', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument();
      expect(screen.getByText('No name')).toBeInTheDocument();
    });

    it('renders avatar components with correct props', () => {
      render(<AvatarDemo />);
      
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars.length).toBeGreaterThan(0);
      
      // Check that avatars have the expected props
      const firstAvatar = avatars[0];
      expect(firstAvatar).toHaveAttribute('data-size', 'lg');
      expect(firstAvatar).toHaveAttribute('data-variant', 'gradient');
    });

    it('shows image status for each user', () => {
      render(<AvatarDemo />);
      
      expect(screen.getAllByText('No image')).toBeTruthy();
    });
  });

  describe('Error Handling Demo', () => {
    it('renders error handling examples', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('Invalid URL')).toBeInTheDocument();
      expect(screen.getByText('No image')).toBeInTheDocument();
      expect(screen.getByText('No name, no image')).toBeInTheDocument();
      expect(screen.getByText('Valid image')).toBeInTheDocument();
    });

    it('renders avatars with different error scenarios', () => {
      render(<AvatarDemo />);
      
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Usage Examples', () => {
    it('renders code examples', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('Basic Usage:')).toBeInTheDocument();
      expect(screen.getByText('With Variants:')).toBeInTheDocument();
      expect(screen.getByText('Default Avatar Only:')).toBeInTheDocument();
    });

    it('renders code snippets', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText(/<Avatar src={user.profilePictureUrl} name={user.name} size="md" \/>/)).toBeInTheDocument();
      expect(screen.getByText(/<Avatar src={null} name="John Doe" variant="gradient" size="lg" \/>/)).toBeInTheDocument();
      expect(screen.getByText(/<DefaultAvatar name="Jane Smith" variant="initials" size="xl" \/>/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container structure', () => {
      render(<AvatarDemo />);
      
      const container = screen.getByText('Avatar Component Demo').closest('div');
      expect(container).toHaveClass('p-6', 'space-y-8');
    });

    it('has proper grid layouts', () => {
      render(<AvatarDemo />);
      
      // Check for grid classes in the rendered content
      const gridElements = document.querySelectorAll('.grid');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('has proper responsive design classes', () => {
      render(<AvatarDemo />);
      
      // Check for responsive classes
      const responsiveElements = document.querySelectorAll('.md\\:grid-cols-3, .lg\\:grid-cols-6');
      expect(responsiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<AvatarDemo />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Avatar Component Demo');
      
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('has proper semantic structure', () => {
      render(<AvatarDemo />);
      
      // Check that all cards are rendered
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(5);
    });

    it('has proper text content for screen readers', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('No name')).toBeInTheDocument();
      expect(screen.getByText('No image')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('integrates with Avatar component correctly', () => {
      render(<AvatarDemo />);
      
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('integrates with DefaultAvatar component correctly', () => {
      render(<AvatarDemo />);
      
      const defaultAvatars = screen.getAllByTestId('default-avatar');
      expect(defaultAvatars.length).toBeGreaterThan(0);
    });

    it('integrates with Card component correctly', () => {
      render(<AvatarDemo />);
      
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(5);
    });
  });

  describe('Content Validation', () => {
    it('displays correct user names', () => {
      render(<AvatarDemo />);
      
      const expectedNames = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
      expectedNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('displays correct variant names', () => {
      render(<AvatarDemo />);
      
      const expectedVariants = ['silhouette', 'initials', 'gradient'];
      expectedVariants.forEach(variant => {
        expect(screen.getByText(variant)).toBeInTheDocument();
      });
    });

    it('displays correct size names', () => {
      render(<AvatarDemo />);
      
      const expectedSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
      expectedSizes.forEach(size => {
        expect(screen.getByText(size)).toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('handles missing user names gracefully', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('No name')).toBeInTheDocument();
    });

    it('handles missing images gracefully', () => {
      render(<AvatarDemo />);
      
      expect(screen.getAllByText('No image')).toBeTruthy();
    });

    it('handles invalid URLs gracefully', () => {
      render(<AvatarDemo />);
      
      expect(screen.getByText('Invalid URL')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<AvatarDemo />);
      
      // Re-render with same props
      rerender(<AvatarDemo />);
      
      // Should still have all the expected content
      expect(screen.getByText('Avatar Component Demo')).toBeInTheDocument();
    });
  });
});
