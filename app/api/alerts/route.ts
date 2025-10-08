/**
 * POST /api/alerts
 * 
 * Update alert status (acknowledge, resolve, dismiss).
 * Only instructors can update alert status.
 * 
 * WHY state transitions:
 * - Enforces workflow: pending → acknowledged → resolved
 * - Prevents invalid transitions (e.g., resolved → pending)
 * - Makes alert lifecycle predictable and auditable
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/services/alert-service';

/**
 * POST handler for alert status updates.
 * 
 * Request body:
 * - alertId: string (required)
 * - status: 'acknowledged' | 'resolved' | 'dismissed' (required)
 * - instructorId: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.alertId || typeof body.alertId !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid alertId in request body',
        },
        { status: 400 }
      );
    }

    if (!body.status || typeof body.status !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid status in request body',
        },
        { status: 400 }
      );
    }

    if (!body.instructorId || typeof body.instructorId !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid instructorId in request body',
        },
        { status: 400 }
      );
    }

    const { alertId, status, instructorId } = body;

    // Validate status value
    if (!['acknowledged', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Invalid status. Must be one of: acknowledged, resolved, dismissed',
        },
        { status: 400 }
      );
    }

    // Authorization: In production, validate instructor permissions
    // For MVP, we trust the instructorId from client
    // Future: validate against session/JWT to ensure user is actually an instructor

    // Update alert based on status
    let updatedAlert;
    
    try {
      switch (status) {
        case 'acknowledged':
          updatedAlert = alertService.acknowledgeAlert(alertId, instructorId);
          break;
        case 'resolved':
          updatedAlert = alertService.resolveAlert(alertId, instructorId);
          break;
        case 'dismissed':
          updatedAlert = alertService.dismissAlert(alertId, instructorId);
          break;
        default:
          throw new Error('Invalid status');
      }
    } catch (error) {
      // Handle state transition errors
      if (error instanceof Error && error.message.includes('Cannot')) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: error.message,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Check if alert was found
    if (!updatedAlert) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Alert with ID ${alertId} not found`,
        },
        { status: 404 }
      );
    }

    // Return updated alert
    return NextResponse.json({
      alert: updatedAlert,
      message: `Alert ${status} successfully`,
    });

  } catch (error) {
    console.error('[POST /api/alerts] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

