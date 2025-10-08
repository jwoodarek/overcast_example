'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DailyProvider, useDaily, useParticipantIds, useLocalParticipant } from '@daily-co/daily-react';
import { DailyCall } from '@daily-co/daily-js';
import { useSetAtom } from 'jotai';
import { AppUser, ConnectionState, type Classroom } from '@/lib/types';
import { UI_CONSTANTS } from '@/lib/constants';
import { getDailyRoomById } from '@/lib/daily-config';
import { 
  parseDailyError, 
  hasInstructorPermissions,
  safelyLeaveCall 
} from '@/lib/daily-utils';
import { transcriptionService } from '@/lib/services/transcription-service';
import InstructorControls from './InstructorControls';
import MediaControls from './MediaControls';
import VideoFeed from './VideoFeed';
import TranscriptMonitor from './TranscriptMonitor';
import ChatPanel from './ChatPanel';
import BreakoutModal from './BreakoutModal';
// Import store atoms for cleanup (T051)
import { mediaControlStateAtom } from '@/lib/store/media-store';
import { activeRoomAtom, unreadCountsAtom } from '@/lib/store/chat-store';
import { breakoutRoomsAtom } from '@/lib/store/breakout-store';
import { layoutConfigAtom, screenShareActiveAtom } from '@/lib/store/layout-store';

// Module-level singleton to prevent duplicate Daily instances
// WHY: React strict mode causes effects to run twice, which creates duplicate Daily iframes
// This singleton ensures only one instance exists at a time across all component mounts
let dailyCallSingleton: DailyCall | null = null;
let initializationPromise: Promise<DailyCall> | null = null;

