/**
 * Component Test: Input
 * 
 * Tests the Input component with React Testing Library
 * Validates rendering, user input, validation, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Input from '@/app/components/ui/Input';

describe('Input Component', () => {
  test('renders input field', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  test('accepts text input', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Test input' } });
    
    expect(input).toHaveValue('Test input');
  });

  test('renders with default value', () => {
    render(<Input defaultValue="Default text" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Default text');
  });

  test('renders with controlled value', () => {
    const { rerender } = render(<Input value="Initial" onChange={() => {}} />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveValue('Initial');

    rerender(<Input value="Updated" onChange={() => {}} />);
    input = screen.getByRole('textbox');
    expect(input).toHaveValue('Updated');
  });

  test('calls onChange handler', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('disables input when disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('renders with different input types', () => {
    const { rerender } = render(<Input type="text" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');

    rerender(<Input type="email" />);
    input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    // Password inputs don't have textbox role
    input = document.querySelector('input[type="password"]')!;
    expect(input).toHaveAttribute('type', 'password');
  });

  test('applies custom className', () => {
    render(<Input className="custom-input-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input-class');
  });

  test('renders with placeholder', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  test('supports maxLength attribute', () => {
    render(<Input maxLength={10} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '10');
  });

  test('supports required attribute', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  test('has correct base styling', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    
    // Check for base Tailwind classes
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveClass('bg-gray-800');
  });

  test('handles focus events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  test('supports ref forwarding', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).not.toBeNull();
  });

  test('renders with aria-label for accessibility', () => {
    render(<Input aria-label="User name input" />);
    const input = screen.getByLabelText('User name input');
    expect(input).toBeInTheDocument();
  });

  test('handles keyboard events', () => {
    const handleKeyDown = jest.fn();
    render(<Input onKeyDown={handleKeyDown} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
  });

  test('clears input value', () => {
    render(<Input defaultValue="Initial value" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '' } });
    
    expect(input.value).toBe('');
  });

  test('handles paste events', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'Pasted text',
      },
    });
    
    // Input should still be interactive after paste
    fireEvent.change(input, { target: { value: 'Pasted text' } });
    expect(input).toHaveValue('Pasted text');
  });
});

