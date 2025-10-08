// QuizStore: In-memory storage for AI-generated quizzes
// WHY dual-index pattern: Enables fast lookups both by quizId (O(1)) and by sessionId (O(1))
// This is critical for instructor workflows where they need to:
// 1. Retrieve a specific quiz for editing (by quizId)
// 2. List all quizzes from a classroom session (by sessionId)

import { Quiz } from '../types';

/**
 * In-memory store for quiz data
 * 
 * WHY in-memory:
 * - MVP doesn't require persistence (acceptable to lose quizzes on server restart)
 * - Faster development iteration without database setup
 * - Simple deployment (no database dependency)
 * 
 * WHY dual-index pattern:
 * - Primary store: Map<quizId, Quiz> for direct quiz access
 * - Secondary index: Map<sessionId, quizId[]> for session-based queries
 * - Alternative would be linear search through all quizzes (O(n)), but dual-index gives O(1)
 * 
 * Future migration: Replace Maps with PostgreSQL queries, keep same interface
 */
export class QuizStore {
  /**
   * Primary storage: quizId → Quiz object
   * This is the source of truth for all quiz data
   */
  private quizzes: Map<string, Quiz> = new Map();

  /**
   * Secondary index: sessionId → array of quiz IDs
   * WHY separate index: Allows fast "get all quizzes for this classroom session"
   * without iterating through all quizzes
   */
  private sessionIndex: Map<string, string[]> = new Map();

  /**
   * Save a quiz (create or update)
   * WHY: Single method for both create/update keeps API simple
   * If quiz exists, it will be overwritten
   */
  save(quiz: Quiz): void {
    // Store quiz in primary map
    this.quizzes.set(quiz.id, quiz);

    // Update session index
    const sessionQuizzes = this.sessionIndex.get(quiz.sessionId) || [];
    if (!sessionQuizzes.includes(quiz.id)) {
      sessionQuizzes.push(quiz.id);
      this.sessionIndex.set(quiz.sessionId, sessionQuizzes);
    }
  }

  /**
   * Get a quiz by ID
   * Returns null if quiz doesn't exist (allows caller to handle 404)
   */
  get(quizId: string): Quiz | null {
    return this.quizzes.get(quizId) || null;
  }

  /**
   * Get all quizzes for a session
   * WHY useful: Instructor dashboard showing all quizzes from a class session
   * Returns empty array if no quizzes found (not null, easier for UI)
   */
  getBySession(sessionId: string): Quiz[] {
    const quizIds = this.sessionIndex.get(sessionId) || [];
    return quizIds
      .map(id => this.quizzes.get(id))
      .filter((q): q is Quiz => q !== undefined); // Type guard to remove undefined
  }

  /**
   * Update a quiz (for editing questions, changing status)
   * WHY: Instructors need to review and edit AI-generated content before publishing
   * Automatically updates lastModified timestamp
   * 
   * Returns updated quiz or null if quiz doesn't exist
   */
  update(quizId: string, updates: Partial<Quiz>): Quiz | null {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) return null;

    // Apply updates and set lastModified timestamp
    // WHY lastModified: Track when instructor edited the quiz (important for audit trail)
    Object.assign(quiz, updates, { lastModified: new Date() });
    
