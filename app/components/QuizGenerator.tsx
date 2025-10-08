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

import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Quiz, QuizQuestion } from '@/lib/types';
import { 
  activeQuizAtom, 
  quizHistoryAtom, 
  quizTelemetryAtom,
  QuizStatus,
  QuizTelemetryEvent 
} from '@/lib/store/quiz-store';
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
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Jotai atoms for quiz state management
  const [activeQuiz, setActiveQuiz] = useAtom(activeQuizAtom);
  const setQuizHistory = useSetAtom(quizHistoryAtom);
  const setQuizTelemetry = useSetAtom(quizTelemetryAtom);

  /**
   * T040: Log telemetry event for quiz lifecycle tracking
   * WHY: Instructors need visibility into quiz activity for verification
   */
  const logTelemetryEvent = (
    quizId: string,
    eventType: 'created' | 'started' | 'ended' | 'delivered' | 'viewed',
    metadata?: Record<string, unknown>
  ) => {
    const event: QuizTelemetryEvent = {
      quizId,
      eventType,
      timestamp: new Date(),
      metadata,
    };
    setQuizTelemetry((prev) => [...prev, event]);
  };

  /**
   * T039: Show toast notification for quiz lifecycle events
   * WHY: Provides real-time feedback to instructors about quiz status changes
   */
  const showToast = (message: string) => {
    setToastMessage(message);
    // Auto-dismiss after 4 seconds
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * T039: Toast auto-dismiss effect
   * WHY: Toast notifications should automatically disappear after a few seconds
   */
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  /**
   * Generate quiz from transcripts.
   * T039: Shows toast notification on success
   * T040: Logs telemetry event when quiz is created
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
      const generatedQuiz = data.quiz;
      setQuiz(generatedQuiz);
      setError(null);

      // T040: Create QuizStatus and set as active quiz
      const quizStatus: QuizStatus = {
        quizId: generatedQuiz.id,
        phase: 'pending',
        createdAt: generatedQuiz.createdAt ? new Date(generatedQuiz.createdAt) : new Date(),
        questionCount: generatedQuiz.questions.length,
        deliveredToCount: 0,
        viewedByCount: 0,
      };
      setActiveQuiz(quizStatus);

      // T040: Log telemetry for quiz creation
      logTelemetryEvent(generatedQuiz.id, 'created', {
        questionCount: generatedQuiz.questions.length,
        difficulty,
      });

      // T039: Show success toast
      showToast('Quiz generated successfully!');
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
      showToast('Failed to generate quiz. Please try again.');
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
      console.error('Failed to save quiz:', err);
      alert('Failed to save quiz');
    }
  };

  /**
   * Publish quiz (change status to published).
   * T039: Shows toast notification on success
   * T040: Logs telemetry event when quiz is started (published = started)
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
      
      // T040: Update quiz status to 'active' phase when published
      if (activeQuiz) {
        const updatedStatus: QuizStatus = {
          ...activeQuiz,
          phase: 'active',
          startedAt: new Date(),
        };
        setActiveQuiz(updatedStatus);

        // Add to history
        setQuizHistory((prev) => [...prev, updatedStatus]);
      }

      // T040: Log telemetry for quiz start
      logTelemetryEvent(quiz.id, 'started', {
        publishedAt: new Date().toISOString(),
      });

      if (onQuizPublished) {
        onQuizPublished(data.quiz);
      }

      // T039: Show success toast instead of alert
      showToast('Quiz published successfully! Students can now see it.');
    } catch (err) {
      console.error('Failed to publish quiz:', err);
      showToast('Failed to publish quiz. Please try again.');
    }
  };

  /**
   * Discard quiz (delete).
   * T039: Shows toast notification
   * T040: Logs telemetry event when quiz is ended/discarded
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

      // T040: Update quiz status to 'completed' phase and log telemetry
      if (activeQuiz) {
        const completedStatus: QuizStatus = {
          ...activeQuiz,
          phase: 'completed',
          endedAt: new Date(),
        };
        setActiveQuiz(null); // Clear active quiz
        setQuizHistory((prev) => [...prev, completedStatus]);

        // Log telemetry for quiz end
        logTelemetryEvent(quiz.id, 'ended', {
          reason: 'discarded',
          endedAt: new Date().toISOString(),
        });
      }

      setQuiz(null);
      
      // T039: Show toast notification
      showToast('Quiz discarded successfully.');
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      showToast('Failed to discard quiz. Please try again.');
    }
  };

  // Initial state - no quiz generated yet
  if (!quiz) {
    return (
      <>
        {/* T039: Toast notification display */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in">
            {toastMessage}
          </div>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generate Quiz</span>
              {/* T038: Quiz status badge */}
              {activeQuiz && (
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeQuiz.phase === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : activeQuiz.phase === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  Quiz {activeQuiz.phase}
                </span>
              )}
            </CardTitle>
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
      </>
    );
  }

  // Quiz generated - show editing interface
  return (
    <>
      {/* T039: Toast notification display */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          {toastMessage}
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <Input
              value={quiz.title || 'Untitled Quiz'}
              onChange={(e) => handleUpdateTitle(e.target.value)}
              className="text-xl font-bold"
            />
            <div className="flex items-center gap-2">
              {/* T038: Quiz status badge - shows both quiz.status and activeQuiz.phase */}
              {activeQuiz && (
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeQuiz.phase === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : activeQuiz.phase === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  Quiz {activeQuiz.phase}
                </span>
              )}
              <span className={`px-3 py-1 rounded text-sm ${
                quiz.status === 'published' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {quiz.status}
              </span>
            </div>
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

        {/* T041: Telemetry view for instructors */}
        <div className="mt-6 border-t pt-4">
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Quiz Activity & Telemetry</span>
            <span className="text-xs text-gray-500">
              {showTelemetry ? '▼ Hide' : '▶ Show'}
            </span>
          </button>
          
          {showTelemetry && activeQuiz && (
            <div className="mt-4 space-y-3">
              {/* Quiz metadata */}
              <div className="bg-gray-50 p-3 rounded text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium text-gray-700">Phase:</span>{' '}
                    <span className="text-gray-900">{activeQuiz.phase}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Questions:</span>{' '}
                    <span className="text-gray-900">{activeQuiz.questionCount}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>{' '}
                    <span className="text-gray-900">
                      {activeQuiz.createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                  {activeQuiz.startedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Started:</span>{' '}
                      <span className="text-gray-900">
                        {activeQuiz.startedAt.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {activeQuiz.endedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Ended:</span>{' '}
                      <span className="text-gray-900">
                        {activeQuiz.endedAt.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Delivered:</span>{' '}
                    <span className="text-gray-900">
                      {activeQuiz.deliveredToCount} students
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Viewed:</span>{' '}
                    <span className="text-gray-900">
                      {activeQuiz.viewedByCount} students
                    </span>
                  </div>
                </div>
              </div>

              {/* Telemetry events timeline */}
              <div className="text-xs text-gray-600">
                <h4 className="font-medium text-gray-700 mb-2">Lifecycle Events:</h4>
                <TelemetryEventsList quizId={quiz.id} />
              </div>
            </div>
          )}
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
    </>
  );
}

/**
 * T041: TelemetryEventsList component
 * Displays chronological list of quiz lifecycle events
 * WHY separate component: Keeps main component clean, reusable if needed
 */
function TelemetryEventsList({ quizId }: { quizId: string }) {
  const [telemetryEvents] = useAtom(quizTelemetryAtom);
  
  // Filter events for this quiz
  const quizEvents = telemetryEvents.filter((e) => e.quizId === quizId);
  
  if (quizEvents.length === 0) {
    return (
      <p className="text-gray-500 italic">No events logged yet.</p>
    );
  }
  
  return (
    <div className="space-y-1">
      {quizEvents.map((event, index) => (
        <div
          key={`${event.quizId}-${event.eventType}-${index}`}
          className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded"
        >
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              event.eventType === 'created'
                ? 'bg-blue-100 text-blue-800'
                : event.eventType === 'started'
                ? 'bg-green-100 text-green-800'
                : event.eventType === 'ended'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {event.eventType}
          </span>
          <span className="text-gray-600">
            {event.timestamp.toLocaleTimeString()}
          </span>
          {event.metadata && (
            <span className="text-gray-500 text-xs">
              {JSON.stringify(event.metadata)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

