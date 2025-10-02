# Tasks: Overcast Video Classroom Application

**Input**: Design documents from `C:/Code_Work/overcast/specs/002-we-are-looking/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: Next.js + Daily React + Tailwind + TypeScript
   → ✅ Extract: tech stack, libraries, structure
2. Load optional design documents:
   → ✅ data-model.md: Extract entities → model tasks
   → ✅ contracts/: Each file → contract test task
   → ✅ research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → ✅ Setup: project init, dependencies, linting
   → ✅ Tests: contract tests, integration tests
   → ✅ Core: models, services, components
   → ✅ Integration: Daily API, middleware, logging
   → ✅ Polish: unit tests, performance, docs
4. Apply task rules:
   → ✅ Different files = mark [P] for parallel
   → ✅ Same file = sequential (no [P])
   → ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → ✅ All contracts have tests
   → ✅ All entities have models
   → ✅ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Next.js App Router**: `app/`, `components/`, `lib/` at repository root
- **Tests**: `tests/` directory with contract, integration, and unit subdirectories
- **API Routes**: `app/api/` for Vercel serverless functions

## Phase 3.1: Setup
- [x] T001 Initialize Next.js project with TypeScript and required Daily dependencies
- [x] T002 [P] Configure Tailwind CSS v4 with futuristic black/teal theme
- [x] T003 [P] Set up ESLint, Prettier, and TypeScript configuration
- [x] T004 [P] Create project structure per implementation plan (app/, components/, lib/, tests/)
- [x] T005 [P] Configure environment variables for Daily.co API keys

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T006 [P] Contract test GET /api/rooms in tests/contract/test_rooms_get.test.ts
- [x] T007 [P] Contract test GET /api/rooms/{roomId} in tests/contract/test_rooms_detail.test.ts
- [x] T008 [P] Contract test POST /api/rooms/{roomId}/join in tests/contract/test_rooms_join.test.ts
- [x] T009 [P] Contract test POST /api/rooms/{roomId}/leave in tests/contract/test_rooms_leave.test.ts
- [x] T010 [P] Contract test POST /api/participants/{sessionId}/mute in tests/contract/test_participants_mute.test.ts
- [x] T011 [P] Contract test POST /api/participants/mute-all in tests/contract/test_participants_mute_all.test.ts
- [x] T012 [P] Contract test POST /api/breakout-rooms in tests/contract/test_breakout_create.test.ts

### Integration Tests
- [x] T013 [P] Integration test student lobby navigation in tests/integration/test_student_journey.test.ts
- [x] T014 [P] Integration test instructor classroom management in tests/integration/test_instructor_journey.test.ts
- [x] T015 [P] Integration test classroom capacity limits in tests/integration/test_capacity_limits.test.ts
- [x] T016 [P] Integration test multiple instructor scenario in tests/integration/test_multiple_instructors.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Type Definitions and Constants
- [x] T017 [P] Create TypeScript interfaces in lib/types.ts (AppUser, Classroom, ClassroomState, etc.)
- [x] T018 [P] Define Daily room configuration in lib/daily-config.ts (6 pre-defined room URLs)
- [x] T019 [P] Create app constants in lib/constants.ts (classroom names, capacity limits)

### Core Components
- [x] T020 [P] Create main Lobby component in app/components/Lobby.tsx with 6 classroom grid
- [x] T021 [P] Create Classroom component with DailyProvider in app/components/Classroom.tsx
- [x] T022 [P] Create VideoFeed component using Daily React hooks in app/components/VideoFeed.tsx
- [x] T023 [P] Create ParticipantList component using useParticipants() in app/components/ParticipantList.tsx
- [x] T024 [P] Create InstructorControls component in app/components/InstructorControls.tsx
- [x] T025 [P] Create shared UI components in app/components/ui/ (Button, Modal, etc.)

### Pages and Routing
- [x] T026 Main lobby page in app/page.tsx with Students/Instructors toggle
- [x] T027 Dynamic classroom pages in app/classroom/[id]/page.tsx
- [x] T028 Root layout with branding in app/layout.tsx

### API Routes (Vercel Serverless Functions)
- [x] T029 GET /api/rooms endpoint in app/api/rooms/route.ts
- [x] T030 GET /api/rooms/[roomId] endpoint in app/api/rooms/[roomId]/route.ts
- [x] T031 POST /api/rooms/[roomId]/join endpoint in app/api/rooms/[roomId]/join/route.ts
- [x] T032 POST /api/rooms/[roomId]/leave endpoint in app/api/rooms/[roomId]/leave/route.ts
- [x] T033 POST /api/participants/[sessionId]/mute endpoint in app/api/participants/[sessionId]/mute/route.ts
- [x] T034 POST /api/participants/mute-all endpoint in app/api/participants/mute-all/route.ts

## Phase 3.4: Integration
- [x] T035 Integrate Daily.co API with error handling and connection management
- [x] T036 Implement participant state management using Daily React hooks
- [x] T037 Add classroom capacity validation and "full" messaging
- [x] T038 Implement instructor privilege validation and controls
- [x] T039 Add real-time participant updates using useParticipants() events
- [x] T040 Implement role-based UI rendering (student vs instructor modes)

## Phase 3.5: Styling and UX
- [x] T041 [P] Implement futuristic black/teal theme in app/globals.css
- [x] T042 [P] Add "Powered by the Overclock Accelerator" branding
- [x] T043 [P] Create responsive design for mobile and desktop
- [x] T044 [P] Add loading states and connection indicators
- [ ] T045 [P] Implement error boundaries and graceful error handling

## Phase 3.6: Polish
- [x] T046 [P] Unit tests for utility functions in tests/unit/test_utils.test.ts
- [x] T047 [P] Component tests using React Testing Library in tests/unit/components/
- [x] T048 [P] Performance optimization (code splitting, lazy loading)
- [x] T049 [P] Add comprehensive error logging and monitoring
- [x] T050 [P] Create deployment configuration for Vercel
- [x] T051 Run quickstart validation scenarios from quickstart.md
- [x] T052 Performance testing (verify <200ms page loads, <100ms video connection)

## Dependencies

### Critical Path
- Setup (T001-T005) → Tests (T006-T016) → Core (T017-T034) → Integration (T035-T040) → Polish (T041-T052)

### Specific Dependencies
- T017-T019 (types/config) must complete before T020-T025 (components)
- T020-T025 (components) must complete before T026-T028 (pages)
- T029-T034 (API routes) can run parallel with T026-T028 (pages)
- T035-T040 (integration) requires T017-T034 complete
- T041-T045 (styling) can run parallel with T035-T040
- T046-T050 (polish) requires all core implementation complete

### Blocking Relationships
- T021 (Classroom component) blocks T027 (classroom pages)
- T022 (VideoFeed) blocks T021 (Classroom component)
- T023 (ParticipantList) blocks T024 (InstructorControls)
- T018 (daily-config) blocks T029-T034 (API routes)

## Parallel Example
```
# Phase 3.2 - Launch all contract tests together:
Task: "Contract test GET /api/rooms in tests/contract/test_rooms_get.test.ts"
Task: "Contract test POST /api/rooms/{roomId}/join in tests/contract/test_rooms_join.test.ts"
Task: "Contract test POST /api/participants/{sessionId}/mute in tests/contract/test_participants_mute.test.ts"
Task: "Integration test student journey in tests/integration/test_student_journey.test.ts"

