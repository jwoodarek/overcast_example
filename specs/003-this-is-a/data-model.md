# Data Model: Intelligent Education Video Platform

**Phase 1 Output** | **Date**: October 7, 2025  
**Purpose**: Define in-memory data structures for transcripts, alerts, and quizzes

## Overview

This document defines the TypeScript interfaces and in-memory storage structures for the intelligent education features. Since we're not using a database initially, all data is stored in-memory using custom store classes.

**Storage Strategy**: In-memory Maps with automatic cleanup on session end  
**Persistence**: Lost on server restart (acceptable for MVP)  
**Future Migration**: Replace Map with PostgreSQL queries (same interfaces)

---

## Core Entities

### TranscriptEntry

**Purpose**: Represents a single spoken utterance by a participant

**TypeScript Interface**:
```typescript
export interface TranscriptEntry {
  /**
   * Unique identifier for this transcript entry
   * Format: `${sessionId}-${timestamp}-${random}`
   */
  id: string;

  /**
   * Session ID (classroom or breakout room)
   * Matches Daily.co room session ID
   */
  sessionId: string;

  /**
   * Daily.co participant ID who spoke
   * Used to correlate with participant metadata
   */
  speakerId: string;

  /**
   * Role of the speaker (determined at join time)
   * WHY: Needed to filter instructor vs student speech for quiz generation
   */
  speakerRole: 'instructor' | 'student';

  /**
   * Display name of speaker
   * WHY: Useful for debugging and potential future features
   */
  speakerName: string;

  /**
   * Transcribed text content
   * Language: English (can expand later)
   */
  text: string;

  /**
   * When this was spoken (server timestamp)
   * WHY: Server timestamp is authoritative, client times can drift
   */
  timestamp: Date;

  /**
   * Transcription confidence score (0.0 - 1.0)
   * WHY: Used to filter low-confidence transcripts from analysis
   * Example: 0.95 = high confidence, 0.3 = poor audio quality
   */
  confidence: number;

  /**
   * Optional: Breakout room name if in breakout session
   * null if in main classroom
   */
  breakoutRoomName?: string | null;
}
```

**Validation Rules**:
- `id`: Non-empty string, unique across all entries
- `sessionId`: Non-empty string, matches Daily.co session format
- `speakerId`: Non-empty string, matches Daily participant ID
- `speakerRole`: Must be exactly 'instructor' or 'student'
- `text`: Non-empty string, max 1000 characters per entry
- `timestamp`: Valid Date object, not in future
- `confidence`: Number between 0.0 and 1.0
- `breakoutRoomName`: Optional string or null

**Examples**:
```typescript
// Instructor speaking in main classroom
{
  id: 'session-123-1696700000000-abc',
  sessionId: 'classroom-01',
  speakerId: 'participant-456',
  speakerRole: 'instructor',
  speakerName: 'Dr. Smith',
  text: 'Today we will discuss derivatives and their applications.',
  timestamp: new Date('2025-10-07T14:30:00Z'),
  confidence: 0.98,
  breakoutRoomName: null
}

// Student speaking in breakout room
{
  id: 'session-789-1696700120000-def',
  sessionId: 'breakout-room-2',
  speakerId: 'participant-789',
  speakerRole: 'student',
  speakerName: 'Alice',
  text: 'I don\'t understand how to find the derivative of this function.',
  timestamp: new Date('2025-10-07T14:32:00Z'),
  confidence: 0.92,
  breakoutRoomName: 'Group 2'
}
```

---

### HelpAlert

**Purpose**: Represents a detected instance of students needing help

