// Contract test for POST /api/participants/{sessionId}/mute endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/participants-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('POST /api/participants/{sessionId}/mute - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should successfully mute participant with valid instructor request', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const muteRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      muted: true,
      classroomId: '1'
    };

    const response = await fetch(`${API_BASE}/participants/${sessionId}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(muteRequest)
    });

    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match success schema
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('participant');
    expect(data).toHaveProperty('message');

    expect(data.success).toBe(true);
    expect(typeof data.message).toBe('string');

    // Validate ParticipantState schema
    const participant = data.participant;
    expect(participant).toHaveProperty('sessionId');
    expect(participant).toHaveProperty('name');
    expect(participant).toHaveProperty('role');
    expect(participant).toHaveProperty('classroomId');
    expect(participant).toHaveProperty('isAudioMuted');
    expect(participant).toHaveProperty('isVideoEnabled');
    expect(participant).toHaveProperty('connectionState');
    expect(participant).toHaveProperty('joinedAt');

    expect(participant.sessionId).toBe(sessionId);
    expect(participant.classroomId).toBe(muteRequest.classroomId);
    expect(participant.isAudioMuted).toBe(muteRequest.muted);
    expect(['student', 'instructor']).toContain(participant.role);
    expect(['connecting', 'connected', 'disconnected']).toContain(participant.connectionState);
    expect(typeof participant.isVideoEnabled).toBe('boolean');
    expect(new Date(participant.joinedAt).toISOString()).toBe(participant.joinedAt);
  });

  it('should successfully unmute participant', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const unmuteRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      muted: false,
      classroomId: '1'
    };

    const response = await fetch(`${API_BASE}/participants/${sessionId}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unmuteRequest)
    });

    if (response.status === 200) {
      const data = await response.json();
      expect(data.participant.isAudioMuted).toBe(false);
    }
  });

  it('should return 400 for invalid request body', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const invalidRequests = [
      {}, // Missing all required fields
      { muted: true }, // Missing instructorSessionId and classroomId
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }, // Missing muted and classroomId
      { instructorSessionId: 'invalid-uuid', muted: true, classroomId: '1' }, // Invalid UUID
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', muted: 'yes', classroomId: '1' }, // Invalid muted type
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', muted: true, classroomId: '7' }, // Invalid classroomId
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', muted: true, classroomId: 'invalid' }, // Invalid classroomId pattern
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/participants/${sessionId}/mute`, {
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

  it('should return 403 for non-instructor attempting to mute', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const studentMuteRequest = {
      instructorSessionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // Student session ID
      muted: true,
      classroomId: '1'
    };

    const response = await fetch(`${API_BASE}/participants/${sessionId}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentMuteRequest)
    });

    if (response.status === 403) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should return 404 for participant not found', async () => {
    const nonExistentSessionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const muteRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      muted: true,
      classroomId: '1'
    };

    const response = await fetch(`${API_BASE}/participants/${nonExistentSessionId}/mute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(muteRequest)
    });

    if (response.status === 404) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    }
  });

  it('should validate sessionId parameter as UUID format', async () => {
    const muteRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      muted: true,
      classroomId: '1'
    };

    const invalidSessionIds = ['not-uuid', '123', '', 'abc-def-ghi'];
    
    for (const invalidSessionId of invalidSessionIds) {
      const response = await fetch(`${API_BASE}/participants/${invalidSessionId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(muteRequest)
      });

      expect([400, 404]).toContain(response.status);
    }
  });

  it('should validate classroomId pattern (1-6)', async () => {
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const validClassroomIds = ['1', '2', '3', '4', '5', '6'];
    
    for (const classroomId of validClassroomIds) {
      const muteRequest = {
        instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        muted: true,
        classroomId
      };

      const response = await fetch(`${API_BASE}/participants/${sessionId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(muteRequest)
      });

      // Should not fail due to invalid classroom pattern
      expect(response.status).not.toBe(400);
    }
  });
});
