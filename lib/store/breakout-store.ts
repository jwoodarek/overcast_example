/**
 * Breakout Room Store
 * 
 * Manages breakout room creation, participant assignments, and lifecycle.
 * 
 * WHY breakout rooms:
 * - Small group collaboration during class (2-5 students per group)
 * - Instructor can create 1-10 simultaneous breakout rooms
 * - Each room has its own Daily.co video session + scoped chat
 * - Instructor can move participants between rooms or back to main
 * 
 * WHY in-memory storage:
 * - Breakout rooms are session-specific (don't persist between classes)
 * - Lightweight data (~500 bytes per room × 10 rooms = 5 KB)
 * - No database needed for MVP
 * - Easy to reset when session ends
 * 
 * Room lifecycle:
 * 1. Instructor clicks "Create Breakout" → opens modal
 * 2. Assigns participants to rooms → POST /api/breakout-rooms
 * 3. Rooms created with Daily.co API → status: 'active'
 * 4. Participants moved to breakout rooms → can chat/video independently
 * 5. Instructor closes rooms → status: 'closed', participants return to main
 * 6. Session ends → all rooms cleared from memory
 * 
 * Constraints (from research.md and clarifications):
 * - Maximum 10 active breakout rooms per session
 * - Minimum 1 breakout room (instructor can create just one)
 * - Each participant can only be in one breakout at a time
 * - Instructor can view/join any breakout room (observer mode)
 * - Room names must be unique within session
 */

import { atom } from 'jotai';

/**
 * Breakout room entity
 * 
 * Matches data-model.md specification
 */
export interface BreakoutRoom {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Display name (e.g., "Group A", "Breakout Room 1") */
  name: string;
  
  /** Daily.co room URL for this breakout's video session */
  dailyRoomUrl: string;
  
  /** Array of participant session IDs assigned to this room */
  participantIds: string[];
  
  /** Current room state */
  status: 'active' | 'closed';
  
  /** When room was created (for sorting, analytics) */
  createdAt: Date;
  
  /** When room was closed (null if still active) */
  closedAt?: Date;
}

/**
 * Primary breakout rooms atom
 * 
 * WHY array instead of Map:
 * - Small dataset (max 10 rooms)
 * - Array is simpler to iterate/filter in UI
 * - Order matters (show rooms in creation order)
 * - Easy to serialize if we add persistence later
 * 
 * Array sorted by:
 * 1. Status (active rooms first)
 * 2. Creation time (newest first)
 * 
 * Usage:
 * ```tsx
 * const [breakoutRooms, setBreakoutRooms] = useAtom(breakoutRoomsAtom);
 * const activeRooms = breakoutRooms.filter(r => r.status === 'active');
 * ```
 */
export const breakoutRoomsAtom = atom<BreakoutRoom[]>([]);

/**
 * Derived atom: Count of active breakout rooms
 * 
 * WHY important:
 * - Enforce 10-room maximum (show warning if limit reached)
 * - Display in UI ("3 of 10 breakout rooms active")
 * - Enable/disable "Create Breakout" button based on capacity
 * 
 * WHY derived (computed) instead of separate state:
 * - Single source of truth (breakoutRoomsAtom)
 * - Can't get out of sync (always accurate count)
 * - Automatic updates when rooms added/removed
 * - Less code to maintain
 * 
 * Usage:
 * ```tsx
 * const activeCount = useAtomValue(activeBreakoutCountAtom);
 * const canCreateMore = activeCount < 10;
 * ```
 */
export const activeBreakoutCountAtom = atom((get) => {
  const rooms = get(breakoutRoomsAtom);
  return rooms.filter(r => r.status === 'active').length;
});

/**
 * Derived atom: Active breakout rooms only
 * 
 * WHY separate from full list:
 * - UI often shows only active rooms (closed rooms are history)
 * - Filtering in component is repetitive
 * - Makes component code cleaner
 * 
 * Returns rooms sorted by creation time (newest first)
 */
export const activeBreakoutRoomsAtom = atom((get) => {
  const rooms = get(breakoutRoomsAtom);
  return rooms
    .filter(r => r.status === 'active')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
});

/**
 * Derived atom: Map of participant ID to their current breakout room
 * 
 * WHY useful:
 * - Quick lookup: "Which room is Alice in?"
 * - Validation: Prevent assigning participant to multiple rooms
 * - UI indicator: Show participant's current room in participant list
 * 
 * Structure: { [participantId]: roomId }
 * Example: { 'participant-alice': 'breakout-abc', 'participant-bob': 'breakout-xyz' }
 * 
 * Returns only active room assignments (closed rooms excluded)
 * 
 * Usage:
 * ```tsx
 * const participantRooms = useAtomValue(participantToRoomMapAtom);
 * const aliceRoom = participantRooms['participant-alice'];
 * ```
 */
export const participantToRoomMapAtom = atom((get) => {
  const rooms = get(activeBreakoutRoomsAtom);
  const map: Record<string, string> = {};
  
  rooms.forEach(room => {
    room.participantIds.forEach(participantId => {
      map[participantId] = room.id;
    });
  });
  
  return map;
});

/**
 * Derived atom: Participants currently in breakout rooms (not in main room)
 * 
 * WHY useful:
 * - Show which participants are away from main classroom
 * - Calculate "available participants" for new breakout assignments
 * - Instructor dashboard: "5 students in breakouts, 3 in main room"
 * 
 * Returns array of participant IDs currently assigned to active breakout rooms
 */
export const participantsInBreakoutsAtom = atom((get) => {
  const rooms = get(activeBreakoutRoomsAtom);
  const participantIds = new Set<string>();
  
  rooms.forEach(room => {
    room.participantIds.forEach(id => participantIds.add(id));
  });
  
  return Array.from(participantIds);
});

/**
 * Derived atom: Can create more breakout rooms?
 * 
 * WHY important:
 * - Enforce 10-room limit from spec (cannot exceed)
 * - Disable "Create Breakout" button when at capacity
 * - Show helpful message: "Maximum 10 breakout rooms reached"
 * 
 * Usage:
 * ```tsx
 * const canCreate = useAtomValue(canCreateMoreBreakoutsAtom);
 * <Button disabled={!canCreate}>Create Breakout</Button>
 * ```
 */
export const canCreateMoreBreakoutsAtom = atom((get) => {
  const activeCount = get(activeBreakoutCountAtom);
  return activeCount < 10;
});

/**
 * Derived atom: Breakout room summary for debugging
 * 
 * WHY useful during development:
 * - Quick overview in DevTools
 * - See room count, participant distribution, status
 * - Helps debug assignment issues
 * 
 * Returns object with summary statistics
 */
export const breakoutSummaryAtom = atom((get) => {
  const rooms = get(breakoutRoomsAtom);
  const activeRooms = rooms.filter(r => r.status === 'active');
  const totalParticipants = activeRooms.reduce((sum, r) => sum + r.participantIds.length, 0);
  
  return {
    totalRooms: rooms.length,
    activeRooms: activeRooms.length,
    closedRooms: rooms.filter(r => r.status === 'closed').length,
    totalParticipantsInBreakouts: totalParticipants,
    canCreateMore: activeRooms.length < 10,
  };
});