**TypeScript Interface**:
```typescript
export interface HelpAlert {
  /**
   * Unique identifier for this alert
   * Format: `alert-${timestamp}-${random}`
   */
  id: string;

  /**
   * Which classroom session this alert belongs to
   * WHY: Main classroom instructor needs to see all breakout room alerts
   */
  classroomSessionId: string;

  /**
   * Which breakout room (or main classroom) triggered this alert
   */
  breakoutRoomSessionId: string;

  /**
   * Human-readable breakout room name
   * null if alert is from main classroom
   * Example: "Group 2", "Room B"
   */
  breakoutRoomName: string | null;

  /**
   * When help was detected (server timestamp)
   */
  detectedAt: Date;

  /**
   * What topic/concept students are struggling with
   * Extracted from transcript context around help keywords
   * Example: "derivatives", "SQL joins", "chemical bonding"
   */
  topic: string;

  /**
   * How urgent is this help request?
   * - low: Mild confusion, can wait
   * - medium: Repeated confusion, should address soon
   * - high: Clear distress, immediate attention needed
   */
  urgency: 'low' | 'medium' | 'high';

  /**
   * Which keywords triggered this alert
   * WHY: Transparent system - instructor can see detection logic
   * Example: ["stuck", "don't understand"]
   */
  triggerKeywords: string[];

  /**
   * 2-3 sentences of transcript around detection point
   * WHY: Provides context for instructor to understand situation
   * Max length: 300 characters
   */
  contextSnippet: string;

  /**
   * Current status of this alert
   * - pending: New alert, not yet seen by instructor
   * - acknowledged: Instructor has seen it
   * - resolved: Instructor handled it (joined room, etc.)
   * - dismissed: False positive or no longer relevant
   */
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

  /**
   * Instructor ID who acknowledged/resolved this alert
   * null if still pending
   */
  acknowledgedBy: string | null;

  /**
   * When the alert was acknowledged/resolved
   * null if still pending
   */
  acknowledgedAt: Date | null;

  /**
   * Transcript entry IDs that contributed to this alert
   * WHY: Can trace back to exact moments for debugging
   */
  sourceTranscriptIds: string[];
}
```

**Validation Rules**:
- `id`: Non-empty string, unique
- `classroomSessionId`: Non-empty string
- `breakoutRoomSessionId`: Non-empty string
- `topic`: Non-empty string, max 100 characters
- `urgency`: Exactly 'low', 'medium', or 'high'
- `triggerKeywords`: Array of at least 1 keyword
- `contextSnippet`: Max 300 characters
- `status`: Valid status enum value
- `acknowledgedBy`: null or non-empty string
- `sourceTranscriptIds`: Array of valid transcript IDs

**State Transitions**:
```
pending → acknowledged → resolved
        ↘ dismissed    ↗
```

Only instructors can change status. Students cannot see alerts.

**Examples**:
```typescript
// Medium urgency alert from breakout room
{
  id: 'alert-1696700180000-xyz',
  classroomSessionId: 'classroom-01',
  breakoutRoomSessionId: 'breakout-room-2',
  breakoutRoomName: 'Group 2',
  detectedAt: new Date('2025-10-07T14:33:00Z'),
  topic: 'derivatives',
  urgency: 'medium',
  triggerKeywords: ['don\'t understand', 'confused'],
  contextSnippet: 'Alice: "I don\'t understand how to find the derivative of this function." Bob: "Yeah, I\'m confused too about the chain rule."',
  status: 'pending',
  acknowledgedBy: null,
  acknowledgedAt: null,
  sourceTranscriptIds: ['session-789-1696700120000-def', 'session-789-1696700125000-ghi']
}

// High urgency alert (resolved)
{
  id: 'alert-1696700240000-abc',
  classroomSessionId: 'classroom-01',
  breakoutRoomSessionId: 'breakout-room-3',
  breakoutRoomName: 'Group 3',
  detectedAt: new Date('2025-10-07T14:34:00Z'),
  topic: 'integrals',
  urgency: 'high',
  triggerKeywords: ['stuck', 'give up'],
  contextSnippet: 'Charlie: "I\'m completely stuck on this integral problem. I might just give up."',
  status: 'resolved',
  acknowledgedBy: 'instructor-dr-smith',
  acknowledgedAt: new Date('2025-10-07T14:35:00Z'),
  sourceTranscriptIds: ['session-999-1696700235000-jkl']
}
```

---

### Quiz and QuizQuestion

**Purpose**: AI-generated quiz questions from instructor content