# Phase 3.3 - Launch core component development in parallel:
Task: "Create Lobby component in app/components/Lobby.tsx"
Task: "Create VideoFeed component in app/components/VideoFeed.tsx"
Task: "Create TypeScript interfaces in lib/types.ts"
Task: "Define Daily room configuration in lib/daily-config.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task with clear, educational commit messages
- Avoid: vague tasks, same file conflicts, unnecessary file splits
- Prioritize: single-file solutions, clear comments, newcomer-friendly patterns
- Daily React hooks (useParticipants, useDevices, useScreenShare) are central to implementation
- DailyProvider must wrap classroom components for proper context

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - rooms-api.yaml → 6 contract test tasks [P] (T006-T011)
   - participants-api.yaml → 2 contract test tasks [P] (T012)
   - Each endpoint → implementation task (T029-T034)
   
2. **From Data Model**:
   - AppUser, Classroom, ClassroomState entities → type definition tasks [P] (T017)
   - Daily integration patterns → configuration tasks [P] (T018-T019)
   
3. **From User Stories (Quickstart)**:
   - Student journey → integration test [P] (T013)
   - Instructor journey → integration test [P] (T014)
   - Capacity limits → integration test [P] (T015)
   - Multiple instructors → integration test [P] (T016)

4. **From Architecture (Plan)**:
   - Next.js App Router → page tasks (T026-T028)
   - Daily React hooks → component tasks [P] (T020-T025)
   - Vercel serverless → API route tasks (T029-T034)

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T006-T012 cover all endpoints)
- [x] All entities have model tasks (T017 covers TypeScript interfaces)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include specific paths)
- [x] No task modifies same file as another [P] task (verified no conflicts)

### Constitution Compliance
- [x] Tasks favor single-file implementations where appropriate (components in single files)
- [x] Complex tasks include comment/documentation requirements (Daily integration tasks)
- [x] Task descriptions use newcomer-friendly language (clear, descriptive task names)
- [x] No unnecessary file splits or over-engineering (minimal file structure)
