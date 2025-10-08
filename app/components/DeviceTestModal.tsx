'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from './ui/Button';

interface DeviceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (selectedDevices: {
    audioInputId: string;
    videoInputId: string;
  }) => void;
}

/**
 * DeviceTestModal
 * 
 * Allows users to test and select their audio/video devices before joining a classroom.
 * 
 * WHY this component:
 * - Users need confidence their devices work before joining
 * - Prevents "can't hear me" problems in the classroom
 * - Standard UX pattern in video conferencing (Zoom, Meet, etc.)
 * - Ensures transcription will work by verifying audio input
 */
export default function DeviceTestModal({ isOpen, onClose, onContinue }: DeviceTestModalProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAudioContextActiveRef = useRef<boolean>(false);

  /**
   * Load available audio and video devices
   * 
   * WHY enumerate devices:
   * - Users may have multiple microphones/cameras
   * - Need to show friendly device names, not IDs
   * - Must request permission first to see device labels
   */
  const loadDevices = useCallback(async () => {
    try {
      // Request permissions first so we can see device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      // Auto-select default devices (prefer device with "default" in deviceId)
      if (audioInputs.length > 0 && !selectedAudioId) {
        const defaultDevice = audioInputs.find(d => d.deviceId === 'default' || d.deviceId.includes('default'));
        setSelectedAudioId(defaultDevice ? defaultDevice.deviceId : audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoId) {
        const defaultDevice = videoInputs.find(d => d.deviceId === 'default' || d.deviceId.includes('default'));
        setSelectedVideoId(defaultDevice ? defaultDevice.deviceId : videoInputs[0].deviceId);
      }

      setError(null);
    } catch (err) {
      console.error('[DeviceTest] Failed to load devices:', err);
      setError('Unable to access camera/microphone. Please grant permissions.');
    }
  }, [selectedAudioId, selectedVideoId]);

  /**
   * Start testing audio levels
   * 
   * WHY visualize audio:
   * - Users need to see their mic is working
   * - Visual feedback = confidence
   * - Same technique used in professional conferencing apps
   */
  const startAudioTest = useCallback(async (deviceId: string) => {
    try {
      // Stop any existing test
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && isAudioContextActiveRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close().catch(err => {
            console.warn('[DeviceTest] AudioContext close warning:', err);
          });
        }
        isAudioContextActiveRef.current = false;
      }

      // Get audio stream from selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });
      streamRef.current = stream;

      // Create audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      isAudioContextActiveRef.current = true;

      // Start visualizing audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        // More sensitive calculation: divide by 50 instead of 128 to make the bar more responsive
        const percent = Math.min(100, (average / 50) * 100);
        
        setAudioLevel(percent);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      setIsTesting(true);
      setError(null);
    } catch (err) {
      console.error('[DeviceTest] Failed to start audio test:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsTesting(false);
    }
  }, []);

  /**
   * Start video preview
   */
  const startVideoPreview = useCallback(async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('[DeviceTest] Failed to start video preview:', err);
    }
  }, []);

  /**
   * Handle audio device change
   */
  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    setSelectedAudioId(deviceId);
    if (isTesting) {
      startAudioTest(deviceId);
    }
  }, [isTesting, startAudioTest]);

  /**
   * Handle video device change
   */
  const handleVideoDeviceChange = useCallback((deviceId: string) => {
    setSelectedVideoId(deviceId);
    startVideoPreview(deviceId);
  }, [startVideoPreview]);

  /**
   * Cleanup on unmount or close
   * 
   * WHY check AudioContext state:
   * - AudioContext can only be closed once
   * - Calling close() on a closed context throws an error
   * - We track state to prevent double-close errors
   */
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && isAudioContextActiveRef.current) {
      // Only close if the context is still active
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.warn('[DeviceTest] AudioContext close warning:', err);
        });
      }
      isAudioContextActiveRef.current = false;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsTesting(false);
    setAudioLevel(0);
  }, []);

  // Load devices when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    } else {
      cleanup();
    }
  }, [isOpen, loadDevices, cleanup]);

  // Start testing when devices are selected
  useEffect(() => {
    if (selectedAudioId && isOpen) {
      startAudioTest(selectedAudioId);
    }
  }, [selectedAudioId, isOpen, startAudioTest]);

  useEffect(() => {
    if (selectedVideoId && isOpen) {
      startVideoPreview(selectedVideoId);
    }
  }, [selectedVideoId, isOpen, startVideoPreview]);

  const handleContinue = () => {
    cleanup();
    onContinue({
      audioInputId: selectedAudioId,
      videoInputId: selectedVideoId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full border border-teal-500/30">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-white">Test Your Devices</h2>
          <p className="text-gray-400 mt-2">
            Make sure your camera and microphone are working before joining the classroom.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Video Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Camera
            </label>
            <select
              value={selectedVideoId}
              onChange={(e) => handleVideoDeviceChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white mb-3"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Audio Test */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Microphone
            </label>
            <select
              value={selectedAudioId}
              onChange={(e) => handleAudioDeviceChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white mb-3"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>

            {/* Audio Level Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {isTesting ? '🎤 Speak to test your microphone' : 'Starting test...'}
                </span>
                <span className="text-teal-400 font-medium">
                  {Math.round(audioLevel)}%
                </span>
              </div>
              <div className="bg-gray-800 h-4 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    audioLevel > 50 ? 'bg-teal-500' : audioLevel > 20 ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              {audioLevel > 0 ? (
                <p className="text-sm text-teal-400">✓ Microphone is working!</p>
              ) : (
                <p className="text-sm text-gray-500">Speak into your microphone to see the level</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 flex justify-between">
          <Button
            onClick={() => {
              cleanup();
              onClose();
            }}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedAudioId || !selectedVideoId}
          >
            Continue to Classroom
          </Button>
        </div>
      </div>
    </div>
  );
}

