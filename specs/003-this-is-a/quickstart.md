# Quickstart: Intelligent Education Video Platform

**Phase 1 Output** | **Date**: October 7, 2025  
**Purpose**: End-to-end validation of all intelligent education features

## Overview

This document provides step-by-step instructions to validate that the complete intelligent education platform is working correctly. Follow these steps in order after implementation is complete.

**Expected Duration**: 20-30 minutes  
**Prerequisites**: All Phase 4 tasks completed, local development environment running

---

## Phase 0: Environment Setup

### Step 1: Configure Environment Variables

Create `.env.local` file with the following configuration:

```bash
# Daily.co Configuration
DAILY_API_KEY="745efdbd1cc747b1cdda93ed6f87f3f4fe871ff04221a525ca47ebdb29c5478c"

# Daily.co Room URLs (pre-configured)
NEXT_PUBLIC_DAILY_ROOM_1="https://overclockaccelerator.daily.co/01-clippy"
NEXT_PUBLIC_DAILY_ROOM_2="https://overclockaccelerator.daily.co/02-jarvis"
NEXT_PUBLIC_DAILY_ROOM_3="https://overclockaccelerator.daily.co/03-r2d2"
NEXT_PUBLIC_DAILY_ROOM_4="https://overclockaccelerator.daily.co/04-cortana"
NEXT_PUBLIC_DAILY_ROOM_5="https://overclockaccelerator.daily.co/05-optimus"
NEXT_PUBLIC_DAILY_ROOM_6="https://overclockaccelerator.daily.co/06-robocop"

# Application Configuration
NEXT_PUBLIC_APP_NAME="Overcast"
NEXT_PUBLIC_MAX_PARTICIPANTS_PER_ROOM=50

# Development Settings
NODE_ENV=development

# AI Services (add your keys)
OPENAI_API_KEY="your-openai-api-key-here"
# Optional: Deepgram for production transcription
# DEEPGRAM_API_KEY="your-deepgram-api-key-here"
```

**Validation**:
- [ ] `.env.local` file created in project root
- [ ] All environment variables populated
- [ ] OpenAI API key is valid (test at platform.openai.com)

### Step 2: Install Dependencies

```bash
npm install
```

**Validation**:
- [ ] No installation errors
- [ ] `node_modules` directory created
- [ ] `package-lock.json` updated

### Step 3: Run Tests

```bash
# Run all tests to ensure nothing is broken
npm test
```

**Expected Output**:
- All existing tests pass
- New contract tests fail (expected - no implementation yet)
- New integration tests fail (expected - no implementation yet)

**Validation**:
- [ ] Existing unit tests pass (components, utils)
- [ ] Existing integration tests pass (instructor/student journeys)
- [ ] New tests exist but fail gracefully

### Step 4: Start Development Server

```bash
npm run dev
```

**Expected Output**:
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

**Validation**:
- [ ] Server starts without errors
- [ ] Can access http://localhost:3000
- [ ] See lobby with 6 classrooms
- [ ] No console errors in browser

---

## Phase 1: Basic Platform Validation

### Step 5: Test Existing Classroom Features

**Purpose**: Ensure new features didn't break existing functionality

1. **Join Classroom as Student**:
   - Open http://localhost:3000
   - Click on "01-Clippy" classroom
   - Enter name "Test Student"
   - Select "Student" role
   - Click "Join Classroom"

**Validation**:
- [ ] Video feed appears
- [ ] Can see self in video
- [ ] No console errors

2. **Test Instructor Features**:
   - Open new browser window/tab
   - Navigate to lobby
   - Toggle to "Instructors" mode
   - Join same classroom as "Test Instructor"

**Validation**:
- [ ] Both participants visible in video
- [ ] Instructor sees mute controls
- [ ] Can mute/unmute student
- [ ] Mute-all button works

3. **Test Breakout Rooms**:
   - As instructor, create breakout room
   - Assign student to breakout room

**Validation**:
- [ ] Breakout room created successfully
- [ ] Student moved to breakout room
- [ ] Can monitor breakout room

**If any of these fail**: Stop and fix existing features before testing new intelligence features.

---

## Phase 2: Transcript Capture Validation

### Step 6: Enable Transcription

**Purpose**: Verify transcripts are being captured in real-time

