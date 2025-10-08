// TypeScript type definitions for Overcast Video Classroom Application
// Based on data-model.md and API contracts (rooms-api.yaml, participants-api.yaml)

// Daily React integration types (from @daily-co/daily-js)
import { DailyParticipant, DailyCall } from '@daily-co/daily-js';

// Re-export Daily types for convenience
export type { DailyParticipant, DailyCall };

/**
 * Application-specific user context
 * Represents a person using the application in either student or instructor mode
 */
export interface AppUser {
  name: string;                    // Display name entered by user (required, 1-50 characters)
  role: 'student' | 'instructor';  // User role determining available features
  sessionId: string;               // Unique identifier for current session (UUID)
  currentClassroom: string | null; // ID of classroom currently joined (1-6 or null)
  joinedAt: Date;                  // Timestamp when user joined current classroom
}

/**
 * Classroom configuration (static)
 * Represents one of 6 available video classroom sessions
 */
export interface Classroom {
  id: string;           // Classroom identifier ('1' through '6')
  name: string;         // Display name (e.g., "Cohort 1", "Cohort 2")
  dailyRoomUrl: string; // Pre-configured Daily.co room URL
  maxCapacity: number;  // Maximum participants (always 50)
}

/**
 * Runtime classroom state (derived from Daily hooks)
 * Current state of a classroom session with live participant data
 */
export interface ClassroomState {
  id: string;                      // Classroom identifier
  participants: DailyParticipant[]; // From useParticipantIds() + daily.participants()
  participantCount: number;        // Derived from participants.length
  isActive: boolean;               // Derived from participantCount > 0
  instructors: DailyParticipant[]; // Filtered by role
  students: DailyParticipant[];    // Filtered by role
}

/**
 * Participant state within a specific classroom
 * Represents a user's presence and state within a classroom
 */
export interface Participant {
  sessionId: string;               // Reference to User sessionId (UUID)
  name: string;                    // Display name
  role: 'student' | 'instructor';  // Role in this classroom
  classroomId: string;             // Reference to Classroom id (1-6)
  isAudioMuted: boolean;           // Audio state (can be controlled by instructors)
  isVideoEnabled: boolean;         // Video state
  connectionState: 'connecting' | 'connected' | 'disconnected'; // Connection status
  joinedAt: Date;                  // When participant joined this classroom
  dailyParticipantId?: string;     // Daily.co participant identifier (when connected)
}

/**
 * Breakout room (future enhancement)
 * Sub-session within a classroom created by instructors
 */
export interface BreakoutRoom {
  id: string;                      // Unique identifier for breakout room (UUID)
  parentClassroomId: string;       // Reference to main classroom (1-6)
  name: string;                    // Display name (e.g., "Group 1", "Discussion A")
  participantIds: string[];        // Daily participant session IDs
  createdBy: string;               // User sessionId of instructor who created it
  createdAt: Date;                 // Creation timestamp
  isActive: boolean;               // Whether breakout room is currently running
  maxDuration: number;             // Maximum duration in minutes (default 30)
  remainingTime?: number;          // Remaining time in minutes
}

/**
 * Daily React hook configurations
 * Configuration for Daily.co integration hooks
 */
export interface UseDailyConfig {
  url: string;                     // Daily room URL
  userName: string;                // User's display name
  token?: string;                  // Optional Daily token for auth
  audioSource?: boolean | string | MediaStreamTrack;
  videoSource?: boolean | string | MediaStreamTrack;
}

export interface UseParticipantConfig {
  onParticipantUpdated?(participant: DailyParticipant): void;
  onParticipantLeft?(participant: DailyParticipant): void;
}

/**
 * API Request/Response types
 * Based on OpenAPI contracts
 */

// Rooms API types
export interface JoinRoomRequest {
  name: string;                    // User display name (1-50 chars)
  role: 'student' | 'instructor';  // User role
}

export interface JoinRoomResponse {
  success: boolean;
  participant: Participant;
  dailyRoomUrl: string;           // Daily.co room URL
  token?: string;                 // Daily.co room token
}

export interface LeaveRoomRequest {
  sessionId: string;              // UUID of participant leaving
}

export interface ClassroomDetails extends Classroom {
  participantCount: number;       // Current number of participants (0-50)
  isActive: boolean;              // Whether classroom has any participants
  instructors: AppUser[];         // List of current instructors
  students: AppUser[];            // List of current students
  createdAt?: Date;               // When classroom session started
}

// Participants API types
export interface MuteParticipantRequest {
  instructorSessionId: string;    // UUID of instructor making request
  muted: boolean;                 // True to mute, false to unmute
  classroomId: string;            // Classroom where action is taking place (1-6)
}

export interface MuteAllParticipantsRequest {
  instructorSessionId: string;    // UUID of instructor making request
  classroomId: string;            // Target classroom (1-6)
  muted: boolean;                 // True to mute all, false to unmute all
  excludeInstructors?: boolean;   // Whether to exclude other instructors (default: true)
}

