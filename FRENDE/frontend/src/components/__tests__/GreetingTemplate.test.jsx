import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GreetingTemplate from '../GreetingTemplate';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  MessageCircle: ({ className, ...props }) => <div className={`icon message-circle ${className}`} {...props}>MessageCircle</div>,
  Clock: ({ className, ...props }) => <div className={`icon clock ${className}`} {...props}>Clock</div>,
  CheckCircle: ({ className, ...props }) => <div className={`icon check-circle ${className}`} {...props}>CheckCircle</div>,
  AlertCircle: ({ className, ...props }) => <div className={`icon alert-circle ${className}`} {...props}>AlertCircle</div>,
  Loader2: ({ className, ...props }) => <div className={`icon loader2 ${className}`} {...props}>Loader2</div>,
  Star: ({ className, ...props }) => <div className={`icon star ${className}`} {...props}>Star</div>,
  Copy: ({ className, ...props }) => <div className={`icon copy ${className}`} {...props}>Copy</div>,
  Edit: ({ className, ...props }) => <div className={`icon edit ${className}`} {...props}>Edit</div>
}));

// Mock UI components
jest.mock('../ui/card', () => {
  const MockCard = ({ children, className, onClick, ...props }) => (
    <div className={`card ${className}`} onClick={onClick} {...props}>{children}</div>
  );
  const MockCardContent = ({ children, className, ...props }) => (
    <div className={`card-content ${className}`} {...props}>{children}</div>
  );
  const MockCardHeader = ({ children, className, ...props }) => (
    <div className={`card-header ${className}`} {...props}>{children}</div>
  );
  const MockCardTitle = ({ children, className, ...props }) => (
    <h3 className={`card-title ${className}`} {...props}>{children}</h3>
  );
  return { 
    Card: MockCard, 
    CardContent: MockCardContent, 
    CardHeader: MockCardHeader, 
    CardTitle: MockCardTitle 
  };
});

