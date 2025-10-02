'use client';

import { useState } from 'react';
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
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  /**
   * Handle classroom join action
   * 
   * WHY: We navigate to the classroom page when a user selects a classroom.
   * The user data is temporarily stored in state and will be passed to the
   * classroom page. In a production app, this would use session storage or
   * server-side authentication, but for local development we use client state.
   * 
   * @param classroomId - The ID of the classroom to join
   * @param user - The user data including name, role, sessionId
   */
  const handleJoinClassroom = (classroomId: string, user: AppUser) => {
    // Store user in state for potential future use
    setCurrentUser(user);
    
    // Navigate to the classroom page
    // The classroom page will handle Daily.co connection
    router.push(`/classroom/${classroomId}?name=${encodeURIComponent(user.name)}&role=${user.role}&sessionId=${user.sessionId}`);
  };

  return (
    <Lobby onJoinClassroom={handleJoinClassroom} />
  );
}
