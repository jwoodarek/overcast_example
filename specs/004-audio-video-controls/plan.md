
# Implementation Plan: Instructor Interface Improvements

**Branch**: `004-audio-video-controls` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-audio-video-controls/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Comprehensive instructor interface improvements across 9 feature areas: personal media controls with keyboard shortcuts (M/C), smart mute all/unmute all toggle that reflects real-time participant state, fixed breakout room creation with assignment modal (1-10 rooms), prominent help alert modal/popup system, quiz status indicators with notifications and telemetry, transcript scrollback with CSV/JSON export (in-memory), removal of all debug UI elements, video layout customization with Grid/Spotlight presets and drag-resize, and new chat interface with breakout room support. All changes focus on making instructor tools intuitive, visible, and providing clear feedback while maintaining accessibility for newcomers to the codebase. Approach prioritizes methodical implementation to minimize errors, following constitutional principles of simplicity and clarity.

## Technical Context
**Language/Version**: TypeScript 5 with React 19  
**Primary Dependencies**: Next.js 15.5.4, @daily-co/daily-react 0.23.2, Jotai 2.15.0 (state), Tailwind CSS 4  
**Storage**: In-memory only (transcripts, chat, quiz telemetry stored in Jotai atoms, cleared on session end)  
**Testing**: Jest 30.2.0 (unit/contract), Playwright 1.55.1 (integration), @testing-library/react 16.3.0  
**Target Platform**: Web browsers (desktop and tablet, Chrome/Firefox/Safari)
**Project Type**: Web application (Next.js app directory structure)  
**Performance Goals**: <500ms media state changes, real-time UI updates (<100ms for participant state changes), smooth 60fps video layout transitions  
**Constraints**: In-memory storage only (no database), responsive design (desktop + tablet), keyboard shortcuts must not conflict with text inputs, Daily.co API limits for breakout rooms  
**Scale/Scope**: 9 major feature areas, ~15 components to modify/create, ~10-15 new API endpoint handlers, estimated 40-50 tasks, target classroom size 50 students with 10 breakout rooms

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity First**: Does this feature use the simplest approach? Any complex patterns must be justified.
- [X] Solution starts with simplest working approach - extending existing components (InstructorControls, VideoFeed, AlertPanel, etc.) rather than creating new architectures
- [X] Complex patterns documented with rationale - keyboard event handling and breakout room state management will include WHY comments
- [X] No premature optimization or over-engineering - using existing Jotai atoms for state, Daily.co hooks for video, simple React patterns

**Single File Preference**: Are we minimizing file count without sacrificing clarity?
- [X] Related functionality kept together - media controls stay in InstructorControls, chat in new ChatPanel component, layout logic in VideoFeed
- [X] File splits justified by clear organizational benefits - only creating new ChatPanel component (chat is new feature), ChatStore atom (new state), and chat API routes (new backend)
- [X] No excessive hierarchies or unnecessary modules - reusing existing component structure (app/components/, lib/store/)

**Comment-Driven Development**: Will the code be educational for newcomers?
- [X] Non-trivial logic includes WHY comments - keyboard shortcut filtering logic, breakout room assignment algorithm, layout calculation will all explain decisions
- [X] Business decisions explained in accessible language - comments will explain instructor vs student visibility, why shortcuts disable in text inputs, why transcripts are in-memory
- [X] Complex patterns include educational explanations - will document Daily.co breakout API usage patterns, Jotai atom composition for chat scoping

**Newcomer-Friendly Architecture**: Is the design approachable for junior developers?
- [X] Clear, descriptive naming without jargon - functions like `toggleMicrophoneWithKeyboard`, `calculateMuteAllButtonLabel`, `exportTranscriptAsCSV`
- [X] Architecture patterns explained when advanced - Daily.co hook composition will be documented, breakout room state management will have explanation
- [X] No implicit conventions or domain-specific abstractions - explicit props, clear component responsibilities, standard React patterns

**Test-Driven Clarity**: Do tests serve as living documentation?
- [X] Test names describe scenarios in plain language - "instructor can mute all participants with single click", "keyboard shortcuts disabled when typing in chat"
- [X] Tests demonstrate complete user workflows - integration tests will cover full instructor journey including breakout creation and chat usage
- [X] Test code follows same simplicity principles - no test utilities unless necessary, clear arrange-act-assert structure

