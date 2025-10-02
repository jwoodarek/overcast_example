/**
 * POST /api/rooms/[roomId]/join endpoint - Join a classroom
 * 
 * Handles classroom join requests including:
 * - Name and role validation
 * - Capacity checking
 * - Daily.co room token generation
 * 
 * WHY: This endpoint validates join requests and provides the necessary
 * credentials for connecting to the Daily.co room. In production, this
 * would also track participants server-side and enforce capacity limits.
 * 
 * For local development, we return the room URL and allow the client
 * to connect directly via Daily React hooks.
 */

import { NextResponse } from 'next/server';
import { getDailyRoomById, DAILY_API_CONFIG } from '@/lib/daily-config';
import { JoinRoomRequest, Participant } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * Create a Daily.co meeting token for authenticated access
 * Tokens can include permissions and user metadata
 */
async function createDailyToken(roomName: string, userName: string, isInstructor: boolean) {
  try {
    if (!DAILY_API_CONFIG.apiKey) {
      // For local development without API key, return undefined
      // Daily rooms can be accessed without tokens if configured as public
      return undefined;
    }

    const response = await fetch(`${DAILY_API_CONFIG.baseUrl}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          // Instructors get additional permissions
          enable_recording: isInstructor,
          start_audio_off: false,
          start_video_off: false,
          // Token expires in 24 hours
          exp: Math.floor(Date.now() / 1000) + 86400
        }
      })
    });

    if (!response.ok) {
      console.error('Failed to create Daily token:', response.statusText);
      return undefined;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error creating Daily token:', error);
    return undefined;
  }
}

/**
 * Check if classroom has capacity for new participant
 * In production, this would query actual participant count
 */
async function checkRoomCapacity(roomUrl: string, maxCapacity: number): Promise<boolean> {
  const roomName = roomUrl.split('/').pop();
  
  try {
    if (!DAILY_API_CONFIG.apiKey) {
      // For local development, always allow join
      return true;
    }

    const response = await fetch(`${DAILY_API_CONFIG.baseUrl}/rooms/${roomName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to check room capacity:', response.statusText);
      return true; // Allow join on error
    }

    const data = await response.json();
    const currentCount = data.config?.max_participants_active || 0;
    
    return currentCount < maxCapacity;
  } catch (error) {
    console.error('Error checking room capacity:', error);
    return true; // Allow join on error
  }
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

    // Get room configuration
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
    const body: JoinRoomRequest = await request.json();
    
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Name is required and must be a string',
          code: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    
    if (name.length === 0 || name.length > 50) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Name must be between 1 and 50 characters',
          code: 'INVALID_NAME_LENGTH'
        },
        { status: 400 }
      );
    }

    if (!body.role || !['student', 'instructor'].includes(body.role)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Role must be either "student" or "instructor"',
          code: 'INVALID_ROLE'
        },
        { status: 400 }
      );
    }

    // Check classroom capacity
    const hasCapacity = await checkRoomCapacity(room.url, room.capacity);
    
    if (!hasCapacity) {
      return NextResponse.json(
        {
          error: 'Classroom full',
          message: `This classroom has reached its maximum capacity of ${room.capacity} participants`,
          maxCapacity: room.capacity,
          currentCount: room.capacity
        },
        { status: 409 }
      );
    }

    // Generate session ID for this participant
    const sessionId = crypto.randomUUID();
    
    // Create Daily token for room access
    const roomName = room.url.split('/').pop()!;
    const token = await createDailyToken(roomName, name, body.role === 'instructor');

    // Create participant object
    const participant: Participant = {
      sessionId,
      name,
      role: body.role,
      classroomId: roomId,
      isAudioMuted: false,
      isVideoEnabled: true,
      connectionState: 'connecting',
      joinedAt: new Date()
    };

    // Return success response with participant data and room URL
    return NextResponse.json({
      success: true,
      participant,
      dailyRoomUrl: room.url,
      token
    });
  } catch (error) {
    console.error('Error in POST /api/rooms/[roomId]/join:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to join classroom'
      },
      { status: 500 }
    );
  }
}

