// Jest setup file for Overcast Video Classroom Application
// Configures testing environment and global test utilities

import '@testing-library/jest-dom';

// Mock Next.js router for component tests
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Daily.co for component tests
jest.mock('@daily-co/daily-js', () => ({
  DailyCall: jest.fn().mockImplementation(() => ({
    join: jest.fn().mockResolvedValue({}),
    leave: jest.fn().mockResolvedValue({}),
    participants: jest.fn().mockReturnValue({}),
    setUserName: jest.fn(),
    setLocalAudio: jest.fn(),
    setLocalVideo: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
  })),
}));

// Global test timeout for contract tests (API calls)
jest.setTimeout(10000);

// Suppress console.error during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
