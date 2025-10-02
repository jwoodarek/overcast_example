# Tests Directory

This directory contains all tests for the Overcast video classroom application, following Test-Driven Development (TDD) principles.

## Structure

- `contract/` - API contract tests (test API endpoints match OpenAPI specs)
- `integration/` - End-to-end user workflow tests (student/instructor journeys)
- `unit/` - Component and utility function tests

## Testing Strategy

### Contract Tests
Test that API routes match the OpenAPI specifications in `/specs/002-we-are-looking/contracts/`

### Integration Tests
Test complete user workflows from the quickstart guide:
- Student journey (lobby → classroom → switch rooms)
- Instructor journey (controls, muting, breakout rooms)
- Edge cases (capacity limits, multiple instructors)

### Unit Tests
Test individual components and utility functions in isolation.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test category
npm test -- tests/contract
npm test -- tests/integration
npm test -- tests/unit

# Run tests in watch mode
npm test -- --watch
```

All tests follow the constitutional principle of serving as living documentation with clear, descriptive names.
