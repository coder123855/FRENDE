import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserCard from '../UserCard';

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
  Heart: () => <span>❤</span>,
  MapPin: () => <span>📍</span>,
  Users: () => <span>👥</span>,
  Send: () => <span>📤</span>,
  Eye: () => <span>👁</span>,
  Loader2: () => <span>⏳</span>
}));

const mockUser = {
  id: 1,
  name: 'John Doe',
  age: 25,
  profession: 'Software Engineer',
  profile_picture: null,
  location: 'San Francisco',
  community: 'Tech',
  profile_text: 'I love coding and hiking in my free time. Always looking to meet new people and learn new things!'
};

const mockProps = {
  user: mockUser,
  compatibilityScore: 85,
  commonInterests: ['coding', 'hiking', 'coffee'],
  onSendRequest: jest.fn(),
  onViewProfile: jest.fn(),
  loading: false,
  disabled: false
};

describe('UserCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information correctly', () => {
    render(<UserCard {...mockProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('25 years old')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('displays common interests', () => {
    render(<UserCard {...mockProps} />);

    expect(screen.getByText('Common interests:')).toBeInTheDocument();
    expect(screen.getByText('coding')).toBeInTheDocument();
    expect(screen.getByText('hiking')).toBeInTheDocument();
    expect(screen.getByText('coffee')).toBeInTheDocument();
  });

  it('displays profile text preview', () => {
    render(<UserCard {...mockProps} />);

    expect(screen.getByText(/I love coding and hiking in my free time/)).toBeInTheDocument();
  });

  it('calls onSendRequest when Send Request button is clicked', () => {
    render(<UserCard {...mockProps} />);

    const sendRequestButton = screen.getByText('Send Request');
    fireEvent.click(sendRequestButton);

    expect(mockProps.onSendRequest).toHaveBeenCalledWith(mockUser.id);
  });

  it('calls onViewProfile when View button is clicked', () => {
    render(<UserCard {...mockProps} />);

    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);

    expect(mockProps.onViewProfile).toHaveBeenCalledWith(mockUser.id);
  });

  it('shows loading state when loading is true', () => {
    render(<UserCard {...mockProps} loading={true} />);

    expect(screen.getByText('Send Request')).toBeInTheDocument();
    // Check for loading spinner
    expect(screen.getByRole('button', { name: /Send Request/i })).toBeDisabled();
  });

  it('disables buttons when disabled is true', () => {
    render(<UserCard {...mockProps} disabled={true} />);

    const sendRequestButton = screen.getByRole('button', { name: /Send Request/i });
    const viewButton = screen.getByRole('button', { name: /View/i });

    expect(sendRequestButton).toBeDisabled();
    expect(viewButton).toBeDisabled();
  });

  it('handles missing user data gracefully', () => {
    const userWithMissingData = {
      id: 2,
      name: 'Jane Smith',
      age: null,
      profession: null,
      profile_picture: null,
      location: null,
      community: null,
      profile_text: null
    };

    render(<UserCard {...mockProps} user={userWithMissingData} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('years old')).not.toBeInTheDocument();
    expect(screen.queryByText('Common interests:')).not.toBeInTheDocument();
  });

  it('displays correct compatibility level based on score', () => {
    const { rerender } = render(<UserCard {...mockProps} compatibilityScore={95} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    rerender(<UserCard {...mockProps} compatibilityScore={70} />);
    expect(screen.getByText('Good')).toBeInTheDocument();

    rerender(<UserCard {...mockProps} compatibilityScore={50} />);
    expect(screen.getByText('Fair')).toBeInTheDocument();

    rerender(<UserCard {...mockProps} compatibilityScore={30} />);
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('shows avatar fallback when no profile picture', () => {
    render(<UserCard {...mockProps} />);

    // Check for avatar fallback with initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('limits common interests display to 3 with overflow indicator', () => {
    const manyInterests = ['coding', 'hiking', 'coffee', 'reading', 'gaming', 'travel'];
    render(<UserCard {...mockProps} commonInterests={manyInterests} />);

    expect(screen.getByText('coding')).toBeInTheDocument();
    expect(screen.getByText('hiking')).toBeInTheDocument();
    expect(screen.getByText('coffee')).toBeInTheDocument();
    expect(screen.getByText('+3 more')).toBeInTheDocument();
    expect(screen.queryByText('reading')).not.toBeInTheDocument();
  });
}); 