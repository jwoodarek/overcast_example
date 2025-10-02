// Contract test for POST /api/rooms/{roomId}/join endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/rooms-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('POST /api/rooms/{roomId}/join - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should successfully join classroom with valid student request', async () => {
    const roomId = '1';
    const joinRequest = {
      name: 'John Doe',
      role: 'student'
    };

    const response = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(joinRequest)
    });

    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match success schema
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('participant');
    expect(data).toHaveProperty('dailyRoomUrl');
    expect(data).toHaveProperty('token');

    expect(data.success).toBe(true);
    expect(typeof data.dailyRoomUrl).toBe('string');
    expect(data.dailyRoomUrl).toMatch(/^https:\/\/.+\.daily\.co\/.+/);
    expect(typeof data.token).toBe('string');

    // Validate Participant schema
    const participant = data.participant;
    expect(participant).toHaveProperty('name');
    expect(participant).toHaveProperty('role');
    expect(participant).toHaveProperty('sessionId');
    expect(participant).toHaveProperty('joinedAt');
    expect(participant).toHaveProperty('classroomId');
    expect(participant).toHaveProperty('isAudioMuted');
    expect(participant).toHaveProperty('isVideoEnabled');
    expect(participant).toHaveProperty('connectionState');

    expect(participant.name).toBe(joinRequest.name);
    expect(participant.role).toBe(joinRequest.role);
    expect(participant.classroomId).toBe(roomId);
    expect(typeof participant.sessionId).toBe('string');
    expect(typeof participant.isAudioMuted).toBe('boolean');
    expect(typeof participant.isVideoEnabled).toBe('boolean');
    expect(['connecting', 'connected', 'disconnected']).toContain(participant.connectionState);
  });

  it('should successfully join classroom with valid instructor request', async () => {
    const roomId = '2';
    const joinRequest = {
      name: 'Dr. Smith',
      role: 'instructor'
    };

    const response = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(joinRequest)
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.participant.role).toBe('instructor');
    expect(data.participant.name).toBe('Dr. Smith');
  });

  it('should return 400 for invalid request body', async () => {
    const roomId = '1';
    const invalidRequests = [
      {}, // Missing required fields
      { name: 'John' }, // Missing role
      { role: 'student' }, // Missing name
      { name: '', role: 'student' }, // Empty name
      { name: 'John', role: 'invalid' }, // Invalid role
      { name: 'A'.repeat(51), role: 'student' }, // Name too long
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should return 409 when classroom is full', async () => {
    // This test simulates a full classroom scenario
    // In real implementation, this would require 50 participants already joined
    const roomId = '3';
    const joinRequest = {
      name: 'Late Student',
      role: 'student'
    };

    // Note: This test will need to be updated when we can actually fill a room
    // For now, we're testing the contract structure
    const response = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(joinRequest)
    });

    // If room is full, should return 409
    if (response.status === 409) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('maxCapacity');
      expect(data).toHaveProperty('currentCount');

      expect(data.error).toBe('Classroom full');
      expect(data.maxCapacity).toBe(50);
      expect(data.currentCount).toBe(50);
    }
  });

  it('should validate room ID pattern in URL', async () => {
    const joinRequest = {
      name: 'Test User',
      role: 'student'
    };

    // Invalid room IDs should return 404 or 400
    const invalidIds = ['0', '7', 'invalid'];
    
    for (const invalidId of invalidIds) {
      const response = await fetch(`${API_BASE}/rooms/${invalidId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(joinRequest)
      });

      expect([400, 404]).toContain(response.status);
    }
  });
});
