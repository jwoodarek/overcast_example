'use client';

import React, { useState, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { DailyParticipant } from '@daily-co/daily-js';
import { BreakoutRoom } from '@/lib/types';

/**
 * BreakoutModal Component
 * 
 * WHY this component exists:
 * - Instructors need a visual interface to create breakout rooms
 * - Participant assignment requires careful validation (no duplicates)
 * - Confirmation view shows instructors what was created
 * 
 * Features:
 * - Create 1-10 breakout rooms with custom names
 * - Click-to-assign participants to rooms
 * - Validation: No participant in multiple rooms
 * - Confirmation view with created rooms and member lists
 * - Close button to dismiss modal
 */

interface BreakoutModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Function to close modal */
  onClose: () => void;
  /** List of all participants available for assignment (excludes instructors) */
  participants: DailyParticipant[];
  /** Session ID for the classroom */
  sessionId: string;
}

interface RoomConfiguration {
  name: string;
  participantIds: string[];
}

/**
 * BreakoutModal - Modal for creating and managing breakout room assignments
 * 
 * STATE FLOW:
 * 1. Setup: Configure rooms and assign participants
 * 2. Confirmation: Display created rooms with member lists
 * 
 * VALIDATION:
 * - Room names must be non-empty
 * - At least 1 room required
 * - Maximum 10 rooms allowed
 * - No participant can be assigned to multiple rooms
 */
