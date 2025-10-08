# Research: Intelligent Education Video Platform

**Phase 0 Output** | **Date**: October 7, 2025  
**Purpose**: Resolve technical unknowns before design phase

## Research Questions

### 1. Transcription Service Selection

**Question**: Should we use Daily.co's built-in transcription, or integrate a third-party service?

**Options Evaluated**:

| Option | Pros | Cons | Cost | Real-time? |
|--------|------|------|------|------------|
| **Daily.co Transcription** | Native integration, no extra SDK | Limited to Enterprise plan, speaker ID unclear | Included in plan | Yes (streaming) |
| **Deepgram** | Excellent real-time, speaker diarization, education-optimized | Additional service dependency | $0.0043/min | Yes (WebSocket) |
| **AssemblyAI** | High accuracy, good docs, speaker labels | REST-based (not true streaming) | $0.00025/sec | Near real-time (polling) |
| **Web Speech API** | Free, browser-native, zero setup | Poor accuracy, no speaker ID, browser-dependent | Free | Yes (streaming) |

**Decision**: **Deepgram** for production, **Web Speech API** for MVP/testing

**Rationale**:
- Web Speech API is perfect for initial MVP: zero setup, free, proves the concept
- Deepgram provides production-ready accuracy with speaker diarization
- Education-specific language models available
- WebSocket streaming enables true real-time (<1s latency)
- Easy to swap: abstract behind TranscriptionService interface

**Migration Path**:
1. Start with Web Speech API (proves UX, no API key needed)
2. Add Deepgram when accuracy matters (simple environment variable switch)
3. Consider Daily.co native transcription if they release it for our tier

**Implementation Notes**:
```typescript
// Interface allows swapping implementations
interface TranscriptionProvider {
  startCapture(sessionId: string): Promise<void>;
  stopCapture(sessionId: string): Promise<void>;
  onTranscript(callback: (entry: TranscriptEntry) => void): void;
}

// Start with WebSpeechProvider, swap to DeepgramProvider later
```

---

### 2. LLM Service for Quiz Generation

**Question**: Which LLM API should we use for generating quiz questions?

**Options Evaluated**:

| LLM | Quiz Quality | Speed | Cost per 5 questions | Structured Output | Context Window |
|-----|--------------|-------|----------------------|-------------------|----------------|
| **GPT-4 Turbo** | Excellent | 8-12s | ~$0.02 | JSON mode | 128k tokens |
| **GPT-3.5 Turbo** | Good | 2-4s | ~$0.002 | JSON mode | 16k tokens |
| **Claude 3.5 Sonnet** | Excellent | 6-10s | ~$0.015 | Prompt-based | 200k tokens |
| **Claude 3 Haiku** | Good | 1-2s | ~$0.001 | Prompt-based | 200k tokens |

**Decision**: **GPT-3.5 Turbo** for MVP, **Claude 3.5 Sonnet** for production

**Rationale**:
- GPT-3.5 Turbo is fast enough (<5s) and cheap for testing
- Native JSON mode ensures reliable structured output (no parsing errors)
- Claude 3.5 Sonnet produces better educational explanations (important for learning)
- Both APIs well-documented and easy to integrate
- Can support both via environment variable configuration

**Sample Prompt** (GPT-3.5 Turbo with JSON mode):
```
You are an educational quiz generator. Based on the following instructor transcript, 
create 5 quiz questions to test student understanding.

Requirements:
- 3 multiple choice questions (4 options each, only 1 correct)
- 2 true/false questions
- Questions should test understanding, not memorization
- Include brief explanations for each answer
- Difficulty: mixed (2 easy, 2 medium, 1 hard)

Transcript:
{instructor_transcript}

Output as JSON matching this schema:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false",
      "question": "string",
      "options": ["A", "B", "C", "D"],  // omit for true/false
      "correctAnswer": "A" | true | false,
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
```

**Cost Estimate**:
- Average transcript: 2000 tokens
- Response: 800 tokens
- GPT-3.5: ~$0.002 per quiz (500 quizzes per $1)
- Claude Sonnet: ~$0.015 per quiz (67 quizzes per $1)

---

### 3. Help Detection Patterns

**Question**: What keywords and patterns indicate students need help in educational settings?

**Research Sources**:
- Education research on meta-cognitive language
- Common classroom observation studies
- Existing educational chatbot pattern databases

**Categories of Help Indicators**:

**Direct Help Requests** (High Confidence):
- "I need help"
- "Can you help me?"
- "I don't understand"
- "I'm confused"
- "I'm stuck"
- "This doesn't make sense"

