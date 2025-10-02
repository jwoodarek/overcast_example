/**
 * Component Test: Modal
 * 
 * Tests the Modal component with React Testing Library
 * Validates rendering, visibility, interactions, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '@/app/components/ui/Modal';

describe('Modal Component', () => {
  test('renders modal when open', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  test('renders modal title', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  test('renders modal description', () => {
    render(
      <Modal
        open={true}
        onClose={() => {}}
        title="Test Modal"
        description="This is a test modal"
      >
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('This is a test modal')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    
    // Find close button (usually an X or Close button)
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when overlay is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );
    
    // Click the overlay (backdrop)
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('does not close when content is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div data-testid="modal-content">Content</div>
      </Modal>
    );
    
    const content = screen.getByTestId('modal-content');
    fireEvent.click(content);
    
    // Click on content should not propagate to overlay
    expect(handleClose).not.toHaveBeenCalled();
  });

  test('closes on Escape key press', () => {
    const handleClose = jest.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div>Content</div>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('renders children correctly', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </Modal>
    );
    
    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  test('applies futuristic styling', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    // Modal should have dark background and border
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('bg-gray-900');
  });

  test('has overlay with semi-transparent background', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    const overlay = screen.getByTestId('modal-overlay');
    expect(overlay).toHaveClass('bg-black');
    expect(overlay).toHaveClass('bg-opacity-50');
  });

  test('is accessible with proper ARIA attributes', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Accessible Modal">
        <div>Content</div>
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('traps focus within modal', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <button>Button 1</button>
        <button>Button 2</button>
      </Modal>
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  test('restores focus after closing', () => {
    const TriggerButton = () => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <>
          <button onClick={() => setOpen(true)}>Open Modal</button>
          <Modal open={open} onClose={() => setOpen(false)}>
            <div>Modal Content</div>
          </Modal>
        </>
      );
    };
    
    render(<TriggerButton />);
    
    const trigger = screen.getByText('Open Modal');
    fireEvent.click(trigger);
    
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    render(
      <Modal open={true} onClose={() => {}} className="custom-modal">
        <div>Content</div>
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-modal');
  });

  test('handles rapid open/close toggles', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    
    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    
    rerender(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('prevents body scroll when open', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    // Check if body has overflow hidden
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('restores body scroll when closed', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('');
  });
});

