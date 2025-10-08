// Contract test for GET /api/chat/messages endpoint
// Tests the API contract defined in specs/004-audio-video-controls/contracts/chat-api.yaml
// This test validates query params and response schema per TDD approach - implementation follows in Phase 3.2

import { describe, it, expect } from '@jest/globals';

describe('GET /api/chat/messages - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should retrieve messages for a room with correct schema', async () => {
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'main',
      requesterId: 'participant-uuid-456',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match contract schema
    expect(data).toHaveProperty('messages');
    expect(data).toHaveProperty('roomId');
    expect(data).toHaveProperty('hasMore');

    // Validate response structure
    expect(Array.isArray(data.messages)).toBe(true);
    expect(typeof data.roomId).toBe('string');
    expect(typeof data.hasMore).toBe('boolean');
    expect(data.roomId).toBe('main');
  });

  it('should validate each message in response matches ChatMessage schema', async () => {
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'main',
      requesterId: 'participant-uuid-456',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    expect(response.status).toBe(200);

    // If messages exist, validate their structure
    if (data.messages.length > 0) {
      data.messages.forEach((message: any) => {
        // Required fields per ChatMessage schema
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('senderId');
        expect(message).toHaveProperty('senderName');
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('text');
        expect(message).toHaveProperty('roomId');
        expect(message).toHaveProperty('sessionId');

        // Validate field types
        expect(typeof message.id).toBe('string');
        expect(typeof message.timestamp).toBe('string');
        expect(typeof message.senderId).toBe('string');
        expect(typeof message.senderName).toBe('string');
        expect(['instructor', 'student']).toContain(message.role);
        expect(typeof message.text).toBe('string');
        expect(message.text.length).toBeGreaterThan(0);
        expect(typeof message.roomId).toBe('string');
        expect(typeof message.sessionId).toBe('string');

        // Validate timestamp format
        expect(new Date(message.timestamp).toString()).not.toBe('Invalid Date');
      });
    }
  });

  it('should support "since" parameter for polling updates', async () => {
    const sinceTimestamp = new Date('2025-10-08T14:00:00.000Z').toISOString();
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'main',
      requesterId: 'participant-uuid-456',
      since: sinceTimestamp,
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Should accept since parameter without error
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('messages');
    expect(Array.isArray(data.messages)).toBe(true);

    // Messages should be after the "since" timestamp
    if (data.messages.length > 0) {
      data.messages.forEach((message: any) => {
        const messageTime = new Date(message.timestamp).getTime();
        const sinceTime = new Date(sinceTimestamp).getTime();
        expect(messageTime).toBeGreaterThanOrEqual(sinceTime);
      });
    }
  });

  it('should return 403 when requester lacks access to room', async () => {
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'breakout-room-private',
      requesterId: 'student-without-access',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Should return 403 Forbidden
    expect(response.status).toBe(403);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('access') || expect(data.error.toLowerCase()).toContain('forbidden');
  });

  it('should return 404 when room does not exist', async () => {
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'non-existent-room',
      requesterId: 'participant-uuid-456',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Should return 404 Not Found
    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error');
  });

  it('should require all mandatory query parameters', async () => {
    // Missing requesterId
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'main',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Should return 400 Bad Request or similar error
    expect([400, 422]).toContain(response.status);
    expect(data).toHaveProperty('error');
  });

  it('should retrieve messages from breakout room for instructor', async () => {
    const params = new URLSearchParams({
      sessionId: 'test-session-123',
      roomId: 'breakout-room-1',
      requesterId: 'instructor-uuid-789',
    });

    const response = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
    const data = await response.json();

    // Instructor should have access to breakout room messages
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('messages');
    expect(data.roomId).toBe('breakout-room-1');
  });
});

