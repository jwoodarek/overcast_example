# Research: Instructor Interface Improvements

**Feature**: 004-audio-video-controls  
**Date**: 2025-10-08  
**Status**: Complete

## Overview
This document resolves remaining technical unknowns and documents best practices research for implementing instructor interface improvements. All critical decisions from `/clarify` session have been resolved; this covers implementation-level refinements.

---

## 1. Media Control Latency Target (FR-007)

**Question**: Is 500ms acceptable for media state changes, or should we target lower latency?

**Decision**: Target **<200ms** for perceived instant response

**Rationale**:
- Human perception research shows <100ms feels instant, 100-300ms feels responsive, >300ms feels sluggish
- Video conferencing UX best practices (Zoom, Teams, Meet) target <200ms for mic/camera toggles
- Daily.co SDK documentation indicates typical latency for local media toggles is 50-150ms
- 500ms would feel noticeably laggy for frequently-used controls like mute/unmute

**Implementation Approach**:
- Use Daily.co's local media APIs (`setLocalAudio`, `setLocalVideo`) which provide immediate feedback
- Update UI state optimistically (before API confirmation) using controlled component pattern
- Add loading indicators only if operation exceeds 200ms (fallback for network issues)
- Test on slower devices/networks during integration testing

**Alternatives Considered**:
- 500ms: Rejected - too slow for primary controls, degrades instructor experience
- <100ms: Ideal but overly strict given network variability; may cause false failures in testing
- No target: Rejected - needs measurable acceptance criteria

---

## 2. Quiz Telemetry Metrics (FR-037)

**Question**: What specific telemetry data should be tracked for quiz verification?

**Decision**: Track **lifecycle events + basic participation** (no scoring in initial version)

**Metrics to Track**:
1. **Lifecycle Events** (timestamp, quiz ID, state transition):
   - Quiz created (with source transcript segment reference)
   - Quiz started (becomes active)
   - Quiz ended (becomes inactive)
   
2. **Participation Metrics** (for instructor confirmation):
   - Number of students quiz was delivered to
   - Number of students who viewed quiz
   - Quiz duration (start to end timestamp)

3. **Storage Approach**:
   - In-memory array in quiz-store.ts: `quizTelemetryAtom`
   - Cleared on session end (consistent with transcript/chat approach)
   - Exportable as JSON for instructors who want to review after class

**Rationale**:
- Primary goal is instructor visibility ("did my quiz actually run?") - lifecycle events sufficient
- Completion rates and scores require answer submission infrastructure (out of scope for this feature)
- Keeping telemetry simple aligns with constitutional "simplicity first" principle
- Can extend in future without breaking changes (add more fields to telemetry object)

**Alternatives Considered**:
- Full scoring system: Rejected - requires answer validation, grading logic, student result storage (significant scope increase)
- No telemetry: Rejected - instructor explicitly requested this for testing/verification
- Database persistence: Rejected - inconsistent with in-memory-only architecture decision

---

## 3. Video Tile Dimensions (FR-052)

**Question**: What are minimum and maximum dimensions for resizable video tiles?

**Decision**: **Minimum 160x90px (16:9), Maximum container-bound with 25% of viewport**

**Minimum Dimensions**:
- **160x90px** - smallest size where faces remain recognizable
- Maintains 16:9 aspect ratio (standard video format)
- Based on video conferencing usability studies (Zoom minimum tile is 160x120)
- Below this threshold, video becomes decorative rather than functional

**Maximum Dimensions**:
- **No hard pixel maximum** - constrained by container size
- **Layout constraint**: Any single tile cannot exceed 25% of total viewport
- Prevents one participant from dominating screen in Grid mode
- Spotlight mode can use up to 75% for main speaker (exception justified by mode purpose)

**Responsive Breakpoints**:
- Desktop (>1024px): Allow full range (160px min to 25% viewport max)
- Tablet (768-1024px): Constrain to 20% viewport max (smaller screens need more visible participants)
- Mobile (<768px): No drag-resize (touch targets too small), preset layouts only

**Implementation Approach**:
- Use CSS `min-width`, `max-width` with calc() for percentage-based constraints
- Implement drag handles with React DnD or native drag events
- Add visual feedback when tile reaches size limits
- Store preferences in `layout-store.ts` Jotai atom (session-scoped)

