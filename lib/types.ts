// TypeScript type definitions for Overcast Video Classroom Application
// Based on data-model.md and Daily.co integration requirements

export interface AppUser {
  id: string;
  name: string;
  role: 'student' | 'instructor';
  sessionId?: string; // Daily.co session ID when connected
}

export interface Classroom {
  id: string;
  name: string;
  dailyRoomUrl: string;
  capacity: number;
  currentParticipants: number;
  isActive: boolean;
  instructors: AppUser[];
}

export interface ClassroomState {
  classroom: Classroom;
  participants: AppUser[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// Daily.co integration types
export interface DailyParticipant {
  session_id: string;
  user_name: string;
  audio: boolean;
  video: boolean;
  screen: boolean;
  local: boolean;
}

export interface DailyCallState {
  participants: Record<string, DailyParticipant>;
  meetingState: 'new' | 'joining' | 'joined' | 'left' | 'error';
}