1. **Start Session**:
   - Instructor and student in same classroom
   - Open browser console (F12)
   - Check for transcription initialization logs

2. **Speak into Microphone**:
   - **Instructor says**: "Today we'll learn about calculus derivatives"
   - Wait 2-3 seconds
   - **Student says**: "Okay, I'm ready to learn"

3. **Check Transcripts via API**:
   ```bash
   # In a new terminal (server must be running)
   curl "http://localhost:3000/api/transcripts/classroom-01"
   ```

**Expected Response**:
```json
{
  "entries": [
    {
      "id": "session-...",
      "sessionId": "classroom-01",
      "speakerId": "participant-...",
      "speakerRole": "instructor",
      "speakerName": "Test Instructor",
      "text": "Today we'll learn about calculus derivatives",
      "timestamp": "2025-10-07T...",
      "confidence": 0.95,
      "breakoutRoomName": null
    },
    {
      "id": "session-...",
      "sessionId": "classroom-01",
      "speakerId": "participant-...",
      "speakerRole": "student",
      "speakerName": "Test Student",
      "text": "Okay, I'm ready to learn",
      "timestamp": "2025-10-07T...",
      "confidence": 0.92,
      "breakoutRoomName": null
    }
  ],
  "count": 2,
  "hasMore": false
}
```

**Validation**:
- [ ] Transcripts captured for both speakers
- [ ] Speaker roles correct (instructor vs student)
- [ ] Timestamps in chronological order
- [ ] Confidence scores reasonable (>0.7)
- [ ] Text matches what was said (approximately)

**Troubleshooting**:
- If empty response: Check microphone permissions in browser
- If low confidence: Check microphone quality, speak clearly
- If wrong role: Check participant join logic assigns role correctly

### Step 7: Test Transcript Filtering

```bash
# Get only instructor transcripts
curl "http://localhost:3000/api/transcripts/classroom-01?role=instructor"

# Get only student transcripts
curl "http://localhost:3000/api/transcripts/classroom-01?role=student"

# Get recent transcripts (since 1 minute ago)
curl "http://localhost:3000/api/transcripts/classroom-01?since=2025-10-07T14:30:00Z"
```

**Validation**:
- [ ] Role filtering works correctly
- [ ] Time filtering works correctly
- [ ] High-confidence filter works (`minConfidence` parameter)

---

## Phase 3: Help Detection & Alerts Validation

### Step 8: Trigger Help Alert

**Purpose**: Verify system detects student confusion and alerts instructor

1. **Create Breakout Room**:
   - As instructor, create "Test Group" breakout room
   - Assign student to breakout room
   - Student joins breakout room

2. **Student Expresses Confusion**:
   - **Student says**: "I don't understand derivatives"
   - Wait 5 seconds for analysis

3. **Check for Alert via API**:
   ```bash
   curl "http://localhost:3000/api/alerts/classroom-01?status=pending"
   ```

**Expected Response**:
```json
{
  "alerts": [
    {
      "id": "alert-...",
      "classroomSessionId": "classroom-01",
      "breakoutRoomSessionId": "breakout-room-...",
      "breakoutRoomName": "Test Group",
      "detectedAt": "2025-10-07T...",
      "topic": "derivatives",
      "urgency": "medium",
      "triggerKeywords": ["don't understand"],
      "contextSnippet": "Student: I don't understand derivatives",
      "status": "pending",
      "acknowledgedBy": null,
      "acknowledgedAt": null,
      "sourceTranscriptIds": ["..."]
    }
  ],
  "counts": {
    "pending": 1,
    "acknowledged": 0,
    "resolved": 0,
    "dismissed": 0
  }
}
```

**Validation**:
- [ ] Alert created within 5 seconds of student speaking
- [ ] Topic extracted correctly ("derivatives")
- [ ] Urgency calculated appropriately (medium)
- [ ] Breakout room name included
- [ ] Trigger keywords identified

### Step 9: Test Different Help Patterns

**Purpose**: Verify various confusion indicators trigger alerts

Speak the following phrases and check for alerts:

| Student Says | Expected Urgency | Expected Topic |
|--------------|------------------|----------------|
| "I'm stuck on this problem" | High | (last mentioned concept) |
| "Can you explain that again?" | Low | (last instructor topic) |
| "This is too hard" | High | (current topic) |
| "I'm confused about integrals" | Medium | "integrals" |

