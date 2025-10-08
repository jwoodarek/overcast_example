/**
 * Breakout Rooms API endpoints - Create and manage breakout rooms
 * 
 * POST /api/breakout-rooms - Create 1-10 breakout rooms with participant assignments
 * GET /api/breakout-rooms - Get active breakout rooms for a session
 * 
 * WHY breakout rooms:
 * - Enable small group discussions during class
 * - Instructor assigns students to specific groups
 * - Supports 1-10 active breakout rooms simultaneously per session
 * 
 * WHY in-memory storage:
 * - Breakout rooms are session-scoped (cleared when session ends)
 * - No database dependency for MVP
 * - Fast read/write for real-time breakout management
 */

import { NextResponse } from 'next/server';
import { generateUUID } from '@/lib/utils';
import { BreakoutRoom } from '@/lib/types';

// In-memory store for breakout rooms (production would use database)
// Map structure: sessionId → array of BreakoutRoom objects
const breakoutRoomsBySession = new Map<string, BreakoutRoom[]>();

/**
 * POST /api/breakout-rooms
 * 
 * Creates multiple breakout rooms (1-10) with participant assignments
 * Validates participant assignments (no duplicates across rooms)
 * Generates Daily.co room URLs for each breakout
 * 
 * Request body:
 * - sessionId: required (classroom session)
 * - rooms: required array (1-10 room configurations)
 *   - name: required (1-100 characters)
 *   - participantIds: required array (can be empty)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        {
          error: 'Missing required field: sessionId'
        },
        { status: 400 }
      );
    }

    if (!body.rooms || !Array.isArray(body.rooms)) {
      return NextResponse.json(
        {
          error: 'Missing required field: rooms (must be an array)'
        },
        { status: 400 }
      );
    }

    // Validate room count (1-10)
    if (body.rooms.length < 1 || body.rooms.length > 10) {
      return NextResponse.json(
        {
          error: 'Cannot create more than 10 breakout rooms'
        },
        { status: 400 }
      );
    }

    // Validate each room configuration
    const allParticipantIds = new Set<string>();
    const duplicateParticipants: string[] = [];

    for (let i = 0; i < body.rooms.length; i++) {
      const room = body.rooms[i];

      // Validate name
      if (!room.name || typeof room.name !== 'string') {
        return NextResponse.json(
          {
            error: `Room ${i + 1}: name is required`
          },
          { status: 400 }
        );
      }

      if (room.name.trim().length === 0) {
        return NextResponse.json(
          {
            error: `Room ${i + 1}: name cannot be empty`
          },
          { status: 400 }
        );
      }

      if (room.name.length > 100) {
        return NextResponse.json(
          {
            error: `Room ${i + 1}: name cannot exceed 100 characters`
          },
          { status: 400 }
        );
      }

      // Validate participantIds
      if (!Array.isArray(room.participantIds)) {
        return NextResponse.json(
          {
            error: `Room ${i + 1}: participantIds must be an array`
          },
          { status: 400 }
        );
      }

      // Check for duplicate participant assignments across rooms
      for (const participantId of room.participantIds) {
        if (allParticipantIds.has(participantId)) {
          duplicateParticipants.push(participantId);
        } else {
          allParticipantIds.add(participantId);
        }
      }
    }

    // Reject if any participant is assigned to multiple rooms
    if (duplicateParticipants.length > 0) {
      return NextResponse.json(
        {
          error: `Participant ${duplicateParticipants[0]} assigned to multiple rooms`
        },
        { status: 400 }
      );
    }

    // Create breakout rooms
    const createdRooms: BreakoutRoom[] = [];
    const now = new Date();

    for (const roomConfig of body.rooms) {
      const breakoutRoomId = generateUUID();
      
      // Generate Daily.co room URL for this breakout
      // In production, would call Daily REST API to create actual room
      // For MVP, we use a predictable URL format
      const dailyRoomUrl = `https://overcast.daily.co/breakout-${breakoutRoomId.substring(0, 8)}`;

      const breakoutRoom: BreakoutRoom = {
        id: breakoutRoomId,
        parentClassroomId: body.sessionId, // Using sessionId as parent reference
        name: roomConfig.name,
        dailyRoomUrl,
        participantIds: roomConfig.participantIds || [],
        createdBy: body.sessionId, // In production, would be instructor ID
        createdAt: now,
        closedAt: undefined,
        status: 'active',
      };

      createdRooms.push(breakoutRoom);
    }

    // Store breakout rooms for this session
    const existingRooms = breakoutRoomsBySession.get(body.sessionId) || [];
    const updatedRooms = [...existingRooms, ...createdRooms];
    breakoutRoomsBySession.set(body.sessionId, updatedRooms);

    // Return created rooms
    return NextResponse.json(
      {
        rooms: createdRooms.map(room => ({
          id: room.id,
          name: room.name,
          dailyRoomUrl: room.dailyRoomUrl,
          participantIds: room.participantIds,
          status: room.status,
          createdAt: room.createdAt.toISOString(),
          closedAt: room.closedAt ? room.closedAt.toISOString() : null,
        })),
        message: `${createdRooms.length} breakout room${createdRooms.length > 1 ? 's' : ''} created`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/breakout-rooms:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create breakout rooms'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/breakout-rooms
 * 
 * Returns list of all active breakout rooms for a session
 * Includes current participant assignments for each room
 * 
 * Query parameters:
 * - sessionId: required (classroom session identifier)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Validate required parameter
    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameter: sessionId'
        },
        { status: 400 }
      );
    }

    // Get breakout rooms for this session
    const rooms = breakoutRoomsBySession.get(sessionId) || [];

    // Filter to only active rooms
    const activeRooms = rooms.filter(room => room.status === 'active');

    // Return rooms with metadata
    return NextResponse.json({
      rooms: activeRooms.map(room => ({
        id: room.id,
        name: room.name,
        dailyRoomUrl: room.dailyRoomUrl,
        participantIds: room.participantIds,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        closedAt: room.closedAt ? room.closedAt.toISOString() : null,
      })),
      activeCount: activeRooms.length,
    });
  } catch (error) {
    console.error('Error in GET /api/breakout-rooms:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve breakout rooms'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get breakout room by ID
 * Used by PATCH and DELETE endpoints (future implementation)
 */
export function getBreakoutRoomById(sessionId: string, roomId: string): BreakoutRoom | undefined {
  const rooms = breakoutRoomsBySession.get(sessionId) || [];
  return rooms.find(room => room.id === roomId);
}

/**
 * Helper function to update breakout room
 * Used by PATCH endpoint for reassigning participants
 */
export function updateBreakoutRoom(sessionId: string, roomId: string, updates: Partial<BreakoutRoom>): boolean {
  const rooms = breakoutRoomsBySession.get(sessionId) || [];
  const roomIndex = rooms.findIndex(room => room.id === roomId);
  
  if (roomIndex === -1) {
    return false;
  }

  rooms[roomIndex] = { ...rooms[roomIndex], ...updates };
  breakoutRoomsBySession.set(sessionId, rooms);
  return true;
}

/**
 * Helper function to close breakout room
 * Used by DELETE endpoint
 */
export function closeBreakoutRoom(sessionId: string, roomId: string): boolean {
  return updateBreakoutRoom(sessionId, roomId, {
    status: 'closed',
    closedAt: new Date(),
  });
}

/**
 * Helper function to clear all breakout rooms for a session
 * Called when main classroom session ends
 */
export function clearSessionBreakoutRooms(sessionId: string): void {
  breakoutRoomsBySession.delete(sessionId);
}
