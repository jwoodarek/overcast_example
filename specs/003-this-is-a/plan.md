# Implementation Plan: Intelligent Education Video Platform

**Branch**: `003-this-is-a` | **Date**: October 7, 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-this-is-a/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Feature spec loaded successfully
2. Fill Technical Context
   → ✅ Next.js 15.5.4, React 19, TypeScript detected
   → ✅ Project Type: Web application (Next.js App Router)
   → ✅ No database for initial implementation (in-memory)
3. Fill Constitution Check section
   → ✅ Evaluated against Overcast Constitution v1.0.0
4. Evaluate Constitution Check section
   → ✅ No violations - simple, file-minimal approach
5. Execute Phase 0 → research.md
   → ✅ Research tasks defined
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ Design artifacts planned
7. Re-evaluate Constitution Check
   → ✅ Design maintains constitutional principles
8. Plan Phase 2 → Task generation approach
   → ✅ Described below
9. STOP - Ready for /tasks command
```

## Summary

**Primary Requirement**: Transform the existing Overcast video classroom platform into an intelligent education system with AI-powered assistance features.

**Two-Phase Approach**:
1. **Phase 0.5 - Local Setup**: Get the existing application running locally with proper environment configuration (Daily.co API key, room URLs)
2. **Phases 1-2 - Intelligence Features**: Add transcript analysis, intelligent help alerts, and AI-powered quiz generation from instructor content

**Technical Approach**:
- Local-first architecture without database dependency (in-memory state management)
- Leverage Daily.co's transcription capabilities or integrate third-party transcription service
- Real-time analysis using keyword detection and pattern matching for help detection
- LLM integration (OpenAI API or similar) for quiz generation from instructor transcripts
- Role-based speaker identification using existing participant metadata
- In-app notification system for instructor alerts

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: Next.js 15.5.4, React 19.1.0, @daily-co/daily-js 0.84.0, @daily-co/daily-react 0.23.2  
**Additional Dependencies Needed**: 
- Transcription service (Daily.co built-in or Deepgram/AssemblyAI)
- LLM API for quiz generation (OpenAI GPT-4 or Anthropic Claude)
- Pattern matching library for help detection (natural or compromise.js)

**Storage**: In-memory only for initial implementation (session state, transcripts, alerts persist only during app runtime)  
**Testing**: Jest (unit/contract), Playwright (integration), React Testing Library (components)  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), deployed on Vercel serverless  
**Project Type**: Web application (Next.js App Router with API routes)  

**Performance Goals**:
- Real-time transcript processing: <2 second latency from speech to text
- Help alert generation: <5 seconds from detection to instructor notification
- Quiz generation: <30 seconds for 5-10 questions
- Support 50 participants per classroom with monitoring

**Constraints**:
- No database for initial version (all state in-memory)
- FERPA compliance (basic notification, relaxed privacy for accelerator context)
- Browser-based only (no mobile app)
- 90-day retention target (deferred to future database implementation)

**Scale/Scope**:
- 6 pre-configured classrooms
- 50 participants per classroom maximum
- Multiple breakout rooms per classroom
- Real-time monitoring across all active breakout rooms
- Single-session quiz generation (no historical analysis in v1)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity First**: Does this feature use the simplest approach? Any complex patterns must be justified.
- [X] Solution starts with simplest working approach (in-memory, no database, role-based speaker ID)
- [X] Complex patterns documented with rationale (LLM integration justified for quality quiz generation)
- [X] No premature optimization or over-engineering (deferring historical analysis, database, advanced ML)

**Single File Preference**: Are we minimizing file count without sacrificing clarity?
- [X] Related functionality kept together (transcript service handles capture + analysis)
- [X] File splits justified by clear organizational benefits (separate concerns: transcription, alert, quiz)
- [X] No excessive hierarchies or unnecessary modules (flat structure in lib/)

**Comment-Driven Development**: Will the code be educational for newcomers?
- [X] Non-trivial logic includes WHY comments (especially AI/LLM integration, pattern matching)
- [X] Business decisions explained in accessible language (why keyword detection, why role-based)
- [X] Complex patterns include educational explanations (LLM prompt engineering, transcript parsing)

**Newcomer-Friendly Architecture**: Is the design approachable for junior developers?
- [X] Clear, descriptive naming without jargon (HelpAlertService, QuizGenerator, not AISvc, QGen)
- [X] Architecture patterns explained when advanced (webhook handling, streaming responses)
- [X] No implicit conventions or domain-specific abstractions (explicit interfaces for all services)

**Test-Driven Clarity**: Do tests serve as living documentation?
- [X] Test names describe scenarios in plain language ("instructor receives alert when student says 'I'm stuck'")
- [X] Tests demonstrate complete user workflows (full instructor journey with alerts)
- [X] Test code follows same simplicity principles (readable test setup, clear assertions)

## Project Structure

### Documentation (this feature)
```
specs/003-this-is-a/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - API research, transcription options
├── data-model.md        # Phase 1 output - in-memory data structures
├── quickstart.md        # Phase 1 output - setup and validation steps
├── contracts/           # Phase 1 output - API contracts for new endpoints
│   ├── transcription-api.yaml      # Transcript capture/retrieval
│   ├── alerts-api.yaml             # Help alert management
│   └── quiz-generation-api.yaml    # Quiz creation endpoints
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── page.tsx                        # [EXISTING] Main lobby
├── classroom/[id]/page.tsx         # [EXISTING] Classroom view
├── api/                            # API routes
│   ├── rooms/                      # [EXISTING] Room management
│   ├── participants/               # [EXISTING] Participant controls
│   ├── transcripts/                # [NEW] Transcript endpoints
│   │   ├── [sessionId]/route.ts   # Get transcript for session
│   │   └── analyze/route.ts       # Trigger analysis
│   ├── alerts/                     # [NEW] Alert management
│   │   ├── [sessionId]/route.ts   # Get alerts for session
│   │   └── route.ts               # Create/dismiss alerts
│   └── quiz/                       # [NEW] Quiz generation
│       ├── generate/route.ts      # Generate quiz from transcript
│       └── [quizId]/route.ts      # Get/update quiz
├── components/
│   ├── Classroom.tsx              # [MODIFY] Add transcript monitoring
│   ├── InstructorControls.tsx     # [MODIFY] Add alert panel
│   ├── AlertPanel.tsx             # [NEW] Display help alerts
│   ├── TranscriptMonitor.tsx      # [NEW] Show live transcript
│   ├── QuizGenerator.tsx          # [NEW] Quiz creation interface
│   └── ui/                        # [EXISTING] Shared UI components

