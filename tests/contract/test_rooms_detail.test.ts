// Contract test for GET /api/rooms/{roomId} endpoint
// Tests the API contract defined in specs/002-we-are-looking/contracts/rooms-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('GET /api/rooms/{roomId} - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';

  it('should return detailed classroom information for valid room ID', async () => {
    const roomId = '1';
    const response = await fetch(`${API_BASE}/rooms/${roomId}`);
    const data = await response.json();

    // Response status should be 200
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    // Should include all Classroom schema properties
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('participantCount');
    expect(data).toHaveProperty('isActive');
    expect(data).toHaveProperty('maxCapacity');

    // Should include ClassroomDetails additional properties
    expect(data).toHaveProperty('instructors');
    expect(data).toHaveProperty('students');
    expect(data).toHaveProperty('createdAt');

    // Validate types and constraints
    expect(data.id).toBe(roomId);
    expect(typeof data.name).toBe('string');
    expect(typeof data.participantCount).toBe('number');
    expect(data.participantCount).toBeGreaterThanOrEqual(0);
    expect(data.participantCount).toBeLessThanOrEqual(50);
    expect(typeof data.isActive).toBe('boolean');
    expect(data.maxCapacity).toBe(50);

    // Validate participant arrays
    expect(Array.isArray(data.instructors)).toBe(true);
    expect(Array.isArray(data.students)).toBe(true);
    
    // Validate createdAt timestamp
    expect(typeof data.createdAt).toBe('string');
    expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
  });

  it('should validate User schema for instructors and students', async () => {
    const response = await fetch(`${API_BASE}/rooms/1`);
    const data = await response.json();

    // Test instructor schema if any instructors present
    data.instructors.forEach((instructor: any) => {
      expect(instructor).toHaveProperty('name');
      expect(instructor).toHaveProperty('role');
      expect(instructor).toHaveProperty('sessionId');
      expect(instructor).toHaveProperty('joinedAt');

      expect(typeof instructor.name).toBe('string');
      expect(instructor.role).toBe('instructor');
      expect(typeof instructor.sessionId).toBe('string');
      expect(typeof instructor.joinedAt).toBe('string');
      expect(new Date(instructor.joinedAt).toISOString()).toBe(instructor.joinedAt);
    });

    // Test student schema if any students present
    data.students.forEach((student: any) => {
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('role');
      expect(student).toHaveProperty('sessionId');
      expect(student).toHaveProperty('joinedAt');

      expect(typeof student.name).toBe('string');
      expect(student.role).toBe('student');
      expect(typeof student.sessionId).toBe('string');
      expect(typeof student.joinedAt).toBe('string');
      expect(new Date(student.joinedAt).toISOString()).toBe(student.joinedAt);
    });

    // Participant count should match actual participants
    const totalParticipants = data.instructors.length + data.students.length;
    expect(data.participantCount).toBe(totalParticipants);
  });

  it('should return 404 for invalid room ID', async () => {
    const invalidIds = ['0', '7', 'invalid', 'abc'];

    for (const invalidId of invalidIds) {
      const response = await fetch(`${API_BASE}/rooms/${invalidId}`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
      expect(typeof data.message).toBe('string');
    }
  });

  it('should validate room ID pattern constraint', async () => {
    // Valid room IDs (1-6)
    const validIds = ['1', '2', '3', '4', '5', '6'];
    
    for (const validId of validIds) {
      const response = await fetch(`${API_BASE}/rooms/${validId}`);
      // Should not return 404 due to pattern mismatch
      expect(response.status).not.toBe(404);
    }
  });
});
