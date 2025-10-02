// GET /api/rooms endpoint - List all available classrooms
// Placeholder for Phase 3.3 implementation

import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Implement in Phase 3.3 - T029
  // Return list of all 6 classrooms with current participant counts
  return NextResponse.json({ 
    message: 'Rooms API endpoint - to be implemented in Phase 3.3',
    phase: 'setup-complete'
  });
}
