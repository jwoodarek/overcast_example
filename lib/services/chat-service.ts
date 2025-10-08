// ChatService: In-memory storage and business logic for chat messages
// WHY in-memory: No database dependency for MVP, session-scoped data
// WHY room-scoped: Messages are private to specific rooms (main classroom or breakout rooms)

import { ChatMessage } from '../types';
import { generateUUID } from '../utils';

/**
 * ChatService manages chat messages in memory using a Map structure
 * 
 * Storage pattern: Map<roomId, ChatMessage[]>
 * - roomId is 'main' for main classroom or breakout room UUID
 * - Messages are append-only during session (no updates or deletes in v1)
 * - Filtering happens at read time (by sender role, time range)
 * 
 * Memory management:
 * - Average message: ~150 bytes
 * - Typical 1-hour class with active chat: ~500 messages = ~75 KB per session
 * - Cleanup: Call clear(roomId) when room closes or session ends
 */
export class ChatService {
  // roomId → array of chat messages (append-only)
  private messages: Map<string, ChatMessage[]> = new Map();

  /**
   * Sends a new chat message to a specific room
   * 
   * WHY validation here:
   * - Ensures message text is not empty or too long
   * - Prevents invalid roomId or senderId
   * - Validates before storing (fail fast)
   * 
   * @param params - Message parameters
   * @returns Created ChatMessage object
   * @throws Error if validation fails
   */
  sendMessage(params: {
    senderId: string;
    senderName: string;
    role: 'instructor' | 'student';
    text: string;
    roomId: string;
    sessionId: string;
  }): ChatMessage {
    // Validate message text
    const trimmedText = params.text.trim();
    if (!trimmedText) {
      throw new Error('Message text cannot be empty');
    }
    if (trimmedText.length > 2000) {
      throw new Error('Message text cannot exceed 2000 characters');
    }

    // Validate required fields
    if (!params.senderId || !params.senderName) {
      throw new Error('Sender ID and name are required');
    }
    if (!params.roomId || !params.sessionId) {
      throw new Error('Room ID and session ID are required');
    }

    // Create message object
    const message: ChatMessage = {
      id: generateUUID(),
      timestamp: new Date(),
      senderId: params.senderId,
      senderName: params.senderName,
      role: params.role,
      text: trimmedText,
      roomId: params.roomId,
      sessionId: params.sessionId,
    };

    // Store message
    const existing = this.messages.get(params.roomId) || [];
    existing.push(message);
    this.messages.set(params.roomId, existing);

    return message;
  }

  /**
   * Gets all messages for a specific room
   * 
   * WHY simple array return:
   * - Caller can filter/sort as needed (flexibility)
   * - Returns chronologically ordered messages (by timestamp)
   * - Empty array if room has no messages (not null, easier for UI)
   * 
   * @param roomId - Room to retrieve messages for ('main' or breakout room UUID)
   * @returns Array of messages in chronological order
   */
  getMessagesForRoom(roomId: string): ChatMessage[] {
    return this.messages.get(roomId) || [];
  }

  /**
   * Filters messages by sender role (instructor or student)
   * 
   * WHY role filtering:
   * - Instructor-only view: See what instructors said (for review/audit)
   * - Student-only view: See what students asked (for analysis)
   * - Common pattern for moderation and analytics
   * 
   * @param roomId - Room to filter messages from
   * @param role - Role to filter by ('instructor' or 'student')
   * @returns Array of filtered messages
   */
  filterMessagesByRole(
    roomId: string,
    role: 'instructor' | 'student'
  ): ChatMessage[] {
    const messages = this.getMessagesForRoom(roomId);
    return messages.filter(msg => msg.role === role);
  }

  /**
   * Gets recent messages from a room (last N messages)
   * 
   * WHY limit parameter:
   * - Initial load can fetch last 50 messages (performance)
   * - Scroll up to load more (pagination pattern)
   * - Avoids sending thousands of messages to client at once
   * 
   * @param roomId - Room to retrieve messages from
   * @param limit - Maximum number of messages to return (most recent)
   * @returns Array of recent messages in chronological order
   */
  getRecentMessages(roomId: string, limit: number = 50): ChatMessage[] {
    const messages = this.getMessagesForRoom(roomId);
    
    // Return last N messages (most recent)
    if (messages.length <= limit) {
      return messages;
    }
    
    return messages.slice(-limit);
  }

