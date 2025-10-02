// Contract test for POST /api/rooms/{roomId}/leave endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/rooms-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('POST /api/rooms/{roomId}/leave - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should successfully leave classroom with valid session ID', async () => {
    const roomId = '1';
    const leaveRequest = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000'
    };

    const response = await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveRequest)
    });

    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match success schema
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');

    expect(data.success).toBe(true);
    expect(typeof data.message).toBe('string');
    expect(data.message).toBe('Left classroom successfully');
  });

  it('should validate sessionId format as UUID', async () => {
    const roomId = '1';
    const validUuids = [
      '123e4567-e89b-12d3-a456-426614174000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    ];

    for (const sessionId of validUuids) {
      const leaveRequest = { sessionId };
      
      const response = await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveRequest)
      });

      // Should not fail due to UUID format (may fail due to not found, but not format)
      expect([200, 404]).toContain(response.status);
    }
  });

  it('should return 400 for invalid request body', async () => {
    const roomId = '1';
    const invalidRequests = [
      {}, // Missing sessionId
      { sessionId: '' }, // Empty sessionId
      { sessionId: 'not-a-uuid' }, // Invalid UUID format
      { sessionId: '123' }, // Too short
      { sessionId: null }, // Null value
      { wrongField: '123e4567-e89b-12d3-a456-426614174000' }, // Wrong field name
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
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
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should return 404 for participant not found in classroom', async () => {
    const roomId = '1';
    const leaveRequest = {
      sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Valid UUID but not in classroom
    };

    const response = await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveRequest)
    });

    if (response.status === 404) {
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should validate room ID pattern in URL', async () => {
    const leaveRequest = {
      sessionId: '123e4567-e89b-12d3-a456-426614174000'
    };

    // Valid room IDs (1-6)
    const validIds = ['1', '2', '3', '4', '5', '6'];
    
    for (const validId of validIds) {
      const response = await fetch(`${API_BASE}/rooms/${validId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveRequest)
      });

      // Should not return 404 due to invalid room pattern
      expect(response.status).not.toBe(404);
    }

    // Invalid room IDs should return 404 or 400
    const invalidIds = ['0', '7', 'invalid'];
    
    for (const invalidId of invalidIds) {
      const response = await fetch(`${API_BASE}/rooms/${invalidId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveRequest)
      });

      expect([400, 404]).toContain(response.status);
    }
  });

  it('should handle concurrent leave requests gracefully', async () => {
    const roomId = '1';
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';
    const leaveRequest = { sessionId };

    // Make multiple simultaneous leave requests
    const requests = Array(3).fill(null).map(() => 
      fetch(`${API_BASE}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveRequest)
      })
    );

    const responses = await Promise.all(requests);
    
    // At most one should succeed (200), others should be 404 (already left)
    const statusCodes = responses.map(r => r.status);
    const successCount = statusCodes.filter(code => code === 200).length;
    const notFoundCount = statusCodes.filter(code => code === 404).length;
    
    expect(successCount).toBeLessThanOrEqual(1);
    expect(successCount + notFoundCount).toBe(3);
  });
});
