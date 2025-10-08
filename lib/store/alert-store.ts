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
   * Get all session IDs that have alerts.
   * 
   * WHY useful:
   * - Search across all classrooms for a specific alert
   * - Monitoring/debugging active sessions
   * - Cleanup operations
   * 
   * @returns Array of session IDs
   */
  getSessions(): string[] {
    return Array.from(this.alerts.keys());
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

// ==============================================================================
// NEW: Jotai Atoms for Help Alert System (Feature 004)
// ==============================================================================

/**
 * Help Alert System Atoms
 * 
 * WHY separate from class-based AlertStore above:
 * - AlertStore handles backend/API concern (alert detection and storage)
 * - These atoms handle frontend/UI concern (instructor's view of alerts)
 * - Atoms integrate better with React components (useAtom hook)
 * - Allows gradual migration to Jotai pattern without breaking existing code
 * 
 * WHY Jotai for new features:
 * - Simpler React integration (reactive updates)
 * - Type-safe with TypeScript
 * - Follows emerging pattern in codebase
 * - Constitutional principle: favor simplicity over consistency (don't force everything into one pattern)
 * 
 * Usage:
 * ```tsx
 * const [helpAlerts] = useAtom(helpAlertsAtom);
 * const pendingCount = useAtomValue(pendingAlertsAtom).length;
 * ```
 */

import { atom } from 'jotai';

/**
 * Help Alert entity for instructor notification system
 * 
 * Matches data-model.md specification
 * Different from existing HelpAlert type (which has different fields)
 */
export interface HelpAlertEntity {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Participant session ID who needs help */
  studentId: string;
  
  /** Display name for UI */
  studentName: string;
  
  /** Where help is needed ('main' or breakout room ID) */
  roomId: string;
  
  /** When alert was created */
  timestamp: Date;
  
  /** Brief description of what student is struggling with (max 500 chars) */
  issueSummary: string;
  
  /** Alert lifecycle state */
  status: 'pending' | 'acknowledged' | 'dismissed';
  
  /** When instructor viewed/acknowledged (optional) */
  acknowledgedAt?: Date;
}

/**
 * Primary help alerts atom
 * 
 * WHY array instead of Map:
 * - Small dataset (typically <20 active alerts)
 * - Need to maintain order (newest/highest priority first)
 * - Simple iteration in UI components
 * - Easy filtering by status/room
 * 
 * Alert lifecycle:
 * 1. System detects student needs help → add alert with status: 'pending'
 * 2. Instructor views alert modal → update status: 'acknowledged', set acknowledgedAt
 * 3. Instructor dismisses alert → update status: 'dismissed'
 * 4. Session ends → clear all alerts
 * 
 * Memory: ~300 bytes per alert × 20 alerts = 6 KB (negligible)
 * 
 * Usage:
 * ```tsx
 * const [helpAlerts, setHelpAlerts] = useAtom(helpAlertsAtom);
 * 
 * // Add new alert
 * setHelpAlerts(prev => [...prev, newAlert]);
 * 
 * // Update status
 * setHelpAlerts(prev => prev.map(alert =>
 *   alert.id === alertId
 *     ? { ...alert, status: 'acknowledged', acknowledgedAt: new Date() }
 *     : alert
 * ));
 * 
 * // Remove dismissed alerts
 * setHelpAlerts(prev => prev.filter(alert => alert.status !== 'dismissed'));
 * ```
 */
export const helpAlertsAtom = atom<HelpAlertEntity[]>([]);

/**
 * Derived atom: Pending alerts only
 * 
 * WHY important:
 * - Instructor needs to see unacknowledged alerts prominently
 * - Badge count: "3 students need help"
 * - Priority indicator for modal display
 * - Most common filter (acknowledged alerts less urgent)
 * 
 * WHY derived:
 * - Single source of truth (helpAlertsAtom)
 * - Can't get out of sync
 * - Automatically updates when helpAlertsAtom changes
 * 
 * Sorted by timestamp (newest first) for relevance
 * 
 * Usage:
 * ```tsx
 * const pendingAlerts = useAtomValue(pendingAlertsAtom);
 * return (
 *   <Badge>{pendingAlerts.length}</Badge>
 *   <AlertModal alerts={pendingAlerts} />
 * );
 * ```
 */
export const pendingAlertsAtom = atom((get) => {
  const alerts = get(helpAlertsAtom);
  return alerts
    .filter(alert => alert.status === 'pending')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
});

/**
 * Derived atom: Acknowledged alerts
 * 
 * WHY useful:
 * - Instructor can review which alerts they've seen
 * - Show "In progress" section in UI
 * - Track which alerts instructor is actively working on
 * 
 * Returns acknowledged alerts sorted by acknowledgedAt (most recent first)
 */
export const acknowledgedAlertsAtom = atom((get) => {
  const alerts = get(helpAlertsAtom);
  return alerts
    .filter(alert => alert.status === 'acknowledged')
    .sort((a, b) => {
      const timeA = a.acknowledgedAt?.getTime() ?? 0;
      const timeB = b.acknowledgedAt?.getTime() ?? 0;
      return timeB - timeA;
    });
});

/**
 * Derived atom: Alerts by room
 * 
 * WHY useful:
 * - Show which breakout rooms need attention
 * - Filter alerts: "Show only Room A alerts"
 * - Room-specific badge counts: "Room B: 2 alerts"
 * 
 * Returns Map<roomId, HelpAlertEntity[]>
 * Example: { 'main': [...], 'breakout-abc': [...], 'breakout-xyz': [...] }
 * 
 * Usage:
 * ```tsx
 * const alertsByRoom = useAtomValue(alertsByRoomAtom);
 * const mainRoomAlerts = alertsByRoom.get('main') ?? [];
 * ```
 */
export const alertsByRoomAtom = atom((get) => {
  const alerts = get(helpAlertsAtom);
  const byRoom = new Map<string, HelpAlertEntity[]>();
  
  alerts.forEach(alert => {
    const existing = byRoom.get(alert.roomId) ?? [];
    byRoom.set(alert.roomId, [...existing, alert]);
  });
  
  return byRoom;
});

/**
 * Derived atom: Pending alert count per room
 * 
 * WHY important:
 * - Show badge on each breakout room: "Room A (2 alerts)"
 * - Instructor can prioritize which room to check first
 * - Quick overview of where help is needed most
 * 
 * Returns Record<roomId, count>
 * Example: { 'main': 1, 'breakout-abc': 3, 'breakout-xyz': 0 }
 * 
 * Only counts pending alerts (not acknowledged or dismissed)
 */
export const pendingAlertCountsByRoomAtom = atom((get) => {
  const pendingAlerts = get(pendingAlertsAtom);
  const counts: Record<string, number> = {};
  
  pendingAlerts.forEach(alert => {
    counts[alert.roomId] = (counts[alert.roomId] ?? 0) + 1;
  });
  
  return counts;
});

/**
 * Derived atom: Has any pending alerts?
 * 
 * WHY useful:
 * - Simple boolean for showing/hiding alert notification icon
 * - Enable/disable alert modal trigger
 * - Show "No alerts" vs "3 students need help" state
 * 
 * Usage:
 * ```tsx
 * const hasAlerts = useAtomValue(hasPendingAlertsAtom);
 * return hasAlerts ? <AlertIcon pulse /> : <AlertIcon />;
 * ```
 */
export const hasPendingAlertsAtom = atom((get) => {
  const pendingAlerts = get(pendingAlertsAtom);
  return pendingAlerts.length > 0;
});

/**
 * Derived atom: Alert summary for debugging
 * 
 * WHY useful during development:
 * - Quick overview in DevTools
 * - See alert distribution across rooms
 * - Track status breakdown
 * 
 * Returns summary statistics
 */
export const helpAlertSummaryAtom = atom((get) => {
  const alerts = get(helpAlertsAtom);
  const pending = alerts.filter(a => a.status === 'pending');
  const acknowledged = alerts.filter(a => a.status === 'acknowledged');
  const dismissed = alerts.filter(a => a.status === 'dismissed');
  
  return {
    total: alerts.length,
    pending: pending.length,
    acknowledged: acknowledged.length,
    dismissed: dismissed.length,
    rooms: Array.from(new Set(alerts.map(a => a.roomId))),
  };
});

