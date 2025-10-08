/**
 * AlertPanel Component
 * 
 * Displays help alerts for instructors in real-time.
 * Polls for new alerts every 2 seconds and shows them sorted by urgency.
 * 
 * WHY polling:
 * - Simple for MVP (no SSE or WebSocket infrastructure)
 * - 2-second polling acceptable latency (<5s alert requirement)
 * - Easy to upgrade to SSE later (just change fetch to EventSource)
 * 
 * WHY color coding by urgency:
 * - Red (high) = immediate attention needed
 * - Yellow (medium) = should address soon
 * - Gray (low) = can wait, low priority
 * - Visual hierarchy helps instructors prioritize
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { HelpAlert } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { Button } from './ui';

interface AlertPanelProps {
  /** Classroom session ID to monitor */
  classroomSessionId: string;
  /** Instructor ID for acknowledging/resolving alerts */
  instructorId: string;
  /** Whether to show only pending alerts or all */
  showOnlyPending?: boolean;
}

/**
 * Alert counts by status
 */
interface AlertCounts {
  pending: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
  total: number;
}

export default function AlertPanel({
  classroomSessionId,
  instructorId,
  showOnlyPending = true,
}: AlertPanelProps) {
  const [alerts, setAlerts] = useState<HelpAlert[]>([]);
  const [counts, setCounts] = useState<AlertCounts>({
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    dismissed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

  /**
   * Fetch alerts from API.
   * 
   * WHY useCallback:
   * - Prevents unnecessary re-renders
   * - Stable function reference for useEffect dependency
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const statusFilter = showOnlyPending ? '?status=pending' : '';
      const response = await fetch(
        `/api/alerts/${classroomSessionId}${statusFilter}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setCounts(data.counts || {
        pending: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
        total: 0,
      });
      setError(null);
    } catch (err) {
      console.error('[AlertPanel] Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [classroomSessionId, showOnlyPending]);

  /**
   * Set up polling for new alerts.
   * 
   * WHY 2-second interval:
   * - Fast enough for real-time feel (<5s requirement)
   * - Not too frequent to overload server
   * - Balance between responsiveness and efficiency
   */
  useEffect(() => {
    // Initial fetch
    fetchAlerts();

    // Set up polling
    const interval = setInterval(fetchAlerts, 2000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  /**
   * Update alert status (acknowledge, resolve, dismiss).
   */
  const updateAlertStatus = async (
    alertId: string,
    status: 'acknowledged' | 'resolved' | 'dismissed'
  ) => {
    setUpdatingAlertId(alertId);

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId,
          status,
          instructorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update alert');
      }

      // Refresh alerts after update
      await fetchAlerts();
    } catch (err) {
      console.error('[AlertPanel] Error updating alert:', err);
      alert(err instanceof Error ? err.message : 'Failed to update alert');
    } finally {
      setUpdatingAlertId(null);
    }
  };

  /**
   * Get color classes based on urgency.
   * 
   * WHY color coding:
   * - Immediate visual priority indication
   * - Reduces cognitive load (color = urgency)
   * - Consistent with common UI patterns (red = urgent)
   */
  const getUrgencyColor = (urgency: HelpAlert['urgency']) => {
    switch (urgency) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-4 border-gray-400 bg-gray-50';
    }
  };

  /**
   * Get urgency badge color.
   */
  const getUrgencyBadgeColor = (urgency: HelpAlert['urgency']) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Format timestamp for display.
   */
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  // Loading state
  if (loading && alerts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Help Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && alerts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Help Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchAlerts} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Help Alerts</span>
            <span className="text-sm font-normal text-gray-500">
              {counts.total} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            {showOnlyPending 
              ? 'No pending alerts. All students doing well! 🎉'
              : 'No alerts for this session yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Main render with alerts
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Help Alerts</span>
          <div className="flex gap-2 text-sm font-normal">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
              {counts.pending} pending
            </span>
            <span className="text-gray-500">
              {counts.total} total
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg ${getUrgencyColor(alert.urgency)}`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyBadgeColor(
                      alert.urgency
                    )}`}
                  >
                    {alert.urgency.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatTime(alert.detectedAt)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {alert.status}
                </span>
              </div>

              {/* Breakout Room Name */}
              {alert.breakoutRoomName && (
                <div className="text-sm font-semibold text-gray-700 mb-1">
                  📍 {alert.breakoutRoomName}
                </div>
              )}

              {/* Topic */}
              <div className="text-base font-semibold text-gray-900 mb-2">
                Topic: {alert.topic}
              </div>

              {/* Context Snippet */}
              <div className="text-sm text-gray-700 mb-2 italic">
                &ldquo;{alert.contextSnippet}&rdquo;
              </div>

              {/* Trigger Keywords */}
              <div className="flex flex-wrap gap-1 mb-3">
                {alert.triggerKeywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-white rounded border border-gray-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              {alert.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                    disabled={updatingAlertId === alert.id}
                    variant="secondary"
                    size="sm"
                  >
                    {updatingAlertId === alert.id ? 'Updating...' : 'Acknowledge'}
                  </Button>
                  <Button
                    onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    disabled={updatingAlertId === alert.id}
                    variant="primary"
                    size="sm"
                  >
                    {updatingAlertId === alert.id ? 'Updating...' : 'Resolve'}
                  </Button>
                  <Button
                    onClick={() => updateAlertStatus(alert.id, 'dismissed')}
                    disabled={updatingAlertId === alert.id}
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {alert.status === 'acknowledged' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    disabled={updatingAlertId === alert.id}
                    variant="primary"
                    size="sm"
                  >
                    {updatingAlertId === alert.id ? 'Updating...' : 'Mark Resolved'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

