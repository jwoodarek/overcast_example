/**
 * Breakout Room Service
 * 
 * Centralized in-memory storage and business logic for breakout rooms.
 * 
 * WHY separate service:
 * - Share state across multiple API route files
 * - Centralize validation and business logic
 * - Make testing easier (mock the service instead of routes)
 * - Follow separation of concerns (routes handle HTTP, service handles data)
 * 
 * WHY in-memory storage:
 * - No database dependency for MVP
 * - Breakout rooms are session-scoped (cleared when session ends)
 * - Lightweight data structure (~500 bytes per room × 10 rooms = 5 KB)
 * - Fast access (Map lookups are O(1))
 * 
 * Storage lifecycle:
 * - Created when POST /api/breakout-rooms is called
 * - Updated when PATCH /api/breakout-rooms/[roomId] is called
 * - Closed (status='closed') when DELETE /api/breakout-rooms/[roomId] is called
 * - Remains in memory until server restart (could add TTL cleanup later)
 */

import { generateUUID } from '../utils';

/**
 * BreakoutRoom entity matching data-model.md
 */
export interface BreakoutRoom {
  id: string;
  name: string;
  dailyRoomUrl: string;
  participantIds: string[];
  status: 'active' | 'closed';
  createdAt: Date;
  closedAt?: Date;
  parentClassroomId?: string; // Added for compatibility with existing code
  createdBy?: string; // Instructor session ID who created it
  maxDuration?: number; // Optional maximum duration in minutes
}

/**
 * In-memory storage for breakout rooms
 * Module-level Map persists across requests in the same Node.js process
 * 
 * WHY Map instead of object:
 * - Better performance for frequent get/set operations
 * - Has size property for quick count
 * - Maintains insertion order (useful for "created order" sorting)
 */
const breakoutRooms = new Map<string, BreakoutRoom>();

/**
 * Get a breakout room by ID
 * 
 * @param id - Breakout room ID
 * @returns BreakoutRoom or undefined if not found
 */
export function getBreakoutRoom(id: string): BreakoutRoom | undefined {
  return breakoutRooms.get(id);
}

/**
 * Get all active breakout rooms for a specific classroom
 * 
 * WHY filter by status:
 * - UI typically only shows active rooms
 * - Closed rooms are kept for reference but hidden
 * 
 * @param classroomId - Parent classroom ID (1-6)
 * @returns Array of active breakout rooms
 */
export function getActiveBreakoutRooms(classroomId?: string): BreakoutRoom[] {
  const allRooms = Array.from(breakoutRooms.values());
  
  if (classroomId) {
    return allRooms.filter(
      room => room.status === 'active' && room.parentClassroomId === classroomId
    );
  }
  
  return allRooms.filter(room => room.status === 'active');
}

/**
 * Get all breakout rooms (active and closed) for a classroom
 * 
 * @param classroomId - Parent classroom ID (1-6)
 * @returns Array of all breakout rooms
 */
export function getAllBreakoutRooms(classroomId?: string): BreakoutRoom[] {
  const allRooms = Array.from(breakoutRooms.values());
  
  if (classroomId) {
    return allRooms.filter(room => room.parentClassroomId === classroomId);
  }
  
  return allRooms;
}

/**
 * Create a new breakout room
 * 
 * @param data - Breakout room creation data
 * @returns Created breakout room
 */
export function createBreakoutRoom(data: {
  name: string;
  participantIds: string[];
  parentClassroomId?: string;
  createdBy?: string;
  maxDuration?: number;
}): BreakoutRoom {
  const id = generateUUID();
  
  // Generate Daily.co room URL
  // In production, this would call Daily API to create an actual room
  // For now, use mock URL format consistent with existing pattern
  const dailyRoomUrl = `https://overcast.daily.co/breakout-${id.substring(0, 8)}`;
  
  const breakoutRoom: BreakoutRoom = {
    id,
    name: data.name,
    dailyRoomUrl,
    participantIds: data.participantIds,
    status: 'active',
    createdAt: new Date(),
    parentClassroomId: data.parentClassroomId,
    createdBy: data.createdBy,
    maxDuration: data.maxDuration || 30,
  };
  
  breakoutRooms.set(id, breakoutRoom);
  
  return breakoutRoom;
}

