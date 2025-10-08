'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DailyProvider, useDaily, useParticipantIds, useLocalParticipant } from '@daily-co/daily-react';
import { DailyCall } from '@daily-co/daily-js';
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
import VideoFeed from './VideoFeed';
import TranscriptMonitor from './TranscriptMonitor';

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
            Transcripts are temporary and session-only. You can deny this by clicking "No Thanks".
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
function ClassroomContent({ classroomId, user, onLeave, audioDeviceId, videoDeviceId }: ClassroomContentProps) {
  const daily = useDaily();
  const participantIds = useParticipantIds();
  const localParticipant = useLocalParticipant();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  // Transcription state
  // WHY separate state: Transcription is independent of video connection
  const [transcriptionActive, setTranscriptionActive] = useState(false);
  const [transcriptionSupported, setTranscriptionSupported] = useState(true);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showTranscriptionConsent, setShowTranscriptionConsent] = useState(false);

  // Get classroom configuration
  const classroom = getDailyRoomById(classroomId);
  
  console.log('[Classroom] Looking for classroom ID:', classroomId);
  console.log('[Classroom] Found config:', classroom);
  console.log('[Classroom] Using Daily room URL:', classroom?.url);

  // Join the Daily room
  const joinRoom = useCallback(async () => {
    if (!daily || !classroom) {
      console.error('[joinRoom] Daily object or classroom not available');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      setConnectionState('connecting');

      console.log('[joinRoom] Attempting to join room:', {
        url: classroom.url,
        userName: user.name,
        role: user.role,
        sessionId: user.sessionId
      });

      // Configure Daily call with user settings
      await daily.join({
        url: classroom.url,
        userName: user.name,
        userData: {
          role: user.role,
          sessionId: user.sessionId
        }
      });
      
      console.log('[joinRoom] Join request completed successfully');

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
      console.error('[joinRoom] Failed to join Daily room:', err);
      console.error('[joinRoom] Room URL that failed:', classroom.url);
      console.error('[joinRoom] Error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Use enhanced error parsing from daily-utils
      const parsedError = parseDailyError(err);
      console.error('[joinRoom] Parsed error:', parsedError);
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
      console.log('[Transcription] Not supported in this browser');
      return;
    }

    if (transcriptionActive) {
      console.log('[Transcription] Already active');
      return;
    }

    try {
      console.log('[Transcription] Starting capture for user:', user.name, user.role);
      if (audioDeviceId) {
        console.log('[Transcription] Using selected microphone:', audioDeviceId);
      }
      
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
      console.log('[Transcription] Successfully started');
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
      console.log('[Transcription] Stopping capture for session:', classroomId);
      await transcriptionService.stopCapture(`classroom-${classroomId}`);
      setTranscriptionActive(false);
      console.log('[Transcription] Successfully stopped');
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
      console.log('[Transcription] User accepted consent');
      await startTranscription();
    } else {
      console.log('[Transcription] User declined consent');
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
      console.warn('[Transcription] Not supported in this browser. Use Chrome, Edge, or Safari for transcription features.');
      setTranscriptionError('Transcription not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Handle Daily events
  useEffect(() => {
    if (!daily) return;

    const handleJoinedMeeting = () => {
      console.log('[Daily Event] Joined meeting successfully');
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
      console.log('[Daily Event] Left meeting');
      setConnectionState('disconnected');
    };

    const handleError = (event: unknown) => {
      const err = event as { errorMsg?: string };
      console.error('[Daily Event] Error occurred:', event);
      console.error('[Daily Event] Error message:', err.errorMsg);
      console.error('[Daily Event] Full error details:', JSON.stringify(event, null, 2));
      setError(err.errorMsg || 'Connection error occurred');
      setConnectionState('error');
      setIsJoining(false);
    };

    const handleParticipantJoined = (event: unknown) => {
      const evt = event as { participant?: unknown };
      console.log('[Daily Event] Participant joined:', evt.participant);
    };

    const handleParticipantLeft = (event: unknown) => {
      const evt = event as { participant?: unknown };
      console.log('[Daily Event] Participant left:', evt.participant);
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
  }, [daily, joinRoom]);

  // Handle leaving the classroom
  const handleLeave = useCallback(async () => {
    console.log('[Daily] Leaving classroom, destroying singleton...');
    
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
        console.log('[Daily] Singleton destroyed successfully');
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
    console.error('[Classroom] No configuration found for ID:', classroomId);
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

              {/* Instructor Controls - Only visible for instructors (T040: Role-based UI) */}
              {user.role === 'instructor' && localParticipant && hasInstructorPermissions(localParticipant) && (
                <div className="border-t border-gray-700 p-4 bg-gray-900">
                  <InstructorControls
                    instructor={user}
                    classroomId={classroomId}
                    enabled={true}
                  />
                </div>
              )}
            </div>

            {/* Transcript Monitor - Side Panel */}
            {transcriptionActive && (
              <div className="w-96 border-l border-gray-700 bg-gray-900 flex flex-col">
                <TranscriptMonitor 
                  sessionId={`classroom-${classroomId}`}
                  refreshInterval={2000}
                />
              </div>
            )}
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

      {/* Transcription Status Indicator */}
      {/* WHY show status: User should know if transcription is active */}
      {transcriptionActive && (
        <div className="fixed top-20 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Transcription Active</span>
          </div>
          <button
            onClick={async () => {
              console.log('[DEBUG] Manual transcription test');
              console.log('[DEBUG] transcriptionActive:', transcriptionActive);
              console.log('[DEBUG] transcriptionSupported:', transcriptionSupported);
              console.log('[DEBUG] classroomId:', classroomId);
              console.log('[DEBUG] user:', user);
              
              // Try to restart transcription
              await stopTranscription();
              setTimeout(async () => {
                await startTranscription();
              }, 500);
            }}
            className="mt-1 text-xs underline hover:text-white/80"
          >
            Restart Transcription
          </button>
        </div>
      )}

      {/* Transcription Error Indicator */}
      {/* WHY show errors: User needs to know if transcription failed */}
      {transcriptionError && !transcriptionActive && (
        <div className="fixed top-20 right-4 bg-yellow-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-40">
          <span className="text-sm">⚠️ {transcriptionError}</span>
        </div>
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
        console.log('[Daily] Checking for existing singleton...');
        
        // If singleton already exists and is valid, reuse it
        if (dailyCallSingleton) {
          console.log('[Daily] Reusing existing singleton instance');
          if (mounted) {
            callRef.current = dailyCallSingleton;
            setDailyCall(dailyCallSingleton);
          }
          return;
        }

        // If initialization is already in progress, wait for it
        if (initializationPromise) {
          console.log('[Daily] Waiting for ongoing initialization...');
          const call = await initializationPromise;
          if (mounted) {
            callRef.current = call;
            setDailyCall(call);
          }
          return;
        }

        // Start new initialization
        console.log('[Daily] Starting new initialization...');
        initializationPromise = (async () => {
          // Dynamic import to avoid SSR issues
          const Daily = (await import('@daily-co/daily-js')).default;
          
          console.log('[Daily] Creating call object...');
          const call = Daily.createCallObject({
            // Apply configuration from constants
            audioSource: true,
            videoSource: true
          });

          console.log('[Daily] Call object created successfully');
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
      console.log('[Daily] Component unmounting, clearing local ref');
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
