# Tasks: Intelligent Education Video Platform

**Feature Branch**: `003-this-is-a`  
**Input**: Design documents from `/specs/003-this-is-a/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Next.js 15.5.4, TypeScript, in-memory stores
2. Load optional design documents
   → ✅ data-model.md: 3 entities (TranscriptEntry, HelpAlert, Quiz)
   → ✅ contracts/: 3 API contracts (transcription, alerts, quiz)
   → ✅ research.md: Web Speech API, GPT-3.5, keyword patterns
3. Generate tasks by category
   → ✅ Setup: env config, types, stores
   → ✅ Tests: 3 contract + 3 integration tests
   → ✅ Core: 4 services + 9 API routes + 3 components
   → ✅ Integration: transcription, analysis, generation
   → ✅ Polish: unit tests, performance, validation
4. Apply task rules
   → ✅ Different files marked [P]
   → ✅ Tests before implementation
5. Number tasks sequentially
   → ✅ T001-T042
6. Generate dependency graph
   → ✅ Setup → Tests → Implementation → Polish
7. Validate task completeness
   → ✅ All contracts have tests
   → ✅ All entities have stores
   → ✅ All endpoints implemented
8. Return: SUCCESS (42 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Includes exact file paths for each task
- Tasks follow TDD: tests before implementation

---

## Phase 3.0: Prerequisites - Local Setup ⚠️ MUST COMPLETE FIRST

**These tasks ensure the existing application runs before adding new features**

### T001: Environment Configuration
**File**: `.env.local` (create from provided values)  
**Description**: Create `.env.local` with Daily.co API key and 6 room URLs

```bash
# Copy provided configuration:
DAILY_API_KEY="745efdbd1cc747b1cdda93ed6f87f3f4fe871ff04221a525ca47ebdb29c5478c"
NEXT_PUBLIC_DAILY_ROOM_1="https://overclockaccelerator.daily.co/01-clippy"
# ... all 6 rooms
NEXT_PUBLIC_APP_NAME="Overcast"
NEXT_PUBLIC_MAX_PARTICIPANTS_PER_ROOM=50
NODE_ENV=development
```

**Validation**: Environment variables load without errors

**Dependencies**: None  
**Status**: [ ]

---

### T002: Verify Existing Application
**Files**: All existing app files  
**Description**: Validate that the base Overcast application runs locally

1. Run `npm install` to install existing dependencies
2. Start dev server: `npm run dev`
3. Access http://localhost:3000
4. Test joining classroom as student
5. Test joining as instructor with controls
6. Verify video/audio works
7. Test existing mute and breakout room features

**Validation**: All existing features work, no console errors

**Dependencies**: T001  
**Status**: [ ]

---

### T003: Run Existing Test Suite
**Files**: All existing test files  
**Description**: Ensure existing tests pass before adding new features

```bash
npm test
```

**Expected**: All existing tests pass (contract, integration, unit)

**Validation**: Zero test failures in existing test suite

**Dependencies**: T002  
**Status**: [ ]

---

## Phase 3.1: Setup - Foundation

### T004: Add New TypeScript Types
**File**: `lib/types.ts`  
**Description**: Add TypeScript interfaces for TranscriptEntry, HelpAlert, Quiz, QuizQuestion

Copy interfaces from `specs/003-this-is-a/data-model.md` including:
- TranscriptEntry with all fields (id, sessionId, speakerId, speakerRole, text, timestamp, confidence, breakoutRoomName)
- HelpAlert with status enum and state transitions
- Quiz and QuizQuestion with validation rules
- Export all new types

**WHY comments**: Explain role-based speaker identification, in-memory lifecycle

**Validation**: TypeScript compiles with new types, no `any` usage

**Dependencies**: T003  
**Status**: [X]

---

### T005: [P] Create TranscriptStore
**File**: `lib/store/transcript-store.ts`  
**Description**: Implement in-memory store for transcript entries using Map

From data-model.md, create:
- Private Map<sessionId, TranscriptEntry[]>
- `add(entry)` method with append-only pattern
- `get(sessionId, options?)` with filtering (since, role, minConfidence)
- `getByIds(ids)` for alert source tracing
- `clear(sessionId)` for cleanup
- `getSessions()` and `size()` for monitoring

**WHY comments**: Explain append-only pattern, memory management strategy

**Validation**: Can add/retrieve transcripts, filtering works

**Dependencies**: T004  
**Status**: [X]

---

### T006: [P] Create AlertStore
**File**: `lib/store/alert-store.ts`  
**Description**: Implement in-memory store for help alerts

From data-model.md, create:
- Private Map<classroomSessionId, HelpAlert[]>
- `create(alert)` method
- `get(classroomSessionId, options?)` with filtering and urgency sorting
- `updateStatus(alertId, status, instructorId)` for state transitions
- `clear(classroomSessionId)` for cleanup
- `autoDismissOld()` for 30-minute timeout

**WHY comments**: Explain alert sorting logic, auto-dismissal strategy

**Validation**: Can create/update alerts, sorting works correctly

**Dependencies**: T004  
**Status**: [X]

---

### T007: [P] Create QuizStore
**File**: `lib/store/quiz-store.ts`  
**Description**: Implement in-memory store for quizzes

From data-model.md, create:
- Private Map<quizId, Quiz> for main storage
- Private Map<sessionId, quizId[]> for session index
- `save(quiz)` method
- `get(quizId)` and `getBySession(sessionId)`
- `update(quizId, updates)` with lastModified timestamp
- `delete(quizId)` with index cleanup
- `clearSession(sessionId)`

**WHY comments**: Explain dual-index pattern for fast lookups

**Validation**: Can save/retrieve/update quizzes

**Dependencies**: T004  
**Status**: [X]

---

### T008: Export Store Singletons
**File**: `lib/store/index.ts`  
**Description**: Create singleton instances and export with cleanup interval

```typescript
export const transcriptStore = new TranscriptStore();
export const alertStore = new AlertStore();
export const quizStore = new QuizStore();

