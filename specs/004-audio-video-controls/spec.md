# Feature Specification: Instructor Interface Improvements

**Feature Branch**: `004-audio-video-controls`  
**Created**: October 8, 2025  
**Status**: Draft  
**Input**: User description: "🎙️ Audio / Video Controls - Implement mute/unmute self and camera on/off toggle buttons for the instructor view. Each button should clearly show its current state (icon color or text change). Add keyboard shortcuts: M → toggle mic, C → toggle camera. 🧍‍♂️ Instructor Controls - Replace the current 'Mute All' and 'Unmute All' buttons with a single toggle button: If anyone is unmuted → button reads 'Mute All', If all muted → button reads 'Unmute All'. Ensure button updates in real time when participants join/leave. Fix underlying logic so mute/unmute works across all connected participants. button is not currently working. 🧩 Breakout Room Management - Fix 'Create Breakout' button so that it properly creates sub-rooms using Daily room APIs or internal state mock if not yet integrated. Instructor should see confirmation of creation and list of active breakout groups. Add a simple UI modal for selecting which participants to move into each breakout. current button doesn't appear to be working. 🆘 Help Alert System - Replace the current bottom 'Help Alert' area with a modal or floating pop-up in the instructor's view. Should appear immediately help is needed. current location is too hidden for instructor to notice. Include the student's name and timestamp and a summary of the issue. 🧠 Pop Quiz Functionality - Clarify when and how pop quizzes trigger: Add a small indicator (e.g., 'Quiz pending' or 'Quiz active') near the instructor toolbar. Add a toast or modal when a quiz begins and ends. Add logging/telemetry so instructors can confirm a quiz actually ran. currently i have no way of testing if this is actually working. 💬 Transcript Feed - Implement a system to handle transcript overflow once more than 10 lines are visible: Persist older entries in memory or backend (depending on current design). Add a scrollback history view or export button ('Download transcript'). 🪲 Debug & Language Cleanup - Remove all placeholder 'debug' text, console logs, or non-English filler. currently near the live transcript. also need to remove the red box of restarting transcript. Use clear, consistent UI copy for every instructor tool. 🔍 Video Resizing - Allow instructor to resize video tiles dynamically (drag to resize or choose preset layouts). Maintain responsive design so layouts adapt smoothly between desktop and tablet widths."

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ Feature description parsed: Multiple instructor interface enhancements
2. Extract key concepts from description
   → ✅ Actors: instructors, students
   → ✅ Actions: control media, manage participants, organize breakouts, receive alerts, monitor quizzes, review transcripts, customize layouts
   → ✅ Data: media state, participant status, breakout assignments, help alerts, quiz status, transcripts
   → ✅ Constraints: instructor-only controls, real-time updates, accessibility
3. For each unclear aspect:
   → ⚠️  Some [NEEDS CLARIFICATION] markers identified
4. Fill User Scenarios & Testing section
   → ✅ Primary user flows defined for each feature area
5. Generate Functional Requirements
   → ✅ Requirements generated across 8 feature domains
6. Identify Key Entities (if data involved)
   → ✅ Key entities identified
7. Run Review Checklist
   → ⚠️  WARN: Spec has minor uncertainties requiring clarification
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-08
- Q: Should transcripts persist between sessions (stored to disk/database) or only exist during the active session (in-memory only)? → A: In-memory only — transcripts lost when session ends (as long as they can be downloaded during the session)
- Q: What file format(s) should transcript exports use? → A: Multiple formats — instructor can choose between CSV and JSON
- Q: What is the maximum number of simultaneous breakout rooms that should be supported? → A: 1-10 rooms — flexible range from single breakout to high flexibility for large classes
- Q: What preset video layouts should be available for instructors? → A: Grid + Spotlight layouts; when screen sharing is active, layout should adapt to prioritize shared content (potentially with sidebar for participants)
- Q: Should media control keyboard shortcuts (M for mic, C for camera) work when text input fields have focus? → A: Main window only — shortcuts disabled when text inputs have focus to prevent accidental triggering while typing
- Q: Should chat functionality be added? → A: Yes — chat is enabled in Daily config but no UI exists; add chat interface for participants and instructors

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
An instructor hosts a live virtual classroom session and needs full control over their own media (microphone and camera), the ability to manage all participants' audio states efficiently, organize students into breakout rooms, communicate via text chat with participants, receive immediate visible notifications when students need help, monitor quiz activity in real time, review complete session transcripts, and customize their video layout to suit their teaching style and screen size. All controls must be intuitive, immediately visible, and provide clear feedback about current states and actions taken.

