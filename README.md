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

This application is optimized for deployment on Vercel with automatic serverless function scaling and edge network distribution.

#### Quick Deploy

1. **Connect your repository**:
   ```bash
   # Install Vercel CLI (if not already installed)
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel
   ```

2. **Set environment variables** in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add the following variables for Production, Preview, and Development:

#### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DAILY_API_KEY` | Your Daily.co API key from dashboard | `abc123...` |
| `DAILY_ROOM_1` | Production room URL for Cohort 1 | `https://overcast.daily.co/cohort-1` |
| `DAILY_ROOM_2` | Production room URL for Cohort 2 | `https://overcast.daily.co/cohort-2` |
| `DAILY_ROOM_3` | Production room URL for Cohort 3 | `https://overcast.daily.co/cohort-3` |
| `DAILY_ROOM_4` | Production room URL for Cohort 4 | `https://overcast.daily.co/cohort-4` |
| `DAILY_ROOM_5` | Production room URL for Cohort 5 | `https://overcast.daily.co/cohort-5` |
| `DAILY_ROOM_6` | Production room URL for Cohort 6 | `https://overcast.daily.co/cohort-6` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | `Overcast` |
| `NEXT_PUBLIC_MAX_PARTICIPANTS_PER_ROOM` | Max participants per classroom | `50` |

#### Deployment Configuration

The `vercel.json` configuration includes:
- **Optimized serverless functions**: 1024MB memory, 10s timeout
- **Security headers**: Content security, XSS protection, frame options
- **CORS headers**: Configured for Daily.co video integration
- **Permissions**: Camera, microphone, and display capture enabled
- **Region**: US East (iad1) for optimal Daily.co connectivity

#### Production Build

```bash
# Test production build locally
npm run build
npm start

# Deploy to production
vercel --prod
```

#### Monitoring and Logs

- **View logs**: `vercel logs <deployment-url>`
- **Real-time logs**: Vercel Dashboard → Your Project → Deployments → Logs
- **Error tracking**: Structured JSON logs in production (see `lib/utils.ts` Logger)

#### Domain Configuration

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `overcast.yourcompany.com`)
3. Follow DNS configuration instructions
4. SSL certificates are automatically provisioned

#### Performance Optimization

The deployment is configured for:
- ✅ Edge caching for static assets
- ✅ Serverless function cold start optimization
- ✅ Automatic image optimization via Next.js
- ✅ Code splitting and lazy loading
- ✅ Gzip/Brotli compression

#### Troubleshooting

**Build fails**:
- Check environment variables are set correctly
- Verify Daily.co API key is valid
- Review build logs in Vercel Dashboard

**Video not connecting**:
- Verify DAILY_ROOM_* URLs are accessible
- Check browser console for CORS errors
- Ensure Permissions-Policy headers allow camera/microphone

**Slow performance**:
- Check serverless function execution time in logs
- Monitor Daily.co connection quality
- Review Network tab in browser DevTools

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