**TypeScript Interfaces**:
```typescript
export interface Quiz {
  /**
   * Unique identifier for this quiz
   * Format: `quiz-${sessionId}-${timestamp}`
   */
  id: string;

  /**
   * Which classroom session this quiz was generated from
   */
  sessionId: string;

  /**
   * Instructor ID who requested generation
   * WHY: Only the creator can edit/delete (future feature)
   */
  createdBy: string;

  /**
   * Instructor display name
   */
  createdByName: string;

  /**
   * When this quiz was generated
   */
  createdAt: Date;

  /**
   * Last time quiz was edited
   * Equals createdAt if never edited
   */
  lastModified: Date;

  /**
   * Transcript entry IDs used for generation
   * WHY: Traceability - instructor can see what content was used
   * Only includes instructor transcripts (no student speech)
   */
  sourceTranscriptIds: string[];

  /**
   * Array of quiz questions (5-10 questions)
   */
  questions: QuizQuestion[];

  /**
   * Current status
   * - draft: Generated but not finalized
   * - published: Instructor approved, ready for students
   * WHY: Instructor must review before sharing
   */
  status: 'draft' | 'published';

  /**
   * Optional: Title for the quiz
   * Auto-generated from first topic mentioned or manually set
   * Example: "Derivatives Quiz", "SQL Joins Practice"
   */
  title?: string;
}

export interface QuizQuestion {
  /**
   * Unique identifier within quiz
   * Format: `${quizId}-q${index}`
   */
  id: string;

  /**
   * Type of question
   * multiple_choice: 4 options, 1 correct
   * true_false: Boolean answer
   */
  type: 'multiple_choice' | 'true_false';

  /**
   * The question text
   * Clear, unambiguous, tests understanding not memorization
   */
  question: string;

  /**
   * Answer options (for multiple choice only)
   * Always exactly 4 options: A, B, C, D
   * null for true/false questions
   */
  options: string[] | null;

  /**
   * Correct answer
   * For multiple_choice: index into options array (0-3) or letter ('A'-'D')
   * For true_false: boolean value
   */
  correctAnswer: string | boolean;

  /**
   * Brief explanation of why this is the answer
   * Educational: helps students learn from mistakes
   * 1-3 sentences, max 200 characters
   */
  explanation: string;

  /**
   * Difficulty level
   * easy: Basic recall or simple application
   * medium: Requires understanding and synthesis
   * hard: Complex problem-solving or analysis
   */
  difficulty: 'easy' | 'medium' | 'hard';

  /**
   * Which transcript segments this question was based on
   * WHY: If instructor edits transcript, we know which questions to regenerate
   */
  sourceTranscriptIds: string[];
}
```

**Validation Rules**:

Quiz:
- `id`: Unique, matches format
- `sessionId`: Valid session ID
- `questions`: Array of 2-10 questions
- `sourceTranscriptIds`: Non-empty array, all IDs valid
- `status`: 'draft' or 'published'

QuizQuestion:
- `type`: 'multiple_choice' or 'true_false'
- `question`: Non-empty, max 300 characters
- `options`: Exactly 4 strings for multiple_choice, null for true_false
- `correctAnswer`: Valid index/letter for MC, boolean for TF
- `explanation`: Non-empty, max 200 characters
- `difficulty`: Valid difficulty level

**Examples**:
```typescript
// Complete quiz with mixed question types
{
  id: 'quiz-classroom-01-1696700400000',
  sessionId: 'classroom-01',
  createdBy: 'instructor-dr-smith',
  createdByName: 'Dr. Smith',
  createdAt: new Date('2025-10-07T14:40:00Z'),
  lastModified: new Date('2025-10-07T14:40:00Z'),
  sourceTranscriptIds: [
    'session-123-1696700000000-abc',
    'session-123-1696700060000-def',
    'session-123-1696700120000-ghi'
  ],
  questions: [
    {
      id: 'quiz-classroom-01-1696700400000-q0',
      type: 'multiple_choice',
      question: 'What is the derivative of x^2?',
      options: ['x', '2x', 'x^2', '2'],
      correctAnswer: 'B',  // or index 1
      explanation: 'Using the power rule, bring down the exponent and reduce the power by 1: 2 * x^(2-1) = 2x',
      difficulty: 'easy',
      sourceTranscriptIds: ['session-123-1696700000000-abc']
    },
    {
      id: 'quiz-classroom-01-1696700400000-q1',
      type: 'true_false',
      question: 'The derivative of a constant is always zero.',
      options: null,
      correctAnswer: true,
      explanation: 'Constants have no rate of change, so their derivative is always 0.',
      difficulty: 'easy',
      sourceTranscriptIds: ['session-123-1696700060000-def']
    },
    {
      id: 'quiz-classroom-01-1696700400000-q2',
      type: 'multiple_choice',
      question: 'When applying the chain rule to f(g(x)), you multiply f\'(g(x)) by what?',
      options: ['f(x)', 'g(x)', 'g\'(x)', 'f\'(x)'],
      correctAnswer: 'C',
      explanation: 'The chain rule states: d/dx[f(g(x))] = f\'(g(x)) * g\'(x). You multiply the derivative of the outer function by the derivative of the inner function.',
      difficulty: 'medium',
      sourceTranscriptIds: ['session-123-1696700120000-ghi']
    }
  ],
  status: 'draft',
  title: 'Derivatives Fundamentals'
}
```

