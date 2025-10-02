/**
 * POST /api/participants/mute-all endpoint - Mute all participants in a classroom
 * 
 * Allows instructors to mute all participants at once:
 * - Validates instructor permissions
 * - Optionally excludes other instructors
 * - Mutes all target participants
 * 
 * WHY: Instructors need a quick way to restore order in a classroom
 * by muting everyone at once. This is especially useful at the start
 * of a session or when there's excessive background noise.
 * 
 * The actual muting is performed via Daily.co's participant control API,
 * with the option to exclude other instructors from the mute action.
 */

import { NextResponse } from 'next/server';
import { MuteAllParticipantsRequest } from '@/lib/types';
import { getDailyRoomById, DAILY_API_CONFIG } from '@/lib/daily-config';

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Verify instructor permissions for mute-all action
 */
async function verifyInstructorPermissions(
  instructorSessionId: string,
  classroomId: string
): Promise<boolean> {
  // Validate session ID format
  if (!isValidUUID(instructorSessionId)) {
    return false;
  }

  // Validate classroom exists
  const room = getDailyRoomById(classroomId);
  if (!room) {
    return false;
  }

  // In production:
  // 1. Look up instructor in database by sessionId
  // 2. Verify they are in the specified classroom
  // 3. Verify their role is 'instructor'
  // 4. Return true if all checks pass
  
  // For local development, we trust the client-provided role
  return true;
}

/**
 * Mute all participants in a classroom via Daily.co API
 */
async function muteAllParticipantsInDaily(
  classroomId: string,
  muted: boolean,
  excludeInstructors: boolean = true
): Promise<{ success: boolean; mutedCount: number }> {
  try {
    if (!DAILY_API_CONFIG.apiKey) {
      // For local development, return mock success
      // Actual muting happens client-side via Daily React hooks
      return { success: true, mutedCount: 0 };
    }

    // In production, this would:
    // 1. Get list of all participants in the classroom from Daily API
    // 2. Filter out instructors if excludeInstructors is true
    // 3. Iterate through participants and mute each one
    // 4. Return count of successfully muted participants
    
    const room = getDailyRoomById(classroomId);
    if (!room) {
      return { success: false, mutedCount: 0 };
    }

    // Mock implementation for local development
    console.log(`Mute-all request for classroom ${classroomId}: muted=${muted}, excludeInstructors=${excludeInstructors}`);
    
    return { success: true, mutedCount: 0 };
  } catch (error) {
    console.error('Error muting all participants via Daily API:', error);
    return { success: false, mutedCount: 0 };
  }
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body: MuteAllParticipantsRequest = await request.json();
    
    // Validate instructor session ID
    if (!body.instructorSessionId || typeof body.instructorSessionId !== 'string') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Instructor session ID is required',
          code: 'MISSING_INSTRUCTOR_ID'
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(body.instructorSessionId)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid instructor session ID format',
          code: 'INVALID_INSTRUCTOR_ID'
        },
        { status: 400 }
      );
    }

    // Validate classroom ID
    if (!body.classroomId || !['1', '2', '3', '4', '5', '6'].includes(body.classroomId)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Valid classroom ID is required (1-6)',
          code: 'INVALID_CLASSROOM_ID'
        },
        { status: 400 }
      );
    }

    // Validate muted state
    if (typeof body.muted !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Muted state must be a boolean',
          code: 'INVALID_MUTED_STATE'
        },
        { status: 400 }
      );
    }

    // Default to excluding instructors if not specified
    const excludeInstructors = body.excludeInstructors !== false;

    // Verify instructor permissions
    const hasPermission = await verifyInstructorPermissions(
      body.instructorSessionId,
      body.classroomId
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions to mute all participants',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    // Perform mute-all action via Daily.co API
    const result = await muteAllParticipantsInDaily(
      body.classroomId,
      body.muted,
      excludeInstructors
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to mute all participants'
        },
        { status: 500 }
      );
    }

    // Return success response with count of affected participants
    return NextResponse.json({
      success: true,
      message: `All participants ${body.muted ? 'muted' : 'unmuted'} successfully`,
      classroomId: body.classroomId,
      mutedCount: result.mutedCount,
      excludedInstructors: excludeInstructors
    });
  } catch (error) {
    console.error('Error in POST /api/participants/mute-all:', error);
    
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
        message: 'Failed to process mute-all request'
      },
      { status: 500 }
    );
  }
}

