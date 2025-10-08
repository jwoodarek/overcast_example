/**
 * /api/quiz/[quizId]
 * 
 * CRUD operations for individual quiz:
 * - GET: Retrieve quiz by ID
 * - PATCH: Update quiz (edit questions, change title, publish)
 * - DELETE: Delete quiz
 * 
 * WHY instructor can edit:
 * - LLM might generate imperfect questions
 * - Instructor review before publishing (academic integrity)
 * - Can adjust difficulty or wording
 * - Maintains instructor control over assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/lib/services/quiz-service';

/**
 * GET handler - retrieve quiz by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { quizId } = await params;

    const quiz = quizService.getQuiz(quizId);

    if (!quiz) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Quiz with ID ${quizId} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ quiz });

  } catch (error) {
    console.error('[GET /api/quiz/[quizId]] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve quiz',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - update quiz questions, title, or status.
 * 
 * Request body: Partial<Quiz>
 * Common updates:
 * - questions: QuizQuestion[] (edit questions)
 * - title: string (change title)
 * - status: 'draft' | 'published' (publish quiz)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { quizId } = await params;

    const body = await request.json();

    // TODO: Add authorization check
    // Verify user is the creator or an instructor
    // For MVP, we trust the client

    // Validate that quiz exists
    const existingQuiz = quizService.getQuiz(quizId);
    if (!existingQuiz) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Quiz with ID ${quizId} not found`,
        },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status && !['draft', 'published'].includes(body.status)) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          message: 'Invalid status. Must be "draft" or "published"',
        },
        { status: 400 }
      );
    }

    // Validate questions if provided
    if (body.questions) {
      if (!Array.isArray(body.questions) || body.questions.length === 0) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Questions must be a non-empty array',
          },
          { status: 400 }
        );
      }

      // Basic validation of question structure
      for (const q of body.questions) {
        if (!q.type || !q.question || !q.explanation || !q.difficulty) {
          return NextResponse.json(
            {
              error: 'BAD_REQUEST',
              message: 'Each question must have type, question, explanation, and difficulty',
            },
            { status: 400 }
          );
        }

        if (q.type === 'multiple_choice') {
          if (!q.options || q.options.length !== 4) {
            return NextResponse.json(
              {
                error: 'BAD_REQUEST',
                message: 'Multiple choice questions must have exactly 4 options',
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update quiz
    const updatedQuiz = quizService.updateQuiz(quizId, body);

    if (!updatedQuiz) {
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update quiz',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz: updatedQuiz,
      message: 'Quiz updated successfully',
    });

  } catch (error) {
    console.error('[PATCH /api/quiz/[quizId]] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update quiz',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - delete quiz.
 * 
 * WHY allow deletion:
 * - Instructor might want to remove draft quizzes
 * - Mistakes in generation (wrong content)
 * - Privacy: remove old quizzes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { quizId } = await params;

    // TODO: Add authorization check
    // Verify user is the creator or an instructor
    // For MVP, we trust the client

    const success = quizService.deleteQuiz(quizId);

    if (!success) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Quiz with ID ${quizId} not found`,
        },
        { status: 404 }
      );
    }

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('[DELETE /api/quiz/[quizId]] Error:', error);
    
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete quiz',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

