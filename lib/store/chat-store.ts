/**
 * Chat Store
 * 
 * Manages text chat messages scoped by room (main classroom + up to 10 breakout rooms).
 * 
 * WHY room-scoped chat:
 * - Main classroom has one shared chat (visible to all)
 * - Each breakout room has isolated chat (visible only to members + instructor)
 * - Instructor can view/send to any room (monitoring + support)
 * - Students only see their current room's chat
 * 
 * WHY atomFamily pattern:
 * - Each room gets its own independent message array
 * - Rooms are created/destroyed dynamically (1-10 breakout rooms)
 * - atomFamily creates atoms on-demand (keyed by roomId)
 * - Memory efficient: unused rooms don't allocate memory
 * - Cleanup: atoms garbage-collected when no longer referenced
 * 
 * WHY in-memory only:
 * - Chat is ephemeral (session context)
 * - No requirement to persist chat history between sessions
 * - Reduces complexity (no database, no export needed)
 * - Aligns with transcript/quiz storage approach
 * 
 * Memory estimate:
 * - Average message: ~200 bytes (timestamp + sender + text)
 * - Typical session: 100 messages/room × 11 rooms = 220 KB
 * - Acceptable for in-memory (< 1 MB even with heavy usage)
 * 
 * Room ID conventions:
 * - 'main' = main classroom chat
 * - UUID strings = breakout room IDs (e.g., 'breakout-uuid-123')
 */

import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

/**
 * Chat message structure
 * 
 * Matches data-model.md specification for ChatMessage entity
 */
export interface ChatMessage {
  /** Unique message identifier (UUID) */
  id: string;
  
  /** When message was sent (ISO timestamp) */
  timestamp: Date;
  
  /** Participant session ID from Daily.co */
  senderId: string;
  
  /** Display name of sender (e.g., "Alice", "Professor Smith") */
  senderName: string;
  
  /** Sender's role (affects visibility permissions) */
  role: 'instructor' | 'student';
  
  /** Message content (max 2000 characters) */
  text: string;
  
  /** Which room this message belongs to ('main' or breakout ID) */
  roomId: string;
  
  /** Classroom session identifier (for filtering/cleanup) */
  sessionId: string;
}

/**
 * atomFamily for chat messages, keyed by roomId
 * 
 * WHY atomFamily instead of single atom with Map:
 * - Each room is truly independent (no shared state)
 * - Components subscribe only to their room (efficient re-renders)
 * - Room creation/deletion handled automatically
 * - Follows Jotai best practices for dynamic collections
 * 
 * Usage:
 * ```tsx
 * const [mainChatMessages] = useAtom(chatMessagesAtomFamily('main'));
 * const [breakoutMessages] = useAtom(chatMessagesAtomFamily('breakout-uuid-123'));
 * ```
 * 
 * Each roomId gets its own message array, sorted chronologically
 */
export const chatMessagesAtomFamily = atomFamily((_roomId: string) =>
  atom<ChatMessage[]>([])
);

/**
 * Active chat room atom
 * 
 * WHY needed:
 * - Instructor can switch between viewing different room chats
 * - UI shows messages from activeRoom
 * - Students automatically set to their current room
 * - Defaults to 'main' (everyone starts in main classroom)
 * 
 * State changes:
 * - Student joins breakout: activeRoom = breakout ID
 * - Student returns to main: activeRoom = 'main'
 * - Instructor manually switches: activeRoom = selected room
 */
export const activeRoomAtom = atom<string>('main');

/**
 * Unread message counts per room
 * 
 * WHY track unread counts:
 * - Show notification badges (e.g., "3 unread in Breakout Room 2")
 * - Instructor sees which rooms have new activity
 * - Students see if they missed messages while away
 * 
 * WHY Record instead of Map:
 * - Simpler serialization (if we add persistence later)
 * - Works better with React rendering (object comparison)
 * - TypeScript Record type is more ergonomic
 * 
 * Structure: { [roomId]: unreadCount }
 * Example: { 'main': 0, 'breakout-abc': 3, 'breakout-xyz': 1 }
 * 
 * Update logic:
 * - Increment when message arrives in non-active room
 * - Reset to 0 when user switches to that room (marks as read)
 */
export const unreadCountsAtom = atom<Record<string, number>>({});

/**
 * Derived atom: Total unread count across all rooms
 * 
 * WHY useful:
 * - Show global badge ("5 unread messages")
 * - Instructor sees total pending notifications at a glance
 * - Simpler than summing in every component
 * 
 * Usage:
 * ```tsx
 * const totalUnread = useAtomValue(totalUnreadCountAtom);
 * return <Badge>{totalUnread > 0 && totalUnread}</Badge>;
 * ```
 */
export const totalUnreadCountAtom = atom((get) => {
  const counts = get(unreadCountsAtom);
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
});

/**
 * Derived atom: List of rooms with unread messages
 * 
 * WHY useful:
 * - Highlight which specific rooms need attention
 * - Sort room list by unread status (rooms with messages first)
 * - Show "You have messages in: Room A, Room B"
 * 
 * Returns array of roomIds that have unread > 0
 */
export const roomsWithUnreadAtom = atom((get) => {
  const counts = get(unreadCountsAtom);
  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .map(([roomId, _]) => roomId);
});

/**
 * Helper: Get messages for current active room
 * 
 * WHY convenient:
 * - Most components want messages from active room
 * - Avoids repeating activeRoomAtom + chatMessagesAtomFamily pattern
 * - Reads more naturally: "get active chat messages"
 * 
 * Note: This is a derived atom that combines two other atoms
 */
export const activeChatMessagesAtom = atom((get) => {
  const activeRoom = get(activeRoomAtom);
  const messages = get(chatMessagesAtomFamily(activeRoom));
  return messages;
});

/**
 * Helper: Get unread count for current active room
 * 
 * WHY useful:
 * - Show unread badge for current room
 * - "3 earlier messages you haven't seen"
 * - Combined with activeChatMessagesAtom for complete view
 */
export const activeRoomUnreadCountAtom = atom((get) => {
  const activeRoom = get(activeRoomAtom);
  const counts = get(unreadCountsAtom);
  return counts[activeRoom] || 0;
});

