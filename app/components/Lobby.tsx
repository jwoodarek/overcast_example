'use client';

import React, { useState, useEffect } from 'react';
import { DAILY_ROOMS } from '@/lib/daily-config';
import { UI_CONSTANTS } from '@/lib/constants';
import { Classroom, AppUser } from '@/lib/types';
import { isClassroomFull, validateUserName } from '@/lib/daily-utils';
import DeviceTestModal from './DeviceTestModal';

interface LobbyProps {
  onJoinClassroom: (classroomId: string, user: AppUser, selectedDevices?: { audioInputId: string; videoInputId: string }) => void;
}

interface ClassroomCardProps {
  classroom: Classroom;
  participantCount: number;
  isActive: boolean;
  onJoin: (classroomId: string) => void;
  disabled?: boolean;
}

/**
 * Individual classroom card component
 * Shows classroom info and join button with capacity status
 */
function ClassroomCard({ classroom, participantCount, isActive, onJoin, disabled }: ClassroomCardProps) {
  // Use centralized capacity utilities from daily-utils
  const isFull = isClassroomFull(participantCount, classroom.maxCapacity);
  const capacityPercentage = (participantCount / classroom.maxCapacity) * 100;
  
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-teal-500 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">{classroom.name}</h3>
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-teal-400' : 'bg-gray-600'}`} />
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>Participants</span>
          <span>{participantCount}/{classroom.maxCapacity}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              capacityPercentage > 80 ? 'bg-red-500' : 
              capacityPercentage > 60 ? 'bg-yellow-500' : 
              'bg-teal-500'
            }`}
            style={{ width: `${capacityPercentage}%` }}
          />
        </div>
      </div>
      
      <button
        onClick={() => onJoin(classroom.id)}
        disabled={disabled || isFull}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          disabled || isFull
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-700 text-white'
        }`}
      >
        {isFull ? 'Classroom Full' : 'Join Classroom'}
      </button>
    </div>
  );
}

/**
 * User input form for name and role selection
 */
interface UserFormProps {
  onSubmit: (user: Omit<AppUser, 'sessionId' | 'currentClassroom' | 'joinedAt'>) => void;
  disabled?: boolean;
}

function UserForm({ onSubmit, disabled }: UserFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Use centralized name validation from daily-utils
    const nameValidation = validateUserName(name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.error || 'Invalid name';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ name: name.trim(), role });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">Join a Classroom</h2>
      
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your display name"
          disabled={disabled}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            errors.name ? 'border-red-500' : 'border-gray-600'
          }`}
          maxLength={50}
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Role</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="student"
              checked={role === 'student'}
              onChange={(e) => setRole(e.target.value as 'student' | 'instructor')}
              disabled={disabled}
              className="mr-2 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-gray-300">Student</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="role"
              value="instructor"
              checked={role === 'instructor'}
              onChange={(e) => setRole(e.target.value as 'student' | 'instructor')}
              disabled={disabled}
              className="mr-2 text-teal-500 focus:ring-teal-500"
            />
            <span className="text-gray-300">Instructor</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !name.trim()}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          disabled || !name.trim()
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-700 text-white'
        }`}
      >
        Ready to Join
      </button>
    </form>
  );
}

/**
 * Main Lobby component
 * Displays 6 classroom grid with real-time participant counts
 * Handles user input and classroom selection
 */
