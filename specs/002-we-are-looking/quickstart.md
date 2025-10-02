# Quickstart Guide: Overcast Video Classroom Application

**Purpose**: Validate core user workflows and verify implementation meets requirements  
**Target Audience**: Developers, QA testers, product stakeholders  
**Estimated Time**: 15 minutes

## Prerequisites

### Development Environment
- Node.js 18+ installed
- Git repository cloned locally
- Daily.co developer account with API keys
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Environment Setup
```bash
# Install dependencies (including Daily React and required peer dependencies)
npm install @daily-co/daily-react @daily-co/daily-js jotai

# Install other project dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Daily API key to .env.local

# Start development server
npm run dev
```

### Test Data
The application uses pre-configured classroom URLs:
- Classroom 1: "Cohort 1" 
- Classroom 2: "Cohort 2"
- Classroom 3: "Cohort 3"
- Classroom 4: "Cohort 4"
- Classroom 5: "Cohort 5"
- Classroom 6: "Cohort 6"

## Core User Workflows

### Workflow 1: Student Journey (Basic Path)
**Acceptance Criteria**: Students can browse, join, and switch between classrooms

**Steps**:
1. **Open Application**
   - Navigate to `http://localhost:3000`
   - **Expected**: Main lobby displays with 6 classroom options
   - **Verify**: Futuristic black/teal design theme visible
   - **Verify**: "Powered by the Overclock Accelerator" branding present

2. **View Classroom Options**
   - **Expected**: 6 classrooms shown with simple names/numbers only
   - **Verify**: No participant counts or status indicators (minimal design)
   - **Verify**: "Students" and "Instructors" toggle buttons visible

3. **Join First Classroom**
   - Click on "Cohort 1" classroom
   - **Expected**: Name entry prompt appears
   - Enter name: "Test Student"
   - Click "Join as Student"
   - **Expected**: Redirected to classroom video view
   - **Verify**: Video feed area visible
   - **Verify**: "Return to Main Lobby" button present

4. **Verify Video Connection**
   - **Expected**: DailyProvider initializes with room URL
   - **Expected**: useParticipants() hook shows current participant
   - **Expected**: useDevices() provides camera/microphone controls
   - **Verify**: Audio/video controls available via Daily React hooks
   - **Verify**: No instructor controls visible (student mode)

5. **Return to Lobby**
   - Click "Return to Main Lobby"
   - **Expected**: Back to main lobby view
   - **Verify**: Can see all 6 classrooms again

6. **Switch to Different Classroom**
   - Click on "Cohort 2" classroom
   - **Expected**: Name pre-filled from previous session
   - Click "Join as Student"
   - **Expected**: Automatically leaves Cohort 1, joins Cohort 2
   - **Verify**: Video feed shows new classroom

**Success Criteria**: ✅ Student can navigate lobby, join classrooms, and switch between them seamlessly

### Workflow 2: Instructor Journey (Advanced Path)
**Acceptance Criteria**: Instructors have additional controls for managing classrooms

**Steps**:
1. **Enter Instructor Mode**
   - From main lobby, click "Instructors" button
   - **Expected**: Interface switches to instructor mode
   - **Verify**: Same 6 classrooms visible but with instructor styling

2. **Join as Instructor**
   - Click on "Cohort 1" classroom
   - Enter name: "Test Instructor"
   - **Expected**: Role automatically set to "instructor"
   - Click "Join as Instructor"
   - **Expected**: Classroom view with additional control panel

3. **Verify Instructor Controls**
   - **Expected**: Instructor control panel visible
   - **Verify**: "Mute Participant" controls available
   - **Verify**: "Mute All" button present
   - **Verify**: "Create Breakout Room" option available
   - **Verify**: All student features also accessible

4. **Test Participant Management** (requires second browser/device)
   - Open second browser tab as student in same classroom
   - From instructor view, use useParticipants() to access participant data
   - Use Daily call object methods to mute the student
   - **Expected**: Mute action succeeds via Daily API
   - **Verify**: Student's audio state changes in useParticipantProperty() hook

5. **Test Breakout Room Creation**
   - Click "Create Breakout Room"
   - Enter name: "Discussion Group A"
   - Select participants (if any available)
   - **Expected**: Breakout room created successfully
   - **Verify**: Participants moved to breakout session

**Success Criteria**: ✅ Instructor can access all student features plus management controls

### Workflow 3: Capacity and Error Handling
**Acceptance Criteria**: System properly handles edge cases and capacity limits