**Initial Assessment**: PASS - Feature follows constitutional principles. Primary focus is UI improvements to existing components using established patterns. New chat feature uses standard React component + Jotai store pattern already in use. No architectural complexity introduced.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── api/                       # Next.js API routes (backend)
│   ├── alerts/
│   ├── breakout-rooms/
│   ├── participants/
│   ├── quiz/
│   ├── rooms/
│   └── transcripts/
├── classroom/                 # Pages
│   └── [id]/
│       └── page.tsx          # Main classroom view
└── components/                # React components (frontend)
    ├── AlertPanel.tsx         # [MODIFY] - Convert to modal/popup
    ├── Classroom.tsx          # [MODIFY] - Integrate new features
    ├── InstructorControls.tsx # [MODIFY] - Add media controls, mute all toggle
    ├── ParticipantList.tsx    # [MODIFY] - Real-time participant state
    ├── QuizGenerator.tsx      # [MODIFY] - Add status indicators
    ├── TranscriptMonitor.tsx  # [MODIFY] - Add scrollback + export
    ├── VideoFeed.tsx          # [MODIFY] - Add layout presets + drag-resize
    ├── ChatPanel.tsx          # [NEW] - Text chat interface
    ├── BreakoutModal.tsx      # [NEW] - Breakout room assignment UI
    └── ui/                    # Reusable UI components
        ├── Button.tsx
        ├── Modal.tsx
        └── ...

lib/
├── services/                  # Business logic
│   ├── alert-service.ts
│   ├── transcription-service.ts
│   └── chat-service.ts        # [NEW] - Chat message handling
├── store/                     # Jotai state atoms
│   ├── alert-store.ts
│   ├── transcript-store.ts
│   ├── chat-store.ts          # [NEW] - Chat state
│   └── layout-store.ts        # [NEW] - Video layout preferences
├── types.ts                   # [MODIFY] - Add chat, layout types
└── utils.ts                   # [MODIFY] - Add export utilities

tests/
├── contract/                  # API contract tests
│   └── test_chat_api.test.ts  # [NEW]
├── integration/               # Playwright E2E tests
│   ├── test_instructor_journey.test.ts  # [MODIFY]
│   └── test_chat_functionality.test.ts  # [NEW]
└── unit/                      # Jest component tests
    └── components/
        ├── ChatPanel.test.tsx # [NEW]
        └── InstructorControls.test.tsx  # [MODIFY]
