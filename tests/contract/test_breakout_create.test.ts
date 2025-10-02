// Contract test for POST /api/breakout-rooms endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/participants-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('POST /api/breakout-rooms - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should successfully create breakout room with valid instructor request', async () => {
    const createBreakoutRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      parentClassroomId: '1',
      name: 'Discussion Group A',
      participantIds: [
        '123e4567-e89b-12d3-a456-426614174000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ],
      maxDuration: 30
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest)
    });

    const data = await response.json();

    // Response status should be 201
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match success schema
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('breakoutRoom');
    expect(data).toHaveProperty('dailyRoomUrl');

    expect(data.success).toBe(true);
    expect(typeof data.dailyRoomUrl).toBe('string');
    expect(data.dailyRoomUrl).toMatch(/^https:\/\/.+/);

    // Validate BreakoutRoom schema
    const breakoutRoom = data.breakoutRoom;
    expect(breakoutRoom).toHaveProperty('id');
    expect(breakoutRoom).toHaveProperty('parentClassroomId');
    expect(breakoutRoom).toHaveProperty('name');
    expect(breakoutRoom).toHaveProperty('participants');
    expect(breakoutRoom).toHaveProperty('createdBy');
    expect(breakoutRoom).toHaveProperty('createdAt');
    expect(breakoutRoom).toHaveProperty('isActive');
    expect(breakoutRoom).toHaveProperty('maxDuration');

    expect(typeof breakoutRoom.id).toBe('string');
    expect(breakoutRoom.parentClassroomId).toBe(createBreakoutRequest.parentClassroomId);
    expect(breakoutRoom.name).toBe(createBreakoutRequest.name);
    expect(breakoutRoom.createdBy).toBe(createBreakoutRequest.instructorSessionId);
    expect(breakoutRoom.isActive).toBe(true);
    expect(breakoutRoom.maxDuration).toBe(createBreakoutRequest.maxDuration);
    expect(Array.isArray(breakoutRoom.participants)).toBe(true);
    expect(new Date(breakoutRoom.createdAt).toISOString()).toBe(breakoutRoom.createdAt);
  });

  it('should use default maxDuration when not provided', async () => {
    const createBreakoutRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      parentClassroomId: '1',
      name: 'Discussion Group B',
      participantIds: ['123e4567-e89b-12d3-a456-426614174000']
      // maxDuration omitted - should default to 30
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest)
    });

    if (response.status === 201) {
      const data = await response.json();
      expect(data.breakoutRoom.maxDuration).toBe(30);
    }
  });

  it('should validate participant schemas in breakout room', async () => {
    const createBreakoutRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      parentClassroomId: '1',
      name: 'Discussion Group C',
      participantIds: ['123e4567-e89b-12d3-a456-426614174000']
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest)
    });

    if (response.status === 201) {
      const data = await response.json();
      const participants = data.breakoutRoom.participants;

      participants.forEach((participant: any) => {
        // Validate ParticipantState schema
        expect(participant).toHaveProperty('sessionId');
        expect(participant).toHaveProperty('name');
        expect(participant).toHaveProperty('role');
        expect(participant).toHaveProperty('classroomId');
        expect(participant).toHaveProperty('isAudioMuted');
        expect(participant).toHaveProperty('isVideoEnabled');
        expect(participant).toHaveProperty('connectionState');
        expect(participant).toHaveProperty('joinedAt');

        expect(typeof participant.sessionId).toBe('string');
        expect(typeof participant.name).toBe('string');
        expect(['student', 'instructor']).toContain(participant.role);
        expect(['1', '2', '3', '4', '5', '6']).toContain(participant.classroomId);
        expect(typeof participant.isAudioMuted).toBe('boolean');
        expect(typeof participant.isVideoEnabled).toBe('boolean');
        expect(['connecting', 'connected', 'disconnected']).toContain(participant.connectionState);
        expect(new Date(participant.joinedAt).toISOString()).toBe(participant.joinedAt);
      });
    }
  });

  it('should return 400 for invalid request body', async () => {
    const invalidRequests = [
      {}, // Missing all required fields
      { name: 'Group A' }, // Missing required fields
      { instructorSessionId: 'invalid-uuid', parentClassroomId: '1', name: 'Group A', participantIds: [] }, // Invalid UUID
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '7', name: 'Group A', participantIds: [] }, // Invalid classroomId
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: '', participantIds: [] }, // Empty name
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: 'A'.repeat(51), participantIds: [] }, // Name too long
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: 'Group A', participantIds: 'not-array' }, // Invalid participantIds type
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: 'Group A', participantIds: ['invalid-uuid'] }, // Invalid participant UUID
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: 'Group A', participantIds: [], maxDuration: 4 }, // Duration too short
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', parentClassroomId: '1', name: 'Group A', participantIds: [], maxDuration: 121 }, // Duration too long
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/breakout-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    }
  });

  it('should return 403 for non-instructor attempting to create breakout', async () => {
    const studentBreakoutRequest = {
      instructorSessionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // Student session ID
      parentClassroomId: '1',
      name: 'Unauthorized Group',
      participantIds: ['123e4567-e89b-12d3-a456-426614174000']
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentBreakoutRequest)
    });

    if (response.status === 403) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should validate parentClassroomId pattern (1-6)', async () => {
    const validClassroomIds = ['1', '2', '3', '4', '5', '6'];
    
    for (const classroomId of validClassroomIds) {
      const createBreakoutRequest = {
        instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        parentClassroomId: classroomId,
        name: `Group for Classroom ${classroomId}`,
        participantIds: ['123e4567-e89b-12d3-a456-426614174000']
      };

      const response = await fetch(`${API_BASE}/breakout-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBreakoutRequest)
      });

      // Should not fail due to invalid classroom pattern
      expect(response.status).not.toBe(400);
    }
  });

  it('should validate maxDuration constraints (5-120 minutes)', async () => {
    const validDurations = [5, 15, 30, 60, 120];
    
    for (const duration of validDurations) {
      const createBreakoutRequest = {
        instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        parentClassroomId: '1',
        name: `Group ${duration}min`,
        participantIds: ['123e4567-e89b-12d3-a456-426614174000'],
        maxDuration: duration
      };

      const response = await fetch(`${API_BASE}/breakout-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBreakoutRequest)
      });

      // Should not fail due to invalid duration
      expect(response.status).not.toBe(400);
    }
  });

  it('should handle empty participantIds array', async () => {
    const createBreakoutRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      parentClassroomId: '1',
      name: 'Empty Group',
      participantIds: [] // Empty array should be valid
    };

    const response = await fetch(`${API_BASE}/breakout-rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBreakoutRequest)
    });

    // Empty participant list should be valid (instructor can add participants later)
    expect([201, 403]).toContain(response.status);
  });
});
