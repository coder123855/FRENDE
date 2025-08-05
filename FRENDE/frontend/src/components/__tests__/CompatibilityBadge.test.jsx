import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompatibilityBadge from '../CompatibilityBadge';

describe('CompatibilityBadge', () => {
  it('renders compatibility score correctly', () => {
    render(<CompatibilityBadge score={85} />);
    
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('displays correct compatibility level for different scores', () => {
    const { rerender } = render(<CompatibilityBadge score={95} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    rerender(<CompatibilityBadge score={75} />);
    expect(screen.getByText('Good')).toBeInTheDocument();

    rerender(<CompatibilityBadge score={55} />);
    expect(screen.getByText('Fair')).toBeInTheDocument();

    rerender(<CompatibilityBadge score={25} />);
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<CompatibilityBadge score={80} size="sm" />);
    const badge = screen.getByText('80%').closest('div').parentElement;
    expect(badge).toHaveClass('text-xs px-2 py-1');

    rerender(<CompatibilityBadge score={80} size="lg" />);
    expect(badge).toHaveClass('text-base px-4 py-2');

    rerender(<CompatibilityBadge score={80} size="default" />);
    expect(badge).toHaveClass('text-sm px-3 py-1');
  });

  it('hides icon when showIcon is false', () => {
    render(<CompatibilityBadge score={80} showIcon={false} />);
    
    // Should still show the score
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('hides level when showLevel is false', () => {
    render(<CompatibilityBadge score={80} showLevel={false} />);
    
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.queryByText('Excellent')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CompatibilityBadge score={80} className="custom-class" />);
    
    const container = screen.getByText('80%').closest('div').parentElement.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('applies correct color classes based on score', () => {
    const { rerender } = render(<CompatibilityBadge score={90} />);
    const badge = screen.getByText('90%').closest('div').parentElement;
    expect(badge).toHaveClass('bg-green-500');

    rerender(<CompatibilityBadge score={70} />);
    expect(badge).toHaveClass('bg-yellow-500');

    rerender(<CompatibilityBadge score={50} />);
    expect(badge).toHaveClass('bg-orange-500');

    rerender(<CompatibilityBadge score={30} />);
    expect(badge).toHaveClass('bg-red-500');
  });

  it('applies correct level color classes', () => {
    const { rerender } = render(<CompatibilityBadge score={90} />);
    const levelText = screen.getByText('Excellent');
    expect(levelText).toHaveClass('text-green-600');

    rerender(<CompatibilityBadge score={70} />);
    expect(levelText).toHaveClass('text-yellow-600');

    rerender(<CompatibilityBadge score={50} />);
    expect(levelText).toHaveClass('text-orange-600');

    rerender(<CompatibilityBadge score={30} />);
    expect(levelText).toHaveClass('text-red-600');
  });

  it('renders with default props correctly', () => {
    render(<CompatibilityBadge score={75} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('handles edge case scores', () => {
    const { rerender } = render(<CompatibilityBadge score={100} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    rerender(<CompatibilityBadge score={0} />);
    expect(screen.getByText('Poor')).toBeInTheDocument();

    rerender(<CompatibilityBadge score={40} />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });
}); 