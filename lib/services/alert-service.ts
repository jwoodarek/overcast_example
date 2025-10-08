/**
 * AlertService
 * 
 * Manages the lifecycle of help alerts from creation to resolution.
 * Handles alert generation, delivery to instructors, and status management.
 * 
 * WHY this service:
 * - Centralizes alert business logic (not scattered across components)
 * - Enforces state machine transitions (pending → acknowledged → resolved)
 * - Provides single point for alert delivery strategy
 * 
 * WHY in-app delivery only:
 * - Simplest approach for MVP (no email/SMS infrastructure)
 * - Real-time via UI polling or SSE
 * - Easy to add other channels later (webhook, email) without changing interface
 */

import { HelpAlert } from '@/lib/types';
import { alertStore } from '@/lib/store';

/**
 * Options for creating a new alert
 */
interface CreateAlertParams {
  classroomSessionId: string;
  breakoutRoomSessionId: string;
  breakoutRoomName: string | null;
  topic: string;
  urgency: 'low' | 'medium' | 'high';
  triggerKeywords: string[];
  contextSnippet: string;
  sourceTranscriptIds: string[];
}

/**
 * Options for filtering alerts
 */
interface GetAlertsOptions {
  status?: HelpAlert['status'];
  urgency?: HelpAlert['urgency'];
  breakoutRoom?: string;
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

export class AlertService {
  /**
   * Create a new help alert.
   * 
   * WHY generate unique IDs here:
   * - Consistent ID format across all alerts
   * - Timestamp-based ensures chronological ordering
   * - Random suffix prevents collisions
   * 
   * @returns The created alert
   */
  createAlert(params: CreateAlertParams): HelpAlert {
    const alert: HelpAlert = {
      id: this.generateAlertId(),
      classroomSessionId: params.classroomSessionId,
      breakoutRoomSessionId: params.breakoutRoomSessionId,
      breakoutRoomName: params.breakoutRoomName,
      detectedAt: new Date(),
      topic: params.topic,
      urgency: params.urgency,
      triggerKeywords: params.triggerKeywords,
      contextSnippet: params.contextSnippet,
      status: 'pending',
      acknowledgedBy: null,
      acknowledgedAt: null,
      sourceTranscriptIds: params.sourceTranscriptIds,
    };

    // Store the alert
    alertStore.create(alert);

    // Notify instructor (in-app only for MVP)
    this.notifyInstructor(alert);

    return alert;
  }

  /**
   * Get alerts for a classroom session.
   * 
   * WHY filtering here:
   * - Instructors can view only pending alerts
   * - Can filter by urgency to prioritize
   * - Can filter by specific breakout room
   * 
   * @returns Array of alerts matching filters
   */
  getAlerts(
    classroomSessionId: string,
    options: GetAlertsOptions = {}
  ): HelpAlert[] {
    return alertStore.get(classroomSessionId, options);
  }

  /**
   * Get alert counts by status for a classroom.
   * 
   * WHY provide counts:
   * - UI can show badge with pending count
   * - Dashboard can display stats
   * - Helps instructors prioritize
   */
  getAlertCounts(classroomSessionId: string): AlertCounts {
    const allAlerts = alertStore.get(classroomSessionId);

    return {
      pending: allAlerts.filter(a => a.status === 'pending').length,
      acknowledged: allAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: allAlerts.filter(a => a.status === 'resolved').length,
      dismissed: allAlerts.filter(a => a.status === 'dismissed').length,
      total: allAlerts.length,
    };
  }

