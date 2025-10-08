/**
 * PATCH /api/breakout-rooms/[roomId] - Reassign participants in a breakout room
 * DELETE /api/breakout-rooms/[roomId] - Close a breakout room
 * 
 * These endpoints enable dynamic breakout room management:
 * - PATCH: Move participants between rooms or adjust assignments
 * - DELETE: Close a room and return participants to main classroom
 * 
 * WHY separate from POST endpoint:
 * - Different HTTP methods for different operations (RESTful design)
 * - Clear separation of concerns (create vs update vs delete)
 * - Follows Next.js 15 app directory conventions
 * 
 * WHY async params in Next.js 15:
 * - Next.js 15 made params async to support dynamic routing optimizations
 * - Must await params before accessing roomId
 * - See: https://nextjs.org/docs/app/api-reference/file-conventions/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { BreakoutRoom } from '@/lib/types';

// In-memory store for breakout rooms (same as ../route.ts)
// Map structure: sessionId → array of BreakoutRoom objects
// This is shared at module scope, so it's the same Map instance across requests
const breakoutRoomsBySession = new Map<string, BreakoutRoom[]>();

/**
 * Helper function to get breakout room by ID across all sessions
 */
function getBreakoutRoomByIdGlobal(
  roomId: string
): { room: BreakoutRoom; sessionId: string } | undefined {
  for (const [sessionId, rooms] of breakoutRoomsBySession.entries()) {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      return { room, sessionId };
    }
  }
  return undefined;
}

/**
 * Helper function to update a breakout room
 */
function updateBreakoutRoom(
  sessionId: string,
  roomId: string,
  updates: Partial<BreakoutRoom>
): BreakoutRoom | undefined {
  const rooms = breakoutRoomsBySession.get(sessionId) || [];
  const roomIndex = rooms.findIndex(r => r.id === roomId);
  
  if (roomIndex === -1) {
    return undefined;
  }
  
  rooms[roomIndex] = { ...rooms[roomIndex], ...updates };
  breakoutRoomsBySession.set(sessionId, rooms);
  
  return rooms[roomIndex];
}

/**
 * Helper function to validate participant availability
 */
function validateParticipantAvailability(
  sessionId: string,
  participantIds: string[],
  excludeRoomId?: string
): string[] {
  const conflicts: string[] = [];
  const rooms = breakoutRoomsBySession.get(sessionId) || [];
  
  for (const room of rooms) {
    // Skip closed rooms and the room being updated
    if (room.status === 'closed' || (excludeRoomId && room.id === excludeRoomId)) {
      continue;
    }
    
    // Check if any participant is already in this room
    const hasConflict = participantIds.some(id => room.participantIds.includes(id));
    if (hasConflict) {
      conflicts.push(room.id);
    }
  }
  
  return conflicts;
}

/**
 * PATCH /api/breakout-rooms/[roomId]
 * 
 * Reassigns participants in an existing breakout room.
 * Replaces the current participant list with the new one.
 * 
 * Request body:
 * - participantIds: string[] (required) - New participant list
 * 
 * Validation:
 * - Room must exist and be active
 * - Participants cannot be in multiple active rooms simultaneously
 * - Empty participant list is allowed (clears the room)
 * 
 * Response 200:
 * - room: Updated BreakoutRoom object
 * - message: Success message
 * 
 * Response 400: Invalid request (missing participantIds or validation failed)
 * Response 404: Room not found or already closed
 * Response 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    // Next.js 15: params is now a Promise that must be awaited
    const { roomId } = await context.params;
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.participantIds || !Array.isArray(body.participantIds)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'participantIds must be a non-empty array',
          code: 'INVALID_PARTICIPANT_IDS',
        },
        { status: 400 }
      );
    }
    
    // Check if room exists
    const result = getBreakoutRoomByIdGlobal(roomId);
    if (!result) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Breakout room ${roomId} not found`,
          code: 'ROOM_NOT_FOUND',
        },
        { status: 404 }
      );
    }
    
    const { room: existingRoom, sessionId } = result;
    
    // Cannot reassign participants in a closed room
    if (existingRoom.status === 'closed') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Cannot reassign participants in a closed room',
          code: 'ROOM_CLOSED',
        },
        { status: 400 }
      );
    }
    
    // Validate that participants are not already in other active rooms
    const conflicts = validateParticipantAvailability(
      sessionId,
      body.participantIds,
      roomId // Exclude current room from conflict check
    );
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Some participants are already assigned to other active breakout rooms',
          code: 'PARTICIPANT_CONFLICT',
          details: {
            conflictingRooms: conflicts,
          },
        },
        { status: 400 }
      );
    }
    
    // Update participants
    const updatedRoom = updateBreakoutRoom(sessionId, roomId, {
      participantIds: body.participantIds,
    });
    
    if (!updatedRoom) {
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to update breakout room',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        room: updatedRoom,
        message: 'Participants reassigned',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error in PATCH /api/breakout-rooms/[roomId]:`, error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to reassign participants',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/breakout-rooms/[roomId]
 * 
 * Closes a breakout room and marks it as inactive.
 * Participants should be returned to the main classroom by the client.
 * 
 * WHY soft delete:
 * - Preserves room data for reference and debugging
 * - Tracks how long room was active (closedAt - createdAt)
 * - Instructor can view history of breakout sessions
 * 
 * Response 200:
 * - message: Success message with participant count
 * - participantsReturned: Number of participants who were in the room
 * 
 * Response 404: Room not found
 * Response 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    // Next.js 15: params is now a Promise that must be awaited
    const { roomId } = await context.params;
    
    // Check if room exists
    const result = getBreakoutRoomByIdGlobal(roomId);
    if (!result) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Breakout room ${roomId} not found`,
          code: 'ROOM_NOT_FOUND',
        },
        { status: 404 }
      );
    }
    
    const { room: existingRoom, sessionId } = result;
    
    // Get participant count before closing
    const participantCount = existingRoom.participantIds.length;
    
    // Close the room (soft delete)
    const closedRoom = updateBreakoutRoom(sessionId, roomId, {
      status: 'closed',
      closedAt: new Date(),
    });
    
    if (!closedRoom) {
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to close breakout room',
          code: 'CLOSE_FAILED',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        message: `Breakout room closed, ${participantCount} participants returned to main room`,
        participantsReturned: participantCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error in DELETE /api/breakout-rooms/[roomId]:`, error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to close breakout room',
      },
      { status: 500 }
    );
  }
}

