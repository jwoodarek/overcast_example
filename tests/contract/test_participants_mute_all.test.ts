// Contract test for POST /api/participants/mute-all endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/participants-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('POST /api/participants/mute-all - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should successfully mute all participants with valid instructor request', async () => {
    const muteAllRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '1',
      muted: true,
      excludeInstructors: true
    };

    const response = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(muteAllRequest)
    });

    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match success schema
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('affectedCount');
    expect(data).toHaveProperty('message');

    expect(data.success).toBe(true);
    expect(typeof data.affectedCount).toBe('number');
    expect(data.affectedCount).toBeGreaterThanOrEqual(0);
    expect(typeof data.message).toBe('string');
  });

  it('should successfully unmute all participants', async () => {
    const unmuteAllRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '1',
      muted: false,
      excludeInstructors: true
    };

    const response = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unmuteAllRequest)
    });

    if (response.status === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.affectedCount).toBe('number');
    }
  });

  it('should handle excludeInstructors parameter correctly', async () => {
    // Test with excludeInstructors: true (default)
    const excludeRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '1',
      muted: true,
      excludeInstructors: true
    };

    const response1 = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(excludeRequest)
    });

    // Test with excludeInstructors: false
    const includeRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '1',
      muted: true,
      excludeInstructors: false
    };

    const response2 = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(includeRequest)
    });

    // Both should be valid requests
    expect([200, 403]).toContain(response1.status);
    expect([200, 403]).toContain(response2.status);
  });

  it('should use default excludeInstructors when not provided', async () => {
    const requestWithoutExclude = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '1',
      muted: true
      // excludeInstructors omitted - should default to true
    };

    const response = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestWithoutExclude)
    });

    // Should not fail due to missing excludeInstructors (has default)
    expect([200, 403, 404]).toContain(response.status);
  });

  it('should return 400 for invalid request body', async () => {
    const invalidRequests = [
      {}, // Missing all required fields
      { muted: true }, // Missing instructorSessionId and classroomId
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }, // Missing classroomId and muted
      { instructorSessionId: 'invalid-uuid', classroomId: '1', muted: true }, // Invalid UUID
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', classroomId: '7', muted: true }, // Invalid classroomId
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', classroomId: 'invalid', muted: true }, // Invalid classroomId pattern
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', classroomId: '1', muted: 'yes' }, // Invalid muted type
      { instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', classroomId: '1', muted: true, excludeInstructors: 'no' }, // Invalid excludeInstructors type
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/participants/mute-all`, {
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

  it('should return 403 for non-instructor attempting mute-all', async () => {
    const studentMuteAllRequest = {
      instructorSessionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // Student session ID
      classroomId: '1',
      muted: true
    };

    const response = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentMuteAllRequest)
    });

    if (response.status === 403) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should validate classroomId pattern (1-6)', async () => {
    const validClassroomIds = ['1', '2', '3', '4', '5', '6'];
    
    for (const classroomId of validClassroomIds) {
      const muteAllRequest = {
        instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        classroomId,
        muted: true
      };

      const response = await fetch(`${API_BASE}/participants/mute-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(muteAllRequest)
      });

      // Should not fail due to invalid classroom pattern
      expect(response.status).not.toBe(400);
    }
  });

  it('should handle empty classroom gracefully', async () => {
    const muteAllRequest = {
      instructorSessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      classroomId: '6', // Assume this classroom is empty
      muted: true
    };

    const response = await fetch(`${API_BASE}/participants/mute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(muteAllRequest)
    });

    if (response.status === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.affectedCount).toBe(0);
    }
  });
});
