// AlertStore: In-memory storage for help alerts
// WHY in-memory: Real-time alerts don't need persistence beyond session
// WHY auto-dismissal: Prevents alert overflow if instructor is busy or away

import { HelpAlert } from '../types';

/**
 * AlertStore manages help alerts in memory with automatic cleanup
 * 
 * Storage pattern: Map<classroomSessionId, HelpAlert[]>
 * - classroomSessionId groups all breakout room alerts for main instructor
 * - Alerts are immutable after creation (only status changes)
 * - Sorted by urgency (high first) then time (newest first)
 * 
 * Memory management:
 * - Average alert: ~500 bytes
 * - Typical session: ~50 alerts = ~25 KB per classroom
 * - Auto-dismissal: Pending alerts older than 30 minutes
 * 
 * WHY 30-minute timeout:
 * - If instructor hasn't acknowledged in 30 minutes, likely not monitoring
 * - Prevents stale alerts from cluttering interface
 * - Students' situation has probably changed by then anyway
 */
export class AlertStore {
  // classroomSessionId → array of alerts
  private alerts: Map<string, HelpAlert[]> = new Map();

  /**
   * Create a new alert.
   * 
   * WHY immutable after creation:
   * - Alert detection is a snapshot in time
   * - Only status changes (pending → acknowledged → resolved)
   * - Topic, urgency, context don't change (would be confusing)
   * 
   * @param alert - The alert to create
   */
  create(alert: HelpAlert): void {
    const existing = this.alerts.get(alert.classroomSessionId) || [];
    existing.push(alert);
    this.alerts.set(alert.classroomSessionId, existing);
  }

  /**
   * Get alerts for a classroom with optional filtering.
   * 
   * WHY sorted by urgency then time:
   * - Instructor sees most critical alerts first (high urgency at top)
   * - Within same urgency, newest first (more recent = more relevant)
   * - Consistent priority system across all instructors
   * 
   * @param classroomSessionId - The classroom to retrieve alerts for
   * @param options - Optional filters for status, urgency, and breakout room
   * @returns Sorted and filtered array of alerts
   */
  get(
    classroomSessionId: string,
    options?: {
      status?: HelpAlert['status'];    // Filter by alert status
      urgency?: HelpAlert['urgency'];  // Filter by urgency level
      breakoutRoom?: string;           // Filter by specific breakout room name
    }
  ): HelpAlert[] {
    let alerts = this.alerts.get(classroomSessionId) || [];

    // Apply status filter
    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    // Apply urgency filter
    if (options?.urgency) {
      alerts = alerts.filter(a => a.urgency === options.urgency);
    }

    // Apply breakout room filter
    if (options?.breakoutRoom) {
      alerts = alerts.filter(a => a.breakoutRoomName === options.breakoutRoom);
    }

    // Sort by urgency (high first) then by time (newest first)
    // WHY this order: Critical issues shown first, but also want latest context
    return alerts.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });
  }

  /**
   * Update alert status.
   * 
   * WHY track acknowledgedBy and acknowledgedAt:
   * - Multiple instructors can be in same classroom
   * - Shows who is handling which alert (coordination)
   * - Audit trail for future analysis
   * 
   * Status transitions:
   * - pending → acknowledged (instructor sees it)
   * - acknowledged → resolved (instructor helped)
   * - any → dismissed (false positive or no longer relevant)
   * 
   * @param alertId - The alert ID to update
   * @param status - The new status
   * @param instructorId - Who is making the update
   * @returns Updated alert, or null if not found
   */
  updateStatus(
    alertId: string,
    status: HelpAlert['status'],
    instructorId: string
  ): HelpAlert | null {
    // Search across all classrooms for the alert
    const allAlerts = Array.from(this.alerts.values());
    for (const alerts of allAlerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = status;
        alert.acknowledgedBy = instructorId;
        alert.acknowledgedAt = new Date();
        return alert;
      }
    }
    return null;
  }

  /**
   * Get alert by ID.
   * 
   * WHY needed:
   * - API routes update by ID
   * - Simpler than passing classroom ID + alert ID
   * 
   * @param alertId - The alert ID to find
   * @returns The alert, or null if not found
   */
  getById(alertId: string): HelpAlert | null {
    const allAlerts = Array.from(this.alerts.values());
    for (const alerts of allAlerts) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        return alert;
      }
    }
    return null;
  }

  /**
   * Clear alerts for a classroom.
   * 
   * WHY per-classroom clearing:
   * - Called when classroom session ends
   * - Prevents memory leaks
   * - Each classroom is independent
   * 
   * @param classroomSessionId - The classroom to clear
   */
  clear(classroomSessionId: string): void {
    this.alerts.delete(classroomSessionId);
  }

  /**
   * Auto-dismiss old alerts (30-minute timeout).
   * 
   * WHY automatic dismissal:
   * - If instructor hasn't acted in 30 minutes, they're probably not monitoring
   * - Prevents UI from filling with stale alerts
   * - Students' situation likely changed (got unstuck, left, etc.)
   * 
   * WHY 30 minutes specifically:
   * - Short enough to keep interface clean
   * - Long enough that busy instructor doesn't lose important alerts
   * - Matches typical breakout room duration
   * 
   * Call this periodically (every 5 minutes) via setInterval.
   * 
   * @returns Number of alerts that were auto-dismissed
   */
  autoDismissOld(): number {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    let dismissedCount = 0;

    const allAlerts = Array.from(this.alerts.values());
    for (const alerts of allAlerts) {
      for (const alert of alerts) {
        // Only auto-dismiss pending alerts (acknowledged ones instructor is working on)
        if (alert.status === 'pending' && alert.detectedAt < threshold) {
          alert.status = 'dismissed';
          alert.acknowledgedBy = 'system-auto-dismiss';
          alert.acknowledgedAt = new Date();
          dismissedCount++;
        }
      }
    }

    return dismissedCount;
  }

  /**
   * Get count of pending alerts per urgency level.
   * 
   * WHY useful:
   * - Quick dashboard summary for instructor
   * - Badge counts on UI (e.g., "3 high urgency alerts")
   * - Prioritization hints
   * 
   * @param classroomSessionId - The classroom to count alerts for
   * @returns Object with counts by urgency level
   */
  getCountsByUrgency(classroomSessionId: string): {
    high: number;
    medium: number;
    low: number;
    total: number;
  } {
    const pendingAlerts = this.get(classroomSessionId, { status: 'pending' });
    
    return {
      high: pendingAlerts.filter(a => a.urgency === 'high').length,
      medium: pendingAlerts.filter(a => a.urgency === 'medium').length,
      low: pendingAlerts.filter(a => a.urgency === 'low').length,
      total: pendingAlerts.length,
    };
  }

  /**
   * Clear all alerts (for testing/development).
   * 
   * WHY separate from clear():
   * - clear() is per-classroom (normal operation)
   * - clearAll() is global (testing only)
   * - Makes intent explicit in code
   */
  clearAll(): void {
    this.alerts.clear();
  }
}

