// Utility functions for Overcast Video Classroom Application
// Common helper functions used across components

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * This ensures Tailwind classes are properly merged and deduplicated
 * 
 * @param inputs - Class names to combine
 * @returns Combined and deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a random UUID v4
 * Used for creating unique session IDs and other identifiers
 * 
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validates user name input
 * Ensures name meets requirements (1-50 characters, non-empty when trimmed)
 * 
 * @param name - Name to validate
 * @returns Validation result with isValid flag and error message
 */
export function validateUserName(name: string): { isValid: boolean; error?: string } {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Name must be 50 characters or less' };
  }
  
  return { isValid: true };
}

/**
 * Validates classroom ID
 * Ensures ID is one of the valid classroom identifiers (1-6)
 * 
 * @param classroomId - Classroom ID to validate
 * @returns Whether the classroom ID is valid
 */
export function validateClassroomId(classroomId: string): boolean {
  return /^[1-6]$/.test(classroomId);
}

/**
 * Formats a timestamp for display
 * Converts Date to human-readable format
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatTimestamp(
  date: Date, 
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }
): string {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Calculates time elapsed since a given date
 * Returns human-readable duration string
 * 
 * @param startDate - Start date to calculate from
 * @returns Duration string (e.g., "2m 30s", "1h 15m")
 */
export function getTimeElapsed(startDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  } else if (diffMinutes > 0) {
    const remainingSeconds = diffSeconds % 60;
    return `${diffMinutes}m ${remainingSeconds}s`;
  } else {
    return `${diffSeconds}s`;
  }
}

/**
 * Debounces a function call
 * Prevents function from being called too frequently
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Safely parses JSON with error handling
 * Returns null if parsing fails
 * 
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null
 */
export function safeJsonParse<T = any>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Checks if a value is a valid URL
 * Used for validating Daily.co room URLs
 * 
 * @param url - URL string to validate
 * @returns Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncates text to specified length with ellipsis
 * Useful for displaying long participant names or room names
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalizes the first letter of a string
 * Used for formatting user roles and other display text
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
