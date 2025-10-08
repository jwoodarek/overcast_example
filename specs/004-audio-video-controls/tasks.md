# Tasks: Instructor Interface Improvements

**Feature**: 004-audio-video-controls  
**Input**: Design documents from `/specs/004-audio-video-controls/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Summary

This tasks file implements 9 major feature areas across ~50 tasks. The approach follows TDD where beneficial, prioritizes parallel execution (60-70% of tasks marked [P]), and maintains constitutional principles of simplicity and clarity.

**Estimated Completion**: 20-30 hours (with parallel execution)  
**Key Dependencies**: Foundation → Backend APIs → Frontend Components → Integration → Testing → Polish

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All paths are absolute from repository root

---

## Phase 3.1: Foundation (Setup & Data Layer)

**Goal**: Create type definitions, store atoms, and utility functions before any implementation

- [X] **T001** [P] Create `lib/store/media-store.ts` with mediaControlStateAtom (microphoneEnabled, cameraEnabled, pending states)
- [X] **T002** [P] Create `lib/store/chat-store.ts` with chatMessagesAtomFamily (keyed by roomId), activeRoomAtom, unreadCountsAtom
- [X] **T003** [P] Create `lib/store/breakout-store.ts` with breakoutRoomsAtom, activeBreakoutCountAtom
- [X] **T004** [P] Create `lib/store/layout-store.ts` with layoutConfigAtom (preset, tileSizes), screenShareActiveAtom
- [X] **T005** [P] Extend `lib/store/alert-store.ts` to add helpAlertsAtom, pendingAlertsAtom (HelpAlert entity with status lifecycle)
- [X] **T006** [P] Extend `lib/store/quiz-store.ts` to add activeQuizAtom, quizHistoryAtom, quizTelemetryAtom (lifecycle events)
- [X] **T007** [P] Extend `lib/store/transcript-store.ts` to add transcriptScrollPositionAtom for scrollback UI
- [X] **T008** Add new types to `lib/types.ts`: ChatMessage, BreakoutRoom, HelpAlert (extended), QuizStatus (extended), LayoutConfiguration, MediaControlState, ParticipantAudioState
- [X] **T009** Add utility functions to `lib/utils.ts`: exportTranscriptAsCSV(), exportTranscriptAsJSON(), formatTimestampForExport()
- [X] **T010** [P] Create `lib/services/chat-service.ts` with sendMessage(), getMessagesForRoom(), filterMessagesByRoom() functions

**Dependencies**: None (foundation tasks can all run in parallel except T008 which other tasks may reference)

---

## Phase 3.2: Backend API Implementation

**Goal**: Create and enhance API routes with contract test coverage

### Contract Tests First (TDD)
- [X] **T011** [P] Contract test POST /api/chat/messages in `tests/contract/test_chat_post.test.ts` (validate request schema, 201 response)
- [X] **T012** [P] Contract test GET /api/chat/messages in `tests/contract/test_chat_get.test.ts` (validate query params, 200 response with array)
- [X] **T013** [P] Contract test POST /api/breakout-rooms in `tests/contract/test_breakout_create.test.ts` (validate rooms array, participant assignment logic)
- [X] **T014** [P] Contract test GET /api/transcripts/[sessionId]/export in `tests/contract/test_transcript_export.test.ts` (validate format param, CSV/JSON responses)

### API Route Implementation (After Tests)
- [X] **T015** Implement POST /api/chat/messages in `app/api/chat/messages/route.ts` (validate, store via chat-service, return 201)
- [X] **T016** Implement GET /api/chat/messages in `app/api/chat/messages/route.ts` (query by sessionId + roomId, filter by requesterId permissions)
- [X] **T017** Fix POST /api/breakout-rooms in `app/api/breakout-rooms/route.ts` (create Daily rooms, validate 1-10 limit, assign participants)
- [X] **T018** Implement GET /api/breakout-rooms in `app/api/breakout-rooms/route.ts` (return active rooms with participant lists)
- [X] **T019** Implement PATCH /api/breakout-rooms/[roomId] in `app/api/breakout-rooms/[roomId]/route.ts` (reassign participants)
- [X] **T020** Implement DELETE /api/breakout-rooms/[roomId] in `app/api/breakout-rooms/[roomId]/route.ts` (close room, return participants to main)
- [X] **T021** Implement GET /api/transcripts/[sessionId]/export in `app/api/transcripts/[sessionId]/export/route.ts` (use format query param, generate CSV or JSON with Content-Disposition header)

**Dependencies**: 
- T011-T014 (contract tests) must complete BEFORE T015-T021 (implementation)
- T010 (chat service) blocks T015-T016
- T015-T021 can run in parallel after tests pass

---

## Phase 3.3: Component Modifications

**Goal**: Enhance existing components with new features

### InstructorControls Component
- [X] **T022** Add media control buttons to `app/components/InstructorControls.tsx` (mic toggle, camera toggle with visual state indicators using Daily.co setLocalAudio/setLocalVideo)
- [X] **T023** Implement keyboard shortcut handler in `app/components/InstructorControls.tsx` (useEffect with window.addEventListener for M/C keys, filter INPUT/TEXTAREA/SELECT tags, add cleanup)
- [X] **T024** Replace "Mute All"/"Unmute All" buttons in `app/components/InstructorControls.tsx` with smart toggle (calculate aggregate participant state, update label in real-time using useParticipants hook)
- [X] **T025** Add "Create Breakout" button handler in `app/components/InstructorControls.tsx` (open BreakoutModal, pass participants list)

### VideoFeed Component  
- [X] **T026** Add layout preset selector to `app/components/VideoFeed.tsx` (dropdown or buttons for Grid/Spotlight, store selection in layoutConfigAtom)
- [X] **T027** Implement Grid layout algorithm in `app/components/VideoFeed.tsx` (calculate columns/rows from participant count, use CSS Grid)
- [X] **T028** Implement Spotlight layout algorithm in `app/components/VideoFeed.tsx` (useActiveSpeaker hook, 75% main tile + 25% sidebar)
- [ ] **T029** Add drag-resize functionality to `app/components/VideoFeed.tsx` (drag handles on tiles, enforce min 160x90px and max 25% viewport, switch to 'custom' preset on drag)
- [X] **T030** Add screen share detection and auto-layout in `app/components/VideoFeed.tsx` (use useScreenShare hook, temporarily override preset when screen share active - 75% screen + sidebar participants)

### AlertPanel Component
- [X] **T031** Convert AlertPanel to modal/floating popup in `app/components/AlertPanel.tsx` (use Modal component from ui/, position center or top-right, z-index above other elements)
- [X] **T032** Add navigation for multiple alerts in `app/components/AlertPanel.tsx` (prev/next buttons, show count like "1 of 3", derive from pendingAlertsAtom)
- [X] **T033** Add dismiss/acknowledge handlers in `app/components/AlertPanel.tsx` (update HelpAlert status in helpAlertsAtom)

### TranscriptMonitor Component
- [X] **T034** Add scrollback capability to `app/components/TranscriptMonitor.tsx` (virtualized list or simple scrollable container, store scroll position in transcriptScrollPositionAtom)
- [X] **T035** Add export button with format selector to `app/components/TranscriptMonitor.tsx` (dropdown with CSV/JSON options, call exportTranscript utilities)
- [X] **T036** Implement download trigger in `app/components/TranscriptMonitor.tsx` (Blob + URL.createObjectURL + download link, filename: transcript-[sessionId]-[date])
- [X] **T037** Remove debug indicators from `app/components/TranscriptMonitor.tsx` (eliminate red "restarting transcript" box, remove console.logs, clean up placeholder text)

### QuizGenerator Component
- [X] **T038** Add quiz status indicator to `app/components/QuizGenerator.tsx` (display badge near toolbar showing "Quiz pending"/"Quiz active"/"Quiz completed" from activeQuizAtom)
- [X] **T039** Add toast notifications for quiz lifecycle in `app/components/QuizGenerator.tsx` (use toast library or custom component, trigger on quiz start/end state changes)
- [X] **T040** Implement quiz telemetry logging in `app/components/QuizGenerator.tsx` (append events to quizTelemetryAtom: created, started, ended, with timestamps)
- [X] **T041** Add telemetry view for instructors in `app/components/QuizGenerator.tsx` (expandable section or modal showing lifecycle events and participation metrics from quizTelemetryAtom)

**Dependencies**:
- T022-T025 (InstructorControls) are sequential (same file)
- T026-T030 (VideoFeed) are sequential (same file)
- T031-T033 (AlertPanel) are sequential (same file)
- T034-T037 (TranscriptMonitor) are sequential (same file)
- T038-T041 (QuizGenerator) are sequential (same file)
- But different component groups can run in parallel (T022-T025 || T026-T030 || T031-T033 || T034-T037 || T038-T041)

---

## Phase 3.4: New Component Creation

**Goal**: Build ChatPanel and BreakoutModal from scratch

- [X] **T042** [P] Create ChatPanel component in `app/components/ChatPanel.tsx` (message list rendering from chatMessagesAtomFamily(activeRoomAtom), input field, send button, collapsible panel)
- [X] **T043** Add room selector to `app/components/ChatPanel.tsx` (dropdown for main + breakout rooms, update activeRoomAtom on change, show unread counts per room)
- [X] **T044** Add notification indicators to `app/components/ChatPanel.tsx` (badge or count when unreadCountsAtom > 0 for non-active rooms)
- [X] **T045** [P] Create BreakoutModal component in `app/components/BreakoutModal.tsx` (modal dialog with room name inputs, participant assignment UI - drag-drop or click-to-assign)
- [X] **T046** Add participant assignment logic to `app/components/BreakoutModal.tsx` (track assignments in local state, validate no duplicate assignments, submit to POST /api/breakout-rooms)
- [X] **T047** Add confirmation and room list view to `app/components/BreakoutModal.tsx` (display created rooms with member lists, close button)

**Dependencies**:
- T042-T044 (ChatPanel) are sequential
- T045-T047 (BreakoutModal) are sequential  
- But both components can be developed in parallel

---

## Phase 3.5: Integration

**Goal**: Wire new components into existing app structure

- [X] **T048** Integrate ChatPanel into `app/components/Classroom.tsx` (import, render conditionally for instructors, pass sessionId and roomId props)
- [X] **T049** Integrate BreakoutModal into `app/components/Classroom.tsx` (pass to InstructorControls, manage modal open/close state)
- [X] **T050** Add global keyboard shortcut handler to `app/components/Classroom.tsx` (wire up M/C shortcuts at top level, ensure proper cleanup on unmount)
- [X] **T051** Add atom cleanup logic to `app/components/Classroom.tsx` (useEffect cleanup that resets all new atoms on session end: media, chat, breakout, layout stores)

**Dependencies**: 
- T048 requires T042-T044 complete
- T049 requires T045-T047 complete
- T050 requires T023 (keyboard shortcut implementation in InstructorControls)
- All integration tasks are sequential (same file)

---

## Phase 3.6: Testing

**Goal**: Integration and unit test coverage

### Integration Tests
- [X] **T052** [P] Create integration test for chat functionality in `tests/integration/test_chat_functionality.test.ts` (Playwright: send messages, verify visibility by role, test breakout room scoping)
- [X] **T053** [P] Create integration test for breakout workflow in `tests/integration/test_breakout_workflow.test.ts` (Playwright: create rooms, assign participants, verify room list, close rooms)
- [X] **T054** Update existing instructor journey test in `tests/integration/test_instructor_journey.test.ts` (add scenarios for media controls, mute all toggle, layout presets, transcript export)

### Unit Tests
- [X] **T055** [P] Unit test ChatPanel in `tests/unit/components/ChatPanel.test.tsx` (render, send message, room switching, notifications)
- [X] **T056** [P] Unit test BreakoutModal in `tests/unit/components/BreakoutModal.test.tsx` (participant assignment, validation, submission)
- [X] **T057** [P] Update InstructorControls unit test in `tests/unit/components/InstructorControls.test.tsx` (media controls, keyboard shortcuts, mute all toggle)
- [X] **T058** [P] Unit test export utilities in `tests/unit/test_utils.test.ts` (CSV generation, JSON generation, timestamp formatting)

**Dependencies**:
- Integration tests require all implementation complete (T048-T051)
- Unit tests can run in parallel after their target components exist

---

## Phase 3.7: Polish & Validation

**Goal**: Final cleanup and quality assurance

- [X] **T059** [P] Remove all debug console.logs across components (grep for console.log, console.debug, eliminate or convert to proper logging)
- [X] **T060** [P] Audit UI copy for consistency in `app/components/` (check button labels, tooltips, help text - ensure professional English, no placeholders)
- [X] **T061** [P] Remove non-English text and placeholders across app (search for TODO, Lorem, test text)
- [X] **T062** Verify responsive design on tablet widths (test all new/modified components at 768px-1024px breakpoints, adjust as needed)
- [X] **T063** Add accessibility attributes to new components (aria-label, aria-keyshortcuts for M/C buttons, aria-live for alerts)
- [X] **T064** Performance validation (test media control latency <200ms, UI updates <100ms, smooth layout transitions)
- [X] **T065** Execute quickstart.md validation scenarios (manually run all 9 test scenarios, document any issues)

**Dependencies**:
- T059-T061 can run in parallel (different files)
- T062-T065 require all implementation complete

---

## Dependencies Graph

```
Phase 3.1 (Foundation: T001-T010)
  ↓
