import { test, expect } from '@playwright/test';

/**
 * Integration Test: Student Journey
 * 
 * Tests the complete student workflow from lobby navigation to classroom switching.
 * Validates core user experience for students using the Overcast application.
 * 
 * Based on Quickstart Workflow 1: Student Journey (Basic Path)
 */

test.describe('Student Journey Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
  });

  test('should complete full student journey from lobby to classroom switching', async ({ page }) => {
    // Step 1: Open Application and verify main lobby
    await expect(page).toHaveTitle(/Overcast/);
    
    // Verify 6 classroom options are displayed
    const classrooms = page.locator('[data-testid="classroom-option"]');
    await expect(classrooms).toHaveCount(6);
    
    // Verify futuristic black/teal design theme
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(0, 0, 0)'); // Black background
    
    // Verify "Powered by the Overclock Accelerator" branding
    await expect(page.locator('text=Powered by the Overclock Accelerator')).toBeVisible();
    
    // Step 2: View Classroom Options
    // Verify classroom names are simple (Cohort 1, Cohort 2, etc.)
    await expect(page.locator('text=Cohort 1')).toBeVisible();
    await expect(page.locator('text=Cohort 2')).toBeVisible();
    await expect(page.locator('text=Cohort 3')).toBeVisible();
    await expect(page.locator('text=Cohort 4')).toBeVisible();
    await expect(page.locator('text=Cohort 5')).toBeVisible();
    await expect(page.locator('text=Cohort 6')).toBeVisible();
    
    // Verify Students/Instructors toggle buttons are visible
    await expect(page.locator('[data-testid="students-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructors-toggle"]')).toBeVisible();
    
    // Step 3: Join First Classroom
    await page.click('text=Cohort 1');
    
    // Verify name entry prompt appears
    await expect(page.locator('[data-testid="name-entry-modal"]')).toBeVisible();
    
    // Enter name and join as student
    await page.fill('[data-testid="name-input"]', 'Test Student');
    await page.click('[data-testid="join-as-student"]');
    
    // Step 4: Verify Video Connection and Classroom View
    // Should be redirected to classroom video view
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Verify video feed area is visible
    await expect(page.locator('[data-testid="video-feed-area"]')).toBeVisible();
    
    // Verify "Return to Main Lobby" button is present
    await expect(page.locator('[data-testid="return-to-lobby"]')).toBeVisible();
    
    // Verify no instructor controls are visible (student mode)
    await expect(page.locator('[data-testid="instructor-controls"]')).not.toBeVisible();
    
    // Verify audio/video controls are available
    await expect(page.locator('[data-testid="audio-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-controls"]')).toBeVisible();
    
    // Step 5: Return to Lobby
    await page.click('[data-testid="return-to-lobby"]');
    
    // Verify back to main lobby view
    await expect(page).toHaveURL('http://localhost:3000');
    await expect(classrooms).toHaveCount(6);
    
    // Step 6: Switch to Different Classroom
    await page.click('text=Cohort 2');
    
    // Name should be pre-filled from previous session
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('Test Student');
    
    await page.click('[data-testid="join-as-student"]');
    
    // Should automatically leave Cohort 1 and join Cohort 2
    await expect(page).toHaveURL(/\/classroom\/2/);
    
    // Verify video feed shows new classroom
    await expect(page.locator('[data-testid="video-feed-area"]')).toBeVisible();
    
    // Verify classroom identifier shows Cohort 2
    await expect(page.locator('[data-testid="classroom-name"]')).toHaveText('Cohort 2');
  });

  test('should handle classroom capacity limits gracefully', async ({ page }) => {
    // This test simulates the capacity limit scenario
    // In a real test, you would need to mock the capacity or have multiple browser contexts
    
    // Navigate to classroom
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Student');
    
    // Mock a full classroom response (this would be implemented with API mocking)
    await page.route('**/api/rooms/1/join', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Classroom full' })
      });
    });
    
    await page.click('[data-testid="join-as-student"]');
    
    // Verify "Classroom full" message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Classroom full');
    
    // Verify user cannot join when at capacity
    await expect(page).toHaveURL('http://localhost:3000'); // Should stay on lobby
  });

  test('should maintain session state when switching between lobby and classrooms', async ({ page }) => {
    // Join a classroom
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Session Test User');
    await page.click('[data-testid="join-as-student"]');
    
    // Verify in classroom
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Return to lobby
    await page.click('[data-testid="return-to-lobby"]');
    
    // Join different classroom - name should be remembered
    await page.click('text=Cohort 3');
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('Session Test User');
    
    // Join and verify session continuity
    await page.click('[data-testid="join-as-student"]');
    await expect(page).toHaveURL(/\/classroom\/3/);
    
    // Verify user identity is maintained
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Session Test User');
  });

  test('should handle network disconnection gracefully', async ({ page }) => {
    // Join a classroom first
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Network Test User');
    await page.click('[data-testid="join-as-student"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Simulate network disconnection by going offline
    await page.context().setOffline(true);
    
    // Verify connection state updates to disconnected
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('disconnected');
    
    // Re-enable network
    await page.context().setOffline(false);
    
    // Verify automatic reconnection attempt
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('connected', { timeout: 10000 });
  });

  test('should handle invalid classroom access gracefully', async ({ page }) => {
    // Manually navigate to invalid classroom ID
    await page.goto('http://localhost:3000/classroom/7');
    
    // Should redirect to lobby or show error page
    await expect(page).toHaveURL('http://localhost:3000');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid classroom');
  });
});