lib/
├── types.ts                       # [MODIFY] Add new types
├── constants.ts                   # [MODIFY] Add alert thresholds
├── daily-config.ts                # [EXISTING] Daily setup
├── daily-utils.ts                 # [EXISTING] Daily helpers
├── services/                      # [NEW] Business logic services
│   ├── transcription-service.ts  # Capture and store transcripts
│   ├── help-detection-service.ts # Analyze for help patterns
│   ├── alert-service.ts          # Manage alert generation/delivery
│   └── quiz-service.ts           # LLM-powered quiz generation
└── store/                         # [NEW] In-memory state management
    ├── transcript-store.ts        # Session transcripts
    ├── alert-store.ts             # Active alerts
    └── quiz-store.ts              # Generated quizzes

tests/
├── contract/                      # API contract tests
│   ├── test_transcripts_api.test.ts    # [NEW]
│   ├── test_alerts_api.test.ts         # [NEW]
│   └── test_quiz_api.test.ts           # [NEW]
├── integration/                   # E2E workflow tests
│   ├── test_instructor_alerts.test.ts  # [NEW]
│   ├── test_quiz_generation.test.ts    # [NEW]
│   └── test_transcript_capture.test.ts # [NEW]
└── unit/                          # Unit tests
    ├── services/                  # [NEW]
    │   ├── help-detection.test.ts
    │   ├── alert-service.test.ts
    │   └── quiz-service.test.ts
    └── components/
        ├── AlertPanel.test.tsx    # [NEW]
        └── QuizGenerator.test.tsx # [NEW]
