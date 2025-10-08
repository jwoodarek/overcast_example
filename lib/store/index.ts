/**
 * Store Singletons
 * 
 * This file exports singleton instances of our in-memory stores.
 * 
 * WHY singleton pattern?
 * - Ensures shared state across all API routes and components
 * - In Next.js API routes, each route can import these same instances
 * - Avoids creating multiple store instances which would fragment data
 * - Makes testing easier (can import and inspect the same store in tests)
 * 
 * WHY in-memory stores?
 * - MVP approach: no database setup required for local development
 * - Fast access (microseconds vs. milliseconds for database)
 * - Simple to understand and debug
 * - Easy migration path: replace implementation with database queries later
 * 
 * Lifecycle:
 * - Stores persist for server runtime only (lost on restart)
 * - Data cleared when sessions end to prevent memory leaks
 * - Alert auto-dismissal runs every 5 minutes to clean up stale alerts
 */

import { TranscriptStore } from './transcript-store';
import { AlertStore } from './alert-store';
import { QuizStore } from './quiz-store';

/**
 * Singleton instance for transcript storage
 * Stores all speech-to-text entries during active sessions
 */
export const transcriptStore = new TranscriptStore();

/**
 * Singleton instance for help alert management
 * Tracks all detected help requests and their status
 */
export const alertStore = new AlertStore();

/**
 * Singleton instance for quiz storage
 * Stores AI-generated quizzes created by instructors
 */
export const quizStore = new QuizStore();

/**
 * Auto-dismiss old alerts every 5 minutes
 * 
 * WHY automatic dismissal?
 * - Prevents alert overflow if instructor misses them
 * - Alerts older than 30 minutes are likely no longer relevant
 * - Keeps the pending alerts list focused on current issues
 * - Runs in background without blocking other operations
 */
setInterval(() => {
  const dismissedCount = alertStore.autoDismissOld();
  if (dismissedCount > 0) {
    console.log(`[Alert Cleanup] Auto-dismissed ${dismissedCount} old alerts`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

