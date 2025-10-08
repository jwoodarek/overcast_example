/**
 * Unit Tests: Utility Functions
 * 
 * Comprehensive tests for utility functions in lib/utils.ts
 * Tests cover normal operation, edge cases, and error conditions
 * 
 * WHY: Unit tests ensure utility functions work correctly in isolation
 * and handle edge cases gracefully. These tests serve as documentation
 * for how each utility function should behave.
 */

import {
  cn,
  generateUUID,
  validateUserName,
  validateClassroomId,
  formatTimestamp,
  getTimeElapsed,
  debounce,
  safeJsonParse,
  isValidUrl,
  truncateText,
  capitalize,
  logger,
  Logger,
  LogLevel,
  formatError,
  safeExecute,
  withErrorBoundary,
  withRetry,
  monitorPerformance,
  formatTimestampForExport,
  exportTranscriptAsCSV,
  exportTranscriptAsJSON,
  generateTranscriptFilename,
} from '@/lib/utils';
import { TranscriptEntry } from '@/lib/types';

// Mock console methods to prevent noise in test output
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

beforeAll(() => {
  global.console = mockConsole as any;
});

afterEach(() => {
  jest.clearAllMocks();
  logger.clearHistory();
});

describe('cn() - Class Name Merger', () => {
  test('combines multiple class names', () => {
    const result = cn('foo', 'bar', 'baz');
    expect(result).toBe('foo bar baz');
  });

  test('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });

  test('merges Tailwind classes correctly', () => {
    const result = cn('p-4', 'p-6'); // p-6 should override p-4
    expect(result).toBe('p-6');
  });

  test('handles empty values', () => {
    const result = cn('foo', null, undefined, false, '', 'bar');
    expect(result).toBe('foo bar');
  });

  test('handles arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });
});

describe('generateUUID()', () => {
  test('generates valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  test('generates unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
  });

  test('returns string of correct length', () => {
    const uuid = generateUUID();
    expect(uuid.length).toBe(36); // UUID format: 8-4-4-4-12 = 36 chars
  });
});

describe('validateUserName()', () => {
  test('accepts valid names', () => {
    const result = validateUserName('John Doe');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('rejects empty names', () => {
    const result = validateUserName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  test('rejects whitespace-only names', () => {
    const result = validateUserName('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  test('rejects names over 50 characters', () => {
    const longName = 'A'.repeat(51);
    const result = validateUserName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name must be 50 characters or less');
  });

  test('accepts names with exactly 50 characters', () => {
    const name = 'A'.repeat(50);
    const result = validateUserName(name);
    expect(result.isValid).toBe(true);
  });

  test('trims whitespace before validation', () => {
    const result = validateUserName('  John  ');
    expect(result.isValid).toBe(true);
  });
});

describe('validateClassroomId()', () => {
  test('accepts valid classroom IDs (1-6)', () => {
    for (let i = 1; i <= 6; i++) {
      expect(validateClassroomId(i.toString())).toBe(true);
    }
  });

  test('rejects invalid classroom IDs', () => {
    expect(validateClassroomId('0')).toBe(false);
    expect(validateClassroomId('7')).toBe(false);
    expect(validateClassroomId('10')).toBe(false);
    expect(validateClassroomId('abc')).toBe(false);
    expect(validateClassroomId('')).toBe(false);
  });

  test('rejects non-numeric IDs', () => {
    expect(validateClassroomId('1a')).toBe(false);
    expect(validateClassroomId('a1')).toBe(false);
  });
});

describe('formatTimestamp()', () => {
  test('formats date with default options', () => {
    const date = new Date('2024-01-15T14:30:45Z');
    const result = formatTimestamp(date);
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // HH:MM:SS format
  });

  test('formats date with custom options', () => {
    const date = new Date('2024-01-15T14:30:45Z');
    const result = formatTimestamp(date, { year: 'numeric', month: 'short', day: 'numeric' });
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });

  test('handles different date objects', () => {
    const date1 = new Date('2024-06-15T09:00:00Z');
    const date2 = new Date('2024-12-25T23:59:59Z');
    const result1 = formatTimestamp(date1);
    const result2 = formatTimestamp(date2);
    expect(result1).not.toBe(result2);
  });
});

describe('getTimeElapsed()', () => {
  test('formats seconds correctly', () => {
    const past = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    const result = getTimeElapsed(past);
    expect(result).toBe('30s');
  });

  test('formats minutes and seconds', () => {
    const past = new Date(Date.now() - 150 * 1000); // 2 minutes 30 seconds ago
    const result = getTimeElapsed(past);
    expect(result).toBe('2m 30s');
  });

  test('formats hours and minutes', () => {
    const past = new Date(Date.now() - 3700 * 1000); // 1 hour 1 minute 40 seconds ago
    const result = getTimeElapsed(past);
    expect(result).toBe('1h 1m');
  });

  test('handles zero elapsed time', () => {
    const now = new Date();
    const result = getTimeElapsed(now);
    expect(result).toMatch(/^0s$/);
  });
});

describe('debounce()', () => {
  jest.useFakeTimers();

  test('delays function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('cancels previous calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('passes arguments correctly', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});

describe('safeJsonParse()', () => {
  test('parses valid JSON', () => {
    const json = '{"name":"John","age":30}';
    const result = safeJsonParse(json);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  test('returns null for invalid JSON', () => {
    const invalidJson = '{name: John}'; // Invalid JSON
    const result = safeJsonParse(invalidJson);
    expect(result).toBeNull();
  });

  test('handles arrays', () => {
    const json = '[1, 2, 3]';
    const result = safeJsonParse(json);
    expect(result).toEqual([1, 2, 3]);
  });

  test('handles primitives', () => {
    expect(safeJsonParse('true')).toBe(true);
    expect(safeJsonParse('123')).toBe(123);
    expect(safeJsonParse('"string"')).toBe('string');
  });

  test('returns null for empty string', () => {
    const result = safeJsonParse('');
    expect(result).toBeNull();
  });
});

describe('isValidUrl()', () => {
  test('validates correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://overcast.daily.co/room-1')).toBe(true);
  });

  test('rejects invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('ftp://invalid')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  test('handles URLs with query parameters', () => {
    expect(isValidUrl('https://example.com?param=value')).toBe(true);
  });

  test('handles URLs with fragments', () => {
    expect(isValidUrl('https://example.com#section')).toBe(true);
  });
});

describe('truncateText()', () => {
  test('returns text as-is if under limit', () => {
    const text = 'Short text';
    expect(truncateText(text, 20)).toBe('Short text');
  });

  test('truncates text over limit', () => {
    const text = 'This is a very long text that should be truncated';
    const result = truncateText(text, 20);
    expect(result.length).toBe(20);
    expect(result).toContain('...');
  });

  test('handles exact length', () => {
    const text = 'Exact';
    expect(truncateText(text, 5)).toBe('Exact');
  });

  test('handles empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  test('adds ellipsis correctly', () => {
    const text = 'Long text here';
    const result = truncateText(text, 10);
    expect(result).toBe('Long te...');
  });
});

describe('capitalize()', () => {
  test('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('lowercases rest of string', () => {
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('hELLO')).toBe('Hello');
  });

  test('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  test('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  test('handles multiple words', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });
});

describe('Logger Class', () => {
  test('creates singleton instance', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    expect(logger1).toBe(logger2);
  });

  test('logs debug messages in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    logger.debug('Debug message', { key: 'value' });
    
    process.env.NODE_ENV = originalEnv;
  });

  test('logs info messages', () => {
    logger.info('Info message');
    expect(mockConsole.log).toHaveBeenCalled();
  });

  test('logs warning messages', () => {
    logger.warn('Warning message');
    expect(mockConsole.log).toHaveBeenCalled();
  });

  test('logs error messages', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', error);
    expect(mockConsole.log).toHaveBeenCalled();
  });

  test('stores log history', () => {
    logger.clearHistory();
    logger.info('Message 1');
    logger.warn('Message 2');
    
    const history = logger.getLogHistory();
    expect(history.length).toBe(2);
    expect(history[0].message).toBe('Message 1');
    expect(history[1].message).toBe('Message 2');
  });

  test('limits log history size', () => {
    logger.clearHistory();
    
    // Log more than maxHistorySize (100)
    for (let i = 0; i < 150; i++) {
      logger.info(`Message ${i}`);
    }
    
    const history = logger.getLogHistory();
    expect(history.length).toBe(100);
  });

  test('clears log history', () => {
    logger.info('Test message');
    expect(logger.getLogHistory().length).toBeGreaterThan(0);
    
    logger.clearHistory();
    expect(logger.getLogHistory().length).toBe(0);
  });
});

