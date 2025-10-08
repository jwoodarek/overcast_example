/**
 * Component Test: QuizGenerator
 * 
 * Tests the QuizGenerator component with React Testing Library
 * Validates quiz generation, editing, publishing, and error handling
 * 
 * WHY these tests:
 * - Ensure quiz generation workflow is intuitive and reliable
 * - Verify instructor can edit questions before publishing
 * - Confirm loading states during LLM API calls
 * - Validate save/publish/discard actions work correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizGenerator from '@/app/components/QuizGenerator';
import { Quiz, QuizQuestion } from '@/lib/types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock window.alert
global.alert = jest.fn();

describe('QuizGenerator Component', () => {
  const mockSessionId = 'test-session-123';
  const mockInstructorId = 'instructor-456';
  const mockInstructorName = 'Dr. Smith';

  const mockQuizQuestion: QuizQuestion = {
    id: 'quiz-1-q1',
    type: 'multiple_choice',
    question: 'What is the derivative of x²?',
    options: ['2x', 'x', '2', 'x²'],
    correctAnswer: 'A',
    explanation: 'The power rule states that d/dx(xⁿ) = n·xⁿ⁻¹, so d/dx(x²) = 2x.',
    difficulty: 'medium',
    sourceTranscriptIds: ['transcript-1', 'transcript-2'],
  };

  const mockQuiz: Quiz = {
    id: 'quiz-1',
    sessionId: mockSessionId,
    createdBy: mockInstructorId,
    createdByName: mockInstructorName,
    createdAt: new Date('2025-10-07T12:00:00Z'),
    lastModified: new Date('2025-10-07T12:00:00Z'),
    sourceTranscriptIds: ['transcript-1', 'transcript-2'],
    questions: [
      mockQuizQuestion,
      {
        ...mockQuizQuestion,
        id: 'quiz-1-q2',
        type: 'true_false',
        question: 'The derivative of a constant is zero.',
        options: null,
        correctAnswer: true,
        difficulty: 'easy',
      },
    ],
    status: 'draft',
    title: 'Derivatives Quiz',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ quiz: mockQuiz }),
    });
  });

  describe('Initial State', () => {
    test('renders generation form initially', () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      expect(screen.getByRole('heading', { name: /generate quiz/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate quiz/i })).toBeInTheDocument();
    });

    test('shows question count input with default value', () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const questionCountInput = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(questionCountInput).toHaveValue(5);
    });

    test('shows difficulty selector with default value', () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const difficultySelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(difficultySelect).toHaveValue('mixed');
    });

    test('allows changing question count', () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const questionCountInput = screen.getByRole('spinbutton') as HTMLInputElement;
      fireEvent.change(questionCountInput, { target: { value: '8' } });

      expect(questionCountInput).toHaveValue(8);
    });

    test('allows changing difficulty level', () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const difficultySelect = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(difficultySelect, { target: { value: 'hard' } });

      expect(difficultySelect).toHaveValue('hard');
    });
  });

  describe('Quiz Generation', () => {
    test('triggers API call when generate button clicked', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/quiz/generate',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: mockSessionId,
              instructorId: mockInstructorId,
              instructorName: mockInstructorName,
              questionCount: 5,
              difficulty: 'mixed',
            }),
          })
        );
      });
    });

    test('shows loading state during generation', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ quiz: mockQuiz }),
                }),
              100
            )
          )
      );

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generating quiz/i })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/this may take up to 30 seconds/i)
      ).toBeInTheDocument();
    });

    test('disables inputs during generation', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ quiz: mockQuiz }),
                }),
              100
            )
          )
      );

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('spinbutton')).toBeDisabled();
      });

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    test('displays generated quiz after successful generation', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Derivatives Quiz')).toBeInTheDocument();
      });

      expect(screen.getByText('What is the derivative of x²?')).toBeInTheDocument();
      expect(
        screen.getByText('The derivative of a constant is zero.')
      ).toBeInTheDocument();
    });

    test('shows error message when generation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Insufficient instructor transcripts',
        }),
      });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/insufficient instructor transcripts/i)
        ).toBeInTheDocument();
      });
    });

    test('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate quiz/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quiz Display and Editing', () => {
    test('shows all questions with correct numbering', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByText('Question 1 (multiple choice)')).toBeInTheDocument();
      });

      expect(screen.getByText('Question 2 (true false)')).toBeInTheDocument();
    });

    test('displays question options for multiple choice', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByText(/A\. 2x/)).toBeInTheDocument();
      });

      expect(screen.getByText(/B\. x/)).toBeInTheDocument();
      expect(screen.getByText(/C\. 2/)).toBeInTheDocument();
      expect(screen.getByText(/D\. x²/)).toBeInTheDocument();
    });

    test('displays correct answer indicator', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        // The correct answer "A. 2x" should have a green background
        const correctOption = screen.getByText(/A\. 2x/);
        expect(correctOption.closest('div')).toHaveClass('bg-green-50');
      });
    });

    test('displays explanation for each question', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/The power rule states/)[0]).toBeInTheDocument();
      });
    });

    test('displays difficulty badges', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByText('medium')).toBeInTheDocument();
      });

      expect(screen.getByText('easy')).toBeInTheDocument();
    });

    test('displays quiz status badge', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByText('draft')).toBeInTheDocument();
      });
    });

    test('allows editing quiz title', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Derivatives Quiz');
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Derivatives Quiz');
      fireEvent.change(titleInput, { target: { value: 'Calculus Basics Quiz' } });

      expect(titleInput).toHaveValue('Calculus Basics Quiz');
    });

    test('edit button toggles editing mode for questions', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getAllByText('Edit')[0]).toBeInTheDocument();
      });

      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);

      expect(screen.getByText('Done Editing')).toBeInTheDocument();
    });
  });

  describe('Quiz Actions', () => {
    test('save draft button triggers API call', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save draft/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/quiz/${mockQuiz.id}`,
          expect.objectContaining({
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: mockQuiz.title,
              questions: mockQuiz.questions,
            }),
          })
        );
      });
    });

    test('publish button shows confirmation dialog', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /publish quiz/i })).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish quiz/i });
      fireEvent.click(publishButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to publish this quiz? Students will be able to see it.'
      );
    });

    test('publish button triggers API call when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            quiz: { ...mockQuiz, status: 'published' },
          }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /publish quiz/i })).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish quiz/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/quiz/${mockQuiz.id}`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({
              status: 'published',
            }),
          })
        );
      });
    });

    test('publish button calls onQuizPublished callback', async () => {
      const onQuizPublished = jest.fn();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            quiz: { ...mockQuiz, status: 'published' },
          }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
          onQuizPublished={onQuizPublished}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /publish quiz/i })).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish quiz/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(onQuizPublished).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockQuiz.id,
            status: 'published',
          })
        );
      });
    });

    test('disables publish button when already published', async () => {
      const publishedQuiz = { ...mockQuiz, status: 'published' as const };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quiz: publishedQuiz }),
      });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        const publishButton = screen.getByRole('button', { name: /published/i });
        expect(publishButton).toBeDisabled();
      });
    });

    test('discard button shows confirmation dialog', async () => {
      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
      });

      const discardButton = screen.getByRole('button', { name: /discard/i });
      fireEvent.click(discardButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to discard this quiz? This cannot be undone.'
      );
    });

    test('discard button triggers DELETE API call when confirmed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
      });

      const discardButton = screen.getByRole('button', { name: /discard/i });
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/quiz/${mockQuiz.id}`,
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    test('discard button resets to initial state', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Derivatives Quiz')).toBeInTheDocument();
      });

      const discardButton = screen.getByRole('button', { name: /discard/i });
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /generate quiz/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /generate quiz/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('shows alert when save fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Failed to save' }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save draft/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to save quiz');
      });
    });

    test('shows alert when publish fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Failed to publish' }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /publish quiz/i })).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish quiz/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to publish quiz');
      });
    });

    test('shows alert when discard fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ quiz: mockQuiz }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Failed to delete' }),
        });

      render(
        <QuizGenerator
          sessionId={mockSessionId}
          instructorId={mockInstructorId}
          instructorName={mockInstructorName}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /generate quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
      });

      const discardButton = screen.getByRole('button', { name: /discard/i });
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to delete quiz');
      });
    });
  });
});