---

## In-Memory Store Implementations

### TranscriptStore

**Purpose**: Store and retrieve transcript entries efficiently

```typescript
export class TranscriptStore {
  // sessionId → array of transcript entries (append-only)
  private transcripts: Map<string, TranscriptEntry[]> = new Map();

  /**
   * Add a new transcript entry.
   * WHY: Append-only ensures no data loss during active session.
   */
  add(entry: TranscriptEntry): void {
    const existing = this.transcripts.get(entry.sessionId) || [];
    existing.push(entry);
    this.transcripts.set(entry.sessionId, existing);
  }

  /**
   * Get transcripts for a session with optional filtering.
   */
  get(sessionId: string, options?: {
    since?: Date;           // Only entries after this time
    role?: 'instructor' | 'student';  // Filter by speaker role
    minConfidence?: number; // Minimum confidence score
  }): TranscriptEntry[] {
    let entries = this.transcripts.get(sessionId) || [];

    if (options?.since) {
      entries = entries.filter(e => e.timestamp > options.since);
    }

    if (options?.role) {
      entries = entries.filter(e => e.speakerRole === options.role);
    }

    if (options?.minConfidence) {
      entries = entries.filter(e => e.confidence >= options.minConfidence);
    }

    return entries;
  }

  /**
   * Get entries by IDs (for alert source tracing).
   */
  getByIds(ids: string[]): TranscriptEntry[] {
    const allEntries = Array.from(this.transcripts.values()).flat();
    return allEntries.filter(e => ids.includes(e.id));
  }

  /**
   * Clear all transcripts for a session.
   * WHY: Called when session ends to prevent memory leaks.
   */
  clear(sessionId: string): void {
    this.transcripts.delete(sessionId);
  }

  /**
   * Get all active session IDs.
   */
  getSessions(): string[] {
    return Array.from(this.transcripts.keys());
  }

  /**
   * Get total entry count (for monitoring).
   */
  size(): number {
    return Array.from(this.transcripts.values())
      .reduce((sum, entries) => sum + entries.length, 0);
  }
}
```

**Memory Management**:
- Average entry size: ~200 bytes
- Max entries per session: ~5000 (typical 1-hour class)
- Memory per session: ~1 MB
- Auto-cleanup on session end

---

### AlertStore

**Purpose**: Store and manage help alerts for instructors

```typescript
export class AlertStore {
  // classroomSessionId → array of alerts
  private alerts: Map<string, HelpAlert[]> = new Map();

  /**
   * Create a new alert.
   * WHY: Alerts are immutable after creation (only status changes).
   */
  create(alert: HelpAlert): void {
    const existing = this.alerts.get(alert.classroomSessionId) || [];
    existing.push(alert);
    this.alerts.set(alert.classroomSessionId, existing);
  }

  /**
   * Get alerts for a classroom with optional filtering.
   */
  get(classroomSessionId: string, options?: {
    status?: HelpAlert['status'];
    urgency?: HelpAlert['urgency'];
    breakoutRoom?: string;  // Filter by specific breakout room
  }): HelpAlert[] {
    let alerts = this.alerts.get(classroomSessionId) || [];

    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    if (options?.urgency) {
      alerts = alerts.filter(a => a.urgency === options.urgency);
    }

    if (options?.breakoutRoom) {
      alerts = alerts.filter(a => a.breakoutRoomName === options.breakoutRoom);
    }

    // Sort by urgency (high first) then by time (newest first)
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
   */
  updateStatus(
    alertId: string,
    status: HelpAlert['status'],
    instructorId: string
  ): HelpAlert | null {
    for (const alerts of this.alerts.values()) {
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
   * Clear alerts for a classroom.
   */
  clear(classroomSessionId: string): void {
    this.alerts.delete(classroomSessionId);
  }

  /**
   * Auto-dismiss old alerts (30-minute timeout).
   * WHY: Prevents alert overflow if instructor misses them.
   * Call this periodically (every 5 minutes).
   */
  autoDismissOld(): number {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    let dismissedCount = 0;

    for (const alerts of this.alerts.values()) {
      for (const alert of alerts) {
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
}
```

**Memory Management**:
- Average alert size: ~500 bytes
- Max alerts per session: ~50 (typical)
- Memory per session: ~25 KB
- Auto-dismissal prevents unbounded growth

---

### QuizStore

**Purpose**: Store generated quizzes