### Acceptance Scenarios

#### Scenario 1: Personal Media Control
1. **Given** an instructor is in an active classroom session, **When** they click the microphone toggle button or press the 'M' key, **Then** their microphone mutes/unmutes and the button clearly shows the new state through visual indicators (color, icon, or text)
2. **Given** an instructor is in an active classroom session, **When** they click the camera toggle button or press the 'C' key, **Then** their camera turns on/off and the button clearly shows the new state through visual indicators

#### Scenario 2: Bulk Participant Control
1. **Given** multiple students are in a session with varying mute states, **When** the instructor views the participant control button, **Then** it displays "Mute All" if anyone is unmuted or "Unmute All" if everyone is already muted
2. **Given** the instructor clicks the "Mute All" button, **When** the action completes, **Then** all participants are muted and the button immediately changes to "Unmute All"
3. **Given** participants join or leave during a session, **When** the mute states change, **Then** the control button updates in real time to reflect the current aggregate state

#### Scenario 3: Breakout Room Management
1. **Given** an instructor has active participants in the main room, **When** they click "Create Breakout" and select participants for assignment, **Then** the system creates the breakout rooms and shows confirmation with a list of active groups and their members
2. **Given** breakout rooms have been created, **When** the instructor views their interface, **Then** they can see all active breakout groups, who is in each group, and options to manage them

#### Scenario 4: Help Alert Visibility
1. **Given** a student requests help or the system detects confusion in a breakout room, **When** the alert is generated, **Then** a prominent modal or floating notification appears in the instructor's view containing the student's name, timestamp, and a summary of what help is needed
2. **Given** multiple help requests arrive, **When** the instructor is viewing one alert, **Then** they can navigate between pending alerts without losing information

#### Scenario 5: Quiz Activity Monitoring
1. **Given** a quiz is pending or active in the session, **When** the instructor views their toolbar, **Then** a clear status indicator shows "Quiz pending" or "Quiz active" 
2. **Given** a quiz begins or ends, **When** the state changes, **Then** the instructor receives a toast notification or modal confirming the transition with relevant details
3. **Given** quizzes run during a session, **When** the instructor wants to verify quiz activity, **Then** they can access logs or telemetry showing when quizzes started, ended, and participation metrics

#### Scenario 6: Transcript Management
1. **Given** more than 10 lines of transcript are generated, **When** the instructor views the transcript feed, **Then** older entries are preserved (not lost) and the instructor can scroll back through history or export the complete transcript
2. **Given** an instructor wants to review or share session content, **When** they click "Download transcript", **Then** the system provides a complete transcript file

#### Scenario 7: Professional Interface Quality
1. **Given** an instructor is using the platform, **When** they view any interface elements, **Then** all text is in English, professional, and free of debug placeholders or technical jargon
2. **Given** transcription services are working, **When** the instructor views the transcript area, **Then** there are no distracting debug indicators (like red "restarting transcript" boxes)

#### Scenario 8: Flexible Video Layouts
1. **Given** an instructor has multiple video feeds visible, **When** they want to adjust the layout, **Then** they can either drag video tiles to resize them or select from preset layout options
2. **Given** an instructor uses different devices or screen sizes, **When** they access the platform on desktop or tablet, **Then** the video layout adapts responsively while maintaining usability

