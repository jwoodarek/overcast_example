/**
 * QuizGenerator Component
 * 
 * Interface for instructors to generate quizzes from their teaching transcripts.
 * Uses LLM to create questions, allows editing before publishing.
 * 
 * WHY instructor review workflow:
 * - LLM might generate imperfect questions
 * - Instructor must verify accuracy (academic integrity)
 * - Can adjust difficulty or wording
 * - Final control over assessment content
 * 
 * WHY show generation progress:
 * - LLM calls take 10-30 seconds
 * - Loading state prevents confusion
 * - Shows system is working (not frozen)
 */

'use client';

import { useState } from 'react';
import { Quiz, QuizQuestion } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui';
import { Button } from './ui';
import { Input } from './ui';

interface QuizGeneratorProps {
  /** Session ID to generate quiz from */
  sessionId: string;
  /** Instructor ID */
  instructorId: string;
  /** Instructor name */
  instructorName: string;
  /** Callback when quiz is published */
  onQuizPublished?: (quiz: Quiz) => void;
}

export default function QuizGenerator({
  sessionId,
  instructorId,
  instructorName,
  onQuizPublished,
}: QuizGeneratorProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'mixed' | 'easy' | 'medium' | 'hard'>('mixed');

  /**
   * Generate quiz from transcripts.
   */
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          instructorId,
          instructorName,
          questionCount,
          difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate quiz');
      }

      const data = await response.json();
      setQuiz(data.quiz);
      setError(null);
    } catch (err) {
      console.error('[QuizGenerator] Error generating quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Update quiz question.
   */
  const handleUpdateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    if (!quiz) return;

    const updatedQuestions = quiz.questions.map((q) =>
      q.id === questionId ? { ...q, ...updates } : q
    );

    setQuiz({ ...quiz, questions: updatedQuestions });
    setEditingQuestionId(null);
  };

  /**
   * Update quiz title.
   */
  const handleUpdateTitle = (newTitle: string) => {
    if (!quiz) return;
    setQuiz({ ...quiz, title: newTitle });
  };

  /**
   * Save quiz (send updates to server).
   */
  const handleSave = async () => {
    if (!quiz) return;

    try {
      const response = await fetch(`/api/quiz/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: quiz.title,
          questions: quiz.questions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz');
      }

      alert('Quiz saved successfully!');
    } catch (err) {
      console.error('[QuizGenerator] Error saving quiz:', err);
      alert('Failed to save quiz');
    }
  };

  /**
   * Publish quiz (change status to published).
   */
  const handlePublish = async () => {
    if (!quiz) return;

    if (!confirm('Are you sure you want to publish this quiz? Students will be able to see it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/quiz/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'published',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish quiz');
      }

      const data = await response.json();
      setQuiz(data.quiz);
      
      if (onQuizPublished) {
        onQuizPublished(data.quiz);
      }

      alert('Quiz published successfully!');
    } catch (err) {
      console.error('[QuizGenerator] Error publishing quiz:', err);
      alert('Failed to publish quiz');
    }
  };

  /**
   * Discard quiz (delete).
   */
  const handleDiscard = async () => {
    if (!quiz) return;

    if (!confirm('Are you sure you want to discard this quiz? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/quiz/${quiz.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quiz');
      }

      setQuiz(null);
    } catch (err) {
      console.error('[QuizGenerator] Error deleting quiz:', err);
      alert('Failed to delete quiz');
    }
  };

  // Initial state - no quiz generated yet
  if (!quiz) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Generate Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Generate a quiz from your teaching transcripts. Questions will be created
            based on the content you&apos;ve covered in this session.
          </p>

          {/* Settings */}
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions (2-10)
              </label>
              <Input
                type="number"
                min={2}
                max={10}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                disabled={generating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                disabled={generating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="mixed">Mixed (recommended)</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="primary"
            className="w-full"
          >
            {generating ? 'Generating Quiz... (10-30 seconds)' : 'Generate Quiz'}
          </Button>

          {generating && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              This may take up to 30 seconds. Please wait...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Quiz generated - show editing interface
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Input
            value={quiz.title || 'Untitled Quiz'}
            onChange={(e) => handleUpdateTitle(e.target.value)}
            className="text-xl font-bold"
          />
          <span className={`px-3 py-1 rounded text-sm ${
            quiz.status === 'published' 
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {quiz.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Review and edit questions before publishing. Click on any question to edit it.
        </p>

        {/* Questions list */}
        <div className="space-y-4">
          {quiz.questions.map((question, index) => (
            <div
              key={question.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              {/* Question header */}
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  Question {index + 1} ({question.type.replace('_', ' ')})
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {question.difficulty}
                </span>
              </div>

              {/* Question text */}
              {editingQuestionId === question.id ? (
                <Input
                  value={question.question}
                  onChange={(e) =>
                    handleUpdateQuestion(question.id, { question: e.target.value })
                  }
                  className="mb-2"
                />
              ) : (
                <p className="text-base font-medium text-gray-900 mb-2">
                  {question.question}
                </p>
              )}

              {/* Options (for multiple choice) */}
              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-1 mb-2">
                  {question.options.map((option, optIdx) => (
                    <div
                      key={optIdx}
                      className={`p-2 rounded text-sm ${
                        question.correctAnswer === String.fromCharCode(65 + optIdx)
                          ? 'bg-green-50 border border-green-200 font-medium'
                          : 'bg-gray-50'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {option}
                    </div>
                  ))}
                </div>
              )}

              {/* Answer (for true/false) */}
              {question.type === 'true_false' && (
                <div className="mb-2">
                  <span className="text-sm font-medium">
                    Answer: {question.correctAnswer ? 'True' : 'False'}
                  </span>
                </div>
              )}

              {/* Explanation */}
              <div className="p-2 bg-blue-50 rounded text-sm text-gray-700">
                <strong>Explanation:</strong> {question.explanation}
              </div>

              {/* Edit button */}
              <Button
                onClick={() =>
                  setEditingQuestionId(
                    editingQuestionId === question.id ? null : question.id
                  )
                }
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                {editingQuestionId === question.id ? 'Done Editing' : 'Edit'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 w-full">
          <Button onClick={handleSave} variant="secondary">
            Save Draft
          </Button>
          <Button
            onClick={handlePublish}
            variant="primary"
            disabled={quiz.status === 'published'}
          >
            {quiz.status === 'published' ? 'Published' : 'Publish Quiz'}
          </Button>
          <Button onClick={handleDiscard} variant="ghost">
            Discard
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