**Rationale**:
- 160x90 is industry standard for minimum usable video size
- Percentage-based maximum adapts to different screen sizes naturally
- 25% limit prevents accidental layout breakage while allowing meaningful customization
- Responsive constraints acknowledge different interaction patterns on touch vs mouse

**Alternatives Considered**:
- Fixed pixel maximum (e.g. 800x450): Rejected - doesn't adapt to ultra-wide or 4K displays
- No minimum constraint: Rejected - allows unusable tiny videos, poor UX
- Same constraints for all devices: Rejected - touch interaction needs different ergonomics

---

## 4. Daily.co Breakout Room Best Practices

**Research Topic**: How to reliably create and manage 1-10 breakout rooms using Daily.co API

**Findings**:
- Daily.co breakout rooms created via `createBreakoutRoom()` method
- Each breakout is a separate Daily room with its own URL
- Participants moved via `sendParticipantToBreakout(sessionId, breakoutRoomName)`
- Instructor can join any breakout room to observe or participate
- Maximum 10 breakout rooms aligns with Daily.co's recommended limits for standard plans

**Implementation Approach**:
1. Create breakout rooms on demand (not pre-allocated)
2. Store breakout room metadata in `breakout-store.ts`: name, participants[], Daily room URL
3. Provide modal UI (BreakoutModal.tsx) for drag-drop or click-to-assign participant selection
4. Use Daily's `participantLeft` and `participantJoined` events to track room membership
5. Clean up breakout rooms on session end or when instructor closes them

**Error Handling**:
- Network failures: Show error toast, allow retry
- Participant offline: Move to breakout when they reconnect (store pending assignment)
- Breakout capacity exceeded: Validate participant count before creation, show warning

**References**:
- Daily.co Docs: https://docs.daily.co/reference/rest-api/rooms/create-room
- Daily.co React Hooks: https://docs.daily.co/reference/daily-react/use-daily-event

---

## 5. Keyboard Shortcut Implementation Pattern

**Research Topic**: How to implement global keyboard shortcuts that respect text input focus

**Findings from React Ecosystem**:
- Use `window.addEventListener('keydown', handler)` at top-level component
- Check `event.target.tagName` and `event.target.isContentEditable` to filter text inputs
- Common text input tags: INPUT, TEXTAREA, SELECT, contenteditable elements
- Remove listener on cleanup to prevent memory leaks

**Implementation Pattern**:
```typescript
// In Classroom.tsx or InstructorControls.tsx
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    // Ignore if typing in text field
    const target = event.target as HTMLElement;
    const isTextInput = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;
    
    if (isTextInput) return;
    
    // Handle shortcuts
    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      toggleMicrophone();
    }
    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      toggleCamera();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [toggleMicrophone, toggleCamera]);
```

**Accessibility Considerations**:
- Add `aria-keyshortcuts="m"` to microphone button
- Add `aria-keyshortcuts="c"` to camera button
- Document shortcuts in UI (tooltip or help panel)

**References**:
- React Docs: useEffect cleanup pattern
- ARIA Spec: aria-keyshortcuts property
- MDN: KeyboardEvent reference

---

## 6. Transcript Export Formats (CSV & JSON)

**Research Topic**: Structure for CSV and JSON transcript exports

**CSV Format Decision**:
```csv
Timestamp,Speaker,Text
2025-10-08T14:23:45.123Z,Instructor,Welcome to today's class
2025-10-08T14:23:52.456Z,Alice (Student),Thank you professor
```
- Column headers: Timestamp, Speaker, Text
- Timestamp in ISO 8601 format (sortable, timezone-aware)
- Speaker includes role for clarity (e.g., "Alice (Student)", "Professor Smith (Instructor)")
- CSV escaping for quotes in text content (RFC 4180 standard)

**JSON Format Decision**:
```json
{
  "session_id": "abc123",
  "session_start": "2025-10-08T14:23:00.000Z",
  "exported_at": "2025-10-08T15:30:00.000Z",
  "transcript": [
    {
      "timestamp": "2025-10-08T14:23:45.123Z",
      "speaker_id": "instructor-001",
      "speaker_name": "Professor Smith",
      "role": "instructor",
      "text": "Welcome to today's class"
    },
    {
      "timestamp": "2025-10-08T14:23:52.456Z",
      "speaker_id": "student-alice",
      "speaker_name": "Alice",
      "role": "student",
      "text": "Thank you professor"
    }
  ]
}
```
- Includes session metadata for context
- Each entry has structured speaker information
- Machine-readable for future analysis tools
- Extensible (can add confidence scores, language codes later)

