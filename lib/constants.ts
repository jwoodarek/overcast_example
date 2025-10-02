// App constants for Overcast Video Classroom Application
// Centralized configuration following constitutional single-file preference

export const CLASSROOM_NAMES = [
  'Cohort Alpha',
  'Cohort Beta', 
  'Cohort Gamma',
  'Cohort Delta',
  'Cohort Epsilon',
  'Cohort Zeta'
] as const;

export const MAX_PARTICIPANTS_PER_CLASSROOM = 50;
export const TOTAL_CLASSROOMS = 6;

// Daily.co configuration constants
export const DAILY_CONFIG = {
  // Video quality settings for optimal performance
  videoQuality: {
    maxWidth: 1280,
    maxHeight: 720,
    maxFramerate: 30
  },
  
  // Audio settings
  audioSettings: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  
  // Connection timeouts
  timeouts: {
    connectionTimeout: 10000, // 10 seconds
    reconnectTimeout: 5000    // 5 seconds
  }
} as const;

// UI Constants
export const UI_CONSTANTS = {
  brandText: 'Powered by the Overclock Accelerator',
  appName: 'Overcast',
  loadingMessages: [
    'Connecting to classroom...',
    'Initializing video feed...',
    'Setting up audio...'
  ]
} as const;
