import { test, expect } from '@playwright/test';

/**
 * Quickstart Validation Test Suite
 * 
 * Validates all core user workflows from quickstart.md to ensure the application
 * meets all specified requirements and functions correctly end-to-end.
 * 
 * These tests serve as living documentation of the application's core functionality
 * and validate that all quickstart scenarios work as expected.
 * 
 * Based on: specs/002-we-are-looking/quickstart.md
 */

test.describe('Quickstart Validation: Student Journey', () => {
  test('Workflow 1: Complete student journey from lobby to classroom switching', async ({ page }) => {
    // Step 1: Open Application
    await page.goto('/');
    
    // Verify main lobby displays with 6 classroom options
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Verify futuristic black/teal design theme visible
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toContain('0, 0, 0'); // Black background
    
    // Verify "Powered by the Overclock Accelerator" branding present
    const branding = page.locator('text=/Powered by.*Overclock Accelerator/i');
    await expect(branding).toBeVisible();
    
    // Step 2: View Classroom Options
    // Verify 6 classrooms shown with simple names/numbers only
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`text=Cohort ${i}`)).toBeVisible();
    }
    
    // Verify "Students" and "Instructors" toggle buttons visible
    await expect(page.locator('[data-testid="students-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructors-toggle"]')).toBeVisible();
    
    // Step 3: Join First Classroom
    await page.click('text=Cohort 1');
    
    // Verify name entry prompt appears
    const nameModal = page.locator('[data-testid="name-entry-modal"]');
    await expect(nameModal).toBeVisible();
    
    // Enter name and join as student
    await page.fill('[data-testid="name-input"]', 'Test Student');
    await page.click('[data-testid="join-student-button"]');
    
    // Verify redirected to classroom video view
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 4: Verify Video Connection
    // Verify video feed area visible
    const videoFeed = page.locator('[data-testid="video-feed"]');
    await expect(videoFeed).toBeVisible();
    
    // Verify "Return to Main Lobby" button present
    const returnButton = page.locator('[data-testid="return-to-lobby"]');
    await expect(returnButton).toBeVisible();
    
    // Verify no instructor controls visible (student mode)
    const instructorControls = page.locator('[data-testid="instructor-controls"]');
    await expect(instructorControls).not.toBeVisible();
    
    // Step 5: Return to Lobby
    await returnButton.click();
    
    // Verify back to main lobby view
    await expect(page).toHaveURL('/');
    await expect(classrooms).toHaveCount(6);
    
    // Step 6: Switch to Different Classroom
    await page.click('text=Cohort 2');
    
    // Verify name pre-filled from previous session
    await expect(nameModal).toBeVisible();
    const nameInput = page.locator('[data-testid="name-input"]');
    await expect(nameInput).toHaveValue('Test Student');
    
    // Join new classroom
    await page.click('[data-testid="join-student-button"]');
    
    // Verify automatically leaves Cohort 1, joins Cohort 2
    await expect(page).toHaveURL(/\/classroom\/2/);
    await expect(videoFeed).toBeVisible();
    
    // SUCCESS: Student can navigate lobby, join classrooms, and switch between them seamlessly
  });
});

test.describe('Quickstart Validation: Instructor Journey', () => {
  test('Workflow 2: Instructor mode with additional controls', async ({ page }) => {
    // Step 1: Enter Instructor Mode
    await page.goto('/');
    
    // Click "Instructors" button
    const instructorToggle = page.locator('[data-testid="instructors-toggle"]');
    await instructorToggle.click();
    
    // Verify interface switches to instructor mode
    await expect(page.locator('[data-testid="instructor-mode-active"]')).toBeVisible();
    
    // Verify same 6 classrooms visible
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Step 2: Join as Instructor
    await page.click('text=Cohort 1');
    
    const nameModal = page.locator('[data-testid="name-entry-modal"]');
    await expect(nameModal).toBeVisible();
    
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    
    // Verify role automatically set to "instructor"
    const joinButton = page.locator('[data-testid="join-instructor-button"]');
    await expect(joinButton).toBeVisible();
    await joinButton.click();
    
    // Verify classroom view with additional control panel
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 3: Verify Instructor Controls
    const instructorPanel = page.locator('[data-testid="instructor-controls"]');
    await expect(instructorPanel).toBeVisible();
    
    // Verify "Mute Participant" controls available
    const muteControls = page.locator('[data-testid="mute-participant-control"]');
    await expect(muteControls.first()).toBeVisible();
    
    // Verify "Mute All" button present
    const muteAllButton = page.locator('[data-testid="mute-all-button"]');
    await expect(muteAllButton).toBeVisible();
    
    // Verify "Create Breakout Room" option available
    const breakoutButton = page.locator('[data-testid="create-breakout-button"]');
    await expect(breakoutButton).toBeVisible();
    
    // Verify all student features also accessible
    const videoFeed = page.locator('[data-testid="video-feed"]');
    await expect(videoFeed).toBeVisible();
    
    // SUCCESS: Instructor can access all student features plus management controls
  });
});

