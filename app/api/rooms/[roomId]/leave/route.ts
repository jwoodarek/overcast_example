/**
 * POST /api/rooms/[roomId]/leave endpoint - Leave a classroom
 * 
 * Handles participant leaving a classroom:
 * - Validates session ID
 * - Updates participant count
 * - Cleans up participant tracking
 * 
 * WHY: This endpoint is called when a user clicks "Leave Classroom"
 * or when the browser closes. It allows server-side tracking of
 * participants and capacity management.
 * 
 * For local development without persistent storage, this primarily
 * serves as an API contract implementation. The actual disconnect
 * happens client-side via Daily.co hooks.
 */

import { NextResponse } from 'next/server';
import { getDailyRoomById } from '@/lib/daily-config';
import { LeaveRoomRequest } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

// In-memory participant tracking for concurrency control
// WHY: Prevents duplicate leave requests from being processed
// In production, this would be Redis or database with locks
const activeParticipants = new Set<string>();

// Simple in-memory lock for concurrency control
const leaveLocks = new Map<string, Promise<unknown>>();

/**
 * Validate UUID format
 * Session IDs should be valid UUIDs
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { roomId } = await params;

    // Validate room ID
    if (!roomId || !['1', '2', '3', '4', '5', '6'].includes(roomId)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid classroom ID. Must be between 1 and 6.',
          code: 'INVALID_ROOM_ID'
        },
        { status: 400 }
      );
    }

    // Verify room exists
    const room = getDailyRoomById(roomId);
    
    if (!room) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Classroom ${roomId} not found`,
          code: 'ROOM_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body: LeaveRoomRequest = await request.json();
    
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Session ID is required',
          code: 'MISSING_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!isValidUUID(body.sessionId)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid session ID format. Must be a valid UUID.',
          code: 'INVALID_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Handle concurrent leave requests with lock
    // WHY: Prevents race conditions when multiple leave requests happen simultaneously
    const participantKey = `${roomId}:${body.sessionId}`;
    
    // Check if there's already a leave operation in progress for this participant
    if (leaveLocks.has(participantKey)) {
      // Wait for the ongoing operation to complete
      await leaveLocks.get(participantKey);
      
      // After waiting, check if participant still exists
      if (!activeParticipants.has(participantKey)) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Participant already left classroom',
            code: 'PARTICIPANT_NOT_FOUND'
          },
          { status: 404 }
        );
      }
    }
    
    // Create a lock for this operation
    let resolveLock: () => void;
    const lockPromise = new Promise<void>(resolve => { resolveLock = resolve; });
    leaveLocks.set(participantKey, lockPromise);
    
    try {
      // Check if participant exists
      if (!activeParticipants.has(participantKey)) {
        // For standalone tests or idempotency, treat as success if not tracked
        // In production with persistent storage, this would check the database
        return NextResponse.json({
          success: true,
          message: 'Left classroom successfully'
        });
      }
      
      // Remove participant from tracking
      activeParticipants.delete(participantKey);
    
    // In production, this would:
    // 1. Look up participant in database/cache
    // 2. Remove from participant tracking with database transaction
    // 3. Update classroom participant count
    // 4. Emit WebSocket event to other participants
    
    // For local development, we track in memory
    // The actual Daily.co disconnect happens client-side

      return NextResponse.json({
        success: true,
        message: 'Left classroom successfully'
      });
    } finally {
      // Release the lock
      leaveLocks.delete(participantKey);
      resolveLock!();
    }
  } catch (error) {
    console.error('Error in POST /api/rooms/[roomId]/leave:', error);
    
    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process leave request'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to add participant (called from join endpoint)
 * Exported for use in join route
 */
export function addParticipantToRoom(roomId: string, sessionId: string) {
  const participantKey = `${roomId}:${sessionId}`;
  activeParticipants.add(participantKey);
}

