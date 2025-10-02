// Daily.co room configuration for Overcast Video Classroom Application
// Manages the 6 pre-defined Daily room URLs for local development

import { CLASSROOM_NAMES } from './constants';

// Daily room URL configuration
// These URLs should match the environment variables in .env.local
export const DAILY_ROOMS = [
  {
    id: '1',
    name: CLASSROOM_NAMES[0],
    url: process.env.DAILY_ROOM_1 || 'https://overcast.daily.co/cohort-1',
    capacity: 50
  },
  {
    id: '2', 
    name: CLASSROOM_NAMES[1],
    url: process.env.DAILY_ROOM_2 || 'https://overcast.daily.co/cohort-2',
    capacity: 50
  },
  {
    id: '3',
    name: CLASSROOM_NAMES[2], 
    url: process.env.DAILY_ROOM_3 || 'https://overcast.daily.co/cohort-3',
    capacity: 50
  },
  {
    id: '4',
    name: CLASSROOM_NAMES[3],
    url: process.env.DAILY_ROOM_4 || 'https://overcast.daily.co/cohort-4', 
    capacity: 50
  },
  {
    id: '5',
    name: CLASSROOM_NAMES[4],
    url: process.env.DAILY_ROOM_5 || 'https://overcast.daily.co/cohort-5',
    capacity: 50
  },
  {
    id: '6',
    name: CLASSROOM_NAMES[5],
    url: process.env.DAILY_ROOM_6 || 'https://overcast.daily.co/cohort-6',
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
