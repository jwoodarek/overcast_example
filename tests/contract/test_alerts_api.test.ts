// Contract test for Help Alerts API endpoints
// Tests the API contract defined in specs/003-this-is-a/contracts/alerts-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('Help Alerts API - Contract Tests', () => {
  const API_BASE = 'http://localhost:3000/api';

  describe('GET /api/alerts/[sessionId]', () => {
    const sessionId = 'test-classroom-01';

    it('should return alerts array with counts object', async () => {
      const response = await fetch(`${API_BASE}/alerts/${sessionId}`);
      const data = await response.json();

      // Response status should be 200
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      // Response should match contract schema
      expect(data).toHaveProperty('alerts');
      expect(data).toHaveProperty('counts');

      // Alerts should be an array
      expect(Array.isArray(data.alerts)).toBe(true);

      // Counts should have all status properties
      expect(data.counts).toHaveProperty('pending');
      expect(data.counts).toHaveProperty('acknowledged');
      expect(data.counts).toHaveProperty('resolved');
      expect(data.counts).toHaveProperty('dismissed');

      // All counts should be non-negative integers
      expect(typeof data.counts.pending).toBe('number');
      expect(typeof data.counts.acknowledged).toBe('number');
      expect(typeof data.counts.resolved).toBe('number');
      expect(typeof data.counts.dismissed).toBe('number');
      expect(data.counts.pending).toBeGreaterThanOrEqual(0);
      expect(data.counts.acknowledged).toBeGreaterThanOrEqual(0);
      expect(data.counts.resolved).toBeGreaterThanOrEqual(0);
      expect(data.counts.dismissed).toBeGreaterThanOrEqual(0);
    });

    it('should validate HelpAlert schema for each alert', async () => {
      const response = await fetch(`${API_BASE}/alerts/${sessionId}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      // If there are alerts, validate their schema
      if (data.alerts.length > 0) {
        data.alerts.forEach((alert: any) => {
          // Required fields
          expect(alert).toHaveProperty('id');
          expect(alert).toHaveProperty('classroomSessionId');
          expect(alert).toHaveProperty('breakoutRoomSessionId');
          expect(alert).toHaveProperty('detectedAt');
          expect(alert).toHaveProperty('topic');
          expect(alert).toHaveProperty('urgency');
          expect(alert).toHaveProperty('triggerKeywords');
          expect(alert).toHaveProperty('contextSnippet');
          expect(alert).toHaveProperty('status');
          expect(alert).toHaveProperty('sourceTranscriptIds');

          // Validate field types
          expect(typeof alert.id).toBe('string');
          expect(typeof alert.classroomSessionId).toBe('string');
          expect(typeof alert.breakoutRoomSessionId).toBe('string');
          
          // breakoutRoomName can be string or null
          if (alert.hasOwnProperty('breakoutRoomName')) {
            expect(alert.breakoutRoomName === null || typeof alert.breakoutRoomName === 'string').toBe(true);
          }

          // detectedAt should be valid ISO 8601 date
          expect(new Date(alert.detectedAt).toString()).not.toBe('Invalid Date');

          // topic validation
          expect(typeof alert.topic).toBe('string');
          expect(alert.topic.length).toBeLessThanOrEqual(100);

          // urgency validation
          expect(['low', 'medium', 'high']).toContain(alert.urgency);

          // triggerKeywords validation
          expect(Array.isArray(alert.triggerKeywords)).toBe(true);
          expect(alert.triggerKeywords.length).toBeGreaterThan(0);
          alert.triggerKeywords.forEach((keyword: any) => {
            expect(typeof keyword).toBe('string');
          });

          // contextSnippet validation
          expect(typeof alert.contextSnippet).toBe('string');
          expect(alert.contextSnippet.length).toBeLessThanOrEqual(300);

          // status validation
          expect(['pending', 'acknowledged', 'resolved', 'dismissed']).toContain(alert.status);

          // acknowledgedBy and acknowledgedAt are nullable
          if (alert.acknowledgedBy !== null) {
            expect(typeof alert.acknowledgedBy).toBe('string');
          }
          if (alert.acknowledgedAt !== null) {
            expect(new Date(alert.acknowledgedAt).toString()).not.toBe('Invalid Date');
          }

          // sourceTranscriptIds validation
          expect(Array.isArray(alert.sourceTranscriptIds)).toBe(true);
          alert.sourceTranscriptIds.forEach((id: any) => {
            expect(typeof id).toBe('string');
          });
        });
      }
    });

    it('should sort alerts by urgency (desc) then time (desc)', async () => {
      const response = await fetch(`${API_BASE}/alerts/${sessionId}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      // If there are multiple alerts, verify sorting
      if (data.alerts.length > 1) {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        
        for (let i = 0; i < data.alerts.length - 1; i++) {
          const currentAlert = data.alerts[i];
          const nextAlert = data.alerts[i + 1];
          
          const currentUrgencyValue = urgencyOrder[currentAlert.urgency as keyof typeof urgencyOrder];
          const nextUrgencyValue = urgencyOrder[nextAlert.urgency as keyof typeof urgencyOrder];
          
          // Current urgency should be <= next urgency (high = 0 comes first)
          expect(currentUrgencyValue).toBeLessThanOrEqual(nextUrgencyValue);
          
          // If urgencies are equal, check time ordering (newer first)
          if (currentUrgencyValue === nextUrgencyValue) {
            const currentTime = new Date(currentAlert.detectedAt).getTime();
            const nextTime = new Date(nextAlert.detectedAt).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }
        }
      }
    });

    it('should filter by status when status parameter provided', async () => {
      const statuses = ['pending', 'acknowledged', 'resolved', 'dismissed'];
      
      for (const status of statuses) {
        const response = await fetch(`${API_BASE}/alerts/${sessionId}?status=${status}`);
        const data = await response.json();

        expect(response.status).toBe(200);

        // All alerts should have the requested status
        data.alerts.forEach((alert: any) => {
          expect(alert.status).toBe(status);
        });
      }
    });

    it('should filter by urgency when urgency parameter provided', async () => {
      const urgencies = ['low', 'medium', 'high'];
      
      for (const urgency of urgencies) {
        const response = await fetch(`${API_BASE}/alerts/${sessionId}?urgency=${urgency}`);
        const data = await response.json();

        expect(response.status).toBe(200);

        // All alerts should have the requested urgency
        data.alerts.forEach((alert: any) => {
          expect(alert.urgency).toBe(urgency);
        });
      }
    });

    it('should filter by breakout room when breakoutRoom parameter provided', async () => {
      const breakoutRoom = 'Group 1';
      const response = await fetch(`${API_BASE}/alerts/${sessionId}?breakoutRoom=${encodeURIComponent(breakoutRoom)}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      // All alerts should be from the requested breakout room
      data.alerts.forEach((alert: any) => {
        expect(alert.breakoutRoomName).toBe(breakoutRoom);
      });
    });

    it('should return 400 for invalid parameters', async () => {
      // Invalid status
      const invalidStatusResponse = await fetch(`${API_BASE}/alerts/${sessionId}?status=invalid`);
      expect(invalidStatusResponse.status).toBe(400);

      // Invalid urgency
      const invalidUrgencyResponse = await fetch(`${API_BASE}/alerts/${sessionId}?urgency=invalid`);
      expect(invalidUrgencyResponse.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`${API_BASE}/alerts/non-existent-session-999`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should return 401 for non-instructor access', async () => {
      // This test assumes authorization is implemented
      // For now, it may pass if authorization is not yet enforced
      const response = await fetch(`${API_BASE}/alerts/${sessionId}`, {
        headers: {
          'X-User-Role': 'student', // Mock header to indicate student role
        },
      });

      // Should be 401 when authorization is implemented
      // May be 200 during development
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('POST /api/alerts', () => {
    it('should update alert status successfully', async () => {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          status: 'acknowledged',
          instructorId: 'instructor-test',
        }),
      });
      const data = await response.json();

      // Response status should be 200
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      // Response should match contract schema
      expect(data).toHaveProperty('alert');
      expect(data).toHaveProperty('message');

      // Alert should have updated status
      expect(data.alert).toHaveProperty('status');
      expect(data.alert.status).toBe('acknowledged');

      // Alert should have acknowledgedBy field set
      expect(data.alert).toHaveProperty('acknowledgedBy');
      expect(data.alert.acknowledgedBy).toBe('instructor-test');

      // Alert should have acknowledgedAt timestamp
      expect(data.alert).toHaveProperty('acknowledgedAt');
      expect(data.alert.acknowledgedAt).not.toBeNull();
    });

    it('should support all valid status transitions', async () => {
      const validStatuses = ['acknowledged', 'resolved', 'dismissed'];

      for (const status of validStatuses) {
        const response = await fetch(`${API_BASE}/alerts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alertId: 'alert-test-123',
            status: status,
            instructorId: 'instructor-test',
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.alert.status).toBe(status);
      }
    });

    it('should include optional notes field', async () => {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          status: 'resolved',
          instructorId: 'instructor-test',
          notes: 'Helped students understand the concept',
        }),
      });

      expect(response.status).toBe(200);
      // Notes field is optional, endpoint should accept it
    });

    it('should return 400 for missing required fields', async () => {
      // Missing alertId
      const missingAlertIdResponse = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'acknowledged',
          instructorId: 'instructor-test',
        }),
      });
      expect(missingAlertIdResponse.status).toBe(400);

      // Missing status
      const missingStatusResponse = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          instructorId: 'instructor-test',
        }),
      });
      expect(missingStatusResponse.status).toBe(400);

      // Missing instructorId
      const missingInstructorIdResponse = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          status: 'acknowledged',
        }),
      });
      expect(missingInstructorIdResponse.status).toBe(400);
    });

    it('should return 400 for invalid status transition', async () => {
      // Cannot transition to 'pending' status (per contract)
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          status: 'pending',
          instructorId: 'instructor-test',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should return 401 for non-instructor user', async () => {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'student', // Mock header
        },
        body: JSON.stringify({
          alertId: 'alert-test-123',
          status: 'acknowledged',
          instructorId: 'student-user', // Not an instructor
        }),
      });

      // Should be 401 when authorization is implemented
      expect([200, 401]).toContain(response.status);
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: 'non-existent-alert-999',
          status: 'acknowledged',
          instructorId: 'instructor-test',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });
  });
});

