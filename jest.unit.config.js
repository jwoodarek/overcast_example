// Jest configuration for unit tests
// Unit tests for components and utilities

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const unitConfig = {
  displayName: 'unit',
  testMatch: ['<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/types/(.*)$': '<rootDir>/lib/types/$1'
  },
};

module.exports = createJestConfig(unitConfig);