Phase 3.2 (Backend APIs: T011-T021)
  ├─ Tests (T011-T014) BEFORE Implementation (T015-T021)
  ↓
Phase 3.3 (Component Mods: T022-T041)
  ├─ InstructorControls: T022 → T023 → T024 → T025
  ├─ VideoFeed: T026 → T027 → T028 → T029 → T030
  ├─ AlertPanel: T031 → T032 → T033
  ├─ TranscriptMonitor: T034 → T035 → T036 → T037
  └─ QuizGenerator: T038 → T039 → T040 → T041
  ↓
Phase 3.4 (New Components: T042-T047)
  ├─ ChatPanel: T042 → T043 → T044
  └─ BreakoutModal: T045 → T046 → T047
  ↓
Phase 3.5 (Integration: T048-T051)
  T048 → T049 → T050 → T051
  ↓
Phase 3.6 (Testing: T052-T058)
  ├─ Integration: T052 || T053 || T054
  └─ Unit: T055 || T056 || T057 || T058
  ↓
Phase 3.7 (Polish: T059-T065)
  T059 || T060 || T061, then T062 → T063 → T064 → T065
```

---

## Parallel Execution Examples

### Phase 3.1 - Foundation (10 tasks in parallel)
```bash
# All foundation tasks can run simultaneously:
Task: "Create lib/store/media-store.ts with mediaControlStateAtom"
Task: "Create lib/store/chat-store.ts with chatMessagesAtomFamily"
Task: "Create lib/store/breakout-store.ts with breakoutRoomsAtom"
Task: "Create lib/store/layout-store.ts with layoutConfigAtom"
Task: "Extend lib/store/alert-store.ts with helpAlertsAtom"
Task: "Extend lib/store/quiz-store.ts with telemetry atoms"
Task: "Extend lib/store/transcript-store.ts with scroll position"
# (wait for above before T008-T010 if they reference types)
```

### Phase 3.2 - Backend Tests (4 contract tests in parallel)
```bash
Task: "Contract test POST /api/chat/messages in tests/contract/test_chat_post.test.ts"
Task: "Contract test GET /api/chat/messages in tests/contract/test_chat_get.test.ts"
Task: "Contract test POST /api/breakout-rooms in tests/contract/test_breakout_create.test.ts"
Task: "Contract test GET /api/transcripts/[sessionId]/export in tests/contract/test_transcript_export.test.ts"
```

### Phase 3.3 - Component Modifications (5 components in parallel)
```bash
# Each component group runs sequentially internally, but groups are parallel:
Group 1: T022 → T023 → T024 → T025 (InstructorControls)
Group 2: T026 → T027 → T028 → T029 → T030 (VideoFeed)
Group 3: T031 → T032 → T033 (AlertPanel)
Group 4: T034 → T035 → T036 → T037 (TranscriptMonitor)
Group 5: T038 → T039 → T040 → T041 (QuizGenerator)
# All 5 groups can execute in parallel
```

### Phase 3.6 - Testing (8 tests in parallel)
```bash
Task: "Integration test chat functionality in tests/integration/test_chat_functionality.test.ts"
Task: "Integration test breakout workflow in tests/integration/test_breakout_workflow.test.ts"
Task: "Update instructor journey test in tests/integration/test_instructor_journey.test.ts"
Task: "Unit test ChatPanel in tests/unit/components/ChatPanel.test.tsx"
Task: "Unit test BreakoutModal in tests/unit/components/BreakoutModal.test.tsx"
Task: "Update InstructorControls unit test in tests/unit/components/InstructorControls.test.tsx"
Task: "Unit test export utilities in tests/unit/test_utils.test.ts"
```

---

## Validation Checklist

**Design Coverage**:
- [X] All 3 contracts have corresponding tests (chat, breakout, transcript export)
- [X] All 8 entities from data-model.md have store implementations (media, chat, breakout, alert, quiz, transcript, layout, participant)
- [X] All tests come before implementation (T011-T014 before T015-T021)
- [X] All 9 quickstart scenarios covered in tasks

**Task Quality**:
- [X] Parallel tasks ([P]) are truly independent (different files)
- [X] Each task specifies exact file path
- [X] No [P] task modifies same file as another [P] task
- [X] Dependencies properly documented

**Constitution Compliance**:
- [X] Tasks favor extending existing files where appropriate (InstructorControls, VideoFeed, etc.)
- [X] Only 2 new components created (ChatPanel, BreakoutModal - well justified)
- [X] Complex tasks (keyboard shortcuts, layout algorithms) include comment requirements
- [X] Task descriptions use clear, newcomer-friendly language
- [X] No unnecessary file splits or over-engineering

---

## Commit Strategy

**Recommended commit points** (after task completion for clean history):
- After T010: "feat: add foundation stores and types for instructor features"
- After T021: "feat: implement chat, breakout, and transcript export APIs"
- After T025: "feat: add media controls and mute all toggle to InstructorControls"
- After T030: "feat: add layout presets and drag-resize to VideoFeed"
- After T037: "feat: enhance transcript with scrollback and export"
- After T041: "feat: add quiz status indicators and telemetry"
- After T047: "feat: create ChatPanel and BreakoutModal components"
- After T051: "feat: integrate chat and breakout into Classroom"
- After T058: "test: add integration and unit tests for new features"
- After T065: "polish: remove debug text, audit copy, validate accessibility"

Each commit message should explain WHY the changes were made for newcomer understanding.

---

## Notes

- **TDD Emphasis**: Contract tests (T011-T014) MUST fail before implementing APIs (T015-T021)
- **Parallel Efficiency**: ~60-70% of tasks can run concurrently, reducing timeline significantly
- **Simplicity Focus**: All tasks follow constitutional principles - extend existing patterns, minimize new files
- **Error Minimization**: Methodical ordering and clear dependencies reduce integration issues
- **Clear Paths**: Every task includes absolute file path for unambiguous execution

**Estimated parallel timeline with 4-5 developers**: 4-6 days (vs 20-30 hours sequential)

---

*Generated from design artifacts: plan.md, research.md, data-model.md, contracts/*, quickstart.md*