    return quiz;
  }

  /**
   * Delete a quiz
   * WHY needed: Instructor may want to remove poorly generated or outdated quizzes
   * 
   * Returns true if deleted, false if quiz didn't exist
   * 
   * IMPORTANT: Also removes from session index to prevent orphaned references
   */
  delete(quizId: string): boolean {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) return false;

    // Remove from primary store
    this.quizzes.delete(quizId);

    // Remove from session index
    // WHY: Prevents sessionIndex pointing to deleted quiz (would cause getBySession to fail)
    const sessionQuizzes = this.sessionIndex.get(quiz.sessionId) || [];
    const filtered = sessionQuizzes.filter(id => id !== quizId);
    this.sessionIndex.set(quiz.sessionId, filtered);

    return true;
  }

  /**
   * Clear all quizzes for a session
   * WHY: Useful for testing, or if instructor wants to start fresh
   * Also removes session from index to prevent memory leaks
   */
  clearSession(sessionId: string): void {
    const quizIds = this.sessionIndex.get(sessionId) || [];
    
    // Delete all quizzes from primary store
    quizIds.forEach(id => this.quizzes.delete(id));
    
    // Remove session from index
    this.sessionIndex.delete(sessionId);
  }

  /**
   * Get total number of quizzes (for monitoring/debugging)
   */
  size(): number {
    return this.quizzes.size;
  }

  /**
   * Get all session IDs that have quizzes (for monitoring/debugging)
   */
  getSessions(): string[] {
    return Array.from(this.sessionIndex.keys());
  }
}

// ============================================================================
// Jotai Atoms for Quiz State Management (Client-side)
// ============================================================================
// WHY Jotai atoms alongside class-based store:
// - Class-based store is for server-side API routes (in-memory persistence)
// - Jotai atoms are for client-side React components (reactive state)
// - Instructor UI needs reactive updates for quiz status changes
// - Telemetry tracking needs to be visible in real-time to the instructor

import { atom } from 'jotai';

/**
 * QuizStatus represents the lifecycle state of a quiz in the UI
 * 
 * WHY separate from Quiz type:
 * - Quiz is the full data structure (questions, answers, etc.)
 * - QuizStatus is lightweight metadata for instructor visibility
 * - Status can be updated without reloading entire quiz
 */
export interface QuizStatus {
  quizId: string;                    // Unique identifier
  phase: 'pending' | 'active' | 'completed'; // Current lifecycle phase
  createdAt: Date;                   // When quiz was generated
  startedAt?: Date;                  // When quiz became active (optional)
  endedAt?: Date;                    // When quiz ended (optional)
  transcriptSegmentId?: string;      // Reference to source transcript (optional)
  questionCount: number;             // Number of questions in quiz
  deliveredToCount: number;          // How many students received quiz
  viewedByCount: number;             // How many students opened quiz
}

/**
 * QuizTelemetryEvent tracks lifecycle events for instructor verification
 * 
 * WHY telemetry:
 * - Instructors need to confirm quiz actually ran ("did my quiz work?")
 * - Provides audit trail for testing and troubleshooting
 * - Simple event log, no complex analytics (MVP approach)
 */
export interface QuizTelemetryEvent {
  quizId: string;                    // Which quiz this event is for
  eventType: 'created' | 'started' | 'ended' | 'delivered' | 'viewed'; // Event type
  timestamp: Date;                   // When event occurred
  metadata?: Record<string, unknown>; // Optional context data
}

/**
 * Active quiz atom - tracks the currently active quiz (if any)
 * 
 * WHY single active quiz:
 * - Instructors can only have one quiz running at a time (keeps UI simple)
 * - null when no quiz is active (default state)
 * - Updated when quiz starts or ends
 */
export const activeQuizAtom = atom<QuizStatus | null>(null);

/**
 * Quiz history atom - stores all quizzes from the current session
 * 
 * WHY array:
 * - Instructor can review past quizzes during session
 * - Ordered chronologically (newest last)
 * - Cleared when session ends (in-memory only)
 */
export const quizHistoryAtom = atom<QuizStatus[]>([]);

/**
 * Quiz telemetry atom - logs all quiz lifecycle events
 * 
 * WHY separate from history:
 * - History is for quiz metadata (one entry per quiz)
 * - Telemetry is for events (multiple entries per quiz: created, started, ended, etc.)
 * - Enables instructor to see detailed timeline of what happened
 * 
 * Example telemetry flow:
 * 1. created event → quiz generated from transcript
 * 2. started event → instructor activated quiz
 * 3. delivered events → each student received quiz
 * 4. viewed events → each student opened quiz
 * 5. ended event → instructor or timer ended quiz
 */
export const quizTelemetryAtom = atom<QuizTelemetryEvent[]>([]);

