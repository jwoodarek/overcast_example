/**
 * GET /api/alerts/[sessionId]
 * 
 * Get help alerts for a classroom session with filtering options.
 * Returns alerts sorted by urgency (high first) then by time (newest first).
 * 
 * WHY sorting by urgency:
 * - Instructors should see critical alerts first
 * - High urgency = students in distress, needs immediate attention
 * - Time breaks ties (recent alerts more relevant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/services/alert-service';

/**
 * GET handler for alert retrieval.
 * 
 * Query parameters:
 * - status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed'
 * - urgency: 'low' | 'medium' | 'high'
 * - breakoutRoom: string (breakout room name filter)
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
    const statusParam = searchParams.get('status');
    const urgencyParam = searchParams.get('urgency');
    const breakoutRoomParam = searchParams.get('breakoutRoom');

    // Validate status parameter
    if (statusParam && !['pending', 'acknowledged', 'resolved', 'dismissed'].includes(statusParam)) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Invalid status parameter. Must be one of: pending, acknowledged, resolved, dismissed',
        },
        { status: 400 }
      );
    }

    // Validate urgency parameter
    if (urgencyParam && !['low', 'medium', 'high'].includes(urgencyParam)) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Invalid urgency parameter. Must be one of: low, medium, high',
        },
        { status: 400 }
      );
    }

    // Get alerts with filters
    const alerts = alertService.getAlerts(sessionId, {
      status: statusParam as 'pending' | 'acknowledged' | 'resolved' | 'dismissed' | undefined,
      urgency: urgencyParam as 'low' | 'medium' | 'high' | undefined,
      breakoutRoom: breakoutRoomParam || undefined,
    });

    // Get counts by status
    const counts = alertService.getAlertCounts(sessionId);

    // Return response
    return NextResponse.json({
      alerts,
      counts,
    });

  } catch (error) {
    console.error('[GET /api/alerts/[sessionId]] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

