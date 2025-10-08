// Contract test for POST /api/breakout-rooms endpoint (Enhanced)
// Tests the API contract defined in specs/004-audio-video-controls/contracts/breakout-enhancements-api.yaml
// This test validates the enhanced breakout creation supporting 1-10 rooms with participant assignments

import { describe, it, expect } from '@jest/globals';

describe('POST /api/breakout-rooms - Enhanced Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should create multiple breakout rooms with participant assignments', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-123',
      rooms: [
        {
          name: 'Group A',
          participantIds: ['participant-1', 'participant-2'],
        },
        {
          name: 'Group B',
          participantIds: ['participant-3', 'participant-4'],
        },
        {
          name: 'Group C',
          participantIds: ['participant-5'],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Response status should be 201 Created
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match contract schema
    expect(data).toHaveProperty('rooms');
    expect(data).toHaveProperty('message');

    // Should have created 3 rooms
    expect(Array.isArray(data.rooms)).toBe(true);
    expect(data.rooms).toHaveLength(3);
    expect(data.message).toContain('3');
    expect(data.message).toContain('breakout');

    // Each room should match BreakoutRoom schema
    data.rooms.forEach((room: any, index: number) => {
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('dailyRoomUrl');
      expect(room).toHaveProperty('participantIds');
      expect(room).toHaveProperty('status');
      expect(room).toHaveProperty('createdAt');

      // Validate types and constraints
      expect(typeof room.id).toBe('string');
      expect(room.id.length).toBeGreaterThan(0);
      expect(typeof room.name).toBe('string');
      expect(typeof room.dailyRoomUrl).toBe('string');
      expect(room.dailyRoomUrl).toMatch(/^https:\/\/.+/);
      expect(Array.isArray(room.participantIds)).toBe(true);
      expect(room.status).toBe('active');
      expect(typeof room.createdAt).toBe('string');
      expect(new Date(room.createdAt).toString()).not.toBe('Invalid Date');
    });
  });

  it('should create a single breakout room', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-456',
      rooms: [
        {
          name: 'Solo Group',
          participantIds: ['participant-1', 'participant-2', 'participant-3'],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.rooms).toHaveLength(1);
    expect(data.rooms[0].name).toBe('Solo Group');
    expect(data.rooms[0].participantIds).toHaveLength(3);
  });

  it('should allow empty participant lists', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-789',
      rooms: [
        {
          name: 'Empty Room',
          participantIds: [],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Empty participant list should be valid - instructor can add later
    expect(response.status).toBe(201);
    expect(data.rooms[0].participantIds).toHaveLength(0);
  });

  it('should reject requests with more than 10 rooms', async () => {
    const rooms = Array.from({ length: 11 }, (_, i) => ({
      name: `Group ${i + 1}`,
      participantIds: [],
    }));

    const createBreakoutRequest = {
      sessionId: 'test-session-abc',
      rooms,
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('10');
  });

  it('should reject duplicate participant assignments', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-def',
      rooms: [
        {
          name: 'Group A',
          participantIds: ['participant-1', 'participant-2'],
        },
        {
          name: 'Group B',
          participantIds: ['participant-2', 'participant-3'], // participant-2 is duplicate
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('participant') || 
      expect(data.error.toLowerCase()).toContain('multiple');
  });

  it('should reject empty room names', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-ghi',
      rooms: [
        {
          name: '',
          participantIds: ['participant-1'],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should reject room names exceeding 100 characters', async () => {
    const longName = 'A'.repeat(101);
    const createBreakoutRequest = {
      sessionId: 'test-session-jkl',
      rooms: [
        {
          name: longName,
          participantIds: ['participant-1'],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should reject missing required fields', async () => {
    const invalidRequests = [
      {}, // Missing all fields
      { sessionId: 'test-session-123' }, // Missing rooms
      { rooms: [] }, // Missing sessionId
      {
        sessionId: 'test-session-123',
        rooms: [{ participantIds: [] }], // Missing name
      },
      {
        sessionId: 'test-session-123',
        rooms: [{ name: 'Group A' }], // Missing participantIds
      },
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/breakout-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    }
  });

  it('should handle maximum of 10 rooms successfully', async () => {
    const rooms = Array.from({ length: 10 }, (_, i) => ({
      name: `Group ${i + 1}`,
      participantIds: [`participant-${i + 1}`],
    }));

    const createBreakoutRequest = {
      sessionId: 'test-session-mno',
      rooms,
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    // Should successfully create 10 rooms
    expect(response.status).toBe(201);
    expect(data.rooms).toHaveLength(10);
    expect(data.message).toContain('10');
  });

  it('should validate closedAt is null for newly created rooms', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-pqr',
      rooms: [
        {
          name: 'New Room',
          participantIds: ['participant-1'],
        },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.rooms[0]).toHaveProperty('closedAt');
    expect(data.rooms[0].closedAt).toBeNull();
  });

  it('should return unique IDs for each breakout room', async () => {
    const createBreakoutRequest = {
      sessionId: 'test-session-stu',
      rooms: [
        { name: 'Room 1', participantIds: [] },
        { name: 'Room 2', participantIds: [] },
        { name: 'Room 3', participantIds: [] },
      ],
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    
    const roomIds = data.rooms.map((room: any) => room.id);
    const uniqueIds = new Set(roomIds);
    
    // All IDs should be unique
    expect(uniqueIds.size).toBe(roomIds.length);
  });
});
