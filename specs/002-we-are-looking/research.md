# Research: Overcast Video Classroom Application

**Feature**: Video classroom application with Daily Video platform integration  
**Date**: 2025-10-02  
**Status**: Complete

## Technology Research

### Daily Video Platform Integration

**Decision**: Use @daily-co/daily-react with @daily-co/daily-js and jotai for React integration  
**Rationale**: 
- Daily provides enterprise-grade video infrastructure with built-in participant management
- React hooks (useParticipants, useDevices, useScreenShare) simplify state management
- DailyProvider pattern ensures proper context management across components
- Jotai dependency provides atomic state management for Daily internals
- Supports up to 50 participants per room (meets our requirement)
- Built-in instructor controls via useParticipants hook for muting
- No backend infrastructure required for basic video functionality

**Alternatives Considered**:
- WebRTC native implementation: Too complex for newcomers, requires extensive signaling server
- Zoom SDK: Requires paid licensing, more complex integration
- Agora.io: Similar capabilities but less React-focused documentation

### Next.js App Router Architecture

**Decision**: Use Next.js 15 App Router with TypeScript for full-stack application  
**Rationale**:
- File-based routing simplifies classroom navigation (/classroom/[id])
- Built-in API routes for Daily integration without separate backend
- Server-side rendering improves initial load performance
- TypeScript provides type safety for Daily API integration
- Vercel deployment is seamless

**Alternatives Considered**:
- Pages Router: Less modern, more complex API setup
- Separate React + Express: Violates single-file preference, more deployment complexity
- Vite + React: No built-in API routes, would require separate backend

### Styling and UI Framework

**Decision**: Tailwind CSS v4 with custom futuristic theme  
**Rationale**:
- Utility-first approach keeps styles close to components (single-file preference)
- Easy to implement black/teal futuristic aesthetic
- No runtime CSS-in-JS overhead
- Excellent documentation for newcomers
- Built-in dark mode support

**Alternatives Considered**:
- Styled Components: Runtime overhead, violates simplicity principle
- CSS Modules: More files, less flexible for theming
- Plain CSS: Harder to maintain consistent design system

### State Management

**Decision**: React built-in state (useState, useContext) with Daily's useDaily hooks  
**Rationale**:
- Daily hooks handle video state complexity
- Simple user state (name, role) doesn't require external state management
- Follows constitutional simplicity principle
- Easier for newcomers to understand

**Alternatives Considered**:
- Redux Toolkit: Overkill for simple state requirements
- Zustand: Additional dependency, not needed for this scope
- Jotai: Atomic approach adds complexity for simple use case

### Testing Strategy

**Decision**: Jest + React Testing Library for components, Playwright for E2E  
**Rationale**:
- React Testing Library promotes accessible, user-focused tests
- Playwright handles video integration testing better than Jest
- Both have excellent Next.js integration
- Clear separation between unit and integration testing

**Alternatives Considered**:
- Cypress: Slower than Playwright, less TypeScript support
- Vitest: Newer, less documentation for Daily integration testing

## Daily Video API Integration Patterns

### Application Architecture
- Wrap app with `DailyProvider` component passing room URL
- Use `useDaily()` hook for call object initialization
- Leverage `useParticipants()` for participant state management
- Implement `useDevices()` for camera/microphone controls

### Room Management
- Pre-defined room URLs stored in constants file
- Initialize with `DailyProvider url={roomUrl}`
- No dynamic room creation needed for MVP
- Room URLs map to classroom IDs (1-6)

### Participant Management
- Use `useParticipants()` hook with event handlers
- `useParticipantProperty()` for individual participant data
- Simple name-based joining via `userName` in `useDaily()` args
- Role detection via URL parameters (?role=instructor)

### Instructor Controls
- Use `useParticipants()` with `onParticipantUpdated` for muting
- Access Daily call object methods for participant control
- Multiple instructors supported by Daily's permission system
- Screen sharing via `useScreenShare()` hook

### Video Quality Optimization
- Daily automatically handles bandwidth adaptation
- 60fps support available for high-quality streams
- Screen sharing built into Daily components

## Performance Considerations

### Initial Load Time
- Next.js static generation for lobby page
- Dynamic imports for Daily components (code splitting)
- Preload classroom data on lobby hover

### Video Connection Speed
- Daily's global edge network provides <100ms connection times
- WebRTC direct peer connections for low latency
- Automatic fallback to TURN servers if needed

### Scalability
- 6 concurrent rooms × 50 participants = 300 total capacity
- Daily handles all video infrastructure scaling
- Vercel serverless functions scale automatically

## Security and Privacy

### Access Control
- Simple name entry (no sensitive data)
- Room URLs can be rotated if needed
- Daily provides built-in participant validation

### Data Privacy
- No persistent data storage (constitutional requirement)
- Daily handles all video data with enterprise security
- GDPR compliant through Daily's infrastructure

## Development Workflow

### Local Development
- Daily provides development API keys
- Room URLs work in localhost environment
- Hot reload compatible with video components

### Deployment
- Vercel deployment from GitHub
- Environment variables for Daily API keys
- Automatic HTTPS for video requirements

## Conclusion

All technical decisions align with constitutional principles:
- **Simplicity**: Daily handles video complexity, React provides familiar patterns
- **Single File Preference**: Tailwind keeps styles with components, minimal API structure
- **Newcomer Friendly**: Well-documented technologies with strong community support
- **Educational**: Clear separation of concerns, extensive commenting planned

Ready to proceed to Phase 1 design and contracts.
