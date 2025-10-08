/**
 * AlertPanel Component
 * 
 * Prominent modal/popup system for displaying help alerts to instructors.
 * Shows alerts one at a time with navigation, positioned prominently (not hidden at bottom).
 * 
 * WHY modal instead of embedded panel:
 * - More prominent (center screen or floating top-right)
 * - Doesn't get lost in UI (spec requirement: "prominently displayed")
 * - Can't be missed by instructor
 * - Higher z-index ensures visibility above other elements
 * 
 * WHY navigation between alerts:
 * - Instructor can review multiple alerts without dismissing
 * - Shows "1 of 3" count for awareness
 * - Prev/next buttons for easy navigation
 * - Focus on one alert at a time (less cognitive overload)
 * 
 * WHY Jotai integration:
 * - Real-time updates via atoms (pendingAlertsAtom)
 * - Shared state with other components
 * - Simpler than prop drilling
 * - Follows constitutional principle of using established patterns
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { HelpAlert } from '@/lib/types';
import { helpAlertsAtom, pendingAlertsAtom, HelpAlertEntity } from '@/lib/store/alert-store';
import Modal from './ui/Modal';
import { Button } from './ui';

interface AlertPanelProps {
  /** Classroom session ID to monitor */
  classroomSessionId: string;
  /** Instructor ID for acknowledging/resolving alerts */
  instructorId: string;
  /** Whether to show modal automatically when new alert arrives */
  autoShow?: boolean;
}

