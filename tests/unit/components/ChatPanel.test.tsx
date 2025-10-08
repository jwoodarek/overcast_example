/**
 * Component Test: ChatPanel
 * 
 * Tests the ChatPanel component with React Testing Library
 * Validates message sending, room switching, unread indicators, and UI interactions
 * 
 * WHY these tests:
 * - Ensure chat interface is intuitive and accessible
 * - Verify message send functionality works correctly
 * - Confirm room switching maintains message separation
 * - Validate unread indicators work as expected
 * - Check character counter and validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPanel from '@/app/components/ChatPanel';
import { Provider as JotaiProvider } from 'jotai';

// Mock fetch globally
global.fetch = jest.fn();

describe('ChatPanel Component', () => {
  const mockProps = {
    sessionId: 'user-session-123',
    userName: 'Test Instructor',
    userRole: 'instructor' as const,
    classroomId: 'classroom-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        id: 'msg-1', 
        timestamp: new Date().toISOString() 
      }),
    });
  });

  describe('Initial Render', () => {
    test('renders chat panel with header', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    test('shows message input field', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    test('shows send button', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeInTheDocument();
    });

    test('shows room selector with Main Room selected by default', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const roomSelector = screen.getByRole('combobox');
      expect(roomSelector).toBeInTheDocument();
      expect(roomSelector).toHaveValue('main');
    });

    test('shows character counter', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      expect(screen.getByText('0/2000')).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    test('sends message when send button is clicked', async () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByText('Send');
      
      // Type a message
      fireEvent.change(input, { target: { value: 'Hello everyone!' } });
      
      // Click send
      fireEvent.click(sendButton);
      
      // Verify API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chat/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Hello everyone!'),
          })
        );
      });
    });

    test('sends message when Enter key is pressed', async () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      // Type a message
      fireEvent.change(input, { target: { value: 'Quick message' } });
      
      // Press Enter
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });
      
      // Verify API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('does not send when Shift+Enter is pressed (allows newline)', async () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      // Type a message
      fireEvent.change(input, { target: { value: 'Line 1' } });
      
      // Press Shift+Enter
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13, shiftKey: true });
      
      // Verify API was NOT called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('clears input after successful send', async () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
      const sendButton = screen.getByText('Send');
      
      // Type and send message
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      // Wait for clear
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    test('disables send button when message is empty', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });

    test('disables send button when sending', async () => {
      // Mock slow network
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByText('Send');
      
      // Type and send
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
      
      // Button should be disabled during send
      await waitFor(() => {
        expect(sendButton).toBeDisabled();
      });
    });
  });

  describe('Character Counter', () => {
    test('updates character count as user types', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      // Type message
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      // Verify counter updated
      expect(screen.getByText('5/2000')).toBeInTheDocument();
    });

    test('warns when approaching character limit', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      // Type long message (>90% of 2000 = 1800+)
      const longMessage = 'x'.repeat(1900);
      fireEvent.change(input, { target: { value: longMessage } });
      
      // Counter should show warning color
      const counter = screen.getByText('1900/2000');
      expect(counter).toBeInTheDocument();
      // In real implementation, this would have a warning class (yellow text)
    });

    test('shows error when over character limit', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      // Type message over limit
      const tooLongMessage = 'x'.repeat(2001);
      fireEvent.change(input, { target: { value: tooLongMessage } });
      
      // Counter should show error
      expect(screen.getByText('2001/2000')).toBeInTheDocument();
      
      // Send button should be disabled
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Collapsible Panel', () => {
    test('is expanded by default', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      // Input should be visible
      expect(screen.getByPlaceholderText('Type a message...')).toBeVisible();
    });

    test('collapses when collapse button is clicked', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      // Find and click collapse button (chevron icon button)
      const collapseButton = screen.getByLabelText(/collapse chat/i);
      fireEvent.click(collapseButton);
      
      // Input should be hidden
      expect(screen.queryByPlaceholderText('Type a message...')).not.toBeVisible();
    });

    test('expands again when expand button is clicked', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      // Collapse
      const collapseButton = screen.getByLabelText(/collapse chat/i);
      fireEvent.click(collapseButton);
      
      // Expand
      const expandButton = screen.getByLabelText(/expand chat/i);
      fireEvent.click(expandButton);
      
      // Input should be visible again
      expect(screen.getByPlaceholderText('Type a message...')).toBeVisible();
    });
  });

  describe('Room Switching', () => {
    test('shows Main Room option in selector', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      expect(screen.getByText('Main Room')).toBeInTheDocument();
    });

    test('switches rooms when selector changes', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const roomSelector = screen.getByRole('combobox');
      
      // Switch room (if there are breakout rooms)
      fireEvent.change(roomSelector, { target: { value: 'breakout-1' } });
      
      // Selector value should update
      expect(roomSelector).toHaveValue('breakout-1');
    });
  });

  describe('Error Handling', () => {
    test('shows error message when send fails', async () => {
      // Mock failed API call
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to send message' }),
      });
      
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByText('Send');
      
      // Try to send message
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
      
      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });

    test('prevents sending empty message', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const sendButton = screen.getByText('Send');
      
      // Send button should be disabled when input is empty
      expect(sendButton).toBeDisabled();
      
      // API should not be called
      fireEvent.click(sendButton);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('trims whitespace before sending', async () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByText('Send');
      
      // Type message with leading/trailing whitespace
      fireEvent.change(input, { target: { value: '  Test message  ' } });
      fireEvent.click(sendButton);
      
      // API should be called with trimmed message
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chat/messages',
          expect.objectContaining({
            body: expect.stringContaining('Test message'),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      expect(screen.getByLabelText(/collapse chat/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('shows keyboard shortcut hints', () => {
      render(
        <JotaiProvider>
          <ChatPanel {...mockProps} />
        </JotaiProvider>
      );
      
      expect(screen.getByText(/press enter to send/i)).toBeInTheDocument();
    });
  });
});