**Validation**:
- [ ] All phrases trigger alerts
- [ ] Urgency levels match expectations
- [ ] Topics extracted correctly
- [ ] No false positives (saying "I understand" doesn't trigger)

### Step 10: Test Alert Management

**Purpose**: Verify instructor can manage alerts

1. **Acknowledge Alert**:
   ```bash
   curl -X POST http://localhost:3000/api/alerts \
     -H "Content-Type: application/json" \
     -d '{
       "alertId": "alert-...",
       "status": "acknowledged",
       "instructorId": "instructor-test-instructor"
     }'
   ```

**Expected Response**:
```json
{
  "alert": {
    "id": "alert-...",
    "status": "acknowledged",
    "acknowledgedBy": "instructor-test-instructor",
    "acknowledgedAt": "2025-10-07T..."
  },
  "message": "Alert acknowledged successfully"
}
```

2. **Resolve Alert**:
   ```bash
   curl -X POST http://localhost:3000/api/alerts \
     -H "Content-Type: application/json" \
     -d '{
       "alertId": "alert-...",
       "status": "resolved",
       "instructorId": "instructor-test-instructor"
     }'
   ```

**Validation**:
- [ ] Can acknowledge alerts
- [ ] Can resolve alerts
- [ ] Can dismiss alerts
- [ ] Status transitions work correctly
- [ ] Timestamps updated appropriately

### Step 11: Test Alert UI (If Implemented)

**Purpose**: Verify instructor sees alerts in UI

1. **Check Instructor Dashboard**:
   - As instructor, look for AlertPanel component
   - Should see pending alerts

**Validation**:
- [ ] Alerts appear in UI automatically (via polling or SSE)
- [ ] Alerts sorted by urgency (high first)
- [ ] Can click to acknowledge/resolve
- [ ] UI updates when status changes
- [ ] Sound/visual indicator for new alerts (if implemented)

---

## Phase 4: Quiz Generation Validation

### Step 12: Generate Quiz from Instructor Speech

**Purpose**: Verify LLM generates quality quiz questions

1. **Instructor Teaches Content**:
   - **Instructor says**: "The derivative of x squared is 2x. This comes from the power rule, where we bring down the exponent and reduce the power by one. The derivative of a constant is always zero because constants don't change."
   - Wait for transcripts to be captured

2. **Request Quiz Generation**:
   ```bash
   curl -X POST http://localhost:3000/api/quiz/generate \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "classroom-01",
       "instructorId": "instructor-test-instructor",
       "questionCount": 5,
       "difficulty": "mixed"
     }'
   ```

**Expected Response** (within 30 seconds):
```json
{
  "quiz": {
    "id": "quiz-classroom-01-...",
    "sessionId": "classroom-01",
    "createdBy": "instructor-test-instructor",
    "createdByName": "Test Instructor",
    "createdAt": "2025-10-07T...",
    "lastModified": "2025-10-07T...",
    "sourceTranscriptIds": ["..."],
    "questions": [
      {
        "id": "quiz-...-q0",
        "type": "multiple_choice",
        "question": "What is the derivative of x^2?",
        "options": ["x", "2x", "x^2", "2"],
        "correctAnswer": "B",
        "explanation": "Using the power rule: bring down the exponent (2) and reduce the power by 1, giving 2x",
        "difficulty": "easy",
        "sourceTranscriptIds": ["..."]
      },
      {
        "id": "quiz-...-q1",
        "type": "true_false",
        "question": "The derivative of a constant is always zero.",
        "options": null,
        "correctAnswer": true,
        "explanation": "Constants have no rate of change, so their derivative is 0",
        "difficulty": "easy",
        "sourceTranscriptIds": ["..."]
      }
      // ... 3 more questions
    ],
    "status": "draft",
    "title": "Derivatives Basics"
  },
  "generationTime": 12.4
}
```

**Validation**:
- [ ] Quiz generated within 30 seconds
- [ ] Correct number of questions (5)
- [ ] Mix of multiple choice and true/false
- [ ] Questions based on instructor content only (not student questions)
- [ ] Difficulty distribution appropriate
- [ ] Explanations clear and educational
- [ ] All questions answerable from instructor's teaching

### Step 13: Test Quiz Quality

**Purpose**: Verify questions are high-quality and relevant

Review generated quiz questions for:

**Content Accuracy**:
- [ ] Questions test understanding (not memorization)
- [ ] Correct answers are actually correct
- [ ] Distractors (wrong options) are plausible but clearly wrong
- [ ] No ambiguous wording

**Educational Value**:
- [ ] Explanations teach the concept
- [ ] Questions cover different difficulty levels
- [ ] Questions span different topics from the lecture
- [ ] No duplicate or near-duplicate questions

**Technical Correctness**:
- [ ] Multiple choice has exactly 4 options
- [ ] True/false has boolean answer
- [ ] All required fields present
- [ ] Source transcript IDs valid

### Step 14: Test Quiz Editing

**Purpose**: Verify instructor can edit quiz before publishing

1. **Retrieve Quiz**:
   ```bash
   curl "http://localhost:3000/api/quiz/quiz-classroom-01-..."
   ```

2. **Edit Question**:
   ```bash
   curl -X PATCH "http://localhost:3000/api/quiz/quiz-classroom-01-..." \
     -H "Content-Type: application/json" \
     -d '{
       "questions": [
         {
           "id": "quiz-...-q0",
           "type": "multiple_choice",
           "question": "What is the derivative of x^2? (Edited)",
           "options": ["x", "2x", "x^2", "2"],
           "correctAnswer": "B",
           "explanation": "Updated explanation",
           "difficulty": "easy",
           "sourceTranscriptIds": ["..."]
         }
       ]
     }'
   ```

3. **Publish Quiz**:
   ```bash
   curl -X PATCH "http://localhost:3000/api/quiz/quiz-classroom-01-..." \
     -H "Content-Type: application/json" \
     -d '{
       "status": "published"
     }'
   ```

**Validation**:
- [ ] Can retrieve quiz by ID
- [ ] Can edit question text
- [ ] Can edit options and answers
- [ ] Can change difficulty
- [ ] Can update title
- [ ] Can change status to published
- [ ] lastModified timestamp updates

### Step 15: Test Quiz Edge Cases

**Purpose**: Verify error handling

1. **Generate with No Instructor Speech**:
   - Try generating quiz when only students have spoken
   - Should return 404 or error message

2. **Invalid Question Count**:
   - Try requesting 0 questions or 100 questions
   - Should return 400 error

3. **Unauthorized Access**:
   - Try editing quiz as different instructor
   - Should return 401 error

**Validation**:
- [ ] Appropriate errors for edge cases
- [ ] Error messages are clear and helpful
- [ ] No server crashes

---

## Phase 5: Integration Testing

### Step 16: Complete Instructor Workflow

**Purpose**: Validate entire feature working together

**Scenario**: Instructor teaches a class, students struggle, instructor generates quiz

1. **Setup**:
   - Instructor joins classroom
   - 2-3 students join classroom
   - Instructor creates breakout rooms

2. **Teaching**:
   - Instructor explains calculus concepts (3-5 minutes)
   - Transcripts captured automatically

3. **Breakout Work**:
   - Students assigned to breakout rooms
   - Students discuss (include confusion phrases)
   - Help alerts generated

4. **Instructor Response**:
   - Instructor sees alerts in dashboard
   - Acknowledges alerts
   - Joins breakout room to help (optional)
   - Resolves alerts

5. **Quiz Creation**:
   - Instructor generates quiz from session
   - Reviews and edits questions
   - Publishes quiz

**Validation**:
- [ ] Complete workflow executes without errors
- [ ] All features work together seamlessly
- [ ] Performance acceptable (<5s for alerts, <30s for quiz)
- [ ] No memory leaks (check browser/server memory)

### Step 17: Performance Testing

**Purpose**: Verify system meets performance targets

**Test Transcript Processing**:
- [ ] Speech to transcript: <2 seconds
- [ ] Transcript to analysis: <1 second
- [ ] Analysis to alert: <1 second
- [ ] Total latency: <5 seconds

**Test Quiz Generation**:
- [ ] 5 questions: <30 seconds
- [ ] 10 questions: <45 seconds
- [ ] Acceptable quality (manual review)

**Test Scalability**:
- [ ] 10 transcripts per minute: No lag
- [ ] 5 concurrent alerts: All displayed
- [ ] 50 participants in classroom: Transcripts still captured

### Step 18: Memory Management

**Purpose**: Verify no memory leaks

1. **Long-Running Session**:
   - Run classroom for 30 minutes
   - Generate lots of transcripts (speak continuously)
   - Check server memory usage

2. **Session Cleanup**:
   - Leave classroom (all participants)
   - Check that transcripts cleared from memory
   - Check that alerts cleared

**Validation**:
- [ ] Memory usage stays reasonable (<50MB per classroom)
- [ ] Data cleared when session ends
- [ ] No zombie sessions (orphaned data)

---

## Phase 6: Final Checklist

### Step 19: Code Quality

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] TypeScript compiles: `npm run type-check`
- [ ] Code formatted: `npm run format` (if configured)