describe('formatError()', () => {
  test('formats error with message', () => {
    const error = new Error('Test error');
    const result = formatError(error);
    expect(result).toContain('Error: Test error');
  });

  test('includes stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Test error');
    const result = formatError(error);
    expect(result).toContain('Error: Test error');
    
    process.env.NODE_ENV = originalEnv;
  });

  test('respects includeStack parameter', () => {
    const error = new Error('Test error');
    const withStack = formatError(error, true);
    const withoutStack = formatError(error, false);
    
    expect(withStack.length).toBeGreaterThan(withoutStack.length);
  });
});

describe('safeExecute()', () => {
  test('returns success result for successful execution', async () => {
    const fn = async () => 'success';
    const result = await safeExecute(fn);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('success');
    }
  });

  test('returns error result for failed execution', async () => {
    const fn = async () => {
      throw new Error('Failed');
    };
    const result = await safeExecute(fn, 'Operation failed');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Failed');
    }
  });

  test('logs errors automatically', async () => {
    const fn = async () => {
      throw new Error('Test error');
    };
    await safeExecute(fn, 'Custom error message');
    
    expect(mockConsole.log).toHaveBeenCalled();
  });
});

describe('withErrorBoundary()', () => {
  test('returns function result on success', () => {
    const fn = () => 'success';
    const result = withErrorBoundary(fn, 'fallback');
    expect(result).toBe('success');
  });

  test('returns fallback on error', () => {
    const fn = () => {
      throw new Error('Failed');
    };
    const result = withErrorBoundary(fn, 'fallback');
    expect(result).toBe('fallback');
  });

  test('logs errors', () => {
    const fn = () => {
      throw new Error('Test error');
    };
    withErrorBoundary(fn, 'fallback', 'Custom error');
    
    expect(mockConsole.log).toHaveBeenCalled();
  });
});

