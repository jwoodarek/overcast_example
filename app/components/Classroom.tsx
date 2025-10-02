'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DailyProvider, useDaily, useParticipants, useLocalParticipant } from '@daily-co/daily-react';
import { DailyCall } from '@daily-co/daily-js';
import { AppUser, Classroom, ConnectionState } from '@/lib/types';
import { DAILY_CONFIG, UI_CONSTANTS } from '@/lib/constants';
import { getDailyRoomById } from '@/lib/daily-config';
import { 
  parseDailyError, 
  retryWithBackoff, 
  hasInstructorPermissions,
  getParticipantCountByRole,
  safelyLeaveCall 
} from '@/lib/daily-utils';
import InstructorControls from './InstructorControls';

interface ClassroomProps {
  classroomId: string;
  user: AppUser;
  onLeave: () => void;
}

interface ClassroomContentProps {
  classroomId: string;
  user: AppUser;
  onLeave: () => void;
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
 * Main classroom content component (inside DailyProvider)
 * Handles Daily.co integration and participant management
 */
function ClassroomContent({ classroomId, user, onLeave }: ClassroomContentProps) {
  const daily = useDaily();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  // Get classroom configuration
  const classroom = getDailyRoomById(classroomId);
  
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

  // Join the Daily room
  const joinRoom = useCallback(async () => {
    if (!daily) return;

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
      console.error('Failed to join Daily room:', err);
      
      // Use enhanced error parsing from daily-utils
      const parsedError = parseDailyError(err);
      setError(parsedError.message);
      setConnectionState('error');
    } finally {
      setIsJoining(false);
    }
  }, [daily, classroom.url, user.name, user.role, user.sessionId]);

  // Handle Daily events
  useEffect(() => {
    if (!daily) return;

    const handleJoinedMeeting = () => {
      setConnectionState('connected');
      setError(null);
      setIsJoining(false);
    };

    const handleLeftMeeting = () => {
      setConnectionState('disconnected');
    };

    const handleError = (event: any) => {
      console.error('Daily error:', event);
      setError(event.errorMsg || 'Connection error occurred');
      setConnectionState('error');
      setIsJoining(false);
    };

    const handleParticipantJoined = (event: any) => {
      console.log('Participant joined:', event.participant);
    };

    const handleParticipantLeft = (event: any) => {
      console.log('Participant left:', event.participant);
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
    // Use safe leave utility to ensure proper cleanup
    await safelyLeaveCall(daily);
    onLeave();
  }, [daily, onLeave]);

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
        participantCount={Object.keys(participants).length}
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

        {/* Connected State - Video Grid Placeholder */}
        {connectionState === 'connected' && !error && (
          <div className="h-full flex flex-col">
            {/* Main Video Area */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-teal-400 text-6xl mb-4">📹</div>
                <h2 className="text-2xl font-bold text-white mb-4">Video Feed Coming Soon</h2>
                <p className="text-gray-400 mb-4">
                  Connected to {classroom.name} with {Object.keys(participants).length} participants
                </p>
                <div className="text-sm text-gray-500">
                  <p>Local participant: {localParticipant?.user_name || 'Unknown'}</p>
                  <p>Audio: {localParticipant?.audio ? 'On' : 'Off'}</p>
                  <p>Video: {localParticipant?.video ? 'On' : 'Off'}</p>
                  <p className="mt-2">
                    Role: {user.role === 'instructor' ? '👨‍🏫 Instructor' : '👨‍🎓 Student'}
                  </p>
                </div>
              </div>
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
    </div>
  );
}

/**
 * Main Classroom component with DailyProvider wrapper
 * Provides Daily.co context to child components
 */
export default function Classroom({ classroomId, user, onLeave }: ClassroomProps) {
  const [dailyCall, setDailyCall] = useState<DailyCall | null>(null);

  // Initialize Daily call object
  useEffect(() => {
    const initializeDaily = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const Daily = (await import('@daily-co/daily-js')).default;
        
        const call = Daily.createCallObject({
          // Apply configuration from constants
          audioSource: true,
          videoSource: true,
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true,
            // Apply audio settings from config
            ...DAILY_CONFIG.audioSettings
          }
        });

        setDailyCall(call);
      } catch (error) {
        console.error('Failed to initialize Daily:', error);
      }
    };

    initializeDaily();

    // Cleanup
    return () => {
      if (dailyCall) {
        dailyCall.destroy();
      }
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
      />
    </DailyProvider>
  );
}
