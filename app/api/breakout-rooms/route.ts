/**
 * POST /api/breakout-rooms endpoint - Create a breakout room
 * 
 * Creates a temporary breakout room for small group discussions
 * within a main classroom. Instructors can assign specific participants
 * to breakout rooms with optional time limits.
 * 
 * WHY: Breakout rooms enable collaborative learning in smaller groups.
 * This endpoint creates a Daily.co room dynamically and tracks the breakout
 * session in application state.
 */

import { NextResponse } from 'next/server';
import { generateUUID } from '@/lib/utils';

// In-memory store for breakout rooms (production would use database)
interface BreakoutRoom {
  id: string;
  parentClassroomId: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: string; // ISO timestamp
  isActive: boolean;
  maxDuration: number;
}
const breakoutRooms = new Map<string, BreakoutRoom>();

interface CreateBreakoutRequest {
  instructorSessionId: string;
  parentClassroomId: string;
  name: string;
  participantIds: string[];
  maxDuration?: number; // in minutes
}

export async function POST(request: Request) {
  try {
    const body: CreateBreakoutRequest = await request.json();
    
    // Validate required fields
    if (!body.instructorSessionId || !body.parentClassroomId || !body.name) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required fields: instructorSessionId, parentClassroomId, name',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }
    
    // Validate participantIds is an array
    if (!Array.isArray(body.participantIds)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'participantIds must be an array',
          code: 'INVALID_PARTICIPANT_IDS'
        },
        { status: 400 }
      );
    }
    
    // Validate parentClassroomId is valid (1-6)
    if (!['1', '2', '3', '4', '5', '6'].includes(body.parentClassroomId)) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Parent classroom not found',
          code: 'CLASSROOM_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Create breakout room object
    const breakoutRoomId = generateUUID();
    const breakoutRoom = {
      id: breakoutRoomId,
      parentClassroomId: body.parentClassroomId,
      name: body.name,
      participants: body.participantIds,
      createdBy: body.instructorSessionId,
      createdAt: new Date().toISOString(),
      isActive: true,
      maxDuration: body.maxDuration || 30 // default to 30 minutes
    };
    
    // Store breakout room
    breakoutRooms.set(breakoutRoomId, breakoutRoom);
    
    // Generate a Daily.co room URL for the breakout room
    // In production, this would call Daily API to create an actual room
    // For now, we'll use a mock URL format
    const dailyRoomUrl = `https://overcast.daily.co/breakout-${breakoutRoomId.substring(0, 8)}`;
    
    return NextResponse.json(
      {
        success: true,
        breakoutRoom,
        dailyRoomUrl
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/breakout-rooms:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create breakout room'
      },
      { status: 500 }
    );
  }
}

// Helper function to get breakout room by ID (for future endpoints)
export function getBreakoutRoomById(id: string) {
  return breakoutRooms.get(id);
}

// Helper function to get all breakout rooms for a classroom
export function getBreakoutRoomsByClassroom(classroomId: string) {
  return Array.from(breakoutRooms.values()).filter(
    room => room.parentClassroomId === classroomId
  );
}

