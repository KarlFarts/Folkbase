/**
 * Event Detector Service
 * Detects event and date/time mentions in text
 */

import stringSimilarity from 'string-similarity';
import { normalizeText } from '../utils/textAnalyzer';
import { isIgnored } from './braindumpPreferences';

// Threshold for fuzzy event name matching
const EVENT_NAME_SIMILARITY_THRESHOLD = 0.75;

// Event-related keywords
const EVENT_KEYWORDS = [
  'meeting', 'conference', 'workshop', 'seminar', 'event', 'session',
  'call', 'appointment', 'interview', 'presentation', 'webinar',
  'attending', 'scheduled', 'happening',
];

/**
 * Detect event mentions in text
 * @param {string} text - The text to analyze
 * @param {Array} events - Array of event objects
 * @returns {Array<{text: string, eventId: string, confidence: number, position: number, matchType: string}>}
 */
export function detectEvents(text, events = []) {
  if (!text || !events || events.length === 0) {
    return [];
  }

  const detectedEvents = [];
  const seenEventIds = new Set();

  // Match event names
  events.forEach(event => {
    if (!event['Event Name']) return;

    const eventName = event['Event Name'];
    if (isIgnored(eventName, 'event')) return;

    const matches = findEventNameInText(text, eventName);

    matches.forEach(match => {
      if (!seenEventIds.has(event['Event ID'])) {
        seenEventIds.add(event['Event ID']);
        detectedEvents.push({
          text: match.text,
          eventId: event['Event ID'],
          confidence: match.confidence,
          position: match.position,
          matchType: 'event-name',
          event,
        });
      }
    });
  });

  // Detect date/time patterns with event keywords
  const dateTimePatterns = extractDateTimePatterns(text);
  dateTimePatterns.forEach(pattern => {
    // Only add if it has event context
    if (pattern.hasEventContext) {
      detectedEvents.push({
        text: pattern.text,
        confidence: pattern.confidence,
        position: pattern.position,
        matchType: 'date-time',
        dateTime: pattern.dateTime,
      });
    }
  });

  // Sort by confidence (highest first)
  detectedEvents.sort((a, b) => b.confidence - a.confidence);

  return detectedEvents;
}

/**
 * Find event name mentions in text
 * @param {string} text - The text to search in
 * @param {string} eventName - The event name to find
 * @returns {Array<{text: string, confidence: number, position: number}>}
 */
function findEventNameInText(text, eventName) {
  const matches = [];
  const normalizedText = normalizeText(text);
  const normalizedEventName = normalizeText(eventName);

  // Exact substring match
  let position = normalizedText.indexOf(normalizedEventName);
  if (position >= 0) {
    matches.push({
      text: eventName,
      confidence: 100,
      position,
    });
    return matches;
  }

  // Fuzzy match for similar names
  // Split text into phrases and compare
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    // Try different phrase lengths
    for (let len = 1; len <= Math.min(5, words.length - i); len++) {
      const phrase = words.slice(i, i + len).join(' ');
      const normalizedPhrase = normalizeText(phrase);

      const similarity = stringSimilarity.compareTwoStrings(
        normalizedPhrase,
        normalizedEventName
      );

      if (similarity >= EVENT_NAME_SIMILARITY_THRESHOLD) {
        const phrasePosition = text.indexOf(phrase);
        if (phrasePosition >= 0) {
          matches.push({
            text: phrase,
            confidence: Math.round(similarity * 100),
            position: phrasePosition,
            similarity,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Extract date/time patterns from text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, confidence: number, position: number, dateTime: string, hasEventContext: boolean}>}
 */
function extractDateTimePatterns(text) {
  const patterns = [];

  // Date patterns
  const dateRegexes = [
    // "January 15", "Jan 15"
    { regex: /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?/gi, confidence: 80 },

    // "next Tuesday", "tomorrow", "yesterday"
    { regex: /(next|last|this)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi, confidence: 75 },
    { regex: /\b(tomorrow|today|yesterday|tonight)\b/gi, confidence: 70 },

    // "in 2 days", "in 3 weeks"
    { regex: /in\s+\d+\s+(days?|weeks?|months?)/gi, confidence: 70 },

    // Date formats: "1/15/2026", "01/15/2026"
    { regex: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, confidence: 85 },

    // Time patterns: "at 3pm", "at 3:30pm"
    { regex: /at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi, confidence: 75 },
  ];

  dateRegexes.forEach(({ regex, confidence }) => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      const position = match.index;

      // Check for event context nearby
      const hasEventContext = checkForEventContext(text, position);

      patterns.push({
        text: matchText,
        confidence: hasEventContext ? confidence + 10 : confidence,
        position,
        dateTime: matchText,
        hasEventContext,
      });
    }
  });

  return patterns;
}

/**
 * Check if there's event-related keywords near a position
 * @param {string} text - The full text
 * @param {number} position - Position to check around
 * @returns {boolean}
 */
function checkForEventContext(text, position) {
  const textLower = text.toLowerCase();

  // Check 30 characters before and after
  const before = textLower.substring(Math.max(0, position - 30), position);
  const after = textLower.substring(position, Math.min(text.length, position + 30));
  const context = before + after;

  return EVENT_KEYWORDS.some(keyword => context.includes(keyword));
}