#### Scenario 9: Text Chat Communication
1. **Given** participants are in an active classroom session, **When** an instructor or student sends a chat message, **Then** the message appears in all participants' chat panels with sender name and timestamp
2. **Given** students are in breakout rooms, **When** they send chat messages, **Then** messages are visible only to breakout room members and the instructor
3. **Given** an instructor has the chat panel closed, **When** new messages arrive, **Then** a notification indicator appears to alert them
4. **Given** keyboard shortcuts are configured (M for mic, C for camera), **When** the chat input field has focus, **Then** typing 'M' or 'C' types the letter instead of triggering media controls

### Edge Cases
- What happens when keyboard shortcuts conflict with browser or OS shortcuts?
- How does the system handle mute/unmute commands when participants have connection issues?
- What happens if breakout room creation fails or reaches platform limits?
- How are help alerts prioritized when multiple students need help simultaneously?
- What happens to quiz indicators if the quiz generation service is unavailable?
- How does transcript export handle sessions with hours of content?
- What happens if the user resizes video tiles beyond readable dimensions?
- How does the interface handle instructors with multiple monitors or non-standard screen ratios?
- How does the layout behave when multiple participants are screen sharing simultaneously?
- What happens to custom layout preferences when screen sharing starts or stops?
- How does chat handle message overflow (hundreds or thousands of messages)?
- What happens to breakout room chat history when rooms are closed or participants move between rooms?
- How are chat notifications handled when instructors are viewing a different interface panel?

---

## Requirements *(mandatory)*

### Functional Requirements - Personal Media Control
- **FR-001**: Instructors MUST be able to toggle their own microphone on/off through a clearly labeled button
- **FR-002**: Instructors MUST be able to toggle their own camera on/off through a clearly labeled button  
- **FR-003**: Media control buttons MUST display their current state through visual indicators (color changes, icon changes, or text changes)
- **FR-004**: System MUST support keyboard shortcut 'M' to toggle microphone
- **FR-005**: System MUST support keyboard shortcut 'C' to toggle camera
- **FR-006**: Keyboard shortcuts MUST be disabled when text input fields (chat, search, etc.) have focus to prevent accidental triggering while typing; shortcuts active only when main window has focus
- **FR-007**: Media state changes MUST occur within 500ms of user action to feel instantaneous [NEEDS CLARIFICATION: Is 500ms the acceptable latency threshold, or should we target a different value?]

### Functional Requirements - Participant Management
- **FR-008**: System MUST provide a single toggle button that displays either "Mute All" or "Unmute All" based on current participant states
- **FR-009**: Button MUST display "Mute All" when one or more participants are unmuted
- **FR-010**: Button MUST display "Unmute All" when all participants are muted
- **FR-011**: When instructor clicks "Mute All", system MUST mute all currently unmuted participants
- **FR-012**: When instructor clicks "Unmute All", system MUST unmute all currently muted participants
- **FR-013**: System MUST update the toggle button label in real time when participants join, leave, or change their mute state
- **FR-014**: Mute/unmute actions MUST apply to all connected participants without requiring page refresh or manual intervention
- **FR-015**: System MUST provide feedback confirming successful mute/unmute actions (e.g., participant count affected, visual confirmation)

### Functional Requirements - Breakout Room Management  
- **FR-016**: System MUST provide a working "Create Breakout" button that successfully creates breakout room instances
- **FR-017**: When breakout creation is initiated, system MUST display a modal for participant assignment
- **FR-018**: Instructor MUST be able to select which participants are assigned to each breakout room
- **FR-019**: After creating breakout rooms, system MUST show confirmation message with list of active groups
- **FR-020**: Instructor MUST be able to view all active breakout rooms and their current members
- **FR-021**: System MUST support between 1 and 10 simultaneous breakout rooms to accommodate various teaching scenarios from single breakout to large classes
- **FR-022**: Breakout room assignments MUST persist for the duration of the session unless modified by the instructor

