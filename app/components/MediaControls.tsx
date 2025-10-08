'use client';

import React, { useCallback } from 'react';
import { useDaily } from '@daily-co/daily-react';
import { useAtom } from 'jotai';
import { mediaControlStateAtom } from '@/lib/store/media-store';

interface MediaControlsProps {
  /** Whether the media controls are enabled */
  enabled?: boolean;
}

/**
 * MediaControls Component
 * 
 * Provides personal microphone and camera controls for any participant (instructor or student).
 * 
 * WHY separate from InstructorControls:
 * - Students need their own media controls too
 * - Media control logic is independent of instructor privileges
 * - Reusable across different user roles
 * 
 * Features:
 * - Toggle microphone on/off
 * - Toggle camera on/off
 * - Keyboard shortcuts (M for mic, C for camera)
 * - Optimistic UI updates for responsive feel
 * - Visual indication of current state (green=on, red=off)
 */
export default function MediaControls({ 
  enabled = true
}: MediaControlsProps) {
  // Daily React hooks for media control
  const daily = useDaily();
  
  // Media control state (mic/camera toggle)
  // WHY: Jotai atom provides optimistic UI updates while Daily.co API processes (<200ms)
  const [mediaState, setMediaState] = useAtom(mediaControlStateAtom);
  
  // Component state
  const [error, setError] = React.useState<string | null>(null);

  /**
   * Toggle microphone on/off
   * 
   * WHY optimistic UI updates:
   * - Sets pending state immediately for responsive feel (<200ms perceived)
   * - Updates enabled state on success
   * - Reverts on failure with error message
   * 
   * WHY Daily.co setLocalAudio:
   * - Controls local audio track (not remote participants)
   * - Operates on local media device, typically completes in 50-150ms
   * - More reliable than browser MediaStream API directly
   */
  const toggleMicrophone = useCallback(async () => {
    if (!daily || !enabled) return;
    
    // Optimistic UI - show pending immediately
    setMediaState(prev => ({ ...prev, microphonePending: true }));
    
    try {
      const newState = !mediaState.microphoneEnabled;
      await daily.setLocalAudio(newState);
      
      // Success - update enabled state
      setMediaState(prev => ({
        ...prev,
        microphoneEnabled: newState,
        microphonePending: false,
      }));
    } catch (err) {
      // Failure - revert pending state and show error
      setMediaState(prev => ({ ...prev, microphonePending: false }));
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to toggle microphone: ${errorMessage}`);
      console.error('Failed to toggle microphone:', err);
    }
  }, [daily, enabled, mediaState.microphoneEnabled, setMediaState]);

  /**
   * Toggle camera on/off
   * 
   * WHY separate from microphone:
   * - Independent controls (can have mic on with camera off, or vice versa)
   * - Different failure modes (camera might be in use by another app)
   * - Different visual indicators needed
   * 
   * WHY Daily.co setLocalVideo:
   * - Controls local video track
   * - Handles browser permissions and device access
   * - Consistent with Daily.co best practices
   */
  const toggleCamera = useCallback(async () => {
    if (!daily || !enabled) return;
    
    // Optimistic UI - show pending immediately
    setMediaState(prev => ({ ...prev, cameraPending: true }));
    
    try {
      const newState = !mediaState.cameraEnabled;
      await daily.setLocalVideo(newState);
      
      // Success - update enabled state
      setMediaState(prev => ({
        ...prev,
        cameraEnabled: newState,
        cameraPending: false,
      }));
    } catch (err) {
      // Failure - revert pending state and show error
      setMediaState(prev => ({ ...prev, cameraPending: false }));
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to toggle camera: ${errorMessage}`);
      console.error('Failed to toggle camera:', err);
    }
  }, [daily, enabled, mediaState.cameraEnabled, setMediaState]);

  /**
   * Keyboard shortcuts for media controls (M = microphone, C = camera)
   * 
   * WHY keyboard shortcuts:
   * - Faster than clicking for experienced users
   * - Accessibility improvement for keyboard navigation
   * - Industry standard (Zoom, Teams use similar shortcuts)
   * 
   * WHY filter text inputs:
   * - Prevent shortcuts from triggering while user types in chat or forms
   * - Students might type 'M' or 'C' in messages - shouldn't affect media
   * - Common UX pattern (keyboard shortcuts disabled in text fields)
   * 
   * WHY check tagName and isContentEditable:
   * - INPUT/TEXTAREA/SELECT are standard HTML form elements
   * - isContentEditable catches rich text editors and contenteditable divs
   * - Covers all common text entry scenarios
   * 
   * WHY window listener instead of component:
   * - Global shortcuts work regardless of focus location
   * - User can toggle media from anywhere in UI
   * - More accessible than requiring focus on specific elements
   */
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if user is typing in a text input
      // WHY: We don't want shortcuts to fire when typing 'M' or 'C' in chat
      const target = event.target as HTMLElement;
      const isTextInput = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      
      if (isTextInput) {
        // User is typing - don't trigger shortcuts
        return;
      }
      
      // Handle shortcuts (case-insensitive)
      const key = event.key.toLowerCase();
      
      if (key === 'm') {
        event.preventDefault(); // Prevent default browser behavior
        toggleMicrophone();
      } else if (key === 'c') {
        event.preventDefault();
        toggleCamera();
      }
    };
    
    // Register global keyboard listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup: Remove listener when component unmounts
    // WHY: Prevents memory leaks and stale closures
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleMicrophone, toggleCamera]); // Re-register if toggle functions change

  return (
    <div className="space-y-2">
      <h4 className="text-md font-medium text-gray-200">My Media Controls</h4>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-2 text-red-400 text-sm">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Media Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={toggleMicrophone}
          disabled={!enabled || mediaState.microphonePending || !daily}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            mediaState.microphoneEnabled
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } disabled:bg-gray-700 disabled:text-gray-400 text-white`}
          aria-keyshortcuts="m"
          aria-label={`${mediaState.microphoneEnabled ? 'Mute' : 'Unmute'} microphone (press M)`}
        >
          {mediaState.microphonePending ? (
            'Processing...'
          ) : mediaState.microphoneEnabled ? (
            '🎤 Mic On'
          ) : (
            '🎤 Mic Off'
          )}
        </button>
        <button
          onClick={toggleCamera}
          disabled={!enabled || mediaState.cameraPending || !daily}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            mediaState.cameraEnabled
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } disabled:bg-gray-700 disabled:text-gray-400 text-white`}
          aria-keyshortcuts="c"
          aria-label={`${mediaState.cameraEnabled ? 'Disable' : 'Enable'} camera (press C)`}
        >
          {mediaState.cameraPending ? (
            'Processing...'
          ) : mediaState.cameraEnabled ? (
            '📹 Camera On'
          ) : (
            '📹 Camera Off'
          )}
        </button>
      </div>

      <div className="text-xs text-gray-400 italic">
        Press M for mic, C for camera
      </div>
    </div>
  );
}