```typescript
export class QuizStore {
  // quizId → Quiz object
  private quizzes: Map<string, Quiz> = new Map();
  // sessionId → array of quiz IDs (for lookup)
  private sessionIndex: Map<string, string[]> = new Map();

  /**
   * Save a quiz.
   */
  save(quiz: Quiz): void {
    this.quizzes.set(quiz.id, quiz);

    // Update session index
    const sessionQuizzes = this.sessionIndex.get(quiz.sessionId) || [];
    if (!sessionQuizzes.includes(quiz.id)) {
      sessionQuizzes.push(quiz.id);
      this.sessionIndex.set(quiz.sessionId, sessionQuizzes);
    }
  }

  /**
   * Get a quiz by ID.
   */
  get(quizId: string): Quiz | null {
    return this.quizzes.get(quizId) || null;
  }

  /**
   * Get all quizzes for a session.
   */
  getBySession(sessionId: string): Quiz[] {
    const quizIds = this.sessionIndex.get(sessionId) || [];
    return quizIds
      .map(id => this.quizzes.get(id))
      .filter((q): q is Quiz => q !== undefined);
  }

  /**
   * Update a quiz (for editing questions).
   */
  update(quizId: string, updates: Partial<Quiz>): Quiz | null {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) return null;

    Object.assign(quiz, updates, { lastModified: new Date() });
    return quiz;
  }

  /**
   * Delete a quiz.
   */
  delete(quizId: string): boolean {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) return false;

    // Remove from main store
    this.quizzes.delete(quizId);

    // Remove from session index
    const sessionQuizzes = this.sessionIndex.get(quiz.sessionId) || [];
    const filtered = sessionQuizzes.filter(id => id !== quizId);
    this.sessionIndex.set(quiz.sessionId, filtered);

    return true;
  }

  /**
   * Clear all quizzes for a session.
   * WHY: Quizzes persist across restarts if we add database later,
   * but can be cleared for testing.
   */
  clearSession(sessionId: string): void {
    const quizIds = this.sessionIndex.get(sessionId) || [];
    quizIds.forEach(id => this.quizzes.delete(id));
    this.sessionIndex.delete(sessionId);
  }
}
```

**Memory Management**:
- Average quiz size: ~5 KB (10 questions × 500 bytes)
- Max quizzes per session: ~10 (reasonable)
- Memory per session: ~50 KB
- Quizzes persist for server lifetime (not auto-deleted)

---

## Singleton Instances

**Export singleton instances for use across API routes:**

```typescript
// lib/store/index.ts
export const transcriptStore = new TranscriptStore();
export const alertStore = new AlertStore();
export const quizStore = new QuizStore();

// Optional: Periodic cleanup
setInterval(() => {
  alertStore.autoDismissOld();
}, 5 * 60 * 1000); // Every 5 minutes
```

**Usage in API routes:**
```typescript
// app/api/transcripts/[sessionId]/route.ts
import { transcriptStore } from '@/lib/store';

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const entries = transcriptStore.get(params.sessionId);
  return Response.json({ entries });
}
```

---

## Relationships

```
Classroom Session (1)
  ├─> Transcript Entries (many)
  ├─> Help Alerts (many)
  └─> Quizzes (many)

Breakout Room Session (1)
  ├─> Transcript Entries (many)
  └─> Help Alerts (many) → rolled up to Classroom

Help Alert (1)
  └─> Source Transcript Entries (many) [reference by ID]

Quiz (1)
  ├─> Quiz Questions (many) [embedded]
  └─> Source Transcript Entries (many) [reference by ID]
```

**No foreign key constraints** (in-memory, no database).  
**References are by ID** (string matching).  
**Cleanup is manual** (on session end).

---

## Future Database Migration

When adding PostgreSQL:

1. **Tables match entities 1:1**:
   - `transcript_entries` table
   - `help_alerts` table
   - `quizzes` table
   - `quiz_questions` table (separate or JSONB array)

2. **Store interfaces stay the same**:
   - `TranscriptStore` implementation changes to SQL queries
   - API routes don't change (same store interface)

3. **Additional features enabled**:
   - Historical transcript search
   - Cross-session analytics
   - Persistent quiz library
   - Audit logs

**Migration is additive** - no breaking changes to existing code.

---

## Data Model Complete ✅

All entities defined with:
- TypeScript interfaces
- Validation rules
- Store implementations
- Memory management
- Migration path to database

**Ready for Phase 1 (API Contracts)**

---

*Data model completed: October 7, 2025*


