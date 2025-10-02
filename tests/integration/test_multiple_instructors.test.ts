import { test, expect } from '@playwright/test';

/**
 * Integration Test: Multiple Instructor Scenario
 * 
 * Tests the system's handling of multiple instructors in the same classroom.
 * Validates concurrent instructor actions and privilege management.
 * 
 * Based on Quickstart Workflow 4: Multiple Instructor Scenario
 */

test.describe('Multiple Instructor Scenario Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
  });

  test('should allow multiple instructors with equal privileges', async ({ page, context }) => {
    // Set up first instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor 1');
    await page.click('[data-testid="join-as-instructor"]');

    await expect(page).toHaveURL(/\/classroom\/1/);
    await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();

    // Create second browser context for second instructor
    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    if (instructor2Page) {
      // Set up second instructor
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Test Instructor 2');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      await expect(instructor2Page).toHaveURL(/\/classroom\/1/);

      // Verify both instructors have equal privileges
      await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="instructor-controls"]')).toBeVisible();

      // Verify both can access mute controls
      await expect(page.locator('[data-testid="mute-all-button"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="mute-all-button"]')).toBeVisible();

      // Verify both can create breakout rooms
      await expect(page.locator('[data-testid="create-breakout-button"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="create-breakout-button"]')).toBeVisible();

      // Verify participant count shows both instructors
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');
      await expect(instructor2Page.locator('[data-testid="participant-count"]')).toContainText('2');

      // Clean up second instructor context
      await instructor2Context?.close();
    }
  });

  test('should handle concurrent instructor actions without conflicts', async ({ page, context }) => {
    // Set up two instructors and one student
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Instructor 1');
    await page.click('[data-testid="join-as-instructor"]');

    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();

    if (instructor2Page && studentPage) {
      // Second instructor joins
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Instructor 2');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      // Student joins
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Test Student');
      await studentPage.click('[data-testid="join-as-student"]');

      // Wait for all participants to be in the room
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('3');

      // Test concurrent mute actions
      // Both instructors attempt to mute the student simultaneously
      await Promise.all([
        page.click('[data-testid="mute-participant-Test Student"]'),
        instructor2Page.click('[data-testid="mute-participant-Test Student"]')
      ]);

      // System should handle concurrent actions gracefully
      // Student should be muted (one of the actions should succeed)
      await expect(page.locator('[data-testid="participant-Test Student-muted"]')).toBeVisible();

      // No error messages should appear
      await expect(page.locator('[data-testid="conflict-error"]')).not.toBeVisible();
      await expect(instructor2Page.locator('[data-testid="conflict-error"]')).not.toBeVisible();

      // Clean up contexts
      await instructor2Context?.close();
      await studentContext?.close();
    }
  });

  test('should handle breakout room creation by multiple instructors', async ({ page, context }) => {
    // Set up two instructors
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Breakout Instructor 1');
    await page.click('[data-testid="join-as-instructor"]');

    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    if (instructor2Page) {
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Breakout Instructor 2');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      // First instructor creates a breakout room
      await page.click('[data-testid="create-breakout-button"]');
      await page.fill('[data-testid="breakout-name-input"]', 'Group A');
      await page.click('[data-testid="create-breakout-confirm"]');

      // Verify breakout room is visible to both instructors
      await expect(page.locator('[data-testid="breakout-room-Group A"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="breakout-room-Group A"]')).toBeVisible();

      // Second instructor creates another breakout room
      await instructor2Page.click('[data-testid="create-breakout-button"]');
      await instructor2Page.fill('[data-testid="breakout-name-input"]', 'Group B');
      await instructor2Page.click('[data-testid="create-breakout-confirm"]');

      // Both breakout rooms should be visible to both instructors
      await expect(page.locator('[data-testid="breakout-room-Group A"]')).toBeVisible();
      await expect(page.locator('[data-testid="breakout-room-Group B"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="breakout-room-Group A"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="breakout-room-Group B"]')).toBeVisible();

      await instructor2Context?.close();
    }
  });

  test('should maintain instructor state when one instructor leaves', async ({ page, context }) => {
    // Set up two instructors
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Persistent Instructor');
    await page.click('[data-testid="join-as-instructor"]');

    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    if (instructor2Page) {
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Leaving Instructor');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      // Verify both instructors are present
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('2');

      // Second instructor creates a breakout room
      await instructor2Page.click('[data-testid="create-breakout-button"]');
      await instructor2Page.fill('[data-testid="breakout-name-input"]', 'Persistent Group');
      await instructor2Page.click('[data-testid="create-breakout-confirm"]');

      // Verify breakout room exists
      await expect(page.locator('[data-testid="breakout-room-Persistent Group"]')).toBeVisible();

      // Second instructor leaves
      await instructor2Page.click('[data-testid="return-to-lobby"]');

      // First instructor should still have access to all controls
      await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="mute-all-button"]')).toBeEnabled();
      await expect(page.locator('[data-testid="create-breakout-button"]')).toBeEnabled();

      // Breakout room should still be accessible
      await expect(page.locator('[data-testid="breakout-room-Persistent Group"]')).toBeVisible();

      // Participant count should update
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('1');

      await instructor2Context?.close();
    }
  });

  test('should handle instructor privilege validation with multiple instructors', async ({ page, context }) => {
    // Set up instructor and student
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Privilege Instructor');
    await page.click('[data-testid="join-as-instructor"]');

    const studentContext = await context.browser()?.newContext();
    const studentPage = await studentContext?.newPage();

    if (studentPage) {
      // Student joins same classroom
      await studentPage.goto('http://localhost:3000');
      await studentPage.click('text=Cohort 1');
      await studentPage.fill('[data-testid="name-input"]', 'Regular Student');
      await studentPage.click('[data-testid="join-as-student"]');

      // Verify instructor has controls that student doesn't
      await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
      await expect(studentPage.locator('[data-testid="instructor-controls"]')).not.toBeVisible();

      // Instructor can mute student
      await expect(page.locator('[data-testid="mute-participant-Regular Student"]')).toBeVisible();

      // Student cannot mute instructor
      await expect(studentPage.locator('[data-testid="mute-participant-Privilege Instructor"]')).not.toBeVisible();

      // Add second instructor
      const instructor2Context = await context.browser()?.newContext();
      const instructor2Page = await instructor2Context?.newPage();

      if (instructor2Page) {
        await instructor2Page.goto('http://localhost:3000');
        await instructor2Page.click('[data-testid="instructors-toggle"]');
        await instructor2Page.click('text=Cohort 1');
        await instructor2Page.fill('[data-testid="name-input"]', 'Second Instructor');
        await instructor2Page.click('[data-testid="join-as-instructor"]');

        // Both instructors should be able to control the student
        await expect(page.locator('[data-testid="mute-participant-Regular Student"]')).toBeVisible();
        await expect(instructor2Page.locator('[data-testid="mute-participant-Regular Student"]')).toBeVisible();

        // Instructors should be able to control each other (equal privileges)
        await expect(page.locator('[data-testid="mute-participant-Second Instructor"]')).toBeVisible();
        await expect(instructor2Page.locator('[data-testid="mute-participant-Privilege Instructor"]')).toBeVisible();

        await instructor2Context?.close();
      }

      await studentContext?.close();
    }
  });

  test('should handle instructor role transitions correctly', async ({ page, context }) => {
    // Start as student, then switch to instructor mode
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Role Switcher');
    await page.click('[data-testid="join-as-student"]');

    await expect(page).toHaveURL(/\/classroom\/1/);
    await expect(page.locator('[data-testid="instructor-controls"]')).not.toBeVisible();

    // Return to lobby and switch to instructor mode
    await page.click('[data-testid="return-to-lobby"]');
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');

    // Name should be pre-filled, but role should change to instructor
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('Role Switcher');
    await expect(page.locator('[data-testid="role-indicator"]')).toContainText('instructor');

    await page.click('[data-testid="join-as-instructor"]');

    // Now should have instructor controls
    await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();

    // Add another instructor to verify multiple instructor functionality
    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    if (instructor2Page) {
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Always Instructor');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      // Both should have instructor privileges
      await expect(page.locator('[data-testid="instructor-controls"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="instructor-controls"]')).toBeVisible();

      await instructor2Context?.close();
    }
  });

  test('should handle instructor communication and coordination', async ({ page, context }) => {
    // Set up multiple instructors and students
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Lead Instructor');
    await page.click('[data-testid="join-as-instructor"]');

    const instructor2Context = await context.browser()?.newContext();
    const instructor2Page = await instructor2Context?.newPage();

    const student1Context = await context.browser()?.newContext();
    const student1Page = await student1Context?.newPage();

    const student2Context = await context.browser()?.newContext();
    const student2Page = await student2Context?.newPage();

    if (instructor2Page && student1Page && student2Page) {
      // Second instructor joins
      await instructor2Page.goto('http://localhost:3000');
      await instructor2Page.click('[data-testid="instructors-toggle"]');
      await instructor2Page.click('text=Cohort 1');
      await instructor2Page.fill('[data-testid="name-input"]', 'Assistant Instructor');
      await instructor2Page.click('[data-testid="join-as-instructor"]');

      // Students join
      await student1Page.goto('http://localhost:3000');
      await student1Page.click('text=Cohort 1');
      await student1Page.fill('[data-testid="name-input"]', 'Student 1');
      await student1Page.click('[data-testid="join-as-student"]');

      await student2Page.goto('http://localhost:3000');
      await student2Page.click('text=Cohort 1');
      await student2Page.fill('[data-testid="name-input"]', 'Student 2');
      await student2Page.click('[data-testid="join-as-student"]');

      // Wait for all participants
      await expect(page.locator('[data-testid="participant-count"]')).toContainText('4');

      // Test coordinated actions
      // First instructor mutes Student 1
      await page.click('[data-testid="mute-participant-Student 1"]');
      
      // Second instructor creates breakout room with Student 2
      await instructor2Page.click('[data-testid="create-breakout-button"]');
      await instructor2Page.fill('[data-testid="breakout-name-input"]', 'Study Group');
      
      // Select Student 2 for breakout room
      await instructor2Page.check('[data-testid="participant-checkbox-Student 2"]');
      await instructor2Page.click('[data-testid="create-breakout-confirm"]');

      // Verify actions are visible to both instructors
      await expect(page.locator('[data-testid="participant-Student 1-muted"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="participant-Student 1-muted"]')).toBeVisible();

      await expect(page.locator('[data-testid="breakout-room-Study Group"]')).toBeVisible();
      await expect(instructor2Page.locator('[data-testid="breakout-room-Study Group"]')).toBeVisible();

      // Clean up contexts
      await instructor2Context?.close();
      await student1Context?.close();
      await student2Context?.close();
    }
  });
});
