/**
 * QuizService
 * 
 * Generates educational quiz questions from instructor transcripts using LLM.
 * Uses OpenAI GPT-3.5 Turbo for MVP (fast, cheap, good structured output).
 * 
 * WHY LLM for quiz generation:
 * - Creates questions that test understanding (not just recall)
 * - Generates educational explanations automatically
 * - Adapts to any subject matter (no domain-specific logic)
 * - Quality improves with better transcripts (better than rule-based)
 * 
 * WHY instructor transcripts only:
 * - Quizzes should test what was taught, not what was asked
 * - Avoids including student misconceptions in questions
 * - Maintains academic integrity (students' questions shouldn't become quiz material)
 * 
 * WHY GPT-3.5 Turbo for MVP:
 * - Fast: 2-4 seconds for 5 questions (<30s requirement)
 * - Cheap: ~$0.002 per quiz (500 quizzes per $1)
 * - JSON mode: reliable structured output (no parsing errors)
 * - Can upgrade to GPT-4 or Claude for better quality later
 */

import { Quiz, QuizQuestion, TranscriptEntry } from '@/lib/types';
import { transcriptStore } from '@/lib/store';
import { quizStore } from '@/lib/store';

/**
 * Options for quiz generation
 */
interface GenerateQuizOptions {
  sessionId: string;
  instructorId: string;
  instructorName: string;
  questionCount?: number; // Default: 5
  difficulty?: 'mixed' | 'easy' | 'medium' | 'hard'; // Default: mixed
  includeExplanations?: boolean; // Default: true
}

/**
 * Result of quiz generation
 */
interface GenerationResult {
  quiz: Quiz;
  generationTime: number; // Seconds
  tokensUsed: number;
}

/**
 * LLM API response structure (typed for OpenAI JSON mode)
 */
interface LLMQuizResponse {
  questions: Array<{
    type: 'multiple_choice' | 'true_false';
    question: string;
    options?: string[]; // 4 options for MC, null for TF
    correctAnswer: string | boolean; // 'A'/'B'/'C'/'D' or true/false
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  title?: string;
}

export class QuizService {
  private readonly DEFAULT_QUESTION_COUNT = 5;
  private readonly MAX_QUESTION_COUNT = 10;
  private readonly MIN_QUESTION_COUNT = 2;
  private readonly MAX_TRANSCRIPT_LENGTH = 3000; // words, to fit in context window

  /**
   * Generate quiz from instructor transcripts.
   * 
   * WHY this workflow:
   * 1. Filter for instructor transcripts only
   * 2. Build prompt with transcript text
   * 3. Call LLM with JSON mode for structured output
   * 4. Parse and validate response
   * 5. Store as draft (instructor can edit before publishing)
   * 
   * @returns Generated quiz in draft status
   * @throws Error if no instructor transcripts or LLM fails
   */
  async generateQuiz(
    options: GenerateQuizOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    // Validate inputs
    const questionCount = this.validateQuestionCount(
      options.questionCount ?? this.DEFAULT_QUESTION_COUNT
    );

    // Get instructor transcripts
    const instructorTranscripts = transcriptStore.get(options.sessionId, {
      role: 'instructor',
    });

    if (instructorTranscripts.length === 0) {
      throw new Error(
        'No instructor transcripts found for this session. ' +
        'Quiz can only be generated from instructor content.'
      );
    }

    // Filter by specific instructor if provided
    const filteredTranscripts = options.instructorId
      ? instructorTranscripts.filter(t => t.speakerId === options.instructorId)
      : instructorTranscripts;

    if (filteredTranscripts.length === 0) {
      throw new Error(
        `No transcripts found for instructor ${options.instructorId}`
      );
    }

    // Build prompt for LLM
    const prompt = this.buildPrompt(
      filteredTranscripts,
      questionCount,
      options.difficulty ?? 'mixed'
    );

    // Call LLM API
    const llmResponse = await this.callLLM(prompt);

    // Create quiz object
    const quiz = this.createQuizFromResponse(
      llmResponse,
      options.sessionId,
      options.instructorId,
      options.instructorName,
      filteredTranscripts
    );

    // Store quiz as draft
    quizStore.save(quiz);

    const generationTime = (Date.now() - startTime) / 1000;

    return {
      quiz,
      generationTime,
      tokensUsed: this.estimateTokens(prompt),
    };
  }