```

**Structure Decision**: Next.js App Router with API routes for backend logic. Following existing pattern of `app/` for UI and API routes, `lib/` for shared utilities and business logic, `tests/` for all test types. New `lib/services/` directory groups related business logic without creating excessive hierarchy. New `lib/store/` provides simple in-memory persistence using JavaScript Map/Set objects.

## Phase 0: Outline & Research

### Phase 0.5: Local Setup (PREREQUISITE)
**Goal**: Get the existing application running locally before adding new features

**Tasks**:
1. **Environment Configuration**:
   - Create `.env.local` file from provided configuration
   - Validate Daily.co API key is active
   - Verify all 6 Daily room URLs are accessible
   - Test environment variable loading in Next.js

2. **Dependency Installation**:
   - Run `npm install` to install existing dependencies
   - Verify no version conflicts or deprecated warnings
   - Test Daily.co SDK initialization

3. **Local Development Validation**:
   - Start dev server: `npm run dev`
   - Access lobby at `http://localhost:3000`
   - Test joining a classroom as student
   - Test joining as instructor with controls
   - Verify video/audio functionality
   - Test existing features (mute, breakout rooms)

4. **Pre-flight Checklist**:
   - [ ] Environment variables loaded correctly
   - [ ] All 6 classrooms visible in lobby
   - [ ] Can join classroom and see video feed
   - [ ] Instructor controls accessible
   - [ ] Existing tests pass: `npm test`

**Output**: `quickstart-existing.md` documenting successful local setup

### Phase 0: Research Tasks

**1. Transcription Service Research**:
   - **Question**: Should we use Daily.co's built-in transcription, or integrate third-party service?
   - **Options**: 
     - Daily.co transcription API (if available in our tier)
     - Deepgram (real-time, WebSocket API, good for education)
     - AssemblyAI (accurate, REST API, speaker diarization)
     - Web Speech API (browser-native, free but limited accuracy)
   - **Evaluation Criteria**: Real-time capability, accuracy, speaker identification, cost, ease of integration
   - **Output**: Decision in `research.md` with rationale

**2. LLM Service Research**:
   - **Question**: Which LLM API for quiz generation?
   - **Options**:
     - OpenAI GPT-4 (widely used, good instruction following)
     - Anthropic Claude (longer context, detailed explanations)
     - OpenAI GPT-3.5-turbo (faster, cheaper, sufficient for structured output)
   - **Evaluation Criteria**: Quiz quality, response time, cost per generation, structured output support
   - **Output**: Decision in `research.md` with sample prompts

**3. Help Detection Patterns**:
   - **Question**: What keywords and patterns indicate student confusion?
   - **Research**: 
     - Common confusion phrases ("I don't understand", "I'm stuck", "Can you explain")
     - Question patterns (repeated questions, silence after explanation)
     - Meta-cognitive indicators ("I'm lost", "This doesn't make sense")
   - **Output**: Keyword list and detection algorithm in `research.md`

**4. Real-time Architecture**:
   - **Question**: How to process transcripts and generate alerts in real-time?
   - **Options**:
     - Webhook from transcription service → API route → in-memory processing
     - Polling (check for new transcripts every N seconds)
     - WebSocket connection for streaming transcript updates
   - **Evaluation Criteria**: Latency, complexity, reliability
   - **Output**: Architecture diagram in `research.md`

**5. In-Memory State Management**:
   - **Question**: How to structure in-memory stores for transcripts, alerts, quizzes?
   - **Options**:
     - Plain JavaScript Map objects (simplest)
     - Zustand (React state management, overkill?)
     - Custom EventEmitter-based store (better for real-time updates)
   - **Evaluation Criteria**: Simplicity, testability, memory cleanup on session end
   - **Output**: Store pattern in `research.md` with lifecycle management

