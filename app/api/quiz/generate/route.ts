/**
 * POST /api/quiz/generate
 * 
 * Generate quiz from instructor transcripts using LLM.
 * Only generates from instructor speech (not student questions).
 * 
 * WHY async consideration:
 * - LLM calls can take 10-30 seconds
 * - For MVP: synchronous (wait for response)
 * - Future: async with job ID and polling
 * 
 * WHY instructor authorization:
 * - Only instructors should generate quizzes
 * - Prevents students from creating quizzes
 * - Academic integrity (quiz content from instructor only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/lib/services/quiz-service';

/**
 * POST handler for quiz generation.
 * 
 * Request body:
 * - sessionId: string (required)
 * - instructorId: string (required)
 * - instructorName: string (required)
 * - questionCount: number (optional, default 5, max 10)
 * - difficulty: 'mixed' | 'easy' | 'medium' | 'hard' (optional, default 'mixed')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid sessionId in request body',
        },
        { status: 400 }
      );
    }

    if (!body.instructorId || typeof body.instructorId !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid instructorId in request body',
        },
        { status: 400 }
      );
    }

    if (!body.instructorName || typeof body.instructorName !== 'string') {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Missing or invalid instructorName in request body',
        },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.questionCount !== undefined) {
      const count = parseInt(body.questionCount);
      if (isNaN(count) || count < 2 || count > 10) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Invalid questionCount. Must be between 2 and 10',
          },
          { status: 400 }
        );
      }
    }

    if (body.difficulty !== undefined) {
      if (!['mixed', 'easy', 'medium', 'hard'].includes(body.difficulty)) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Invalid difficulty. Must be one of: mixed, easy, medium, hard',
          },
          { status: 400 }
        );
      }
    }

    // TODO: Add instructor authorization check
    // For MVP, we trust the instructorId from client
    // Future: validate against session/JWT to ensure user is actually an instructor

    const { sessionId, instructorId, instructorName, questionCount, difficulty } = body;

    // Generate quiz
    try {
      const result = await quizService.generateQuiz({
        sessionId,
        instructorId,
        instructorName,
        questionCount,
        difficulty,
      });

      // Return quiz with generation metadata
      return NextResponse.json({
        quiz: result.quiz,
        generationTime: result.generationTime,
        tokensUsed: result.tokensUsed,
      });

    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // No instructor transcripts found
        if (error.message.includes('No instructor transcripts')) {
          return NextResponse.json(
            {
              error: 'NOT_FOUND',
              message: error.message,
            },
            { status: 404 }
          );
        }

        // OpenAI API error
        if (error.message.includes('rate limit')) {
          return NextResponse.json(
            {
              error: 'RATE_LIMIT',
              message: 'OpenAI rate limit exceeded. Please wait a moment and try again.',
            },
            { status: 429 }
          );
        }

        // API key missing
        if (error.message.includes('OPENAI_API_KEY')) {
          return NextResponse.json(
            {
              error: 'SERVICE_UNAVAILABLE',
              message: 'Quiz generation service not configured. Please contact administrator.',
            },
            { status: 503 }
          );
        }

        // Other LLM errors
        if (error.message.includes('Quiz generation failed')) {
          return NextResponse.json(
            {
              error: 'LLM_ERROR',
              message: error.message,
            },
            { status: 500 }
          );
        }
      }

      throw error;
    }

  } catch (error) {
    console.error('[POST /api/quiz/generate] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate quiz',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