export interface CreateBreakoutRoomRequest {
  instructorSessionId: string;    // UUID of instructor creating the room
  parentClassroomId: string;      // Main classroom ID (1-6)
  name: string;                   // Breakout room name (1-50 chars)
  participantIds: string[];       // List of participant session IDs to include
  maxDuration?: number;           // Maximum duration in minutes (5-120, default: 30)
}

export interface CreateBreakoutRoomResponse {
  success: boolean;
  breakoutRoom: BreakoutRoom;
  dailyRoomUrl: string;           // Daily.co URL for the breakout room
}

/**
 * Participant permissions and status
 * Used for role-based UI rendering and access control
 */
export interface ParticipantPermissions {
  canMuteOthers: boolean;         // Can mute other participants
  canCreateBreakouts: boolean;    // Can create breakout rooms
  canEndBreakouts: boolean;       // Can end breakout rooms
}

export interface ParticipantStatus extends Participant {
  permissions: ParticipantPermissions;
  currentBreakoutRoom?: string;   // ID of current breakout room if in one
}

/**
 * Error handling types
 * Standardized error responses from API
 */
export interface ApiError {
  error: string;                  // Error type (e.g., "Bad Request", "Forbidden")
  message: string;                // Human-readable error message
  code?: string;                  // Optional error code (e.g., "INSUFFICIENT_PERMISSIONS")
}

export interface ClassroomFullError extends ApiError {
  maxCapacity: number;            // Maximum capacity (50)
  currentCount: number;           // Current participant count
}

/**
 * Connection and state management types
 * For managing Daily.co connection lifecycle
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
export type MeetingState = 'new' | 'joining' | 'joined' | 'left' | 'error';

/**
 * Utility types for form validation and UI state
 */
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

/**
 * =======================
 * INTELLIGENT EDUCATION FEATURES (Phase 3)
 * =======================
 * Types for transcript capture, help detection, and quiz generation
 */

/**
 * TranscriptEntry represents a single spoken utterance by a participant
 * 
 * WHY role-based speaker identification:
 * - Instructor speech is used for quiz generation (teaching content)
 * - Student speech is analyzed for help detection (confusion patterns)
 * - Role is determined at join time and stored with each transcript entry
 * 
 * WHY in-memory lifecycle:
 * - Transcripts are session-scoped (cleared when session ends)
 * - No database dependency for MVP (faster iteration, simpler deployment)
 * - Future: migrate to database for historical analysis and 90-day retention
 */
export interface TranscriptEntry {
  /**
   * Unique identifier for this transcript entry
   * Format: `${sessionId}-${timestamp}-${random}`
   */
  id: string;

  /**
   * Session ID (classroom or breakout room)
   * Matches Daily.co room session ID
   */
  sessionId: string;

  /**
   * Daily.co participant ID who spoke
   * Used to correlate with participant metadata
   */
  speakerId: string;

  /**
   * Role of the speaker (determined at join time)
   * WHY: Needed to filter instructor vs student speech for quiz generation
   */
  speakerRole: 'instructor' | 'student';

  /**
   * Display name of speaker
   * WHY: Useful for debugging and potential future features
   */
  speakerName: string;

  /**
   * Transcribed text content
   * Language: English (can expand later)
   */
  text: string;

  /**
   * When this was spoken (server timestamp)
   * WHY: Server timestamp is authoritative, client times can drift
   */
  timestamp: Date;

  /**
   * Transcription confidence score (0.0 - 1.0)
   * WHY: Used to filter low-confidence transcripts from analysis
   * Example: 0.95 = high confidence, 0.3 = poor audio quality
   */
  confidence: number;

  /**
   * Optional: Breakout room name if in breakout session
   * null if in main classroom
   */
  breakoutRoomName?: string | null;
}

/**
 * HelpAlert represents a detected instance of students needing help
 * 
 * WHY in-memory with auto-dismissal:
 * - Real-time alerts don't need persistence beyond session
 * - 30-minute auto-dismissal prevents alert overflow if instructor busy
 * - Status tracking enables instructor workflow (acknowledge → resolve)
 */
export interface HelpAlert {
  /**
   * Unique identifier for this alert
   * Format: `alert-${timestamp}-${random}`
   */
  id: string;

  /**
   * Which classroom session this alert belongs to
   * WHY: Main classroom instructor needs to see all breakout room alerts
   */
  classroomSessionId: string;

  /**
   * Which breakout room (or main classroom) triggered this alert
   */
  breakoutRoomSessionId: string;

  /**
   * Human-readable breakout room name
   * null if alert is from main classroom
   * Example: "Group 2", "Room B"
   */
  breakoutRoomName: string | null;

  /**
   * When help was detected (server timestamp)
   */
  detectedAt: Date;

