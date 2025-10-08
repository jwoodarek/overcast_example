// TranscriptStore: In-memory storage for transcript entries
// WHY in-memory: No database dependency for MVP, session-scoped data
// WHY append-only: Ensures no data loss during active session, simplifies concurrent writes

import { TranscriptEntry } from '../types';

/**
 * TranscriptStore manages transcript entries in memory using a Map structure
 * 
 * Storage pattern: Map<sessionId, TranscriptEntry[]>
 * - sessionId is the classroom or breakout room session ID
 * - Entries are append-only during session (no updates or deletes)
 * - Filtering happens at read time (role, confidence, time range)
 * 
 * Memory management:
 * - Average entry: ~200 bytes
 * - Typical 1-hour class: ~5000 entries = ~1 MB per session
 * - Cleanup: Call clear(sessionId) when session ends
 */
export class TranscriptStore {
  // sessionId → array of transcript entries (append-only)
  private transcripts: Map<string, TranscriptEntry[]> = new Map();

  /**
   * Add a new transcript entry.
   * 
   * WHY append-only: 
   * - No risk of race conditions during concurrent writes
   * - Preserves complete session history for analysis
   * - Simple: just push to array, no complex state management
   * 
   * @param entry - The transcript entry to add
   */
  add(entry: TranscriptEntry): void {
    const existing = this.transcripts.get(entry.sessionId) || [];
    existing.push(entry);
    this.transcripts.set(entry.sessionId, existing);
  }

  /**
   * Get transcripts for a session with optional filtering.
   * 
   * WHY server-side filtering:
   * - Reduces data transfer to client (especially for long sessions)
   * - Enables efficient help detection (only recent, high-confidence entries)
   * - Supports role-based queries (instructor-only for quiz generation)
   * 
   * @param sessionId - The session to retrieve transcripts for
   * @param options - Optional filters for time, role, and confidence
   * @returns Filtered array of transcript entries
   */
  get(
    sessionId: string,
    options?: {
      since?: Date;           // Only entries after this time
      role?: 'instructor' | 'student';  // Filter by speaker role
      minConfidence?: number; // Minimum confidence score (0.0-1.0)
    }
  ): TranscriptEntry[] {
    let entries = this.transcripts.get(sessionId) || [];

    // Apply time filter
    if (options?.since) {
      entries = entries.filter(e => e.timestamp > options.since!);
    }

    // Apply role filter
    if (options?.role) {
      entries = entries.filter(e => e.speakerRole === options.role);
    }

    // Apply confidence filter
    if (options?.minConfidence !== undefined) {
      entries = entries.filter(e => e.confidence >= options.minConfidence!);
    }

    return entries;
  }

  /**
   * Get specific entries by their IDs (for alert source tracing).
   * 
   * WHY by ID lookup:
   * - HelpAlerts reference transcript IDs that triggered them
   * - Enables instructor to see exact context that generated alert
   * - Useful for debugging false positives in help detection
   * 
   * @param ids - Array of transcript entry IDs
   * @returns Array of matching entries
   */
  getByIds(ids: string[]): TranscriptEntry[] {
    const allEntries = Array.from(this.transcripts.values()).flat();
    return allEntries.filter(e => ids.includes(e.id));
  }

  /**
   * Clear all transcripts for a session.
   * 
   * WHY manual cleanup:
   * - In-memory data doesn't auto-expire
   * - Must be called when session ends (all participants leave)
   * - Prevents memory leaks from abandoned sessions
   * 
   * Call this when:
   * - Classroom session ends
   * - Breakout room closes
   * - Testing/development (reset between tests)
   * 
   * @param sessionId - The session to clear
   */
  clear(sessionId: string): void {
    this.transcripts.delete(sessionId);
  }

  /**
   * Get all active session IDs.
   * 
   * WHY useful:
   * - Monitoring: See which sessions have transcripts
   * - Cleanup: Find abandoned sessions to clear
   * - Debugging: Verify sessions are being tracked
   * 
   * @returns Array of session IDs that have transcripts
   */
  getSessions(): string[] {
    return Array.from(this.transcripts.keys());
  }

  /**
   * Get total entry count across all sessions (for monitoring).
   * 
   * WHY monitoring:
   * - Track memory usage (entries × 200 bytes)
   * - Detect runaway transcript generation
   * - Performance testing validation
   * 
   * @returns Total number of transcript entries in memory
   */
  size(): number {
    return Array.from(this.transcripts.values())
      .reduce((sum, entries) => sum + entries.length, 0);
  }

  /**
   * Clear all transcripts (for testing/development).
   * 
   * WHY separate from clear():
   * - clear() is per-session (normal operation)
   * - clearAll() is global (testing only)
   * - Makes intent explicit in code
   */
  clearAll(): void {
    this.transcripts.clear();
  }
}

// ============================================================================
// Jotai Atoms for Transcript UI State (Client-side)
// ============================================================================
// WHY Jotai atoms alongside class-based store:
// - Class-based store is for server-side API routes (transcript storage)
// - Jotai atoms are for client-side React components (UI state like scroll position)
// - Scroll position needs to persist during session for better UX

import { atom } from 'jotai';

/**
 * Transcript scroll position atom - tracks scroll position in transcript UI
 * 
 * WHY track scroll position:
 * - Enables scrollback functionality (users can review older transcript entries)
 * - Preserves scroll position when component re-renders or updates
 * - Allows "jump to bottom" button when user scrolls up
 * 
 * Value is scroll offset in pixels (0 = top of transcript)
 * Updated by TranscriptMonitor component when user scrolls
 * Reset to 0 (or max for auto-scroll to bottom) when session starts/ends
 */
export const transcriptScrollPositionAtom = atom<number>(0);