export default function AlertPanel({
  classroomSessionId,
  instructorId,
  autoShow = true,
}: AlertPanelProps) {
  // Jotai state management - WHY: Real-time updates, shared state
  const [, setHelpAlerts] = useAtom(helpAlertsAtom);
  const pendingAlerts = useAtomValue(pendingAlertsAtom);
  
  // Modal and navigation state
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

  /**
   * Auto-show modal when new alerts arrive
   * WHY: Instructor shouldn't miss new help requests
   * Spec requirement: Alerts must be prominently displayed
   */
  useEffect(() => {
    if (autoShow && pendingAlerts.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0); // Always show first alert when auto-opening
    }
  }, [pendingAlerts.length, autoShow, isOpen]);

  /**
   * Reset current index if it exceeds alert count
   * WHY: Prevents showing invalid index after dismissals
   */
  useEffect(() => {
    if (currentIndex >= pendingAlerts.length && pendingAlerts.length > 0) {
      setCurrentIndex(pendingAlerts.length - 1);
    }
  }, [currentIndex, pendingAlerts.length]);

  /**
   * Fetch alerts from API and sync to Jotai store
   * WHY useCallback: Stable reference for useEffect dependency
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`/api/alerts/${classroomSessionId}?status=pending`);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          errorDetails = errorData.message || errorData.details || errorDetails;
        } catch {
          // Response wasn't JSON, use statusText
        }
        console.error(`Failed to fetch alerts (${response.status}):`, errorDetails);
        setError(`Failed to fetch alerts: ${errorDetails}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const alerts = data.alerts || [];
      
      // Convert API alerts to HelpAlertEntity format and sync to Jotai
      const helpAlertEntities: HelpAlertEntity[] = alerts.map((alert: HelpAlert) => ({
        id: alert.id,
        studentId: alert.breakoutRoomSessionId, // Using breakout room session as student identifier
        studentName: alert.topic || 'Student',
        roomId: alert.breakoutRoomName || 'main',
        timestamp: new Date(alert.detectedAt),
        issueSummary: alert.contextSnippet || alert.topic,
        status: alert.status === 'pending' ? 'pending' : alert.status === 'acknowledged' ? 'acknowledged' : 'dismissed',
        acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
      }));
      
      setHelpAlerts(helpAlertEntities);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [classroomSessionId, setHelpAlerts]);

  /**
   * Set up polling for new alerts
   * WHY 2-second interval: Fast enough for real-time feel, not too frequent
   */
  useEffect(() => {
    fetchAlerts(); // Initial fetch
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval); // Cleanup
  }, [fetchAlerts]);

  /**
   * Navigate to previous alert
   * WHY: Instructor can review multiple alerts without dismissing
   */
  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  /**
   * Navigate to next alert
   * WHY: Instructor can move through queue of help requests
   */
  const handleNext = () => {
    setCurrentIndex(prev => Math.min(pendingAlerts.length - 1, prev + 1));
  };

  /**
   * Acknowledge current alert
   * WHY: Instructor marks alert as "I've seen this, will address it"
   * Updates Jotai atom immediately (optimistic update) + API call
   */
  const handleAcknowledge = async (alertId: string) => {
    setUpdatingAlertId(alertId);

    try {
      // Optimistic update in Jotai store
      setHelpAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'acknowledged', acknowledgedAt: new Date() }
          : alert
      ));

      // Update via API
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'acknowledged', instructorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Move to next alert after acknowledgment
      if (currentIndex < pendingAlerts.length - 1) {
        handleNext();
      } else if (pendingAlerts.length === 1) {
        // Last alert - close modal
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      // Revert optimistic update on error
      await fetchAlerts();
      alert(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    } finally {
      setUpdatingAlertId(null);
    }
  };

  /**
   * Dismiss current alert
   * WHY: Instructor marks alert as "not relevant" or "false positive"
   * Removes from pending list immediately
   */
  const handleDismiss = async (alertId: string) => {
    setUpdatingAlertId(alertId);

    try {
      // Optimistic update in Jotai store
      setHelpAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'dismissed' }
          : alert
      ));

      // Update via API
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'dismissed', instructorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }

      // Navigate after dismissal
      if (pendingAlerts.length === 1) {
        // Last alert - close modal
        setIsOpen(false);
      } else if (currentIndex >= pendingAlerts.length - 1) {
        // Was viewing last alert - go to previous
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      // Otherwise stay at current index (next alert slides into view)
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
      // Revert optimistic update on error
      await fetchAlerts();
      alert(err instanceof Error ? err.message : 'Failed to dismiss alert');
    } finally {
      setUpdatingAlertId(null);
    }
  };

  /**
   * Format timestamp for display
   * WHY: Relative time is more intuitive than absolute timestamp
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

  // Get current alert to display
  const currentAlert = pendingAlerts[currentIndex];
  const hasAlerts = pendingAlerts.length > 0;
  const hasMultipleAlerts = pendingAlerts.length > 1;

  // Don't render modal if no alerts
  if (!hasAlerts) {
    return null; // Silent when no alerts (not intrusive)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Student Help Request"
      description={`Alert ${currentIndex + 1} of ${pendingAlerts.length}`}
      size="lg"
      closeOnEscape={true}
      closeOnOverlayClick={false} // Prevent accidental dismissal
      className="z-[60]" // Above other modals
      aria-live="assertive" // T063: Screen reader immediately announces new alerts
      aria-atomic="true" // T063: Read entire alert content when announced
    >
      {currentAlert && (
        <div className="space-y-4">
          {/* Room Location */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="font-medium">📍 Location:</span>
            <span className="text-teal-400">
              {currentAlert.roomId === 'main' ? 'Main Room' : currentAlert.roomId}
            </span>
            <span className="text-gray-500 ml-auto">{formatTime(currentAlert.timestamp)}</span>
          </div>

          {/* Student Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-lg font-semibold text-white mb-2">
              {currentAlert.studentName}
            </div>
            <div className="text-gray-300">
              {currentAlert.issueSummary}
            </div>
          </div>

          {/* Navigation Controls - WHY: Browse multiple alerts without dismissing */}
          {hasMultipleAlerts && (
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-3">
              <Button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="secondary"
                size="sm"
              >
                ← Previous
              </Button>
              <span className="text-sm text-gray-400">
                {currentIndex + 1} of {pendingAlerts.length}
              </span>
              <Button
                onClick={handleNext}
                disabled={currentIndex === pendingAlerts.length - 1}
                variant="secondary"
                size="sm"
              >
                Next →
              </Button>
            </div>
          )}

          {/* Action Buttons - WHY: Instructor can acknowledge or dismiss */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleAcknowledge(currentAlert.id)}
              disabled={updatingAlertId === currentAlert.id}
              variant="primary"
              className="flex-1"
            >
              {updatingAlertId === currentAlert.id ? 'Processing...' : '✓ Acknowledge'}
            </Button>
            <Button
              onClick={() => handleDismiss(currentAlert.id)}
              disabled={updatingAlertId === currentAlert.id}
              variant="ghost"
              className="flex-1"
            >
              {updatingAlertId === currentAlert.id ? 'Processing...' : '✕ Dismiss'}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center">
            Acknowledge to mark as &ldquo;will address&rdquo; • Dismiss if not relevant
          </div>
        </div>
      )}
    </Modal>
  );
}