  /**
   * Gets messages from a room since a specific timestamp
   * 
   * WHY time-based filtering:
   * - Client polling: "Give me messages since last fetch"
   * - Efficient updates without re-fetching all messages
   * - Enables real-time chat updates
   * 
   * @param roomId - Room to retrieve messages from
   * @param since - Timestamp to filter from (exclusive)
   * @returns Array of messages after the given timestamp
   */
  getMessagesSince(roomId: string, since: Date): ChatMessage[] {
    const messages = this.getMessagesForRoom(roomId);
    return messages.filter(msg => msg.timestamp > since);
  }

  /**
   * Gets all messages from all rooms for a session
   * 
   * WHY session-wide view:
   * - Instructor can see all chat activity (main + breakout rooms)
   * - Export functionality: Generate full chat transcript
   * - Analytics: See overall participation and engagement
   * 
   * @param sessionId - Session to retrieve messages for
   * @returns Map of roomId → messages array
   */
  getAllMessagesForSession(sessionId: string): Map<string, ChatMessage[]> {
    const sessionMessages = new Map<string, ChatMessage[]>();
    
    for (const [roomId, messages] of this.messages.entries()) {
      const roomSessionMessages = messages.filter(msg => msg.sessionId === sessionId);
      if (roomSessionMessages.length > 0) {
        sessionMessages.set(roomId, roomSessionMessages);
      }
    }
    
    return sessionMessages;
  }

  /**
   * Gets total message count for a room
   * 
   * WHY useful:
   * - Display message count in UI ("42 messages")
   * - Pagination: Know total before fetching
   * - Analytics: Track chat activity levels
   * 
   * @param roomId - Room to count messages for
   * @returns Total number of messages in room
   */
  getMessageCount(roomId: string): number {
    const messages = this.messages.get(roomId);
    return messages ? messages.length : 0;
  }

  /**
   * Clears all messages for a specific room
   * 
   * WHY manual cleanup:
   * - In-memory data doesn't auto-expire
   * - Must be called when room closes (breakout ends, session ends)
   * - Prevents memory leaks from abandoned rooms
   * 
   * Call this when:
   * - Breakout room closes
   * - Main classroom session ends
   * - Testing/development (reset between tests)
   * 
   * @param roomId - Room to clear messages from
   */
  clear(roomId: string): void {
    this.messages.delete(roomId);
  }

  /**
   * Clears all messages for all rooms in a session
   * 
   * WHY session-wide cleanup:
   * - When main classroom session ends, clear all associated chat
   * - Includes main room + all breakout rooms
   * - Prevents memory leaks from multiple rooms
   * 
   * @param sessionId - Session to clear messages for
   */
  clearSession(sessionId: string): void {
    const roomsToDelete: string[] = [];
    
    for (const [roomId, messages] of this.messages.entries()) {
      // Check if any message in this room belongs to the session
      const hasSessionMessages = messages.some(msg => msg.sessionId === sessionId);
      if (hasSessionMessages) {
        roomsToDelete.push(roomId);
      }
    }
    
    // Delete all rooms belonging to this session
    roomsToDelete.forEach(roomId => this.messages.delete(roomId));
  }

  /**
   * Gets all active room IDs
   * 
   * WHY useful:
   * - Monitoring: See which rooms have active chat
   * - Cleanup: Find rooms to clear
   * - Debugging: Verify rooms are being tracked
   * 
   * @returns Array of room IDs that have messages
   */
  getRoomIds(): string[] {
    return Array.from(this.messages.keys());
  }

  /**
   * Gets total message count across all rooms (for monitoring)
   * 
   * WHY monitoring:
   * - Track memory usage (messages × 150 bytes)
   * - Detect excessive chat activity
   * - Performance testing validation
   * 
   * @returns Total number of messages across all rooms
   */
  getTotalMessageCount(): number {
    return Array.from(this.messages.values())
      .reduce((sum, messages) => sum + messages.length, 0);
  }

  /**
   * Clears all messages from all rooms (for testing/development)
   * 
   * WHY separate from clear():
   * - clear() is per-room (normal operation)
   * - clearAll() is global (testing only)
   * - Makes intent explicit in code
   */
  clearAll(): void {
    this.messages.clear();
  }
}

/**
 * Singleton instance for chat service
 * Exported for use in API routes and components
 */
export const chatService = new ChatService();