**Confusion Indicators** (Medium Confidence):
- "Wait, what?"
- "I'm lost"
- "Can you explain that again?"
- "What does [term] mean?"
- "How do you do [task]?"
- "I don't get it"

**Frustration Signals** (High Urgency):
- "This is too hard"
- "I can't do this"
- "I give up"
- "This is frustrating"

**Question Patterns** (Low-Medium Confidence):
- Repeated questions about same concept
- Multiple "why" or "how" questions in short time
- Silence after instructor explanation (possible indication of not understanding)

**False Positives to Avoid**:
- "I understand" (opposite meaning)
- "That makes sense" (positive)
- Rhetorical questions in explanations
- Social conversation ("How's your day?")

**Detection Algorithm**:
```typescript
interface HelpPattern {
  keywords: string[];
  urgency: 'low' | 'medium' | 'high';
  requiresContext: boolean;  // Need surrounding sentences?
  falsePositiveCheck: string[];  // Exclude if these are present
}

const HELP_PATTERNS: HelpPattern[] = [
  {
    keywords: ['stuck', 'help me', 'I need help'],
    urgency: 'high',
    requiresContext: false,
    falsePositiveCheck: []
  },
  {
    keywords: ['don\'t understand', 'confused', 'lost'],
    urgency: 'medium',
    requiresContext: true,
    falsePositiveCheck: ['I understand', 'no longer']
  },
  // ... more patterns
];

// Scoring: keyword match + recency + frequency = urgency level
```

**Topic Extraction**:
- Look at nouns and verbs near help keywords
- "I don't understand [derivatives]" → topic: "derivatives"
- Use simple NLP library (compromise.js) for part-of-speech tagging
- Fallback: last 3 nouns mentioned in conversation

**Decision**: Keyword-based pattern matching with simple NLP for topic extraction

**Rationale**:
- Simple to implement and test
- No ML model training required (keeps it newcomer-friendly)
- Transparent (instructor can see which keywords triggered alert)
- Easy to tune (adjust keyword list based on false positives)
- Good enough for MVP (can upgrade to ML model later if needed)

---

### 4. Real-Time Architecture

**Question**: How should we process transcripts and generate alerts with minimal latency?

**Options Evaluated**:

**Option A: Webhook-based**
```
Transcription Service → Webhook → API Route → Analysis → Alert Store → UI Poll
```
Pros: Real-time, no polling overhead  
Cons: Requires public endpoint (ngrok for local dev), webhook management complexity

**Option B: Polling**
```
UI → Poll API every 2s → Check for new transcripts → Analysis → Alert Store
```
Pros: Simple, works locally, no webhook setup  
Cons: 2s latency, more API calls, harder to scale

**Option C: Server-Sent Events (SSE)**
```
Transcription Service → In-memory queue → SSE stream → UI receives live
```
Pros: True real-time, one-way (perfect for alerts), native browser support  
Cons: Requires persistent connection, more complex than polling

**Option D: WebSocket**
```
Transcription Service → WebSocket server → Bidirectional stream → UI
```
Pros: True real-time, bidirectional (if needed later)  
Cons: Overkill for one-way alerts, requires WebSocket server setup

**Decision**: **Option B (Polling)** for MVP, **Option C (SSE)** for production

**Rationale**:
- Polling is simplest for local development (no webhook, no WebSocket server)
- 2-second latency acceptable for MVP (5-second alert target still met)
- SSE provides better UX without significant complexity increase
- Easy migration path: API route stays same, just change response type to SSE

**Implementation**:

*Polling Version (MVP)*:
```typescript
// Client-side: poll every 2 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/alerts/${sessionId}?status=pending`);
    const { alerts } = await response.json();
    setAlerts(alerts);
  }, 2000);
  return () => clearInterval(interval);
}, [sessionId]);
```

*SSE Version (Production)*:
```typescript
// Server: api/alerts/stream/[sessionId]/route.ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      alertStore.subscribe(sessionId, (alert) => {
        controller.enqueue(`data: ${JSON.stringify(alert)}\n\n`);
      });
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

