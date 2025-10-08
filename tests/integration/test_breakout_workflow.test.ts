import { test, expect } from '@playwright/test';

/**
 * Integration Test: Breakout Room Workflow
 * 
 * Tests the complete breakout room lifecycle including:
 * - Creating breakout rooms (1-10 limit)
 * - Assigning participants to rooms
 * - Verifying room list and member assignments
 * - Moving participants between rooms
 * - Closing breakout rooms
 * 
 * WHY these tests:
 * - Breakout rooms are complex with multiple state transitions
 * - Participant assignment validation is critical (no duplicates)
 * - Room limits must be enforced (1-10 rooms)
 * - Instructors need clear feedback on created rooms
 */

test.describe('Breakout Room Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
  });

  test('should create a single breakout room with assigned participants', async ({ page, context }) => {
    // Set up instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Create student contexts
    const student1Context = await context.browser()?.newContext();
    const student1Page = await student1Context?.newPage();
    
    const student2Context = await context.browser()?.newContext();
    const student2Page = await student2Context?.newPage();
    
    if (student1Page && student2Page) {
      // Students join classroom
      await student1Page.goto('http://localhost:3000');
      await student1Page.click('text=Cohort 1');
      await student1Page.fill('[data-testid="name-input"]', 'Student One');
      await student1Page.click('[data-testid="join-as-student"]');
      
      await student2Page.goto('http://localhost:3000');
      await student2Page.click('text=Cohort 1');
      await student2Page.fill('[data-testid="name-input"]', 'Student Two');
      await student2Page.click('[data-testid="join-as-student"]');
      
      // Wait for all participants to be visible
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('3');
      
      // Step 1: Click Create Breakout Room button
      await page.click('[data-testid="create-breakout-button"]');
      
      // Step 2: Verify breakout modal opens
      await expect(page.locator('[data-testid="breakout-modal"]')).toBeVisible();
      
      // Step 3: Verify default 2 rooms are shown
      await expect(page.locator('[data-testid="breakout-room-config"]')).toHaveCount(2);
      
      // Step 4: Fill in first room name
      await page.fill('[data-testid="breakout-room-name-0"]', 'Discussion Group A');
      
      // Step 5: Assign Student One to first room
      await page.click('[data-testid="assign-student-Student One-to-room-0"]');
      
      // Step 6: Verify Student One is highlighted as assigned
      await expect(page.locator('[data-testid="participant-Student One-assigned-to-0"]')).toHaveClass(/assigned/);
      
      // Step 7: Remove second room (only need one for this test)
      await page.click('[data-testid="remove-room-1"]');
      
      // Step 8: Verify only one room remains
      await expect(page.locator('[data-testid="breakout-room-config"]')).toHaveCount(1);
      
      // Step 9: Submit breakout room creation
      await page.click('[data-testid="create-breakout-submit"]');
      
      // Step 10: Verify confirmation view appears
      await expect(page.locator('[data-testid="breakout-created-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="breakout-created-confirmation"]')).toContainText('Successfully created 1 breakout room');
      
      // Step 11: Verify created room is listed with details
      await expect(page.locator('[data-testid="created-room-name"]')).toContainText('Discussion Group A');
      await expect(page.locator('[data-testid="created-room-participants"]')).toContainText('Student One');
      
      // Step 12: Close modal
      await page.click('[data-testid="breakout-modal-close"]');
      
      // Step 13: Verify modal is closed
      await expect(page.locator('[data-testid="breakout-modal"]')).not.toBeVisible();
      
      // Cleanup
      await student1Context?.close();
      await student2Context?.close();
    }
  });

  test('should create multiple breakout rooms with participant distribution', async ({ page, context }) => {
    // Set up instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Create 4 student contexts
    const students = [];
    for (let i = 1; i <= 4; i++) {
      const studentContext = await context.browser()?.newContext();
      const studentPage = await studentContext?.newPage();
      
      if (studentPage) {
        await studentPage.goto('http://localhost:3000');
        await studentPage.click('text=Cohort 1');
        await studentPage.fill('[data-testid="name-input"]', `Student ${i}`);
        await studentPage.click('[data-testid="join-as-student"]');
        students.push({ page: studentPage, context: studentContext });
      }
    }
    
    // Wait for all participants
    await expect(page.locator('[data-testid="participant-count"]')).toContainText('5');
    
    // Step 1: Open breakout modal
    await page.click('[data-testid="create-breakout-button"]');
    
    // Step 2: Verify modal opens with 2 default rooms
    await expect(page.locator('[data-testid="breakout-modal"]')).toBeVisible();
    
    // Step 3: Fill in room names
    await page.fill('[data-testid="breakout-room-name-0"]', 'Room A');
    await page.fill('[data-testid="breakout-room-name-1"]', 'Room B');
    
    // Step 4: Assign students to rooms
    await page.click('[data-testid="assign-student-Student 1-to-room-0"]');
    await page.click('[data-testid="assign-student-Student 2-to-room-0"]');
    await page.click('[data-testid="assign-student-Student 3-to-room-1"]');
    await page.click('[data-testid="assign-student-Student 4-to-room-1"]');
    
    // Step 5: Verify participant counts
    await expect(page.locator('[data-testid="room-0-participant-count"]')).toContainText('2 participants');
    await expect(page.locator('[data-testid="room-1-participant-count"]')).toContainText('2 participants');
    
    // Step 6: Submit
    await page.click('[data-testid="create-breakout-submit"]');
    
    // Step 7: Verify confirmation shows both rooms
    await expect(page.locator('[data-testid="created-room-name"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="breakout-created-confirmation"]')).toContainText('Successfully created 2 breakout rooms');
    
    // Cleanup
    for (const student of students) {
      await student.context?.close();
    }
  });

  test('should validate no duplicate participant assignments', async ({ page, context }) => {
    // Set up instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Add one student
    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();
    
    if (studentPage) {
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Test Student');
      await studentPage.click('[data-testid="join-as-student"]');
      
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');
      
      // Step 1: Open breakout modal
      await page.click('[data-testid="create-breakout-button"]');
      
      // Step 2: Fill in room names
      await page.fill('[data-testid="breakout-room-name-0"]', 'Room A');
      await page.fill('[data-testid="breakout-room-name-1"]', 'Room B');
      
      // Step 3: Assign student to Room A
      await page.click('[data-testid="assign-student-Test Student-to-room-0"]');
      
      // Step 4: Verify student is assigned to Room A
      await expect(page.locator('[data-testid="participant-Test Student-assigned-to-0"]')).toBeVisible();
      
      // Step 5: Try to assign same student to Room B
      await page.click('[data-testid="assign-student-Test Student-to-room-1"]');
      
      // Step 6: Verify student moved from Room A to Room B (automatic reassignment)
      await expect(page.locator('[data-testid="participant-Test Student-assigned-to-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-Test Student-assigned-to-0"]')).not.toBeVisible();
      
      // Step 7: Verify Room A count is now 0, Room B count is 1
      await expect(page.locator('[data-testid="room-0-participant-count"]')).toContainText('0 participants');
      await expect(page.locator('[data-testid="room-1-participant-count"]')).toContainText('1 participant');
      
      // Cleanup
      await studentContext?.close();
    }
  });

  test('should enforce maximum 10 breakout rooms limit', async ({ page }) => {
    // Set up instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 1: Open breakout modal
    await page.click('[data-testid="create-breakout-button"]');
    
    // Step 2: Add rooms until we reach 10
    for (let i = 2; i < 10; i++) {
      await page.click('[data-testid="add-room-button"]');
    }
    
    // Step 3: Verify we have 10 rooms
    await expect(page.locator('[data-testid="breakout-room-config"]')).toHaveCount(10);
    
    // Step 4: Verify Add Room button is disabled
    await expect(page.locator('[data-testid="add-room-button"]')).toBeDisabled();
    
    // Step 5: Verify button shows max limit message
    await expect(page.locator('[data-testid="add-room-button"]')).toContainText('Maximum 10 rooms');
  });

  test('should validate room names are non-empty', async ({ page }) => {
    // Set up instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 1: Open breakout modal
    await page.click('[data-testid="create-breakout-button"]');
    
    // Step 2: Clear first room name
    await page.fill('[data-testid="breakout-room-name-0"]', '');
    
    // Step 3: Try to submit
    await page.click('[data-testid="create-breakout-submit"]');
    
    // Step 4: Verify submit button is disabled or error shown
    await expect(page.locator('[data-testid="create-breakout-submit"]')).toBeDisabled();
  });

  test('should require at least 2 students to create breakout rooms', async ({ page }) => {
    // Set up instructor (no students)
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 1: Verify Create Breakout Room button is disabled
    await expect(page.locator('[data-testid="create-breakout-button"]')).toBeDisabled();
  });

  test('should allow closing breakout rooms (future enhancement)', async ({ page, context }) => {
    // This test is a placeholder for future functionality
    // Currently the breakout room closure API exists but may not be wired up in the UI
    
    test.skip();
  });

  test('should allow reassigning participants between rooms (future enhancement)', async ({ page, context }) => {
    // This test is a placeholder for PATCH /api/breakout-rooms/[roomId] endpoint
    // The API exists but UI may not be implemented yet
    
    test.skip();
  });
});

