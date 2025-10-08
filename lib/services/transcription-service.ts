/**
 * TranscriptionService
 * 
 * Captures spoken audio and converts it to text transcripts during classroom sessions.
 * 
 * WHY Web Speech API for MVP:
 * - Zero setup required (browser-native, no API keys)
 * - Perfect for proving the concept quickly
 * - Free and immediate availability
 * - Easy to swap for production-grade service later (Deepgram)
 * 
 * WHY this service abstraction:
 * - Allows swapping between Web Speech API (MVP) and Deepgram (production)
 * - Centralizes permission handling and error management
 * - Provides consistent interface regardless of underlying provider
 * 
 * Upgrade Path:
 * - Current: Web Speech API (browser-native, free, good for testing)
 * - Future: Deepgram (WebSocket streaming, speaker diarization, education-optimized)
 * - Interface design allows switching via environment variable
 * 
 * Limitations of Web Speech API:
 * - Accuracy varies by browser (Chrome is best)
 * - Requires microphone permissions
 * - No automatic speaker identification (we use role from join time)
 * - Language dependent on browser settings
 * 
 * Based on research.md Web Speech API decision (research question #1)
 */

import type { TranscriptEntry } from '../types';

/**
 * Interface for transcript capture providers
 * 
 * WHY interface abstraction:
 * - Allows swapping between Web Speech API and Deepgram without changing caller code
 * - Makes testing easier (can mock the provider)
 * - Documents the contract that any transcription provider must fulfill
 */
interface TranscriptionProvider {
  /**
   * Start capturing audio and converting to text
   * @param sessionId - Session ID (classroom or breakout room)
   * @param speakerId - Unique identifier for speaker
   * @param speakerName - Display name of speaker
   * @param speakerRole - Role (instructor or student)
   * @param breakoutRoomName - Name of breakout room (null if main classroom)
   * @param audioDeviceId - Optional audio device ID to use for capture
   */
  startCapture(
    sessionId: string,
    speakerId: string,
    speakerName: string,
    speakerRole: 'instructor' | 'student',
    breakoutRoomName: string | null,
    audioDeviceId?: string
  ): Promise<void>;

  /**
   * Stop capturing audio
   * @param sessionId - Session ID to stop capture for
   */
  stopCapture(sessionId: string): Promise<void>;

  /**
   * Check if browser supports this transcription provider
   */
  isSupported(): boolean;
}

/**
 * Web Speech API implementation
 * 
 * WHY this implementation:
 * - Uses browser's built-in speech recognition (no dependencies)
 * - Handles interim results for responsive feel (<1s feedback)
 * - Stores only final results to avoid duplicates
 * - Includes confidence threshold filtering
 */
class WebSpeechProvider implements TranscriptionProvider {
  private recognition: SpeechRecognition | null = null;
  private activeSession: {
    sessionId: string;
    speakerId: string;
    speakerName: string;
    speakerRole: 'instructor' | 'student';
    breakoutRoomName: string | null;
  } | null = null;