**Output**: `research.md` with all decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete, local setup validated*

### 1. Data Model (`data-model.md`)

Extract entities from spec and define in-memory data structures:

**Transcript Entry**:
```typescript
{
  id: string;              // Unique transcript entry ID
  sessionId: string;       // Classroom or breakout room session
  speakerId: string;       // Participant ID from Daily
  speakerRole: 'instructor' | 'student';
  text: string;            // Transcribed text
  timestamp: Date;         // When spoken
  confidence: number;      // Transcription confidence (0-1)
}
```

**Help Alert**:
```typescript
{
  id: string;              // Unique alert ID
  sessionId: string;       // Which breakout room/classroom
  breakoutRoomName?: string; // Null if main classroom
  detectedAt: Date;        // When help was detected
  topic: string;           // What they're struggling with (extracted from context)
  urgency: 'low' | 'medium' | 'high';
  triggerKeywords: string[]; // Which keywords triggered detection
  contextSnippet: string;  // 2-3 sentences around detection
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedBy?: string; // Instructor who acknowledged
}
```

**Quiz**:
```typescript
{
  id: string;              // Unique quiz ID
  sessionId: string;       // Which classroom session
  createdBy: string;       // Instructor who generated it
  createdAt: Date;
  sourceTranscriptIds: string[]; // Which transcript entries used
  questions: QuizQuestion[];
  status: 'draft' | 'published';
}

QuizQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options?: string[];      // For multiple choice (4 options)
  correctAnswer: string | boolean;
  explanation: string;     // Why this is the answer
  difficulty: 'easy' | 'medium' | 'hard';
}
```

**In-Memory Stores**:
- `TranscriptStore`: Map<sessionId, TranscriptEntry[]>
- `AlertStore`: Map<sessionId, HelpAlert[]>
- `QuizStore`: Map<quizId, Quiz>

**Lifecycle Management**:
- Transcripts cleared when session ends (classroom left by all participants)
- Alerts auto-dismissed after 30 minutes if not acknowledged
- Quizzes persist for current server runtime (lost on restart until database added)

### 2. API Contracts (`contracts/`)

**Transcription API** (`transcription-api.yaml`):
```yaml
/api/transcripts/{sessionId}:
  get:
    summary: Get transcript for session
    parameters:
      - sessionId: classroom or breakout room ID
      - since: optional timestamp (only return entries after this)
      - role: optional filter (instructor|student)
    responses:
      200: { entries: TranscriptEntry[], hasMore: boolean }

/api/transcripts/analyze:
  post:
    summary: Trigger help detection analysis
    body: { sessionId: string }
    responses:
      200: { alertsGenerated: number, alerts: HelpAlert[] }
```

**Alerts API** (`alerts-api.yaml`):
```yaml
/api/alerts/{sessionId}:
  get:
    summary: Get alerts for instructor
    parameters:
      - sessionId: classroom ID
      - status: optional filter (pending|acknowledged|resolved|dismissed)
    responses:
      200: { alerts: HelpAlert[] }

/api/alerts:
  post:
    summary: Update alert status
    body: { alertId: string, status: string, instructorId: string }
    responses:
      200: { alert: HelpAlert }
```

**Quiz Generation API** (`quiz-generation-api.yaml`):
```yaml
/api/quiz/generate:
  post:
    summary: Generate quiz from instructor transcript
    body: 
      { 
        sessionId: string, 
        instructorId: string,
        questionCount: number (default: 5),
        difficulty: 'mixed' | 'easy' | 'medium' | 'hard'
      }
    responses:
      200: { quiz: Quiz }
      202: { jobId: string } (if async processing)

/api/quiz/{quizId}:
  get:
    summary: Retrieve quiz
    responses:
      200: { quiz: Quiz }
  
  patch:
    summary: Edit quiz questions
    body: { questions: QuizQuestion[] }
    responses:
      200: { quiz: Quiz }
```

