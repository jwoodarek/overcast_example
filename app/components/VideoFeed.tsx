'use client';

// VideoFeed component using Daily React hooks
// Handles video display and local participant controls for the Overcast classroom

import React from 'react';
import { 
  useParticipantIds,
  useDaily,
  useLocalParticipant,
  useDevices,
  useScreenShare,
  DailyVideo 
} from '@daily-co/daily-react';
import { DailyParticipant } from '@daily-co/daily-js';

interface VideoFeedProps {
  /** Whether to show local participant video */
  showLocalVideo?: boolean;
  /** Whether to show remote participants */
  showRemoteParticipants?: boolean;
  /** Maximum number of participants to display */
  maxParticipants?: number;
  /** CSS class for styling */
  className?: string;
}

/**
 * VideoFeed Component
 * 
 * Displays video feeds from Daily.co using React hooks.
 * Shows local participant video and remote participants in a grid layout.
 * Handles screen sharing display when active.
 * 
 * Uses Daily React hooks:
 * - useParticipantIds(): Get all participant IDs in the call
 * - useDaily(): Get Daily call object to access participant data
 * - useLocalParticipant(): Get local participant data
 * - useScreenShare(): Handle screen sharing state
 * - useDevices(): Access camera/microphone devices
 */
export default function VideoFeed({
  showLocalVideo = true,
  showRemoteParticipants = true,
  maxParticipants = 12,
  className = ''
}: VideoFeedProps) {
  // Daily React hooks for participant management
  const participantIds = useParticipantIds();
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const { screens } = useScreenShare();
  // useDevices() available for future device selection features
  useDevices();

  // Get all participant objects from the Daily call
  const participants: DailyParticipant[] = React.useMemo(() => {
    if (!daily) return [];
    const allParticipants = daily.participants();
    return participantIds
      .map(id => allParticipants[id])
      .filter((p): p is DailyParticipant => p !== undefined && p !== null);
  }, [daily, participantIds]);

  // Filter participants for display
  const remoteParticipants = participants.filter(p => !p.local);
  const displayParticipants = showRemoteParticipants 
    ? remoteParticipants.slice(0, maxParticipants)
    : [];

  // Check if screen sharing is active
  const isScreenSharing = screens && screens.length > 0;
  const screenShareParticipant = screens?.[0];

  /**
   * Render individual participant video
   * Uses DailyVideo component from @daily-co/daily-react
   */
  const renderParticipantVideo = (participant: DailyParticipant, isLocal = false) => {
    const participantName = participant.user_name || 'Anonymous';
    const isInstructor = (participant.userData as { role?: string } | undefined)?.role === 'instructor';
    
    return (
      <div 
        key={participant.session_id}
        className={`
          relative rounded-lg overflow-hidden bg-gray-900 border-2
          ${isInstructor ? 'border-teal-400' : 'border-gray-600'}
          ${isLocal ? 'border-blue-400' : ''}
        `}
      >
        {/* Video element */}
        <DailyVideo 
          sessionId={participant.session_id}
          type="video"
          className="w-full h-full object-cover"
        />
        
        {/* Participant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center justify-between text-white text-sm">
            <span className="font-medium">
              {isLocal ? `${participantName} (You)` : participantName}
              {isInstructor && (
                <span className="ml-1 text-teal-400 text-xs">INSTRUCTOR</span>
              )}
            </span>
            
            {/* Audio/Video status indicators */}
            <div className="flex items-center space-x-1">
              {participant.audio === false && (
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">🔇</span>
                </div>
              )}
              {participant.video === false && (
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">📹</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render screen share display
   * Takes priority over regular video feeds when active
   */
  const renderScreenShare = () => {
    if (!isScreenSharing || !screenShareParticipant) return null;

    // Find the participant who is sharing to get their name
    const sharingParticipant = participants.find(p => p.session_id === screenShareParticipant.session_id);
    const sharerName = sharingParticipant?.user_name || 'Someone';

    return (
      <div className="col-span-full mb-4">
        <div className="relative rounded-lg overflow-hidden bg-gray-900 border-2 border-yellow-400">
          <DailyVideo 
            sessionId={screenShareParticipant.session_id}
            type="screenVideo"
            className="w-full h-64 md:h-96 object-contain bg-black"
          />
          
          <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded text-sm font-medium">
            📺 {sharerName} is sharing their screen
          </div>
        </div>
      </div>
    );
  };

  // Calculate grid layout based on participant count
  const totalParticipants = displayParticipants.length + (showLocalVideo && localParticipant ? 1 : 0);
  const getGridCols = () => {
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`video-feed ${className}`}>
      {/* Screen share takes priority */}
      {isScreenSharing && (
        <div className="mb-4">
          {renderScreenShare()}
        </div>
      )}

      {/* Main video grid */}
      <div className={`grid gap-2 md:gap-4 ${getGridCols()}`}>
        {/* Local participant video */}
        {showLocalVideo && localParticipant && (
          renderParticipantVideo(localParticipant, true)
        )}

        {/* Remote participants */}
        {displayParticipants.map(participant => 
          renderParticipantVideo(participant, false)
        )}
      </div>

      {/* No participants message */}
      {totalParticipants === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📹</div>
          <p>No video feeds available</p>
          <p className="text-sm">Participants will appear here when they join</p>
        </div>
      )}

      {/* Participant count indicator */}
      {totalParticipants > 0 && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Showing {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
          {displayParticipants.length >= maxParticipants && (
            <span className="text-yellow-400 ml-1">
              (Limited to {maxParticipants})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * VideoFeed Usage Examples:
 * 
 * // Basic usage - shows all participants
 * <VideoFeed />
 * 
 * // Instructor view - limit participants for performance
 * <VideoFeed maxParticipants={8} />
 * 
 * // Student view - hide local video
 * <VideoFeed showLocalVideo={false} />
 * 
 * // Presentation mode - only show remote participants
 * <VideoFeed showLocalVideo={false} maxParticipants={6} />
 */