/**
 * Update participant assignments in a breakout room
 * 
 * WHY replace instead of merge:
 * - Simpler logic (no need to track add/remove operations)
 * - Instructor has full control over assignments
 * - Prevents edge cases with duplicate participants
 * 
 * @param roomId - Breakout room ID
 * @param participantIds - New participant list (replaces existing)
 * @returns Updated breakout room or undefined if not found
 */
export function updateBreakoutRoomParticipants(
  roomId: string,
  participantIds: string[]
): BreakoutRoom | undefined {
  const room = breakoutRooms.get(roomId);
  
  if (!room) {
    return undefined;
  }
  
  // Cannot reassign participants in a closed room
  if (room.status === 'closed') {
    return undefined;
  }
  
  room.participantIds = participantIds;
  breakoutRooms.set(roomId, room);
  
  return room;
}

/**
 * Close a breakout room (soft delete)
 * 
 * WHY soft delete:
 * - Keeps room data for reference (instructor might want to see history)
 * - Can track how long room was active (closedAt - createdAt)
 * - Easier to debug issues if data is preserved
 * 
 * @param roomId - Breakout room ID
 * @returns Closed breakout room or undefined if not found
 */
export function closeBreakoutRoom(roomId: string): BreakoutRoom | undefined {
  const room = breakoutRooms.get(roomId);
  
  if (!room) {
    return undefined;
  }
  
  // Already closed
  if (room.status === 'closed') {
    return room;
  }
  
  room.status = 'closed';
  room.closedAt = new Date();
  breakoutRooms.set(roomId, room);
  
  return room;
}

/**
 * Count active breakout rooms for a classroom
 * 
 * WHY useful:
 * - Enforce 10-room maximum (validation before creating new room)
 * - Display capacity in UI ("3 of 10 breakout rooms active")
 * 
 * @param classroomId - Parent classroom ID (1-6)
 * @returns Number of active breakout rooms
 */
export function countActiveBreakoutRooms(classroomId?: string): number {
  return getActiveBreakoutRooms(classroomId).length;
}

/**
 * Validate that participants are not assigned to multiple active rooms
 * 
 * WHY important:
 * - A participant can only be in one room at a time
 * - Prevents conflicts when moving participants between rooms
 * - Returns conflicting room IDs for error messages
 * 
 * @param participantIds - Participant IDs to check
 * @param excludeRoomId - Room ID to exclude from check (for reassignment operations)
 * @returns Array of conflicting room IDs (empty if no conflicts)
 */
export function validateParticipantAvailability(
  participantIds: string[],
  excludeRoomId?: string
): string[] {
  const conflicts: string[] = [];
  const activeRooms = getActiveBreakoutRooms();
  
  for (const room of activeRooms) {
    // Skip the room being updated (for reassignment operations)
    if (excludeRoomId && room.id === excludeRoomId) {
      continue;
    }
    
    // Check if any participant is already in this room
    const hasConflict = participantIds.some(id => room.participantIds.includes(id));
    if (hasConflict) {
      conflicts.push(room.id);
    }
  }
  
  return conflicts;
}

/**
 * Clear all breakout rooms (for testing or cleanup)
 * 
 * WHY needed:
 * - Testing: Reset state between tests
 * - Development: Clear stale data
 * - Production: Manual cleanup if needed (could add TTL-based auto-cleanup)
 */
export function clearAllBreakoutRooms(): void {
  breakoutRooms.clear();
}

/**
 * Get total number of breakout rooms (active + closed)
 * 
 * @returns Total count
 */
export function getTotalBreakoutRoomCount(): number {
  return breakoutRooms.size;
}