### Step 20: Documentation

- [ ] README updated with new features
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Comments explain WHY decisions were made
- [ ] Complex logic has educational explanations

### Step 21: Constitution Compliance

Review against Overcast Constitution:

- [ ] **Simplicity First**: Used simplest approaches (in-memory, keyword matching)
- [ ] **Single File Preference**: Related code grouped, minimal file count
- [ ] **Comment-Driven**: WHY comments added to non-trivial logic
- [ ] **Newcomer-Friendly**: Clear naming, patterns explained
- [ ] **Test-Driven**: Tests demonstrate complete workflows

### Step 22: Feature Completeness

All requirements from spec implemented:

**Transcript Monitoring**:
- [ ] FR-005: Capture audio from breakout rooms ✅
- [ ] FR-006: Analyze for help patterns ✅
- [ ] FR-007: Distinguish instructor vs student ✅
- [ ] FR-008: Notify participants of recording ✅

**Help Alerts**:
- [ ] FR-012: Real-time alerts to instructors ✅
- [ ] FR-013: Include room, topic, urgency ✅
- [ ] FR-015: Summary view of breakout rooms ✅
- [ ] FR-016: In-app notifications ✅

**Quiz Generation**:
- [ ] FR-017: Generate from instructor transcripts only ✅
- [ ] FR-018: Triggered by instructor action ✅
- [ ] FR-019: Editable before distribution ✅
- [ ] FR-020: Multiple choice + true/false ✅
- [ ] FR-022: Save and reuse quizzes ✅

