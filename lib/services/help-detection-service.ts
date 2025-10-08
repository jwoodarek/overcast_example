/**
 * HelpDetectionService
 * 
 * Analyzes transcript entries for patterns indicating students need help.
 * Uses keyword matching and simple NLP for topic extraction.
 * 
 * WHY keyword-based approach:
 * - Simple to implement and test (no ML training needed)
 * - Transparent (instructors can see which keywords triggered alerts)
 * - Easy to tune based on false positives
 * - Good enough for MVP (can upgrade to ML model later)
 * 
 * WHY topic extraction:
 * - Helps instructors quickly understand what students struggle with
 * - Uses simple noun extraction from context around help keywords
 * - Fallback to last mentioned topic if extraction fails
 */

import { TranscriptEntry, HelpAlert } from '@/lib/types';
import { transcriptStore } from '@/lib/store';
import { alertStore } from '@/lib/store';
import { 
  HELP_KEYWORDS, 
  URGENCY_THRESHOLDS, 
  FALSE_POSITIVE_PHRASES,
  DEFAULT_CONFIDENCE_THRESHOLD 
} from '@/lib/constants';

/**
 * Pattern definition for help detection
 */
interface HelpPattern {
  keywords: string[];
  urgency: 'low' | 'medium' | 'high';
  weight: number; // Used for urgency calculation
}

/**
 * Result of analyzing a transcript for help patterns
 */
interface DetectionResult {
  detected: boolean;
  matchedKeywords: string[];
  urgency: 'low' | 'medium' | 'high';
  contextSnippet: string;
  topic: string;
  sourceTranscriptIds: string[];
}

