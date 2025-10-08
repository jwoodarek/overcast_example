# Quickstart: Instructor Interface Improvements

**Feature**: 004-audio-video-controls  
**Purpose**: Validate that all instructor interface improvements work end-to-end  
**Time Estimate**: 30-45 minutes for full manual validation

## Prerequisites

- [ ] Daily.co API key configured in `.env.local`
- [ ] Development server running (`npm run dev`)
- [ ] At least 2 browser windows/profiles for multi-participant testing
- [ ] Microphone and camera permissions granted in browser

---

## Quick Validation Scenarios

These scenarios validate the 9 major feature areas. Execute in order for logical flow.

### 1. Personal Media Controls (5 min)

**Goal**: Verify instructor can control their own mic/camera with buttons and keyboard shortcuts

**Steps**:
1. Join classroom as instructor
2. Click microphone button → verify audio mutes, button shows muted state (visual change)
3. Press 'M' key → verify audio unmutes, button shows unmuted state
4. Click camera button → verify video stops, button shows camera-off state
5. Press 'C' key → verify video resumes, button shows camera-on state
6. Open chat input (or any text field) and type 'M' and 'C' → verify letters appear in text, media controls do NOT trigger

**Expected Results**:
- ✓ Button clicks toggle media within <200ms (feels instant)
- ✓ Keyboard shortcuts work when focus is on video area
- ✓ Keyboard shortcuts DO NOT work when typing in text inputs
- ✓ Visual indicators clearly show current state (color, icon, or text change)

**Failure Modes**:
- ❌ Latency >500ms (feels sluggish)
- ❌ Shortcuts trigger while typing in chat
- ❌ Unclear which state button is in (muted vs unmuted)

---

### 2. Bulk Participant Control (8 min)

**Goal**: Verify mute all/unmute all toggle works with real-time state updates

**Setup**: Need 3-4 participants (instructor + 2-3 students)

**Steps**:
1. As instructor, observe participant control button → should say "Mute All" (students unmuted by default)
2. Click "Mute All" → verify all students muted, button changes to "Unmute All"
3. Have one student unmute themselves → verify button changes back to "Mute All" (real-time update)
4. Have one student leave session → verify button label still correct for remaining participants
5. Have one student join session → verify button label updates to reflect new participant
6. Click "Unmute All" → verify all students unmuted, button changes to "Mute All"

**Expected Results**:
- ✓ Button label reflects aggregate participant state (if ANY unmuted → "Mute All")
- ✓ Real-time updates when participants join/leave/<200ms
- ✓ Mute/unmute applies to all connected participants without page refresh
- ✓ Visual feedback confirms action (toast, participant count, or icon update)

**Failure Modes**:
- ❌ Button label stuck or incorrect
- ❌ Requires page refresh to see updated state
- ❌ Some participants not affected by mute all/unmute all

---

### 3. Breakout Room Management (10 min)

**Goal**: Verify instructor can create breakout rooms and assign participants

**Setup**: Need 5-6 participants for meaningful grouping

**Steps**:
1. Click "Create Breakout" button → modal should appear (not broken/unresponsive)
2. In modal, create 2 breakout rooms: "Group A" and "Group B"
3. Assign 2-3 participants to each group using UI (drag-drop or click-to-assign)
4. Submit room creation → verify confirmation message appears with list of active groups
5. Verify breakout room list shows:
   - Room names ("Group A", "Group B")
   - Participant names in each room
   - Option to close or modify rooms
6. Close one breakout room → verify participants returned to main room
7. Create a single breakout room → verify system supports 1-10 rooms (test boundary)

**Expected Results**:
- ✓ "Create Breakout" button works (not broken)
- ✓ Modal UI appears for participant assignment
- ✓ Can create 1-10 breakout rooms
- ✓ Confirmation message shows room names + member list
- ✓ Instructor can view all active breakout groups and their members