### 3. Contract Tests

Generate failing tests for each endpoint:

**Tests to Create**:
- `tests/contract/test_transcripts_api.test.ts`
  - Assert GET returns transcript array with correct schema
  - Assert filtering by role works
  - Assert since parameter filters correctly
  
- `tests/contract/test_alerts_api.test.ts`
  - Assert GET returns alerts with correct schema
  - Assert POST updates alert status
  - Assert only instructors can acknowledge alerts (401 for students)

- `tests/contract/test_quiz_api.test.ts`
  - Assert POST generates quiz with correct question count
  - Assert questions match specified types (multiple_choice, true_false)
  - Assert PATCH updates quiz questions

### 4. Integration Test Scenarios

From user stories in spec:

**Test: Instructor receives help alert** (`test_instructor_alerts.test.ts`)
```
Given: Instructor is in classroom with active breakout room
And: Breakout room has students discussing
When: Student says "I don't understand this concept"
Then: Alert appears in instructor's AlertPanel within 5 seconds
And: Alert shows breakout room name, topic, and urgency
```

**Test: Quiz generation from instructor speech** (`test_quiz_generation.test.ts`)
```
Given: Instructor has been teaching for 10 minutes
And: Transcript contains instructor explaining derivatives
When: Instructor clicks "Generate Quiz"
Then: System creates 5 questions within 30 seconds
And: Questions are multiple choice and true/false
And: Questions only reference instructor's content (not student questions)
```

**Test: Transcript capture and retrieval** (`test_transcript_capture.test.ts`)
```
Given: Classroom session is active with 3 participants
When: Participants speak for 2 minutes
Then: Transcripts are available via API
And: Each entry has speakerId, role, text, timestamp
And: Instructor can retrieve only student transcripts or only instructor transcripts
```

### 5. Update Agent Context

Run incremental update:
```bash
.specify/scripts/bash/update-agent-context.sh cursor
```

This will:
- Add new technologies to CURSOR_RULES (transcription service, LLM API)
- Document new patterns (in-memory stores, webhook handling)
- Update recent changes log
- Keep file under 150 lines

### 6. Quickstart Document (`quickstart.md`)

**Purpose**: Validate the complete feature works end-to-end

**Steps**:
1. **Setup**: Ensure local environment running with Phase 0.5 steps
2. **Configure AI Services**: Add LLM API key to `.env.local`
3. **Start Session**: Join classroom as instructor
4. **Test Transcript Capture**: Speak and verify transcript appears
5. **Test Help Detection**: Have student say confusion keyword, verify alert
6. **Test Quiz Generation**: Click generate, verify questions created
7. **Validation**: All 3 features working within expected performance thresholds

**Output**: `quickstart.md` with validation checklist

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Template**: Use `.specify/templates/tasks-template.md` as base structure

2. **Generate from Phase 1 Artifacts**:
   - Each contract → contract test task (parallel)
   - Each data model entity → type definition task (parallel)
   - Each service → implementation task with dependencies
   - Each component → UI implementation task
   - Integration tests → validation tasks (after implementation)