interface ClassroomProps {
  classroomId: string;
  user: AppUser;
  onLeave: () => void;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

interface ClassroomContentProps {
  classroomId: string;
  user: AppUser;
  onLeave: () => void;
  audioDeviceId?: string;
  videoDeviceId?: string;
}

/**
 * Connection status indicator component
 */
function ConnectionStatus({ connectionState }: { connectionState: ConnectionState }) {
  const statusConfig = {
    connecting: { color: 'text-yellow-400', text: 'Connecting...', icon: '⏳' },
    connected: { color: 'text-teal-400', text: 'Connected', icon: '✓' },
    disconnected: { color: 'text-red-400', text: 'Disconnected', icon: '✗' },
    error: { color: 'text-red-400', text: 'Connection Error', icon: '⚠' }
  };

  const config = statusConfig[connectionState];

  return (
    <div className={`flex items-center space-x-2 ${config.color}`}>
      <span>{config.icon}</span>
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}

/**
 * Classroom header with title, participant count, and controls
 */
function ClassroomHeader({ 
  classroom, 
  participantCount, 
  connectionState, 
  user, 
  onLeave 
}: {
  classroom: Classroom;
  participantCount: number;
  connectionState: ConnectionState;
  user: AppUser;
  onLeave: () => void;
}) {
  return (
    <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">{classroom.name}</h1>
          <div className="text-gray-400">
            <span className="text-sm">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ConnectionStatus connectionState={connectionState} />
          
          <div className="text-gray-400 text-sm">
            {user.name} ({user.role})
          </div>

          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Leave Classroom
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading overlay component
 */
function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-white text-lg mb-2">{message}</p>
        <p className="text-gray-400 text-sm">Please wait...</p>
      </div>
    </div>
  );
}

/**
 * Error display component
 */
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-red-400 text-6xl mb-4">⚠</div>
        <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * FERPA Compliance Notification
 * 
 * WHY this notification:
 * - FERPA requires informed consent for recording educational content
 * - Students must know their speech is being captured
 * - Provides transparency about data usage
 * - Allows opt-out (user can deny microphone permissions)
 * 
 * WHY opt-in approach:
 * - Respects user privacy and educational regulations
 * - Clear about what data is captured and why
 * - Explains benefits (help detection, quiz generation)
 */
function TranscriptionConsentNotification({ 
  onAccept, 
  onDecline,
  show 
}: { 
  onAccept: () => void;
  onDecline: () => void;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-gray-800 border border-teal-500/30 rounded-lg p-4 shadow-xl z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-2xl">🎤</div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">
            Enable Transcription?
          </h3>
          <p className="text-gray-300 text-sm mb-3">
            This classroom uses speech transcription to enable intelligent features like 
            help detection and quiz generation. Your speech will be converted to text and 
            used only during this session.
          </p>
          <p className="text-gray-400 text-xs mb-3">
            By accepting, you consent to having your spoken words transcribed. 
            Transcripts are temporary and session-only. You can deny this by clicking &ldquo;No Thanks&rdquo;.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onAccept}
              className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium transition-colors"
            >
              Enable Transcription
            </button>
            <button
              onClick={onDecline}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
            >
              No Thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main classroom content component (inside DailyProvider)
 * Handles Daily.co integration and participant management
 */
function ClassroomContent({ classroomId, user, onLeave, audioDeviceId }: ClassroomContentProps) {
  const daily = useDaily();
  const participantIds = useParticipantIds();
  const localParticipant = useLocalParticipant();
  
  // Atom setters for cleanup (T051)
  // WHY: Need to reset all feature atoms when leaving classroom to prevent stale data
  const setMediaControlState = useSetAtom(mediaControlStateAtom);
  const setActiveRoom = useSetAtom(activeRoomAtom);
  const setUnreadCounts = useSetAtom(unreadCountsAtom);
  const setBreakoutRooms = useSetAtom(breakoutRoomsAtom);
  const setLayoutConfig = useSetAtom(layoutConfigAtom);
  const setScreenShareActive = useSetAtom(screenShareActiveAtom);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  // Transcription state
  // WHY separate state: Transcription is independent of video connection
  const [transcriptionActive, setTranscriptionActive] = useState(false);
  const [transcriptionSupported, setTranscriptionSupported] = useState(true);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showTranscriptionConsent, setShowTranscriptionConsent] = useState(false);

  // Breakout modal state
  // WHY managed at Classroom level: Modal needs access to participant list from Daily
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);

  // Get full participant list for breakout modal
  // WHY: BreakoutModal needs DailyParticipant objects, not just IDs
  const allParticipants = React.useMemo(() => {
    if (!daily) return [];
    const participants = daily.participants();
    return Object.values(participants);
  }, [daily]); // Update when daily changes

  // Filter out instructors for breakout assignment
  // WHY: Only students should be assigned to breakout rooms
  const studentParticipants = React.useMemo(() => {
    return allParticipants.filter(p => {
      // Exclude local participant (instructor) and other instructors
      const isInstructor = p.local || p.permissions?.hasPresence;
      return !isInstructor;
    });
  }, [allParticipants]);

  // Get classroom configuration
  const classroom = getDailyRoomById(classroomId);

  // Join the Daily room
  const joinRoom = useCallback(async () => {
    if (!daily || !classroom) {
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      setConnectionState('connecting');

      // Configure Daily call with user settings
      await daily.join({
        url: classroom.url,
        userName: user.name,
        userData: {
          role: user.role,
          sessionId: user.sessionId
        }
      });

      // Apply audio/video settings from config
      await daily.setLocalAudio(true);
      await daily.setLocalVideo(true);
      
      // Apply Daily configuration
      await daily.updateInputSettings({
        audio: {
          processor: {
            type: 'none' // Let Daily handle audio processing
          }
        }
      });

    } catch (err) {
      // Use enhanced error parsing from daily-utils
      const parsedError = parseDailyError(err);
      console.error('[joinRoom] Failed to join Daily room:', parsedError.message);
      setError(parsedError.message);
      setConnectionState('error');
    } finally {
      setIsJoining(false);
    }
  }, [daily, classroom, user.name, user.role, user.sessionId]);

  /**
   * Start transcript capture for this user
   * 
   * WHY role assignment:
   * - Role from user object determines if speech is used for quiz generation
   * - Instructor transcripts → quiz questions
   * - Student transcripts → help detection only
   * 
   * WHY breakoutRoomName null for main classroom:
   * - Main classroom sessions don't have breakout room name
   * - Breakout rooms will pass their name when this is extended
   */
  const startTranscription = useCallback(async () => {
    if (!transcriptionSupported) {
      return;
    }

    if (transcriptionActive) {
      return;
    }

    try {
      await transcriptionService.startCapture(
        `classroom-${classroomId}`, // Session ID with classroom prefix
        user.sessionId, // Speaker ID is user's session ID
        user.name,
        user.role,
        null, // Main classroom (no breakout room name)
        audioDeviceId // Selected microphone device ID
      );

      setTranscriptionActive(true);
      setTranscriptionError(null);
    } catch (err) {
      console.error('[Transcription] Failed to start:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start transcription';
      setTranscriptionError(errorMessage);
      
      // Show user-friendly message
      if (errorMessage.includes('not supported')) {
        setTranscriptionSupported(false);
      } else if (errorMessage.includes('permission') || errorMessage.includes('not-allowed')) {
        setTranscriptionError('Microphone permission denied. Transcription disabled.');
      }
    }
  }, [classroomId, user.sessionId, user.name, user.role, transcriptionSupported, transcriptionActive, audioDeviceId]);

  /**
   * Stop transcript capture
   * 
   * WHY cleanup important:
   * - Prevents memory leaks
   * - Stops microphone usage
   * - Cleans up browser speech recognition resources
   */
  const stopTranscription = useCallback(async () => {
    if (!transcriptionActive) {
      return;
    }

    try {
      await transcriptionService.stopCapture(`classroom-${classroomId}`);
      setTranscriptionActive(false);
    } catch (err) {
      console.error('[Transcription] Failed to stop:', err);
    }
  }, [classroomId, transcriptionActive]);

  /**
   * Handle user's transcription consent response
   * 
   * WHY FERPA compliance:
   * - Educational settings require informed consent for recording
   * - User must explicitly agree to transcription
   * - Can opt-out by declining or denying microphone permissions
   */
  const handleTranscriptionConsent = useCallback(async (accepted: boolean) => {
    setShowTranscriptionConsent(false);

    if (accepted) {
      await startTranscription();
    } else {
      setTranscriptionError('Transcription disabled (user declined)');
    }
  }, [startTranscription]);

  /**
   * Check transcription support on mount
   * 
   * WHY check support:
   * - Web Speech API not available in all browsers
   * - Firefox doesn't support it yet
   * - Safari and Chrome have good support
   */
  useEffect(() => {
    const supported = transcriptionService.isSupported();
    setTranscriptionSupported(supported);
    
    if (!supported) {
      setTranscriptionError('Transcription not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Handle Daily events
  useEffect(() => {
    if (!daily) return;

    const handleJoinedMeeting = () => {
      setConnectionState('connected');
      setError(null);
      setIsJoining(false);

      // Show transcription consent notification after successfully joining
      // WHY after join: User needs to be in classroom first to understand context
      // WHY delay: Give user a moment to see they've connected successfully
      if (transcriptionSupported) {
        setTimeout(() => {
          setShowTranscriptionConsent(true);
        }, 2000); // 2 second delay so user isn't overwhelmed
      }
    };

    const handleLeftMeeting = () => {
      setConnectionState('disconnected');
    };

    const handleError = (event: unknown) => {
      const err = event as { errorMsg?: string };
      console.error('[Daily Event] Error occurred:', err.errorMsg || 'Connection error');
      setError(err.errorMsg || 'Connection error occurred');
      setConnectionState('error');
      setIsJoining(false);
    };

    const handleParticipantJoined = (_event: unknown) => {
      // Participant joined - handled by useParticipants hook
    };

    const handleParticipantLeft = (_event: unknown) => {
      // Participant left - handled by useParticipants hook
    };

    // Subscribe to Daily events
    daily.on('joined-meeting', handleJoinedMeeting);
    daily.on('left-meeting', handleLeftMeeting);
    daily.on('error', handleError);
    daily.on('participant-joined', handleParticipantJoined);
    daily.on('participant-left', handleParticipantLeft);

    // Join the room
    joinRoom();

    // Cleanup
    return () => {
      daily.off('joined-meeting', handleJoinedMeeting);
      daily.off('left-meeting', handleLeftMeeting);
      daily.off('error', handleError);
      daily.off('participant-joined', handleParticipantJoined);
      daily.off('participant-left', handleParticipantLeft);
    };
  }, [daily, joinRoom, transcriptionSupported]);

  /**
   * Cleanup all feature atoms on component unmount (T051)
   * 
   * WHY reset atoms:
   * - Prevents stale data from persisting across classroom sessions
   * - Ensures clean state when user re-enters a classroom
   * - Avoids memory leaks from accumulated chat messages, transcripts, etc.
   * 
   * WHEN this runs:
   * - When user clicks "Leave Classroom"
   * - When component unmounts for any reason
   * - When browser closes/navigates away
   * 
   * WHAT gets reset:
   * - Media control state (mic/camera)
   * - Chat messages and active room
   * - Breakout room configurations
   * - Layout preferences
   * - Screen share state
   */
  useEffect(() => {
    return () => {
      // Reset all feature atoms to initial state
      setMediaControlState({
        microphoneEnabled: false,
        cameraEnabled: false,
        microphonePending: false,
        cameraPending: false,
      });
      setActiveRoom('main');
      setUnreadCounts({});
      setBreakoutRooms([]);
      setLayoutConfig({ preset: 'grid', tileSizes: new Map() });
      setScreenShareActive(false);
    };
  }, [
    setMediaControlState,
    setActiveRoom,
    setUnreadCounts,
    setBreakoutRooms,
    setLayoutConfig,
    setScreenShareActive,
  ]);

  // Handle leaving the classroom
  const handleLeave = useCallback(async () => {
    // Stop transcription before leaving
    // WHY before leaving: Ensures cleanup happens before component unmounts
    // WHY important: Prevents memory leaks and stops microphone usage
    await stopTranscription();
    
    // Use safe leave utility to ensure proper cleanup
    await safelyLeaveCall(daily);
    
    // Destroy the singleton instance
    if (dailyCallSingleton) {
      try {
        dailyCallSingleton.destroy();
      } catch (e) {
        console.error('[Daily] Error destroying singleton:', e);
      }
      dailyCallSingleton = null;
      initializationPromise = null;
    }
    
    onLeave();
  }, [daily, onLeave, stopTranscription]);

  // Early return if classroom not found (after all hooks)
  if (!classroom) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Classroom Not Found</h2>
          <p className="text-gray-400 mb-6">The requested classroom could not be found.</p>
          <button
            onClick={onLeave}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Convert classroom config to Classroom interface
  const classroomData: Classroom = {
    id: classroom.id,
    name: classroom.name,
    dailyRoomUrl: classroom.url,
    maxCapacity: classroom.capacity
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <ClassroomHeader
        classroom={classroomData}
        participantCount={participantIds.length}
        connectionState={connectionState}
        user={user}
        onLeave={handleLeave}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {/* Loading State */}
        {isJoining && (
          <LoadingOverlay message={UI_CONSTANTS.loadingMessages[0]} />
        )}

        {/* Error State */}
        {error && connectionState === 'error' && (
          <ErrorDisplay error={error} onRetry={joinRoom} />
        )}

        {/* Connected State - Video Grid */}
        {connectionState === 'connected' && !error && (
          <div className="h-full flex">
            {/* Main Video Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-4 overflow-auto bg-gray-950">
                <VideoFeed 
                  showLocalVideo={true}
                  showRemoteParticipants={true}
                  maxParticipants={12}
                  className="h-full"
                />
              </div>

              {/* Media Controls - Available to all participants (students and instructors) */}
              {/* NOTE: Keyboard shortcuts (M/C) are implemented within MediaControls
                  with window-level listeners and proper cleanup on unmount. They filter text inputs
                  and work globally across the classroom interface. */}
              <div className="border-t border-gray-700 p-4 bg-gray-900">
                <MediaControls enabled={true} />
              </div>

              {/* Instructor Controls - Only visible for instructors (T040: Role-based UI) */}
              {user.role === 'instructor' && localParticipant && hasInstructorPermissions(localParticipant) && (
                <div className="border-t border-gray-700 p-4 bg-gray-900">
                  <InstructorControls
                    instructor={user}
                    classroomId={classroomId}
                    enabled={true}
                    onOpenBreakoutModal={() => setShowBreakoutModal(true)}
                  />
                </div>
              )}
            </div>

            {/* Right Side Panel - Chat and optional Transcript Monitor */}
            <div className="w-96 border-l border-gray-700 bg-gray-900 flex flex-col">
              {/* Transcript Monitor - Only shown when transcription is active */}
              {/* WHY max-h-64: Constrains transcript to reasonable size, prevents pushing chat off screen */}
              {transcriptionActive && (
                <div className="max-h-64 min-h-0 border-b border-gray-700 overflow-hidden">
                  <TranscriptMonitor 
                    sessionId={`classroom-${classroomId}`}
                  />
                </div>
              )}
              
              {/* Chat Panel - Available to all participants */}
              {/* WHY flex-1: Takes remaining space, ensures chat is always visible and usable */}
              <div className="flex-1 min-h-0 p-4">
                <ChatPanel
                  sessionId={user.sessionId}
                  userName={user.name}
                  userRole={user.role}
                  classroomId={classroomId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Disconnected State */}
        {connectionState === 'disconnected' && !isJoining && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">🔌</div>
              <h2 className="text-2xl font-bold text-white mb-4">Disconnected</h2>
              <p className="text-gray-400 mb-6">You have been disconnected from the classroom.</p>
              <div className="space-x-4">
                <button
                  onClick={joinRoom}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                >
                  Reconnect
                </button>
                <button
                  onClick={handleLeave}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Consent Notification */}
      <TranscriptionConsentNotification
        show={showTranscriptionConsent}
        onAccept={() => handleTranscriptionConsent(true)}
        onDecline={() => handleTranscriptionConsent(false)}
      />

      {/* Transcription Error Indicator */}
      {/* WHY show errors: User needs to know if transcription failed */}
      {transcriptionError && !transcriptionActive && (
        <div className="fixed top-20 right-4 bg-yellow-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-40">
          <span className="text-sm">⚠️ {transcriptionError}</span>
        </div>
      )}

      {/* Breakout Modal - Managed at Classroom level (T049) */}
      {/* WHY at this level: Needs access to participant list from Daily */}
      {user.role === 'instructor' && (
        <BreakoutModal
          isOpen={showBreakoutModal}
          onClose={() => setShowBreakoutModal(false)}
          participants={studentParticipants}
          sessionId={classroomId}
        />
      )}
    </div>
  );
}

/**
 * Main Classroom component with DailyProvider wrapper
 * Provides Daily.co context to child components
 */
export default function Classroom({ classroomId, user, onLeave, audioDeviceId, videoDeviceId }: ClassroomProps) {
  const [dailyCall, setDailyCall] = useState<DailyCall | null>(null);
  const callRef = React.useRef<DailyCall | null>(null);

  // Initialize Daily call object using module-level singleton
  useEffect(() => {
    let mounted = true;

    const initializeDaily = async () => {
      try {
        // If singleton already exists and is valid, reuse it
        if (dailyCallSingleton) {
          if (mounted) {
            callRef.current = dailyCallSingleton;
            setDailyCall(dailyCallSingleton);
          }
          return;
        }

        // If initialization is already in progress, wait for it
        if (initializationPromise) {
          const call = await initializationPromise;
          if (mounted) {
            callRef.current = call;
            setDailyCall(call);
          }
          return;
        }

        // Start new initialization
        initializationPromise = (async () => {
          // Dynamic import to avoid SSR issues
          const Daily = (await import('@daily-co/daily-js')).default;
          
          const call = Daily.createCallObject({
            // Apply configuration from constants
            audioSource: true,
            videoSource: true
          });

          dailyCallSingleton = call;
          return call;
        })();

        const call = await initializationPromise;
        
        // Only set state if component is still mounted
        if (mounted) {
          callRef.current = call;
          setDailyCall(call);
        }
      } catch (error) {
        console.error('[Daily] Failed to initialize:', error);
        initializationPromise = null;
      }
    };

    initializeDaily();

    // Cleanup function - don't destroy singleton, just clear local ref
    return () => {
      mounted = false;
      callRef.current = null;
      // Note: We DON'T destroy the singleton here because other components might be using it
      // The singleton will be destroyed when the user leaves the classroom page
    };
  }, []);

  // Show loading while Daily initializes
  if (!dailyCall) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <LoadingOverlay message="Initializing video system..." />
      </div>
    );
  }

  return (
    <DailyProvider callObject={dailyCall}>
      <ClassroomContent 
        classroomId={classroomId} 
        user={user} 
        onLeave={onLeave}
        audioDeviceId={audioDeviceId}
        videoDeviceId={videoDeviceId}
      />
    </DailyProvider>
  );
}
