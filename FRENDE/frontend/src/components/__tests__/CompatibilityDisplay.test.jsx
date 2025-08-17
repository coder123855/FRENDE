import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompatibilityDisplay from '../CompatibilityDisplay';

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, className, ...props }) => (
    <div className={`card ${className}`} {...props}>{children}</div>
  );
  return { Card: MockCard };
});

jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, disabled, className, variant, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

describe('CompatibilityDisplay', () => {
  const mockCompatibility = {
    score: 75,
    factors: {
      interests: {
        score: 80,
        details: 'Shared interest in technology and gaming'
      },
      age: {
        score: 70,
        details: 'Similar age group with good compatibility'
      },
      location: {
        score: 60,
        details: 'Same city, good for meeting up'
      }
    },
    details: 'Overall good compatibility based on shared interests and location',
    random_factor: 5
  };

  const mockTargetUser = {
    name: 'John Doe',
    username: 'johndoe'
  };

  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders compatibility analysis title', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Compatibility Analysis')).toBeInTheDocument();
    });

    it('renders target user name when provided', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} targetUser={mockTargetUser} />);
      
      expect(screen.getByText(/with John Doe/)).toBeInTheDocument();
    });

    it('renders compatibility score', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('renders compatibility level', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Good Match')).toBeInTheDocument();
    });

    it('renders random factor when not zero', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Random factor: +5')).toBeInTheDocument();
    });

    it('renders compatibility factors', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Compatibility Factors')).toBeInTheDocument();
      expect(screen.getByText('interests')).toBeInTheDocument();
      expect(screen.getByText('age')).toBeInTheDocument();
      expect(screen.getByText('location')).toBeInTheDocument();
    });

    it('renders factor scores', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('80/100')).toBeInTheDocument();
      expect(screen.getByText('70/100')).toBeInTheDocument();
      expect(screen.getByText('60/100')).toBeInTheDocument();
    });

    it('renders factor details', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Shared interest in technology and gaming')).toBeInTheDocument();
      expect(screen.getByText('Similar age group with good compatibility')).toBeInTheDocument();
      expect(screen.getByText('Same city, good for meeting up')).toBeInTheDocument();
    });
  });

  describe('Compatibility Levels', () => {
    it('shows Excellent level for score >= 80', () => {
      const excellentCompatibility = {
        ...mockCompatibility,
        score: 85
      };
      
      render(<CompatibilityDisplay compatibility={excellentCompatibility} />);
      
      expect(screen.getByText('Excellent Match')).toBeInTheDocument();
    });

    it('shows Good level for score >= 60', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('Good Match')).toBeInTheDocument();
    });

    it('shows Fair level for score >= 40', () => {
      const fairCompatibility = {
        ...mockCompatibility,
        score: 50
      };
      
      render(<CompatibilityDisplay compatibility={fairCompatibility} />);
      
      expect(screen.getByText('Fair Match')).toBeInTheDocument();
    });

    it('shows Poor level for score < 40', () => {
      const poorCompatibility = {
        ...mockCompatibility,
        score: 30
      };
      
      render(<CompatibilityDisplay compatibility={poorCompatibility} />);
      
      expect(screen.getByText('Poor Match')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders accept and reject buttons when callbacks are provided', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      expect(screen.getByText('Accept Match')).toBeInTheDocument();
      expect(screen.getByText('Reject Match')).toBeInTheDocument();
    });

    it('does not render action buttons when callbacks are not provided', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.queryByText('Accept Match')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject Match')).not.toBeInTheDocument();
    });

    it('calls onAccept when accept button is clicked', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      const acceptButton = screen.getByText('Accept Match');
      fireEvent.click(acceptButton);
      
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when reject button is clicked', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      const rejectButton = screen.getByText('Reject Match');
      fireEvent.click(rejectButton);
      
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when loading is true', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          loading={true}
        />
      );
      
      const acceptButton = screen.getByText('Processing...');
      const rejectButton = screen.getByText('Processing...');
      
      expect(acceptButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('shows loading text when loading is true', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
          loading={true}
        />
      );
      
      expect(screen.getAllByText('Processing...')).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing compatibility data gracefully', () => {
      render(<CompatibilityDisplay compatibility={null} />);
      
      expect(screen.getByText('No compatibility data available')).toBeInTheDocument();
    });

    it('handles undefined compatibility data gracefully', () => {
      render(<CompatibilityDisplay compatibility={undefined} />);
      
      expect(screen.getByText('No compatibility data available')).toBeInTheDocument();
    });

    it('handles target user without name', () => {
      const userWithoutName = { username: 'johndoe' };
      
      render(<CompatibilityDisplay compatibility={mockCompatibility} targetUser={userWithoutName} />);
      
      expect(screen.getByText(/with johndoe/)).toBeInTheDocument();
    });

    it('handles zero random factor', () => {
      const compatibilityWithoutRandom = {
        ...mockCompatibility,
        random_factor: 0
      };
      
      render(<CompatibilityDisplay compatibility={compatibilityWithoutRandom} />);
      
      expect(screen.queryByText(/Random factor/)).not.toBeInTheDocument();
    });

    it('handles negative random factor', () => {
      const compatibilityWithNegativeRandom = {
        ...mockCompatibility,
        random_factor: -3
      };
      
      render(<CompatibilityDisplay compatibility={compatibilityWithNegativeRandom} />);
      
      expect(screen.getByText('Random factor: -3')).toBeInTheDocument();
    });

    it('handles empty factors object', () => {
      const compatibilityWithoutFactors = {
        ...mockCompatibility,
        factors: {}
      };
      
      render(<CompatibilityDisplay compatibility={compatibilityWithoutFactors} />);
      
      expect(screen.getByText('Compatibility Factors')).toBeInTheDocument();
      // Should not render any factor items
      expect(screen.queryByText('interests')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      const acceptButton = screen.getByRole('button', { name: 'Accept Match' });
      const rejectButton = screen.getByRole('button', { name: 'Reject Match' });
      
      expect(acceptButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Compatibility Analysis');
    });

    it('has proper subheading structure', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const subheading = screen.getByRole('heading', { level: 4 });
      expect(subheading).toHaveTextContent('Compatibility Factors');
    });

    it('has descriptive text for screen readers', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText(/Overall good compatibility based on shared interests and location/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper card structure', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const card = screen.getByText('Compatibility Analysis').closest('.card');
      expect(card).toHaveClass('card', 'p-6', 'space-y-4');
    });

    it('has proper score display styling', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const scoreContainer = screen.getByText('75/100').closest('div');
      expect(scoreContainer).toHaveClass('bg-blue-100');
    });

    it('has proper factor styling', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const factorContainer = screen.getByText('interests').closest('div');
      expect(factorContainer).toHaveClass('border', 'rounded-lg', 'p-3');
    });

    it('has proper button styling', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      const acceptButton = screen.getByText('Accept Match');
      const rejectButton = screen.getByText('Reject Match');
      
      expect(acceptButton).toHaveClass('button', 'bg-green-600', 'hover:bg-green-700');
      expect(rejectButton).toHaveClass('button', 'outline');
    });
  });

  describe('Integration', () => {
    it('integrates with Card component correctly', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const card = screen.getByText('Compatibility Analysis').closest('.card');
      expect(card).toBeInTheDocument();
    });

    it('integrates with Button components correctly', () => {
      render(
        <CompatibilityDisplay 
          compatibility={mockCompatibility} 
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button).toHaveClass('button');
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      // Re-render with same props
      rerender(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      // Should still have all the expected content
      expect(screen.getByText('Compatibility Analysis')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock compatibility data', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      expect(screen.getByText('75/100')).toBeInTheDocument();
      expect(screen.getByText('Good Match')).toBeInTheDocument();
      expect(screen.getByText('interests')).toBeInTheDocument();
    });

    it('displays all mock factors correctly', () => {
      render(<CompatibilityDisplay compatibility={mockCompatibility} />);
      
      const factorNames = Object.keys(mockCompatibility.factors);
      factorNames.forEach(factorName => {
        expect(screen.getByText(factorName.replace('_', ' '))).toBeInTheDocument();
      });
    });
  });
});
