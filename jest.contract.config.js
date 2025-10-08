// Jest configuration for contract tests
// Contract tests run against actual API endpoints

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const contractConfig = {
  displayName: 'contract',
  testMatch: ['<rootDir>/tests/contract/**/*.test.{js,jsx,ts,tsx}'],
  testEnvironment: 'node', // Contract tests run against actual API
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/types/(.*)$': '<rootDir>/lib/types/$1'
  },
};

module.exports = createJestConfig(contractConfig);