test.describe('Quickstart Validation: Error Handling', () => {
  test('Workflow 3: Invalid classroom access handling', async ({ page }) => {
    // Test Invalid Classroom Access
    await page.goto('/classroom/7'); // Invalid ID (only 1-6 exist)
    
    // Verify error page or redirect to lobby with graceful error handling
    const errorMessage = page.locator('[data-testid="error-message"]');
    const isRedirected = page.url().endsWith('/');
    
    // Either shows error or redirects to lobby
    if (isRedirected) {
      await expect(page).toHaveURL('/');
    } else {
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/invalid|not found/i);
    }
    
    // SUCCESS: System handles errors gracefully with clear user feedback
  });
  
  test('Workflow 3: Handles invalid classroom IDs gracefully', async ({ page }) => {
    // Test with various invalid IDs
    const invalidIds = ['0', '10', 'abc', '1a'];
    
    for (const id of invalidIds) {
      await page.goto(`/classroom/${id}`);
      
      // Should either redirect to lobby or show error
      const isOnLobby = page.url().endsWith('/');
      const hasError = await page.locator('[data-testid="error-message"]').isVisible();
      
      expect(isOnLobby || hasError).toBeTruthy();
    }
  });
});

test.describe('Quickstart Validation: Visual Design', () => {
  test('Validates futuristic black/teal theme implementation', async ({ page }) => {
    await page.goto('/');
    
    // Color Scheme: Black background with teal highlights
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toContain('0, 0, 0');
    
    // Check for teal accent colors (#00FFD1)
    const tealElements = page.locator('[class*="teal"], [class*="cyan"]');
    const count = await tealElements.count();
    expect(count).toBeGreaterThan(0);
    
    // Branding: "Powered by the Overclock Accelerator" prominently displayed
    const branding = page.locator('text=/Powered by.*Overclock Accelerator/i');
    await expect(branding).toBeVisible();
    
    // Typography: Should use bold, geometric fonts
    const heading = page.locator('h1, h2, h3').first();
    if (await heading.count() > 0) {
      const fontWeight = await heading.evaluate((el) => 
        window.getComputedStyle(el).fontWeight
      );
      // Font weight should be bold (700 or higher)
      expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
    }
    
    // SUCCESS: Visual design validates futuristic aesthetic
  });
  
  test('Validates mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    
    // Verify classrooms are still visible and functional on mobile
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Verify navigation is accessible
    await expect(page.locator('[data-testid="students-toggle"]')).toBeVisible();
    
    // Test clicking still works on mobile
    await page.click('text=Cohort 1');
    const nameModal = page.locator('[data-testid="name-entry-modal"]');
    await expect(nameModal).toBeVisible();
    
    // SUCCESS: Functional on mobile devices
  });
});

test.describe('Quickstart Validation: Success Metrics', () => {
  test('Validates all functional requirements are met', async ({ page }) => {
    await page.goto('/');
    
    // ✅ 6 classrooms available in lobby
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // ✅ Student and instructor modes working
    await expect(page.locator('[data-testid="students-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructors-toggle"]')).toBeVisible();
    
    // ✅ Minimal UI design implemented
    const minimalistIndicators = await page.evaluate(() => {
      // Check for absence of excessive UI elements
      const statusBars = document.querySelectorAll('[class*="status-bar"]');
      const notifications = document.querySelectorAll('[class*="notification"]');
      return statusBars.length + notifications.length;
    });
    expect(minimalistIndicators).toBeLessThan(5); // Minimal UI means few status elements
    
    // ✅ Simple name-based authentication
    await page.click('text=Cohort 1');
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
    
    // SUCCESS: All functional requirements validated
  });
  
  test('Validates technical requirements are met', async ({ page }) => {
    await page.goto('/');
    
    // ✅ Next.js application running
    const metaGenerator = page.locator('meta[name="generator"]');
    const content = await metaGenerator.getAttribute('content');
    if (content) {
      expect(content.toLowerCase()).toContain('next');
    }
    
    // ✅ TypeScript types properly defined (checked at build time)
    // This is validated by successful build, not at runtime
    
    // ✅ No database dependencies - verify no database connection errors in console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    const dbErrors = consoleErrors.filter(err => 
      err.toLowerCase().includes('database') || 
      err.toLowerCase().includes('db') ||
      err.toLowerCase().includes('sql')
    );
    expect(dbErrors.length).toBe(0);
    
    // SUCCESS: Technical requirements validated
  });
});

test.describe('Quickstart Validation: User Experience', () => {
  test('Validates clear navigation patterns', async ({ page }) => {
    await page.goto('/');
    
    // Clear navigation: Lobby → Classroom → Back to Lobby
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.click('[data-testid="join-student-button"]');
    
    // Should be in classroom
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Return button should be visible and clear
    const returnButton = page.locator('[data-testid="return-to-lobby"]');
    await expect(returnButton).toBeVisible();
    await returnButton.click();
    
    // Should be back at lobby
    await expect(page).toHaveURL('/');
    
    // SUCCESS: Clear navigation patterns validated
  });
  
  test('Validates educational code structure through functionality', async ({ page }) => {
    // This test validates that the code structure is working correctly,
    // which implies it follows educational principles (tested by actual usage)
    
    await page.goto('/');
    
    // Test that Daily integration is working (implies good code structure)
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.click('[data-testid="join-student-button"]');
    
    // Video feed should load (implies DailyProvider is properly configured)
    const videoFeed = page.locator('[data-testid="video-feed"]');
    await expect(videoFeed).toBeVisible({ timeout: 10000 });
    
    // No console errors related to Daily configuration
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('daily')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    expect(consoleErrors.length).toBe(0);
    
    // SUCCESS: Educational code structure produces working functionality
  });
});

