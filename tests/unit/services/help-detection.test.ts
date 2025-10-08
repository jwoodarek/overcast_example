/**
 * Unit Test: HelpDetectionService
 * 
 * Tests keyword matching, topic extraction, urgency calculation,
 * and false positive filtering for help detection logic.
 */

import { HelpDetectionService } from '@/lib/services/help-detection-service';
import { TranscriptEntry, HelpAlert } from '@/lib/types';
import { transcriptStore } from '@/lib/store';
import { alertStore } from '@/lib/store';
import { HELP_KEYWORDS, URGENCY_THRESHOLDS, FALSE_POSITIVE_PHRASES } from '@/lib/constants';

// Mock the stores
jest.mock('@/lib/store', () => ({
  transcriptStore: {
    get: jest.fn(),
  },
  alertStore: {
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('HelpDetectionService', () => {
  let service: HelpDetectionService;
  let mockTranscripts: TranscriptEntry[];

  beforeEach(() => {
    service = new HelpDetectionService();
    jest.clearAllMocks();

    // Setup default mock transcripts
    mockTranscripts = [];
  });

  // Helper to create transcript entry
  const createTranscript = (
    text: string,
    speakerRole: 'instructor' | 'student' = 'student',
    speakerId: string = 'student-1',
    confidence: number = 0.9
  ): TranscriptEntry => ({
    id: `transcript-${Date.now()}-${Math.random()}`,
    sessionId: 'session-1',
    speakerId,
    speakerRole,
    speakerName: speakerRole === 'instructor' ? 'Dr. Smith' : 'Student A',
    text,
    timestamp: new Date(),
    confidence,
    breakoutRoomName: null,
  });

  describe('Direct Help Keyword Detection', () => {
    it('should detect "I need help" keyword', async () => {
      mockTranscripts = [createTranscript('I need help with this problem')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I need help');
      expect(alertStore.create).toHaveBeenCalledWith(expect.objectContaining({
        triggerKeywords: expect.arrayContaining(['I need help']),
      }));
    });

    it('should detect "help me" keyword', async () => {
      mockTranscripts = [createTranscript('Can someone help me understand this?')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('help me');
    });

    it('should detect "I don\'t understand" keyword', async () => {
      mockTranscripts = [createTranscript('I don\'t understand this concept')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I don\'t understand');
    });
  });

  describe('Confusion Keyword Detection', () => {
    it('should detect "I\'m confused" keyword', async () => {
      mockTranscripts = [createTranscript('I\'m confused about this topic')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I\'m confused');
    });

    it('should detect "I\'m stuck" keyword', async () => {
      mockTranscripts = [createTranscript('I\'m stuck on step 3')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I\'m stuck');
    });

    it('should detect "wait what" keyword', async () => {
      mockTranscripts = [createTranscript('Wait what, how does that work?')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('wait what');
    });
  });

  describe('Frustration Keyword Detection', () => {
    it('should detect "I give up" keyword', async () => {
      mockTranscripts = [createTranscript('I give up, this is too hard')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I give up');
      expect(alerts[0].urgency).toBe('high'); // Frustration should be high urgency
    });

    it('should detect "I can\'t do this" keyword', async () => {
      mockTranscripts = [createTranscript('I can\'t do this problem')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I can\'t do this');
    });

    it('should detect "this is too hard" keyword', async () => {
      mockTranscripts = [createTranscript('This is too hard for me')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('this is too hard');
    });
  });

  describe('Urgency Calculation', () => {
    it('should calculate medium urgency for single confusion keyword', async () => {
      // Confusion keywords have weight 2, resulting in medium urgency
      mockTranscripts = [createTranscript('how do you do this?')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].urgency).toBe('medium');
    });

    it('should calculate high urgency for multiple keywords (3 or more)', async () => {
      // 3 or more keywords trigger high urgency regardless of weight
      mockTranscripts = [
        createTranscript('I don\'t understand'),
        createTranscript('I\'m confused'),
        createTranscript('I need help'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].urgency).toBe('high');
    });

    it('should calculate high urgency for frustration keyword', async () => {
      mockTranscripts = [createTranscript('I give up on this')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].urgency).toBe('high');
    });

    it('should calculate high urgency for multiple keywords', async () => {
      mockTranscripts = [
        createTranscript('I don\'t understand this'),
        createTranscript('I\'m confused about the same thing'),
        createTranscript('Can someone help me?'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].urgency).toBe('high'); // Multiple keywords = high urgency
    });
  });

  describe('Topic Extraction', () => {
    it('should extract quoted terms as topics', async () => {
      mockTranscripts = [createTranscript('I don\'t understand "derivatives"')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].topic).toBe('derivatives');
    });

    it('should extract capitalized words as topics', async () => {
      mockTranscripts = [createTranscript('I need help with Calculus problems')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].topic).toBe('Calculus');
    });

    it('should extract nouns from context when no quoted or capitalized terms', async () => {
      mockTranscripts = [createTranscript('I\'m confused about integrals')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      // Topic extraction looks for 4+ character words that aren't stop words
      expect(alerts[0].topic.length).toBeGreaterThan(3);
    });

    it('should fall back to generic topic when extraction fails', async () => {
      mockTranscripts = [createTranscript('I need help')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].topic).toBe('current concept');
    });
  });

  describe('False Positive Filtering', () => {
    it('should filter out "I understand" phrase', async () => {
      mockTranscripts = [createTranscript('I understand now, thanks!')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should filter out "that makes sense" phrase', async () => {
      mockTranscripts = [createTranscript('Oh, that makes sense now')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should filter out "I get it now" phrase', async () => {
      mockTranscripts = [createTranscript('I get it now, thanks for explaining')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should filter out "got it" phrase', async () => {
      mockTranscripts = [createTranscript('Got it, that helps!')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should not trigger on positive confusion resolution', async () => {
      mockTranscripts = [createTranscript('I was confused but I understand now')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      // False positive phrase should override help keyword
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when no transcripts', async () => {
      (transcriptStore.get as jest.Mock).mockReturnValue([]);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should skip instructor transcripts', async () => {
      mockTranscripts = [
        createTranscript('I need help with this', 'instructor', 'instructor-1'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      // Should not detect help from instructor
      expect(alerts).toHaveLength(0);
    });

    it('should handle ambiguous text without keywords', async () => {
      mockTranscripts = [createTranscript('This is interesting')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(0);
    });

    it('should group multiple transcripts from same student into one alert', async () => {
      mockTranscripts = [
        createTranscript('I\'m confused about this', 'student', 'student-1'),
        createTranscript('I don\'t understand', 'student', 'student-1'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      // Should create one alert with multiple keywords
      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords.length).toBeGreaterThan(1);
    });

    it('should create separate alerts for different students', async () => {
      mockTranscripts = [
        createTranscript('I need help', 'student', 'student-1'),
        createTranscript('I\'m confused', 'student', 'student-2'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      // Should create separate alerts for different students
      expect(alerts).toHaveLength(2);
    });

    it('should truncate context snippet to 300 characters', async () => {
      const longText = 'I don\'t understand this problem. '.repeat(20); // ~700 characters
      mockTranscripts = [createTranscript(longText)];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].contextSnippet.length).toBeLessThanOrEqual(300);
    });

    it('should handle case-insensitive keyword matching', async () => {
      mockTranscripts = [createTranscript('I NEED HELP with this')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].triggerKeywords).toContain('I need help');
    });
  });

  describe('Context Snippet Generation', () => {
    it('should include speaker name in context snippet', async () => {
      mockTranscripts = [createTranscript('I need help', 'student', 'student-1')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].contextSnippet).toContain('Student A');
    });

    it('should include transcript text in quotes', async () => {
      mockTranscripts = [createTranscript('I need help with derivatives')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].contextSnippet).toMatch(/".*"/);
    });

    it('should combine multiple recent transcripts in snippet', async () => {
      mockTranscripts = [
        createTranscript('I tried solving this', 'student', 'student-1'),
        createTranscript('But I\'m stuck now', 'student', 'student-1'),
        createTranscript('I need help', 'student', 'student-1'),
      ];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      const alerts = await service.analyzeTranscripts('session-1');

      expect(alerts).toHaveLength(1);
      // Should include text from multiple entries
      expect(alerts[0].contextSnippet).toContain('tried solving');
      expect(alerts[0].contextSnippet).toContain('stuck');
      expect(alerts[0].contextSnippet).toContain('need help');
    });
  });

  describe('Alert Store Integration', () => {
    it('should call alertStore.create with correct alert structure', async () => {
      mockTranscripts = [createTranscript('I need help')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      await service.analyzeTranscripts('session-1');

      expect(alertStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^alert-/),
          classroomSessionId: 'session-1',
          breakoutRoomSessionId: 'session-1',
          breakoutRoomName: null,
          detectedAt: expect.any(Date),
          topic: expect.any(String),
          urgency: expect.stringMatching(/^(low|medium|high)$/),
          triggerKeywords: expect.any(Array),
          contextSnippet: expect.any(String),
          status: 'pending',
          acknowledgedBy: null,
          acknowledgedAt: null,
          sourceTranscriptIds: expect.any(Array),
        })
      );
    });

    it('should use classroomSessionId option when provided', async () => {
      mockTranscripts = [createTranscript('I need help')];
      (transcriptStore.get as jest.Mock).mockReturnValue(mockTranscripts);

      await service.analyzeTranscripts('breakout-1', {
        classroomSessionId: 'classroom-1',
      });

      expect(alertStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          classroomSessionId: 'classroom-1',
          breakoutRoomSessionId: 'breakout-1',
        })
      );
    });
  });

  describe('Confidence Threshold Filtering', () => {
    it('should filter low confidence transcripts', async () => {
      mockTranscripts = [createTranscript('I need help', 'student', 'student-1', 0.5)];
      (transcriptStore.get as jest.Mock).mockReturnValue([]);

      const alerts = await service.analyzeTranscripts('session-1', {
        minConfidence: 0.7,
      });

      expect(transcriptStore.get).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ minConfidence: 0.7 })
      );
    });
  });
});

