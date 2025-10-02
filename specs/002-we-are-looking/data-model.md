# Data Model: Overcast Video Classroom Application

**Feature**: Video classroom application  
**Date**: 2025-10-02  
**Status**: Complete

## Core Entities

### User
**Purpose**: Represents a person using the application in either student or instructor mode

**Attributes**:
- `name: string` - Display name entered by user (required, 1-50 characters)
- `role: 'student' | 'instructor'` - User role determining available features
- `sessionId: string` - Unique identifier for current session
- `currentClassroom: string | null` - ID of classroom currently joined (1-6 or null)
- `joinedAt: Date` - Timestamp when user joined current classroom
- `isAudioMuted: boolean` - Current audio state in classroom
- `isVideoEnabled: boolean` - Current video state in classroom

**Validation Rules**:
- Name must be non-empty and trimmed
- Role defaults to 'student' if not specified
- Only one classroom can be joined at a time
- SessionId generated client-side using crypto.randomUUID()

**State Transitions**:
```
Lobby → Classroom (join)
Classroom → Lobby (leave)
Classroom → Different Classroom (switch - auto-leave previous)
```

### Classroom
**Purpose**: Represents one of 6 available video classroom sessions

**Attributes**:
- `id: string` - Classroom identifier ('1' through '6')
- `name: string` - Display name (e.g., "Cohort 1", "Cohort 2")
- `dailyRoomUrl: string` - Pre-configured Daily.co room URL
- `participantCount: number` - Current number of participants (0-50)
- `isActive: boolean` - Whether classroom has any participants
- `instructors: User[]` - List of current instructors (multiple allowed)
- `students: User[]` - List of current students
- `createdAt: Date` - When classroom session started
- `maxCapacity: number` - Maximum participants (always 50)

**Validation Rules**:
- ID must be '1', '2', '3', '4', '5', or '6'
- Participant count cannot exceed maxCapacity
- Daily room URL must be valid HTTPS URL
- At least one participant required for isActive = true

**Relationships**:
- Has many Users (participants)
- Belongs to Daily.co room infrastructure

### Participant
**Purpose**: Represents a user's presence and state within a specific classroom

**Attributes**:
- `userId: string` - Reference to User sessionId
- `classroomId: string` - Reference to Classroom id
- `role: 'student' | 'instructor'` - Role in this classroom
- `joinedAt: Date` - When participant joined this classroom
- `isAudioMuted: boolean` - Audio state (can be controlled by instructors)
- `isVideoEnabled: boolean` - Video state
- `dailyParticipantId: string` - Daily.co participant identifier
- `connectionState: 'connecting' | 'connected' | 'disconnected'` - Connection status

**Validation Rules**:
- UserId and classroomId combination must be unique
- Role must match User role
- Daily participant ID required when connected
- Connection state must reflect actual Daily connection

**State Transitions**:
```
connecting → connected (successful join)
connected → disconnected (leave or network issue)
connecting → disconnected (failed join)
```

### BreakoutRoom
**Purpose**: Sub-session within a classroom created by instructors for smaller group discussions

**Attributes**:
- `id: string` - Unique identifier for breakout room
- `parentClassroomId: string` - Reference to main classroom
- `name: string` - Display name (e.g., "Group 1", "Discussion A")
- `participants: Participant[]` - Subset of main classroom participants
- `createdBy: string` - User sessionId of instructor who created it
- `createdAt: Date` - Creation timestamp
- `isActive: boolean` - Whether breakout room is currently running
- `maxDuration: number` - Maximum duration in minutes (default 30)

**Validation Rules**:
- Parent classroom must exist and be active
- Creator must be an instructor in parent classroom
- Participants must be subset of parent classroom participants
- Maximum 10 breakout rooms per classroom

**Relationships**:
- Belongs to one Classroom
- Has many Participants (subset of parent classroom)
- Created by one User (instructor)

## Data Flow Patterns

### User Journey: Student Joins Classroom
1. User enters name on lobby → Create User entity
2. User clicks classroom → Validate capacity
3. If capacity OK → Create Participant entity
4. Connect to Daily room → Update connection state
5. Update Classroom participant count

### User Journey: Instructor Controls
1. Instructor joins classroom → Participant with role 'instructor'
2. Instructor mutes participant → Update target Participant.isAudioMuted
3. Instructor creates breakout → Create BreakoutRoom entity
4. Move participants to breakout → Update Participant associations

### Capacity Management
1. Check Classroom.participantCount before allowing join
2. If count >= maxCapacity → Return "classroom full" error
3. Increment count on successful join
4. Decrement count on leave/disconnect

## Storage Strategy

### Local Development (No Database)
- All entities stored in React state and context
- Pre-defined classroom configurations in constants file
- Session data lost on page refresh (acceptable for MVP)
- Daily.co handles video infrastructure persistence

### Future Database Considerations
- User sessions could be stored in Redis for persistence
- Classroom analytics in PostgreSQL
- Real-time updates via WebSocket or Server-Sent Events
- Participant history for usage analytics

## Type Definitions (TypeScript)

```typescript
// Daily React integration types
import { DailyParticipant, DailyCall } from '@daily-co/daily-js';

// Application-specific user context
interface AppUser {
  name: string;
  role: 'student' | 'instructor';
  sessionId: string;
  currentClassroom: string | null;
  joinedAt: Date;
}

// Classroom configuration (static)
interface Classroom {
  id: string;
  name: string;
  dailyRoomUrl: string;
  maxCapacity: number; // Always 50
}

// Runtime classroom state (derived from Daily hooks)
interface ClassroomState {
  id: string;
  participants: DailyParticipant[]; // From useParticipants()
  participantCount: number; // Derived from participants.length
  isActive: boolean; // Derived from participantCount > 0
  instructors: DailyParticipant[]; // Filtered by role
  students: DailyParticipant[]; // Filtered by role
}

// Daily React hook configurations
interface UseDailyConfig {
  url: string; // Daily room URL
  userName: string; // User's display name
  token?: string; // Optional Daily token for auth
  audioSource?: boolean | string | MediaStreamTrack;
  videoSource?: boolean | string | MediaStreamTrack;
}

interface UseParticipantsConfig {
  onParticipantJoined?(participant: DailyParticipant): void;
  onParticipantUpdated?(participant: DailyParticipant): void;
  onParticipantLeft?(participant: DailyParticipant): void;
}

// Breakout room (future enhancement)
interface BreakoutRoom {
  id: string;
  parentClassroomId: string;
  name: string;
  participantIds: string[]; // Daily participant session IDs
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  maxDuration: number;
}
```

## Validation and Error Handling

### Client-Side Validation
- Name length and format validation
- Classroom capacity checks before join attempts
- Role-based permission validation for instructor actions

### Server-Side Validation (API Routes)
- Daily room URL validation
- Participant limit enforcement
- Instructor privilege verification for control actions

### Error States
- "Classroom Full" - Display when capacity reached
- "Connection Failed" - Handle Daily connection issues
- "Permission Denied" - Block unauthorized instructor actions
- "Network Error" - Graceful degradation for connectivity issues

This data model supports all functional requirements while maintaining simplicity and newcomer-friendly structure.
