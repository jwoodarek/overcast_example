# Data Model: Instructor Interface Improvements

**Feature**: 004-audio-video-controls  
**Date**: 2025-10-08  
**Storage**: In-memory only (Jotai atoms, cleared on session end)

## Overview
This document defines the data entities and their relationships for instructor interface improvements. All state is stored in-memory using Jotai atoms and cleared when the session ends. No database persistence.

---

## Entity Definitions

### 1. MediaControlState

Represents the current on/off state of instructor's local media devices.

**Fields**:
- `microphoneEnabled: boolean` - Whether instructor's microphone is active
- `cameraEnabled: boolean` - Whether instructor's camera is active
- `microphonePending: boolean` - Loading state while microphone toggles (optimistic UI)
- `cameraPending: boolean` - Loading state while camera toggles (optimistic UI)

**Validation Rules**:
- States are boolean (no null/undefined)
- Pending states reset to false after operation completes or times out (>200ms)

**State Transitions**:
```
enabled: false → pending: true → enabled: true (on successful toggle)
enabled: false → pending: true → enabled: false (on failed toggle, stays off)
```

**Storage**: `lib/store/media-store.ts` (new file)
```typescript
export const mediaControlStateAtom = atom({
  microphoneEnabled: false,
  cameraEnabled: false,
  microphonePending: false,
  cameraPending: false,
});
```

---

### 2. ParticipantAudioState

Represents each participant's mute/unmute status for calculating aggregate controls.

**Fields**:
- `sessionId: string` - Daily.co session identifier (unique per participant)
- `name: string` - Participant display name
- `isMuted: boolean` - Current audio state
- `isInstructor: boolean` - Role flag (instructors excluded from "mute all" operations)

**Validation Rules**:
- `sessionId` must be non-empty string
- `name` must be non-empty string
- `isMuted` and `isInstructor` are required booleans

**Relationships**:
- One-to-many: A classroom session has multiple ParticipantAudioState entries
- Related to: BreakoutRoom (participants can be in breakout rooms)

**Derived Values**:
- `allStudentsMuted: boolean` - Computed from all non-instructor participants
- `muteAllButtonLabel: 'Mute All' | 'Unmute All'` - Computed based on aggregate state

**Storage**: Derived from Daily.co participant list via `useParticipants()` hook + local Jotai atom for extended metadata

```typescript
export const participantStatesAtom = atom<Map<string, ParticipantAudioState>>(new Map());
```

---

### 3. BreakoutRoom

A sub-session configuration for group work within the main classroom.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `name: string` - Display name (e.g., "Breakout Room 1", "Group A")
- `dailyRoomUrl: string` - Daily.co room URL for this breakout
- `participantIds: string[]` - Array of participant session IDs assigned to this room
- `status: 'active' | 'closed'` - Current state
- `createdAt: Date` - Timestamp of creation
- `closedAt?: Date` - Timestamp when closed (optional)

**Validation Rules**:
- `id` must be unique across session
- `name` must be non-empty
- `participantIds` array can be empty (room can exist without participants)
- Maximum 10 active breakout rooms per session (enforced at creation)
- Participants can only be in one breakout room at a time

**State Transitions**:
```
[no room] → active (instructor creates breakout)
active → closed (instructor ends breakout or session ends)
```

**Relationships**:
- One-to-many: A BreakoutRoom has multiple participants (via `participantIds`)
- One-to-one: A BreakoutRoom has one chat room (via shared `roomId`)

**Storage**: `lib/store/breakout-store.ts` (new file)
```typescript
export const breakoutRoomsAtom = atom<BreakoutRoom[]>([]);
export const activeBreakoutCountAtom = atom((get) => 
  get(breakoutRoomsAtom).filter(r => r.status === 'active').length
);
```

---

### 4. HelpAlert

A notification triggered when a student needs assistance.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `studentId: string` - Participant session ID who needs help
- `studentName: string` - Display name for UI
- `roomId: string` - Where help is needed ('main' or breakout room ID)
- `timestamp: Date` - When alert was created
- `issueSummary: string` - Brief description of what student is struggling with
- `status: 'pending' | 'acknowledged' | 'dismissed'` - Alert lifecycle state
- `acknowledgedAt?: Date` - When instructor viewed/acknowledged (optional)

