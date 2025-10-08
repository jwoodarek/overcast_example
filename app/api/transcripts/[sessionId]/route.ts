/**
 * GET /api/transcripts/[sessionId]
 * 
 * Retrieve transcript entries for a classroom or breakout room session.
 * Supports filtering by time, role, and confidence score.
 * 
 * WHY server-side filtering:
 * - Reduces bandwidth (send only what's needed)
 * - Consistent filtering logic (not duplicated in clients)
 * - Easy to add caching or database queries later
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcriptStore } from '@/lib/store';

/**
 * POST handler for adding transcript entries (from client-side speech recognition).
 * 
 * WHY POST endpoint needed:
 * - Speech recognition runs client-side (browser Web Speech API)
 * - Need to send captured transcripts to server for storage
 * - Server-side storage allows all clients to see transcripts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    // Validate the entry has required fields
    if (!body.speakerId || !body.speakerName || !body.speakerRole || !body.text) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing required fields: speakerId, speakerName, speakerRole, text',
        },
        { status: 400 }
      );
    }

    // Create transcript entry with server timestamp
    const entry = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      speakerId: body.speakerId,
      speakerName: body.speakerName,
      speakerRole: body.speakerRole,
      text: body.text,
      timestamp: new Date(),
      confidence: body.confidence || 0,
      breakoutRoomName: body.breakoutRoomName || null,
    };

    // Store in server-side transcript store
    transcriptStore.add(entry);

    console.log(`[POST /api/transcripts/${sessionId}] Added transcript from ${entry.speakerName}`);

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/transcripts/[sessionId]] Error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add transcript',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for transcript retrieval.
 * 
 * Query parameters:
 * - since: ISO timestamp (only return entries after this)
 * - role: 'instructor' or 'student'
 * - minConfidence: Number 0-1 (minimum confidence score)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { sessionId } = await params;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sinceParam = searchParams.get('since');
    const roleParam = searchParams.get('role');
    const minConfidenceParam = searchParams.get('minConfidence');

    // Validate role parameter
    if (roleParam && roleParam !== 'instructor' && roleParam !== 'student') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Invalid role parameter. Must be "instructor" or "student".',
        },
        { status: 400 }
      );
    }

    // Parse and validate minConfidence
    let minConfidence: number | undefined;
    if (minConfidenceParam) {
      minConfidence = parseFloat(minConfidenceParam);
      if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Invalid minConfidence parameter. Must be between 0 and 1.',
          },
          { status: 400 }
        );
      }
    }

    // Parse since timestamp
    let since: Date | undefined;
    if (sinceParam) {
      since = new Date(sinceParam);
      if (isNaN(since.getTime())) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Invalid since parameter. Must be valid ISO 8601 timestamp.',
          },
          { status: 400 }
        );
      }
    }

    // Get transcripts with filters
    const entries = transcriptStore.get(sessionId, {
      since,
      role: roleParam as 'instructor' | 'student' | undefined,
      minConfidence,
    });

    // Return response
    return NextResponse.json({
      entries,
      count: entries.length,
      hasMore: false, // For MVP, always return all matching entries
    });

  } catch (error) {
    console.error('[GET /api/transcripts/[sessionId]] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve transcripts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

