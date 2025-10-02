'use client';

import React, { useState, useCallback } from 'react';
import { useDaily } from '@daily-co/daily-react';
import { DailyParticipant } from '@daily-co/daily-js';
import { AppUser, MuteParticipantRequest, MuteAllParticipantsRequest, CreateBreakoutRoomRequest } from '@/lib/types';

interface InstructorControlsProps {
  /** Current instructor user information */
  instructor: AppUser;
  /** Current classroom ID (1-6) */
  classroomId: string;
  /** Whether the instructor controls are enabled */
  enabled?: boolean;
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
  enabled = true 
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
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [breakoutRoomName, setBreakoutRoomName] = useState('');

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
      console.error('Mute participant error:', err);
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

      const result = await response.json();
      
      // Update local Daily state for all students
      if (daily) {
        for (const student of students) {
          await daily.updateParticipant(student.session_id, {
            setAudio: !muted
          });
        }
      }

      console.log(`${muted ? 'Muted' : 'Unmuted'} ${result.affectedCount} participants`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to ${muted ? 'mute' : 'unmute'} all participants: ${errorMessage}`);
      console.error('Mute all error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instructor.sessionId, classroomId, enabled, isLoading, daily, students]);

  /**
   * Create a breakout room with selected participants
   */
  const handleCreateBreakout = useCallback(async () => {
    if (!enabled || isLoading || selectedParticipants.length === 0 || !breakoutRoomName.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const request: CreateBreakoutRoomRequest = {
        instructorSessionId: instructor.sessionId,
        parentClassroomId: classroomId,
        name: breakoutRoomName.trim(),
        participantIds: selectedParticipants,
        maxDuration: 30 // Default 30 minutes
      };

      const response = await fetch('/api/breakout-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create breakout room');
      }

      const result = await response.json();
      console.log('Breakout room created:', result.breakoutRoom);
      
      // Reset form and close modal
      setBreakoutRoomName('');
      setSelectedParticipants([]);
      setShowBreakoutModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to create breakout room: ${errorMessage}`);
      console.error('Create breakout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [instructor.sessionId, classroomId, enabled, isLoading, selectedParticipants, breakoutRoomName]);

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

      {/* Mute All Controls */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-200">Audio Controls</h4>
        <div className="flex gap-2">
          <button
            onClick={() => handleMuteAll(true)}
            disabled={!enabled || isLoading || students.length === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 
                     text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Mute All Students
          </button>
          <button
            onClick={() => handleMuteAll(false)}
            disabled={!enabled || isLoading || students.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 
                     text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Unmute All Students
          </button>
        </div>
      </div>

      {/* Individual Participant Controls */}
      {students.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-200">Individual Controls</h4>
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
          onClick={() => setShowBreakoutModal(true)}
          disabled={!enabled || isLoading || students.length < 2}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-400 
                   text-white px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          Create Breakout Room
        </button>
      </div>

      {/* Breakout Room Modal */}
      {showBreakoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-teal-500/30 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-teal-400 mb-4">Create Breakout Room</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={breakoutRoomName}
                  onChange={(e) => setBreakoutRoomName(e.target.value)}
                  placeholder="Discussion Group A"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white 
                           focus:border-teal-500 focus:outline-none"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Participants ({selectedParticipants.length} selected)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-600 rounded p-2">
                  {students.map((participant: DailyParticipant) => (
                    <label key={participant.session_id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.session_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants(prev => [...prev, participant.session_id]);
                          } else {
                            setSelectedParticipants(prev => prev.filter(id => id !== participant.session_id));
                          }
                        }}
                        className="rounded border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-300">
                        {participant.user_name || 'Anonymous'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowBreakoutModal(false);
                    setBreakoutRoomName('');
                    setSelectedParticipants([]);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBreakout}
                  disabled={!breakoutRoomName.trim() || selectedParticipants.length === 0 || isLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-400 
                           text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
