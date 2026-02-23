/**
 * Text Analyzer Utility
 * Extracts entities and patterns from free-form text
 */

/**
 * Extract capitalized phrases that could be names
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number}>} - Capitalized phrases with positions
 */
export function extractCapitalizedPhrases(text) {
  if (!text || typeof text !== 'string') return [];

  const phrases = [];
  // Match capitalized words (including multi-word names)
  // Pattern: Capital letter followed by lowercase, optionally repeated for compound names
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;

  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const phrase = match[0];
    // Skip common words that aren't names
    if (!isCommonWord(phrase)) {
      phrases.push({
        text: phrase,
        position: match.index,
      });
    }
  }

  return phrases;
}

/**
 * Check if a word is a common non-name word
 * @param {string} word - The word to check
 * @returns {boolean}
 */
function isCommonWord(word) {
  const commonWords = new Set([
    'The', 'This', 'That', 'These', 'Those',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    'Today', 'Tomorrow', 'Yesterday',
    'New', 'Old', 'First', 'Last', 'Next',
  ]);

  return commonWords.has(word);
}

/**
 * Extract phone numbers from text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number}>} - Phone numbers with positions
 */
export function extractPhoneNumbers(text) {
  if (!text || typeof text !== 'string') return [];

  const phoneNumbers = [];
  // Patterns: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX, XXXXXXXXXX
  const phonePatterns = [
    /\(\d{3}\)\s?\d{3}-\d{4}/g,  // (123) 456-7890
    /\d{3}-\d{3}-\d{4}/g,         // 123-456-7890
    /\d{3}\.\d{3}\.\d{4}/g,       // 123.456.7890
    /\b\d{10}\b/g,                 // 1234567890
  ];

  phonePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      phoneNumbers.push({
        text: match[0],
        position: match.index,
      });
    }
  });

  return phoneNumbers;
}

/**
 * Extract email addresses from text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number}>} - Email addresses with positions
 */
export function extractEmails(text) {
  if (!text || typeof text !== 'string') return [];

  const emails = [];
  // Standard email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  let match;
  while ((match = emailPattern.exec(text)) !== null) {
    emails.push({
      text: match[0],
      position: match.index,
    });
  }

  return emails;
}

/**
 * Extract imperative verbs and action phrases for task detection
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number, verb: string}>} - Action phrases
 */
export function extractImperativeVerbs(text) {
  if (!text || typeof text !== 'string') return [];

  const actionPhrases = [];

  // Common imperative verbs
  const imperativeVerbs = [
    'call', 'email', 'send', 'prepare', 'review', 'schedule', 'draft',
    'follow up', 'reach out', 'contact', 'remind', 'check', 'update',
    'create', 'write', 'finish', 'complete', 'submit', 'upload',
    'download', 'install', 'configure', 'test', 'debug', 'fix',
  ];

  // Create pattern for each verb (case-insensitive)
  imperativeVerbs.forEach(verb => {
    const pattern = new RegExp(`\\b${verb}\\b[^.!?]*`, 'gi');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      actionPhrases.push({
        text: match[0].trim(),
        position: match.index,
        verb: verb,
      });
    }
  });

  return actionPhrases;
}

/**
 * Extract explicit task markers (TODO, checkboxes, etc.)
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number, marker: string}>} - Task markers
 */
export function extractTaskMarkers(text) {
  if (!text || typeof text !== 'string') return [];

  const tasks = [];

  // Task marker patterns
  const patterns = [
    { regex: /TODO:\s*([^\n]+)/gi, marker: 'TODO' },
    { regex: /\[\s?\]\s*([^\n]+)/g, marker: 'CHECKBOX' },
    { regex: /-\s?\[\s?\]\s*([^\n]+)/g, marker: 'MARKDOWN_CHECKBOX' },
    { regex: /Action item:\s*([^\n]+)/gi, marker: 'ACTION_ITEM' },
    { regex: /Follow up:\s*([^\n]+)/gi, marker: 'FOLLOW_UP' },
    { regex: /\bNeed to\b\s+([^\n.!?]+)/gi, marker: 'NEED_TO' },
    { regex: /\bMust\b\s+([^\n.!?]+)/gi, marker: 'MUST' },
    { regex: /\bShould\b\s+([^\n.!?]+)/gi, marker: 'SHOULD' },
    { regex: /Remember to\s+([^\n.!?]+)/gi, marker: 'REMEMBER' },
  ];

  patterns.forEach(({ regex, marker }) => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      tasks.push({
        text: match[1].trim(),
        position: match.index,
        marker: marker,
        fullText: match[0],
      });
    }
  });

  return tasks;
}

/**
 * Extract deadline patterns from text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number, deadline: string}>} - Deadlines
 */
export function extractDeadlines(text) {
  if (!text || typeof text !== 'string') return [];

  const deadlines = [];

  // Deadline patterns
  const patterns = [
    /by\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
    /by\s+(tomorrow|today|tonight)/gi,
    /due\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
    /due\s+(tomorrow|today)/gi,
    /before\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
    /by\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
    /by\s+(next\s+week|next\s+month|end\s+of\s+week|end\s+of\s+month)/gi,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      deadlines.push({
        text: match[0],
        position: match.index,
        deadline: match[1],
      });
    }
  });

  return deadlines;
}

/**
 * Extract location prepositions (at, in) followed by place names
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number, preposition: string}>} - Location phrases
 */
export function extractLocationPhrases(text) {
  if (!text || typeof text !== 'string') return [];

  const locations = [];

  // Patterns: "at [Place]", "in [Place]"
  const patterns = [
    /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:on|in)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?)/g,
    /\bin\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Office|Building|Room|Center|Hall))?)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      locations.push({
        text: match[1].trim(),
        position: match.index,
        preposition: match[0].startsWith('at') ? 'at' : 'in',
        fullText: match[0],
      });
    }
  });

  return locations;
}

/**
 * Extract address patterns from text
 * @param {string} text - The text to analyze
 * @returns {Array<{text: string, position: number}>} - Address patterns
 */
export function extractAddresses(text) {
  if (!text || typeof text !== 'string') return [];

  const addresses = [];

  // Simple pattern: number + street name + optional city/state
  // Example: "1234 Main St, Seattle WA"
  const addressPattern = /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\.?(?:,?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,?\s+[A-Z]{2})?)?\b/g;

  let match;
  while ((match = addressPattern.exec(text)) !== null) {
    addresses.push({
      text: match[0],
      position: match.index,
    });
  }

  return addresses;
}

/**
 * Normalize text for comparison (lowercase, trim, remove extra spaces)
 * @param {string} str - The string to normalize
 * @returns {string} - Normalized string
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}
