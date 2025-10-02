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

// ============================================================================
// Error Logging and Monitoring
// ============================================================================

/**
 * Log levels for categorizing messages
 * Used to filter and prioritize logs in production
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Structured error log entry
 * Provides consistent format for error tracking and debugging
 */
export interface ErrorLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Logger class for comprehensive error tracking and monitoring
 * Handles both client and server-side logging with structured output
 * 
 * WHY: Centralized logging helps debug issues in production and track patterns
 * Structured logs can be easily parsed by monitoring tools (e.g., Vercel logs)
 */
export class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;
  private logHistory: ErrorLogEntry[] = [];
  private maxHistorySize = 100; // Keep last 100 logs in memory

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Singleton pattern ensures consistent logging across the application
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Creates a structured log entry with context
   * Captures environment details automatically for debugging
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // Add browser/environment context if available
    if (typeof window !== 'undefined') {
      entry.userAgent = window.navigator.userAgent;
      entry.url = window.location.href;
    }

    return entry;
  }

  /**
   * Internal logging method that handles output and storage
   * In development: logs to console with formatting
   * In production: can be extended to send to monitoring services
   */
  private log(entry: ErrorLogEntry): void {
    // Store in memory (useful for error reports)
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output in development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c[${entry.level.toUpperCase()}] ${entry.timestamp}`,
        style,
        entry.message
      );
      
      if (entry.context) {
        console.log('Context:', entry.context);
      }
      
      if (entry.error) {
        console.error('Error:', entry.error);
      }
    } else {
      // Production: structured JSON output for log aggregation
      console.log(JSON.stringify(entry));
    }

    // TODO: In production, send to monitoring service (e.g., Sentry, Datadog)
    // This can be extended when deploying to production
    if (!this.isDevelopment && entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      // Example: sendToMonitoringService(entry);
    }
  }

  /**
   * Console styling for better development experience
   * Makes it easy to spot different log levels visually
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: #888; font-weight: normal',
      [LogLevel.INFO]: 'color: #2196F3; font-weight: bold',
      [LogLevel.WARN]: 'color: #FF9800; font-weight: bold',
      [LogLevel.ERROR]: 'color: #F44336; font-weight: bold',
      [LogLevel.FATAL]: 'color: #fff; background: #F44336; font-weight: bold; padding: 2px 4px',
    };
    return styles[level] || '';
  }

  /**
   * Debug level logging
   * Use for detailed diagnostic information
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, undefined, context);
      this.log(entry);
    }
  }

  /**
   * Info level logging
   * Use for general informational messages
   */
  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, undefined, context);
    this.log(entry);
  }

  /**
   * Warning level logging
   * Use for recoverable issues that should be investigated
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, undefined, context);
    this.log(entry);
  }

  /**
   * Error level logging
   * Use for errors that affect functionality but don't crash the app
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, error, context);
    this.log(entry);
  }

  /**
   * Fatal level logging
   * Use for critical errors that require immediate attention
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, error, context);
    this.log(entry);
  }

  /**
   * Get recent log history
   * Useful for generating error reports or debugging
   */
  getLogHistory(count?: number): ErrorLogEntry[] {
    if (count) {
      return this.logHistory.slice(-count);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   * Useful for testing or after sending logs to a service
   */
  clearHistory(): void {
    this.logHistory = [];
  }
}

/**
 * Convenience function to get logger instance
 * Use this throughout the application for consistent logging
 */
export const logger = Logger.getInstance();

/**
 * Formats an error object into a readable string
 * Includes stack trace in development for better debugging
 * 
 * @param error - Error object to format
 * @param includeStack - Whether to include stack trace (default: true in dev)
 * @returns Formatted error string
 */
export function formatError(error: Error, includeStack?: boolean): string {
  const shouldIncludeStack = includeStack ?? process.env.NODE_ENV === 'development';
  
  let formatted = `${error.name}: ${error.message}`;
  
  if (shouldIncludeStack && error.stack) {
    formatted += `\n${error.stack}`;
  }
  
  return formatted;
}

/**
 * Safely executes an async function with error handling
 * Logs errors automatically and returns a result object
 * 
 * WHY: Reduces boilerplate try-catch blocks and ensures consistent error logging
 * 
 * @param fn - Async function to execute
 * @param errorMessage - Custom error message for logging
 * @param context - Additional context for logging
 * @returns Result object with success flag and data or error
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Operation failed',
  context?: Record<string, any>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(errorMessage, err, context);
    return { success: false, error: err };
  }
}

/**
 * Wraps a function with error boundary logic
 * Returns a fallback value if the function throws
 * 
 * @param fn - Function to wrap
 * @param fallback - Fallback value if function throws
 * @param errorMessage - Custom error message for logging
 * @returns Function result or fallback value
 */
export function withErrorBoundary<T>(
  fn: () => T,
  fallback: T,
  errorMessage: string = 'Function execution failed'
): T {
  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(errorMessage, err);
    return fallback;
  }
}

/**
 * Creates a retry wrapper for async functions
 * Useful for network requests or flaky operations
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Result of the function or throws last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Retry attempt ${attempt}/${maxRetries} failed`, {
        attempt,
        maxRetries,
        error: lastError.message,
      });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  if (lastError) {
    logger.error('All retry attempts failed', lastError);
    throw lastError;
  }
  
  throw new Error('Retry failed with no error captured');
}

/**
 * Monitors async function performance
 * Logs execution time and can alert on slow operations
 * 
 * @param fn - Async function to monitor
 * @param operationName - Name for logging purposes
 * @param slowThresholdMs - Threshold in ms to log warning (default: 1000)
 * @returns Function result
 */
export async function monitorPerformance<T>(
  fn: () => Promise<T>,
  operationName: string,
  slowThresholdMs: number = 1000
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    if (duration > slowThresholdMs) {
      logger.warn(`Slow operation detected: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${slowThresholdMs}ms`,
      });
    } else {
      logger.debug(`Operation completed: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error(`Operation failed: ${operationName}`, err, {
      duration: `${duration.toFixed(2)}ms`,
    });
    
    throw err;
  }
}