**Data Management**:
- [ ] FR-027: In-memory storage (90-day future plan) ✅
- [ ] FR-029: FERPA compliance (notification) ✅
- [ ] FR-030: Data deletion capability ✅

---

## Success Criteria

✅ **Feature is complete and ready for use if**:

1. All validation checkboxes above are checked
2. All tests pass
3. Performance targets met
4. No critical bugs
5. Constitution principles followed
6. Code reviewed and approved

---

## Troubleshooting

### Transcripts Not Capturing

**Possible Causes**:
- Microphone permissions not granted
- Web Speech API not initialized
- Daily.co audio not working

**Solutions**:
- Check browser console for permission errors
- Verify `navigator.mediaDevices.getUserMedia()` succeeds
- Test with different browser (Chrome recommended)

### Alerts Not Triggering

**Possible Causes**:
- Keywords not matched
- Confidence score too low
- Analysis not running

**Solutions**:
- Check keyword list in `help-detection-service.ts`
- Lower `minConfidence` threshold
- Verify `/api/transcripts/analyze` endpoint called

### Quiz Generation Fails

**Possible Causes**:
- OpenAI API key invalid
- Rate limit exceeded
- No instructor transcripts

**Solutions**:
- Verify API key at platform.openai.com
- Wait 1 minute and retry
- Check transcript role filtering

### Performance Issues

**Possible Causes**:
- Too many transcripts
- Slow LLM API
- Memory leak

**Solutions**:
- Increase confidence threshold to reduce volume
- Switch to GPT-3.5 Turbo for faster generation
- Monitor memory with Node.js profiler

---

## Next Steps

After successful validation:

1. **User Testing**: Have real instructors test the system
2. **Feedback Collection**: Gather input on alert accuracy, quiz quality
3. **Iteration**: Refine keyword lists, improve topic extraction
4. **Production Deploy**: Deploy to Vercel with production env vars
5. **Monitor**: Track usage, errors, performance in production

**Database Migration** (future):
- When ready, add PostgreSQL
- Implement persistent stores
- Enable historical analysis
- Add cross-session analytics

---

*Quickstart validation complete. System ready for production use!* ✅


