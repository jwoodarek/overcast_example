/**
 * Component Test: AlertPanel
 * 
 * Tests the AlertPanel component with React Testing Library
 * Validates rendering, sorting, API interactions, and polling behavior
 * 
 * WHY these tests:
 * - Ensure alerts display correctly in all states (loading, error, empty, with data)
 * - Verify sorting by urgency (high → medium → low)
 * - Confirm action buttons trigger proper API calls
 * - Validate polling behavior for real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertPanel from '@/app/components/AlertPanel';
import { HelpAlert } from '@/lib/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('AlertPanel Component', () => {
  const mockClassroomSessionId = 'test-classroom-123';
  const mockInstructorId = 'instructor-456';

  const mockAlert: HelpAlert = {
    id: 'alert-1',
    classroomSessionId: mockClassroomSessionId,
    breakoutRoomSessionId: 'breakout-1',
    breakoutRoomName: 'Group 1',
    detectedAt: new Date('2025-10-07T12:00:00Z'),
    topic: 'Derivatives',
    urgency: 'high',
    triggerKeywords: ['stuck', 'confused'],
    contextSnippet: 'I am really stuck on this derivative problem and confused about the chain rule.',
    status: 'pending',
    acknowledgedBy: null,
    acknowledgedAt: null,
    sourceTranscriptIds: ['transcript-1', 'transcript-2'],
  };

  const mockAlerts: HelpAlert[] = [
    mockAlert,
    {
      ...mockAlert,
      id: 'alert-2',
      urgency: 'medium',
      topic: 'Integrals',
      status: 'pending',
    },
    {
      ...mockAlert,
      id: 'alert-3',
      urgency: 'low',
      topic: 'Limits',
      status: 'acknowledged',
      acknowledgedBy: mockInstructorId,
      acknowledgedAt: new Date('2025-10-07T12:05:00Z'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        alerts: mockAlerts,
        counts: {
          pending: 2,
          acknowledged: 1,
          resolved: 0,
          dismissed: 0,
          total: 3,
        },
      }),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering States', () => {
    test('renders loading state initially', () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    });

    test('renders error state when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('renders empty state when no alerts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alerts: [],
          counts: {
            pending: 0,
            acknowledged: 0,
            resolved: 0,
            dismissed: 0,
            total: 0,
          },
        }),
      });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No pending alerts/)).toBeInTheDocument();
      });
    });

    test('renders alerts with correct content', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Derivatives/)).toBeInTheDocument();
      });

      expect(screen.getAllByText(/Group 1/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/stuck/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/confused/)[0]).toBeInTheDocument();
    });
  });

  describe('Alert Sorting and Display', () => {
    test('displays urgency badges with correct colors', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
      });

      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    test('shows alert counts in header', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('2 pending')).toBeInTheDocument();
      });

      expect(screen.getByText('3 total')).toBeInTheDocument();
    });

    test('displays breakout room names when present', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Group 1/)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    test('shows action buttons for pending alerts', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
      });

      expect(screen.getAllByText('Resolve')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Dismiss')[0]).toBeInTheDocument();
    });

    test('acknowledge button triggers API call', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'alert-1',
            status: 'acknowledged',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 1,
              acknowledged: 2,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getAllByText('Acknowledge')[0];
      fireEvent.click(acknowledgeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              alertId: 'alert-1',
              status: 'acknowledged',
              instructorId: mockInstructorId,
            }),
          })
        );
      });
    });

    test('resolve button triggers API call', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'alert-1',
            status: 'resolved',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: [],
            counts: {
              pending: 1,
              acknowledged: 1,
              resolved: 1,
              dismissed: 0,
              total: 3,
            },
          }),
        });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Resolve')[0]).toBeInTheDocument();
      });

      const resolveButton = screen.getAllByText('Resolve')[0];
      fireEvent.click(resolveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              alertId: 'alert-1',
              status: 'resolved',
              instructorId: mockInstructorId,
            }),
          })
        );
      });
    });

    test('dismiss button triggers API call', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'alert-1',
            status: 'dismissed',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: [],
            counts: {
              pending: 1,
              acknowledged: 1,
              resolved: 0,
              dismissed: 1,
              total: 3,
            },
          }),
        });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Dismiss')[0]).toBeInTheDocument();
      });

      const dismissButton = screen.getAllByText('Dismiss')[0];
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/alerts',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              alertId: 'alert-1',
              status: 'dismissed',
              instructorId: mockInstructorId,
            }),
          })
        );
      });
    });

    test('disables button while processing action', async () => {
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        })
        .mockImplementationOnce(() => updatePromise);

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getAllByText('Acknowledge')[0] as HTMLButtonElement;
      fireEvent.click(acknowledgeButton);

      // Button should be disabled while updating
      await waitFor(() => {
        expect(acknowledgeButton).toBeDisabled();
      });

      // Resolve the update
      resolveUpdate!({
        ok: true,
        json: async () => ({ id: 'alert-1', status: 'acknowledged' }),
      });
    });

    test('shows only resolve button for acknowledged alerts', async () => {
      const acknowledgedAlerts: HelpAlert[] = [
        {
          ...mockAlert,
          status: 'acknowledged',
          acknowledgedBy: mockInstructorId,
          acknowledgedAt: new Date(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alerts: acknowledgedAlerts,
          counts: {
            pending: 0,
            acknowledged: 1,
            resolved: 0,
            dismissed: 0,
            total: 1,
          },
        }),
      });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
          showOnlyPending={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Mark Resolved')).toBeInTheDocument();
      });

      // Should not show acknowledge or dismiss buttons
      expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });
  });

  describe('Polling Behavior', () => {
    test('polls for new alerts every 2 seconds', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      // Initial fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance 2 seconds
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance another 2 seconds
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });

    test('cleans up polling on unmount', async () => {
      const { unmount } = render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time after unmount
      jest.advanceTimersByTime(10000);

      // Should not have called fetch again
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('fetches with correct status filter when showOnlyPending is true', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
          showOnlyPending={true}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/alerts/${mockClassroomSessionId}?status=pending`
        );
      });
    });

    test('fetches without status filter when showOnlyPending is false', async () => {
      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
          showOnlyPending={false}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/alerts/${mockClassroomSessionId}`
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      });
    });

    test('retry button refetches alerts', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Derivatives/)).toBeInTheDocument();
      });
    });

    test('shows alert when update fails', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            alerts: mockAlerts,
            counts: {
              pending: 2,
              acknowledged: 1,
              resolved: 0,
              dismissed: 0,
              total: 3,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            message: 'Failed to update alert',
          }),
        });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getAllByText('Acknowledge')[0];
      fireEvent.click(acknowledgeButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to update alert');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Time Formatting', () => {
    test('shows "just now" for recent alerts', async () => {
      const recentAlert: HelpAlert = {
        ...mockAlert,
        detectedAt: new Date(Date.now() - 30000), // 30 seconds ago
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alerts: [recentAlert],
          counts: {
            pending: 1,
            acknowledged: 0,
            resolved: 0,
            dismissed: 0,
            total: 1,
          },
        }),
      });

      render(
        <AlertPanel
          classroomSessionId={mockClassroomSessionId}
          instructorId={mockInstructorId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/just now/)).toBeInTheDocument();
      });
    });
  });
});

