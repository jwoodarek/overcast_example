# Overcast Video Classroom Application

A futuristic video classroom application built with Next.js and Daily.co, featuring a main lobby with 6 classrooms for students and instructors to join live video sessions.

## Features

- **Main Lobby**: Browse 6 available classrooms with minimal, futuristic design
- **Student Mode**: Join classrooms, view video feeds, switch between rooms
- **Instructor Mode**: All student features plus participant muting and breakout room management
- **Real-time Video**: Powered by Daily.co with support for up to 50 participants per classroom
- **Futuristic Design**: Black/teal aesthetic inspired by the Overclock Accelerator brand

## Quick Start

### Prerequisites
- Node.js 18+
- Daily.co developer account and API key
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd overcast

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your Daily.co API key and room URLs

# Start development server
npm run dev
```

### Environment Setup

1. **Get Daily.co API Key**:
   - Sign up at [Daily.co](https://dashboard.daily.co/developers)
   - Create 6 room URLs for the classrooms
   - Copy your API key

2. **Configure Environment**:
   ```bash
   # Copy the example file
   cp env.example .env.local
   
   # Edit .env.local with your actual values:
   DAILY_API_KEY=your_actual_api_key
   DAILY_ROOM_1=https://your-domain.daily.co/cohort-1
   # ... (configure all 6 rooms)
   ```

3. **Start Development**:
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to see the lobby.

## Technology Stack

- **Frontend**: Next.js 15.5.4, React 19.1.0, TypeScript
- **Video**: Daily.co (@daily-co/daily-react, @daily-co/daily-js)
- **Styling**: Tailwind CSS v4 with custom futuristic theme
- **State Management**: Jotai (required by Daily React)
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel (serverless functions for API)

## Project Structure

```
app/
├── page.tsx                  # Main lobby page
├── classroom/[id]/page.tsx   # Dynamic classroom pages
├── api/                      # Vercel serverless functions
├── components/               # React components
├── globals.css              # Futuristic theme styles
└── layout.tsx               # Root layout with branding

lib/
├── types.ts                 # TypeScript definitions
├── daily-config.ts          # Daily room configuration
└── constants.ts             # App constants

tests/
├── contract/                # API contract tests
├── integration/             # E2E user workflow tests
└── unit/                    # Component unit tests
```

## Development Workflow

### Constitutional Principles
This project follows the Overcast Constitution emphasizing:
- **Simplicity First**: Choose straightforward solutions over clever ones
- **Single File Preference**: Keep related functionality together
- **Comment-Driven Development**: Explain WHY decisions were made
- **Newcomer-Friendly**: Code should be accessible to junior developers
- **Test-Driven Clarity**: Tests serve as living documentation

### Testing
```bash
# Run all tests
npm test

# Run specific test types
npm test -- tests/contract     # API contract tests
npm test -- tests/integration  # E2E workflow tests
npm test -- tests/unit         # Component unit tests

# Run tests in watch mode
npm test -- --watch
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## User Workflows

### Student Journey
1. Open application → see main lobby with 6 classrooms
2. Click classroom → enter name → join as student
3. View live video feed with other participants
4. Return to lobby or switch to different classroom

### Instructor Journey
1. Toggle to "Instructors" mode in lobby
2. Join classroom as instructor → get additional controls
3. Mute/unmute individual participants or all participants
4. Create breakout rooms for smaller group discussions
5. Manage classroom with equal privileges alongside other instructors

## API Endpoints

- `GET /api/rooms` - List all 6 classrooms with status
- `POST /api/rooms/{id}/join` - Join a classroom
- `POST /api/rooms/{id}/leave` - Leave a classroom
- `POST /api/participants/{sessionId}/mute` - Mute/unmute participant
- `POST /api/participants/mute-all` - Mute all participants
- `POST /api/breakout-rooms` - Create breakout room

## Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
npm run build
vercel --prod

# Set environment variables in Vercel dashboard
```

### Environment Variables for Production
- `DAILY_API_KEY` - Your Daily.co API key
- `DAILY_ROOM_1` through `DAILY_ROOM_6` - Production room URLs
- `NEXT_PUBLIC_APP_NAME` - Application name
- `NEXT_PUBLIC_MAX_PARTICIPANTS_PER_ROOM` - Participant limit (50)

## Contributing

1. Follow the constitutional principles (see `.specify/memory/constitution.md`)
2. Write tests before implementation (TDD)
3. Use descriptive commit messages
4. Ensure code passes linting and type checking
5. Update documentation for new features

## Support

For Daily.co integration issues, refer to:
- [Daily.co Documentation](https://docs.daily.co/)
- [Daily React Hooks](https://github.com/daily-co/daily-react)

## License

This project is part of the Overclock Accelerator program.

**Powered by the Overclock Accelerator**