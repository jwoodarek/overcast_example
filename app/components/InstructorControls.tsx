'use client';

import React, { useState, useCallback } from 'react';
import { useDaily } from '@daily-co/daily-react';
import { DailyParticipant } from '@daily-co/daily-js';
import { AppUser, MuteParticipantRequest, MuteAllParticipantsRequest } from '@/lib/types';
import AlertPanel from './AlertPanel';

interface InstructorControlsProps {
  /** Current instructor user information */
  instructor: AppUser;
  /** Current classroom ID (1-6) */
  classroomId: string;
  /** Whether the instructor controls are enabled */
  enabled?: boolean;
  /** Handler to open breakout room modal (managed at Classroom level) */
  onOpenBreakoutModal?: () => void;
}

/**
 * InstructorControls Component
 * 
 * Provides instructor-specific controls for managing classroom participants:
 * - Individual participant muting/unmuting
 * - Mute all participants functionality
 * - Breakout room creation and management
 * 
 * Only visible and functional when user has instructor role.
 * Uses Daily React hooks for real-time participant management.
 */
export default function InstructorControls({ 
  instructor, 
  classroomId, 
  enabled = true,
  onOpenBreakoutModal 
}: InstructorControlsProps) {
  // Daily React hooks for participant management
  const daily = useDaily();
  
  // Get participants from Daily call object (fallback approach)
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  
  React.useEffect(() => {
    if (daily) {
      const updateParticipants = () => {
        const allParticipants = daily.participants();
        setParticipants(Object.values(allParticipants));
      };
      
      updateParticipants();
      
      // Listen for participant changes
      daily.on('participant-joined', updateParticipants);
      daily.on('participant-left', updateParticipants);
      daily.on('participant-updated', updateParticipants);
      
      return () => {
        daily.off('participant-joined', updateParticipants);
        daily.off('participant-left', updateParticipants);
        daily.off('participant-updated', updateParticipants);
      };
    }
  }, [daily]);

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter participants by role (exclude current instructor from student list)
  const students = participants.filter((p: DailyParticipant) => 
    p.user_name !== instructor.name && 
    !p.permissions?.hasPresence // Simple role detection - instructors typically have presence permissions
  );
  
  const otherInstructors = participants.filter((p: DailyParticipant) => 
    p.user_name !== instructor.name && 
    p.permissions?.hasPresence
  );

  /**
   * Calculate aggregate student audio state for smart toggle
   * 
   * WHY compute this:
   * - Single button is simpler than two separate buttons
   * - Real-time updates reflect current participant state
   * - Clearer for instructors ("mute the unmuted ones")
   * 
   * Logic:
   * - If ANY student has audio enabled → button shows "Mute All" (action to mute them)
   * - If ALL students muted or no students → button shows "Unmute All" (action to unmute)
   * 
   * WHY check audio property:
   * - Daily.co participant.audio is true when unmuted, false when muted
   * - Updates automatically via participant-updated events
   */
  const allStudentsMuted = students.every((p: DailyParticipant) => !p.audio);
  const muteAllButtonLabel = allStudentsMuted ? 'Unmute All Students' : 'Mute All Students';
  const muteAllButtonAction = allStudentsMuted ? false : true; // false = unmute, true = mute

  /**
   * Mute or unmute a specific participant
   * Calls the participants API to update participant audio state
   */
  const handleMuteParticipant = useCallback(async (
    participant: DailyParticipant, 
    muted: boolean
  ) => {
    if (!enabled || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const request: MuteParticipantRequest = {
        instructorSessionId: instructor.sessionId,
        muted,
        classroomId
      };

      const response = await fetch(`/api/participants/${participant.session_id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update participant mute state');
      }

      // Also update local Daily state for immediate feedback
      if (daily) {
        await daily.updateParticipant(participant.session_id, {
          setAudio: !muted
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to ${muted ? 'mute' : 'unmute'} participant: ${errorMessage}`);
      console.error('Failed to mute participant:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instructor.sessionId, classroomId, enabled, isLoading, daily]);

  /**
   * Mute or unmute all participants in the classroom
   * Excludes other instructors by default
   */
  const handleMuteAll = useCallback(async (muted: boolean) => {
    if (!enabled || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const request: MuteAllParticipantsRequest = {
        instructorSessionId: instructor.sessionId,
        classroomId,
        muted,
        excludeInstructors: true
      };

      const response = await fetch('/api/participants/mute-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update all participants');
      }

      await response.json();
      
      // Update local Daily state for all students
      if (daily) {
        for (const student of students) {
          await daily.updateParticipant(student.session_id, {
            setAudio: !muted
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to ${muted ? 'mute' : 'unmute'} all participants: ${errorMessage}`);
      console.error('Failed to mute all participants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instructor.sessionId, classroomId, enabled, isLoading, daily, students]);

  // Don't render if user is not an instructor
  if (instructor.role !== 'instructor') {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-teal-500/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-teal-400">
          Instructor Controls
        </h3>
        {isLoading && (
          <div className="text-sm text-gray-400">Processing...</div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-400 text-sm">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Participant Count Summary */}
      <div className="text-sm text-gray-300 space-y-1">
        <div>Students: {students.length}</div>
        <div>Other Instructors: {otherInstructors.length}</div>
        <div>Total Participants: {participants.length}</div>
      </div>

      {/* Smart Mute All/Unmute All Toggle - WHY: Single button reflects real-time state */}
      <div className="space-y-2">
        <h4 className="text-sm md:text-md font-medium text-gray-200">Student Audio Control</h4>
        <button
          onClick={() => handleMuteAll(muteAllButtonAction)}
          disabled={!enabled || isLoading || students.length === 0}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
            muteAllButtonAction
              ? 'bg-red-600 hover:bg-red-700'  // Mute action = red
              : 'bg-green-600 hover:bg-green-700'  // Unmute action = green
          } disabled:bg-gray-700 disabled:text-gray-400 text-white`}
          title={allStudentsMuted ? 'All students are currently muted' : 'Some students are unmuted'}
        >
          {muteAllButtonLabel}
        </button>
        <div className="text-xs text-gray-400">
          {students.length === 0 
            ? 'No students to control' 
            : allStudentsMuted 
              ? 'All students are muted'
              : `${students.filter((p: DailyParticipant) => p.audio).length} student(s) unmuted`}
        </div>
      </div>

      {/* Individual Participant Controls */}
      {students.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm md:text-md font-medium text-gray-200">Individual Controls</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {students.map((participant: DailyParticipant) => (
              <div key={participant.session_id} className="flex items-center justify-between bg-gray-800 rounded p-2">
                <span className="text-sm text-gray-300 truncate flex-1">
                  {participant.user_name || 'Anonymous'}
                </span>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleMuteParticipant(participant, true)}
                    disabled={!enabled || isLoading || !participant.audio}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400 
                             text-white px-2 py-1 rounded text-xs transition-colors"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => handleMuteParticipant(participant, false)}
                    disabled={!enabled || isLoading || participant.audio}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 
                             text-white px-2 py-1 rounded text-xs transition-colors"
                  >
                    Unmute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakout Room Controls */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-200">Breakout Rooms</h4>
        <button
          onClick={onOpenBreakoutModal}
          disabled={!enabled || isLoading || students.length < 2 || !onOpenBreakoutModal}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-400 
                   text-white px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          Create Breakout Room
        </button>
      </div>

      {/* Help Alerts Panel - WHY: Shows student confusion indicators in real-time */}
      <div className="mt-4">
        <AlertPanel
          classroomSessionId={`classroom-${classroomId}`}
          instructorId={instructor.sessionId}
        />
      </div>
    </div>
  );
}