describe('withRetry()', () => {
  jest.useFakeTimers();

  test('succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn, 3, 100);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    
    const promise = withRetry(fn, 3, 100);
    
    // Advance timers for retries
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('throws after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    const promise = withRetry(fn, 3, 100);
    
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    
    await expect(promise).rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});

describe('monitorPerformance()', () => {
  test('returns function result', async () => {
    const fn = async () => 'result';
    const result = await monitorPerformance(fn, 'test operation');
    expect(result).toBe('result');
  });

  test('logs slow operations', async () => {
    const slowFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
      return 'done';
    };
    
    await monitorPerformance(slowFn, 'slow operation', 1000);
    expect(mockConsole.log).toHaveBeenCalled();
  });

  test('logs operation errors', async () => {
    const fn = async () => {
      throw new Error('Operation failed');
    };
    
    await expect(monitorPerformance(fn, 'failing operation')).rejects.toThrow('Operation failed');
    expect(mockConsole.log).toHaveBeenCalled();
  });
});

// T058: Transcript Export Utilities Tests

describe('formatTimestampForExport() - Export Timestamp Formatter', () => {
  test('formats timestamp for export in ISO format', () => {
    const date = new Date('2025-10-08T14:30:45.123Z');
    const formatted = formatTimestampForExport(date);
    
    // Should be in ISO format
    expect(formatted).toBe('2025-10-08T14:30:45.123Z');
  });

  test('handles different timezones correctly', () => {
    const date = new Date('2025-10-08T00:00:00.000Z');
    const formatted = formatTimestampForExport(date);
    
    // Should preserve UTC
    expect(formatted).toContain('T00:00:00');
  });

  test('includes milliseconds in output', () => {
    const date = new Date('2025-10-08T14:30:45.789Z');
    const formatted = formatTimestampForExport(date);
    
    expect(formatted).toContain('.789Z');
  });

  test('handles edge case of year 2000', () => {
    const date = new Date('2000-01-01T00:00:00.000Z');
    const formatted = formatTimestampForExport(date);
    
    expect(formatted).toBe('2000-01-01T00:00:00.000Z');
  });
});

describe('exportTranscriptAsCSV() - CSV Export', () => {
  const mockTranscriptEntries: TranscriptEntry[] = [
    {
      id: 'entry-1',
      timestamp: new Date('2025-10-08T14:00:00.000Z'),
      speakerId: 'instructor-123',
      speakerName: 'Dr. Smith',
      role: 'instructor',
      text: 'Welcome to the class!',
      sessionId: 'session-1',
      confidence: 0.95,
    },
    {
      id: 'entry-2',
      timestamp: new Date('2025-10-08T14:01:00.000Z'),
      speakerId: 'student-456',
      speakerName: 'Alice',
      role: 'student',
      text: 'Thank you, professor!',
      sessionId: 'session-1',
      confidence: 0.92,
    },
  ];

  test('exports transcript entries as CSV with header', () => {
    const csv = exportTranscriptAsCSV(mockTranscriptEntries);
    
    // Should have header row
    expect(csv).toContain('Timestamp,Speaker,Text');
  });

  test('exports all entries with correct data', () => {
    const csv = exportTranscriptAsCSV(mockTranscriptEntries);
    
    // Should contain speaker names
    expect(csv).toContain('Dr. Smith');
    expect(csv).toContain('Alice');
    
    // Should contain text
    expect(csv).toContain('Welcome to the class!');
    expect(csv).toContain('Thank you, professor!');
  });

  test('escapes commas in text fields', () => {
    const entriesWithCommas: TranscriptEntry[] = [
      {
        id: 'entry-1',
        timestamp: new Date('2025-10-08T14:00:00.000Z'),
        speakerId: 'instructor-123',
        speakerName: 'Dr. Smith',
        role: 'instructor',
        text: 'First, second, and third points',
        sessionId: 'session-1',
      },
    ];
    
    const csv = exportTranscriptAsCSV(entriesWithCommas);
    
    // Text with commas should be quoted
    expect(csv).toContain('"First, second, and third points"');
  });

  test('escapes quotes in text fields', () => {
    const entriesWithQuotes: TranscriptEntry[] = [
      {
        id: 'entry-1',
        timestamp: new Date('2025-10-08T14:00:00.000Z'),
        speakerId: 'instructor-123',
        speakerName: 'Dr. Smith',
        role: 'instructor',
        text: 'He said "hello" to everyone',
        sessionId: 'session-1',
      },
    ];
    
    const csv = exportTranscriptAsCSV(entriesWithQuotes);
    
    // Quotes should be escaped
    expect(csv).toContain('""hello""');
  });

  test('escapes newlines in text fields', () => {
    const entriesWithNewlines: TranscriptEntry[] = [
      {
        id: 'entry-1',
        timestamp: new Date('2025-10-08T14:00:00.000Z'),
        speakerId: 'instructor-123',
        speakerName: 'Dr. Smith',
        role: 'instructor',
        text: 'Line 1\nLine 2',
        sessionId: 'session-1',
      },
    ];
    
    const csv = exportTranscriptAsCSV(entriesWithNewlines);
    
    // Should be quoted to preserve newlines
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  test('handles empty transcript entries', () => {
    const csv = exportTranscriptAsCSV([]);
    
    // Should still have header
    expect(csv).toBe('Timestamp,Speaker,Text\n');
  });

  test('sorts entries chronologically', () => {
    const unsortedEntries: TranscriptEntry[] = [
      {
        id: 'entry-2',
        timestamp: new Date('2025-10-08T14:02:00.000Z'),
        speakerId: 'student-456',
        speakerName: 'Bob',
        role: 'student',
        text: 'Second message',
        sessionId: 'session-1',
      },
      {
        id: 'entry-1',
        timestamp: new Date('2025-10-08T14:01:00.000Z'),
        speakerId: 'student-123',
        speakerName: 'Alice',
        role: 'student',
        text: 'First message',
        sessionId: 'session-1',
      },
    ];
    
    const csv = exportTranscriptAsCSV(unsortedEntries);
    const lines = csv.split('\n');
    
    // Alice's message (earlier timestamp) should come before Bob's
    const aliceIndex = csv.indexOf('Alice');
    const bobIndex = csv.indexOf('Bob');
    expect(aliceIndex).toBeLessThan(bobIndex);
  });
});

describe('exportTranscriptAsJSON() - JSON Export', () => {
  const mockTranscriptEntries: TranscriptEntry[] = [
    {
      id: 'entry-1',
      timestamp: new Date('2025-10-08T14:00:00.000Z'),
      speakerId: 'instructor-123',
      speakerName: 'Dr. Smith',
      role: 'instructor',
      text: 'Welcome!',
      sessionId: 'session-1',
      confidence: 0.95,
    },
  ];

  test('exports transcript as valid JSON', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    
    // Should be parseable
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('includes session metadata', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.session_id).toBe('session-1');
    expect(parsed.classroom_name).toBe('Cohort 1');
  });

  test('includes export timestamp', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.exported_at).toBeDefined();
    expect(new Date(parsed.exported_at)).toBeInstanceOf(Date);
  });

  test('includes session start time when provided', () => {
    const sessionStart = new Date('2025-10-08T14:00:00.000Z');
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries,
      sessionStart
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.session_start).toBe('2025-10-08T14:00:00.000Z');
  });

  test('includes all transcript entries', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].speaker_name).toBe('Dr. Smith');
    expect(parsed.entries[0].text).toBe('Welcome!');
  });

  test('formats timestamps in entries', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.entries[0].timestamp).toBe('2025-10-08T14:00:00.000Z');
  });

  test('includes confidence scores', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      mockTranscriptEntries
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.entries[0].confidence).toBe(0.95);
  });

  test('handles empty entries array', () => {
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      []
    );
    const parsed = JSON.parse(json);
    
    expect(parsed.entries).toEqual([]);
  });

  test('sorts entries chronologically in JSON', () => {
    const unsortedEntries: TranscriptEntry[] = [
      {
        id: 'entry-2',
        timestamp: new Date('2025-10-08T14:02:00.000Z'),
        speakerId: 'student-456',
        speakerName: 'Bob',
        role: 'student',
        text: 'Second',
        sessionId: 'session-1',
      },
      {
        id: 'entry-1',
        timestamp: new Date('2025-10-08T14:01:00.000Z'),
        speakerId: 'student-123',
        speakerName: 'Alice',
        role: 'student',
        text: 'First',
        sessionId: 'session-1',
      },
    ];
    
    const json = exportTranscriptAsJSON(
      'session-1',
      'Cohort 1',
      unsortedEntries
    );
    const parsed = JSON.parse(json);
    
    // Alice's entry should come first (earlier timestamp)
    expect(parsed.entries[0].speaker_name).toBe('Alice');
    expect(parsed.entries[1].speaker_name).toBe('Bob');
  });
});

describe('generateTranscriptFilename() - Filename Generator', () => {
  test('generates filename with session ID and date', () => {
    const filename = generateTranscriptFilename('session-123', 'csv');
    
    expect(filename).toContain('transcript-session-123');
    expect(filename).toContain('.csv');
  });

  test('includes current date in filename', () => {
    const filename = generateTranscriptFilename('session-123', 'json');
    
    // Should contain a date pattern like 2025-10-08
    expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('handles JSON format extension', () => {
    const filename = generateTranscriptFilename('session-123', 'json');
    
    expect(filename).toEndWith('.json');
  });

  test('handles CSV format extension', () => {
    const filename = generateTranscriptFilename('session-123', 'csv');
    
    expect(filename).toEndWith('.csv');
  });

  test('sanitizes session ID for safe filenames', () => {
    const filename = generateTranscriptFilename('session/with/slashes', 'csv');
    
    // Slashes should be removed or replaced
    expect(filename).not.toContain('/');
  });
});


