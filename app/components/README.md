# Components Directory

React components for the Overcast video classroom application, built with Daily.co integration and futuristic design.

## Structure

- `Lobby.tsx` - Main lobby with 6 classroom grid
- `Classroom.tsx` - Classroom video component with DailyProvider wrapper
- `VideoFeed.tsx` - Daily video integration using React hooks
- `ParticipantList.tsx` - Participant display using useParticipants() hook
- `InstructorControls.tsx` - Instructor-specific controls (mute, breakout rooms)
- `ui/` - Shared UI components (buttons, modals, etc.)

## Daily.co Integration

Components use Daily React hooks for video functionality:

```typescript
import { useParticipants, useDevices, useScreenShare } from '@daily-co/daily-react';
```

## Design System

All components follow the futuristic black/teal theme defined in `globals.css`:

- `.btn-primary` - Teal buttons for primary actions
- `.classroom-card` - Dark cards with teal hover effects
- `.video-container` - Video display containers
- `.instructor-panel` - Instructor control panels

## Constitutional Compliance

- **Single File Preference**: Related functionality kept together
- **Comment-Driven**: All non-trivial logic explained with WHY comments
- **Newcomer-Friendly**: Clear component names and prop interfaces
- **Educational**: Components serve as examples of Daily.co integration patterns