export default function Lobby({ onJoinClassroom }: LobbyProps) {
  const [user, setUser] = useState<Omit<AppUser, 'sessionId' | 'currentClassroom' | 'joinedAt'> | null>(null);
  const [classroomStates, setClassroomStates] = useState<Record<string, { participantCount: number; isActive: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
  const [showDeviceTest, setShowDeviceTest] = useState(false);
  const [pendingClassroomId, setPendingClassroomId] = useState<string | null>(null);

  // Convert DAILY_ROOMS to Classroom interface format
  const classrooms: Classroom[] = DAILY_ROOMS.map(room => ({
    id: room.id,
    name: room.name,
    dailyRoomUrl: room.url,
    maxCapacity: room.capacity
  }));

  // Fetch classroom states from API
  useEffect(() => {
    const fetchClassroomStates = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          const states: Record<string, { participantCount: number; isActive: boolean }> = {};
          
          data.classrooms.forEach((classroom: { id: string; participantCount: number; isActive: boolean }) => {
            states[classroom.id] = {
              participantCount: classroom.participantCount,
              isActive: classroom.isActive
            };
          });
          
          setClassroomStates(states);
        }
      } catch (error) {
        console.error('Failed to fetch classroom states:', error);
        // Initialize with empty states if API fails
        const emptyStates: Record<string, { participantCount: number; isActive: boolean }> = {};
        classrooms.forEach(classroom => {
          emptyStates[classroom.id] = { participantCount: 0, isActive: false };
        });
        setClassroomStates(emptyStates);
      }
    };

    fetchClassroomStates();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchClassroomStates, 5000);
    return () => clearInterval(interval);
  }, [classrooms]);

  const handleUserSubmit = (userData: Omit<AppUser, 'sessionId' | 'currentClassroom' | 'joinedAt'>) => {
    setUser(userData);
  };

  const handleJoinClassroom = async (classroomId: string) => {
    if (!user) return;

    // Find the selected classroom
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      console.error('Classroom not found:', classroomId);
      return;
    }

    // Get current participant count for capacity validation
    const state = classroomStates[classroomId] || { participantCount: 0, isActive: false };
    
    // Validate capacity before attempting to join
    if (isClassroomFull(state.participantCount, classroom.maxCapacity)) {
      alert(`Classroom "${classroom.name}" is full. Please try another classroom.`);
      return;
    }

    // Show device test modal before joining
    setPendingClassroomId(classroomId);
    setShowDeviceTest(true);
  };

  const handleDeviceTestComplete = (selectedDevices: { audioInputId: string; videoInputId: string }) => {
    if (!user || !pendingClassroomId) return;

    console.log('[Lobby] Device test complete. Selected devices:', selectedDevices);

    setShowDeviceTest(false);
    setIsLoading(true);
    setSelectedClassroom(pendingClassroomId);

    try {
      // Create full user object with session data
      const fullUser: AppUser = {
        ...user,
        sessionId: crypto.randomUUID(),
        currentClassroom: pendingClassroomId,
        joinedAt: new Date()
      };

      // Call parent handler to initiate classroom join
      // Pass selected devices so transcription uses the correct microphone
      onJoinClassroom(pendingClassroomId, fullUser, selectedDevices);
    } catch (error) {
      console.error('Failed to join classroom:', error);
      setIsLoading(false);
      setSelectedClassroom(null);
    }

    setPendingClassroomId(null);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            {UI_CONSTANTS.appName}
          </h1>
          <p className="text-xl text-gray-300 mb-2">Video Classroom Platform</p>
          <p className="text-sm text-gray-500">{UI_CONSTANTS.brandText}</p>
        </div>

        {/* User Form */}
        {!user && (
          <div className="max-w-md mx-auto">
            <UserForm onSubmit={handleUserSubmit} disabled={isLoading} />
          </div>
        )}

        {/* Classroom Grid */}
        {user && (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome, {user.name}!</h2>
              <p className="text-gray-400">
                Select a classroom to join as {user.role === 'instructor' ? 'an instructor' : 'a student'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {classrooms.map((classroom) => {
                const state = classroomStates[classroom.id] || { participantCount: 0, isActive: false };
                
                return (
                  <ClassroomCard
                    key={classroom.id}
                    classroom={classroom}
                    participantCount={state.participantCount}
                    isActive={state.isActive}
                    onJoin={handleJoinClassroom}
                    disabled={isLoading || selectedClassroom === classroom.id}
                  />
                );
              })}
            </div>

            {isLoading && selectedClassroom && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  <p className="text-white text-lg">Joining classroom...</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {UI_CONSTANTS.loadingMessages[0]}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Device Test Modal */}
        <DeviceTestModal
          isOpen={showDeviceTest}
          onClose={() => {
            setShowDeviceTest(false);
            setPendingClassroomId(null);
          }}
          onContinue={handleDeviceTestComplete}
        />
      </div>
    </div>
  );
}