// Client: use EventSource API
const eventSource = new EventSource(`/api/alerts/stream/${sessionId}`);
eventSource.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  setAlerts(prev => [...prev, alert]);
};
```

**Performance Target**: <5 seconds from student speech to instructor alert
- Transcription: 1-2s (Web Speech immediate, Deepgram <1s)
- Analysis: <1s (keyword matching is fast)
- Polling delay: 0-2s (average 1s)
- UI render: <100ms
- **Total: 2-5s** ✅

---

### 5. In-Memory State Management

**Question**: How should we structure in-memory stores for transcripts, alerts, and quizzes?

**Requirements**:
- Store data during session (lost on server restart = acceptable for MVP)
- Fast lookups by sessionId
- Automatic cleanup when sessions end
- Thread-safe (if Next.js API routes are multi-threaded)
- Simple to test

**Options Evaluated**:

**Option A: Plain JavaScript Map**
```typescript
const transcripts = new Map<string, TranscriptEntry[]>();
```
Pros: Zero dependencies, simplest possible  
Cons: No built-in cleanup, no type safety, no event emission

**Option B: Custom Store Class**
```typescript
class TranscriptStore {
  private data = new Map<string, TranscriptEntry[]>();
  add(sessionId: string, entry: TranscriptEntry): void { }
  get(sessionId: string): TranscriptEntry[] { }
  clear(sessionId: string): void { }
}
```
Pros: Encapsulation, type-safe, easy to test  
Cons: More code (but minimal)

**Option C: EventEmitter-based Store**
```typescript
class TranscriptStore extends EventEmitter {
  add(entry: TranscriptEntry): void {
    this.data.set(entry.sessionId, entry);
    this.emit('transcript:added', entry);  // For SSE later
  }
}
```
Pros: Built-in pub/sub for real-time updates, easy SSE migration  
Cons: Slightly more complex, adds Node EventEmitter dependency

**Option D: Zustand or Redux**
Pros: Well-tested, React ecosystem  
Cons: Overkill for server-side state, designed for client-side

**Decision**: **Option B (Custom Store Class)** with upgrade path to Option C

**Rationale**:
- Custom class provides encapsulation without complexity
- Easy to add EventEmitter later when we implement SSE
- Type-safe TypeScript interfaces
- Simple to mock for testing
- Constitutional principle: start simple, add complexity only when needed

**Implementation**:

```typescript
// lib/store/transcript-store.ts
export class TranscriptStore {
  private transcripts = new Map<string, TranscriptEntry[]>();

  /**
   * Add a transcript entry for a session.
   * WHY: Append-only pattern ensures we never lose history during active session.
   */
  add(sessionId: string, entry: TranscriptEntry): void {
    const existing = this.transcripts.get(sessionId) || [];
    this.transcripts.set(sessionId, [...existing, entry]);
  }

  /**
   * Get all transcripts for a session, optionally filtered.
   * WHY: Filtering by role/timestamp here keeps API routes simple.
   */
  get(sessionId: string, options?: {
    since?: Date;
    role?: 'instructor' | 'student';
  }): TranscriptEntry[] {
    let entries = this.transcripts.get(sessionId) || [];
    
    if (options?.since) {
      entries = entries.filter(e => e.timestamp > options.since);
    }
    
    if (options?.role) {
      entries = entries.filter(e => e.speakerRole === options.role);
    }
    
    return entries;
  }

  /**
   * Clear transcripts when session ends.
   * WHY: Prevent memory leaks. Called when last participant leaves classroom.
   */
  clear(sessionId: string): void {
    this.transcripts.delete(sessionId);
  }

  /**
   * Get all active session IDs.
   * WHY: Useful for debugging and cleanup monitoring.
   */
  getSessions(): string[] {
    return Array.from(this.transcripts.keys());
  }
}

// Singleton instance (shared across all API routes)
export const transcriptStore = new TranscriptStore();
```

**Lifecycle Management**:
```typescript
// Hook into Daily.co room events
callObject.on('left-meeting', () => {
  // If last participant, clear session data
  if (remainingParticipants.length === 0) {
    transcriptStore.clear(sessionId);
    alertStore.clear(sessionId);
    // Quizzes persist (instructor may want to reuse)
  }
});
```

**Memory Safety**:
- Each transcript entry: ~200 bytes
- 50 participants × 100 entries/participant = 5000 entries
- 5000 × 200 bytes = 1MB per classroom session
- 6 classrooms = 6MB maximum (acceptable)
- Auto-cleanup prevents unbounded growth

---

## Best Practices Research

### Daily.co Integration

**Transcription Hooks**:
```typescript
// Check if Daily.co provides transcription events
callObject.on('transcription-message', (event) => {
  // This may exist in Enterprise plan
  // If not available, fall back to Web Speech API
});
```

**Breakout Room Monitoring**:
```typescript
// Each breakout room gets its own sessionId
// Use Daily's breakout room API to track which participants are in which room
callObject.createBreakoutRooms([
  { name: 'Group 1', participantIds: ['p1', 'p2'] },
  { name: 'Group 2', participantIds: ['p3', 'p4'] }
]);

