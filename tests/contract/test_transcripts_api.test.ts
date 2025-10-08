// Contract test for Transcription API endpoints
// Tests the API contract defined in specs/003-this-is-a/contracts/transcription-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('Transcription API - Contract Tests', () => {
  const API_BASE = 'http://localhost:3000/api';

  describe('GET /api/transcripts/[sessionId]', () => {
    const sessionId = 'test-session-01';

    it('should return transcript entries with correct schema', async () => {
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}`);
      const data = await response.json();

      // Response status should be 200
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      // Response should match contract schema
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('hasMore');

      // Entries should be an array
      expect(Array.isArray(data.entries)).toBe(true);

      // Count should match entries length
      expect(data.count).toBe(data.entries.length);

      // hasMore should be a boolean
      expect(typeof data.hasMore).toBe('boolean');
    });

    it('should validate TranscriptEntry schema for each entry', async () => {
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}`);
      const data = await response.json();

      // If there are entries, validate their schema
      if (data.entries.length > 0) {
        data.entries.forEach((entry: any) => {
          // Required fields
          expect(entry).toHaveProperty('id');
          expect(entry).toHaveProperty('sessionId');
          expect(entry).toHaveProperty('speakerId');
          expect(entry).toHaveProperty('speakerRole');
          expect(entry).toHaveProperty('speakerName');
          expect(entry).toHaveProperty('text');
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('confidence');

          // Validate field types
          expect(typeof entry.id).toBe('string');
          expect(typeof entry.sessionId).toBe('string');
          expect(typeof entry.speakerId).toBe('string');
          expect(['instructor', 'student']).toContain(entry.speakerRole);
          expect(typeof entry.speakerName).toBe('string');
          expect(typeof entry.text).toBe('string');
          expect(entry.text.length).toBeLessThanOrEqual(1000);
          
          // Timestamp should be valid ISO 8601 date
          expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');
          
          // Confidence should be between 0 and 1
          expect(typeof entry.confidence).toBe('number');
          expect(entry.confidence).toBeGreaterThanOrEqual(0.0);
          expect(entry.confidence).toBeLessThanOrEqual(1.0);

          // breakoutRoomName is optional, but should be string or null if present
          if (entry.hasOwnProperty('breakoutRoomName')) {
            expect(entry.breakoutRoomName === null || typeof entry.breakoutRoomName === 'string').toBe(true);
          }
        });
      }
    });

    it('should filter by role when role parameter provided', async () => {
      // Test instructor filter
      const instructorResponse = await fetch(`${API_BASE}/transcripts/${sessionId}?role=instructor`);
      const instructorData = await instructorResponse.json();

      expect(instructorResponse.status).toBe(200);
      
      // All entries should have instructor role
      instructorData.entries.forEach((entry: any) => {
        expect(entry.speakerRole).toBe('instructor');
      });

      // Test student filter
      const studentResponse = await fetch(`${API_BASE}/transcripts/${sessionId}?role=student`);
      const studentData = await studentResponse.json();

      expect(studentResponse.status).toBe(200);
      
      // All entries should have student role
      studentData.entries.forEach((entry: any) => {
        expect(entry.speakerRole).toBe('student');
      });
    });

    it('should filter by timestamp when since parameter provided', async () => {
      const sinceTime = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}?since=${sinceTime}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      // All entries should be after the since timestamp
      data.entries.forEach((entry: any) => {
        const entryTime = new Date(entry.timestamp).getTime();
        const sinceTimeMs = new Date(sinceTime).getTime();
        expect(entryTime).toBeGreaterThan(sinceTimeMs);
      });
    });

    it('should filter by minConfidence when parameter provided', async () => {
      const minConfidence = 0.8;
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}?minConfidence=${minConfidence}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      // All entries should have confidence >= minConfidence
      data.entries.forEach((entry: any) => {
        expect(entry.confidence).toBeGreaterThanOrEqual(minConfidence);
      });
    });

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${API_BASE}/transcripts/non-existent-session-999`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should return 400 for invalid parameters', async () => {
      // Invalid role
      const invalidRoleResponse = await fetch(`${API_BASE}/transcripts/${sessionId}?role=invalid`);
      expect(invalidRoleResponse.status).toBe(400);

      // Invalid minConfidence (out of range)
      const invalidConfidenceResponse = await fetch(`${API_BASE}/transcripts/${sessionId}?minConfidence=1.5`);
      expect(invalidConfidenceResponse.status).toBe(400);
    });
  });

  describe('POST /api/transcripts/analyze', () => {
    it('should analyze transcripts and return alerts generated', async () => {
      const response = await fetch(`${API_BASE}/transcripts/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-session-01',
          sinceLast: true,
        }),
      });
      const data = await response.json();

      // Response status should be 200
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      // Response should match contract schema
      expect(data).toHaveProperty('analyzed');
      expect(data).toHaveProperty('alertsGenerated');
      expect(data).toHaveProperty('alerts');

      // Validate field types
      expect(typeof data.analyzed).toBe('number');
      expect(data.analyzed).toBeGreaterThanOrEqual(0);
      
      expect(typeof data.alertsGenerated).toBe('number');
      expect(data.alertsGenerated).toBeGreaterThanOrEqual(0);
      
      expect(Array.isArray(data.alerts)).toBe(true);
      expect(data.alerts.length).toBe(data.alertsGenerated);
    });

    it('should validate HelpAlert schema in analysis response', async () => {
      const response = await fetch(`${API_BASE}/transcripts/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-session-01',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);

      // If alerts were generated, validate their schema
      if (data.alerts.length > 0) {
        data.alerts.forEach((alert: any) => {
          expect(alert).toHaveProperty('id');
          expect(alert).toHaveProperty('classroomSessionId');
          expect(alert).toHaveProperty('breakoutRoomSessionId');
          expect(alert).toHaveProperty('detectedAt');
          expect(alert).toHaveProperty('topic');
          expect(alert).toHaveProperty('urgency');
          expect(alert).toHaveProperty('triggerKeywords');
          expect(alert).toHaveProperty('contextSnippet');
          expect(alert).toHaveProperty('status');

          // Validate types
          expect(typeof alert.id).toBe('string');
          expect(typeof alert.topic).toBe('string');
          expect(alert.topic.length).toBeLessThanOrEqual(100);
          expect(['low', 'medium', 'high']).toContain(alert.urgency);
          expect(Array.isArray(alert.triggerKeywords)).toBe(true);
          expect(alert.triggerKeywords.length).toBeGreaterThan(0);
          expect(typeof alert.contextSnippet).toBe('string');
          expect(alert.contextSnippet.length).toBeLessThanOrEqual(300);
          expect(['pending', 'acknowledged', 'resolved', 'dismissed']).toContain(alert.status);
        });
      }
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${API_BASE}/transcripts/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Missing sessionId
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${API_BASE}/transcripts/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'non-existent-session-999',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });
  });
});