```

**Structure Decision**: Next.js App Directory structure with colocated API routes and React components. Frontend components in `app/components/`, backend API routes in `app/api/`, shared business logic in `lib/`. This feature primarily modifies existing components (InstructorControls, VideoFeed, AlertPanel, TranscriptMonitor, QuizGenerator) and adds two new components (ChatPanel, BreakoutModal) plus supporting stores and services. Follows existing project patterns.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

**Unknowns Resolved**:
1. Media control latency target → <200ms (industry standard for responsive feel)
2. Quiz telemetry metrics → Lifecycle events + basic participation (no scoring in v1)
3. Video tile dimensions → Min 160x90px, Max 25% viewport
4. Daily.co breakout room patterns → On-demand creation via createBreakoutRoom() API
5. Keyboard shortcut implementation → Window listener with text input filtering
6. Transcript export formats → CSV (3 columns) + JSON (structured with metadata)
7. Chat architecture → Jotai atomFamily keyed by roomId for scoped messages
8. Layout preset algorithms → Grid (equal tiles) + Spotlight (active speaker focus)

**Output**: `research.md` - 8 technical decisions documented with rationale, alternatives, and implementation approaches

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

**Outputs Generated**:

1. **data-model.md** - 8 entity definitions with complete field specifications:
   - MediaControlState (mic/camera state)
   - ParticipantAudioState (for mute all logic)
   - BreakoutRoom (1-10 rooms with assignments)
   - HelpAlert (prominent notification system)
   - QuizStatus (with telemetry)
   - TranscriptEntry (in-memory with export)
   - LayoutConfiguration (Grid/Spotlight presets)
   - ChatMessage (atomFamily scoped by roomId)

2. **contracts/** - 3 OpenAPI specifications:
   - `chat-api.yaml` - POST/GET endpoints for chat messages
   - `breakout-enhancements-api.yaml` - POST/GET/PATCH/DELETE for breakout management
   - `transcript-export-api.yaml` - GET endpoint for CSV/JSON export

3. **quickstart.md** - 9 manual validation scenarios (30-45 min total):
   - Personal Media Controls (5 min)
   - Bulk Participant Control (8 min)
   - Breakout Room Management (10 min)
   - Help Alert System (7 min)
   - Quiz Status Visibility (6 min)
   - Transcript Management (8 min)
   - Interface Quality (5 min)
   - Video Layout Customization (8 min)
   - Text Chat Communication (10 min)

4. **Agent context updated** - `.cursor/rules/specify-rules.mdc`:
   - Added TypeScript 5 with React 19
   - Added Next.js 15.5.4, Daily.co, Jotai, Tailwind CSS 4
   - Added in-memory storage architecture

**Note**: Contract tests will be generated during `/tasks` command (Phase 2)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Foundation Tasks** (Parallel Group 1):
   - Create new Jotai store files (media-store, chat-store, breakout-store, layout-store)
   - Extend existing stores (alert-store, quiz-store, transcript-store)
   - Add new types to lib/types.ts (ChatMessage, LayoutConfiguration, etc.)
   - Add utility functions to lib/utils.ts (CSV/JSON export helpers)

2. **Backend API Tasks** (Parallel Group 2 - after Foundation):
   - Create chat API routes (POST/GET /api/chat/messages)
   - Enhance breakout API routes (fix existing, add assignment endpoints)
   - Create transcript export API route (GET /api/transcripts/[sessionId]/export)
   - Create contract tests for each endpoint [P]

3. **Component Modification Tasks** (Sequential within component, Parallel across components):
   - **InstructorControls.tsx**:
     - Add media control buttons with visual state indicators
     - Implement keyboard shortcut listeners (M/C with text input filtering)
     - Replace Mute All/Unmute All with smart toggle button
     - Add real-time participant state calculation
   - **VideoFeed.tsx**:
     - Add layout preset selector (Grid/Spotlight)
     - Implement drag-resize functionality with constraints (160x90min, 25%max)
     - Add screen share detection and auto-layout adaptation
     - Add responsive breakpoints for desktop/tablet
   - **AlertPanel.tsx**:
     - Convert from bottom-positioned to modal/floating popup
     - Add navigation for multiple alerts
     - Improve visual prominence
   - **TranscriptMonitor.tsx**:
     - Add scrollback capability (virtualized list for performance)
     - Add export button with format selector (CSV/JSON)
     - Implement download functionality
     - Remove debug indicators (red restart box)
   - **QuizGenerator.tsx**:
     - Add status indicator near toolbar
     - Add toast notifications for quiz lifecycle events
     - Implement telemetry logging
     - Add telemetry view for instructors

4. **New Component Tasks** (Parallel Group 3):
   - Create ChatPanel.tsx (message list + input + room selector)
   - Create BreakoutModal.tsx (participant assignment UI)
   - Add unit tests for new components [P]

5. **Integration Tasks** (Sequential):
   - Integrate ChatPanel into Classroom.tsx
   - Integrate BreakoutModal into InstructorControls.tsx
   - Wire up keyboard shortcuts at Classroom level
   - Add cleanup logic for atom resets on session end

6. **Testing Tasks** (Parallel after implementation):
   - Write/update integration tests for instructor journey
   - Write integration test for chat functionality
   - Write integration test for breakout room workflow
   - Update existing unit tests for modified components [P]

7. **Polish Tasks** (Final cleanup):
   - Remove all debug text and console logs
   - Audit UI copy for consistency and professionalism
   - Remove placeholder text and non-English content
   - Verify responsive design on tablet widths

**Ordering Strategy**:
- Foundation (stores, types) BEFORE backend and frontend
- Backend APIs BEFORE frontend components that depend on them
- Component modifications mostly parallel (independent files)
- Integration AFTER component work
- Testing AFTER implementation (TDD where beneficial)
- Polish at the end

**Estimated Task Count**: 45-55 tasks
- Foundation: 8-10 tasks
- Backend APIs: 10-12 tasks (including contract tests)
- Component modifications: 18-22 tasks (5 components × 3-5 tasks each)
- New components: 6-8 tasks
- Integration: 4-5 tasks
- Testing: 8-10 tasks
- Polish: 3-5 tasks

**Parallel Execution Groups**:
- [P] marks indicate tasks that can run in parallel within their group
- Estimated parallelization: 60-70% of tasks can run concurrently
- Sequential bottlenecks: Foundation → APIs, Component mods → Integration

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

**No violations** - Constitution Check passed. All complexity is justified:

| Complexity | Justification | Simplicity Preserved |
|-----------|---------------|---------------------|
| Jotai atomFamily for chat | Necessary for scoped messages by room (main + 10 breakouts) | Standard Jotai pattern, well-documented, avoids manual map management |
| Keyboard event filtering | Required to prevent shortcuts triggering while typing in text inputs | Simple tag check (INPUT/TEXTAREA/SELECT), clear comments explain WHY |
| Daily.co breakout room API | External dependency for video conferencing breakout functionality | No alternative - core platform capability, unavoidable complexity |
| Layout drag-resize constraints | Need to enforce minimum (160x90) and maximum (25% viewport) for usability | Math is straightforward, constraints documented with accessibility rationale |

All design decisions follow "simplicity first" - extending existing patterns, minimizing new files, clear naming.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [X] Phase 0: Research complete (/plan command) - ✅ research.md generated, 8 technical decisions
- [X] Phase 1: Design complete (/plan command) - ✅ data-model.md, 3 API contracts, quickstart.md, agent context updated
- [X] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ 45-55 task strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP: Run `/tasks` to create tasks.md**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [X] Initial Constitution Check: PASS - All principles satisfied, no violations
- [X] Post-Design Constitution Check: PASS - Design maintains simplicity, clear naming, minimal file additions
- [X] All NEEDS CLARIFICATION resolved - 3 planning-level items resolved in research.md
- [X] Complexity deviations documented - No violations; justified complexity tracked

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