**Validation Rules**:
- `studentId` and `studentName` must be non-empty
- `roomId` must reference an existing room (main or active breakout)
- `issueSummary` must be non-empty (max 500 characters for UI display)
- Multiple alerts can exist for same student (don't deduplicate automatically)

**State Transitions**:
```
pending → acknowledged (instructor views alert)
pending → dismissed (instructor closes alert)
acknowledged → dismissed (instructor marks as resolved)
```

**Relationships**:
- Many-to-one: Multiple alerts can come from one student
- Many-to-one: Multiple alerts can come from one breakout room

**Storage**: `lib/store/alert-store.ts` (existing file, extend)
```typescript
export const helpAlertsAtom = atom<HelpAlert[]>([]);
export const pendingAlertsAtom = atom((get) =>
  get(helpAlertsAtom).filter(a => a.status === 'pending')
);
```

---

### 5. QuizStatus

Real-time state of quiz activity including telemetry for instructor visibility.

**Fields**:
- `quizId: string` - Unique identifier
- `phase: 'pending' | 'active' | 'completed'` - Current lifecycle phase
- `createdAt: Date` - When quiz was generated
- `startedAt?: Date` - When quiz became active (optional)
- `endedAt?: Date` - When quiz ended (optional)
- `transcriptSegmentId?: string` - Reference to source transcript (optional)
- `questionCount: number` - Number of questions in quiz
- `deliveredToCount: number` - How many students received quiz
- `viewedByCount: number` - How many students opened quiz

**Validation Rules**:
- `quizId` must be unique
- `phase` progresses linearly (pending → active → completed)
- `startedAt` required when phase is 'active' or 'completed'
- `endedAt` required when phase is 'completed'
- `questionCount` must be > 0

**State Transitions**:
```
pending (created) → active (instructor starts) → completed (instructor ends or timeout)
```

**Relationships**:
- One-to-one: QuizStatus references one transcript segment (where questions sourced from)
- One-to-many: QuizStatus can have multiple telemetry events (lifecycle log)

**Storage**: `lib/store/quiz-store.ts` (existing file, extend)
```typescript
export const activeQuizAtom = atom<QuizStatus | null>(null);
export const quizHistoryAtom = atom<QuizStatus[]>([]);
export const quizTelemetryAtom = atom<QuizTelemetryEvent[]>([]);

type QuizTelemetryEvent = {
  quizId: string;
  eventType: 'created' | 'started' | 'ended' | 'delivered' | 'viewed';
  timestamp: Date;
  metadata?: Record<string, any>;
};
```

---

### 6. TranscriptEntry

A time-stamped line of transcribed speech during the classroom session.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `timestamp: Date` - When words were spoken
- `speakerId: string` - Participant session ID
- `speakerName: string` - Display name
- `role: 'instructor' | 'student'` - Speaker's role
- `text: string` - Transcribed content
- `sessionId: string` - Classroom session identifier
- `confidence?: number` - Transcription confidence score 0-1 (optional)

**Validation Rules**:
- `timestamp` must be within current session time range
- `text` must be non-empty (whitespace-only entries discarded)
- `role` must be valid enum value
- Entries stored in chronological order (sorted by timestamp)

**Storage & Lifecycle**:
- Stored in-memory during session: `lib/store/transcript-store.ts`
- Cleared on session end
- Exportable as CSV or JSON before session ends

**Export Formats**:
- **CSV**: `Timestamp,Speaker,Text` (3 columns, RFC 4180 escaping)
- **JSON**: Structured with session metadata and array of entries

```typescript
export const transcriptEntriesAtom = atom<TranscriptEntry[]>([]);
export const transcriptScrollPositionAtom = atom<number>(0); // For scrollback UI
```

---

### 7. LayoutConfiguration

Instructor's current video arrangement preferences.

**Fields**:
- `preset: 'grid' | 'spotlight' | 'custom'` - Active layout mode
- `tileSizes: Map<string, { width: number; height: number }>` - Custom sizes per participant (only used when preset='custom')
- `gridColumns?: number` - For grid mode, optional column count override
- `spotlightParticipantId?: string` - For spotlight mode, which participant to highlight (if not auto-detected by audio)

**Validation Rules**:
- `preset` must be valid enum value
- `tileSizes` widths must be >= 160px and <= 25% of viewport width
- `tileSizes` heights must maintain 16:9 aspect ratio (±5% tolerance)
- `gridColumns` must be 1-6 (if specified)

**State Transitions**:
```
grid → spotlight (instructor selects preset)
grid → custom (instructor drags to resize any tile)
spotlight → custom (instructor drags to resize)
custom → grid/spotlight (instructor selects preset, resets custom sizes)
[any mode] → [screen share mode] (temporary override when screen share detected)
```

**Responsive Behavior**:
- Desktop (>1024px): All presets + drag-resize enabled
- Tablet (768-1024px): Presets only, drag-resize disabled (touch targets too small)
- Mobile (<768px): Auto-selected preset based on participant count, no customization

**Storage**: `lib/store/layout-store.ts` (new file)
```typescript
export const layoutConfigAtom = atom<LayoutConfiguration>({
  preset: 'grid',
  tileSizes: new Map(),
});

export const screenShareActiveAtom = atom<boolean>(false); // Overrides preset temporarily
```

---

### 8. ChatMessage

A text communication sent by a participant.

**Fields**:
- `id: string` - Unique identifier (UUID)
- `timestamp: Date` - When message was sent
- `senderId: string` - Participant session ID
- `senderName: string` - Display name
- `role: 'instructor' | 'student'` - Sender's role
- `text: string` - Message content
- `roomId: string` - Scope: 'main' or breakout room ID
- `sessionId: string` - Classroom session identifier

**Validation Rules**:
- `text` must be non-empty and <= 2000 characters
- `roomId` must reference existing room (main or active breakout)
- `timestamp` must be within session time range
- Messages immutable after creation (no editing/deletion in v1)

**Visibility Rules**:
- **Main room messages**: Visible to all participants
- **Breakout room messages**: Visible only to participants in that breakout + instructor
- **Instructor**: Can view messages from all rooms, can send to any room

**Storage & Lifecycle**:
- Stored in-memory during session
- Scoped by `roomId` using Jotai atomFamily
- Cleared on session end
- No export functionality in v1 (can add if requested)

```typescript
// lib/store/chat-store.ts (new file)
export const chatMessagesAtomFamily = atomFamily((roomId: string) =>
  atom<ChatMessage[]>([])
);

export const activeRoomAtom = atom<string>('main'); // Current chat view
export const unreadCountsAtom = atom<Record<string, number>>({}); // Per-room unread counts
```

---

## Relationships Diagram

```
ClassroomSession
  ├─ has many → ParticipantAudioState (via Daily.co participant list)
  ├─ has many → BreakoutRoom (1-10 active at a time)
  │    └─ has many → ChatMessage (scoped by breakout roomId)
  ├─ has many → HelpAlert (from any room: main or breakout)
  ├─ has one → QuizStatus (active quiz, if any)
  ├─ has many → TranscriptEntry (chronological log)
  ├─ has many → ChatMessage (scoped by 'main' roomId)
  ├─ has one → MediaControlState (instructor's local devices)
  └─ has one → LayoutConfiguration (instructor's view preferences)
```

**Key Points**:
- All entities tied to single classroom session (sessionId)
- Most entities are collections (arrays, maps) stored in Jotai atoms
- No foreign key enforcement (in-memory, runtime only)
- Cleanup handled by Jotai atom reset when session ends

---

## Storage Implementation Notes

### Jotai Atom Organization

```
lib/store/
├── media-store.ts          [NEW] - MediaControlState
├── breakout-store.ts       [NEW] - BreakoutRoom[]
├── alert-store.ts          [MODIFY] - Extend with HelpAlert
├── quiz-store.ts           [MODIFY] - Extend with QuizStatus + telemetry
├── transcript-store.ts     [MODIFY] - Extend with scrollback position
├── chat-store.ts           [NEW] - ChatMessage (atomFamily by roomId)
└── layout-store.ts         [NEW] - LayoutConfiguration
```

### Cleanup Strategy

All atoms reset on session end via:
```typescript
// In Classroom.tsx cleanup effect
useEffect(() => {
  return () => {
    // Reset all atoms when leaving classroom
    setMediaControlState(RESET);
    setBreakoutRooms(RESET);
    setHelpAlerts(RESET);
    // ... etc for all feature atoms
  };
}, []);
```

---

## Next Steps

Data model complete. Ready to generate API contracts for endpoints that need backend support (primarily chat and breakout room management).

