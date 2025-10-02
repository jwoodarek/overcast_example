import { NextResponse } from 'next/server';

/**
 * Test API endpoint to verify Daily.co rooms exist
 * Access at: http://localhost:3002/api/test-rooms
 */
export async function GET() {
  const API_KEY = process.env.DAILY_API_KEY;
  const ROOMS = [
    { id: '1', url: process.env.DAILY_ROOM_1 },
    { id: '2', url: process.env.DAILY_ROOM_2 },
    { id: '3', url: process.env.DAILY_ROOM_3 },
    { id: '4', url: process.env.DAILY_ROOM_4 },
    { id: '5', url: process.env.DAILY_ROOM_5 },
    { id: '6', url: process.env.DAILY_ROOM_6 },
  ];

  if (!API_KEY) {
    return NextResponse.json({
      error: 'DAILY_API_KEY not configured',
      message: 'Get your API key from https://dashboard.daily.co/developers'
    }, { status: 500 });
  }

  const results = await Promise.all(
    ROOMS.map(async ({ id, url }) => {
      if (!url) {
        return { id, url: null, exists: false, error: 'URL not configured' };
      }

      const roomName = url.split('/').pop();
      
      try {
        const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            id, 
            roomName,
            url, 
            exists: true, 
            config: data.config 
          };
        } else if (response.status === 404) {
          return { 
            id, 
            roomName,
            url, 
            exists: false, 
            error: 'Room does not exist' 
          };
        } else {
          return { 
            id, 
            roomName,
            url, 
            exists: false, 
            error: `API error: ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          id, 
          roomName,
          url, 
          exists: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );

  const missingRooms = results.filter(r => !r.exists);
  const existingRooms = results.filter(r => r.exists);

  return NextResponse.json({
    summary: {
      total: results.length,
      existing: existingRooms.length,
      missing: missingRooms.length,
      allConfigured: missingRooms.length === 0
    },
    rooms: results,
    instructions: missingRooms.length > 0 ? {
      message: 'Some rooms need to be created',
      steps: [
        'Visit https://dashboard.daily.co/rooms',
        'Click "Create room"',
        'Use the following room names:',
        ...missingRooms.map(r => `  - ${r.roomName}`)
      ]
    } : null
  });
}

