// Jest configuration for Overcast Video Classroom Application
// Supports contract tests, integration tests, and unit tests

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Shared configuration for all test types
const baseConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module path mapping to match tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/types/(.*)$': '<rootDir>/lib/types/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

// Add any custom config to be passed to Jest
const customJestConfig = {
  ...baseConfig,
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/lib/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // Test categories - note: projects need to be created after Next.js transformation is applied
  projects: [
    '<rootDir>/jest.contract.config.js',
    '<rootDir>/jest.unit.config.js',
  ]
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
