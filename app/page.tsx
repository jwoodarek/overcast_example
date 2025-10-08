'use client';

import { useRouter } from 'next/navigation';
import Lobby from '@/app/components/Lobby';
import { AppUser } from '@/lib/types';

/**
 * Main lobby page for Overcast Video Classroom Application
 * 
 * This page serves as the entry point for students and instructors.
 * It renders the Lobby component which handles:
 * - User name and role input
 * - Display of 6 available classrooms
 * - Real-time participant counts
 * - Classroom capacity indicators
 * 
 * When a user joins a classroom, we navigate to the dynamic classroom page
 * and pass user data via URL state (Next.js App Router pattern).
 */
export default function Home() {
  const router = useRouter();

  /**
   * Handle classroom join action
   * 
   * WHY: We navigate to the classroom page when a user selects a classroom.
   * The user data is passed via URL parameters to the classroom page.
   * Device IDs are passed so transcription uses the correct microphone.
   * 
   * @param classroomId - The ID of the classroom to join
   * @param user - The user data including name, role, sessionId
   * @param selectedDevices - Selected audio/video device IDs from device test
   */
  const handleJoinClassroom = (classroomId: string, user: AppUser, selectedDevices?: { audioInputId: string; videoInputId: string }) => {
    // Navigate to the classroom page
    // The classroom page will handle Daily.co connection
    let url = `/classroom/${classroomId}?name=${encodeURIComponent(user.name)}&role=${user.role}&sessionId=${user.sessionId}`;
    
    // Include device IDs so transcription uses the correct microphone
    if (selectedDevices) {
      url += `&audioDevice=${encodeURIComponent(selectedDevices.audioInputId)}`;
      url += `&videoDevice=${encodeURIComponent(selectedDevices.videoInputId)}`;
    }
    
    router.push(url);
  };

  return (
    <Lobby onJoinClassroom={handleJoinClassroom} />
  );
}
