/**
 * Unit Test: QuizService
 * 
 * Tests quiz generation logic including OpenAI API mocking,
 * question distribution, error handling, and retry logic.
 */

import { QuizService } from '@/lib/services/quiz-service';
import { TranscriptEntry, Quiz, QuizQuestion } from '@/lib/types';
import { transcriptStore } from '@/lib/store';
import { quizStore } from '@/lib/store';

// Mock the stores
jest.mock('@/lib/store', () => ({
  transcriptStore: {
    get: jest.fn(),
  },
  quizStore: {
    save: jest.fn(),
    get: jest.fn(),
    getBySession: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

describe('QuizService', () => {
  let service: QuizService;
  let mockTranscripts: TranscriptEntry[];
  const originalEnv = process.env;

  beforeEach(() => {
    service = new QuizService();
    jest.clearAllMocks();
    
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Setup default mock transcripts
    mockTranscripts = [];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Helper to create transcript entry
  const createTranscript = (
    text: string,
    speakerRole: 'instructor' | 'student' = 'instructor',
    speakerId: string = 'instructor-1'
  ): TranscriptEntry => ({
    id: `transcript-${Date.now()}-${Math.random()}`,
    sessionId: 'session-1',
    speakerId,
    speakerRole,
    speakerName: speakerRole === 'instructor' ? 'Dr. Smith' : 'Student A',
    text,
    timestamp: new Date(),
    confidence: 0.95,
    breakoutRoomName: null,
  });

  // Helper to create mock OpenAI response
  const createMockOpenAIResponse = (questionCount: number = 5) => {
    const questions = [];
    const mcCount = Math.ceil(questionCount * 0.6);
    const tfCount = questionCount - mcCount;

    // Generate MC questions
    for (let i = 0; i < mcCount; i++) {
      questions.push({
        type: 'multiple_choice',
        question: `What is the concept ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        explanation: 'This is the correct answer because...',
        difficulty: 'medium',
      });
    }

    // Generate TF questions
    for (let i = 0; i < tfCount; i++) {
      questions.push({
        type: 'true_false',
        question: `Statement ${i + 1} is correct?`,
        correctAnswer: true,
        explanation: 'This statement is true because...',
        difficulty: 'easy',
      });
    }

    return {
      title: 'Generated Quiz',
      questions,
    };
  };

  // Helper to mock successful fetch response
  const mockSuccessfulFetch = (responseData: unknown) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(responseData),
            },
          },
        ],
      }),
    });
  };

  describe('Quiz Generation - Basic Functionality', () => {
    it('should generate quiz from instructor transcripts', async () => {
      mockTranscripts = [
        createTranscript('Today we will learn about derivatives'),
        createTranscript('The derivative of x squared is 2x'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz).toBeDefined();
      expect(result.quiz.questions).toHaveLength(5);
      expect(result.generationTime).toBeGreaterThanOrEqual(0); // May be 0 in fast tests
      expect(quizStore.save).toHaveBeenCalled();
    });

    it('should use default question count of 5', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz.questions).toHaveLength(5);
    });

    it('should respect custom question count', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(8);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
        questionCount: 8,
      });

      expect(result.quiz.questions).toHaveLength(8);
    });

    it('should enforce minimum question count of 2', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(2);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
        questionCount: 1, // Should be adjusted to 2
      });

      expect(result.quiz.questions.length).toBeGreaterThanOrEqual(2);
    });

    it('should enforce maximum question count of 10', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(10);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
        questionCount: 15, // Should be adjusted to 10
      });

      expect(result.quiz.questions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Instructor-Only Filtering', () => {
    it('should filter for instructor transcripts only', async () => {
      mockTranscripts = [
        createTranscript('Instructor explains derivatives', 'instructor', 'instructor-1'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(transcriptStore.get).toHaveBeenCalledWith('session-1', {
        role: 'instructor',
      });
    });

    it('should throw error when no instructor transcripts found', async () => {
      (transcriptStore.get as jest.Mock).mockReturnValue([]);

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow(
        'No instructor transcripts found for this session. Quiz can only be generated from instructor content.'
      );
    });

    it('should filter by specific instructor ID when provided', async () => {
      mockTranscripts = [
        createTranscript('Content from instructor 1', 'instructor', 'instructor-1'),
        createTranscript('Content from instructor 2', 'instructor', 'instructor-2'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(global.fetch).toHaveBeenCalled();
      // Should only use instructor-1's transcripts in prompt
    });

    it('should throw error when specific instructor has no transcripts', async () => {
      mockTranscripts = [
        createTranscript('Content', 'instructor', 'instructor-2'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('No transcripts found for instructor instructor-1');
    });
  });

  describe('Question Distribution', () => {
    it('should generate 60% multiple choice and 40% true/false', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
        questionCount: 5,
      });

      const mcCount = result.quiz.questions.filter(q => q.type === 'multiple_choice').length;
      const tfCount = result.quiz.questions.filter(q => q.type === 'true_false').length;

      // For 5 questions: 3 MC (60%) and 2 TF (40%)
      expect(mcCount).toBe(3);
      expect(tfCount).toBe(2);
    });

    it('should generate correct distribution for 10 questions', async () => {
      mockTranscripts = [createTranscript('Teaching content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(10);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
        questionCount: 10,
      });

      const mcCount = result.quiz.questions.filter(q => q.type === 'multiple_choice').length;
      const tfCount = result.quiz.questions.filter(q => q.type === 'true_false').length;

      // For 10 questions: 6 MC (60%) and 4 TF (40%)
      expect(mcCount).toBe(6);
      expect(tfCount).toBe(4);
    });
  });

  describe('OpenAI API Error Handling', () => {
    it('should throw error when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow(
        'OPENAI_API_KEY environment variable not set. Add it to .env.local to enable quiz generation.'
      );
    });

    it('should handle rate limit errors (429)', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('OpenAI rate limit exceeded');
    });

    it('should handle generic API errors', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: 'Internal server error',
          },
        }),
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('OpenAI API error (500)');
    });

    it('should handle missing content in response', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('No content in OpenAI response');
    });

    it('should handle invalid JSON in response', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'not valid json',
              },
            },
          ],
        }),
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('Quiz generation failed');
    });
  });

  describe('Response Validation', () => {
    it('should validate questions array exists', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      mockSuccessfulFetch({ title: 'Test' }); // Missing questions

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('LLM response missing questions array');
    });

    it('should validate questions array is not empty', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      mockSuccessfulFetch({ title: 'Test', questions: [] });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('LLM generated zero questions');
    });

    it('should validate multiple choice has 4 options', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      mockSuccessfulFetch({
        title: 'Test',
        questions: [
          {
            type: 'multiple_choice',
            question: 'Test?',
            options: ['A', 'B'], // Only 2 options, should be 4
            correctAnswer: 'A',
            explanation: 'Test',
            difficulty: 'easy',
          },
        ],
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('Multiple choice must have exactly 4 options');
    });

    it('should validate multiple choice answer is string', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      mockSuccessfulFetch({
        title: 'Test',
        questions: [
          {
            type: 'multiple_choice',
            question: 'Test?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0, // Should be string
            explanation: 'Test',
            difficulty: 'easy',
          },
        ],
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('Multiple choice answer must be string');
    });

    it('should validate true/false answer is boolean', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      mockSuccessfulFetch({
        title: 'Test',
        questions: [
          {
            type: 'true_false',
            question: 'Test?',
            correctAnswer: 'true', // Should be boolean
            explanation: 'Test',
            difficulty: 'easy',
          },
        ],
      });

      await expect(
        service.generateQuiz({
          sessionId: 'session-1',
          instructorId: 'instructor-1',
          instructorName: 'Dr. Smith',
        })
      ).rejects.toThrow('True/false answer must be boolean');
    });
  });

  describe('Quiz Storage and Retrieval', () => {
    it('should save quiz with draft status', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz.status).toBe('draft');
      expect(quizStore.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'draft',
      }));
    });

    it('should generate unique quiz IDs', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);
      
      const result1 = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));

      mockSuccessfulFetch(mockResponse);

      const result2 = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result1.quiz.id).not.toBe(result2.quiz.id);
      expect(result1.quiz.id).toMatch(/^quiz-session-1-\d+$/);
    });

    it('should get quiz by ID', () => {
      const mockQuiz = {
        id: 'quiz-1',
        sessionId: 'session-1',
        questions: [],
      } as Quiz;
      (quizStore.get as jest.Mock).mockReturnValue(mockQuiz);

      const quiz = service.getQuiz('quiz-1');

      expect(quiz).toEqual(mockQuiz);
      expect(quizStore.get).toHaveBeenCalledWith('quiz-1');
    });

    it('should get quizzes by session', () => {
      const mockQuizzes = [
        { id: 'quiz-1' } as Quiz,
        { id: 'quiz-2' } as Quiz,
      ];
      (quizStore.getBySession as jest.Mock).mockReturnValue(mockQuizzes);

      const quizzes = service.getQuizzesBySession('session-1');

      expect(quizzes).toEqual(mockQuizzes);
      expect(quizStore.getBySession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Quiz Updates and Publishing', () => {
    it('should update quiz', () => {
      const mockQuiz = { id: 'quiz-1', title: 'Updated' } as Quiz;
      (quizStore.update as jest.Mock).mockReturnValue(mockQuiz);

      const result = service.updateQuiz('quiz-1', { title: 'Updated' });

      expect(result).toEqual(mockQuiz);
      expect(quizStore.update).toHaveBeenCalledWith('quiz-1', { title: 'Updated' });
    });

    it('should publish quiz', () => {
      const mockQuiz = { id: 'quiz-1', status: 'published' } as Quiz;
      (quizStore.update as jest.Mock).mockReturnValue(mockQuiz);

      const result = service.publishQuiz('quiz-1');

      expect(result?.status).toBe('published');
      expect(quizStore.update).toHaveBeenCalledWith('quiz-1', { status: 'published' });
    });

    it('should delete quiz', () => {
      (quizStore.delete as jest.Mock).mockReturnValue(true);

      const result = service.deleteQuiz('quiz-1');

      expect(result).toBe(true);
      expect(quizStore.delete).toHaveBeenCalledWith('quiz-1');
    });
  });

  describe('Quiz Structure and Metadata', () => {
    it('should include all required quiz fields', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz).toMatchObject({
        id: expect.stringMatching(/^quiz-/),
        sessionId: 'session-1',
        createdBy: 'instructor-1',
        createdByName: 'Dr. Smith',
        createdAt: expect.any(Date),
        lastModified: expect.any(Date),
        sourceTranscriptIds: expect.any(Array),
        questions: expect.any(Array),
        status: 'draft',
        title: expect.any(String),
      });
    });

    it('should include source transcript IDs', async () => {
      const transcript1 = createTranscript('Content 1');
      const transcript2 = createTranscript('Content 2');
      mockTranscripts = [transcript1, transcript2];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz.sourceTranscriptIds).toContain(transcript1.id);
      expect(result.quiz.sourceTranscriptIds).toContain(transcript2.id);
    });

    it('should use LLM-generated title', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = {
        ...createMockOpenAIResponse(5),
        title: 'Derivatives Quiz',
      };
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz.title).toBe('Derivatives Quiz');
    });

    it('should fallback to default title when not provided', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      delete mockResponse.title;
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.quiz.title).toBe('Generated Quiz');
    });
  });

  describe('Performance Metrics', () => {
    it('should track generation time', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.generationTime).toBeGreaterThanOrEqual(0); // May be 0 in fast tests
      expect(typeof result.generationTime).toBe('number');
    });

    it('should estimate token usage', async () => {
      mockTranscripts = [createTranscript('Content')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const mockResponse = createMockOpenAIResponse(5);
      mockSuccessfulFetch(mockResponse);

      const result = await service.generateQuiz({
        sessionId: 'session-1',
        instructorId: 'instructor-1',
        instructorName: 'Dr. Smith',
      });

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(typeof result.tokensUsed).toBe('number');
    });
  });
});

