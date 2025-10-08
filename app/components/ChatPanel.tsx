'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { 
  activeRoomAtom, 
  unreadCountsAtom,
  chatMessagesAtomFamily 
} from '@/lib/store/chat-store';
import { activeBreakoutRoomsAtom } from '@/lib/store/breakout-store';
import Button from './ui/Button';
import { ChatMessage } from '@/lib/types';

interface ChatPanelProps {
  /** Current user's session ID */
  sessionId: string;
  /** Current user's name */
  userName: string;
  /** Current user's role */
  userRole: 'instructor' | 'student';
  /** Current classroom/session ID */
  classroomId: string;
}

/**
 * ChatPanel Component
 * 
 * Text chat interface for classroom communication with breakout room support.
 * 
 * WHY room-scoped chat:
 * - Main classroom: All participants can see messages
 * - Breakout rooms: Only room members + instructor can see messages
 * - Instructor: Can switch between rooms to monitor all conversations
 * 
 * WHY collapsible:
 * - Reduces screen clutter when not in use
 * - Preserves screen space for video feeds
 * - User preference (some prefer always-on, others collapse)
 * 
 * Features:
 * - Message list with sender names and timestamps
 * - Input field with character counter (2000 max)
 * - Auto-scroll to bottom on new messages
 * - Collapsible panel for space management
 * - Room selector (implemented in T043)
 * - Unread message indicators (implemented in T044)
 */
