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
