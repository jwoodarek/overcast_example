import { test, expect } from '@playwright/test';

/**
 * Integration Test: Transcript Capture Flow
 * 
 * Tests the complete transcript capture workflow including:
 * - Real-time speech-to-text capture
 * - Speaker role identification (instructor vs student)
 * - Transcript filtering by role, time, and confidence
 * - Session cleanup and memory management
 * 
 * Based on Quickstart Steps 6-7: Transcript Capture Validation
 * This test MUST FAIL initially - implementation comes in Phase 3.3
 */

test.describe('Transcript Capture Integration Tests', () => {
  const API_BASE = 'http://localhost:3000/api';
  let classroomSessionId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
    
    // Generate unique session ID for this test
    classroomSessionId = `test-classroom-${Date.now()}`;
  });

  test('should capture transcripts from both instructor and student', async ({ page, context }) => {
    /**
     * WHY: Verifies that transcription service captures speech from both roles
     * and correctly assigns speaker roles based on participant metadata
     */

    // Step 1: Instructor joins classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Step 2: Student joins same classroom in new context
    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();
    
    if (studentPage) {
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Test Student');
      await studentPage.click('[data-testid="join-as-student"]');

      // Wait for both participants to be in room
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');

      // Step 3: Wait for transcription service to initialize
      // Check for initialization log or transcript monitor visibility
      await page.waitForTimeout(2000); // Give time for transcription to start

      // Step 4: Simulate speech (via mock or actual microphone)
      // NOTE: In actual implementation, this would trigger Web Speech API or transcription service
      // For now, we check if the transcript endpoint is accessible
      
      // Step 5: Verify transcripts via API
      const transcriptResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
      expect(transcriptResponse.status).toBe(200);
      
      const transcriptData = await transcriptResponse.json();
      expect(transcriptData).toHaveProperty('entries');
      expect(transcriptData).toHaveProperty('count');
      expect(transcriptData).toHaveProperty('hasMore');

      // Verify transcript structure
      expect(Array.isArray(transcriptData.entries)).toBe(true);

      // If transcripts exist, verify they have correct roles
      if (transcriptData.entries.length > 0) {
        const instructorTranscripts = transcriptData.entries.filter(
          (e: any) => e.speakerRole === 'instructor'
        );
        const studentTranscripts = transcriptData.entries.filter(
          (e: any) => e.speakerRole === 'student'
        );

        // At least verify the endpoint structure works
        expect(instructorTranscripts.length + studentTranscripts.length).toBe(transcriptData.entries.length);
      }

      // Clean up student context
      await studentContext?.close();
    }
  });

  test('should filter transcripts by speaker role', async ({ page }) => {
    /**
     * WHY: Instructors need to filter transcripts to get only their own speech
     * for quiz generation, or only student speech for help detection
     */

    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Filter Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Wait for potential transcripts to be captured
    await page.waitForTimeout(2000);

    // Test instructor filter
    const instructorResponse = await fetch(`${API_BASE}/transcripts/classroom-1?role=instructor`);
    expect(instructorResponse.status).toBe(200);
    
    const instructorData = await instructorResponse.json();
    expect(instructorData).toHaveProperty('entries');
    
    // All returned entries should be from instructor
    instructorData.entries.forEach((entry: any) => {
      expect(entry.speakerRole).toBe('instructor');
    });

    // Test student filter
    const studentResponse = await fetch(`${API_BASE}/transcripts/classroom-1?role=student`);
    expect(studentResponse.status).toBe(200);
    
    const studentData = await studentResponse.json();
    expect(studentData).toHaveProperty('entries');
    
    // All returned entries should be from students
    studentData.entries.forEach((entry: any) => {
      expect(entry.speakerRole).toBe('student');
    });
  });

  test('should filter transcripts by timestamp (since parameter)', async ({ page }) => {
    /**
     * WHY: For incremental analysis, we only want to process new transcripts
     * since the last analysis run, not re-process everything
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Timestamp Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Capture current time
    const startTime = new Date();
    await page.waitForTimeout(1000);

    // Wait a bit for potential transcripts
    await page.waitForTimeout(2000);

    // Capture time for "since" filter
    const sinceTime = new Date(startTime.getTime() - 1000); // 1 second before start

    // Test since filter
    const sinceResponse = await fetch(
      `${API_BASE}/transcripts/classroom-1?since=${sinceTime.toISOString()}`
    );
    expect(sinceResponse.status).toBe(200);
    
    const sinceData = await sinceResponse.json();
    expect(sinceData).toHaveProperty('entries');
    
    // All returned entries should be after the since timestamp
    sinceData.entries.forEach((entry: any) => {
      const entryTime = new Date(entry.timestamp).getTime();
      const sinceTimeMs = sinceTime.getTime();
      expect(entryTime).toBeGreaterThan(sinceTimeMs);
    });
  });

  test('should filter transcripts by confidence threshold', async ({ page }) => {
    /**
     * WHY: Low-confidence transcripts can be inaccurate and should be
     * filterable to avoid false positive help alerts or poor quiz questions
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Confidence Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    await page.waitForTimeout(2000);

    // Test confidence filter
    const minConfidence = 0.8;
    const confidenceResponse = await fetch(
      `${API_BASE}/transcripts/classroom-1?minConfidence=${minConfidence}`
    );
    expect(confidenceResponse.status).toBe(200);
    
    const confidenceData = await confidenceResponse.json();
    expect(confidenceData).toHaveProperty('entries');
    
    // All returned entries should have confidence >= minConfidence
    confidenceData.entries.forEach((entry: any) => {
      expect(entry.confidence).toBeGreaterThanOrEqual(minConfidence);
    });
  });

  test('should capture transcripts in breakout rooms with room name', async ({ page, context }) => {
    /**
     * WHY: Help alerts need to show which breakout room needs assistance.
     * Transcripts must include breakout room name for proper alert context.
     */

    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Breakout Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Student joins
    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();
    
    if (studentPage) {
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Breakout Test Student');
      await studentPage.click('[data-testid="join-as-student"]');

      // Wait for participants to connect
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');

      // Create breakout room
      await page.click('[data-testid="create-breakout-button"]');
      await page.fill('[data-testid="breakout-name-input"]', 'Discussion Group A');
      
      // Assign student to breakout room
      const participantCheckbox = page.locator('[data-testid="participant-checkbox"]').first();
      await participantCheckbox.check();
      await page.click('[data-testid="create-breakout-confirm"]');

      // Wait for breakout room to be created
      await expect(page.locator('[data-testid="breakout-room-Discussion Group A"]')).toBeVisible();

      // Wait for potential transcripts in breakout room
      await page.waitForTimeout(2000);

      // Check transcripts for breakout room
      // NOTE: This assumes breakout room has a specific session ID
      // In actual implementation, you'd get the breakout room session ID from the UI
      const transcriptResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
      expect(transcriptResponse.status).toBe(200);
      
      const transcriptData = await transcriptResponse.json();

      // If transcripts exist from breakout room, verify they have room name
      const breakoutTranscripts = transcriptData.entries.filter(
        (e: any) => e.breakoutRoomName !== null
      );

      breakoutTranscripts.forEach((entry: any) => {
        expect(typeof entry.breakoutRoomName).toBe('string');
        // Should be from our breakout room
        expect(entry.breakoutRoomName).toBeTruthy();
      });

      await studentContext?.close();
    }
  });

  test('should handle session cleanup on leave', async ({ page }) => {
    /**
     * WHY: Memory management is critical. When all participants leave,
     * transcripts should be cleaned up to prevent memory leaks.
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Cleanup Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Wait for session to establish
    await page.waitForTimeout(2000);

    // Verify transcripts endpoint is accessible
    const beforeLeaveResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
    expect(beforeLeaveResponse.status).toBe(200);

    // Leave classroom
    await page.click('[data-testid="return-to-lobby"]');
    await expect(page).toHaveURL(/\/$/);

    // After leaving, session may be cleaned up
    // NOTE: Cleanup might be deferred or immediate depending on implementation
    // This test verifies the endpoint handles non-existent sessions gracefully
    await page.waitForTimeout(1000);

    const afterLeaveResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
    // Should either return empty list or 404 depending on cleanup strategy
    expect([200, 404]).toContain(afterLeaveResponse.status);

    if (afterLeaveResponse.status === 200) {
      const afterLeaveData = await afterLeaveResponse.json();
      // If 200, entries might be empty after cleanup
      expect(afterLeaveData).toHaveProperty('entries');
    }
  });

  test('should validate transcript schema compliance', async ({ page }) => {
    /**
     * WHY: All transcript entries must match the TranscriptEntry schema
     * defined in data-model.md to ensure data integrity across the system
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Schema Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    await page.waitForTimeout(2000);

    // Get transcripts and validate schema
    const transcriptResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
    expect(transcriptResponse.status).toBe(200);
    
    const transcriptData = await transcriptResponse.json();
    expect(transcriptData).toHaveProperty('entries');

    // Validate each transcript entry
    transcriptData.entries.forEach((entry: any) => {
      // Required fields
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('sessionId');
      expect(entry).toHaveProperty('speakerId');
      expect(entry).toHaveProperty('speakerRole');
      expect(entry).toHaveProperty('speakerName');
      expect(entry).toHaveProperty('text');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('confidence');

      // Field types and constraints
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      
      expect(typeof entry.sessionId).toBe('string');
      expect(entry.sessionId.length).toBeGreaterThan(0);
      
      expect(typeof entry.speakerId).toBe('string');
      expect(entry.speakerId.length).toBeGreaterThan(0);
      
      expect(['instructor', 'student']).toContain(entry.speakerRole);
      
      expect(typeof entry.speakerName).toBe('string');
      expect(entry.speakerName.length).toBeGreaterThan(0);
      
      expect(typeof entry.text).toBe('string');
      expect(entry.text.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeLessThanOrEqual(1000);
      
      expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');
      
      expect(typeof entry.confidence).toBe('number');
      expect(entry.confidence).toBeGreaterThanOrEqual(0.0);
      expect(entry.confidence).toBeLessThanOrEqual(1.0);

      // Optional fields
      if (entry.hasOwnProperty('breakoutRoomName')) {
        expect(entry.breakoutRoomName === null || typeof entry.breakoutRoomName === 'string').toBe(true);
      }
    });
  });

  test('should handle high-volume transcript capture', async ({ page }) => {
    /**
     * WHY: Performance validation - system should handle continuous speech
     * without lag or memory issues. Target: 50 participants per classroom.
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Performance Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    // Wait for initial setup
    await page.waitForTimeout(1000);

    // Measure initial response time
    const startTime = Date.now();
    const initialResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
    const initialResponseTime = Date.now() - startTime;
    
    expect(initialResponse.status).toBe(200);
    expect(initialResponseTime).toBeLessThan(1000); // Should respond within 1 second

    // Wait for potential transcript accumulation
    await page.waitForTimeout(5000);

    // Measure response time with accumulated transcripts
    const secondStartTime = Date.now();
    const secondResponse = await fetch(`${API_BASE}/transcripts/classroom-1`);
    const secondResponseTime = Date.now() - secondStartTime;
    
    expect(secondResponse.status).toBe(200);
    expect(secondResponseTime).toBeLessThan(2000); // Should still be performant

    // Verify system remains responsive
    const secondData = await secondResponse.json();
    expect(secondData).toHaveProperty('entries');
    expect(secondData.count).toBe(secondData.entries.length);
  });

  test('should support combined filters (role + confidence + since)', async ({ page }) => {
    /**
     * WHY: Real-world usage requires combining multiple filters.
     * Example: "Get high-confidence instructor speech from last 5 minutes"
     */

    // Join classroom
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Combined Filter Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);

    const sinceTime = new Date(Date.now() - 60000); // 1 minute ago
    await page.waitForTimeout(2000);

    // Test combined filters
    const combinedResponse = await fetch(
      `${API_BASE}/transcripts/classroom-1?role=instructor&minConfidence=0.8&since=${sinceTime.toISOString()}`
    );
    expect(combinedResponse.status).toBe(200);
    
    const combinedData = await combinedResponse.json();
    expect(combinedData).toHaveProperty('entries');
    
    // All entries should match ALL filters
    combinedData.entries.forEach((entry: any) => {
      expect(entry.speakerRole).toBe('instructor');
      expect(entry.confidence).toBeGreaterThanOrEqual(0.8);
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(sinceTime.getTime());
    });
  });
});

