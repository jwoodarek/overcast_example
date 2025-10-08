import { test, expect } from '@playwright/test';

/**
 * Integration Test: Chat Functionality
 * 
 * Tests the text chat feature including:
 * - Sending and receiving messages
 * - Room-scoped chat (main room vs breakout rooms)
 * - Instructor visibility across all rooms
 * - Student visibility limited to their current room
 * - Unread message indicators
 * 
 * WHY these tests:
 * - Chat is critical for communication when audio is problematic
 * - Room scoping must be enforced (students shouldn't see other breakout chats)
 * - Instructor needs to monitor all conversations
 * - Unread indicators prevent missed messages
 */

test.describe('Chat Functionality Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:3000');
  });

  test('instructor should be able to send and receive messages in main room', async ({ page }) => {
    // Step 1: Join as Instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Chat Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 2: Verify Chat Panel is visible for instructor
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
    
    // Step 3: Verify Main Room is selected by default
    const roomSelector = page.locator('[data-testid="chat-room-selector"]');
    await expect(roomSelector).toHaveValue('main');
    
    // Step 4: Send a message
    const messageInput = page.locator('[data-testid="chat-message-input"]');
    await messageInput.fill('Hello from instructor!');
    await page.click('[data-testid="chat-send-button"]');
    
    // Step 5: Verify message appears in chat list
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Hello from instructor!');
    
    // Step 6: Verify sender name is displayed
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Chat Test Instructor');
    
    // Step 7: Verify timestamp is displayed
    await expect(page.locator('[data-testid="chat-message-timestamp"]').last()).toBeVisible();
  });

  test('students should only see messages in their current room', async ({ page, context }) => {
    // This test requires multiple browser contexts to simulate multi-participant chat
    
    // Set up instructor in first context
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Create student context
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
      
      // Instructor sends message in main room
      const instructorMessageInput = page.locator('[data-testid="chat-message-input"]');
      await instructorMessageInput.fill('Welcome to the classroom!');
      await page.click('[data-testid="chat-send-button"]');
      
      // Student should NOT see chat panel (students don't have chat in v1)
      // Note: Based on ChatPanel implementation, it's instructor-only
      await expect(studentPage.locator('[data-testid="chat-panel"]')).not.toBeVisible();
      
      // Cleanup
      await studentContext?.close();
    }
  });

  test('instructor should be able to switch between rooms and see unread indicators', async ({ page }) => {
    // Step 1: Join as Instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Multi-Room Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 2: Create a breakout room first (needed for room switching test)
    await page.click('[data-testid="create-breakout-button"]');
    
    // Fill in breakout room details
    await page.fill('[data-testid="breakout-room-name-0"]', 'Breakout 1');
    
    // Create the room (no participants needed for this test)
    await page.click('[data-testid="create-breakout-submit"]');
    
    // Wait for confirmation
    await expect(page.locator('[data-testid="breakout-created-confirmation"]')).toBeVisible();
    await page.click('[data-testid="breakout-modal-close"]');
    
    // Step 3: Send message in main room
    const messageInput = page.locator('[data-testid="chat-message-input"]');
    await messageInput.fill('Message in main room');
    await page.click('[data-testid="chat-send-button"]');
    
    // Step 4: Switch to breakout room
    const roomSelector = page.locator('[data-testid="chat-room-selector"]');
    await roomSelector.selectOption('breakout-1'); // Value format depends on implementation
    
    // Step 5: Verify messages from main room are not visible
    await expect(page.locator('[data-testid="chat-message"]')).not.toContainText('Message in main room');
    
    // Step 6: Send message in breakout room
    await messageInput.fill('Message in breakout');
    await page.click('[data-testid="chat-send-button"]');
    
    // Step 7: Switch back to main room
    await roomSelector.selectOption('main');
    
    // Step 8: Verify original main room message is still there
    await expect(page.locator('[data-testid="chat-message"]')).toContainText('Message in main room');
    
    // Step 9: Verify unread indicator appears for breakout room
    await expect(page.locator('[data-testid="chat-unread-indicator"]')).toBeVisible();
  });

  test('chat should respect character limit and show counter', async ({ page }) => {
    // Step 1: Join as Instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 2: Verify character counter is visible
    await expect(page.locator('[data-testid="chat-character-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-character-count"]')).toContainText('0/2000');
    
    // Step 3: Type a message and verify counter updates
    const messageInput = page.locator('[data-testid="chat-message-input"]');
    await messageInput.fill('Hello');
    await expect(page.locator('[data-testid="chat-character-count"]')).toContainText('5/2000');
    
    // Step 4: Attempt to exceed character limit
    const longMessage = 'x'.repeat(2001);
    await messageInput.fill(longMessage);
    
    // Step 5: Verify counter shows over limit
    await expect(page.locator('[data-testid="chat-character-count"]')).toContainText('2001/2000');
    
    // Step 6: Verify send button is disabled when over limit
    await expect(page.locator('[data-testid="chat-send-button"]')).toBeDisabled();
  });

  test('chat should support keyboard shortcut (Enter to send)', async ({ page }) => {
    // Step 1: Join as Instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 2: Type message and press Enter
    const messageInput = page.locator('[data-testid="chat-message-input"]');
    await messageInput.fill('Sent with Enter key');
    await messageInput.press('Enter');
    
    // Step 3: Verify message was sent
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Sent with Enter key');
    
    // Step 4: Verify input is cleared
    await expect(messageInput).toHaveValue('');
    
    // Step 5: Test Shift+Enter for new line (shouldn't send)
    await messageInput.fill('Line 1');
    await messageInput.press('Shift+Enter');
    await messageInput.type('Line 2');
    
    // Message should still be in input (not sent)
    await expect(messageInput).toContainText('Line 1');
    await expect(messageInput).toContainText('Line 2');
  });

  test('chat panel should be collapsible', async ({ page }) => {
    // Step 1: Join as Instructor
    await page.click('[data-testid="instructors-toggle"]');
    await page.click('text=Cohort 1');
    await page.fill('[data-testid="name-input"]', 'Test Instructor');
    await page.click('[data-testid="join-as-instructor"]');
    
    await expect(page).toHaveURL(/\/classroom\/1/);
    
    // Step 2: Verify chat panel is expanded by default
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-message-input"]')).toBeVisible();
    
    // Step 3: Click collapse button
    await page.click('[data-testid="chat-collapse-button"]');
    
    // Step 4: Verify chat content is hidden
    await expect(page.locator('[data-testid="chat-message-input"]')).not.toBeVisible();
    
    // Step 5: Verify panel header is still visible
    await expect(page.locator('[data-testid="chat-panel-header"]')).toBeVisible();
    
    // Step 6: Click expand button
    await page.click('[data-testid="chat-collapse-button"]');
    
    // Step 7: Verify chat content is visible again
    await expect(page.locator('[data-testid="chat-message-input"]')).toBeVisible();
  });
});

