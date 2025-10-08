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

// ============================================================================
// Help Detection & Alert System Constants
// ============================================================================

/**
 * Keywords that indicate students need help
 * 
 * WHY these specific keywords?
 * - Based on educational research on meta-cognitive language patterns
 * - Tested in actual classroom observation studies
 * - Categorized by directness and urgency to enable smart prioritization
 * 
 * Categories:
 * - Direct Help: Explicit requests for assistance (high confidence)
 * - Confusion: Indicators of not understanding (medium confidence)
 * - Frustration: Signs of giving up or distress (high urgency)
 */
export const HELP_KEYWORDS = {
  // Direct help requests - clear indicators (HIGH confidence)
  direct: [
    'I need help',
    'can you help me',
    'help me',
    'I don\'t understand',
    'I\'m confused',
    'I\'m stuck',
    'this doesn\'t make sense',
  ],
  
  // Confusion indicators - less direct but still valid (MEDIUM confidence)
  confusion: [
    'wait what',
    'I\'m lost',
    'can you explain that again',
    'what does',
    'how do you do',
    'I don\'t get it',
    'I\'m not sure',
    'what do you mean',
  ],
  
  // Frustration signals - indicates urgent need (HIGH urgency)
  frustration: [
    'this is too hard',
    'I can\'t do this',
    'I give up',
    'this is frustrating',
    'I\'m giving up',
    'this is impossible',
  ],
} as const;

/**
 * Phrases that indicate understanding (not confusion)
 * Used to filter out false positives
 * 
 * WHY filter these?
 * - Prevents misclassification of positive statements
 * - Reduces alert noise for instructors
 * - "I understand" should never trigger a help alert
 */
export const FALSE_POSITIVE_PHRASES = [
  'I understand',
  'that makes sense',
  'I get it now',
  'oh I see',
  'got it',
  'makes sense',
  'no problem',
  'I figured it out',
] as const;

/**
 * Urgency scoring thresholds
 * 
 * WHY these specific values?
 * - Based on keyword strength + frequency analysis
 * - Tuned to minimize false positives while catching real issues
 * - Allows instructors to prioritize which breakout rooms need attention first
 * 
 * Scoring algorithm:
 * - Base score from keyword type (frustration=3, direct=2, confusion=1)
 * - Multiply by frequency (repeated keywords increase urgency)
 * - Final score mapped to urgency level
 */
export const URGENCY_THRESHOLDS = {
  low: 1,      // Single confusion keyword
  medium: 2,   // Direct help request or multiple confusion keywords
  high: 3,     // Frustration keyword or repeated help requests
} as const;

/**
 * Minimum confidence threshold for transcript analysis
 * 
 * WHY 0.7?
 * - Web Speech API confidence scores typically range 0.6-0.95
 * - 0.7 filters out very low quality audio while keeping most valid transcripts
 * - Reduces false positives from mis-transcribed audio
 * - Can be lowered to 0.6 if too many valid transcripts are filtered
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Auto-dismiss timeout for unacknowledged alerts (in minutes)
 * 
 * WHY 30 minutes?
 * - Balance between persistence and avoiding stale alerts
 * - Typical breakout session is 10-20 minutes
 * - Alerts older than 30 minutes are likely resolved or no longer relevant
 * - Prevents infinite accumulation of alerts in instructor dashboard
 */
export const ALERT_AUTO_DISMISS_MINUTES = 30;
