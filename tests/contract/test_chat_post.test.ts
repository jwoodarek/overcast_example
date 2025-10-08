// Contract test for POST /api/chat/messages endpoint
// Tests the API contract defined in specs/004-audio-video-controls/contracts/chat-api.yaml
// This test validates request/response schema per TDD approach - implementation follows in Phase 3.2

import { describe, it, expect } from '@jest/globals';

describe('POST /api/chat/messages - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should send a chat message and return 201 with message ID and timestamp', async () => {
    const validPayload = {
      sessionId: 'test-session-123',
      senderId: 'participant-uuid-456',
      senderName: 'Alice',
      role: 'student',
      text: 'Does anyone have a question about the assignment?',
      roomId: 'main',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    const data = await response.json();

    // Response status should be 201 Created
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match contract schema
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('message');

    // Validate response field types
    expect(typeof data.id).toBe('string');
    expect(data.id.length).toBeGreaterThan(0);
    expect(typeof data.timestamp).toBe('string');
    // Timestamp should be ISO 8601 format
    expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date');
    expect(data.message).toBe('Message sent');
  });

  it('should reject empty message text with 400 error', async () => {
    const invalidPayload = {
      sessionId: 'test-session-123',
      senderId: 'participant-uuid-456',
      senderName: 'Alice',
      role: 'student',
      text: '',
      roomId: 'main',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('empty');
  });

  it('should reject message exceeding 2000 character limit with 400 error', async () => {
    const longText = 'a'.repeat(2001);
    const invalidPayload = {
      sessionId: 'test-session-123',
      senderId: 'participant-uuid-456',
      senderName: 'Alice',
      role: 'student',
      text: longText,
      roomId: 'main',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('2000') || expect(data.error.toLowerCase()).toContain('limit');
  });

  it('should reject invalid role with 400 error', async () => {
    const invalidPayload = {
      sessionId: 'test-session-123',
      senderId: 'participant-uuid-456',
      senderName: 'Alice',
      role: 'admin', // Invalid role, only 'instructor' and 'student' allowed
      text: 'Hello world',
      roomId: 'main',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should accept instructor role and send to breakout room', async () => {
    const validPayload = {
      sessionId: 'test-session-123',
      senderId: 'instructor-uuid-789',
      senderName: 'Professor Smith',
      role: 'instructor',
      text: 'Great work, everyone!',
      roomId: 'breakout-room-1',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    const data = await response.json();

    // Response status should be 201
    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('timestamp');
  });

  it('should reject missing required fields with 400 error', async () => {
    const incompletePayload = {
      sessionId: 'test-session-123',
      // Missing senderId, senderName, role
      text: 'Hello',
      roomId: 'main',
    };

    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(incompletePayload),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});

