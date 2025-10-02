/**
 * Daily.co utility functions and error handling
 * 
 * Provides centralized error handling, connection management,
 * and helper functions for Daily.co integration.
 * 
 * WHY: Consolidating Daily.co logic here makes it easier to
 * maintain consistent error handling across components and
 * provides reusable utilities for common operations.
 */

import { DailyCall, DailyParticipant } from '@daily-co/daily-js';

/**
 * Daily.co error types for better error handling
 */
export enum DailyErrorType {
  CONNECTION_ERROR = 'connection-error',
  PERMISSION_DENIED = 'permission-denied',
  NETWORK_ERROR = 'network-error',
  ROOM_FULL = 'room-full',
  INVALID_TOKEN = 'invalid-token',
  UNKNOWN = 'unknown'
}

export interface DailyError {
  type: DailyErrorType;
  message: string;
  originalError?: Error | unknown;
  isRetryable: boolean;
}

/**
 * Parse Daily.co error into structured format
 * 
 * WHY: Daily.co errors come in various formats. This function
 * normalizes them into a consistent structure for better UX.
 */
export function parseDailyError(error: Error | unknown): DailyError {
  const err = error as { errorMsg?: string; message?: string } | null | undefined;
  const errorMsg = err?.errorMsg || err?.message || String(error);
  
  // Determine error type from message
  if (errorMsg.includes('permission') || errorMsg.includes('microphone') || errorMsg.includes('camera')) {
    return {
      type: DailyErrorType.PERMISSION_DENIED,
      message: 'Camera or microphone access denied. Please allow permissions and try again.',
      originalError: error,
      isRetryable: true
    };
  }
  
  if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
    return {
      type: DailyErrorType.NETWORK_ERROR,
      message: 'Network connection issue. Please check your internet and try again.',
      originalError: error,
      isRetryable: true
    };
  }
  
  if (errorMsg.includes('full') || errorMsg.includes('capacity')) {
    return {
      type: DailyErrorType.ROOM_FULL,
      message: 'This classroom is full. Please try another classroom.',
      originalError: error,
      isRetryable: false
    };
  }
  
  if (errorMsg.includes('token') || errorMsg.includes('auth')) {
    return {
      type: DailyErrorType.INVALID_TOKEN,
      message: 'Authentication failed. Please rejoin the classroom.',
      originalError: error,
      isRetryable: false
    };
  }
  
  return {
    type: DailyErrorType.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
    isRetryable: true
  };
}

/**
 * Retry function with exponential backoff
 * 
 * WHY: Network issues are often transient. Retrying with
 * exponential backoff gives the connection time to recover
 * without overwhelming the system.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }
      
      // Parse error to check if retryable
      const parsedError = parseDailyError(error);
      if (!parsedError.isRetryable) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Get participant role from Daily participant data
 * 
 * WHY: Role information is stored in userData. This helper
 * provides type-safe access to role information.
 */
export function getParticipantRole(participant: DailyParticipant): 'student' | 'instructor' {
  const userData = participant.userData as { role?: string } | undefined;
  return userData?.role === 'instructor' ? 'instructor' : 'student';
}

/**
 * Check if participant is an instructor
 */
export function isInstructor(participant: DailyParticipant): boolean {
  return getParticipantRole(participant) === 'instructor';
}

/**
 * Check if current user has instructor permissions
 * 
 * WHY: Many actions (muting, creating breakouts) require
 * instructor permissions. This centralizes the permission check.
 */
export function hasInstructorPermissions(
  localParticipant: DailyParticipant | null
): boolean {
  if (!localParticipant) return false;
  return isInstructor(localParticipant);
}

/**
 * Filter participants by role
 */
export function filterParticipantsByRole(
  participants: Record<string, DailyParticipant>,
  role: 'student' | 'instructor'
): DailyParticipant[] {
  return Object.values(participants).filter(
    participant => getParticipantRole(participant) === role
  );
}

/**
 * Get participant count by role
 */
export function getParticipantCountByRole(
  participants: Record<string, DailyParticipant>
): { students: number; instructors: number; total: number } {
  const instructorCount = filterParticipantsByRole(participants, 'instructor').length;
  const studentCount = filterParticipantsByRole(participants, 'student').length;
  
  return {
    students: studentCount,
    instructors: instructorCount,
    total: instructorCount + studentCount
  };
}

/**
 * Check if classroom is at capacity
 */
export function isClassroomFull(
  participantCount: number,
  maxCapacity: number
): boolean {
  return participantCount >= maxCapacity;
}

/**
 * Get capacity status with warning thresholds
 * 
 * WHY: We want to show different UI states as capacity approaches
 * the limit (green -> yellow -> red).
 */
export function getCapacityStatus(
  participantCount: number,
  maxCapacity: number
): 'available' | 'filling' | 'nearly-full' | 'full' {
  const percentage = (participantCount / maxCapacity) * 100;
  
  if (percentage >= 100) return 'full';
  if (percentage >= 90) return 'nearly-full';
  if (percentage >= 70) return 'filling';
  return 'available';
}

/**
 * Validate user name for Daily.co
 * 
 * WHY: Daily.co has restrictions on user names. This validates
 * names before attempting to join.
 */
export function validateUserName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }
  
  // Check for invalid characters
  const validNameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Connection quality indicator
 * 
 * WHY: Daily.co provides network quality stats. This helper
 * converts them into user-friendly quality levels.
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface NetworkStats {
  quality?: number;
}

export function getConnectionQuality(
  stats: NetworkStats | null | undefined
): ConnectionQuality {
  if (!stats) return 'unknown';
  
  // Daily provides quality scores from 0-5
  // 5 = excellent, 4 = good, 3 = fair, 2-0 = poor
  const quality = stats.quality || 0;
  
  if (quality >= 4.5) return 'excellent';
  if (quality >= 3.5) return 'good';
  if (quality >= 2.5) return 'fair';
  return 'poor';
}

/**
 * Safely leave Daily.co call with cleanup
 * 
 * WHY: Leaving a call requires cleanup to avoid memory leaks.
 * This ensures proper cleanup even if errors occur.
 */
export async function safelyLeaveCall(call: DailyCall | null): Promise<void> {
  if (!call) return;
  
  try {
    await call.leave();
  } catch (error) {
    console.error('Error leaving call:', error);
  }
  
  try {
    await call.destroy();
  } catch (error) {
    console.error('Error destroying call object:', error);
  }
}