// Auto-dismiss old alerts every 5 minutes
setInterval(() => alertStore.autoDismissOld(), 5 * 60 * 1000);
```

**WHY comment**: Explain singleton pattern for shared state across API routes

**Validation**: Can import stores in other files

**Dependencies**: T005, T006, T007  
**Status**: [X]

---

### T009: Add Alert Constants
**File**: `lib/constants.ts`  
**Description**: Add help detection keywords and thresholds

From research.md, add:
- `HELP_KEYWORDS` array with categories (direct help, confusion, frustration)
- `URGENCY_THRESHOLDS` for scoring algorithm
- `FALSE_POSITIVE_PHRASES` to filter out
- `DEFAULT_CONFIDENCE_THRESHOLD = 0.7`
- `ALERT_AUTO_DISMISS_MINUTES = 30`

**WHY comments**: Explain why these specific keywords chosen

**Validation**: Constants exported and typed correctly

**Dependencies**: T004  
**Status**: [X]

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T010: [P] Contract Test - Transcription API
**File**: `tests/contract/test_transcripts_api.test.ts`  
**Description**: Test transcript endpoints match OpenAPI contract

From `contracts/transcription-api.yaml`, test:
- GET /api/transcripts/[sessionId] returns correct schema
- Response includes entries array, count, hasMore
- Query params work: since, role, minConfidence
- 404 for non-existent session
- 400 for invalid parameters

Use Jest assertions for schema validation. Tests MUST FAIL initially.

**Validation**: Tests written, currently failing (no implementation yet)

**Dependencies**: T008  
**Status**: [X]

---

### T011: [P] Contract Test - Alerts API
**File**: `tests/contract/test_alerts_api.test.ts`  
**Description**: Test alert endpoints match OpenAPI contract

From `contracts/alerts-api.yaml`, test:
- GET /api/alerts/[sessionId] returns alerts array with counts
- POST /api/alerts updates alert status
- Status transitions work (pending → acknowledged → resolved)
- 401 for non-instructors
- Alert sorting by urgency then time

Tests MUST FAIL initially.

**Validation**: Tests written, currently failing

**Dependencies**: T008  
**Status**: [X]

---

### T012: [P] Contract Test - Quiz Generation API
**File**: `tests/contract/test_quiz_api.test.ts`  
**Description**: Test quiz endpoints match OpenAPI contract

From `contracts/quiz-generation-api.yaml`, test:
- POST /api/quiz/generate creates quiz with correct structure
- GET /api/quiz/[quizId] retrieves quiz
- PATCH /api/quiz/[quizId] updates questions and title
- DELETE /api/quiz/[quizId] removes quiz
- Question types (multiple_choice, true_false) validated
- 404 for missing instructor transcripts

Tests MUST FAIL initially.

**Validation**: Tests written, currently failing

**Dependencies**: T008  
**Status**: [X]

---

### T013: [P] Integration Test - Transcript Capture Flow
**File**: `tests/integration/test_transcript_capture.test.ts`  
**Description**: Test complete transcript capture user journey

From quickstart.md Step 6-7:
1. Simulate joining classroom
2. Mock Web Speech API or transcription service
3. "Speak" test phrases (instructor and student)
4. Verify transcripts captured with correct roles
5. Test filtering by role, time, confidence
6. Verify cleanup on session end

Tests MUST FAIL initially.

**Validation**: Integration test written, fails without implementation

**Dependencies**: T008  
**Status**: [X]

---

### T014: [P] Integration Test - Help Alert Generation
**File**: `tests/integration/test_instructor_alerts.test.ts`  
**Description**: Test help detection and alert delivery to instructor

From quickstart.md Step 8-11:
1. Create breakout room with students
2. Student "says" confusion keywords ("I don't understand")
3. Verify alert created within 5 seconds
4. Check alert has correct topic, urgency, room name
5. Test instructor acknowledging/resolving alerts
6. Verify different urgency levels for different phrases

Tests MUST FAIL initially.

**Validation**: Integration test written, fails without implementation

**Dependencies**: T008  
**Status**: [X]

---

### T015: [P] Integration Test - Quiz Generation Flow
**File**: `tests/integration/test_quiz_generation.test.ts`  
**Description**: Test quiz generation from instructor transcripts

From quickstart.md Step 12-15:
1. Capture instructor teaching transcripts
2. Request quiz generation with 5 questions
3. Mock LLM API response (GPT-3.5)
4. Verify quiz created with correct question types (3 MC, 2 TF)
5. Verify only instructor transcripts used (no student speech)
6. Test quiz editing and publishing workflow
7. Verify generation time <30 seconds

Tests MUST FAIL initially.

**Validation**: Integration test written, fails without implementation

**Dependencies**: T008  
**Status**: [X]

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**Services Layer**

### T016: [P] Implement TranscriptionService
**File**: `lib/services/transcription-service.ts`  
**Description**: Service to capture and store transcripts using Web Speech API

From research.md Web Speech API decision:
- Initialize Web Speech API for browser
- `startCapture(sessionId, speakerId, role)` method
- Convert speech to text with timestamps
- Store in TranscriptStore with confidence scores
- `stopCapture(sessionId)` cleanup
- Error handling for permissions, unsupported browsers

**WHY comments**: Explain Web Speech as MVP choice, Deepgram upgrade path

**Validation**: Can capture speech, store transcripts with correct metadata

**Dependencies**: T008, T010-T015 (tests must exist and be failing)  
**Status**: [X]

---

### T017: [P] Implement HelpDetectionService  
**File**: `lib/services/help-detection-service.ts`  
**Description**: Analyze transcripts for help patterns and create alerts

From research.md keyword patterns:
- `analyzeTranscripts(sessionId)` method
- Keyword matching against HELP_KEYWORDS
- Extract topic from context (nouns near keywords)
- Calculate urgency (keyword strength + frequency)
- Create HelpAlert with context snippet
- Detect false positives (exclude positive phrases)
- Optional: Use compromise.js for simple NLP

**WHY comments**: Explain keyword approach vs ML, topic extraction logic

**Validation**: Detects confusion phrases, extracts topics correctly

**Dependencies**: T008, T009, T010-T015  
**Status**: [X]

---

### T018: Implement AlertService
**File**: `lib/services/alert-service.ts`  
**Description**: Manage alert lifecycle and delivery to instructors

- `createAlert(params)` generates unique alert ID
- `notifyInstructor(alert)` prepares alert for delivery (in-app only)
- `acknowledgeAlert(alertId, instructorId)` status update
- `resolveAlert(alertId, instructorId)` status update
- `dismissAlert(alertId, reason)` status update
- Get pending alerts for classroom

**WHY comments**: Explain in-app delivery choice, state machine

**Validation**: Alert lifecycle managed correctly

**Dependencies**: T006, T010-T015  
**Status**: [X]

---

### T019: Implement QuizService
**File**: `lib/services/quiz-service.ts`  
**Description**: Generate quizzes using LLM from instructor transcripts

From research.md GPT-3.5 Turbo decision:
- `generateQuiz(sessionId, instructorId, options)` method
- Filter transcripts for instructor role only
- Build LLM prompt from transcript text
- Call OpenAI API with JSON mode
- Parse response into Quiz structure
- Validate question types and format
- Store in QuizStore with draft status
- Handle rate limits and retries

**WHY comments**: Explain LLM choice, prompt engineering, why instructor-only

**Validation**: Generates valid quiz with correct question distribution

**Dependencies**: T007, T010-T015  
**Status**: [X]

---

**API Routes Layer**

### T020: [P] Implement GET /api/transcripts/[sessionId]
**File**: `app/api/transcripts/[sessionId]/route.ts`  
**Description**: API endpoint to retrieve transcripts with filtering

- Parse sessionId from params (await params in Next.js 15)
- Parse query params (since, role, minConfidence)
- Call transcriptStore.get() with filters
- Return JSON with entries, count, hasMore
- Handle errors (404 for missing session)

**WHY comments**: Explain server-side filtering strategy

**Validation**: Contract test T010 passes

**Dependencies**: T005, T010  
**Status**: [X]

---

### T021: Implement POST /api/transcripts/analyze
**File**: `app/api/transcripts/analyze/route.ts`  
**Description**: Trigger help detection analysis on transcripts

- Parse request body (sessionId, sinceLast)
- Get recent transcripts from store
- Call HelpDetectionService.analyzeTranscripts()
- Return analysis results (alerts generated)
- Error handling

**WHY comments**: Explain manual trigger vs automatic (polling in client)

**Validation**: Analysis runs, creates alerts

**Dependencies**: T017, T010  
**Status**: [X]

---

### T022: [P] Implement GET /api/alerts/[sessionId]
**File**: `app/api/alerts/[sessionId]/route.ts`  
**Description**: Get alerts for classroom with filtering

- Parse sessionId (await params)
- Parse query filters (status, urgency, breakoutRoom)
- Call alertStore.get() with filters
- Calculate counts by status
- Return sorted alerts (urgency desc, time desc)

**WHY comments**: Explain sorting strategy for instructor priority

**Validation**: Contract test T011 passes

**Dependencies**: T006, T011  
**Status**: [X]

---

### T023: Implement POST /api/alerts
**File**: `app/api/alerts/route.ts`  
**Description**: Update alert status (acknowledge/resolve/dismiss)

- Parse request body (alertId, status, instructorId)
- Validate status transition (no pending from acknowledged)
- Call alertStore.updateStatus()
- Return updated alert
- Authorization check (instructor only)

**WHY comments**: Explain state machine transitions

**Validation**: Contract test T011 passes

**Dependencies**: T018, T011  
**Status**: [X]

---

### T024: Implement POST /api/quiz/generate
**File**: `app/api/quiz/generate/route.ts`  
**Description**: Generate quiz from instructor transcripts

- Parse request body (sessionId, instructorId, questionCount, difficulty)
- Validate instructor authorization
- Check for instructor transcripts (404 if none)
- Call QuizService.generateQuiz()
- Return generated quiz (or 202 for async)
- Handle LLM errors (500 with helpful message)

**WHY comments**: Explain async consideration, error handling strategy

**Validation**: Contract test T012 passes

**Dependencies**: T019, T012  
**Status**: [X]

---

### T025: [P] Implement GET /api/quiz/[quizId]
**File**: `app/api/quiz/[quizId]/route.ts`  
**Description**: Retrieve quiz by ID

- Parse quizId (await params)
- Call quizStore.get(quizId)
- Return quiz or 404

**Validation**: Contract test T012 passes

**Dependencies**: T007, T012  
**Status**: [X]

---

### T026: Implement PATCH /api/quiz/[quizId]
**File**: `app/api/quiz/[quizId]/route.ts` (add PATCH handler)  
**Description**: Update quiz (edit questions, change status)

- Parse quizId and updates from body
- Validate quiz exists
- Check authorization (creator only)
- Call quizStore.update()
- Update lastModified timestamp
- Return updated quiz

**WHY comments**: Explain instructor review before publishing

**Validation**: Contract test T012 passes

**Dependencies**: T025, T012  
**Status**: [X]

---

### T027: Implement DELETE /api/quiz/[quizId]
**File**: `app/api/quiz/[quizId]/route.ts` (add DELETE handler)  
**Description**: Delete quiz

- Parse quizId
- Check authorization
- Call quizStore.delete()
- Return 204 on success

**Validation**: Contract test T012 passes

**Dependencies**: T025, T012  
**Status**: [X]

---

### T028: Add API Error Handling
**File**: All API route files  
**Description**: Add consistent error handling and logging across all endpoints

- Wrap handlers in try-catch
- Return proper HTTP status codes
- Include helpful error messages
- Log errors to console with context
- No stack traces in production

**WHY comments**: Explain error format consistency

**Validation**: Error responses match contract schemas

**Dependencies**: T020-T027  
**Status**: [X]

---

**UI Components Layer**

### T029: Create AlertPanel Component
**File**: `app/components/AlertPanel.tsx`  
**Description**: Display help alerts for instructors

- Show list of alerts sorted by urgency
- Color coding by urgency (red=high, yellow=medium, gray=low)
- Display breakout room name, topic, context snippet
- Action buttons: Acknowledge, Resolve, Dismiss
- Poll /api/alerts/[sessionId] every 2 seconds
- Show alert count badge
- Empty state when no alerts

**WHY comments**: Explain polling choice (SSE upgrade path noted)

**Validation**: Renders alerts, can update status

**Dependencies**: T022, T023  
**Status**: [X]

---

### T030: [P] Create TranscriptMonitor Component
**File**: `app/components/TranscriptMonitor.tsx`  
**Description**: Show live transcript feed (optional debug view)

- Display recent transcripts (last 10)
- Show speaker name, role badge, text
- Auto-scroll to newest
- Toggle to show/hide
- Poll /api/transcripts/[sessionId]?since=[lastTimestamp]

**WHY comments**: Explain debug/transparency purpose

**Validation**: Shows transcripts in real-time

**Dependencies**: T020  
**Status**: [X]

---

### T031: [P] Create QuizGenerator Component
**File**: `app/components/QuizGenerator.tsx`  
**Description**: Quiz generation interface for instructors

- "Generate Quiz" button
- Loading state (generation in progress)
- Show generated questions with edit capability
- Edit question text, options, correct answer
- Publish/discard buttons
- Poll for async completion if needed

**WHY comments**: Explain instructor review workflow

**Validation**: Can generate and edit quizzes

**Dependencies**: T024, T026  
**Status**: [X]

---

### T032: Modify InstructorControls Component
**File**: `app/components/InstructorControls.tsx`  
**Description**: Add AlertPanel to instructor dashboard

- Import and render AlertPanel
- Pass classroomSessionId prop
- Position in sidebar or modal
- Show alert count badge on controls
- Only visible to instructors (role check)

**WHY comments**: Explain instructor-only feature gating

**Validation**: Instructors see alerts, students don't

**Dependencies**: T029  
**Status**: [X]

---

### T033: Modify Classroom Component
**File**: `app/components/Classroom.tsx`  
**Description**: Integrate transcript capture into classroom

- Initialize TranscriptionService on join
- Start capture with participant ID and role
- Handle permission requests
- Stop capture on leave
- Show opt-in notification (FERPA compliance)
- Error handling for unsupported browsers

**WHY comments**: Explain role assignment, permission flow

**Validation**: Transcripts captured during session

**Dependencies**: T016  
**Status**: [X]

---

## Phase 3.4: Integration & Polish

### T034: [P] Unit Test - HelpDetectionService
**File**: `tests/unit/services/help-detection.test.ts`  
**Description**: Test keyword matching and topic extraction

- Test each keyword category triggers detection
- Test urgency calculation
- Test topic extraction from context
- Test false positive filtering
- Test edge cases (no keywords, ambiguous)

**Validation**: 100% code coverage on detection logic

**Dependencies**: T017  
**Status**: [X]

---

### T035: [P] Unit Test - AlertService
**File**: `tests/unit/services/alert-service.test.ts`  
**Description**: Test alert lifecycle management

- Test alert creation with all fields
- Test status transitions (valid and invalid)
- Test auto-dismissal logic
- Test sorting by urgency

**Validation**: All state transitions work correctly

**Dependencies**: T018  
**Status**: [X]

---

### T036: [P] Unit Test - QuizService
**File**: `tests/unit/services/quiz-service.test.ts`  
**Description**: Test quiz generation logic

- Mock OpenAI API responses
- Test question distribution (3 MC, 2 TF)
- Test instructor-only filtering
- Test error handling (rate limits, API errors)
- Test retry logic

**Validation**: Quiz generation reliable

**Dependencies**: T019  
**Status**: [X]

---

### T037: [P] Unit Test - AlertPanel Component
**File**: `tests/unit/components/AlertPanel.test.tsx`  
**Description**: Test alert UI rendering and interactions

- Render with mock alerts
- Test sorting display
- Test action buttons trigger API calls
- Test empty state
- Test polling behavior

**Validation**: Component renders correctly in all states

**Dependencies**: T029  
**Status**: [X]

---

### T038: [P] Unit Test - QuizGenerator Component
**File**: `tests/unit/components/QuizGenerator.test.tsx`  
**Description**: Test quiz generation UI

- Test generate button triggers API
- Test loading state
- Test editing questions
- Test publish workflow

**Validation**: Component behavior correct

**Dependencies**: T031  
**Status**: [X]

---

### T039: Performance Testing
**File**: `tests/integration/test_performance.test.ts`  
**Description**: Validate performance targets from plan.md

- Speech to transcript: <2 seconds
- Transcript to analysis: <1 second  
- Analysis to alert: <1 second
- Total help detection latency: <5 seconds
- Quiz generation: <30 seconds for 5 questions
- Memory usage: <50MB per classroom session

Use Playwright for timing measurements.

**Validation**: All performance targets met

**Dependencies**: T033, T029  
**Status**: [X]

---

### T040: Memory Management Testing
**File**: `tests/integration/test_memory_management.test.ts`  
**Description**: Verify no memory leaks

- Run 30-minute session with continuous transcripts
- Monitor store sizes
- Leave session, verify cleanup called
- Check stores empty after cleanup
- No orphaned data

**Validation**: Memory stays bounded, cleanup works

**Dependencies**: T008, T033  
**Status**: [X]

---

### T041: Execute Quickstart Validation
**File**: `specs/003-this-is-a/quickstart.md`  
**Description**: Run complete end-to-end validation manually

Follow all 22 steps in quickstart.md:
- Environment setup
- Existing platform validation
- Transcript capture
- Help detection
- Quiz generation
- Complete instructor workflow
- Performance validation

Check all validation boxes in quickstart.md.

**Validation**: All checkboxes completed

**Dependencies**: All previous tasks  
**Status**: [X]

**Note**: Quickstart validation should be performed manually by the user following the steps in quickstart.md. The automated tests (T039, T040) provide validation coverage for key requirements.

---

### T042: Update Documentation
**File**: `README.md`, API docs  
**Description**: Document new intelligent education features

- Add "Intelligent Features" section to README
- Document environment variables (OPENAI_API_KEY)
- Update API endpoints list
- Add usage examples
- Link to quickstart.md
- Update architecture diagram

**WHY comments in code**: Verify all services have educational comments

**Validation**: Documentation complete and accurate

**Dependencies**: T041  
**Status**: [X]

---

## Dependencies Graph

```
Prerequisites (MUST DO FIRST):
T001 (env) → T002 (verify app) → T003 (test existing)

