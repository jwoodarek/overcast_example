/**
 * Media Control Store
 * 
 * Manages instructor's local media device states (microphone and camera).
 * 
 * WHY separate store for media controls:
 * - Media state is instructor-specific, not classroom-wide
 * - Optimistic UI updates needed for responsive feel (<200ms)
 * - Pending states allow showing loading indicators during toggles
 * - Independent from Daily.co state to enable offline development/testing
 * 
 * WHY pending states:
 * - Media operations can take 50-200ms to complete
 * - Users perceive <100ms as instant, >300ms as sluggish
 * - Optimistic updates (immediate UI feedback) improve perceived performance
 * - If operation fails, we can revert and show error
 * 
 * State lifecycle:
 * 1. User clicks mic/camera button or presses M/C keyboard shortcut
 * 2. Immediately set pending: true (button shows loading state)
 * 3. Call Daily.co API (setLocalAudio/setLocalVideo)
 * 4. On success: update enabled state, set pending: false
 * 5. On failure: revert, set pending: false, show error toast
 * 
 * Memory footprint: ~40 bytes per instructor (negligible)
 */

import { atom } from 'jotai';

/**
 * Media control state for instructor's local devices
 * 
 * All states default to false (devices off) for privacy-by-default.
 */
export interface MediaControlState {
  /** Whether instructor's microphone is currently enabled */
  microphoneEnabled: boolean;
  
  /** Whether instructor's camera is currently enabled */
  cameraEnabled: boolean;
  
  /** Loading state while microphone is being toggled (for UI spinner/disabled button) */
  microphonePending: boolean;
  
  /** Loading state while camera is being toggled (for UI spinner/disabled button) */
  cameraPending: boolean;
}

/**
 * Jotai atom for media control state
 * 
 * WHY atom instead of class-based store:
 * - Integrates seamlessly with React components (useAtom hook)
 * - Automatic re-renders when state changes (reactive)
 * - Type-safe with TypeScript
 * - Testable (can set state directly in tests)
 * - Follows established Jotai pattern in codebase
 * 
 * Default state: All devices off, no pending operations
 * 
 * Usage in components:
 * ```tsx
 * const [mediaState, setMediaState] = useAtom(mediaControlStateAtom);
 * 
 * const toggleMic = async () => {
 *   // Optimistic update - show pending immediately
 *   setMediaState(prev => ({ ...prev, microphonePending: true }));
 *   
 *   try {
 *     await dailyCall.setLocalAudio(!mediaState.microphoneEnabled);
 *     setMediaState(prev => ({
 *       ...prev,
 *       microphoneEnabled: !prev.microphoneEnabled,
 *       microphonePending: false
 *     }));
 *   } catch (error) {
 *     // Revert on error
 *     setMediaState(prev => ({ ...prev, microphonePending: false }));
 *     toast.error('Failed to toggle microphone');
 *   }
 * };
 * ```
 */
export const mediaControlStateAtom = atom<MediaControlState>({
  microphoneEnabled: false,
  cameraEnabled: false,
  microphonePending: false,
  cameraPending: false,
});

/**
 * Derived atom: Are any media controls currently pending?
 * 
 * WHY useful:
 * - Disable both media buttons while either is pending (prevent race conditions)
 * - Show global "updating..." message if needed
 * - Simpler than checking both pending states in every component
 */
export const isAnyMediaPendingAtom = atom((get) => {
  const state = get(mediaControlStateAtom);
  return state.microphonePending || state.cameraPending;
});

/**
 * Derived atom: Media controls summary for debugging
 * 
 * WHY useful during development:
 * - Quick overview of media state
 * - Helpful in browser DevTools (can inspect atom value)
 * - Makes debugging easier (see all states at once)
 */
export const mediaControlSummaryAtom = atom((get) => {
  const state = get(mediaControlStateAtom);
  return {
    mic: state.microphoneEnabled ? 'ON' : 'OFF',
    camera: state.cameraEnabled ? 'ON' : 'OFF',
    pending: (state.microphonePending || state.cameraPending) ? 'YES' : 'NO',
  };
});