export default function BreakoutModal({
  isOpen,
  onClose,
  participants,
  sessionId,
}: BreakoutModalProps) {
  // Current view state: 'setup' or 'confirmation'
  const [view, setView] = useState<'setup' | 'confirmation'>('setup');

  // Room configurations being built
  const [rooms, setRooms] = useState<RoomConfiguration[]>([
    { name: 'Room 1', participantIds: [] },
    { name: 'Room 2', participantIds: [] },
  ]);

  // Created rooms after successful API call
  const [createdRooms, setCreatedRooms] = useState<BreakoutRoom[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a new room to the configuration
   * Maximum 10 rooms allowed (enforced by disabled button)
   */
  const handleAddRoom = () => {
    if (rooms.length < 10) {
      setRooms([
        ...rooms,
        { name: `Room ${rooms.length + 1}`, participantIds: [] },
      ]);
    }
  };

  /**
   * Remove a room from the configuration
   * Minimum 1 room required (enforced by disabled button)
   */
  const handleRemoveRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  /**
   * Update room name
   */
  const handleRoomNameChange = (index: number, name: string) => {
    const updatedRooms = [...rooms];
    updatedRooms[index].name = name;
    setRooms(updatedRooms);
  };

  /**
   * Toggle participant assignment to a room
   * 
   * WHY click-to-assign instead of drag-and-drop:
   * - Simpler implementation for MVP
   * - More accessible (keyboard navigation friendly)
   * - Works better on tablets where drag-and-drop can be finicky
   */
  const handleToggleParticipant = (roomIndex: number, participantId: string) => {
    const updatedRooms = [...rooms];
    const room = updatedRooms[roomIndex];

    // Check if participant is currently in this room
    const isInThisRoom = room.participantIds.includes(participantId);

    if (isInThisRoom) {
      // Remove participant from this room
      room.participantIds = room.participantIds.filter(
        (id) => id !== participantId
      );
    } else {
      // Remove participant from any other room first (no duplicates allowed)
      updatedRooms.forEach((r) => {
        r.participantIds = r.participantIds.filter((id) => id !== participantId);
      });
      // Add participant to this room
      room.participantIds.push(participantId);
    }

    setRooms(updatedRooms);
  };

  /**
   * Validation: Check if form is ready to submit
   * 
   * Requirements:
   * - All room names must be non-empty
   * - At least one room must exist
   */
  const isValid = useMemo(() => {
    return rooms.length > 0 && rooms.every((room) => room.name.trim().length > 0);
  }, [rooms]);

  /**
   * Get which room (if any) a participant is currently assigned to
   */
  const getParticipantRoomIndex = (participantId: string): number => {
    return rooms.findIndex((room) => room.participantIds.includes(participantId));
  };

  /**
   * Submit breakout room configuration to API
   * 
   * POST /api/breakout-rooms
   * Body: { sessionId, rooms: [{ name, participantIds }] }
   */
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/breakout-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          rooms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create breakout rooms');
      }

      // Store created rooms and switch to confirmation view
      setCreatedRooms(data.rooms);
      setView('confirmation');
    } catch (err) {
      console.error('Failed to create breakout rooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to create breakout rooms');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset modal state and close
   */
  const handleClose = () => {
    // Reset to default state
    setView('setup');
    setRooms([
      { name: 'Room 1', participantIds: [] },
      { name: 'Room 2', participantIds: [] },
    ]);
    setCreatedRooms([]);
    setError(null);
    setLoading(false);
    onClose();
  };

  /**
   * Get participant display name from Daily participant object
   */
  const getParticipantName = (participantId: string): string => {
    const participant = participants.find((p) => p.session_id === participantId);
    return participant?.user_name || 'Unknown';
  };

  /**
   * Setup View - Room configuration and participant assignment
   */
  const renderSetupView = () => (
    <>
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="mb-4 text-sm text-gray-400">
        Create breakout rooms and assign participants. Click a participant to assign them to a room.
        Each participant can only be in one room.
      </div>

      {/* Room configurations */}
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {rooms.map((room, roomIndex) => (
          <div
            key={roomIndex}
            className="p-4 bg-gray-800/50 border border-gray-700 rounded-md"
          >
            {/* Room name input and remove button */}
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={room.name}
                onChange={(e) => handleRoomNameChange(roomIndex, e.target.value)}
                placeholder="Enter room name"
                className="flex-1"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemoveRoom(roomIndex)}
                disabled={rooms.length === 1}
                aria-label={`Remove ${room.name}`}
              >
                Remove
              </Button>
            </div>

            {/* Participant assignment */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">
                Assigned: {room.participantIds.length} participant{room.participantIds.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => {
                  const participantId = participant.session_id;
                  const assignedRoomIndex = getParticipantRoomIndex(participantId);
                  const isInThisRoom = assignedRoomIndex === roomIndex;
                  const isInOtherRoom = assignedRoomIndex !== -1 && !isInThisRoom;

                  return (
                    <button
                      key={participantId}
                      onClick={() => handleToggleParticipant(roomIndex, participantId)}
                      className={`
                        px-3 py-1.5 text-xs rounded-md border transition-colors
                        ${
                          isInThisRoom
                            ? 'bg-teal-600 border-teal-500 text-white'
                            : isInOtherRoom
                            ? 'bg-gray-700 border-gray-600 text-gray-400 opacity-50'
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                        }
                      `}
                      aria-label={
                        isInThisRoom
                          ? `Remove ${participant.user_name} from ${room.name}`
                          : `Assign ${participant.user_name} to ${room.name}`
                      }
                    >
                      {participant.user_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add room button */}
      <div className="mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddRoom}
          disabled={rooms.length >= 10}
          fullWidth
        >
          Add Room {rooms.length >= 10 && '(Maximum 10 rooms)'}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
        >
          Create Breakout Rooms
        </Button>
      </div>
    </>
  );

  /**
   * Confirmation View - Display created rooms with member lists
   * 
   * WHY show confirmation:
   * - Provides feedback that rooms were created successfully
   * - Shows instructor exactly what was created
   * - Lists participants in each room for verification
   */
  const renderConfirmationView = () => (
    <>
      {/* Success message */}
      <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-md text-green-200 text-sm">
        Successfully created {createdRooms.length} breakout room{createdRooms.length !== 1 ? 's' : ''}!
      </div>

      {/* Created rooms list */}
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {createdRooms.map((room) => (
          <div
            key={room.id}
            className="p-4 bg-gray-800/50 border border-teal-500/30 rounded-md"
          >
            <h3 className="text-teal-400 font-medium mb-2">{room.name}</h3>
            
            {/* Participant count */}
            <div className="text-xs text-gray-400 mb-2">
              {room.participantIds.length} participant{room.participantIds.length !== 1 ? 's' : ''}
            </div>

            {/* Participant list */}
            {room.participantIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {room.participantIds.map((participantId) => (
                  <div
                    key={participantId}
                    className="px-3 py-1.5 text-xs rounded-md bg-gray-700 border border-gray-600 text-gray-300"
                  >
                    {getParticipantName(participantId)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">No participants assigned</div>
            )}
          </div>
        ))}
      </div>

      {/* Close button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleClose}>
          Done
        </Button>
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={view === 'setup' ? 'Create breakout rooms' : 'Breakout rooms created'}
      description={
        view === 'setup'
          ? 'Assign participants to breakout rooms for group discussions'
          : undefined
      }
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      aria-describedby="breakout-modal-description"
    >
      {view === 'setup' ? renderSetupView() : renderConfirmationView()}
    </Modal>
  );
}