### Functional Requirements - Help Alert System
- **FR-023**: Help alerts MUST appear as modal dialogs or floating pop-ups rather than inline bottom-positioned elements
- **FR-024**: Help alerts MUST appear immediately when help is needed (real-time, not delayed)
- **FR-025**: Each help alert MUST display the student's name who needs help
- **FR-026**: Each help alert MUST display a timestamp of when help was requested
- **FR-027**: Each help alert MUST include a summary of the issue or what the student is struggling with
- **FR-028**: Help alerts MUST be positioned prominently in the instructor's view to ensure they are noticed
- **FR-029**: Instructor MUST be able to dismiss or acknowledge alerts without losing the information
- **FR-030**: If multiple alerts are pending, instructor MUST be able to navigate between them

### Functional Requirements - Quiz Status Visibility
- **FR-031**: System MUST display a quiz status indicator near the instructor toolbar showing current quiz state
- **FR-032**: Quiz indicator MUST show "Quiz pending" when a quiz is prepared but not yet active
- **FR-033**: Quiz indicator MUST show "Quiz active" when a quiz is currently running
- **FR-034**: System MUST display a toast notification or modal when a quiz begins, informing the instructor
- **FR-035**: System MUST display a toast notification or modal when a quiz ends, informing the instructor
- **FR-036**: System MUST log quiz lifecycle events (created, started, ended) for instructor verification
- **FR-037**: Instructor MUST be able to access quiz telemetry showing when quizzes ran and basic participation metrics [NEEDS CLARIFICATION: What specific telemetry data should be tracked - completion rates, average scores, time taken?]

### Functional Requirements - Transcript Management
- **FR-038**: System MUST preserve transcript entries when more than 10 lines are generated (no data loss during active session)
- **FR-039**: System MUST provide scrollback capability allowing instructors to review transcript history beyond the visible window
- **FR-040**: System MUST provide a "Download transcript" or export button accessible during the session
- **FR-041**: Transcript export MUST include all captured content with timestamps and speaker attribution
- **FR-042**: System MUST provide transcript export in two formats: CSV (structured with timestamp, speaker, text columns) and JSON (machine-readable structured data); instructor chooses format at export time
- **FR-043**: Transcript entries MUST remain accessible in-memory for the duration of the active session only (transcripts are not persisted between sessions; instructors must download before session ends to retain data)

### Functional Requirements - Interface Quality
- **FR-044**: All user-facing text MUST be in English with professional, clear wording
- **FR-045**: System MUST NOT display debug messages, placeholder text, or technical logs in the instructor interface
- **FR-046**: System MUST NOT display visual debug indicators (like colored boxes) unless explicitly in a developer/debug mode
- **FR-047**: Transcript area MUST NOT show "restarting transcript" or similar technical status messages to instructors
- **FR-048**: All instructor tools MUST use consistent terminology and visual design patterns
- **FR-049**: Button labels, tooltips, and help text MUST be clear and actionable for non-technical users

### Functional Requirements - Video Layout Customization
- **FR-050**: Instructors MUST be able to resize individual video tiles through drag interaction
- **FR-051**: System MUST provide two preset layout options: Grid (equal-sized tiles) and Spotlight (one main speaker highlighted)
- **FR-051a**: When screen sharing is active, system MUST automatically adapt layout to prioritize shared screen content with participant videos in a sidebar or reduced view
- **FR-052**: Video tiles MUST maintain minimum readable dimensions when resized [NEEDS CLARIFICATION: What are the minimum and maximum dimensions for video tiles in pixels or percentage?]
- **FR-053**: Video layouts MUST be responsive and adapt to desktop screen sizes
- **FR-054**: Video layouts MUST be responsive and adapt to tablet screen sizes  
- **FR-055**: Layout changes MUST persist for the duration of the instructor's session
- **FR-056**: Layout customization MUST NOT affect what students see (student layouts are independent)