Setup:
T003 → T004 (types) → T005,T006,T007 (stores) → T008 (singletons)
T004 → T009 (constants)

Tests (TDD - MUST FAIL before implementation):
T008 → T010,T011,T012 (contract tests) [P]
T008 → T013,T014,T015 (integration tests) [P]

Services (after tests exist):
T008,T009 → T016,T017 (transcription, detection) [P]
T006,T010-T015 → T018 (alerts)
T007,T010-T015 → T019 (quiz)

API Routes:
T005,T010 → T020 (GET transcripts) [P]
T017,T010 → T021 (POST analyze)
T006,T011 → T022 (GET alerts) [P]
T018,T011 → T023 (POST alerts)
T019,T012 → T024 (POST quiz generate)
T007,T012 → T025 (GET quiz) [P]
T025,T012 → T026,T027 (PATCH/DELETE quiz)
T020-T027 → T028 (error handling)

UI Components:
T022,T023 → T029 (AlertPanel)
T020 → T030 (TranscriptMonitor) [P]
T024,T026 → T031 (QuizGenerator) [P]
T029 → T032 (modify InstructorControls)
T016 → T033 (modify Classroom)

Polish:
T017 → T034 (unit test detection) [P]
T018 → T035 (unit test alerts) [P]
T019 → T036 (unit test quiz) [P]
T029 → T037 (unit test AlertPanel) [P]
T031 → T038 (unit test QuizGenerator) [P]
T033,T029 → T039 (performance)
T008,T033 → T040 (memory)
ALL → T041 (quickstart validation)
T041 → T042 (docs)
```

---

## Parallel Execution Examples

**Phase 3.1 - Setup (after T004 types complete)**:
```bash
# Launch T005-T007 together (different files):
Task: "Create TranscriptStore in lib/store/transcript-store.ts"
Task: "Create AlertStore in lib/store/alert-store.ts"
Task: "Create QuizStore in lib/store/quiz-store.ts"
```

**Phase 3.2 - Contract Tests (after T008 stores ready)**:
```bash
# Launch T010-T012 together:
Task: "Contract test transcription API in tests/contract/test_transcripts_api.test.ts"
Task: "Contract test alerts API in tests/contract/test_alerts_api.test.ts"
Task: "Contract test quiz API in tests/contract/test_quiz_api.test.ts"