**Implementation**:
- Export button triggers download with filename: `transcript-[session-id]-[date].csv` or `.json`
- Use browser's Blob API + `URL.createObjectURL` for download
- Add utility functions: `exportTranscriptAsCSV()`, `exportTranscriptAsJSON()` in lib/utils.ts

---

## 7. Chat Architecture with Breakout Room Scoping

**Research Topic**: How to structure chat state to support main room + 10 breakout rooms

**Decision**: **Scoped chat atoms with room ID as key**

**State Structure**:
```typescript
// lib/store/chat-store.ts

// Individual chat room state
type ChatMessage = {
  id: string;
  timestamp: Date;
  senderId: string;
  senderName: string;
  text: string;
  roomId: string; // 'main' or breakout room ID
};

// Atom for each room's messages (map keyed by roomId)
export const chatMessagesAtomFamily = atomFamily((roomId: string) =>
  atom<ChatMessage[]>([])
);

// Current active room (for UI display)
export const activeRoomAtom = atom<string>('main');

// Unread counts per room (for notifications)
export const unreadCountsAtom = atom<Record<string, number>>({});
```

**Instructor View**:
- Can switch between chat rooms via dropdown or tabs
- Shows unread indicators for all rooms
- Can send messages to any room (appears as if instructor is "present" in that room)

**Student View**:
- Only sees chat for their current room (main or assigned breakout)
- Cannot switch rooms unless moved by instructor

**Daily.co Integration**:
- Use Daily's `sendAppMessage()` with custom `roomId` field in payload
- Filter received messages by `roomId` to route to correct atom
- Instructor listens to app messages from all rooms

**Rationale**:
- atomFamily pattern is Jotai's recommended approach for dynamic collection management
- Scoping by roomId keeps messages organized and prevents cross-room leaks
- In-memory storage consistent with transcript/telemetry approach
- Unread counts provide essential notification functionality

---

## 8. Layout Preset Implementation

**Research Topic**: Grid vs Spotlight layout algorithms

**Grid Layout**:
- Equal-sized tiles arranged in rows
- Calculate optimal grid: `cols = ceil(sqrt(participantCount))`, `rows = ceil(participantCount / cols)`
- Center partial rows for visual balance
- CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`

**Spotlight Layout**:
- One large "active speaker" tile (identified by audio level)
- Smaller tiles for other participants in sidebar
- Active speaker takes 70-75% of width, sidebar 25-30%
- Use Daily.co's `useActiveSpeaker()` hook to determine spotlight participant

**Screen Share Mode** (auto-adapts from any preset):
- Shared screen takes 75% of space
- Participant videos in vertical sidebar (right or left)
- Maintain minimum 160x90 for participant videos
- If too many participants for sidebar, show scrollable list or paginated view

**Implementation**:
- Store active preset in `layout-store.ts`: `layoutPresetAtom` = 'grid' | 'spotlight' | 'custom'
- Component VideoFeed.tsx applies CSS classes based on preset
- Drag-resize switches to 'custom' preset automatically
- Screen share detection overrides preset temporarily

---

## Summary of Decisions

| ID | Topic | Decision | Rationale |
|----|-------|----------|-----------|
| 1 | Media latency target | <200ms | Industry standard for responsive feel |
| 2 | Quiz telemetry | Lifecycle events + basic participation | Addresses instructor's "can I confirm it ran?" need |
| 3 | Video tile dimensions | Min 160x90px, Max 25% viewport | Balances usability with customization freedom |
| 4 | Breakout rooms | Daily.co API with on-demand creation | Aligns with Daily.co best practices |
| 5 | Keyboard shortcuts | Window listener with text input filtering | Standard React pattern, accessible |
| 6 | Transcript export | CSV (3 columns) + JSON (structured) | Both human and machine readable |
| 7 | Chat architecture | Jotai atomFamily keyed by roomId | Scalable, follows existing patterns |
| 8 | Layout presets | Grid (equal tiles) + Spotlight (active speaker) | Common video conferencing patterns |

---

## Next Steps

Phase 0 complete. All NEEDS CLARIFICATION items resolved. Ready to proceed to Phase 1 (Design & Contracts).

- **Phase 1 Actions**:
  - Generate data-model.md with entity definitions
  - Create API contracts for chat endpoints
  - Write quickstart.md with test scenarios
  - Update cursor rules context

**No blockers remaining.**

