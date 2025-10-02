# Validation and Performance Testing Guide

This guide covers the validation and performance testing suites for the Overcast Video Classroom Application.

## Overview

The validation and performance tests ensure the application meets all specified requirements from the quickstart guide and performs within acceptable thresholds.

## Test Suites

### 1. Quickstart Validation Tests (`test_quickstart_validation.test.ts`)

Validates all core user workflows from `specs/002-we-are-looking/quickstart.md`:

#### Test Categories

**Student Journey**
- Complete workflow from lobby to classroom switching
- Validates 6 classrooms are visible
- Verifies futuristic black/teal design theme
- Tests "Powered by the Overclock Accelerator" branding
- Validates student mode functionality
- Tests classroom switching with name persistence

**Instructor Journey**
- Instructor mode activation
- Additional control panel verification
- Mute participant controls
- Mute all functionality
- Breakout room creation
- Role-based feature access

**Error Handling**
- Invalid classroom ID handling
- Graceful error messages
- Redirect behavior for invalid routes

**Visual Design**
- Black/teal theme validation
- Typography verification (bold, geometric fonts)
- Mobile responsiveness testing
- Branding prominence

**Success Metrics**
- 6 classrooms available
- Student/instructor mode toggle
- Minimal UI implementation
- Name-based authentication
- Technical requirements (Next.js, TypeScript)
- No database dependencies

**User Experience**
- Clear navigation patterns
- Educational code structure validation
- Functional reliability

### 2. Performance Tests (`test_performance.test.ts`)

Validates performance requirements from quickstart guide:

#### Performance Targets

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| Lobby Page Load | <200ms | ✅ Single + 5-iteration average |
| Classroom Navigation | <50ms | ✅ Bidirectional testing |
| Video Connection | <100ms target* | ✅ Real WebRTC connection |
| Return to Lobby | <100ms | ✅ Navigation speed |

\* *Note: The <100ms video connection target is aspirational. Actual WebRTC connections via Daily.co typically take 1-5 seconds due to network setup. Tests validate reasonable connection times (<10-15 seconds).*

#### Test Categories

**Page Load Times**
- Main lobby load performance
- Consistency testing (5 iterations)
- Classroom navigation speed
- Return to lobby speed

**Video Connection Speed**
- Classroom join completion time
- Multiple rapid classroom switches
- Connection stability under switching

**Resource Usage**
- DOM element count (minimal UI validation)
- Memory leak detection during navigation
- Network request optimization
- Request count limits

**Interaction Responsiveness**
- Button click response time
- Text input lag detection
- Modal animation performance
- Non-blocking interactions

**Capacity and Scale**
- All 6 classrooms loading simultaneously
- Rapid interaction handling
- Page responsiveness under stress

**Performance Summary**
- Comprehensive metrics report
- All key performance indicators
- Production readiness validation

## Running the Tests

### Run All Validation Tests

```bash
# Run all integration tests (includes validation and performance)
npm run test:integration

# Run with headed browser (see tests execute)
npm run test:integration:headed

# Run with Playwright UI (interactive debugging)
npm run test:integration:ui
```

### Run Specific Test Suites

```bash
# Run only quickstart validation tests
npx playwright test test_quickstart_validation

# Run only performance tests
npx playwright test test_performance

# Run specific test by name
npx playwright test -g "Main lobby page loads"
```

### Run Tests in Specific Browsers

```bash
# Run in Chromium only
npx playwright test --project=chromium

# Run in all browsers
npx playwright test --project=chromium --project=firefox --project=webkit

# Run mobile tests
npx playwright test --project="Mobile Chrome"
```

### Debug Tests

```bash
# Run in debug mode (step through tests)
npx playwright test --debug

# Run specific test in debug mode
npx playwright test test_performance --debug

# Generate trace for failed tests
npx playwright test --trace on
```

## Test Results and Reports

### View HTML Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report includes:
- Test pass/fail status
- Execution time for each test
- Screenshots of failures
- Video recordings of failures
- Detailed error messages

### Performance Metrics

Performance tests output metrics to console:

```
========== PERFORMANCE SUMMARY ==========
Lobby Load (ms): 145.23
Classroom Navigation (ms): 78.45
Video Connection (ms): 3421.67
Return to Lobby (ms): 56.12
=========================================
```

### JSON Results

Test results are also saved to `test-results/results.json` for CI/CD integration.

## Continuous Integration

### GitHub Actions

Example workflow configuration:

```yaml
name: Validation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:integration
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Vercel Deployment

Add to `vercel.json`:

```json
{
  "buildCommand": "npm run build && npm run test:integration"
}
```

## Troubleshooting

### Tests Fail Due to Timeout

If video connection tests timeout:

1. Check Daily.co API key is configured
2. Verify network connectivity
3. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60 * 1000, // 60 seconds
   ```

### Performance Tests Fail

Performance can vary based on:
- Machine specifications
- Network conditions
- Background processes

To adjust thresholds:
- Edit `test_performance.test.ts`
- Increase time limits based on your environment
- Run multiple times to establish baseline

### Modal/Element Not Found

If selectors fail:
1. Verify component has correct `data-testid` attributes
2. Check if element is visible: `await expect(element).toBeVisible()`
3. Add explicit wait: `await page.waitForSelector('[data-testid="..."]')`

### Video Connection Never Establishes

Common causes:
- Missing Daily.co environment variables
- Invalid room URLs in `.env.local`
- Browser permissions not granted
- Firewall blocking WebRTC

Debug steps:
```bash
# Run with headed browser to see console errors
npm run test:integration:headed

# Check browser console for Daily.co errors
npx playwright test --debug
```

## Best Practices

### Writing New Validation Tests

1. **Follow quickstart structure**: Base tests on quickstart.md workflows
2. **Use descriptive names**: Test names should explain what is validated
3. **Add console logging**: Log performance metrics for debugging
4. **Test both happy and error paths**: Cover success and failure scenarios
5. **Use data-testid**: Always use `data-testid` for selectors (more stable)

### Performance Testing Guidelines

1. **Run multiple iterations**: Average across 3-5 runs for consistency
2. **Clear cache between runs**: Simulate fresh page loads
3. **Log all metrics**: Console output helps identify regressions
4. **Set reasonable thresholds**: Allow buffer for slower CI environments
5. **Test under load**: Include rapid interaction scenarios

### Maintaining Tests

- Update tests when quickstart.md changes
- Adjust performance thresholds based on production data
- Add new tests for new features
- Remove obsolete tests promptly
- Keep test data in sync with application

## Success Criteria

All tests should pass before:
- ✅ Merging pull requests
- ✅ Deploying to production
- ✅ Releasing new versions
- ✅ Stakeholder demos

## Next Steps

1. Run validation tests: `npm run test:integration`
2. Review performance metrics
3. Address any failing tests
4. Generate HTML report
5. Share results with team

For more information, see:
- `specs/002-we-are-looking/quickstart.md` - Complete validation scenarios
- `playwright.config.ts` - Test configuration
- `tests/integration/README.md` - Integration test overview