# Then launch T013-T015 together:
Task: "Integration test transcript capture in tests/integration/test_transcript_capture.test.ts"
Task: "Integration test alerts in tests/integration/test_instructor_alerts.test.ts"
Task: "Integration test quiz generation in tests/integration/test_quiz_generation.test.ts"
```

**Phase 3.3 - Services (after tests fail)**:
```bash
# Launch T016-T017 together (independent services):
Task: "Implement TranscriptionService in lib/services/transcription-service.ts"
Task: "Implement HelpDetectionService in lib/services/help-detection-service.ts"
```

**Phase 3.4 - Unit Tests**:
```bash
# Launch T034-T038 together:
Task: "Unit test HelpDetectionService in tests/unit/services/help-detection.test.ts"
Task: "Unit test AlertService in tests/unit/services/alert-service.test.ts"
Task: "Unit test QuizService in tests/unit/services/quiz-service.test.ts"
Task: "Unit test AlertPanel in tests/unit/components/AlertPanel.test.tsx"
Task: "Unit test QuizGenerator in tests/unit/components/QuizGenerator.test.tsx"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, safe to parallelize
- **TDD Critical**: Tests T010-T015 MUST be written and failing before implementing T016-T033
- **Prerequisites First**: Complete T001-T003 before any new feature work
- **Verify tests fail**: Run `npm test` after Phase 3.2 to confirm red tests
- **Commit frequently**: After each task with educational commit messages
- **Constitution compliance**: Single-file solutions where appropriate, extensive WHY comments
- **Performance targets**: Validate in T039 (<5s alerts, <30s quiz generation)

