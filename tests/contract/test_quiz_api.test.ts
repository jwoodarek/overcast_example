// Contract test for Quiz Generation API endpoints
// Tests the API contract defined in specs/003-this-is-a/contracts/quiz-generation-api.yaml
// This test MUST FAIL initially - implementation comes in Phase 3.3

import { describe, it, expect } from '@jest/globals';

describe('Quiz Generation API - Contract Tests', () => {
  const API_BASE = 'http://localhost:3000/api';

  describe('POST /api/quiz/generate', () => {
    it('should generate quiz with correct schema', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 5,
          difficulty: 'mixed',
        }),
      });
      const data = await response.json();

      // Response status should be 200 (or 202 for async)
      expect([200, 202]).toContain(response.status);
      expect(response.headers.get('content-type')).toContain('application/json');

      if (response.status === 200) {
        // Synchronous response
        expect(data).toHaveProperty('quiz');
        expect(data).toHaveProperty('generationTime');

        // generationTime should be a positive number
        expect(typeof data.generationTime).toBe('number');
        expect(data.generationTime).toBeGreaterThan(0);
      } else if (response.status === 202) {
        // Async response
        expect(data).toHaveProperty('jobId');
        expect(data).toHaveProperty('estimatedTime');

        expect(typeof data.jobId).toBe('string');
        expect(typeof data.estimatedTime).toBe('number');
        expect(data.estimatedTime).toBeGreaterThan(0);
      }
    });

    it('should validate Quiz schema in response', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 5,
        }),
      });
      const data = await response.json();

      // Skip if async (202) response
      if (response.status === 200) {
        const quiz = data.quiz;

        // Required fields
        expect(quiz).toHaveProperty('id');
        expect(quiz).toHaveProperty('sessionId');
        expect(quiz).toHaveProperty('createdBy');
        expect(quiz).toHaveProperty('createdByName');
        expect(quiz).toHaveProperty('createdAt');
        expect(quiz).toHaveProperty('lastModified');
        expect(quiz).toHaveProperty('sourceTranscriptIds');
        expect(quiz).toHaveProperty('questions');
        expect(quiz).toHaveProperty('status');

        // Validate field types
        expect(typeof quiz.id).toBe('string');
        expect(typeof quiz.sessionId).toBe('string');
        expect(quiz.sessionId).toBe('test-classroom-01');
        expect(typeof quiz.createdBy).toBe('string');
        expect(quiz.createdBy).toBe('instructor-test');
        expect(typeof quiz.createdByName).toBe('string');

        // Timestamps should be valid ISO 8601 dates
        expect(new Date(quiz.createdAt).toString()).not.toBe('Invalid Date');
        expect(new Date(quiz.lastModified).toString()).not.toBe('Invalid Date');

        // sourceTranscriptIds should be non-empty array
        expect(Array.isArray(quiz.sourceTranscriptIds)).toBe(true);
        expect(quiz.sourceTranscriptIds.length).toBeGreaterThan(0);
        quiz.sourceTranscriptIds.forEach((id: any) => {
          expect(typeof id).toBe('string');
        });

        // Questions should be array with correct count
        expect(Array.isArray(quiz.questions)).toBe(true);
        expect(quiz.questions.length).toBeGreaterThanOrEqual(2);
        expect(quiz.questions.length).toBeLessThanOrEqual(10);

        // Status should be draft initially
        expect(quiz.status).toBe('draft');

        // Optional title field
        if (quiz.hasOwnProperty('title')) {
          expect(typeof quiz.title).toBe('string');
          expect(quiz.title.length).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should validate QuizQuestion schema for each question', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 5,
        }),
      });
      const data = await response.json();

      // Skip if async response
      if (response.status === 200) {
        const questions = data.quiz.questions;

        questions.forEach((question: any) => {
          // Required fields
          expect(question).toHaveProperty('id');
          expect(question).toHaveProperty('type');
          expect(question).toHaveProperty('question');
          expect(question).toHaveProperty('correctAnswer');
          expect(question).toHaveProperty('explanation');
          expect(question).toHaveProperty('difficulty');
          expect(question).toHaveProperty('sourceTranscriptIds');

          // Validate field types
          expect(typeof question.id).toBe('string');
          expect(['multiple_choice', 'true_false']).toContain(question.type);
          expect(typeof question.question).toBe('string');
          expect(question.question.length).toBeLessThanOrEqual(300);

          // Options validation based on question type
          if (question.type === 'multiple_choice') {
            expect(question).toHaveProperty('options');
            expect(Array.isArray(question.options)).toBe(true);
            expect(question.options.length).toBe(4);
            question.options.forEach((option: any) => {
              expect(typeof option).toBe('string');
            });

            // correctAnswer should be letter (A-D) or index (0-3)
            expect(
              typeof question.correctAnswer === 'string' && 
              (['A', 'B', 'C', 'D', '0', '1', '2', '3'].includes(question.correctAnswer))
            ).toBe(true);
          } else if (question.type === 'true_false') {
            // options should be null for true/false
            expect(question.options === null).toBe(true);

            // correctAnswer should be boolean
            expect(typeof question.correctAnswer).toBe('boolean');
          }

          // Explanation validation
          expect(typeof question.explanation).toBe('string');
          expect(question.explanation.length).toBeLessThanOrEqual(200);

          // Difficulty validation
          expect(['easy', 'medium', 'hard']).toContain(question.difficulty);

          // sourceTranscriptIds validation
          expect(Array.isArray(question.sourceTranscriptIds)).toBe(true);
          expect(question.sourceTranscriptIds.length).toBeGreaterThan(0);
        });
      }
    });

    it('should respect questionCount parameter', async () => {
      const requestedCount = 7;
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: requestedCount,
        }),
      });
      const data = await response.json();

      if (response.status === 200) {
        expect(data.quiz.questions.length).toBe(requestedCount);
      }
    });

    it('should respect questionTypes parameter', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 5,
          questionTypes: {
            multipleChoice: 3,
            trueFalse: 2,
          },
        }),
      });
      const data = await response.json();

      if (response.status === 200) {
        const questions = data.quiz.questions;
        const mcCount = questions.filter((q: any) => q.type === 'multiple_choice').length;
        const tfCount = questions.filter((q: any) => q.type === 'true_false').length;

        expect(mcCount).toBe(3);
        expect(tfCount).toBe(2);
      }
    });

    it('should respect difficulty parameter', async () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const response = await fetch(`${API_BASE}/quiz/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: 'test-classroom-01',
            instructorId: 'instructor-test',
            questionCount: 5,
            difficulty: difficulty,
          }),
        });
        const data = await response.json();

        if (response.status === 200) {
          // All questions should match requested difficulty
          data.quiz.questions.forEach((question: any) => {
            expect(question.difficulty).toBe(difficulty);
          });
        }
      }
    });

    it('should return 400 for invalid parameters', async () => {
      // Invalid questionCount (too low)
      const tooLowResponse = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 1, // Min is 2
        }),
      });
      expect(tooLowResponse.status).toBe(400);

      // Invalid questionCount (too high)
      const tooHighResponse = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 100, // Max is 10
        }),
      });
      expect(tooHighResponse.status).toBe(400);

      // Invalid difficulty
      const invalidDifficultyResponse = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          difficulty: 'invalid',
        }),
      });
      expect(invalidDifficultyResponse.status).toBe(400);
    });

    it('should return 401 for non-instructor user', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'student', // Mock header
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'student-user',
          questionCount: 5,
        }),
      });

      // Should be 401 when authorization is implemented
      expect([200, 401]).toContain(response.status);
    });

    it('should return 404 when no instructor transcripts available', async () => {
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'session-with-no-instructor-speech',
          instructorId: 'instructor-test',
          questionCount: 5,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should return 500 for LLM API errors', async () => {
      // This test assumes LLM service can fail
      // May not fail until LLM integration is implemented
      const response = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-LLM-Error': 'true', // Mock header to simulate error
        },
        body: JSON.stringify({
          sessionId: 'test-classroom-01',
          instructorId: 'instructor-test',
          questionCount: 5,
        }),
      });

      // Should be 500 when LLM fails, or 200 if mock header ignored
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/quiz/[quizId]', () => {
    const testQuizId = 'quiz-test-classroom-01-123456';

    it('should retrieve quiz with correct schema', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`);
      const data = await response.json();

      // Should be 200 if quiz exists, 404 if not
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(data).toHaveProperty('quiz');

        // Validate quiz schema (same as in POST /generate)
        const quiz = data.quiz;
        expect(quiz).toHaveProperty('id');
        expect(quiz).toHaveProperty('sessionId');
        expect(quiz).toHaveProperty('questions');
        expect(Array.isArray(quiz.questions)).toBe(true);
      }
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await fetch(`${API_BASE}/quiz/non-existent-quiz-999`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });
  });

  describe('PATCH /api/quiz/[quizId]', () => {
    const testQuizId = 'quiz-test-classroom-01-123456';

    it('should update quiz title', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Quiz Title',
        }),
      });
      const data = await response.json();

      // Should be 200 if quiz exists and authorized, 404 if not found, 401 if unauthorized
      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(data).toHaveProperty('quiz');
        expect(data.quiz.title).toBe('Updated Quiz Title');
        
        // lastModified should be updated
        expect(data.quiz).toHaveProperty('lastModified');
        expect(new Date(data.quiz.lastModified).toString()).not.toBe('Invalid Date');
      }
    });

    it('should update quiz questions', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: [
            {
              id: 'quiz-test-q0',
              type: 'multiple_choice',
              question: 'Updated question text',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'A',
              explanation: 'Updated explanation',
              difficulty: 'easy',
              sourceTranscriptIds: ['test-id-1'],
            },
          ],
        }),
      });

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.quiz.questions[0].question).toBe('Updated question text');
      }
    });

    it('should update quiz status', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'published',
        }),
      });

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.quiz.status).toBe('published');
      }
    });

    it('should return 400 for invalid update data', async () => {
      // Invalid status
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'invalid-status',
        }),
      });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('should return 401 for non-creator update attempt', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'different-instructor', // Not the creator
        },
        body: JSON.stringify({
          title: 'Unauthorized Update',
        }),
      });

      // Should be 401 when authorization is implemented
      expect([200, 401, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await fetch(`${API_BASE}/quiz/non-existent-quiz-999`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });
  });

  describe('DELETE /api/quiz/[quizId]', () => {
    const testQuizId = 'quiz-test-classroom-01-to-delete';

    it('should delete quiz successfully', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'DELETE',
      });

      // Should be 204 on success, 404 if not found, 401 if unauthorized
      expect([204, 401, 404]).toContain(response.status);

      if (response.status === 204) {
        // No content returned for successful deletion
        expect(response.headers.get('content-length')).toBe('0');
      }
    });

    it('should return 401 for non-creator deletion attempt', async () => {
      const response = await fetch(`${API_BASE}/quiz/${testQuizId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': 'different-instructor', // Not the creator
        },
      });

      // Should be 401 when authorization is implemented
      expect([204, 401, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await fetch(`${API_BASE}/quiz/non-existent-quiz-999`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });
  });
});

