'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, use } from 'react';
import Classroom from '@/app/components/Classroom';
import { AppUser } from '@/lib/types';

/**
 * Loading fallback component for classroom page
 * Displayed while the Classroom component initializes
 */
function LoadingClassroom() {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-white text-lg mb-2">Loading classroom...</p>
        <p className="text-gray-400 text-sm">Please wait...</p>
      </div>
    </div>
  );
}

/**
 * Classroom page content component
 * Separated to allow Suspense boundary for useSearchParams()
 */
function ClassroomPageContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unwrap the params Promise using React.use()
  // WHY: Next.js 15+ wraps dynamic route params in a Promise for better streaming support.
  // React.use() suspends the component until the params are available.
  const { id } = use(params);

  // Extract user data from URL parameters
  // WHY: We pass user data via URL params from the lobby page.
  // This approach works for local development without requiring authentication.
  // In production, this would be replaced with proper session management.
  const userName = searchParams.get('name') || 'Anonymous';
  const userRole = (searchParams.get('role') || 'student') as 'student' | 'instructor';
  const sessionId = searchParams.get('sessionId') || crypto.randomUUID();

  // Construct user object
  const user: AppUser = {
    name: userName,
    role: userRole,
    sessionId: sessionId,
    currentClassroom: id,
    joinedAt: new Date()
  };

  /**
   * Handle leaving the classroom
   * 
   * WHY: When a user clicks "Leave Classroom", we need to:
   * 1. Disconnect from Daily.co (handled by Classroom component)
   * 2. Navigate back to the main lobby
   * 
   * The Classroom component will clean up the Daily connection
   * before calling this handler.
   */
  const handleLeaveClassroom = () => {
    router.push('/');
  };

  return (
    <Classroom 
      classroomId={id}
      user={user}
      onLeave={handleLeaveClassroom}
    />
  );
}

/**
 * Dynamic classroom page component
 * 
 * This page is accessed via /classroom/[id] where [id] is the classroom ID.
 * It renders the Classroom component which handles:
 * - Daily.co video integration via DailyProvider
 * - Real-time participant management using Daily React hooks
 * - Video feed display and controls
 * - Instructor controls (if user role is instructor)
 * 
 * User data is passed via URL search parameters from the lobby page.
 * 
 * @param params - Next.js dynamic route params containing classroom ID (Promise in Next.js 15+)
 */
export default function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingClassroom />}>
      <ClassroomPageContent params={params} />
    </Suspense>
  );
}
