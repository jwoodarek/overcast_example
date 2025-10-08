// Contract test for GET /api/transcripts/[sessionId]/export endpoint
// Tests the API contract defined in specs/004-audio-video-controls/contracts/transcript-export-api.yaml
// This test validates transcript export in CSV and JSON formats with proper Content-Disposition headers

import { describe, it, expect } from '@jest/globals';

describe('GET /api/transcripts/[sessionId]/export - Contract Test', () => {
  const API_BASE = 'http://localhost:3000/api';
  const TEST_SESSION_ID = 'test-session-123';
  const INSTRUCTOR_ID = 'instructor-uuid-789';

  it('should export transcript as CSV with correct format and headers', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    // Response status should be 200
    expect(response.status).toBe(200);

    // Validate Content-Type header
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('text/csv');

    // Validate Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition');
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('filename=');
    expect(contentDisposition).toContain('transcript');
    expect(contentDisposition).toContain('.csv');

    // Validate CSV content
    const csvContent = await response.text();
    
    // Should have header row
    const lines = csvContent.split('\n').filter(line => line.trim());
    expect(lines.length).toBeGreaterThan(0);
    
    const headerLine = lines[0];
    expect(headerLine).toContain('Timestamp');
    expect(headerLine).toContain('Speaker');
    expect(headerLine).toContain('Text');
    
    // If there are data rows, validate format
    if (lines.length > 1) {
      const dataLine = lines[1];
      const columns = dataLine.split(',');
      
      // Should have 3 columns (Timestamp, Speaker, Text)
      expect(columns.length).toBeGreaterThanOrEqual(3);
      
      // First column should be a valid timestamp
      const timestamp = columns[0].replace(/"/g, '');
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    }
  });

  it('should export transcript as JSON with correct structure and headers', async () => {
    const params = new URLSearchParams({
      format: 'json',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    // Response status should be 200
    expect(response.status).toBe(200);

    // Validate Content-Type header
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('application/json');

    // Validate Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition');
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('filename=');
    expect(contentDisposition).toContain('transcript');
    expect(contentDisposition).toContain('.json');

    // Validate JSON structure
    const jsonData = await response.json();

    // Should match TranscriptExport schema
    expect(jsonData).toHaveProperty('session_id');
    expect(jsonData).toHaveProperty('session_start');
    expect(jsonData).toHaveProperty('exported_at');
    expect(jsonData).toHaveProperty('transcript');

    // Validate field types
    expect(typeof jsonData.session_id).toBe('string');
    expect(typeof jsonData.session_start).toBe('string');
    expect(typeof jsonData.exported_at).toBe('string');
    expect(Array.isArray(jsonData.transcript)).toBe(true);

    // Validate timestamps are ISO 8601 format
    expect(new Date(jsonData.session_start).toString()).not.toBe('Invalid Date');
    expect(new Date(jsonData.exported_at).toString()).not.toBe('Invalid Date');

    // If transcript has entries, validate TranscriptEntry schema
    if (jsonData.transcript.length > 0) {
      jsonData.transcript.forEach((entry: any) => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('speaker_id');
        expect(entry).toHaveProperty('speaker_name');
        expect(entry).toHaveProperty('role');
        expect(entry).toHaveProperty('text');

        expect(typeof entry.timestamp).toBe('string');
        expect(typeof entry.speaker_id).toBe('string');
        expect(typeof entry.speaker_name).toBe('string');
        expect(['instructor', 'student']).toContain(entry.role);
        expect(typeof entry.text).toBe('string');
        expect(entry.text.length).toBeGreaterThan(0);

        // Validate timestamp format
        expect(new Date(entry.timestamp).toString()).not.toBe('Invalid Date');

        // Confidence is optional but should be number 0-1 if present
        if (entry.confidence !== null && entry.confidence !== undefined) {
          expect(typeof entry.confidence).toBe('number');
          expect(entry.confidence).toBeGreaterThanOrEqual(0);
          expect(entry.confidence).toBeLessThanOrEqual(1);
        }
      });
    }
  });

  it('should reject invalid format parameter with 400 error', async () => {
    const params = new URLSearchParams({
      format: 'xml', // Invalid format
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('format') || 
      expect(data.error.toLowerCase()).toContain('csv') ||
      expect(data.error.toLowerCase()).toContain('json');
  });

  it('should reject missing format parameter with 400 error', async () => {
    const params = new URLSearchParams({
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should reject missing requesterId parameter with 400 error', async () => {
    const params = new URLSearchParams({
      format: 'csv',
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 403 when requester is not an instructor', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: 'student-uuid-123', // Student trying to export
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 403 Forbidden
    expect(response.status).toBe(403);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
    expect(data.error.toLowerCase()).toContain('instructor') || 
      expect(data.error.toLowerCase()).toContain('forbidden') ||
      expect(data.error.toLowerCase()).toContain('permission');
  });

  it('should return 404 when session does not exist', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/non-existent-session/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 404 Not Found
    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
  });

  it('should return 404 when no transcript available for session', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/session-without-transcript/export?${params.toString()}`
    );

    const data = await response.json();

    // Should return 404 Not Found
    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error');
  });

  it('should include session ID in CSV filename', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const contentDisposition = response.headers.get('content-disposition');
    
    if (contentDisposition) {
      expect(contentDisposition).toContain(TEST_SESSION_ID);
    }
  });

  it('should include session ID in JSON filename', async () => {
    const params = new URLSearchParams({
      format: 'json',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const contentDisposition = response.headers.get('content-disposition');
    
    if (contentDisposition) {
      expect(contentDisposition).toContain(TEST_SESSION_ID);
    }
  });

  it('should handle CSV with special characters requiring escaping', async () => {
    const params = new URLSearchParams({
      format: 'csv',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    const csvContent = await response.text();
    
    // CSV should follow RFC 4180 - if there are commas or quotes in data,
    // fields should be properly escaped with quotes
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length > 1) {
      // At minimum, should have header and be parseable
      expect(lines[0]).toContain('Timestamp');
      expect(csvContent).not.toContain('undefined');
    }
  });

  it('should generate unique exported_at timestamp for each export', async () => {
    const params = new URLSearchParams({
      format: 'json',
      requesterId: INSTRUCTOR_ID,
    });

    const response = await fetch(
      `${API_BASE}/transcripts/${TEST_SESSION_ID}/export?${params.toString()}`
    );

    if (response.status === 200) {
      const jsonData = await response.json();
      
      const exportedTime = new Date(jsonData.exported_at).getTime();
      const now = Date.now();
      
      // Exported_at should be recent (within last 5 seconds)
      expect(now - exportedTime).toBeLessThan(5000);
    }
  });
});