export class HelpDetectionService {
  /**
   * Analyze transcripts for a session and generate help alerts.
   * 
   * @param sessionId - The session ID to analyze (classroom or breakout room)
   * @param options - Analysis options
   * @returns Array of generated alerts
   * 
   * WHY this approach:
   * - Processes all recent transcripts in one pass (efficient)
   * - Groups related help indicators (multiple "I'm confused" = one alert)
   * - Only creates alerts above minimum confidence threshold
   */
  async analyzeTranscripts(
    sessionId: string,
    options: {
      since?: Date;
      minConfidence?: number;
      classroomSessionId?: string; // For breakout rooms, the main classroom ID
    } = {}
  ): Promise<HelpAlert[]> {
    const minConfidence = options.minConfidence ?? DEFAULT_CONFIDENCE_THRESHOLD;
    
    // Get recent transcripts for analysis
    const transcripts = transcriptStore.get(sessionId, {
      since: options.since,
      minConfidence,
    });

    if (transcripts.length === 0) {
      return [];
    }

    // Analyze transcripts for help patterns
    const detections = this.detectHelpPatterns(transcripts);

    // Create alerts from detections
    const alerts: HelpAlert[] = [];
    for (const detection of detections) {
      if (detection.detected) {
        const alert = this.createAlert(
          sessionId,
          options.classroomSessionId || sessionId,
          detection,
          transcripts
        );
        
        // Store the alert
        alertStore.create(alert);
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Detect help patterns in a set of transcripts.
   * 
   * WHY group by speaker:
   * - One student saying "I'm confused" multiple times = one alert
   * - Multiple students saying it = higher urgency
   * - Prevents alert spam
   */
  private detectHelpPatterns(transcripts: TranscriptEntry[]): DetectionResult[] {
    const detections: DetectionResult[] = [];

    // Group transcripts by speaker to detect repeated confusion
    const bySpeaker = this.groupBySpeaker(transcripts);

    for (const [speakerId, entries] of bySpeaker.entries()) {
      // Skip instructor transcripts (only analyze student speech)
      if (entries[0]?.speakerRole === 'instructor') {
        continue;
      }

      const detection = this.analyzeStudentTranscripts(entries);
      if (detection.detected) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Analyze a single student's transcripts for help indicators.
   */
  private analyzeStudentTranscripts(entries: TranscriptEntry[]): DetectionResult {
    const matchedKeywords: string[] = [];
    const sourceIds: string[] = [];
    let urgencyScore = 0;

    // Check each transcript entry for help keywords
    for (const entry of entries) {
      const text = entry.text.toLowerCase();

      // Check for false positives first
      if (this.isFalsePositive(text)) {
        continue;
      }

      // Check against all help keyword patterns
      for (const category in HELP_KEYWORDS) {
        const patterns = HELP_KEYWORDS[category as keyof typeof HELP_KEYWORDS];
        
        for (const pattern of patterns) {
          if (text.includes(pattern.toLowerCase())) {
            matchedKeywords.push(pattern);
            sourceIds.push(entry.id);
            
            // Add to urgency score based on pattern category
            urgencyScore += this.getKeywordWeight(category, pattern);
          }
        }
      }
    }

    // No help indicators found
    if (matchedKeywords.length === 0) {
      return {
        detected: false,
        matchedKeywords: [],
        urgency: 'low',
        contextSnippet: '',
        topic: '',
        sourceTranscriptIds: [],
      };
    }

    // Calculate final urgency level
    const urgency = this.calculateUrgency(urgencyScore, matchedKeywords.length);

    // Extract topic from context
    const topic = this.extractTopic(entries, matchedKeywords);

    // Build context snippet (2-3 sentences around detection)
    const contextSnippet = this.buildContextSnippet(entries);

    return {
      detected: true,
      matchedKeywords: Array.from(new Set(matchedKeywords)), // Remove duplicates
      urgency,
      contextSnippet,
      topic,
      sourceTranscriptIds: Array.from(new Set(sourceIds)),
    };
  }

  /**
   * Check if text contains false positive phrases.
   * 
   * WHY: Avoid alerting on positive statements like "Now I understand!"
   */
  private isFalsePositive(text: string): boolean {
    return FALSE_POSITIVE_PHRASES.some(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  /**
   * Get weight for a keyword based on its category.
   * 
   * WHY different weights:
   * - "help me" is more urgent than "what does this mean?"
   * - "I give up" is critical, needs immediate attention
   * - Weight influences final urgency calculation
   */
  private getKeywordWeight(category: string, keyword: string): number {
    const weights: Record<string, number> = {
      'direct_help': 3,      // "I need help", "help me"
      'confusion': 2,        // "I don't understand", "confused"
      'frustration': 4,      // "I give up", "too hard"
      'questions': 1,        // "What does this mean?"
    };

    return weights[category] || 1;
  }

  /**
   * Calculate urgency level based on score and frequency.
   * 
   * WHY this formula:
   * - More keywords = higher urgency (student really struggling)
   * - Higher weighted keywords = higher urgency (stronger signals)
   * - Thresholds tuned based on research (can adjust based on feedback)
   */
  private calculateUrgency(
    score: number, 
    keywordCount: number
  ): 'low' | 'medium' | 'high' {
    // Multiple strong keywords = high urgency
    if (score >= URGENCY_THRESHOLDS.high || keywordCount >= 3) {
      return 'high';
    }
    
    // Moderate keywords or repeated confusion = medium
    if (score >= URGENCY_THRESHOLDS.medium || keywordCount >= 2) {
      return 'medium';
    }
    
    // Single mild keyword = low urgency
    return 'low';
  }

  /**
   * Extract topic from transcript context.
   * 
   * WHY simple approach:
   * - Look for nouns near help keywords
   * - Use regex to find technical terms (capitalized, quoted)
   * - Fallback to last mentioned concept
   * 
   * Future enhancement: Use compromise.js for proper NLP
   */
  private extractTopic(
    entries: TranscriptEntry[], 
    keywords: string[]
  ): string {
    // Combine all text
    const fullText = entries.map(e => e.text).join(' ');
    
    // Try to find quoted terms (often indicate concepts)
    const quotedMatch = fullText.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Look for common technical terms or capitalized words
    const words = fullText.split(/\s+/);
    const technicalTerms = words.filter(word => 
      word.length > 3 && 
      /^[A-Z]/.test(word) && 
      word !== word.toUpperCase() // Not all caps (acronyms)
    );

    if (technicalTerms.length > 0) {
      return technicalTerms[0];
    }

    // Fallback: look for nouns in last few sentences
    // Simple heuristic: words that aren't common stop words
    const stopWords = ['this', 'that', 'what', 'how', 'why', 'when', 'where', 'the', 'a', 'an', 'is', 'are', 'was', 'were'];
    const lastSentence = entries[entries.length - 1]?.text || '';
    const nouns = lastSentence
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.includes(word) &&
        !keywords.some(k => k.toLowerCase().includes(word))
      );

    if (nouns.length > 0) {
      return nouns[0];
    }

    // Last resort: generic topic
    return 'current concept';
  }

  /**
   * Build context snippet from transcripts.
   * 
   * WHY 2-3 sentences:
   * - Enough context for instructor to understand situation
   * - Not too long to read quickly
   * - Shows conversation flow
   */
  private buildContextSnippet(entries: TranscriptEntry[]): string {
    // Take last 3 entries or all if fewer
    const recentEntries = entries.slice(-3);
    
    const snippet = recentEntries
      .map(e => `${e.speakerName}: "${e.text}"`)
      .join(' ');

    // Truncate to max 300 characters (per data model)
    if (snippet.length > 300) {
      return snippet.substring(0, 297) + '...';
    }

    return snippet;
  }

  /**
   * Create a HelpAlert from detection results.
   */
  private createAlert(
    sessionId: string,
    classroomSessionId: string,
    detection: DetectionResult,
    transcripts: TranscriptEntry[]
  ): HelpAlert {
    // Get breakout room name if applicable
    const breakoutRoomName = transcripts[0]?.breakoutRoomName || null;

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      classroomSessionId,
      breakoutRoomSessionId: sessionId,
      breakoutRoomName,
      detectedAt: new Date(),
      topic: detection.topic,
      urgency: detection.urgency,
      triggerKeywords: detection.matchedKeywords,
      contextSnippet: detection.contextSnippet,
      status: 'pending',
      acknowledgedBy: null,
      acknowledgedAt: null,
      sourceTranscriptIds: detection.sourceTranscriptIds,
    };
  }

  /**
   * Group transcripts by speaker ID.
   * 
   * WHY: Analyze each student's speech separately to detect individual confusion
   */
  private groupBySpeaker(
    transcripts: TranscriptEntry[]
  ): Map<string, TranscriptEntry[]> {
    const grouped = new Map<string, TranscriptEntry[]>();

    for (const entry of transcripts) {
      const existing = grouped.get(entry.speakerId) || [];
      existing.push(entry);
      grouped.set(entry.speakerId, existing);
    }

    return grouped;
  }
}

// Export singleton instance
export const helpDetectionService = new HelpDetectionService();

