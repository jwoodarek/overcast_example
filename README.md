# Overcast Video Classroom Application

A futuristic video classroom application built with Next.js and Daily.co, featuring a main lobby with 6 classrooms for students and instructors to join live video sessions.

## Features

### Core Video Classroom
- **Main Lobby**: Browse 6 available classrooms with minimal, futuristic design
- **Student Mode**: Join classrooms, view video feeds, switch between rooms
- **Instructor Mode**: All student features plus participant muting and breakout room management
- **Real-time Video**: Powered by Daily.co with support for up to 50 participants per classroom
- **Breakout Rooms**: Create and manage smaller group discussions
- **Futuristic Design**: Black/teal aesthetic inspired by the Overclock Accelerator brand

### Intelligent Features 🤖
- **Live Transcript Capture**: Real-time transcription of all classroom audio using Web Speech API
- **Help Detection**: AI-powered analysis identifies when students need assistance based on keywords and patterns
- **Smart Alerts**: Instructors receive real-time notifications when students express confusion or struggle
- **AI Quiz Generation**: Generate custom quizzes from instructor speech using GPT-3.5, with multiple choice and true/false questions
- **Role-Based Analysis**: Distinguishes instructor speech from student speech for accurate quiz generation

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

2. **Get OpenAI API Key** (for intelligent features):
   - Sign up at [OpenAI Platform](https://platform.openai.com)
   - Create an API key from the API Keys section
   - Copy your key for quiz generation

3. **Configure Environment**:
   ```bash
   # Copy the example file
   cp env.example .env.local
   
   # Edit .env.local with your actual values:
   DAILY_API_KEY=your_actual_api_key
   DAILY_ROOM_1=https://your-domain.daily.co/cohort-1
   # ... (configure all 6 rooms)
   
   # Add OpenAI key for intelligent features
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start Development**:
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
4. Speak and participate (transcription captures audio automatically)
5. Return to lobby or switch to different classroom

### Instructor Journey
1. Toggle to "Instructors" mode in lobby
2. Join classroom as instructor → get additional controls
3. Mute/unmute individual participants or all participants
4. Create breakout rooms for smaller group discussions
5. **Monitor help alerts**: View real-time alerts when students need assistance
6. **Generate quizzes**: Create custom assessments from your teaching content
7. Manage classroom with equal privileges alongside other instructors

### Intelligent Features Workflow
1. **Automatic Transcription**: All speech is transcribed in real-time
2. **Help Detection**: System analyzes student speech for confusion keywords
3. **Alert Generation**: Instructors receive alerts within 5 seconds of detection
4. **Alert Management**: Acknowledge, resolve, or dismiss alerts from dashboard
5. **Quiz Creation**: Click "Generate Quiz" to create questions from instructor speech
6. **Quiz Editing**: Review and edit generated questions before publishing

## API Endpoints

### Video Classroom Management
- `GET /api/rooms` - List all 6 classrooms with status
- `POST /api/rooms/{id}/join` - Join a classroom
- `POST /api/rooms/{id}/leave` - Leave a classroom
- `POST /api/participants/{sessionId}/mute` - Mute/unmute participant
- `POST /api/participants/mute-all` - Mute all participants
- `POST /api/breakout-rooms` - Create breakout room

### Intelligent Features
- `GET /api/transcripts/{sessionId}` - Retrieve transcript entries for a session
  - Query params: `?role=instructor|student&since=timestamp&minConfidence=0.7`
- `POST /api/transcripts/analyze` - Trigger help detection analysis on transcripts
- `GET /api/alerts/{sessionId}` - Get help alerts for instructor dashboard
  - Query params: `?status=pending|acknowledged|resolved|dismissed`
- `POST /api/alerts` - Update alert status (acknowledge, resolve, dismiss)
- `POST /api/quiz/generate` - Generate quiz from instructor transcripts
  - Body: `{ sessionId, instructorId, questionCount, difficulty }`
- `GET /api/quiz/{quizId}` - Retrieve a generated quiz
- `PATCH /api/quiz/{quizId}` - Edit quiz questions before publishing

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
| `OPENAI_API_KEY` | OpenAI API key for quiz generation | `sk-...` |

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

## Usage Examples

### Using Transcripts API

```javascript
// Get all transcripts for a session
const response = await fetch(`/api/transcripts/classroom-01`);
const { entries } = await response.json();

// Get only student transcripts
const studentResponse = await fetch(`/api/transcripts/classroom-01?role=student`);

// Get recent transcripts (since timestamp)
const recentResponse = await fetch(`/api/transcripts/classroom-01?since=2025-10-07T14:30:00Z`);
```

### Triggering Help Detection

```javascript
// Analyze transcripts for help patterns
const analyzeResponse = await fetch(`/api/transcripts/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'classroom-01' })
});

const { alertsGenerated, alerts } = await analyzeResponse.json();
console.log(`Generated ${alertsGenerated} new alerts`);
```

### Managing Alerts

```javascript
// Get pending alerts for instructor
const alertsResponse = await fetch(`/api/alerts/classroom-01?status=pending`);
const { alerts, counts } = await alertsResponse.json();

// Acknowledge an alert
await fetch(`/api/alerts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    alertId: 'alert-123',
    status: 'acknowledged',
    instructorId: 'instructor-john'
  })
});
```

### Generating Quizzes

```javascript
// Generate quiz from instructor speech
const quizResponse = await fetch(`/api/quiz/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'classroom-01',
    instructorId: 'instructor-john',
    questionCount: 5,
    difficulty: 'mixed'
  })
});

const { quiz, generationTime } = await quizResponse.json();
console.log(`Quiz generated in ${generationTime}s with ${quiz.questions.length} questions`);

// Edit quiz questions
await fetch(`/api/quiz/${quiz.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    questions: quiz.questions.map(q => ({
      ...q,
      question: q.question + ' (Edited)'
    }))
  })
});

// Publish quiz
await fetch(`/api/quiz/${quiz.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'published' })
});
```

### Performance Targets

The intelligent features meet these performance requirements:

- **Transcript Capture**: <2 seconds from speech to API availability
- **Help Detection**: <1 second analysis time
- **Alert Generation**: <5 seconds end-to-end (speech → alert)
- **Quiz Generation**: <30 seconds for 5 questions
- **Memory Usage**: <50MB per classroom session

Run `npm test tests/integration/test_performance.test.ts` to validate these targets.

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