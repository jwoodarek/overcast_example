/**
 * Component Test: LoadingSpinner
 * 
 * Tests the LoadingSpinner component with React Testing Library
 * Validates rendering, sizing, text display, and styling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders spinner', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
  });

  test('renders with default text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom text', () => {
    render(<LoadingSpinner text="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  test('renders without text when text prop is empty', () => {
    render(<LoadingSpinner text="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  test('renders with medium (default) size', () => {
    render(<LoadingSpinner size="md" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  test('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  test('renders with extra large size', () => {
    render(<LoadingSpinner size="xl" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-16', 'h-16');
  });

  test('applies futuristic teal color', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('border-[#00FFD1]');
  });

  test('has spinning animation', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin');
  });

  test('is circular', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('rounded-full');
  });

  test('centers content by default', () => {
    render(<LoadingSpinner />);
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  test('renders full screen when fullScreen prop is true', () => {
    render(<LoadingSpinner fullScreen />);
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('min-h-screen');
  });

  test('renders inline when fullScreen is false', () => {
    render(<LoadingSpinner fullScreen={false} />);
    const container = screen.getByTestId('loading-container');
    expect(container).not.toHaveClass('min-h-screen');
  });

  test('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('custom-spinner');
  });

  test('renders with accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  test('renders multiple spinners independently', () => {
    render(
      <>
        <LoadingSpinner text="Spinner 1" />
        <LoadingSpinner text="Spinner 2" />
      </>
    );
    
    expect(screen.getByText('Spinner 1')).toBeInTheDocument();
    expect(screen.getByText('Spinner 2')).toBeInTheDocument();
    
    const spinners = screen.getAllByTestId('loading-spinner');
    expect(spinners).toHaveLength(2);
  });

  test('renders with different sizes simultaneously', () => {
    render(
      <>
        <LoadingSpinner size="sm" text="Small" />
        <LoadingSpinner size="lg" text="Large" />
      </>
    );
    
    const spinners = screen.getAllByTestId('loading-spinner');
    expect(spinners[0]).toHaveClass('w-4', 'h-4');
    expect(spinners[1]).toHaveClass('w-12', 'h-12');
  });

  test('text appears below spinner', () => {
    const { container } = render(<LoadingSpinner text="Loading data..." />);
    
    const loadingContainer = screen.getByTestId('loading-container');
    expect(loadingContainer).toHaveClass('flex-col');
    
    const spinner = screen.getByTestId('loading-spinner');
    const text = screen.getByText('Loading data...');
    
    // Spinner should come before text in DOM order
    const children = Array.from(loadingContainer.children);
    const spinnerIndex = children.indexOf(spinner.parentElement as Element);
    const textIndex = children.indexOf(text);
    
    expect(spinnerIndex).toBeLessThan(textIndex);
  });

  test('has proper spacing between spinner and text', () => {
    render(<LoadingSpinner text="Loading..." />);
    const text = screen.getByText('Loading...');
    expect(text).toHaveClass('mt-4');
  });

  test('text has appropriate styling', () => {
    render(<LoadingSpinner text="Loading data..." />);
    const text = screen.getByText('Loading data...');
    expect(text).toHaveClass('text-gray-300');
  });

  test('renders consistently across re-renders', () => {
    const { rerender } = render(<LoadingSpinner text="Initial" />);
    expect(screen.getByText('Initial')).toBeInTheDocument();
    
    rerender(<LoadingSpinner text="Updated" />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.queryByText('Initial')).not.toBeInTheDocument();
  });

  test('maintains animation during updates', () => {
    const { rerender } = render(<LoadingSpinner text="Loading..." />);
    let spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin');
    
    rerender(<LoadingSpinner text="Still loading..." />);
    spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin');
  });

  test('is visible by default', () => {
    render(<LoadingSpinner />);
    const container = screen.getByTestId('loading-container');
    expect(container).toBeVisible();
  });
});