// Monitor each breakout room independently
callObject.on('breakout-room-updated', (event) => {
  const { roomName, participants } = event;
  // Start transcript capture for this breakout room session
});
```

### OpenAI API Best Practices

**Rate Limiting**:
- GPT-3.5 Turbo: 3,500 requests/minute (plenty for our use case)
- Add retry logic with exponential backoff
- Cache quiz generation prompts to avoid duplicates

**Error Handling**:
```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,  // Some creativity, but consistent
    max_tokens: 1000
  });
  return JSON.parse(response.choices[0].message.content);
} catch (error) {
  if (error.status === 429) {
    // Rate limited: retry after delay
    await sleep(2000);
    return generateQuiz(transcript);  // Retry once
  }
  throw new Error(`Quiz generation failed: ${error.message}`);
}
```

### Next.js API Route Patterns

**Streaming Responses** (for future SSE):
```typescript
// Next.js 15 supports streaming responses natively
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Emit events as they arrive
      alertStore.on('alert:created', (alert) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(alert)}\n\n`));
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## Security Considerations

### API Key Storage

**Environment Variables**:
```bash
# Add to .env.local
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...  # For production transcription

# NEVER expose these to client
# Use server-side API routes only
```

### Data Privacy

**Transcript Storage**:
- In-memory only = automatically complies with "no persistent storage" requirement
- Cleared when session ends = minimal data retention
- No transcript export feature in MVP = reduces data leakage risk
- FERPA compliance: notify participants at session start

**Student Privacy**:
- Instructors see aggregated patterns, not individual student transcripts (unless debugging)
- Alert shows "Room 2 needs help with X" not "Student John doesn't understand X"
- Quiz questions don't reference specific student questions/mistakes

---

## Performance Benchmarks

### Expected Latency

| Operation | Target | Strategy |
|-----------|--------|----------|
| Speech → Transcript | <2s | Web Speech (instant), Deepgram (<1s) |
| Transcript → Analysis | <1s | Keyword matching (milliseconds) |
| Analysis → Alert | <1s | In-memory store write (microseconds) |
| Alert → UI | <2s | Polling (average 1s), SSE (instant) |
| **Total: Help Detection** | **<5s** | ✅ Meets requirement |
| Quiz Generation | <30s | LLM API call (10s) + processing (2s) |
| Transcript Retrieval | <500ms | In-memory Map lookup |

### Scalability Limits (MVP)

- **Concurrent classrooms**: 6 (pre-configured)
- **Participants per classroom**: 50 (Daily.co limit)
- **Breakout rooms per classroom**: 10 (reasonable limit)
- **Transcripts per session**: ~5000 entries (1MB)
- **Alerts per session**: ~50 (10KB)
- **Memory usage per classroom**: ~2MB
- **Total memory**: ~12MB (6 classrooms)

MVP can handle expected load without issues. Database needed only for:
- Historical transcript analysis
- Cross-session analytics
- Persistent quiz library

---

## Alternatives Considered and Rejected

### Why Not Use WebSockets Everywhere?

**Rejected because**:
- Adds deployment complexity (Vercel serverless doesn't support WebSockets natively)
- Requires separate WebSocket server or third-party service (Pusher, Ably)
- Polling + SSE covers our needs with less infrastructure
- Constitutional principle: simplest approach first

### Why Not Build Custom Speech Recognition Model?

**Rejected because**:
- Massive complexity (ML training, dataset, hosting)
- Months of development vs. hours with existing APIs
- Off-the-shelf solutions (Deepgram, Web Speech) are sufficient
- No competitive advantage in transcription quality
- Constitutional principle: avoid premature optimization

### Why Not Use Database for MVP?

**Rejected because**:
- Local development requirement: no database setup barrier
- Memory is sufficient for single-session data (12MB)
- Faster iteration (no schema migrations, no ORM)
- Can add PostgreSQL later without architecture changes (just swap stores)
- Constitutional principle: defer complexity until needed

---

## Research Conclusion

All technical unknowns resolved:

- ✅ **Transcription**: Web Speech API (MVP) → Deepgram (production)
- ✅ **LLM**: GPT-3.5 Turbo (MVP) → Claude Sonnet (production)
- ✅ **Help Detection**: Keyword patterns with simple NLP
- ✅ **Architecture**: Polling (MVP) → SSE (production)
- ✅ **State Management**: Custom store classes with EventEmitter upgrade path

**Ready to proceed to Phase 1 (Design & Contracts)**

---

*Research completed: October 7, 2025*