### Functional Requirements - Chat Interface
- **FR-057**: System MUST provide a text chat interface accessible to both instructors and students
- **FR-058**: Chat messages MUST display sender name and timestamp
- **FR-059**: Instructors MUST be able to send messages visible to all participants
- **FR-060**: Students MUST be able to send messages visible to all participants
- **FR-061**: Chat interface MUST show message history for the duration of the active session
- **FR-062**: Chat MUST support breakout room-specific conversations (messages visible only to breakout room members)
- **FR-063**: Instructors MUST be able to view chat from all breakout rooms
- **FR-064**: Chat interface MUST be collapsible or dockable to avoid blocking video content
- **FR-065**: System MUST provide notification indicators when new chat messages arrive while chat panel is closed

### Key Entities

- **Media Control State**: Represents the current on/off state of instructor's microphone and camera, including keyboard shortcut bindings and visual indicator configurations

- **Participant Audio State**: Represents each participant's mute/unmute status, used to calculate aggregate mute state and determine the appropriate bulk control action

- **Breakout Room**: A sub-session configuration containing participant assignments, creation timestamp, status (active/inactive), and room identifier

- **Help Alert**: A notification triggered when a student needs assistance, containing student identifier, timestamp, issue summary, acknowledgment status, and priority level

- **Quiz Status**: Real-time state of quiz activity including current phase (pending/active/completed), start/end timestamps, and telemetry data for instructor visibility

- **Transcript Entry**: A time-stamped line of transcribed speech including speaker attribution, content, and session identifier; stored in-memory only during the active session and available for export/download before session ends

- **Layout Configuration**: Instructor's current video arrangement preferences including tile sizes, positions, preset selection, and responsive breakpoint adaptations

- **Chat Message**: A text communication sent by a participant containing sender identifier, timestamp, message content, and scope (main room or specific breakout room); stored in-memory for session duration only

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain - **3 clarifications identified, suitable for planning refinement**
- [X] Requirements are testable and unambiguous for core features
- [X] Success criteria are measurable
- [X] Scope is clearly bounded (9 distinct feature areas, including newly identified chat functionality)
- [X] Dependencies and assumptions identified

**Status**: Core requirements defined. Six critical ambiguities resolved (transcript persistence, export formats, breakout capacity, video layout presets, keyboard shortcut behavior, chat functionality). Remaining clarifications are refinement details that can be resolved during planning phase.

---

## Execution Status
*Updated by main() during processing*

- [X] User description parsed (8 initial feature areas identified)
- [X] Key concepts extracted
- [X] Critical ambiguities resolved (6 answered including discovery of missing chat UI)
- [X] User scenarios defined (9 acceptance scenarios)
- [X] Requirements generated (65 functional requirements across 9 feature areas)
- [X] Entities identified (8 key entities)
- [X] Review checklist passed - **Ready for planning phase**

---

## Clarification Summary

### ✅ Resolved (Session 2025-10-08)
1. **Transcript Persistence** (FR-043): In-memory only — transcripts lost when session ends, downloadable during session
2. **Transcript Export Format** (FR-042): Multiple formats — instructor can choose between CSV and JSON at export time
3. **Breakout Room Capacity** (FR-021): Support 1-10 simultaneous breakout rooms
4. **Video Layout Presets** (FR-051): Grid and Spotlight layouts; automatic adaptation when screen sharing is active
5. **Keyboard Shortcut Behavior** (FR-006): Disabled when text inputs have focus; active only when main window focused
6. **Chat Functionality** (NEW): Discovered that chat is enabled in Daily config but no UI exists; added 9 functional requirements for chat interface (FR-057 through FR-065)

### 📋 Deferred to Planning Phase
These refinement details can be resolved during implementation planning without blocking architectural decisions:

1. **Latency Target** (FR-007): Is 500ms acceptable for media state changes, or should we target lower latency?
2. **Quiz Telemetry Details** (FR-037): Specific metrics to track (completion rates, scores, timing)
3. **Video Tile Dimensions** (FR-052): Minimum and maximum dimensions for video tiles (pixels or percentage)

---
