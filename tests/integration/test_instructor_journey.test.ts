import { test, expect } from '@playwright/test';

/**
 * Integration Test: Instructor Journey
 * 
 * Tests the complete instructor workflow including classroom management controls.
 * Validates instructor-specific features and participant management capabilities.
 * 
 * Based on Quickstart Workflow 2: Instructor Journey (Advanced Path)
 */

test.describe('Instructor Journey Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
  });

  test('should complete full instructor journey with classroom management', async ({ page }) => {
    // Step 1: Enter Instructor Mode
    await page.click('[data-testid="instructors-toggle"]');
    
    // Verify interface switches to instructor mode
    await expect(page.locator('[data-testid="instructor-mode-indicator"]')).toBeVisible();
    
    // Verify same 6 classrooms visible but with instructor styling
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Verify instructor-specific styling (different from student mode)
    await expect(page.locator('[data-testid="instructor-classroom-grid"]')).toBeVisible();
    
    // Step 2: Join as Instructor
    await page.click('text=Cohort 1');
    
    // Enter instructor name
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    
    // Verify role is automatically set to instructor
    await expect(page.locator('[data-testid="role-indicator"]')).toContainText('instructor');
    
    await page.click('[data-testid="join-as-instructor"]');
    
    // Should be in classroom with instructor controls
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 3: Verify Instructor Controls
    // Verify instructor control panel is visible
    await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
    
    // Verify specific instructor controls are available
    await expect(page.locator('[data-testid="mute-participant-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="mute-all-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-breakout-button"]')).toBeVisible();
    
    // Verify all student features are also accessible
    await expect(page.locator('[data-testid="video-feed-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="audio-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-controls"]')).toBeVisible();
    
    // Verify return to lobby option is available
    await expect(page.locator('[data-testid="return-to-lobby"]')).toBeVisible();
  });

  test('should handle participant management controls', async ({ page, context }) => {
    // This test requires multiple browser contexts to simulate instructor-student interaction
    
    // Set up instructor in first context
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Create second browser context for student
    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();
    
    if (studentPage) {
      // Student joins same classroom
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Test Student');
      await studentPage.click('[data-testid="join-as-student"]');
      
      // Wait for both participants to be in the room
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');
      
      // From instructor view, test muting a participant
      await page.click('[data-testid="mute-participant-Test Student"]');
      
      // Verify mute action succeeds
      await expect(page.locator('[data-testid="participant-Test Student-muted"]')).toBeVisible();
      
      // Test mute all functionality
      await page.click('[data-testid="mute-all-button"]');
      
      // Verify all participants are muted
      await expect(page.locator('[data-testid="all-participants-muted"]')).toBeVisible();
      
      // Clean up student context
      await studentContext?.close();
    }
  });

  test('should handle breakout room creation and management', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Breakout Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Test breakout room creation
    await page.click('[data-testid="create-breakout-button"]');
    
    // Verify breakout room creation modal appears
    await expect(page.locator('[data-testid="breakout-creation-modal"]')).toBeVisible();
    
    // Enter breakout room details
    await page.fill('[data-testid="breakout-name-input"]', 'Discussion Group A');
    
    // Select participants (if any available)
    const participantCheckboxes = page.locator('[data-testid="participant-checkbox"]');
    const participantCount = await participantCheckboxes.count();
    
    if (participantCount > 0) {
      await participantCheckboxes.first().check();
    }
    
    // Create the breakout room
    await page.click('[data-testid="create-breakout-confirm"]');
    
    // Verify breakout room is created successfully
    await expect(page.locator('[data-testid="breakout-room-Discussion Group A"]')).toBeVisible();
    
    // Verify participants are moved to breakout session (if any were selected)
    if (participantCount > 0) {
      await expect(page.locator('[data-testid="breakout-participants"]')).toBeVisible();
    }
  });

  test('should maintain instructor privileges across classroom switches', async ({ page }) => {
    // Join first classroom as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Privilege Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
    
    // Return to lobby
    await page.click('[data-testid="return-to-lobby"]');
    
    // Join different classroom - should maintain instructor mode
    await page.click('text=Cohort 2');
    
    // Name should be pre-filled and role should remain instructor
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('Privilege Test Instructor');
    await expect(page.locator('[data-testid="role-indicator"]')).toContainText('instructor');
    
    await page.click('[data-testid="join-as-instructor"]');
    
    // Verify instructor controls are available in new classroom
    await expect(page).toHaveURL(/\/classroom\/2/);
    await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
  });

  test('should handle instructor mode toggle correctly', async ({ page }) => {
    // Start in student mode (default)
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Verify student mode styling
    await expect(page.locator('[data-testid="student-mode-indicator"]')).toBeVisible();
    
    // Switch to instructor mode
    await page.click('[data-testid="instructors-toggle"]');
    
    // Verify mode switch
    await expect(page.locator('[data-testid="instructor-mode-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="student-mode-indicator"]')).not.toBeVisible();
    
    // Switch back to student mode
    await page.click('[data-testid="students-toggle"]');
    
    // Verify mode switch back
    await expect(page.locator('[data-testid="student-mode-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructor-mode-indicator"]')).not.toBeVisible();
  });

  test('should validate instructor permissions and access control', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Permission Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Verify instructor can access all control functions
    await expect(page.locator('[data-testid="mute-all-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="create-breakout-button"]')).toBeEnabled();
    
    // Test that instructor controls work
    await page.click('[data-testid="mute-all-button"]');
    
    // Should not show permission denied error
    await expect(page.locator('[data-testid="permission-error"]')).not.toBeVisible();
    
    // Verify action was successful
    await expect(page.locator('[data-testid="mute-all-success"]')).toBeVisible();
  });

  // T054: New tests for instructor interface improvements

  test('should toggle personal media controls (mic and camera)', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Media Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Verify media control buttons are visible
    await expect(page.locator('[data-testid="instructor-mic-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructor-camera-toggle"]')).toBeVisible();
    
    // Test microphone toggle
    const micButton = page.locator('[data-testid="instructor-mic-toggle"]');
    await micButton.click();
    
    // Verify button state changes
    await expect(micButton).toContainText('Mic Off');
    
    // Click again to turn back on
    await micButton.click();
    await expect(micButton).toContainText('Mic On');
    
    // Test camera toggle
    const cameraButton = page.locator('[data-testid="instructor-camera-toggle"]');
    await cameraButton.click();
    
    // Verify button state changes
    await expect(cameraButton).toContainText('Camera Off');
    
    // Click again to turn back on
    await cameraButton.click();
    await expect(cameraButton).toContainText('Camera On');
  });

  test('should support keyboard shortcuts for media controls', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Keyboard Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Verify mic button shows keyboard shortcut hint
    await expect(page.locator('[data-testid="instructor-mic-toggle"]')).toHaveAttribute('aria-keyshortcuts', 'm');
    await expect(page.locator('[data-testid="instructor-camera-toggle"]')).toHaveAttribute('aria-keyshortcuts', 'c');
    
    // Test 'M' key toggles microphone
    const micButton = page.locator('[data-testid="instructor-mic-toggle"]');
    const initialMicState = await micButton.textContent();
    
    await page.keyboard.press('m');
    
    // Wait a moment for state change
    await page.waitForTimeout(300);
    
    const newMicState = await micButton.textContent();
    expect(newMicState).not.toBe(initialMicState);
    
    // Test 'C' key toggles camera
    const cameraButton = page.locator('[data-testid="instructor-camera-toggle"]');
    const initialCameraState = await cameraButton.textContent();
    
    await page.keyboard.press('c');
    
    // Wait a moment for state change
    await page.waitForTimeout(300);
    
    const newCameraState = await cameraButton.textContent();
    expect(newCameraState).not.toBe(initialCameraState);
  });

  test('should display smart mute all toggle with real-time state', async ({ page, context }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Smart Toggle Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Add a student
    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();
    
    if (studentPage) {
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Test Student');
      await studentPage.click('[data-testid="join-as-student"]');
      
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');
      
      // Initially, student should be unmuted, so button should say "Mute All"
      const muteToggle = page.locator('[data-testid="mute-all-button"]');
      await expect(muteToggle).toContainText('Mute All Students');
      
      // Click to mute all
      await muteToggle.click();
      
      // Button should now say "Unmute All"
      await expect(muteToggle).toContainText('Unmute All Students');
      
      // Click to unmute all
      await muteToggle.click();
      
      // Button should say "Mute All" again
      await expect(muteToggle).toContainText('Mute All Students');
      
      // Cleanup
      await studentContext?.close();
    }
  });

  test('should support video layout presets (Grid and Spotlight)', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Layout Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Verify layout preset selector is visible
    await expect(page.locator('[data-testid="layout-preset-selector"]')).toBeVisible();
    
    // Default should be Grid
    await expect(page.locator('[data-testid="layout-preset-selector"]')).toHaveValue('grid');
    
    // Switch to Spotlight layout
    await page.selectOption('[data-testid="layout-preset-selector"]', 'spotlight');
    
    // Verify layout changes
    await expect(page.locator('[data-testid="video-layout-spotlight"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-layout-grid"]')).not.toBeVisible();
    
    // Switch back to Grid
    await page.selectOption('[data-testid="layout-preset-selector"]', 'grid');
    
    // Verify layout changes back
    await expect(page.locator('[data-testid="video-layout-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-layout-spotlight"]')).not.toBeVisible();
  });

  test('should export transcript in CSV and JSON formats', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Export Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Accept transcription consent (if prompted)
    const consentButton = page.locator('[data-testid="transcription-consent-accept"]');
    if (await consentButton.isVisible({ timeout: 5000 })) {
      await consentButton.click();
    }
    
    // Wait for transcript panel to be visible
    await expect(page.locator('[data-testid="transcript-monitor"]')).toBeVisible({ timeout: 10000 });
    
    // Verify export button is visible
    await expect(page.locator('[data-testid="transcript-export-button"]')).toBeVisible();
    
    // Click export button to open format selector
    await page.click('[data-testid="transcript-export-button"]');
    
    // Verify format options appear
    await expect(page.locator('[data-testid="export-format-csv"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-format-json"]')).toBeVisible();
    
    // Test CSV export
    const downloadPromise1 = page.waitForEvent('download');
    await page.click('[data-testid="export-format-csv"]');
    const download1 = await downloadPromise1;
    
    // Verify download filename includes transcript and CSV
    expect(download1.suggestedFilename()).toContain('transcript');
    expect(download1.suggestedFilename()).toContain('.csv');
    
    // Test JSON export
    await page.click('[data-testid="transcript-export-button"]');
    const downloadPromise2 = page.waitForEvent('download');
    await page.click('[data-testid="export-format-json"]');
    const download2 = await downloadPromise2;
    
    // Verify download filename includes transcript and JSON
    expect(download2.suggestedFilename()).toContain('transcript');
    expect(download2.suggestedFilename()).toContain('.json');
  });

  test('should auto-switch layout when screen share is detected', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Screen Share Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Start in Grid layout
    await page.selectOption('[data-testid="layout-preset-selector"]', 'grid');
    await expect(page.locator('[data-testid="video-layout-grid"]')).toBeVisible();
    
    // Simulate screen share starting (this would require Daily.co screen share API)
    // This is a placeholder for future implementation
    // In a real test, you would start screen sharing and verify layout changes
    
    test.skip(); // Skip until screen share detection is implemented
  });

  test('should show transcript scrollback capability', async ({ page }) => {
    // Join as instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Scrollback Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Accept transcription consent (if prompted)
    const consentButton = page.locator('[data-testid="transcription-consent-accept"]');
    if (await consentButton.isVisible({ timeout: 5000 })) {
      await consentButton.click();
    }
    
    // Wait for transcript panel
    await expect(page.locator('[data-testid="transcript-monitor"]')).toBeVisible({ timeout: 10000 });
    
    // Verify transcript list is scrollable
    const transcriptList = page.locator('[data-testid="transcript-entries-list"]');
    await expect(transcriptList).toBeVisible();
    
    // Verify scrollback container has proper styling
    await expect(transcriptList).toHaveCSS('overflow-y', 'auto');
  });
});