3. **Task Breakdown** (estimated 35-40 tasks):

   **Setup & Foundation (Tasks 1-5)**:
   - [1] Create environment setup documentation
   - [2] Add new TypeScript types to `lib/types.ts`
   - [3] Create in-memory store implementations
   - [4] Add API keys validation to environment check
   - [5] Update constants with alert thresholds

   **API Layer (Tasks 6-14, many [P]arallel)**:
   - [6] [P] Create transcript API route + contract test
   - [7] [P] Create alerts API route + contract test
   - [8] [P] Create quiz API route + contract test
   - [9] Implement transcript retrieval endpoint
   - [10] Implement alert management endpoint
   - [11] Implement quiz generation endpoint
   - [12] Implement quiz update endpoint
   - [13] Add error handling to all new API routes
   - [14] Add request validation to all new endpoints

   **Services Layer (Tasks 15-22)**:
   - [15] [P] Implement TranscriptionService (capture, store)
   - [16] [P] Implement HelpDetectionService (pattern matching)
   - [17] Implement AlertService (create, notify, manage)
   - [18] Implement QuizService (LLM integration)
   - [19] [P] Unit test TranscriptionService
   - [20] [P] Unit test HelpDetectionService
   - [21] [P] Unit test AlertService
   - [22] [P] Unit test QuizService

   **UI Components (Tasks 23-30)**:
   - [23] Create AlertPanel component with mock data
   - [24] Create TranscriptMonitor component
   - [25] Create QuizGenerator component
   - [26] Modify InstructorControls to include AlertPanel
   - [27] Modify Classroom component to capture transcripts
   - [28] [P] Unit test AlertPanel
   - [29] [P] Unit test TranscriptMonitor
   - [30] [P] Unit test QuizGenerator

   **Integration & Validation (Tasks 31-40)**:
   - [31] Integration test: transcript capture flow
   - [32] Integration test: help alert generation
   - [33] Integration test: quiz generation flow
   - [34] Integration test: instructor dashboard with all features
   - [35] Performance test: transcript processing latency
   - [36] Performance test: alert generation speed
   - [37] Performance test: quiz generation time
   - [38] Execute quickstart.md validation
   - [39] Fix any failing tests
   - [40] Final constitution compliance check

4. **Ordering Strategy**:
   - Types and stores first (foundation)
   - API routes with contract tests (TDD)
   - Services with unit tests (TDD)
   - UI components with unit tests (TDD)
   - Integration tests last (validate complete flows)
   - Parallel execution marked with [P] for independent tasks

5. **Dependencies**:
   - Types (Task 2) must complete before any implementation tasks
   - Stores (Task 3) must complete before services
   - Services must complete before API routes that use them
   - API routes must complete before UI components that call them
   - Unit tests [P] with their implementation
   - Integration tests depend on all implementation

**Estimated Output**: 40 numbered, dependency-ordered tasks in `tasks.md`

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

No constitutional violations detected. This design follows all principles:

- ✅ **Simplicity First**: In-memory stores, role-based speaker ID, simple keyword matching
- ✅ **Single File Preference**: Services grouped logically, no excessive splitting
- ✅ **Comment-Driven**: Educational comments planned for AI/LLM integration
- ✅ **Newcomer-Friendly**: Clear naming, explicit interfaces
- ✅ **Test-Driven**: TDD approach with contract tests before implementation

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [X] Phase 0.5: Local setup prerequisites defined
- [X] Phase 0: Research complete (research.md created)
- [X] Phase 1: Design complete (data-model.md, contracts/, quickstart.md, agent context updated)
- [X] Phase 2: Task planning complete (approach described in plan)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [X] Initial Constitution Check: PASS
- [X] Post-Design Constitution Check: PASS
- [X] All NEEDS CLARIFICATION resolved (5 questions answered in /clarify)
- [X] Complexity deviations documented (none)
- [X] Research artifacts complete (research.md)
- [X] Design artifacts complete (data-model.md, contracts/, quickstart.md)
- [X] Agent context updated (.cursor/rules/specify-rules.mdc)

**Next Command**: `/tasks` to generate the detailed task list

---

## Key Decisions Summary

1. **Local-First Architecture**: No database, in-memory stores using JavaScript Maps
2. **Transcription Service**: Research phase will determine best option (Daily.co vs. third-party)
3. **LLM Integration**: Research phase will select OpenAI vs. Anthropic vs. other
4. **Help Detection**: Simple keyword matching + pattern recognition (no complex ML initially)
5. **Alert Delivery**: In-app only (no email/SMS) to minimize complexity
6. **Quiz Types**: Multiple choice + True/False only (per clarification session)
7. **Speaker Identification**: Role-based using existing Daily.co participant metadata
8. **FERPA Compliance**: Basic notification approach (accelerator context)

*Based on Overcast Constitution v1.0.0 - See `.specify/memory/constitution.md`*

