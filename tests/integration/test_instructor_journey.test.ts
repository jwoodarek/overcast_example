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
});
