/**
 * POST /api/transcripts/analyze
 * 
 * Trigger help detection analysis on transcripts for a session.
 * Analyzes recent transcripts and generates help alerts.
 * 
 * WHY manual trigger vs automatic:
 * - Manual: instructor controls when analysis runs
 * - Can be called from UI polling (every N seconds)
 * - Future: automatic trigger on new transcripts
 * - Gives flexibility for batch vs real-time processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { helpDetectionService } from '@/lib/services/help-detection-service';

/**
 * POST handler for transcript analysis.
 * 
 * Request body:
 * - sessionId: string (required)
 * - sinceLast: boolean (optional, default true)
 * - classroomSessionId: string (optional, for breakout rooms)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid sessionId in request body',
        },
        { status: 400 }
      );
    }

    const { sessionId, sinceLast, classroomSessionId } = body;

    // Determine time filter
    let since: Date | undefined;
    if (sinceLast !== false) {
      // Default: only analyze last 5 minutes
      since = new Date(Date.now() - 5 * 60 * 1000);
    }

    // Run help detection analysis
    const alerts = await helpDetectionService.analyzeTranscripts(sessionId, {
      since,
      classroomSessionId: classroomSessionId || sessionId,
    });

    // Return analysis results
    return NextResponse.json({
      analyzed: alerts.reduce((sum, alert) => sum + alert.sourceTranscriptIds.length, 0),
      alertsGenerated: alerts.length,
      alerts,
    });

  } catch (error) {
    console.error('[POST /api/transcripts/analyze] Error:', error);
    
    // Check for specific error types
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: error.message,
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to analyze transcripts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

