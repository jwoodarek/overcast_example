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
import { useAtom, useAtomValue } from 'jotai';
import { 
  layoutConfigAtom, 
  screenShareActiveAtom, 
  effectiveLayoutModeAtom,
  calculateGridDimensions 
} from '@/lib/store/layout-store';

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

  // Layout management
  // WHY: Allows instructors to customize video arrangement (Grid vs Spotlight)
  const [layoutConfig, setLayoutConfig] = useAtom(layoutConfigAtom);
  const [, setScreenShareActive] = useAtom(screenShareActiveAtom);
  const effectiveMode = useAtomValue(effectiveLayoutModeAtom);

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

  // Sync screen share state to layout store
  // WHY: Layout store needs to know about screen share for auto-layout adaptation
  React.useEffect(() => {
    setScreenShareActive(isScreenSharing);
  }, [isScreenSharing, setScreenShareActive]);

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
   * Render screen share layout (auto-adapts when screen sharing is active)
   * WHY: Screen content needs 75% of width, participant faces need 25%
   * Similar to Spotlight but with screen share taking the main area
   */
  const renderScreenShareLayout = () => {
    if (!isScreenSharing || !screenShareParticipant) return null;

    // Find the participant who is sharing to get their name
    const sharingParticipant = participants.find(p => p.session_id === screenShareParticipant.session_id);
    const sharerName = sharingParticipant?.user_name || 'Someone';

    // Get all participants for sidebar (including local if shown)
    const allParticipants = [
      ...(showLocalVideo && localParticipant ? [localParticipant] : []),
      ...displayParticipants,
    ];

    return (
      <div className="flex gap-4">
        {/* Screen share main area (75% width) - WHY: Content visibility is priority */}
        <div className="flex-[3] min-w-0">
          <div className="relative rounded-lg overflow-hidden bg-gray-900 border-2 border-yellow-400">
            <DailyVideo 
              sessionId={screenShareParticipant.session_id}
              type="screenVideo"
              className="w-full min-h-[400px] md:min-h-[600px] object-contain bg-black"
            />
            
            <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 rounded text-sm font-medium">
              📺 {sharerName} is sharing their screen
            </div>
          </div>
        </div>

        {/* Participant sidebar (25% width) - WHY: Keep faces visible during screen share */}
        {allParticipants.length > 0 && (
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {allParticipants.map((participant) => (
              <div key={participant.session_id} className="aspect-video">
                {renderParticipantVideo(participant, participant.local)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Calculate total participants for count indicator
  const totalParticipants = displayParticipants.length + (showLocalVideo && localParticipant ? 1 : 0);

  /**
   * Handle layout preset change
   * WHY: Instructor can switch between Grid (equal tiles) and Spotlight (active speaker focus)
   */
  const handlePresetChange = (preset: 'grid' | 'spotlight') => {
    setLayoutConfig(prev => ({
      ...prev,
      preset,
      // Reset custom tile sizes when switching presets
      tileSizes: new Map(),
      gridColumns: undefined,
      spotlightParticipantId: undefined,
    }));
  };

  /**
   * Detect active speaker from participant list
   * WHY: Spotlight mode needs to know who to highlight
   * Logic: Use spotlightParticipantId override, or detect based on audio state
   * Fallback: First participant with audio enabled, or first participant
   */
  const detectActiveSpeaker = (participants: DailyParticipant[]): DailyParticipant | null => {
    if (participants.length === 0) return null;
    
    // Use override if set
    if (layoutConfig.spotlightParticipantId) {
      const override = participants.find(p => p.session_id === layoutConfig.spotlightParticipantId);
      if (override) return override;
    }
    
    // Find first participant with audio enabled (likely speaking)
    const speaking = participants.find(p => p.audio === true);
    if (speaking) return speaking;
    
    // Fallback: First participant
    return participants[0];
  };

  /**
   * Render Grid layout
   * WHY: Equal-sized tiles arranged in optimal rows/columns
   * Algorithm: cols = ceil(sqrt(participantCount)), rows = ceil(participantCount / cols)
   */
  const renderGridLayout = () => {
    const allToDisplay = [
      ...(showLocalVideo && localParticipant ? [localParticipant] : []),
      ...displayParticipants,
    ];

    if (allToDisplay.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📹</div>
          <p>No video feeds available</p>
          <p className="text-sm">Participants will appear here when they join</p>
        </div>
      );
    }

    // Calculate optimal grid dimensions using layout store helper
    // WHY: Square-ish grids are most visually comfortable (cols ~= rows)
    const { cols } = calculateGridDimensions(allToDisplay.length);
    const columns = layoutConfig.gridColumns ?? cols; // Use override if set

    return (
      <div 
        className="grid gap-2 md:gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridAutoRows: 'minmax(160px, auto)', // Min height 160px (from research.md)
        }}
      >
        {allToDisplay.map((participant) => 
          renderParticipantVideo(participant, participant.local)
        )}
      </div>
    );
  };

  /**
   * Render Spotlight layout
   * WHY: Focuses on active speaker with large tile (75% width) + sidebar for others (25%)
   * Use case: Lecture-style teaching where instructor speaks most of the time
   */
  const renderSpotlightLayout = () => {
    const allToDisplay = [
      ...(showLocalVideo && localParticipant ? [localParticipant] : []),
      ...displayParticipants,
    ];

    if (allToDisplay.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📹</div>
          <p>No video feeds available</p>
          <p className="text-sm">Participants will appear here when they join</p>
        </div>
      );
    }

    // Single participant: Show full-width
    if (allToDisplay.length === 1) {
      return (
        <div className="w-full">
          {renderParticipantVideo(allToDisplay[0], allToDisplay[0].local)}
        </div>
      );
    }

    // Detect active speaker for spotlight
    const activeSpeaker = detectActiveSpeaker(allToDisplay);
    const sidebarParticipants = allToDisplay.filter(p => p.session_id !== activeSpeaker?.session_id);

    return (
      <div className="flex gap-4">
        {/* Main spotlight tile (75% width) - WHY: Active speaker gets most attention */}
        <div className="flex-[3] min-w-0">
          {activeSpeaker && renderParticipantVideo(activeSpeaker, activeSpeaker.local)}
        </div>

        {/* Sidebar tiles (25% width) - WHY: Other participants remain visible but smaller */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {sidebarParticipants.map((participant) => (
            <div key={participant.session_id} className="aspect-video">
              {renderParticipantVideo(participant, participant.local)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render layout preset selector
   * WHY: Provides quick access to switch between layout modes
   * Only shown when not screen sharing (screen share has fixed layout)
   */
  const renderPresetSelector = () => {
    // Don't show selector during screen share (layout is fixed)
    if (effectiveMode === 'screen-share') return null;
    
    return (
      <div className="mb-4 flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg p-3" role="group" aria-label="Video layout controls">
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <span className="font-medium">Layout:</span>
        </div>
        <div className="flex space-x-2" role="radiogroup" aria-label="Layout preset selection">
          <button
            onClick={() => handlePresetChange('grid')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition-colors ${
              layoutConfig.preset === 'grid'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Grid layout - equal-sized tiles"
            role="radio"
            aria-checked={layoutConfig.preset === 'grid'}
            aria-label="Grid layout preset"
          >
            📊 Grid
          </button>
          <button
            onClick={() => handlePresetChange('spotlight')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition-colors ${
              layoutConfig.preset === 'spotlight'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Spotlight layout - large active speaker with sidebar"
            role="radio"
            aria-checked={layoutConfig.preset === 'spotlight'}
            aria-label="Spotlight layout preset"
          >
            🎯 Spotlight
          </button>
          {layoutConfig.preset === 'custom' && (
            <button
              onClick={() => handlePresetChange('grid')}
              className="px-4 py-2 rounded text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title="Reset custom layout"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render main layout based on effective mode
   * WHY: Central router for all layout types
   * Modes: screen-share (auto), grid, spotlight, custom (future: drag-resize)
   */
  const renderMainContent = () => {
    // Screen share takes absolute priority
    if (effectiveMode === 'screen-share') {
      return renderScreenShareLayout();
    }

    // Route to appropriate preset layout
    switch (layoutConfig.preset) {
      case 'spotlight':
        return renderSpotlightLayout();
      case 'grid':
      case 'custom': // Custom uses grid as base (future: apply custom tile sizes)
      default:
        return renderGridLayout();
    }
  };

  return (
    <div className={`video-feed ${className}`}>
      {/* Layout Preset Selector - WHY: Instructors can choose Grid or Spotlight mode */}
      {renderPresetSelector()}

      {/* Main video content - routes to appropriate layout */}
      {renderMainContent()}

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
