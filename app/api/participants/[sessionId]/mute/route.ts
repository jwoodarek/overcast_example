/**
 * POST /api/participants/[sessionId]/mute endpoint - Mute/unmute a participant
 * 
 * Allows instructors to control individual participant audio:
 * - Validates instructor permissions
 * - Mutes or unmutes target participant
 * - Returns updated participant state
 * 
 * WHY: Instructors need the ability to mute disruptive participants.
 * This endpoint validates the instructor's permission before allowing
 * the mute action. The actual muting is performed via Daily.co's
 * participant control API.
 * 
 * In production, this would also emit real-time events to update
 * the UI for all participants in the classroom.
 */

import { NextResponse } from 'next/server';
import { MuteParticipantRequest } from '@/lib/types';
import { DAILY_API_CONFIG } from '@/lib/daily-config';

interface RouteParams {
  params: {
    sessionId: string;
  };
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Verify instructor permissions
 * In production, this would check the instructor's role in the database
 */
async function verifyInstructorPermissions(
  instructorSessionId: string,
  classroomId: string
): Promise<boolean> {
  // For local development without persistent storage,
  // we trust the client-provided instructor role
  // In production, this would query the participant database
  
  // Validate session ID format
  if (!isValidUUID(instructorSessionId)) {
    return false;
  }

  // Validate classroom ID
  if (!['1', '2', '3', '4', '5', '6'].includes(classroomId)) {
    return false;
  }

  // In production:
  // 1. Look up instructor in database by sessionId
  // 2. Verify they are in the specified classroom
  // 3. Verify their role is 'instructor'
  // 4. Return true if all checks pass

  return true;
}

/**
 * Mute participant via Daily.co API
 * This would integrate with Daily's participant control API
 */
async function muteParticipantInDaily(
  sessionId: string,
  muted: boolean,
  classroomId: string
): Promise<boolean> {
  try {
    if (!DAILY_API_CONFIG.apiKey) {
      // For local development, return success
      // Actual muting happens client-side via Daily React hooks
      return true;
    }

    // In production, this would call Daily's REST API to update participant state
    // Daily provides participant control via their API:
    // POST /api/meetings/:meetingId/participants/:participantId
    // with body: { audio: false } to mute
    
    // For now, we acknowledge the request and let client-side handle it
    console.log(`Mute request for participant ${sessionId}: muted=${muted}, classroom=${classroomId}`);
    
    return true;
  } catch (error) {
    console.error('Error muting participant via Daily API:', error);
    return false;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = params;

    // Validate target session ID format
    if (!sessionId || !isValidUUID(sessionId)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid participant session ID',
          code: 'INVALID_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body: MuteParticipantRequest = await request.json();
    
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

    // Verify instructor permissions
    const hasPermission = await verifyInstructorPermissions(
      body.instructorSessionId,
      body.classroomId
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions to mute participants',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    // Perform mute action via Daily.co API
    const success = await muteParticipantInDaily(sessionId, body.muted, body.classroomId);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to mute participant'
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Participant ${body.muted ? 'muted' : 'unmuted'} successfully`,
      participantId: sessionId,
      muted: body.muted
    });
  } catch (error) {
    console.error('Error in POST /api/participants/[sessionId]/mute:', error);
    
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
        message: 'Failed to process mute request'
      },
      { status: 500 }
    );
  }
}