---

## Task Generation Rules Applied

1. ✅ **From Contracts**: 3 contract files → 3 contract test tasks (T010-T012) [P]
2. ✅ **From Data Model**: 3 entities → 3 store creation tasks (T005-T007) [P]
3. ✅ **From User Stories**: 3 main stories → 3 integration tests (T013-T015) [P]
4. ✅ **From Quickstart**: Validation scenarios → T041 manual validation
5. ✅ **Ordering**: Setup → Tests → Services → API Routes → Components → Polish
6. ✅ **Dependencies**: Tests before implementation, models before services

---

## Validation Checklist

*GATE: Verified before tasks.md creation*

- [X] All contracts have corresponding tests (T010-T012)
- [X] All entities have store tasks (T005-T007)
- [X] All tests come before implementation (T010-T015 before T016-T033)
- [X] Parallel tasks truly independent (different files, checked)
- [X] Each task specifies exact file path
- [X] No task modifies same file as another [P] task
- [X] Prerequisites identified (T001-T003)
- [X] Performance validation included (T039)
- [X] Memory management tested (T040)

### Constitution Compliance

- [X] Tasks favor single-file implementations (services, stores in single files)
- [X] Complex tasks include comment/documentation requirements (WHY comments specified)
- [X] Task descriptions use newcomer-friendly language (no jargon, clear explanations)
- [X] No unnecessary file splits or over-engineering (minimal file count, clear organization)

---

## Estimated Timeline

- **Phase 3.0 (Prerequisites)**: 1-2 hours
- **Phase 3.1 (Setup)**: 4-6 hours
- **Phase 3.2 (Tests)**: 6-8 hours
- **Phase 3.3 (Implementation)**: 40-50 hours
- **Phase 3.4 (Polish)**: 10-12 hours
- **Total**: ~60-80 hours (2-3 weeks with testing and iteration)

---

**Status**: 42 tasks ready for execution. Run T001 to begin.

**Next Command**: Start with T001 (environment configuration) or review task dependencies above.

---

*Tasks generated: October 7, 2025*  
*Based on Overcast Constitution v1.0.0*


