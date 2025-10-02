/**
 * GET /api/rooms endpoint - List all available classrooms
 * 
 * Returns the current state of all 6 classrooms including:
 * - Participant counts
 * - Active status
 * - Capacity information
 * 
 * WHY: The lobby page needs this data to display classroom availability.
 * We query Daily.co API to get real-time participant counts for each room.
 * 
 * For local development without Daily API access, we return mock data.
 * In production, this would query the Daily REST API.
 */

import { NextResponse } from 'next/server';
import { DAILY_ROOMS, DAILY_API_CONFIG } from '@/lib/daily-config';

/**
 * Fetch room info from Daily.co API
 * Returns participant count and active status for a specific room
 */
async function fetchDailyRoomInfo(roomUrl: string) {
  // Extract room name from URL (e.g., "cohort-1" from "https://overcast.daily.co/cohort-1")
  const roomName = roomUrl.split('/').pop();
  
  try {
    // Only attempt API call if we have an API key
    if (!DAILY_API_CONFIG.apiKey) {
      // Return mock data for local development without API key
      return { participantCount: 0, isActive: false };
    }

    const response = await fetch(`${DAILY_API_CONFIG.baseUrl}/rooms/${roomName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      // Cache for 5 seconds to avoid excessive API calls
      next: { revalidate: 5 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch room ${roomName}:`, response.statusText);
      return { participantCount: 0, isActive: false };
    }

    const data = await response.json();
    
    // Daily API returns room info with config object
    const participantCount = data.config?.max_participants_active || 0;
    const isActive = participantCount > 0;

    return { participantCount, isActive };
  } catch (error) {
    console.error(`Error fetching room info for ${roomName}:`, error);
    // Return safe defaults on error
    return { participantCount: 0, isActive: false };
  }
}

export async function GET() {
  try {
    // Fetch room info for all 6 classrooms in parallel
    const roomInfoPromises = DAILY_ROOMS.map(async (room) => {
      const { participantCount, isActive } = await fetchDailyRoomInfo(room.url);
      
      return {
        id: room.id,
        name: room.name,
        participantCount,
        isActive,
        maxCapacity: room.capacity
      };
    });

    const classrooms = await Promise.all(roomInfoPromises);

    // Calculate aggregate statistics
    const totalCapacity = DAILY_ROOMS.reduce((sum, room) => sum + room.capacity, 0);
    const activeRooms = classrooms.filter(room => room.isActive).length;

    return NextResponse.json({
      classrooms,
      totalCapacity,
      activeRooms
    });
  } catch (error) {
    console.error('Error in GET /api/rooms:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch classroom information'
      },
      { status: 500 }
    );
  }
}
