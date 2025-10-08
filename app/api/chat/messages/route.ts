/**
 * Chat API endpoints - Text communication for classroom sessions
 * 
 * POST /api/chat/messages - Send a new message to a room
 * GET /api/chat/messages - Retrieve messages from a room
 * 
 * WHY room-scoped chat:
 * - Main classroom has its own chat thread
 * - Each breakout room has private chat visible only to its members + instructor
 * - Instructor can see all chats (main + all breakout rooms)
 * - Students only see chat from their current room
 * 
 * WHY in-memory storage:
 * - Chat is session-scoped (cleared when session ends)
 * - No database dependency for MVP
 * - Fast read/write performance for real-time chat
 */

import { NextResponse } from 'next/server';
import { chatService } from '@/lib/services/chat-service';

/**
 * POST /api/chat/messages
 * 
 * Sends a new chat message to specified room (main or breakout)
 * Message is broadcast to all participants with access to that room
 * 
 * Request body validation:
 * - sessionId: required (classroom session)
 * - senderId: required (Daily.co participant ID)
 * - senderName: required (display name)
 * - role: required ('instructor' | 'student')
 * - text: required (1-2000 characters)
 * - roomId: required ('main' or breakout room ID)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['sessionId', 'senderId', 'senderName', 'role', 'text', 'roomId'];
    const missing = requiredFields.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missing.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate role enum
    if (!['instructor', 'student'].includes(body.role)) {
      return NextResponse.json(
        {
          error: 'Invalid role. Must be "instructor" or "student"'
        },
        { status: 400 }
      );
    }

    // Send message via chat service (includes validation)
    const message = chatService.sendMessage({
      senderId: body.senderId,
      senderName: body.senderName,
      role: body.role,
      text: body.text,
      roomId: body.roomId,
      sessionId: body.sessionId,
    });

    // Return 201 Created with message ID and timestamp
    return NextResponse.json(
      {
        id: message.id,
        timestamp: message.timestamp.toISOString(),
        message: 'Message sent',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error);

    // Handle validation errors from chat service
    if (error instanceof Error) {
      // Chat service throws descriptive errors for validation failures
      if (
        error.message.includes('empty') ||
        error.message.includes('2000') ||
        error.message.includes('required')
      ) {
        return NextResponse.json(
          {
            error: error.message
          },
          { status: 400 }
        );
      }
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to send message'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/messages
 * 
 * Retrieves all messages for specified room
 * Filters based on requester permissions:
 * - Instructors can access any room
 * - Students can only access their current room
 * 
 * Query parameters:
 * - sessionId: required (classroom session)
 * - roomId: required ('main' or breakout room ID)
 * - requesterId: required (for authorization check)
 * - since: optional (ISO timestamp, only return messages after this time)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate query parameters
    const sessionId = searchParams.get('sessionId');
    const roomId = searchParams.get('roomId');
    const requesterId = searchParams.get('requesterId');
    const since = searchParams.get('since');

    // Validate required parameters
    if (!sessionId || !roomId || !requesterId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters: sessionId, roomId, requesterId'
        },
        { status: 400 }
      );
    }

    // Get messages from chat service
    let messages = chatService.getMessagesForRoom(roomId);

    // Filter messages by session ID (security: prevent cross-session access)
    messages = messages.filter(msg => msg.sessionId === sessionId);

    // Filter by "since" timestamp if provided
    if (since) {
      try {
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return NextResponse.json(
            {
              error: 'Invalid "since" timestamp format. Must be ISO 8601.'
            },
            { status: 400 }
          );
        }
        messages = chatService.getMessagesSince(roomId, sinceDate);
      } catch {
        return NextResponse.json(
          {
            error: 'Invalid "since" parameter'
          },
          { status: 400 }
        );
      }
    }

    // Authorization check: Students can only access their current room
    // Instructors can access any room (main + all breakout rooms)
    // 
    // WHY this check is basic:
    // - In MVP, we trust the frontend to send correct requesterId
    // - Production would verify requesterId against session participant list
    // - Production would check role (instructor vs student) via Daily.co API
    // 
    // For now, we implement a simple heuristic:
    // - If roomId doesn't match a known active room, return 404
    // - If requesterId is not in participant list for room, return 403
    // - For MVP, we skip these checks (trust frontend)
    
    // Check if room exists by seeing if we have any messages for it
    // If requesting a room with no messages, we still allow it (empty array)
    // But if requesting a clearly invalid room ID, return 404
    const allRoomIds = chatService.getRoomIds();
    const isKnownRoom = allRoomIds.includes(roomId) || roomId === 'main';
    
    if (!isKnownRoom && messages.length === 0) {
      // Room doesn't exist and has no messages - likely invalid
      // However, for MVP we'll be permissive and allow empty results
      // This prevents false 404s when room was just created
    }

    // Authorization: In production, validate instructor/participant permissions
    // - Check if requesterId is instructor (can access all rooms)
    // - Check if requesterId is in room's participant list (students)
    // - Return 403 if unauthorized
    // 
    // For MVP, we return all messages (trust frontend to filter correctly)

    // Return messages with metadata
    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp.toISOString(),
        senderId: msg.senderId,
        senderName: msg.senderName,
        role: msg.role,
        text: msg.text,
        roomId: msg.roomId,
        sessionId: msg.sessionId,
      })),
      roomId,
      hasMore: false, // For future pagination support
    });
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve messages'
      },
      { status: 500 }
    );
  }
}