**Steps**:
1. **Test Classroom Full Scenario** (simulation)
   - Modify classroom capacity to 2 for testing
   - Join classroom with 2 test accounts
   - Attempt to join with third account
   - **Expected**: "Classroom full" message displayed
   - **Verify**: Cannot join when at capacity
   - **Verify**: Clear error message explains situation

2. **Test Network Disconnection**
   - Join classroom successfully
   - Simulate network disconnection (disable WiFi)
   - **Expected**: Connection state updates to "disconnected"
   - Re-enable network
   - **Expected**: Automatic reconnection attempt

3. **Test Invalid Classroom Access**
   - Manually navigate to `/classroom/7` (invalid ID)
   - **Expected**: Error page or redirect to lobby
   - **Verify**: Graceful error handling

**Success Criteria**: ✅ System handles errors gracefully with clear user feedback

### Workflow 4: Multiple Instructor Scenario
**Acceptance Criteria**: Multiple instructors can manage the same classroom

**Steps**:
1. **Join as First Instructor**
   - Enter classroom as instructor (Test Instructor 1)
   - **Verify**: Full instructor controls available

2. **Join as Second Instructor** (second browser/device)
   - Enter same classroom as different instructor (Test Instructor 2)
   - **Expected**: Both instructors have equal privileges
   - **Verify**: Both can access mute controls
   - **Verify**: Both can create breakout rooms

3. **Test Concurrent Actions**
   - Have both instructors attempt actions simultaneously
   - **Expected**: Actions don't conflict
   - **Verify**: System handles multiple instructor commands

**Success Criteria**: ✅ Multiple instructors can collaborate without conflicts

## Performance Validation

### Load Time Testing
- **Page Load**: Main lobby should load in <200ms
- **Video Connection**: Classroom join should complete in <100ms
- **Navigation**: Switching between lobby and classrooms should be instant

### Video Quality Testing
- **Resolution**: Video should support up to 1080p
- **Frame Rate**: Smooth 30fps minimum, 60fps preferred
- **Audio Quality**: Clear audio without echo or distortion

### Capacity Testing
- **Participant Limit**: Verify 50-participant limit per classroom
- **Concurrent Rooms**: Test all 6 classrooms active simultaneously
- **Total Capacity**: Validate 300 total participants (6 × 50)

## Accessibility and Usability

### Visual Design Validation
- **Color Scheme**: Black background with teal (#00FFD1) highlights
- **Typography**: Bold, geometric sans-serif fonts
- **Contrast**: Sufficient contrast for readability
- **Branding**: "Powered by the Overclock Accelerator" prominently displayed

### User Experience Testing
- **Navigation**: Intuitive flow between lobby and classrooms
- **Error Messages**: Clear, actionable error messages
- **Loading States**: Appropriate loading indicators
- **Mobile Responsiveness**: Functional on mobile devices

## Troubleshooting Common Issues

### Video Not Loading
- Check Daily.co API key configuration
- Verify browser permissions for camera/microphone
- Test with different browser or incognito mode

### Connection Failures
- Confirm internet connectivity
- Check firewall/network restrictions
- Verify Daily.co service status

### Permission Errors
- Ensure instructor role is properly set
- Check session management and authentication
- Verify API endpoint responses

## Success Metrics

### Functional Requirements Met
- ✅ 6 classrooms available in lobby
- ✅ Student and instructor modes working
- ✅ Video streaming functional via Daily.co
- ✅ Participant management controls operational
- ✅ Capacity limits enforced (50 per classroom)
- ✅ Simple name-based authentication
- ✅ Minimal UI design implemented

### Technical Requirements Met
- ✅ Next.js application running
- ✅ Tailwind CSS styling applied
- ✅ Daily.co integration functional
- ✅ Vercel serverless functions operational
- ✅ TypeScript types properly defined
- ✅ No database dependencies (local development)

### User Experience Requirements Met
- ✅ Futuristic black/teal aesthetic
- ✅ Newcomer-friendly interface
- ✅ Clear navigation patterns
- ✅ Educational code structure
- ✅ Comprehensive error handling

## Next Steps After Quickstart

1. **Run Automated Tests**: Execute full test suite
2. **Performance Monitoring**: Set up metrics collection
3. **User Acceptance Testing**: Gather stakeholder feedback
4. **Production Deployment**: Deploy to Vercel
5. **Documentation Review**: Update user guides and API docs

This quickstart validates that the Overcast application meets all specified requirements and provides a solid foundation for production deployment.
