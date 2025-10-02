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
  params: {
    roomId: string;
  };
}

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
    const { roomId } = params;

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

    // In production, this would:
    // 1. Look up participant in database/cache
    // 2. Remove from participant tracking
    // 3. Update classroom participant count
    // 4. Emit WebSocket event to other participants
    
    // For local development without persistent storage,
    // we simply acknowledge the leave request
    // The actual Daily.co disconnect happens client-side

    return NextResponse.json({
      success: true,
      message: 'Left classroom successfully'
    });
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

