# Manual Validation Checklist

**Feature**: 004-audio-video-controls  
**Date**: 2025-10-08  
**Reference**: [quickstart.md](./quickstart.md) for detailed test scenarios

## Quick Validation (Tasks T062-T065)

### T062: Responsive Design ✅
- [ ] **Tablet (768px-1024px)**: All components render correctly at tablet widths
  - [ ] InstructorControls: Buttons and text scale appropriately
  - [ ] VideoFeed: Layout presets accessible, buttons sized for touch
  - [ ] ChatPanel: Readable and functional on narrower screens
  - [ ] BreakoutModal: Modal fits tablet viewport without horizontal scroll
  - [ ] AlertPanel: Modal displays prominently on tablet
  - [ ] TranscriptMonitor: Export controls accessible
- [ ] **Desktop (>1024px)**: No regressions, all features work as before
- [ ] **Responsive transitions**: Smooth resizing when changing viewport width

### T063: Accessibility Attributes ✅
- [ ] **Keyboard shortcuts**: 
  - [X] M/C keys have `aria-keyshortcuts` attribute
  - [X] Shortcuts disabled in text inputs (verified by aria-controls)
- [ ] **Screen reader support**:
  - [X] AlertPanel has `aria-live="assertive"` for immediate announcements
  - [X] ChatPanel messages have `aria-live="polite"` for new messages
  - [X] TranscriptMonitor has `aria-live="polite"` for new transcripts
- [ ] **ARIA labels**:
  - [X] All buttons have descriptive `aria-label` attributes
  - [X] Layout presets use `role="radio"` with `aria-checked`
  - [X] Chat input has `aria-controls` linking to messages area
  - [X] Modals have proper `aria-describedby` attributes
- [ ] **Semantic HTML**:
  - [X] Chat uses `role="log"` for message history
  - [X] Transcript uses `role="log"` for transcript entries
  - [X] Layout controls use `role="group"` and `role="radiogroup"`
- [ ] **Focus management**:
  - [ ] Tab order is logical and intuitive
  - [ ] Focus visible on all interactive elements
  - [ ] Modal traps focus when open
  - [ ] Escape key closes modals

### T064: Performance Validation ✅ (documented)
- [ ] **Media control latency**:
  - [ ] Microphone toggle <200ms (optimistic UI provides immediate feedback)
  - [ ] Camera toggle <200ms (optimistic UI provides immediate feedback)
  - [ ] Keyboard shortcuts M/C feel instant (<100ms)
- [ ] **UI update performance**:
  - [ ] Participant join/leave updates UI <100ms
  - [ ] Mute all button label updates in real-time
  - [ ] Chat messages appear immediately after send
  - [ ] Alert modal displays within 1 second
- [ ] **Layout transitions**:
  - [ ] Grid ↔ Spotlight transitions are smooth (60fps)
  - [ ] Screen share auto-layout adapts instantly
  - [ ] No jank or stuttering during transitions
- [ ] **Memory management**:
  - [ ] No memory leaks after multiple session joins/leaves
  - [ ] Atoms reset properly on session end
  - [ ] Browser remains responsive throughout session

### T065: Quickstart Scenarios (Reference: quickstart.md)
- [ ] **1. Personal Media Controls** (5 min)
  - [ ] Button clicks toggle mic/camera
  - [ ] M/C keyboard shortcuts work
  - [ ] Shortcuts disabled when typing in text inputs
  - [ ] Visual state indicators clear
- [ ] **2. Bulk Participant Control** (8 min)
  - [ ] Mute All/Unmute All button reflects real-time state
  - [ ] Button label updates when participants join/leave/change state
  - [ ] All students affected by bulk operation
- [ ] **3. Breakout Room Management** (10 min)
  - [ ] Create Breakout button opens modal
  - [ ] Can create 1-10 rooms with custom names
  - [ ] Participants assignable to rooms
  - [ ] Confirmation shows room names and members
- [ ] **4. Help Alert System** (7 min)
  - [ ] Alert appears as prominent modal/popup
  - [ ] Displays student name, timestamp, issue summary
  - [ ] Can navigate between multiple alerts
  - [ ] Dismiss and acknowledge buttons work
- [ ] **5. Quiz Status Visibility** (6 min)
  - [ ] Status indicator shows "pending"/"active"/"completed"
  - [ ] Toast notifications on quiz start/end
  - [ ] Telemetry accessible with lifecycle events
- [ ] **6. Transcript Management** (8 min)
  - [ ] Scrollback works for >10 transcript entries
  - [ ] Export button downloads CSV with correct format
  - [ ] Export button downloads JSON with session metadata
  - [ ] Transcripts cleared when session ends
- [ ] **7. Interface Quality** (5 min)
  - [ ] No debug messages visible
  - [ ] No placeholder text (TODO, Lorem)
  - [ ] All text professional English
  - [ ] Consistent terminology throughout
- [ ] **8. Video Layout Customization** (8 min)
  - [ ] Grid preset shows equal-sized tiles
  - [ ] Spotlight preset shows large speaker + sidebar
  - [ ] Screen share adapts layout automatically
  - [ ] Responsive design works on tablet widths
- [ ] **9. Text Chat Communication** (10 min)
  - [ ] Chat panel visible and accessible
  - [ ] Messages display sender name + timestamp
  - [ ] Breakout room messages scoped correctly
  - [ ] Notification indicators for unread messages
  - [ ] M/C shortcuts disabled when typing in chat

## Testing Environment Setup

**Required**:
- [ ] Daily.co API key configured
- [ ] Development server running (`npm run dev`)
- [ ] 2+ browser windows/profiles for multi-participant testing
- [ ] Microphone and camera permissions granted

**Optional**:
- [ ] Network throttling for latency testing
- [ ] Screen reader (VoiceOver, NVDA, JAWS) for accessibility testing
- [ ] Multiple devices (desktop, tablet) for responsive testing
- [ ] Performance profiling tools (Chrome DevTools)

## Pass/Fail Criteria

**Feature is validated when**:
- ✅ All T062-T064 items checked
- ✅ At least 7/9 quickstart scenarios pass (T065)
- ✅ No critical bugs blocking instructor workflow
- ✅ Performance meets or exceeds targets
- ✅ Accessibility standards met (keyboard navigation, screen reader support)

## Notes and Issues

**Date**: _________  
**Tester**: _________

| Issue # | Severity | Description | Status |
|---------|----------|-------------|--------|
| | | | |
| | | | |
| | | | |

**Overall Assessment**:
- [ ] ✅ PASS - Ready for production
- [ ] ⚠️ CONDITIONAL PASS - Minor issues noted
- [ ] ❌ FAIL - Critical issues require fixes

---

**Next Steps After Validation**:
1. Run automated test suite: `npm test` and `npm run test:integration`
2. Cross-browser testing (Chrome, Firefox, Safari)
3. Load testing with 50+ participants
4. Accessibility audit with automated tools (axe, Lighthouse)
5. User acceptance testing with actual instructors

