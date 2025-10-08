/**
 * Component Test: InstructorControls
 * 
 * Tests the InstructorControls component with React Testing Library
 * Validates media controls, keyboard shortcuts, mute all toggle, and participant management
 * 
 * WHY these tests:
 * - Ensure media controls (mic/camera) work correctly
 * - Verify keyboard shortcuts (M/C) function properly
 * - Confirm smart mute all toggle reflects real-time state
 * - Check participant muting functionality
 * - Validate breakout room button behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InstructorControls from '@/app/components/InstructorControls';
import { AppUser } from '@/lib/types';
import { Provider as JotaiProvider } from 'jotai';
import { DailyProvider } from '@daily-co/daily-react';
import Daily from '@daily-co/daily-js';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Daily object
const mockDaily = {
  participants: jest.fn(() => ({})),
  on: jest.fn(),
  off: jest.fn(),
  setLocalAudio: jest.fn(),
  setLocalVideo: jest.fn(),
  updateParticipant: jest.fn(),
} as unknown as ReturnType<typeof Daily.createCallObject>;

describe('InstructorControls Component', () => {
  const mockInstructor: AppUser = {
    sessionId: 'instructor-123',
    name: 'Test Instructor',
    role: 'instructor',
  };

  const mockProps = {
    instructor: mockInstructor,
    classroomId: 'classroom-1',
    enabled: true,
    onOpenBreakoutModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    mockDaily.participants.mockReturnValue({});
  });

  describe('Initial Render', () => {
    test('renders instructor controls panel', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Instructor Controls')).toBeInTheDocument();
    });

    test('does not render for non-instructor role', () => {
      const studentUser: AppUser = {
        ...mockInstructor,
        role: 'student',
      };
      
      const { container } = render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} instructor={studentUser} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(container).toBeEmptyDOMElement();
    });

    test('shows media control section', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('My Media Controls')).toBeInTheDocument();
    });

    test('shows student audio control section', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Student Audio Control')).toBeInTheDocument();
    });

    test('shows breakout room section', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Breakout Rooms')).toBeInTheDocument();
    });
  });

  describe('Media Controls', () => {
    test('renders microphone toggle button', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const micButton = screen.getByText(/mic/i);
      expect(micButton).toBeInTheDocument();
    });

    test('renders camera toggle button', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const cameraButton = screen.getByText(/camera/i);
      expect(cameraButton).toBeInTheDocument();
    });

    test('toggles microphone when clicked', async () => {
      mockDaily.setLocalAudio.mockResolvedValue(undefined);
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const micButton = screen.getByLabelText(/mute.*microphone/i);
      fireEvent.click(micButton);
      
      await waitFor(() => {
        expect(mockDaily.setLocalAudio).toHaveBeenCalled();
      });
    });

    test('toggles camera when clicked', async () => {
      mockDaily.setLocalVideo.mockResolvedValue(undefined);
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const cameraButton = screen.getByLabelText(/disable.*camera/i);
      fireEvent.click(cameraButton);
      
      await waitFor(() => {
        expect(mockDaily.setLocalVideo).toHaveBeenCalled();
      });
    });

    test('shows pending state during toggle', async () => {
      // Mock slow toggle
      mockDaily.setLocalAudio.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const micButton = screen.getByLabelText(/mute.*microphone/i);
      fireEvent.click(micButton);
      
      // Should show processing state
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    test('disables media controls when component is disabled', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} enabled={false} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const micButton = screen.getByLabelText(/microphone/i);
      const cameraButton = screen.getByLabelText(/camera/i);
      
      expect(micButton).toBeDisabled();
      expect(cameraButton).toBeDisabled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('microphone button shows "M" keyboard shortcut hint', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const micButton = screen.getByLabelText(/press m\)/i);
      expect(micButton).toHaveAttribute('aria-keyshortcuts', 'm');
    });

    test('camera button shows "C" keyboard shortcut hint', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const cameraButton = screen.getByLabelText(/press c\)/i);
      expect(cameraButton).toHaveAttribute('aria-keyshortcuts', 'c');
    });
  });

  describe('Smart Mute All Toggle', () => {
    test('shows "Mute All Students" when students are unmuted', () => {
      // Mock participants with audio enabled
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Student 1',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Mute All Students')).toBeInTheDocument();
    });

    test('shows "Unmute All Students" when all students are muted', () => {
      // Mock participants with audio disabled
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Student 1',
          audio: false,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Unmute All Students')).toBeInTheDocument();
    });

    test('calls mute all API when clicked', async () => {
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Student 1',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteAllButton = screen.getByText('Mute All Students');
      fireEvent.click(muteAllButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/participants/mute-all',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    test('shows participant count summary', () => {
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Student 1',
          audio: true,
          permissions: {},
        },
        'student-2': { 
          session_id: 'student-2',
          user_name: 'Student 2',
          audio: false,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Students: 2')).toBeInTheDocument();
    });

    test('disables mute all when no students present', () => {
      mockDaily.participants.mockReturnValue({});
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteAllButton = screen.getByText(/mute all students/i);
      expect(muteAllButton).toBeDisabled();
    });
  });

  describe('Individual Participant Controls', () => {
    test('shows list of students with individual mute buttons', () => {
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Mute')).toBeInTheDocument();
      expect(screen.getByText('Unmute')).toBeInTheDocument();
    });

    test('mutes individual participant when mute button clicked', async () => {
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/participants/student-1/mute',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Breakout Room Controls', () => {
    test('shows create breakout room button', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      expect(screen.getByText('Create Breakout Room')).toBeInTheDocument();
    });

    test('calls onOpenBreakoutModal when button clicked', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const breakoutButton = screen.getByText('Create Breakout Room');
      fireEvent.click(breakoutButton);
      
      expect(mockProps.onOpenBreakoutModal).toHaveBeenCalled();
    });

    test('disables breakout button when less than 2 students', () => {
      mockDaily.participants.mockReturnValue({});
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const breakoutButton = screen.getByText('Create Breakout Room');
      expect(breakoutButton).toBeDisabled();
    });

    test('disables breakout button when onOpenBreakoutModal is not provided', () => {
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} onOpenBreakoutModal={undefined} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const breakoutButton = screen.getByText('Create Breakout Room');
      expect(breakoutButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    test('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Failed to mute participant' }),
      });
      
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to mute participant/i)).toBeInTheDocument();
      });
    });

    test('allows dismissing error message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Error' }),
      });
      
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to mute/i)).toBeInTheDocument();
      });
      
      // Dismiss error
      const dismissButton = screen.getByText('×');
      fireEvent.click(dismissButton);
      
      // Error should be gone
      expect(screen.queryByText(/failed to mute/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows processing message during API call', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteButton = screen.getByText('Mute');
      fireEvent.click(muteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    test('disables controls during loading', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      mockDaily.participants.mockReturnValue({
        'student-1': { 
          session_id: 'student-1',
          user_name: 'Alice',
          audio: true,
          permissions: {},
        },
      });
      
      render(
        <JotaiProvider>
          <DailyProvider callObject={mockDaily}>
            <InstructorControls {...mockProps} />
          </DailyProvider>
        </JotaiProvider>
      );
      
      const muteAllButton = screen.getByText('Mute All Students');
      fireEvent.click(muteAllButton);
      
      // Button should be disabled during API call
      await waitFor(() => {
        expect(muteAllButton).toBeDisabled();
      });
    });
  });
});

