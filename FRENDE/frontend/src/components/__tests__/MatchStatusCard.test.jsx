import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchStatusCard from '../MatchStatusCard';

// Mock UI components
jest.mock('../ui/card', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children, className }) => <h3 className={className}>{children}</h3>
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, disabled }) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size} disabled={disabled}>
      {children}
    </button>
  )
}));

jest.mock('../ui/avatar', () => ({
  Avatar: ({ children, className }) => <div className={className}>{children}</div>,
  AvatarImage: ({ src }) => <img src={src} alt="avatar" />,
  AvatarFallback: ({ children }) => <div>{children}</div>
}));

jest.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  )
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <span>✓</span>,
  XCircle: () => <span>✗</span>,
  Trash2: () => <span>🗑</span>,
  MessageCircle: () => <span>💬</span>,
  Heart: () => <span>❤</span>,
  Clock: () => <span>⏰</span>,
  AlertTriangle: () => <span>⚠</span>
}));

// Mock the ExpirationTimer component
jest.mock('../ExpirationTimer', () => {
  return function MockExpirationTimer({ expiresAt, onExpired }) {
    return <div data-testid="expiration-timer">Expires: {expiresAt}</div>;
  };
});

describe('MatchStatusCard', () => {
  const mockMatch = {
    id: 1,
    status: 'pending',
    compatibility_score: 85,
    expires_at: '2024-01-16T10:30:00Z',
    user1: {
      name: 'John Doe',
      profession: 'Software Developer',
      interests: ['coding', 'gaming', 'hiking'],
      profile_picture: null
    }
  };

  const defaultProps = {
    match: mockMatch,
    onAccept: jest.fn(),
    onReject: jest.fn(),
    onDelete: jest.fn(),
    onChat: jest.fn(),
  };

  it('renders match information correctly', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Developer')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Compatibility')).toBeInTheDocument();
  });

  it('shows pending status badge', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows active status badge', () => {
    const activeMatch = { ...mockMatch, status: 'active' };
    render(<MatchStatusCard {...defaultProps} match={activeMatch} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows expired status badge', () => {
    const expiredMatch = { ...mockMatch, status: 'expired' };
    render(<MatchStatusCard {...defaultProps} match={expiredMatch} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows expiration timer for pending matches', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    expect(screen.getByTestId('expiration-timer')).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);
    
    expect(defaultProps.onAccept).toHaveBeenCalledWith(1);
  });

  it('calls onReject when decline button is clicked', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    const declineButton = screen.getByText('Decline');
    fireEvent.click(declineButton);
    
    expect(defaultProps.onReject).toHaveBeenCalledWith(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith(1);
  });

  it('shows chat button for active matches', () => {
    const activeMatch = { ...mockMatch, status: 'active' };
    render(<MatchStatusCard {...defaultProps} match={activeMatch} />);
    
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('calls onChat when chat button is clicked', () => {
    const activeMatch = { ...mockMatch, status: 'active' };
    render(<MatchStatusCard {...defaultProps} match={activeMatch} />);
    
    const chatButton = screen.getByText('Chat');
    fireEvent.click(chatButton);
    
    expect(defaultProps.onChat).toHaveBeenCalledWith(1);
  });

  it('displays interests correctly', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    expect(screen.getByText('coding')).toBeInTheDocument();
    expect(screen.getByText('gaming')).toBeInTheDocument();
    expect(screen.getByText('hiking')).toBeInTheDocument();
  });

  it('shows compatibility score with correct color', () => {
    render(<MatchStatusCard {...defaultProps} />);
    
    const compatibilityScore = screen.getByText('85%');
    expect(compatibilityScore).toHaveClass('text-green-600');
  });
}); 