**Failure Modes**:
- ❌ Button does nothing or throws error
- ❌ Cannot assign participants to rooms
- ❌ No confirmation or visibility of created rooms
- ❌ Rooms fail to create via Daily.co API

---

### 4. Help Alert System (7 min)

**Goal**: Verify help alerts appear prominently (modal/popup, not hidden)

**Setup**: Trigger help alert from student (simulated or via help detection service)

**Steps**:
1. Trigger help alert from student "Alice" in main room
2. Verify modal or floating popup appears IMMEDIATELY (not hidden at bottom of screen)
3. Check alert contains:
   - Student name ("Alice")
   - Timestamp (human-readable)
   - Issue summary (e.g., "Struggling with problem set 3")
4. Trigger second help alert from student "Bob" in breakout room
5. Verify instructor can navigate between alerts without losing information
6. Dismiss alert → verify it clears from view but info retained (if needed)

**Expected Results**:
- ✓ Alert appears as modal dialog or floating popup (prominent, not hidden)
- ✓ Immediate appearance (real-time, <1 second from trigger)
- ✓ Displays student name, timestamp, issue summary
- ✓ Positioned prominently (center or top-right, not bottom hidden area)
- ✓ Can navigate multiple alerts and dismiss them

**Failure Modes**:
- ❌ Alert hidden in bottom corner (current location)
- ❌ Missing student name or timestamp
- ❌ Delayed appearance or not appearing at all

---

### 5. Quiz Status Visibility (6 min)

**Goal**: Verify instructor can see quiz status and receive notifications

**Setup**: Generate or activate a quiz (via existing quiz generation feature)

**Steps**:
1. Generate quiz from transcript → verify status indicator near toolbar shows "Quiz pending"
2. Start quiz (make it active) → verify:
   - Status indicator changes to "Quiz active"
   - Toast notification or modal appears: "Quiz started"
3. End quiz → verify:
   - Status indicator changes to "Quiz completed" or disappears
   - Toast notification: "Quiz ended"
4. Access quiz telemetry/logs → verify shows:
   - When quiz was created, started, ended (timestamps)
   - How many students quiz was delivered to
   - How many students viewed quiz
   - Basic participation metrics

**Expected Results**:
- ✓ Quiz status indicator visible near instructor toolbar
- ✓ Shows "Quiz pending", "Quiz active", or "Quiz completed"
- ✓ Toast/modal notifications on quiz start and end
- ✓ Telemetry accessible showing lifecycle events and basic participation