  /**
   * Get a single alert by ID.
   */
  getAlertById(alertId: string): HelpAlert | null {
    // Search across all classrooms
    // Note: This is inefficient for large scale, but fine for MVP with 6 classrooms
    const allClassrooms = alertStore.getSessions?.() || [];
    
    for (const sessionId of allClassrooms) {
      const alerts = alertStore.get(sessionId);
      const found = alerts.find(a => a.id === alertId);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Acknowledge an alert (instructor has seen it).
   * 
   * WHY acknowledge step:
   * - Instructor indicates they're aware of the issue
   * - Other instructors know it's being handled
   * - Doesn't remove from list (still needs resolution)
   * 
   * State transition: pending → acknowledged
   */
  acknowledgeAlert(
    alertId: string,
    instructorId: string
  ): HelpAlert | null {
    const alert = this.getAlertById(alertId);
    
    if (!alert) {
      return null;
    }

    // Validate state transition
    if (alert.status !== 'pending') {
      throw new Error(
        `Cannot acknowledge alert with status "${alert.status}". Must be "pending".`
      );
    }

    // Update status
    return alertStore.updateStatus(alertId, 'acknowledged', instructorId);
  }

  /**
   * Resolve an alert (instructor has helped the student).
   * 
   * WHY resolve status:
   * - Indicates the issue has been addressed
   * - Alert can be hidden from active list
   * - Preserved for session history/analytics
   * 
   * State transition: pending → resolved OR acknowledged → resolved
   */
  resolveAlert(
    alertId: string,
    instructorId: string
  ): HelpAlert | null {
    const alert = this.getAlertById(alertId);
    
    if (!alert) {
      return null;
    }

    // Can resolve from pending or acknowledged
    if (alert.status !== 'pending' && alert.status !== 'acknowledged') {
      throw new Error(
        `Cannot resolve alert with status "${alert.status}". Must be "pending" or "acknowledged".`
      );
    }

    return alertStore.updateStatus(alertId, 'resolved', instructorId);
  }

  /**
   * Dismiss an alert (false positive or no longer relevant).
   * 
   * WHY dismiss option:
   * - False positives happen with keyword detection
   * - Students may self-resolve before instructor sees alert
   * - Keeps alert list manageable
   * 
   * State transition: any → dismissed
   */
  dismissAlert(
    alertId: string,
    instructorId: string
  ): HelpAlert | null {
    const alert = this.getAlertById(alertId);
    
    if (!alert) {
      return null;
    }

    // Can dismiss from any state
    return alertStore.updateStatus(alertId, 'dismissed', instructorId);
  }

  /**
   * Get pending alerts sorted by priority.
   * 
   * WHY this method:
   * - Common use case: show instructor most urgent alerts first
   * - Combines filtering and sorting in one call
   * - Returns high urgency first, then by time (newest first)
   */
  getPendingAlertsByPriority(classroomSessionId: string): HelpAlert[] {
    return this.getAlerts(classroomSessionId, { status: 'pending' });
    // Note: alertStore.get already sorts by urgency then time
  }

  /**
   * Get alerts for a specific breakout room.
   * 
   * WHY useful:
   * - Instructor viewing specific breakout room
   * - Can see only alerts from that room
   * - Helps focus on one group at a time
   */
  getBreakoutRoomAlerts(
    classroomSessionId: string,
    breakoutRoomName: string
  ): HelpAlert[] {
    return this.getAlerts(classroomSessionId, { 
      breakoutRoom: breakoutRoomName 
    });
  }

  /**
   * Clear all alerts for a session.
   * 
   * WHY needed:
   * - Called when session ends
   * - Prevents memory leaks
   * - Alerts are session-specific (don't persist across classes)
   */
  clearSession(classroomSessionId: string): void {
    alertStore.clear(classroomSessionId);
  }

  /**
   * Notify instructor of new alert (in-app delivery).
   * 
   * WHY in-app only:
   * - Simplest for MVP (no email/SMS infrastructure)
   * - UI polls for new alerts every 2 seconds
   * - Future: can add SSE for true push notifications
   * - Future: can add email/SMS for high urgency
   * 
   * @param alert - The alert to notify about
   */
  private notifyInstructor(alert: HelpAlert): void {
    // For MVP: Alert is stored and will be picked up by UI polling
    // No additional action needed here
    
    // Future enhancements:
    // - Emit event for SSE stream
    // - Send push notification to instructor's device
    // - Send email for high urgency alerts
    // - Trigger webhook for external systems
    
    console.log(
      `[AlertService] New ${alert.urgency} urgency alert created for ${alert.breakoutRoomName || 'main classroom'}: ${alert.topic}`
    );
  }

  /**
   * Generate unique alert ID.
   * 
   * Format: alert-{timestamp}-{random}
   * Example: alert-1696700180000-xyz123
   * 
   * WHY this format:
   * - Timestamp ensures chronological ordering
   * - Random suffix prevents collisions
   * - Easy to parse and validate
   */
  private generateAlertId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `alert-${timestamp}-${random}`;
  }

  /**
   * Validate alert status transition.
   * 
   * WHY state machine:
   * - Prevents invalid transitions (e.g., resolved → pending)
   * - Makes alert lifecycle clear and predictable
   * - Easier to debug issues
   * 
   * Valid transitions:
   * - pending → acknowledged → resolved
   * - pending → resolved (skip acknowledge)
   * - any → dismissed (can dismiss at any time)
   */
  private isValidTransition(
    currentStatus: HelpAlert['status'],
    newStatus: HelpAlert['status']
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['acknowledged', 'resolved', 'dismissed'],
      acknowledged: ['resolved', 'dismissed'],
      resolved: ['dismissed'], // Can still dismiss if needed
      dismissed: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

// Export singleton instance
export const alertService = new AlertService();