export default function ChatPanel({ 
  sessionId, 
  userName, 
  userRole, 
  classroomId 
}: ChatPanelProps) {
  // Chat state from Jotai store
  // WHY activeChatMessagesAtom: Combines activeRoomAtom + chatMessagesAtomFamily for convenience
  const [activeRoom, setActiveRoom] = useAtom(activeRoomAtom);
  const [messages, setMessages] = useAtom(chatMessagesAtomFamily(activeRoom));
  const unreadCounts = useAtomValue(unreadCountsAtom);
  
  // Breakout rooms for room selector
  const breakoutRooms = useAtomValue(activeBreakoutRoomsAtom);
  
  /**
   * Calculate total unread messages across all rooms (excluding current active room)
   * WHY: Shows badge in header to alert user of messages in other rooms
   */
  const totalUnreadInOtherRooms = Object.entries(unreadCounts)
    .filter(([roomId]) => roomId !== activeRoom)
    .reduce((sum, [, count]) => sum + count, 0);
  
  // Local UI state
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded (chat visible by default)
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  
  // Ref to track last fetch timestamp for polling
  const lastFetchRef = useRef<Date | null>(null);
  
  /**
   * Fetch messages from backend and update store
   * 
   * WHY polling:
   * - Messages are stored in backend chatService after POST
   * - Frontend needs to fetch them to display
   * - WebSocket would be better but polling works for MVP
   * - Fetches new messages every 2 seconds
   * 
   * WHY since parameter:
   * - Only fetch messages newer than last fetch (efficient)
   * - Reduces data transfer and processing
   * - Prevents re-fetching entire history each poll
   */
  const fetchMessages = React.useCallback(async () => {
    try {
      const url = new URL('/api/chat/messages', window.location.origin);
      url.searchParams.set('sessionId', classroomId);
      url.searchParams.set('roomId', activeRoom);
      url.searchParams.set('requesterId', sessionId);
      
      // If we have a last fetch time, only get messages since then
      if (lastFetchRef.current) {
        url.searchParams.set('since', lastFetchRef.current.toISOString());
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Failed to fetch messages:', response.status);
        return;
      }
      
      const data = await response.json();
      
      // Convert ISO timestamps back to Date objects
      const fetchedMessages: ChatMessage[] = data.messages.map((msg: { id: string; timestamp: string; senderId: string; senderName: string; text: string; roomId: string }) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      // Update store with new messages (append to existing)
      if (fetchedMessages.length > 0) {
        setMessages((prev) => {
          // Merge new messages with existing, avoiding duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = fetchedMessages.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newMessages].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
        
        // Update last fetch timestamp to most recent message
        const mostRecent = fetchedMessages[fetchedMessages.length - 1];
        lastFetchRef.current = new Date(mostRecent.timestamp);
      } else if (!lastFetchRef.current) {
        // First fetch with no messages - set timestamp to now
        lastFetchRef.current = new Date();
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  }, [classroomId, activeRoom, sessionId, setMessages]);
  
  /**
   * Poll for new messages every 2 seconds
   * 
   * WHY 2 seconds:
   * - Fast enough to feel real-time (< 5 seconds for chat)
   * - Not too aggressive on server (30 requests/minute max)
   * - Balance between UX and performance
   */
  useEffect(() => {
    // Reset last fetch timestamp when room changes
    lastFetchRef.current = null;
    
    // Initial fetch
    fetchMessages();
    
    // Set up polling interval
    const interval = setInterval(fetchMessages, 2000);
    
    // Cleanup on unmount or room change
    return () => {
      clearInterval(interval);
    };
  }, [fetchMessages]);
  
  /**
   * Auto-scroll to bottom when new messages arrive
   * 
   * WHY auto-scroll:
   * - Chat UX convention: newest messages at bottom
   * - User expects to see new messages immediately
   * - Prevents manual scrolling after each message
   * 
   * WHY check scroll position first:
   * - If user scrolled up to read history, don't interrupt them
   * - Only auto-scroll if already at/near bottom
   */
  useEffect(() => {
    if (!messageListRef.current || messages.length === 0) return;
    
    const container = messageListRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Only auto-scroll if user is already near bottom (not reading history)
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  /**
   * Sends a chat message to the active room
   * 
   * WHY POST to API instead of direct store update:
   * - Server is source of truth (assigns ID, timestamp)
   * - Enables future features: profanity filter, message history, analytics
   * - Consistent with other features (transcripts, alerts, etc.)
   * - Allows backend validation (message length, room exists, etc.)
   * 
   * Flow:
   * 1. Validate message text (not empty, not too long)
   * 2. POST /api/chat/messages
   * 3. Backend stores in chatService (in-memory)
   * 4. Frontend polls or uses WebSocket to get new messages
   * 5. Update local Jotai atom with new message
   */
  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    
    // Validate message
    if (!trimmed) {
      setSendError('Message cannot be empty');
      return;
    }
    
    if (trimmed.length > 2000) {
      setSendError('Message too long (max 2000 characters)');
      return;
    }
    
    try {
      setIsSending(true);
      setSendError(null);
      
      // Send message to backend
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: classroomId,
          senderId: sessionId,
          senderName: userName,
          role: userRole,
          text: trimmed,
          roomId: activeRoom,
        }),
      });
      
      if (!response.ok) {
        // Try to parse error as JSON, but handle non-JSON responses
        let errorMessage = 'Failed to send message';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            // Non-JSON response (likely HTML error page)
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      await response.json();
      
      // Message sent successfully
      // Note: In production, messages would appear via WebSocket or polling
      // The message is already in the backend
      
      // Clear input field
      setMessageText('');
      
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };
  
  /**
   * Handle Enter key to send message
   * WHY: Chat UX convention - Enter sends, Shift+Enter for new line
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSendMessage();
    }
  };
  
  /**
   * Format timestamp for message display
   * WHY relative times: More natural for chat ("2 minutes ago" vs "14:23:45")
   */
  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    // Fall back to time format for older messages
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  /**
   * Handle room change from dropdown
   * WHY update activeRoomAtom: Chat messages are scoped by room
   * WHY reset unread count: User has viewed this room
   */
  const handleRoomChange = (roomId: string) => {
    setActiveRoom(roomId);
    
    // Reset unread count for this room when user switches to it
    // Note: This should be handled by the store, but for now we'll just switch rooms
    // The unread count reset will be handled by a separate effect or API call
  };
  
  /**
   * Character count for input field
   * WHY visible counter: User knows when approaching limit, prevents frustration
   */
  const characterCount = messageText.length;
  const characterLimit = 2000;
  const isNearLimit = characterCount > characterLimit * 0.9; // Warn at 90%
  const isOverLimit = characterCount > characterLimit;
  
  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
      {/* Header with collapse toggle - responsive padding */}
      <div className="flex items-center justify-between p-2 md:p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative">
            <svg 
              className="w-5 h-5 text-teal-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
            
            {/* Notification badge for unread messages in other rooms */}
            {totalUnreadInOtherRooms > 0 && (
              <span 
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-xs font-bold text-white bg-red-600 rounded-full border border-gray-800"
                title={`${totalUnreadInOtherRooms} unread message${totalUnreadInOtherRooms === 1 ? '' : 's'} in other rooms`}
              >
                {totalUnreadInOtherRooms > 9 ? '9+' : totalUnreadInOtherRooms}
              </span>
            )}
          </div>
          <h3 className="text-xs md:text-sm font-semibold text-teal-400">
            Chat
          </h3>
        </div>
        
        {/* Collapse/expand icon */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-200 transition-colors"
          aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
          aria-expanded={isExpanded}
          aria-controls="chat-messages"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </button>
      </div>
      
      {/* Room selector (only visible when expanded and when there are rooms to choose from) */}
      {isExpanded && (
        <div className="px-3 pt-3 pb-2 border-b border-gray-700 bg-gray-800">
          <label className="block text-xs text-gray-400 mb-1">
            Room
          </label>
          <select
            value={activeRoom}
            onChange={(e) => handleRoomChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {/* Main room option */}
            <option value="main">
              Main Room
              {unreadCounts['main'] > 0 && ` (${unreadCounts['main']} unread)`}
            </option>
            
            {/* Breakout room options */}
            {breakoutRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
                {unreadCounts[room.id] > 0 && ` (${unreadCounts[room.id]} unread)`}
              </option>
            ))}
          </select>
          
          {/* Helper text for instructors */}
          {userRole === 'instructor' && breakoutRooms.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              You can view and send messages to any room
            </p>
          )}
        </div>
      )}
      
      {/* Chat content (collapsible) */}
      {isExpanded && (
        <>
          {/* Message list */}
          <div 
            ref={messageListRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-900"
            style={{ maxHeight: '400px' }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.senderId === sessionId;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender name and timestamp */}
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.role === 'instructor' ? 'text-teal-400' : 'text-gray-400'
                      }`}>
                        {msg.senderName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    
                    {/* Message bubble */}
                    <div 
                      className={`px-3 py-2 rounded-lg max-w-[80%] ${
                        isOwnMessage 
                          ? 'bg-teal-700 text-white' 
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            {/* Error message */}
            {sendError && (
              <div className="mb-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded text-red-400 text-xs">
                {sendError}
              </div>
            )}
            
            {/* Textarea and send button */}
            <div className="flex space-x-2">
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className={`w-full px-3 py-2 bg-gray-700 border ${
                    isOverLimit ? 'border-red-500' : 'border-gray-600'
                  } rounded-md text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none`}
                  rows={2}
                  disabled={isSending}
                />
                
                {/* Character counter */}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                  <span className={`text-xs ${
                    isOverLimit ? 'text-red-400' : 
                    isNearLimit ? 'text-yellow-400' : 
                    'text-gray-500'
                  }`}>
                    {characterCount}/{characterLimit}
                  </span>
                </div>
              </div>
              
              <Button
                variant="primary"
                size="md"
                onClick={handleSendMessage}
                disabled={isSending || !messageText.trim() || isOverLimit}
                loading={isSending}
                className="self-start"
              >
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

