/**
 * GET /api/transcripts/[sessionId]/export
 * 
 * Exports transcript entries in CSV or JSON format for instructor download.
 * Generates downloadable file with proper Content-Disposition header.
 * 
 * WHY export functionality:
 * - Instructors need to review session transcripts after class
 * - CSV format: Easy to open in Excel/Sheets for manual analysis
 * - JSON format: Machine-readable for automated processing or archival
 * 
 * WHY server-side generation:
 * - Consistent formatting across all exports
 * - Can add session metadata (start time, participant count, etc.)
 * - Centralized validation (instructor-only access)
 * - Easy to enhance with additional formats later (PDF, Word, etc.)
 * 
 * Query parameters:
 * - format: 'csv' or 'json' (required)
 * - requesterId: Participant session ID (required, must be instructor)
 * 
 * Response headers:
 * - Content-Type: 'text/csv' or 'application/json'
 * - Content-Disposition: attachment; filename="transcript-{sessionId}-{date}.{ext}"
 * 
 * Response 200: File content with download headers
 * Response 400: Invalid format parameter
 * Response 403: Requester is not an instructor
 * Response 404: No transcript found for session
 * Response 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcriptStore } from '@/lib/store';
import {
  exportTranscriptAsCSV,
  exportTranscriptAsJSON,
  generateTranscriptFilename,
} from '@/lib/utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Next.js 15: params is now a Promise that must be awaited
    const { sessionId } = await context.params;
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');
    const requesterId = searchParams.get('requesterId');
    
    // Validate format parameter
    if (!format || (format !== 'csv' && format !== 'json')) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: "Invalid format. Must be 'csv' or 'json'",
          code: 'INVALID_FORMAT',
        },
        { status: 400 }
      );
    }
    
    // Validate requesterId parameter
    if (!requesterId) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required parameter: requesterId',
          code: 'MISSING_REQUESTER_ID',
        },
        { status: 400 }
      );
    }
    
    // Authorization check: Only instructors can export transcripts
    // WHY: Transcripts may contain sensitive classroom content
    // In production, this would check against user database or JWT claims
    // For MVP, we trust the requesterId includes role information
    // Format: "instructor-{uuid}" or "student-{uuid}"
    const isInstructor = requesterId.startsWith('instructor-');
    
    if (!isInstructor) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Only instructors can export transcripts',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
        { status: 403 }
      );
    }
    
    // Retrieve transcript entries for the session
    const entries = transcriptStore.get(sessionId);
    
    // Check if transcript exists
    if (!entries || entries.length === 0) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `No transcript found for session ${sessionId}`,
          code: 'TRANSCRIPT_NOT_FOUND',
        },
        { status: 404 }
      );
    }
    
    // Generate file content based on format
    let fileContent: string;
    let mimeType: string;
    
    if (format === 'csv') {
      fileContent = exportTranscriptAsCSV(entries);
      mimeType = 'text/csv';
    } else {
      // format === 'json'
      // Get session start time (timestamp of first entry)
      const sessionStart = entries.length > 0 ? entries[0].timestamp : undefined;
      fileContent = exportTranscriptAsJSON(entries, sessionId, sessionStart);
      mimeType = 'application/json';
    }
    
    // Generate filename with session ID and current date
    const filename = generateTranscriptFilename(sessionId, format);
    
    // Create response with download headers
    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Security headers to prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
      },
    });
    
    return response;
  } catch (error) {
    console.error(`Error in GET /api/transcripts/[sessionId]/export:`, error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to export transcript',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