  /**
   * What topic/concept students are struggling with
   * Extracted from transcript context around help keywords
   * Example: "derivatives", "SQL joins", "chemical bonding"
   */
  topic: string;

  /**
   * How urgent is this help request?
   * - low: Mild confusion, can wait
   * - medium: Repeated confusion, should address soon
   * - high: Clear distress, immediate attention needed
   */
  urgency: 'low' | 'medium' | 'high';

  /**
   * Which keywords triggered this alert
   * WHY: Transparent system - instructor can see detection logic
   * Example: ["stuck", "don't understand"]
   */
  triggerKeywords: string[];

  /**
   * 2-3 sentences of transcript around detection point
   * WHY: Provides context for instructor to understand situation
   * Max length: 300 characters
   */
  contextSnippet: string;

  /**
   * Current status of this alert
   * - pending: New alert, not yet seen by instructor
   * - acknowledged: Instructor has seen it
   * - resolved: Instructor handled it (joined room, etc.)
   * - dismissed: False positive or no longer relevant
   */
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';

  /**
   * Instructor ID who acknowledged/resolved this alert
   * null if still pending
   */
  acknowledgedBy: string | null;

  /**
   * When the alert was acknowledged/resolved
   * null if still pending
   */
  acknowledgedAt: Date | null;

  /**
   * Transcript entry IDs that contributed to this alert
   * WHY: Can trace back to exact moments for debugging
   */
  sourceTranscriptIds: string[];
}

/**
 * Quiz represents an AI-generated quiz from instructor content
 * 
 * WHY instructor-only transcripts:
 * - Quiz questions should test what instructor taught, not student questions
 * - Filtering by speakerRole='instructor' ensures content quality
 * - Students asking questions would create confusing quiz content
 * 
 * WHY draft status:
 * - Instructor must review AI-generated content before sharing
 * - Allows editing questions, answers, and explanations
 * - Prevents publishing incorrect or inappropriate questions
 */
export interface Quiz {
  /**
   * Unique identifier for this quiz
   * Format: `quiz-${sessionId}-${timestamp}`
   */
  id: string;

  /**
   * Which classroom session this quiz was generated from
   */
  sessionId: string;

  /**
   * Instructor ID who requested generation
   * WHY: Only the creator can edit/delete (future feature)
   */
  createdBy: string;

  /**
   * Instructor display name
   */
  createdByName: string;

  /**
   * When this quiz was generated
   */
  createdAt: Date;

  /**
   * Last time quiz was edited
   * Equals createdAt if never edited
   */
  lastModified: Date;

  /**
   * Transcript entry IDs used for generation
   * WHY: Traceability - instructor can see what content was used
   * Only includes instructor transcripts (no student speech)
   */
  sourceTranscriptIds: string[];

  /**
   * Array of quiz questions (5-10 questions)
   */
  questions: QuizQuestion[];

  /**
   * Current status
   * - draft: Generated but not finalized
   * - published: Instructor approved, ready for students
   * WHY: Instructor must review before sharing
   */
  status: 'draft' | 'published';

  /**
   * Optional: Title for the quiz
   * Auto-generated from first topic mentioned or manually set
   * Example: "Derivatives Quiz", "SQL Joins Practice"
   */
  title?: string;
}

/**
 * QuizQuestion represents a single question within a quiz
 * 
 * WHY multiple question types:
 * - multiple_choice: Tests deeper understanding with distractors
 * - true_false: Quick knowledge checks, easier to grade
 * - Mix of types provides variety and tests different cognitive levels
 */
export interface QuizQuestion {
  /**
   * Unique identifier within quiz
   * Format: `${quizId}-q${index}`
   */
  id: string;

  /**
   * Type of question
   * multiple_choice: 4 options, 1 correct
   * true_false: Boolean answer
   */
  type: 'multiple_choice' | 'true_false';

  /**
   * The question text
   * Clear, unambiguous, tests understanding not memorization
   */
  question: string;

  /**
   * Answer options (for multiple choice only)
   * Always exactly 4 options: A, B, C, D
   * null for true/false questions
   */
  options: string[] | null;

  /**
   * Correct answer
   * For multiple_choice: index into options array (0-3) or letter ('A'-'D')
   * For true_false: boolean value
   */
  correctAnswer: string | boolean;

  /**
   * Brief explanation of why this is the answer
   * Educational: helps students learn from mistakes
   * 1-3 sentences, max 200 characters
   */
  explanation: string;

  /**
   * Difficulty level
   * easy: Basic recall or simple application
   * medium: Requires understanding and synthesis
   * hard: Complex problem-solving or analysis
   */
  difficulty: 'easy' | 'medium' | 'hard';

  /**
   * Which transcript segments this question was based on
   * WHY: If instructor edits transcript, we know which questions to regenerate
   */
  sourceTranscriptIds: string[];
}