**Failure Modes**:
- ❌ No visible indicator (can't tell if quiz is running)
- ❌ No notifications (instructor unaware of quiz state changes)
- ❌ No telemetry (can't confirm quiz actually ran)

---

### 6. Transcript Management (8 min)

**Goal**: Verify transcript scrollback and export functionality

**Setup**: Generate >10 lines of transcript (have participants speak or generate test data)

**Steps**:
1. Observe transcript feed with >10 lines → verify older entries NOT lost (still accessible)
2. Scroll up in transcript history → verify can review previous entries (scrollback works)
3. Scroll to bottom → verify can return to latest entries
4. Click "Download transcript" button → verify dropdown or prompt appears
5. Select CSV format → verify file downloads with name `transcript-[session-id]-[date].csv`
6. Open CSV → verify structure:
   - Column headers: Timestamp, Speaker, Text
   - Entries with correct data (ISO timestamps, speaker names with roles, transcript text)
7. Repeat download with JSON format → verify JSON structure:
   - Session metadata (session_id, session_start, exported_at)
   - Array of transcript entries with timestamp, speaker_id, speaker_name, role, text
8. Close session and reopen → verify transcripts are GONE (in-memory only, not persisted)

**Expected Results**:
- ✓ No data loss after 10 lines (all entries preserved in-memory)
- ✓ Scrollback capability to review history
- ✓ Export button accessible during session
- ✓ CSV export with 3 columns (Timestamp, Speaker, Text), ISO timestamps, role annotations
- ✓ JSON export with session metadata and structured entries
- ✓ Transcripts cleared when session ends (not persisted)

**Failure Modes**:
- ❌ Older entries disappear (data loss)
- ❌ Cannot scroll back to review history
- ❌ Export button missing or non-functional
- ❌ Export format incorrect or missing required fields

---

### 7. Interface Quality (5 min)

**Goal**: Verify all debug text, placeholders, and non-English content removed

**Steps**:
1. Scan entire instructor interface for:
   - Debug messages (e.g., "DEBUG: transcript service started")
   - Placeholder text (e.g., "Lorem ipsum", "TODO: implement this")
   - Technical logs visible to user
   - Non-English text
2. Check transcript area specifically → verify NO red "restarting transcript" box or similar debug indicators
3. Review all button labels, tooltips, and help text → verify clear, professional English

**Expected Results**:
- ✓ All text in English, professional, clear
- ✓ No debug messages, placeholders, or technical jargon
- ✓ No visual debug indicators (red boxes, colored borders for testing)
- ✓ Consistent terminology across all instructor tools

**Failure Modes**:
- ❌ Debug text visible near live transcript
- ❌ Red "restarting transcript" box present
- ❌ Placeholder text or "TODO" visible
- ❌ Inconsistent or confusing UI copy

---

### 8. Video Layout Customization (8 min)

**Goal**: Verify layout presets and drag-resize functionality

**Setup**: Need 4-6 participants for meaningful layout testing

**Steps**:
1. Select "Grid" preset → verify all video tiles equal-sized in grid arrangement
2. Select "Spotlight" preset → verify one large tile (active speaker) + smaller sidebar tiles
3. In Grid mode, drag corner of a video tile to resize → verify:
   - Tile resizes smoothly
   - Minimum size enforced (cannot shrink below 160x90px - faces remain recognizable)
   - Maximum size enforced (cannot exceed 25% of viewport)
   - Layout switches to "custom" preset automatically
4. Start screen share (any participant) → verify:
   - Layout adapts automatically to prioritize shared screen (75% of space)
   - Participant videos in sidebar or reduced view
5. Stop screen share → verify layout returns to previous preset or custom settings
6. Resize browser window (desktop → tablet width) → verify layout adapts responsively
7. Test on tablet device (if available) → verify layouts adapt, drag-resize disabled (touch targets)

**Expected Results**:
- ✓ Grid preset: equal-sized tiles in grid
- ✓ Spotlight preset: large active speaker + sidebar
- ✓ Drag-resize works (smooth, enforces min 160x90px / max 25% viewport)
- ✓ Screen share mode auto-adapts (75% for shared content, sidebar for participants)
- ✓ Responsive design adapts to desktop and tablet widths
- ✓ Layout preferences persist for session duration

**Failure Modes**:
- ❌ Presets don't work or look broken
- ❌ Cannot resize tiles or no size limits enforced
- ❌ Screen share doesn't trigger layout adaptation
- ❌ Layout broken on tablet or non-standard screen sizes

---

### 9. Text Chat Communication (10 min)

**Goal**: Verify chat interface with breakout room scoping

**Setup**: Need multiple participants in main room + breakout rooms

**Steps**:
1. Locate chat interface → verify panel is visible and accessible
2. Send message as instructor in main room: "Welcome everyone"
3. Verify message appears in all participants' chat with:
   - Sender name ("Instructor" or name)
   - Timestamp (human-readable)
4. Have student send message in main room → verify appears for all
5. Close chat panel → have another participant send message → verify:
   - Notification indicator appears (badge, icon, or count)
6. Reopen chat panel → verify notification cleared
7. Create breakout rooms and move students into them
8. Send message as student in breakout room → verify:
   - Message visible only to breakout room members + instructor
   - NOT visible to students in other breakout rooms or main room
9. As instructor, switch between chat rooms (main, breakout A, breakout B) → verify:
   - Can view chat from all rooms
   - Can send messages to any room
   - Unread counts shown for each room
10. Test keyboard shortcut interaction:
    - Focus chat input field
    - Type "M" and "C" → verify letters appear in text, media controls DO NOT trigger

**Expected Results**:
- ✓ Chat interface accessible to instructors and students
- ✓ Messages display sender name + timestamp
- ✓ Main room messages visible to all participants
- ✓ Breakout room messages visible only to room members + instructor
- ✓ Instructor can view and send to all chat rooms
- ✓ Notification indicators when new messages arrive (chat panel closed)
- ✓ Chat panel collapsible/dockable (doesn't block video)
- ✓ Keyboard shortcuts disabled when typing in chat input

**Failure Modes**:
- ❌ Chat interface missing or inaccessible
- ❌ Messages missing timestamp or sender info
- ❌ Breakout room chat leaking to other rooms
- ❌ No notification when messages arrive
- ❌ Keyboard shortcuts trigger while typing in chat

---

## Success Criteria Summary

**All 9 feature areas must pass for feature to be considered complete:**

| # | Feature Area | Status | Notes |
|---|-------------|--------|-------|
| 1 | Personal Media Controls | ☐ | Mic/camera toggle + keyboard shortcuts (M/C) |
| 2 | Bulk Participant Control | ☐ | Smart mute all/unmute all with real-time updates |
| 3 | Breakout Room Management | ☐ | Fix creation + assignment modal (1-10 rooms) |
| 4 | Help Alert System | ☐ | Prominent modal/popup (not hidden) |
| 5 | Quiz Status Visibility | ☐ | Indicators + notifications + telemetry |
| 6 | Transcript Management | ☐ | Scrollback + CSV/JSON export (in-memory) |
| 7 | Interface Quality | ☐ | No debug text, professional English throughout |
| 8 | Video Layout Customization | ☐ | Grid/Spotlight presets + drag-resize + responsive |
| 9 | Text Chat Communication | ☐ | Chat UI with breakout room scoping |

**When all checkboxes are ☑, feature is validated and ready for production.**

---

## Troubleshooting

### Common Issues

**Media controls not working**:
- Check Daily.co permissions granted in browser
- Verify mic/camera not blocked by OS settings
- Check browser console for Daily.co errors

**Breakout rooms failing to create**:
- Verify Daily.co API key has breakout room permissions
- Check API rate limits not exceeded
- Verify participant session IDs are valid (from Daily.co participant list)

**Keyboard shortcuts triggering in text inputs**:
- Verify event handler checks `event.target.tagName` for INPUT/TEXTAREA/SELECT
- Verify `isContentEditable` check included
- Test with different types of text inputs (chat, search, etc.)

**Transcript export empty or malformed**:
- Verify transcript entries exist in store before export
- Check timestamp formatting (should be ISO 8601)
- Verify CSV escaping for quotes/commas in transcript text

**Chat messages not scoped correctly**:
- Verify `roomId` included in message payload
- Check atomFamily properly keyed by roomId
- Verify instructor has access to all room IDs

---

## Next Steps

After completing quickstart validation:
1. ☐ Document any issues found in GitHub issues or spec
2. ☐ Run automated test suite (`npm test`, `npm run test:integration`)
3. ☐ Performance validation (multiple participants, stress testing)
4. ☐ Accessibility audit (keyboard navigation, screen readers)
5. ☐ Cross-browser testing (Chrome, Firefox, Safari)

**Feature is production-ready when:**
- ✓ All 9 quickstart scenarios pass
- ✓ Automated tests pass (unit, contract, integration)
- ✓ Performance benchmarks met (<200ms media control latency, <100ms UI updates)
- ✓ Accessibility standards met (WCAG 2.1 AA minimum)
- ✓ Cross-browser compatibility confirmed

