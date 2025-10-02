// Contract test for GET /api/rooms endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/rooms-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('GET /api/rooms - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should return list of all 6 classrooms with correct schema', async () => {
    const response = await fetch(`${API_BASE}/rooms`);
    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Response should match contract schema
    expect(data).toHaveProperty('classrooms');
    expect(data).toHaveProperty('totalCapacity');
    expect(data).toHaveProperty('activeRooms');

    // Should have exactly 6 classrooms
    expect(Array.isArray(data.classrooms)).toBe(true);
    expect(data.classrooms).toHaveLength(6);

    // Each classroom should match Classroom schema
    data.classrooms.forEach((classroom: any, index: number) => {
      expect(classroom).toHaveProperty('id');
      expect(classroom).toHaveProperty('name');
      expect(classroom).toHaveProperty('participantCount');
      expect(classroom).toHaveProperty('isActive');
      expect(classroom).toHaveProperty('maxCapacity');

      // Validate types and constraints
      expect(typeof classroom.id).toBe('string');
      expect(['1', '2', '3', '4', '5', '6']).toContain(classroom.id);
      expect(typeof classroom.name).toBe('string');
      expect(typeof classroom.participantCount).toBe('number');
      expect(classroom.participantCount).toBeGreaterThanOrEqual(0);
      expect(classroom.participantCount).toBeLessThanOrEqual(50);
      expect(typeof classroom.isActive).toBe('boolean');
      expect(classroom.maxCapacity).toBe(50);
    });

    // Validate aggregated data
    expect(typeof data.totalCapacity).toBe('number');
    expect(data.totalCapacity).toBe(300); // 6 rooms × 50 capacity
    expect(typeof data.activeRooms).toBe('number');
    expect(data.activeRooms).toBeGreaterThanOrEqual(0);
    expect(data.activeRooms).toBeLessThanOrEqual(6);
  });

  it('should return consistent classroom names matching constants', async () => {
    const response = await fetch(`${API_BASE}/rooms`);
    const data = await response.json();

    const expectedNames = [
      'Cohort Alpha',
      'Cohort Beta', 
      'Cohort Gamma',
      'Cohort Delta',
      'Cohort Epsilon',
      'Cohort Zeta'
    ];

    // Names should match our constants (order may vary)
    const actualNames = data.classrooms.map((room: any) => room.name);
    expectedNames.forEach(expectedName => {
      expect(actualNames).toContain(expectedName);
    });
  });

  it('should handle CORS headers for browser requests', async () => {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });

    // Should not fail due to CORS
    expect(response.status).toBe(200);
  });
});
