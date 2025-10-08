/**
 * TranscriptMonitor Component
 * 
 * Live transcript feed with scrollback capability and export functionality.
 * Displays session transcripts with speaker roles, timestamps, and export options.
 * 
 * WHY this exists:
 * - Transparency: instructor can see what system is capturing
 * - Review capability: scroll back through session history
 * - Export functionality: download transcripts as CSV or JSON
 * - Trust: users understand what data is being used
 * 
 * Features:
 * - Scrollback through entire session history (not just last 10 entries)
 * - Export as CSV (human-readable) or JSON (machine-readable)
 * - Real-time updates via polling
 * - Auto-scroll to latest entries (can be disabled)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { TranscriptEntry } from '@/lib/types';
import { transcriptScrollPositionAtom } from '@/lib/store/transcript-store';
import {
  exportTranscriptAsCSV,
  exportTranscriptAsJSON,
  triggerTranscriptDownload,
  generateTranscriptFilename,
} from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { Button } from './ui';

interface TranscriptMonitorProps {
  /** Session ID to monitor */
  sessionId: string;
  /** Filter by role (optional) */
  roleFilter?: 'instructor' | 'student' | 'all';
  /** Whether to auto-scroll to newest */
  autoScroll?: boolean;
}

export default function TranscriptMonitor({
  sessionId,
  roleFilter = 'all',
  autoScroll = true,
}: TranscriptMonitorProps) {
  // State management
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Scroll position tracking via Jotai
  const [, setScrollPosition] = useAtom(transcriptScrollPositionAtom);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Fetch transcripts from API
   * 
   * WHY poll with 'since' parameter:
   * - Only fetch new transcripts (efficient)
   * - Reduces bandwidth and processing
   * - Maintains chronological order
   * 
   * WHY keep all entries:
   * - Enables scrollback through entire session history
   * - Required for export functionality (export full session)
   * - Memory: ~1MB per hour of class (acceptable for in-browser storage)
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
          // Keep ALL entries for scrollback and export (no slicing)
          return [...prev, ...newEntries];
        });

        // Update last timestamp
        const latest = newEntries[newEntries.length - 1];
        if (latest) {
          setLastTimestamp(latest.timestamp);
        }
      }
    } catch {
      // Silent error handling - don't spam console
      // Errors are expected during development/testing
    } finally {
      setLoading(false);
    }
  }, [sessionId, lastTimestamp, roleFilter, isVisible]);

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
   * Auto-scroll to bottom when new transcripts arrive
   * Only scrolls if user is already near the bottom (within 100px)
   * WHY: Prevents annoying auto-scroll when user is reviewing old transcripts
   */
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const element = scrollRef.current;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      
      if (isNearBottom) {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, [transcripts, autoScroll]);

  /**
   * Track scroll position changes
   * WHY: Persist scroll position in Jotai atom for potential future features
   */
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollPosition(scrollRef.current.scrollTop);
    }
  }, [setScrollPosition]);

  /**
   * Handle export button click
   * Generates file and triggers download based on selected format
   * WHY: Uses utilities from lib/utils.ts for consistent export format
   */
  const handleExport = useCallback(() => {
    if (transcripts.length === 0) {
      alert('No transcripts to export');
      return;
    }

    try {
      let content: string;
      let mimeType: 'text/csv' | 'application/json';
      
      if (exportFormat === 'csv') {
        content = exportTranscriptAsCSV(transcripts);
        mimeType = 'text/csv';
      } else {
        content = exportTranscriptAsJSON(transcripts, sessionId);
        mimeType = 'application/json';
      }

      const filename = generateTranscriptFilename(sessionId, exportFormat);
      triggerTranscriptDownload(content, filename, mimeType);
      
      // Close export menu after successful export
      setShowExportMenu(false);
    } catch {
      alert('Failed to export transcripts. Please try again.');
    }
  }, [transcripts, sessionId, exportFormat]);

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
          📝 Show Transcript Monitor
        </Button>
      </div>
    );
  }

  // Expanded state with transcripts
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📝 Session Transcript</span>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-normal text-gray-500">
              {transcripts.length} {transcripts.length === 1 ? 'entry' : 'entries'}
            </span>
            
            {/* Export Button with Format Selector */}
            {transcripts.length > 0 && (
              <div className="relative">
                <Button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  variant="secondary"
                  size="sm"
                >
                  📥 Export
                </Button>
                
                {/* Export Format Menu */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10">
                    <div className="p-2 space-y-1">
                      <div className="text-xs text-gray-400 px-2 py-1">Export as:</div>
                      <button
                        onClick={() => {
                          setExportFormat('csv');
                          handleExport();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded"
                      >
                        📊 CSV (Spreadsheet)
                      </button>
                      <button
                        onClick={() => {
                          setExportFormat('json');
                          handleExport();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded"
                      >
                        🔧 JSON (Structured)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Button onClick={toggleVisibility} variant="ghost" size="sm">
              Hide
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Status Info */}
        {transcripts.length > 0 && (
          <div className="mb-3 text-xs text-gray-500">
            {roleFilter !== 'all' && (
              <p>Showing {roleFilter} transcripts only</p>
            )}
            {autoScroll && (
              <p>Scroll up to review history • Auto-scrolls to latest when at bottom</p>
            )}
          </div>
        )}

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

        {/* Transcript list with scrollback capability */}
        {transcripts.length > 0 && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="space-y-2 max-h-[500px] overflow-y-auto border border-gray-700 rounded p-3 bg-gray-800"
          >
            {transcripts.map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-gray-900 rounded border border-gray-700"
              >
                {/* Header with role, name, time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                        entry.speakerRole
                      )}`}
                    >
                      {entry.speakerRole}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {entry.speakerName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {/* Transcript text */}
                <div className="text-sm text-gray-300 pl-2">
                  {entry.text}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 mt-2 pl-2">
                  <span className="text-xs text-gray-500">
                    {(entry.confidence * 100).toFixed(0)}% confidence
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
      </CardContent>
    </Card>
  );
}

