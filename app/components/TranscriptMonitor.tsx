/**
 * TranscriptMonitor Component
 * 
 * Optional debug view showing live transcript feed.
 * Displays recent transcripts with speaker roles and timestamps.
 * 
 * WHY this exists:
 * - Transparency: instructor can see what system is capturing
 * - Debugging: verify transcription accuracy
 * - Trust: users understand what data is being used
 * - Educational: demonstrate how AI processes speech
 * 
 * WHY optional/toggleable:
 * - Not needed for normal operation
 * - Can be distracting during class
 * - Useful for testing and demos
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { Button } from './ui';

interface TranscriptMonitorProps {
  /** Session ID to monitor */
  sessionId: string;
  /** Maximum number of transcripts to display */
  maxEntries?: number;
  /** Filter by role (optional) */
  roleFilter?: 'instructor' | 'student' | 'all';
  /** Whether to auto-scroll to newest */
  autoScroll?: boolean;
}

export default function TranscriptMonitor({
  sessionId,
  maxEntries = 10,
  roleFilter = 'all',
  autoScroll = true,
}: TranscriptMonitorProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Fetch transcripts from API.
   * 
   * WHY poll with 'since' parameter:
   * - Only fetch new transcripts (efficient)
   * - Reduces bandwidth and processing
   * - Maintains chronological order
   */
  const fetchTranscripts = useCallback(async () => {
    if (!isVisible) return;

    try {
      // Build query params
      const params = new URLSearchParams();
      if (lastTimestamp) {
        params.append('since', lastTimestamp);
      }
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      const response = await fetch(
        `/api/transcripts/${sessionId}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transcripts: ${response.statusText}`);
      }

      const data = await response.json();
      const newEntries = data.entries || [];

      if (newEntries.length > 0) {
        setTranscripts((prev) => {
          // Add new entries and keep only last N
          const combined = [...prev, ...newEntries];
          return combined.slice(-maxEntries);
        });

        // Update last timestamp
        const latest = newEntries[newEntries.length - 1];
        if (latest) {
          setLastTimestamp(latest.timestamp);
        }
      }
    } catch (err) {
      console.error('[TranscriptMonitor] Error fetching transcripts:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, lastTimestamp, roleFilter, maxEntries, isVisible]);

  /**
   * Set up polling when visible.
   */
  useEffect(() => {
    if (!isVisible) return;

    // Initial fetch
    setLoading(true);
    fetchTranscripts();

    // Poll every 2 seconds
    const interval = setInterval(fetchTranscripts, 2000);

    return () => clearInterval(interval);
  }, [isVisible, fetchTranscripts]);

  /**
   * Auto-scroll to bottom when new transcripts arrive.
   */
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, autoScroll]);

  /**
   * Get role badge color.
   */
  const getRoleBadgeColor = (role: 'instructor' | 'student') => {
    return role === 'instructor'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  /**
   * Format timestamp for display.
   */
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Toggle visibility.
   */
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      // Reset when opening
      setTranscripts([]);
      setLastTimestamp(null);
    }
  };

  // Collapsed state (just toggle button)
  if (!isVisible) {
    return (
      <div className="w-full">
        <Button onClick={toggleVisibility} variant="ghost" size="sm">
          🔍 Show Transcript Monitor (Debug)
        </Button>
      </div>
    );
  }

  // Expanded state with transcripts
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Live Transcript Monitor</span>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-normal text-gray-500">
              {transcripts.length} entries
            </span>
            <Button onClick={toggleVisibility} variant="ghost" size="sm">
              Hide
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="mb-3 text-xs text-gray-500">
          <p>
            Showing last {maxEntries} {roleFilter !== 'all' ? roleFilter : ''}{' '}
            transcripts
          </p>
          {autoScroll && (
            <p className="mt-1">
              ✓ Auto-scrolling enabled
            </p>
          )}
        </div>

        {/* Loading state */}
        {loading && transcripts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Loading transcripts...
          </p>
        )}

        {/* Empty state */}
        {!loading && transcripts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No transcripts yet. Start speaking to see them appear here.
          </p>
        )}

        {/* Transcript list */}
        {transcripts.length > 0 && (
          <div
            ref={scrollRef}
            className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50"
          >
            {transcripts.map((entry) => (
              <div
                key={entry.id}
                className="p-2 bg-white rounded border border-gray-200"
              >
                {/* Header with role, name, time */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                        entry.speakerRole
                      )}`}
                    >
                      {entry.speakerRole}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {entry.speakerName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {/* Transcript text */}
                <div className="text-sm text-gray-700 pl-2">
                  {entry.text}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 mt-1 pl-2">
                  <span className="text-xs text-gray-500">
                    Confidence: {(entry.confidence * 100).toFixed(0)}%
                  </span>
                  {entry.breakoutRoomName && (
                    <span className="text-xs text-gray-500">
                      📍 {entry.breakoutRoomName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug info */}
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          <p>
            <strong>Debug Info:</strong> This component polls{' '}
            <code>/api/transcripts/{sessionId}</code> every 2 seconds to fetch
            new transcripts. Only visible to instructors for debugging purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

