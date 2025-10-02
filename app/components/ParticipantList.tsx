'use client';

// ParticipantList component using useParticipantIds() hook
// Displays list of classroom participants with instructor controls

import React from 'react';
import { useParticipantIds, useDaily, useLocalParticipant } from '@daily-co/daily-react';
import { DailyParticipant } from '@daily-co/daily-js';
import { AppUser } from '@/lib/types';

interface ParticipantListProps {
  /** Current user context for permission checks */
  currentUser?: AppUser;
  /** Whether to show instructor controls */
  showControls?: boolean;
  /** Callback when participant is muted/unmuted */
  onMuteParticipant?: (sessionId: string, muted: boolean) => void;
  /** Callback when all participants are muted */
  onMuteAll?: (muted: boolean) => void;
  /** CSS class for styling */
  className?: string;
}

/**
 * ParticipantList Component
 * 
 * Displays a list of all participants in the current Daily.co call.
 * Shows participant names, roles, and connection status.
 * Provides instructor controls for muting participants.
 * 
 * Uses Daily React hooks:
 * - useParticipantIds(): Get all participant IDs in the call
 * - useDaily(): Get Daily call object to access participant data
 * - useLocalParticipant(): Get local participant data for self-identification
 */
export default function ParticipantList({
  currentUser,
  showControls = false,
  onMuteParticipant,
  onMuteAll,
  className = ''
}: ParticipantListProps) {
  // Daily React hooks
  const participantIds = useParticipantIds();
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  
  // Get all participant objects from the Daily call
  const participants: DailyParticipant[] = React.useMemo(() => {
    if (!daily) return [];
    const allParticipants = daily.participants();
    return participantIds
      .map(id => allParticipants[id])
      .filter((p): p is DailyParticipant => p !== undefined && p !== null);
  }, [daily, participantIds]);

  // Check if current user is an instructor
  const isInstructor = currentUser?.role === 'instructor';
  const canShowControls = showControls && isInstructor;

  // Separate participants by role
  const instructors = participants.filter(p => p.userData?.role === 'instructor');
  const students = participants.filter(p => p.userData?.role !== 'instructor');

  // Count muted participants for "mute all" button state
  const mutedCount = participants.filter(p => p.audio === false).length;
  const allMuted = mutedCount === participants.length;

  /**
   * Handle muting/unmuting a specific participant
   */
  const handleMuteParticipant = (sessionId: string, currentlyMuted: boolean) => {
    if (!canShowControls || !onMuteParticipant) return;
    onMuteParticipant(sessionId, !currentlyMuted);
  };

  /**
   * Handle muting/unmuting all participants
   */
  const handleMuteAll = () => {
    if (!canShowControls || !onMuteAll) return;
    onMuteAll(!allMuted);
  };

  /**
   * Render individual participant item
   */
  const renderParticipant = (participant: DailyParticipant, isLocal = false) => {
    const participantName = participant.user_name || 'Anonymous';
    const isParticipantInstructor = participant.userData?.role === 'instructor';
    const isAudioMuted = participant.audio === false;
    const isVideoOff = participant.video === false;
    const connectionState = participant.connectionState || 'connected';

    return (
      <div 
        key={participant.session_id}
        className={`
          flex items-center justify-between p-3 rounded-lg border
          ${isLocal ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
          ${connectionState !== 'connected' ? 'opacity-60' : ''}
        `}
      >
        {/* Participant info */}
        <div className="flex items-center space-x-3">
          {/* Avatar/Status indicator */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
            ${isParticipantInstructor ? 'bg-teal-500' : 'bg-gray-500'}
            ${connectionState !== 'connected' ? 'opacity-50' : ''}
          `}>
            {participantName.charAt(0).toUpperCase()}
          </div>

          {/* Name and role */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {participantName}
                {isLocal && <span className="text-gray-500 text-sm ml-1">(You)</span>}
              </span>
              
              {isParticipantInstructor && (
                <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full font-medium">
                  INSTRUCTOR
                </span>
              )}
            </div>
            
            {/* Connection status */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className={`
                w-2 h-2 rounded-full
                ${connectionState === 'connected' ? 'bg-green-400' : 
                  connectionState === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'}
              `} />
              <span className="capitalize">{connectionState}</span>
            </div>
          </div>
        </div>

        {/* Status indicators and controls */}
        <div className="flex items-center space-x-2">
          {/* Audio/Video status */}
          <div className="flex items-center space-x-1">
            {isAudioMuted && (
              <div className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center">
                <span className="text-xs">🔇</span>
              </div>
            )}
            {isVideoOff && (
              <div className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center">
                <span className="text-xs">📹</span>
              </div>
            )}
          </div>

          {/* Instructor controls */}
          {canShowControls && !isLocal && (
            <button
              onClick={() => handleMuteParticipant(participant.session_id, isAudioMuted)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${isAudioMuted 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                }
              `}
              disabled={connectionState !== 'connected'}
            >
              {isAudioMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render participant section (instructors or students)
   */
  const renderParticipantSection = (
    title: string, 
    participantList: DailyParticipant[], 
    icon: string
  ) => {
    if (participantList.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
          <span>{icon}</span>
          <span>{title} ({participantList.length})</span>
        </h3>
        
        <div className="space-y-2">
          {participantList.map(participant => 
            renderParticipant(
              participant, 
              participant.session_id === localParticipant?.session_id
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`participant-list ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Participants ({participants.length})
        </h2>

        {/* Instructor controls */}
        {canShowControls && participants.length > 1 && (
          <button
            onClick={handleMuteAll}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${allMuted 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
              }
            `}
          >
            {allMuted ? 'Unmute All' : 'Mute All'}
          </button>
        )}
      </div>

      {/* Participants list */}
      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <p>No participants yet</p>
          <p className="text-sm">Participants will appear here when they join</p>
        </div>
      ) : (
        <div>
          {/* Instructors section */}
          {renderParticipantSection('Instructors', instructors, '👨‍🏫')}
          
          {/* Students section */}
          {renderParticipantSection('Students', students, '👨‍🎓')}
        </div>
      )}

      {/* Summary stats for instructors */}
      {canShowControls && participants.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total participants:</span>
              <span className="font-medium">{participants.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Muted participants:</span>
              <span className="font-medium">{mutedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Connected:</span>
              <span className="font-medium">
                {participants.filter(p => p.connectionState === 'connected').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ParticipantList Usage Examples:
 * 
 * // Basic student view - no controls
 * <ParticipantList currentUser={currentUser} />
 * 
 * // Instructor view with controls
 * <ParticipantList 
 *   currentUser={currentUser}
 *   showControls={true}
 *   onMuteParticipant={handleMuteParticipant}
 *   onMuteAll={handleMuteAll}
 * />
 * 
 * // Sidebar layout
 * <ParticipantList 
 *   currentUser={currentUser}
 *   className="w-64 h-full overflow-y-auto"
 * />
 */