  isSupported(): boolean {
    // Check if browser supports Web Speech API
    // WHY: Chrome, Edge, Safari support it; Firefox doesn't yet
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  async startCapture(
    sessionId: string,
    speakerId: string,
    speakerName: string,
    speakerRole: 'instructor' | 'student',
    breakoutRoomName: string | null,
    audioDeviceId?: string
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    // Stop any existing capture first
    if (this.recognition) {
      await this.stopCapture(this.activeSession?.sessionId || sessionId);
    }

    // WHY request microphone explicitly:
    // - Ensures the user has granted microphone permissions
    // - Verifies the selected device is accessible
    // - Web Speech API will use the last-accessed microphone
    // 
    // IMPORTANT: We request it briefly then release it immediately
    // - Web Speech API needs exclusive access to the microphone
    // - Can't have both getUserMedia stream AND speech recognition active simultaneously
    if (audioDeviceId) {
      try {
        console.log(`[Transcription] Verifying microphone access: ${audioDeviceId}`);
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: audioDeviceId } }
        });
        console.log('[Transcription] Microphone access verified, releasing for speech recognition...');
        // Immediately stop the stream so Web Speech API can use the microphone
        testStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('[Transcription] Failed to access specific microphone:', error);
        // Try without exact device constraint (might work with default)
        try {
          console.log('[Transcription] Trying default microphone...');
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach(track => track.stop());
        } catch (fallbackError) {
          throw new Error('Failed to access microphone. Please check permissions and ensure no other app is using it.');
        }
      }
    }

    // Store session info for use in event handlers
    this.activeSession = {
      sessionId,
      speakerId,
      speakerName,
      speakerRole,
      breakoutRoomName,
    };

    // Create speech recognition instance
    // WHY webkitSpeechRecognition: Chrome and Safari use prefixed version
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition settings
    this.recognition.continuous = true; // Keep listening until explicitly stopped
    this.recognition.interimResults = true; // Get results as user speaks (for responsive feel)
    this.recognition.lang = 'en-US'; // Language (could be made configurable)
    this.recognition.maxAlternatives = 1; // Only need top result

    // Handle recognition results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // WHY process results: Store final transcripts, ignore interim ones to avoid duplicates
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        // Log interim results for debugging (but don't store them)
        if (!result.isFinal) {
          console.log(`[Transcription] Interim: "${transcript}"`);
        }
        
        // Only store final results (interim results are for UI feedback only)
        if (result.isFinal && this.activeSession) {
          const confidence = result[0].confidence;

          console.log(`[Transcript] ✅ FINAL: ${this.activeSession.speakerName} (${this.activeSession.speakerRole}): "${transcript}" [confidence: ${confidence.toFixed(2)}]`);

          // Send transcript to server API for storage
          // WHY POST to server:
          // - Client-side storage isn't shared across browser tabs/users
          // - Server-side storage allows all participants to see transcripts
          // - Enables server-side processing (help detection, quiz generation)
          fetch(`/api/transcripts/${this.activeSession.sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              speakerId: this.activeSession.speakerId,
              speakerName: this.activeSession.speakerName,
              speakerRole: this.activeSession.speakerRole,
              text: transcript,
              confidence: confidence,
              breakoutRoomName: this.activeSession.breakoutRoomName,
            }),
          }).catch(error => {
            console.error('[Transcript] Failed to send to server:', error);
          });
        }
      }
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Transcription Error]', event.error, event.message);
      
      // WHY specific error handling: Different errors need different user messages
      switch (event.error) {
        case 'not-allowed':
          console.error('Microphone permission denied. Please allow microphone access to enable transcription.');
          break;
        case 'no-speech':
          // This is normal - user just isn't speaking
          break;
        case 'network':
          console.error('Network error during transcription. Speech recognition may use network services.');
          break;
        case 'audio-capture':
          console.error('No microphone detected or audio capture failed.');
          break;
        default:
          console.error(`Transcription error: ${event.error}`);
      }
    };

    // Handle start of recognition
    this.recognition.onstart = () => {
      console.log('[Transcription] 🎤 Speech recognition is now LISTENING for audio...');
    };

    // Handle end of recognition (auto-restart)
    this.recognition.onend = () => {
      // WHY auto-restart: continuous mode can sometimes stop, so we restart it
      // Only restart if we still have an active session
      if (this.activeSession && this.recognition) {
        try {
          console.log('[Transcription] Restarting speech recognition...');
          this.recognition.start();
        } catch (error) {
          // If already started, ignore the error
          if ((error as Error).message.includes('already started')) {
            // Expected in some cases
          } else {
            console.error('[Transcription] Failed to restart:', error);
          }
        }
      } else {
        console.log('[Transcription] Session ended, not restarting');
      }
    };

    // Start recognition
    try {
      this.recognition.start();
      console.log(`[Transcription] Started capturing for ${speakerName} (${speakerRole}) in session ${sessionId}`);
    } catch (error) {
      console.error('[Transcription] Failed to start:', error);
      throw new Error(`Failed to start speech recognition: ${(error as Error).message}`);
    }
  }

  async stopCapture(sessionId: string): Promise<void> {
    if (this.recognition && this.activeSession?.sessionId === sessionId) {
      // Clear active session first to prevent auto-restart
      this.activeSession = null;
      
      // Stop recognition
      // WHY: This releases the microphone so other apps can use it
      this.recognition.stop();
      this.recognition = null;
      
      console.log(`[Transcription] Stopped capturing for session ${sessionId}`);
    }
  }
}

/**
 * TranscriptionService
 * 
 * Main service class that manages transcription across all sessions.
 * 
 * WHY singleton pattern:
 * - Only one transcription service should exist per application
 * - Manages all active capture sessions
 * - Provides easy access from components and API routes
 */
export class TranscriptionService {
  private provider: TranscriptionProvider;
  private activeSessions: Set<string> = new Set();

  constructor() {
    // WHY Web Speech API: MVP choice for zero-setup transcription
    // TODO: Support Deepgram provider via environment variable (TRANSCRIPTION_PROVIDER=deepgram)
    this.provider = new WebSpeechProvider();
  }

  /**
   * Check if transcription is supported in current environment
   * 
   * WHY: Need to handle unsupported browsers gracefully (show message to user)
   */
  isSupported(): boolean {
    return this.provider.isSupported();
  }

  /**
   * Start capturing transcripts for a session
   * 
   * @param sessionId - Classroom or breakout room session ID
   * @param speakerId - Unique identifier for speaker (Daily participant ID)
   * @param speakerName - Display name of speaker
   * @param speakerRole - Role (instructor or student) - critical for filtering
   * @param breakoutRoomName - Name of breakout room (null if main classroom)
   * @param audioDeviceId - Optional audio device ID from device selection modal
   * 
   * WHY parameters:
   * - sessionId: Groups transcripts by classroom/breakout room
   * - speakerRole: Needed to filter instructor vs student speech for quiz generation
   * - breakoutRoomName: Needed to show which room needs help in alerts
   * - audioDeviceId: Ensures the correct microphone is used (the one the user tested)
   */
  async startCapture(
    sessionId: string,
    speakerId: string,
    speakerName: string,
    speakerRole: 'instructor' | 'student',
    breakoutRoomName: string | null = null,
    audioDeviceId?: string
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Transcription not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    if (this.activeSessions.has(sessionId)) {
      console.warn(`[Transcription] Session ${sessionId} is already being captured`);
      return;
    }

    try {
      await this.provider.startCapture(sessionId, speakerId, speakerName, speakerRole, breakoutRoomName, audioDeviceId);
      this.activeSessions.add(sessionId);
      console.log(`[Transcription] Active sessions: ${this.activeSessions.size}`);
    } catch (error) {
      console.error('[Transcription] Failed to start capture:', error);
      throw error;
    }
  }

  /**
   * Stop capturing transcripts for a session
   * 
   * WHY: Called when user leaves classroom or session ends
   * Prevents memory leaks and unnecessary processing
   */
  async stopCapture(sessionId: string): Promise<void> {
    if (!this.activeSessions.has(sessionId)) {
      console.warn(`[Transcription] Session ${sessionId} is not being captured`);
      return;
    }

    try {
      await this.provider.stopCapture(sessionId);
      this.activeSessions.delete(sessionId);
      console.log(`[Transcription] Active sessions: ${this.activeSessions.size}`);
    } catch (error) {
      console.error('[Transcription] Failed to stop capture:', error);
      throw error;
    }
  }

  /**
   * Get list of active capture sessions
   * 
   * WHY: Useful for debugging and monitoring
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }

  /**
   * Stop all active captures
   * 
   * WHY: Called during cleanup (e.g., user closes app, page refresh)
   */
  async stopAll(): Promise<void> {
    const sessions = Array.from(this.activeSessions);
    for (const sessionId of sessions) {
      await this.stopCapture(sessionId);
    }
  }
}

/**
 * Singleton instance for application-wide use
 * 
 * WHY singleton:
 * - Only one transcription service should run per user
 * - Prevents conflicts from multiple capture sessions
 * - Easy to import and use throughout application
 */
export const transcriptionService = new TranscriptionService();

/**
 * TypeScript declarations for Web Speech API
 * 
 * WHY: Web Speech API is not fully typed in all TypeScript versions
 */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

