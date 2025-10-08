// Daily.co room configuration for Overcast Video Classroom Application
// Manages the 6 pre-defined Daily room URLs for local development

import { CLASSROOM_NAMES } from './constants';

// Daily room URL configuration
// These URLs should match the environment variables in .env.local
// WHY: Using NEXT_PUBLIC_ prefix because this is imported by client components
// Client-side code can only access env vars with NEXT_PUBLIC_ prefix in Next.js
const room1Url = process.env.NEXT_PUBLIC_DAILY_ROOM_1 || 'https://overcast.daily.co/cohort-1';
const room2Url = process.env.NEXT_PUBLIC_DAILY_ROOM_2 || 'https://overcast.daily.co/cohort-2';
const room3Url = process.env.NEXT_PUBLIC_DAILY_ROOM_3 || 'https://overcast.daily.co/cohort-3';
const room4Url = process.env.NEXT_PUBLIC_DAILY_ROOM_4 || 'https://overcast.daily.co/cohort-4';
const room5Url = process.env.NEXT_PUBLIC_DAILY_ROOM_5 || 'https://overcast.daily.co/cohort-5';
const room6Url = process.env.NEXT_PUBLIC_DAILY_ROOM_6 || 'https://overcast.daily.co/cohort-6';

// WHY: Use consistent classroom names from constants instead of extracting from URLs
// This ensures the API returns the expected "Cohort Alpha", "Cohort Beta", etc. names
export const DAILY_ROOMS = [
  {
    id: '1',
    name: CLASSROOM_NAMES[0],
    url: room1Url,
    capacity: 50
  },
  {
    id: '2', 
    name: CLASSROOM_NAMES[1],
    url: room2Url,
    capacity: 50
  },
  {
    id: '3',
    name: CLASSROOM_NAMES[2], 
    url: room3Url,
    capacity: 50
  },
  {
    id: '4',
    name: CLASSROOM_NAMES[3],
    url: room4Url, 
    capacity: 50
  },
  {
    id: '5',
    name: CLASSROOM_NAMES[4],
    url: room5Url,
    capacity: 50
  },
  {
    id: '6',
    name: CLASSROOM_NAMES[5],
    url: room6Url,
    capacity: 50
  }
] as const;

// Helper function to get room by ID
export function getDailyRoomById(id: string) {
  return DAILY_ROOMS.find(room => room.id === id);
}

// Helper function to get all room URLs
export function getAllDailyRoomUrls() {
  return DAILY_ROOMS.map(room => room.url);
}

// Daily.co API configuration
export const DAILY_API_CONFIG = {
  apiKey: process.env.DAILY_API_KEY,
  baseUrl: 'https://api.daily.co/v1',
  
  // Default room properties for creating rooms via API
  defaultRoomProperties: {
    privacy: 'public' as const,
    properties: {
      max_participants: 50,
      enable_chat: true,
      enable_screenshare: true,
      enable_recording: false, // Disabled for privacy
      start_video_off: false,
      start_audio_off: false
    }
  }
};