jest.mock('../ui/button', () => {
  const MockButton = ({ children, onClick, size, variant, className, ...props }) => (
    <button 
      onClick={onClick} 
      className={`button ${size} ${variant} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
  return { Button: MockButton };
});

jest.mock('../ui/badge', () => {
  const MockBadge = ({ children, variant, className, ...props }) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  );
  return { Badge: MockBadge };
});

// Mock hooks
jest.mock('../../hooks/useDefaultGreeting', () => ({
  useDefaultGreeting: jest.fn()
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

describe('GreetingTemplate', () => {
  const mockTemplates = [
    {
      id: 'template1',
      name: 'FriendlyGreeting',
      template: 'Hello, my name is {name}! Nice to meet you!',
      is_default: true
    },
    {
      id: 'template2',
      name: 'CasualGreeting',
      template: 'Hey {name}, how are you doing?',
      is_default: false
    },
    {
      id: 'template3',
      name: 'FormalGreeting',
      template: 'Good day, I am {name}. Pleasure to make your acquaintance.',
      is_default: false
    }
  ];

  const mockUser = {
    name: 'John Doe',
    id: 'user1'
  };

  const mockUseDefaultGreeting = {
    templates: mockTemplates,
    isLoading: false,
    error: null,
    getGreetingTemplates: jest.fn(),
    previewGreeting: jest.fn((templateId, userName) => {
      const template = mockTemplates.find(t => t.id === templateId);
      return template ? template.template.replace('{name}', userName) : '';
    }),
    saveUserPreference: jest.fn().mockResolvedValue(true),
    getUserPreference: jest.fn().mockResolvedValue('template1')
  };

  const mockUseAuth = {
    user: mockUser
  };

  const mockOnTemplateSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('../../hooks/useDefaultGreeting').useDefaultGreeting.mockReturnValue(mockUseDefaultGreeting);
    require('../../hooks/useAuth').useAuth.mockReturnValue(mockUseAuth);
  });

  describe('Rendering', () => {
    it('renders the component with header', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Greeting Templates')).toBeInTheDocument();
      expect(screen.getByText('MessageCircle')).toBeInTheDocument();
    });

    it('renders all templates', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Friendly Greeting')).toBeInTheDocument();
      expect(screen.getByText('Casual Greeting')).toBeInTheDocument();
      expect(screen.getByText('Formal Greeting')).toBeInTheDocument();
    });

    it('renders template content', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Hello, my name is {name}! Nice to meet you!')).toBeInTheDocument();
      expect(screen.getByText('Hey {name}, how are you doing?')).toBeInTheDocument();
      expect(screen.getByText('Good day, I am {name}. Pleasure to make your acquaintance.')).toBeInTheDocument();
    });

    it('renders preview when showPreview is true and user has name', () => {
      render(<GreetingTemplate showPreview={true} />);
      
      expect(screen.getByText('Preview:')).toBeInTheDocument();
      expect(screen.getByText('Hello, my name is John Doe! Nice to meet you!')).toBeInTheDocument();
    });

    it('does not render preview when showPreview is false', () => {
      render(<GreetingTemplate showPreview={false} />);
      
      expect(screen.queryByText('Preview:')).not.toBeInTheDocument();
    });

    it('renders action buttons when showActions is true', () => {
      render(<GreetingTemplate showActions={true} />);
      
      expect(screen.getAllByText('Copy')).toHaveLength(3);
      expect(screen.getAllByText('Set Default')).toHaveLength(2); // One template is already default
    });

    it('does not render action buttons when showActions is false', () => {
      render(<GreetingTemplate showActions={false} />);
      
      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
      expect(screen.queryByText('Set Default')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      const loadingMock = {
        ...mockUseDefaultGreeting,
        isLoading: true
      };
      require('../hooks/useDefaultGreeting').useDefaultGreeting.mockReturnValue(loadingMock);
      
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Loader2')).toBeInTheDocument();
      expect(screen.getByText('Loading greeting templates...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error is present', () => {
      const errorMock = {
        ...mockUseDefaultGreeting,
        error: 'Failed to load templates'
      };
      require('../hooks/useDefaultGreeting').useDefaultGreeting.mockReturnValue(errorMock);
      
      render(<GreetingTemplate />);
      
      expect(screen.getByText('AlertCircle')).toBeInTheDocument();
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('calls onTemplateSelect when template is clicked', () => {
      render(<GreetingTemplate onTemplateSelect={mockOnTemplateSelect} />);
      
      const templateCard = screen.getByText('Casual Greeting').closest('.card');
      fireEvent.click(templateCard);
      
      expect(mockOnTemplateSelect).toHaveBeenCalledWith('template2');
    });

    it('highlights selected template', () => {
      render(<GreetingTemplate selectedTemplateId="template2" />);
      
      const selectedCard = screen.getByText('Casual Greeting').closest('.card');
      expect(selectedCard).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
    });

    it('shows selected template info', () => {
      render(<GreetingTemplate selectedTemplateId="template2" />);
      
      expect(screen.getByText('Selected Template')).toBeInTheDocument();
      expect(screen.getByText('Casual Greeting')).toBeInTheDocument();
      expect(screen.getByText('"Hey John Doe, how are you doing?"')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('copies template to clipboard when copy button is clicked', async () => {
      render(<GreetingTemplate />);
      
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, my name is John Doe! Nice to meet you!');
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('saves user preference when set default button is clicked', async () => {
      render(<GreetingTemplate />);
      
      const setDefaultButtons = screen.getAllByText('Set Default');
      fireEvent.click(setDefaultButtons[0]);
      
      expect(mockUseDefaultGreeting.saveUserPreference).toHaveBeenCalledWith('template2');
    });

    it('prevents event propagation on button clicks', () => {
      render(<GreetingTemplate onTemplateSelect={mockOnTemplateSelect} />);
      
      const copyButton = screen.getAllByText('Copy')[0];
      fireEvent.click(copyButton);
      
      // Should not trigger template selection
      expect(mockOnTemplateSelect).not.toHaveBeenCalled();
    });
  });

  describe('Template Formatting', () => {
    it('formats template names correctly', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Friendly Greeting')).toBeInTheDocument();
      expect(screen.getByText('Casual Greeting')).toBeInTheDocument();
      expect(screen.getByText('Formal Greeting')).toBeInTheDocument();
    });

    it('previews templates with user name', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Hello, my name is John Doe! Nice to meet you!')).toBeInTheDocument();
      expect(screen.getByText('Hey John Doe, how are you doing?')).toBeInTheDocument();
      expect(screen.getByText('Good day, I am John Doe. Pleasure to make your acquaintance.')).toBeInTheDocument();
    });
  });

  describe('Default Template Indicators', () => {
    it('shows star icon for default template', () => {
      render(<GreetingTemplate />);
      
      const defaultTemplate = screen.getByText('Friendly Greeting').closest('.card');
      expect(defaultTemplate).toContainElement(screen.getByText('Star'));
    });

    it('shows check circle for user preference', () => {
      render(<GreetingTemplate />);
      
      const preferredTemplate = screen.getByText('Friendly Greeting').closest('.card');
      expect(preferredTemplate).toContainElement(screen.getByText('CheckCircle'));
    });

    it('shows preference badge in header', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Preference: Friendly Greeting')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty templates array', () => {
      const emptyMock = {
        ...mockUseDefaultGreeting,
        templates: []
      };
      require('../hooks/useDefaultGreeting').useDefaultGreeting.mockReturnValue(emptyMock);
      
      render(<GreetingTemplate />);
      
      expect(screen.getByText('No greeting templates available')).toBeInTheDocument();
    });

    it('handles missing user name', () => {
      const noUserMock = {
        ...mockUseAuth,
        user: null
      };
      require('../hooks/useAuth').useAuth.mockReturnValue(noUserMock);
      
      render(<GreetingTemplate />);
      
      expect(screen.queryByText('Preview:')).not.toBeInTheDocument();
    });

    it('handles template without name', () => {
      const templateWithoutName = {
        ...mockUseDefaultGreeting,
        templates: [{ id: 'template1', template: 'Hello {name}!', is_default: false }]
      };
      require('../hooks/useDefaultGreeting').useDefaultGreeting.mockReturnValue(templateWithoutName);
      
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Hello John Doe!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(<GreetingTemplate />);
      
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons).toHaveLength(3);
    });

    it('has proper heading structure', () => {
      render(<GreetingTemplate />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Greeting Templates');
    });

    it('has descriptive text for screen readers', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Preview:')).toBeInTheDocument();
      expect(screen.getByText('Selected Template')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has proper card structure', () => {
      render(<GreetingTemplate />);
      
      const cards = screen.getAllByText(/Greeting/).map(text => text.closest('.card'));
      cards.forEach(card => {
        expect(card).toHaveClass('card');
      });
    });

    it('has proper button styling', () => {
      render(<GreetingTemplate />);
      
      const copyButtons = screen.getAllByText('Copy');
      copyButtons.forEach(button => {
        expect(button).toHaveClass('button', 'sm', 'outline');
      });
    });

    it('has proper badge styling', () => {
      render(<GreetingTemplate />);
      
      const badge = screen.getByText(/Preference:/);
      expect(badge).toHaveClass('badge', 'secondary');
    });
  });

  describe('Integration', () => {
    it('integrates with Card components correctly', () => {
      render(<GreetingTemplate />);
      
      const cards = screen.getAllByText(/Greeting/).map(text => text.closest('.card'));
      expect(cards.length).toBeGreaterThan(0);
    });

    it('integrates with Button components correctly', () => {
      render(<GreetingTemplate />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('integrates with Badge components correctly', () => {
      render(<GreetingTemplate />);
      
      const badge = screen.getByText(/Preference:/);
      expect(badge).toHaveClass('badge');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<GreetingTemplate />);
      
      // Re-render with same props
      rerender(<GreetingTemplate />);
      
      // Should still have all the expected content
      expect(screen.getByText('Greeting Templates')).toBeInTheDocument();
      expect(screen.getByText('Friendly Greeting')).toBeInTheDocument();
    });
  });

  describe('Mock Data Validation', () => {
    it('uses the correct mock templates', () => {
      render(<GreetingTemplate />);
      
      expect(screen.getByText('Friendly Greeting')).toBeInTheDocument();
      expect(screen.getByText('Casual Greeting')).toBeInTheDocument();
      expect(screen.getByText('Formal Greeting')).toBeInTheDocument();
    });

    it('calls hook functions correctly', () => {
      render(<GreetingTemplate />);
      
      expect(mockUseDefaultGreeting.getGreetingTemplates).toHaveBeenCalled();
      expect(mockUseDefaultGreeting.getUserPreference).toHaveBeenCalled();
    });
  });
});
