# Integration Tests

This directory contains end-to-end integration tests for the Overcast Video Classroom Application using Playwright.

## Overview

The integration tests validate complete user workflows and ensure the application works correctly from a user's perspective. These tests run in real browsers and interact with the actual application interface.

## Test Files

- **`test_student_journey.test.ts`** - Tests the complete student workflow from lobby navigation to classroom switching
- **`test_instructor_journey.test.ts`** - Tests instructor-specific features and classroom management capabilities  
- **`test_capacity_limits.test.ts`** - Tests classroom capacity limits and error handling scenarios
- **`test_multiple_instructors.test.ts`** - Tests multiple instructor scenarios and privilege management

## Running Tests

### Prerequisites

1. Ensure the development server is running:
   ```bash
   npm run dev
   ```

2. Install Playwright browsers (first time only):
   ```bash
   npx playwright install
   ```

### Test Commands

```bash
# Run all integration tests
npm run test:integration

# Run tests with UI mode (interactive)
npm run test:integration:ui

# Run tests in headed mode (see browser)
npm run test:integration:headed

# Run specific test file
npx playwright test test_student_journey.test.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Configuration

The tests are configured via `playwright.config.ts` in the project root:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 30 seconds per test
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure

## Test Data and Mocking

The integration tests use:

- **Mock API responses** for testing error scenarios and capacity limits
- **Multiple browser contexts** to simulate different users (students/instructors)
- **Pre-defined test data** (classroom names, user names, etc.)

## Test Patterns

### Data Test IDs

Tests rely on `data-testid` attributes for reliable element selection:

```html
<button data-testid="join-as-student">Join as Student</button>
<div data-testid="video-feed-area">...</div>
<span data-testid="participant-count">2</span>
```

### Multi-User Testing

Tests that require multiple users create separate browser contexts:

```typescript
const instructor2Context = await context.browser()?.newContext();
const instructor2Page = await instructor2Context?.newPage();
```

### API Mocking

Tests mock API responses for predictable scenarios:

```typescript
await page.route('**/api/rooms/1/join', async route => {
  await route.fulfill({
    status: 400,
    body: JSON.stringify({ error: 'Classroom full' })
  });
});
```

## Debugging Tests

### Visual Debugging

1. Use UI mode for interactive debugging:
   ```bash
   npm run test:integration:ui
   ```

2. Run in headed mode to see browser actions:
   ```bash
   npm run test:integration:headed
   ```

### Debug Output

- **Screenshots**: Saved to `test-results/` on failure
- **Videos**: Saved to `test-results/` on failure  
- **Traces**: Available for failed test retries
- **HTML Report**: Generated after test runs

### Common Issues

1. **Server not ready**: Ensure `npm run dev` is running
2. **Element not found**: Check data-testid attributes exist
3. **Timeout errors**: Increase timeout or check for loading states
4. **Browser permissions**: Some tests require camera/microphone access

## Test Coverage

The integration tests cover:

- ✅ Student lobby navigation and classroom joining
- ✅ Instructor mode switching and privilege validation  
- ✅ Classroom capacity limits and error handling
- ✅ Multiple instructor scenarios and coordination
- ✅ Session state management across navigation
- ✅ Network disconnection and reconnection
- ✅ Invalid classroom access handling
- ✅ Role-based UI rendering and controls

## Continuous Integration

On CI environments:

- Tests run in headless mode
- Retries are enabled (2 attempts)
- Results are saved in JUnit XML format
- Screenshots and videos are captured on failure

## Performance Considerations

- Tests run in parallel by default
- Each test is isolated with fresh browser context
- Global setup ensures server readiness
- Cleanup is handled automatically by Playwright