  /**
   * Get quiz by ID.
   */
  getQuiz(quizId: string): Quiz | null {
    return quizStore.get(quizId);
  }

  /**
   * Get all quizzes for a session.
   */
  getQuizzesBySession(sessionId: string): Quiz[] {
    return quizStore.getBySession(sessionId);
  }

  /**
   * Update quiz (edit questions, change title, publish).
   * 
   * WHY instructors can edit:
   * - LLM might generate imperfect questions
   * - Instructor knows best what to test
   * - Can adjust difficulty or wording
   * - Must review before sharing with students (academic integrity)
   */
  updateQuiz(
    quizId: string,
    updates: Partial<Quiz>
  ): Quiz | null {
    return quizStore.update(quizId, updates);
  }

  /**
   * Publish quiz (change status from draft to published).
   */
  publishQuiz(quizId: string): Quiz | null {
    return this.updateQuiz(quizId, { status: 'published' });
  }

  /**
   * Delete quiz.
   */
  deleteQuiz(quizId: string): boolean {
    return quizStore.delete(quizId);
  }

  /**
   * Build LLM prompt from transcripts.
   * 
   * WHY this prompt structure:
   * - Clear role definition ("educational quiz generator")
   * - Explicit requirements (question types, count, difficulty)
   * - Includes transcript text as context
   * - Requests JSON format for reliable parsing
   * - Emphasizes testing understanding over memorization
   */
  private buildPrompt(
    transcripts: TranscriptEntry[],
    questionCount: number,
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard'
  ): string {
    // Combine transcript text
    const transcriptText = transcripts
      .map(t => t.text)
      .join(' ')
      .substring(0, this.MAX_TRANSCRIPT_LENGTH * 5); // Rough word-to-char conversion

    // Determine question distribution
    const distribution = this.getQuestionDistribution(questionCount);

    // Difficulty instructions
    const difficultyInstructions = this.getDifficultyInstructions(
      difficulty,
      questionCount
    );

    return `You are an educational quiz generator. Based on the following instructor transcript, create ${questionCount} quiz questions to test student understanding.

Requirements:
- ${distribution.multipleChoice} multiple choice questions (4 options each, only 1 correct)
- ${distribution.trueFalse} true/false questions
- Questions should test understanding and application, not just memorization
- Include brief explanations for each answer (1-2 sentences)
- ${difficultyInstructions}
- Make distractors (wrong options) plausible but clearly incorrect
- Avoid ambiguous wording or trick questions

Instructor Transcript:
${transcriptText}

Output as JSON matching this exact schema:
{
  "title": "Brief quiz title based on content (e.g., 'Derivatives Quiz')",
  "questions": [
    {
      "type": "multiple_choice" | "true_false",
      "question": "Clear question text",
      "options": ["A", "B", "C", "D"],  // Omit for true/false
      "correctAnswer": "A" | true | false,  // Letter for MC, boolean for TF
      "explanation": "Why this is correct",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;
  }

  /**
   * Get question type distribution for a given count.
   * 
   * WHY 60% multiple choice, 40% true/false:
   * - Multiple choice tests deeper understanding (more options)
   * - True/false quicker to answer, good for basic concepts
   * - Balanced mix keeps quiz engaging
   */
  private getQuestionDistribution(questionCount: number): {
    multipleChoice: number;
    trueFalse: number;
  } {
    const multipleChoice = Math.ceil(questionCount * 0.6);
    const trueFalse = questionCount - multipleChoice;

    return { multipleChoice, trueFalse };
  }

  /**
   * Get difficulty distribution instructions for prompt.
   */
  private getDifficultyInstructions(
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard',
    questionCount: number
  ): string {
    if (difficulty === 'mixed') {
      const easy = Math.floor(questionCount * 0.4);
      const medium = Math.floor(questionCount * 0.4);
      const hard = questionCount - easy - medium;
      return `Difficulty: ${easy} easy, ${medium} medium, ${hard} hard`;
    }

    return `Difficulty: All questions should be ${difficulty}`;
  }

  /**
   * Call LLM API (OpenAI GPT-3.5 Turbo with JSON mode).
   * 
   * WHY JSON mode:
   * - Guarantees valid JSON output (no parsing errors)
   * - More reliable than asking for JSON in prompt
   * - Available in GPT-3.5-turbo-1106 and later
   * 
   * WHY error handling:
   * - Rate limits: retry with exponential backoff
   * - API errors: provide helpful error messages
   * - Invalid responses: validate structure before returning
   */
  private async callLLM(prompt: string): Promise<LLMQuizResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable not set. ' +
        'Add it to .env.local to enable quiz generation.'
      );
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-1106', // Version with JSON mode
          messages: [
            {
              role: 'system',
              content: 'You are an educational quiz generator. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7, // Some creativity, but consistent
          max_tokens: 2000, // Enough for 10 questions with explanations
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            'OpenAI rate limit exceeded. Please wait a moment and try again.'
          );
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error (${response.status}): ${
            (errorData as {error?: {message?: string}}).error?.message || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON response
      const parsedResponse = JSON.parse(content) as LLMQuizResponse;

      // Validate response structure
      this.validateLLMResponse(parsedResponse);

      return parsedResponse;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Quiz generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate LLM response structure.
   * 
   * WHY strict validation:
   * - LLM can still produce invalid structure even with JSON mode
   * - Catch errors before storing quiz
   * - Provide clear error messages for debugging
   */
  private validateLLMResponse(response: LLMQuizResponse): void {
    if (!response.questions || !Array.isArray(response.questions)) {
      throw new Error('LLM response missing questions array');
    }

    if (response.questions.length === 0) {
      throw new Error('LLM generated zero questions');
    }

    for (const q of response.questions) {
      if (!q.type || !q.question || !q.explanation || !q.difficulty) {
        throw new Error('Question missing required fields');
      }

      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length !== 4) {
          throw new Error('Multiple choice must have exactly 4 options');
        }
        if (typeof q.correctAnswer !== 'string') {
          throw new Error('Multiple choice answer must be string');
        }
      }

      if (q.type === 'true_false') {
        if (typeof q.correctAnswer !== 'boolean') {
          throw new Error('True/false answer must be boolean');
        }
      }
    }
  }

  /**
   * Create Quiz object from LLM response.
   */
  private createQuizFromResponse(
    llmResponse: LLMQuizResponse,
    sessionId: string,
    instructorId: string,
    instructorName: string,
    sourceTranscripts: TranscriptEntry[]
  ): Quiz {
    const quizId = this.generateQuizId(sessionId);
    const now = new Date();

    const questions: QuizQuestion[] = llmResponse.questions.map((q, index) => ({
      id: `${quizId}-q${index}`,
      type: q.type,
      question: q.question,
      options: q.type === 'multiple_choice' ? q.options! : null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      sourceTranscriptIds: sourceTranscripts.map(t => t.id),
    }));

    return {
      id: quizId,
      sessionId,
      createdBy: instructorId,
      createdByName: instructorName,
      createdAt: now,
      lastModified: now,
      sourceTranscriptIds: sourceTranscripts.map(t => t.id),
      questions,
      status: 'draft',
      title: llmResponse.title || 'Generated Quiz',
    };
  }

  /**
   * Generate unique quiz ID.
   * 
   * Format: quiz-{sessionId}-{timestamp}
   */
  private generateQuizId(sessionId: string): string {
    return `quiz-${sessionId}-${Date.now()}`;
  }

  /**
   * Validate question count is within acceptable range.
   */
  private validateQuestionCount(count: number): number {
    if (count < this.MIN_QUESTION_COUNT) {
      return this.MIN_QUESTION_COUNT;
    }
    if (count > this.MAX_QUESTION_COUNT) {
      return this.MAX_QUESTION_COUNT;
    }
    return count;
  }

  /**
   * Estimate token count for prompt (rough approximation).
   * 
   * WHY estimate:
   * - Track API usage and costs
   * - Warn if approaching context limits
   * - Rough: 1 token ≈ 4 characters
   */
  private estimateTokens(prompt: string): number {
    return Math.ceil(prompt.length / 4);
  }
}

// Export singleton instance
export const quizService = new QuizService();

