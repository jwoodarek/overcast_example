
# Implementation Plan: Overcast Video Classroom Application

**Branch**: `002-we-are-looking` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Code_Work/overcast/specs/002-we-are-looking/spec.md`

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
Building a video-based classroom application called Overcast that provides a main lobby displaying 6 classrooms for students to join live video sessions. Instructors get additional privileges including participant muting and breakout room management. Using Daily Video platform for real-time video, Next.js for frontend, Vercel serverless functions for backend, and Tailwind for styling with a futuristic black/teal aesthetic. No database required - using pre-defined Daily URLs for local development.

## Technical Context
**Language/Version**: TypeScript/JavaScript with Next.js 15.5.4, React 19.1.0  
**Primary Dependencies**: Daily Video API (@daily-co/daily-react, @daily-co/daily-js, jotai), Next.js, Tailwind CSS v4, Vercel serverless functions  
**Storage**: N/A (using pre-defined Daily URLs, no database for local development)  
**Testing**: Jest with React Testing Library for component tests, Playwright for E2E testing  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), deployed on Vercel  
**Project Type**: web - Next.js full-stack application with frontend and serverless backend  
**Performance Goals**: <200ms page loads, <100ms video connection establishment, 60fps video quality  
**Constraints**: Local development only, pre-defined Daily room URLs, 50 participants max per classroom  
**Scale/Scope**: 6 concurrent classrooms, up to 300 total participants (6 × 50), minimal UI with futuristic aesthetic

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity First**: Does this feature use the simplest approach? Any complex patterns must be justified.
- [x] Solution starts with simplest working approach (Daily Video handles complexity, simple React components)
- [x] Complex patterns documented with rationale (Daily API integration requires specific patterns)
- [x] No premature optimization or over-engineering (using pre-defined URLs, no database)

**Single File Preference**: Are we minimizing file count without sacrificing clarity?
- [x] Related functionality kept together (lobby and classroom components, Daily integration)
- [x] File splits justified by clear organizational benefits (pages vs components vs utilities)
- [x] No excessive hierarchies or unnecessary modules (flat Next.js structure)

**Comment-Driven Development**: Will the code be educational for newcomers?
- [x] Non-trivial logic includes WHY comments (Daily API usage, video state management)
- [x] Business decisions explained in accessible language (classroom capacity, instructor privileges)
- [x] Complex patterns include educational explanations (React hooks for video, state management)

**Newcomer-Friendly Architecture**: Is the design approachable for junior developers?
- [x] Clear, descriptive naming without jargon (Lobby, Classroom, VideoFeed components)
- [x] Architecture patterns explained when advanced (Daily Video integration patterns)
- [x] No implicit conventions or domain-specific abstractions (standard React/Next.js patterns)

**Test-Driven Clarity**: Do tests serve as living documentation?
- [x] Test names describe scenarios in plain language ("student joins classroom", "instructor mutes participant")
- [x] Tests demonstrate complete user workflows (lobby → classroom → return to lobby)
- [x] Test code follows same simplicity principles (clear setup, descriptive assertions)

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
app/                          # Next.js App Router structure
├── page.tsx                  # Main lobby page
├── classroom/
│   └── [id]/
│       └── page.tsx          # Dynamic classroom pages
├── api/                      # Vercel serverless functions
│   ├── rooms/
│   │   └── route.ts          # Daily room management
│   └── participants/
│       └── route.ts          # Participant management
├── components/
│   ├── Lobby.tsx             # Main lobby component
│   ├── Classroom.tsx         # Classroom video component with DailyProvider
│   ├── VideoFeed.tsx         # Daily video integration using hooks
│   ├── ParticipantList.tsx   # Uses useParticipants() hook
│   ├── InstructorControls.tsx # Instructor-specific controls
│   └── ui/                   # Shared UI components
├── lib/
│   ├── daily-config.ts       # Daily room URLs and configuration
│   ├── constants.ts          # App constants (classroom names, etc.)
│   └── types.ts              # TypeScript type definitions
├── styles/
│   └── globals.css           # Tailwind styles with futuristic theme
└── layout.tsx                # Root layout with branding

tests/
├── components/               # Component unit tests
├── integration/              # E2E user workflow tests
└── api/                      # API route tests

public/
├── icons/                    # Classroom and UI icons
└── branding/                 # Overclock Accelerator assets
```

**Structure Decision**: Using Next.js App Router for clean file-based routing. Components organized by feature (lobby vs classroom) with shared utilities. API routes handle Daily integration. Minimal hierarchy following constitutional single-file preference while maintaining Next.js conventions.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh cursor`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
