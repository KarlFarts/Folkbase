/**
 * Contact Detector Service
 * Detects contact mentions in free-form text using fuzzy matching
 * Leverages existing duplicateDetector.js patterns
 */

import stringSimilarity from 'string-similarity';
import {
  extractCapitalizedPhrases,
  extractPhoneNumbers,
  extractEmails,
  normalizeText,
} from '../utils/textAnalyzer';
import {
  getContactBoost,
  getDisambiguationPreference,
  isIgnored,
} from './braindumpPreferences';

// Threshold for fuzzy name matching (same as duplicate detector)
const NAME_SIMILARITY_THRESHOLD = 0.80;

// Contextual keywords that suggest a person mention
const CONTEXT_KEYWORDS = [
  'talked to', 'met with', 'call with', 'email from', 'meeting with',
  'spoke with', 'discussed with', 'reached out to', 'followed up with',
  'contacted', 'called', 'emailed', 'texted',
];

/**
 * Detect contact mentions in text
 * @param {string} text - The text to analyze
 * @param {Array} contacts - Array of contact objects
 * @returns {Array<{text: string, contactId: string, confidence: number, position: number, matchType: string}>}
 */
export function detectContacts(text, contacts) {
  if (!text || !contacts || contacts.length === 0) {
    return [];
  }

  const detectedContacts = [];
  const seenContactIds = new Set();

  // 1. Extract and match capitalized phrases (potential names)
  const phrases = extractCapitalizedPhrases(text);
  phrases.forEach(phrase => {
    if (isIgnored(phrase.text, 'contact')) {
      return; // Skip ignored
    }

    const matches = matchNameAgainstContacts(phrase.text, contacts);
    matches.forEach(match => {
      if (!seenContactIds.has(match.contactId)) {
        seenContactIds.add(match.contactId);
        detectedContacts.push({
          ...match,
          text: phrase.text,
          position: phrase.position,
          matchType: 'name',
        });
      }
    });
  });

  // 2. Extract and match phone numbers
  const phoneNumbers = extractPhoneNumbers(text);
  phoneNumbers.forEach(phone => {
    const matches = matchPhoneAgainstContacts(phone.text, contacts);
    matches.forEach(match => {
      if (!seenContactIds.has(match.contactId)) {
        seenContactIds.add(match.contactId);
        detectedContacts.push({
          ...match,
          text: phone.text,
          position: phone.position,
          matchType: 'phone',
        });
      }
    });
  });

  // 3. Extract and match email addresses
  const emails = extractEmails(text);
  emails.forEach(email => {
    const matches = matchEmailAgainstContacts(email.text, contacts);
    matches.forEach(match => {
      if (!seenContactIds.has(match.contactId)) {
        seenContactIds.add(match.contactId);
        detectedContacts.push({
          ...match,
          text: email.text,
          position: match.position,
          matchType: 'email',
        });
      }
    });
  });

  // 4. Apply contextual boost
  const textLower = text.toLowerCase();
  detectedContacts.forEach(contact => {
    // Check if there's context near the mention
    const contextBoost = hasContextNearby(textLower, contact.position);
    if (contextBoost > 0) {
      contact.confidence = Math.min(100, contact.confidence + contextBoost);
      contact.hasContext = true;
    }
  });

  // Sort by confidence (highest first)
  detectedContacts.sort((a, b) => b.confidence - a.confidence);

  return detectedContacts;
}

/**
 * Match a name against contacts using fuzzy matching
 * @param {string} name - Name to match
 * @param {Array} contacts - Array of contacts
 * @returns {Array<{contactId: string, confidence: number, contact: Object}>}
 */
function matchNameAgainstContacts(name, contacts) {
  const matches = [];
  const normalizedName = normalizeText(name);

  // Check for disambiguation preference first
  const preferredContactId = getDisambiguationPreference(name);
  if (preferredContactId) {
    const preferredContact = contacts.find(c => c['Contact ID'] === preferredContactId);
    if (preferredContact) {
      matches.push({
        contactId: preferredContactId,
        confidence: 95, // High confidence for learned preference
        contact: preferredContact,
      });
      return matches; // Return only preferred match
    }
  }

  contacts.forEach(contact => {
    if (!contact.Name) return;

    const contactName = normalizeText(contact.Name);

    // Exact match
    if (normalizedName === contactName) {
      const boost = getContactBoost(contact['Contact ID']);
      matches.push({
        contactId: contact['Contact ID'],
        confidence: Math.min(100, 100 + boost),
        contact,
      });
      return;
    }

    // Fuzzy match using Levenshtein distance
    const similarity = stringSimilarity.compareTwoStrings(normalizedName, contactName);

    if (similarity >= NAME_SIMILARITY_THRESHOLD) {
      const baseConfidence = Math.round(similarity * 100);
      const boost = getContactBoost(contact['Contact ID']);
      const finalConfidence = Math.min(100, baseConfidence + boost);

      matches.push({
        contactId: contact['Contact ID'],
        confidence: finalConfidence,
        contact,
        similarity,
      });
    }
  });

  return matches;
}

/**
 * Match a phone number against contacts
 * @param {string} phone - Phone number to match
 * @param {Array} contacts - Array of contacts
 * @returns {Array<{contactId: string, confidence: number, contact: Object}>}
 */
function matchPhoneAgainstContacts(phone, contacts) {
  const matches = [];

  // Normalize phone (remove non-digits)
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < 10) return matches;

  // Get last 10 digits for comparison
  const last10 = normalizedPhone.slice(-10);

  contacts.forEach(contact => {
    if (!contact.Phone) return;

    const contactPhone = contact.Phone.replace(/\D/g, '');
    if (contactPhone.length < 10) return;

    const contactLast10 = contactPhone.slice(-10);

    if (last10 === contactLast10) {
      const boost = getContactBoost(contact['Contact ID']);
      matches.push({
        contactId: contact['Contact ID'],
        confidence: Math.min(100, 100 + boost),
        contact,
      });
    }
  });

  return matches;
}

/**
 * Match an email address against contacts
 * @param {string} email - Email address to match
 * @param {Array} contacts - Array of contacts
 * @returns {Array<{contactId: string, confidence: number, contact: Object}>}
 */
function matchEmailAgainstContacts(email, contacts) {
  const matches = [];
  const normalizedEmail = normalizeText(email);

  contacts.forEach(contact => {
    if (!contact.Email) return;

    const contactEmail = normalizeText(contact.Email);

    if (normalizedEmail === contactEmail) {
      const boost = getContactBoost(contact['Contact ID']);
      matches.push({
        contactId: contact['Contact ID'],
        confidence: Math.min(100, 100 + boost),
        contact,
      });
    }
  });

  return matches;
}

/**
 * Check if there's contextual keywords near a position in text
 * @param {string} text - The full text (lowercase)
 * @param {number} position - Position to check around
 * @returns {number} Confidence boost (0-10)
 */
function hasContextNearby(text, position) {
  // Check 50 characters before the position
  const before = text.substring(Math.max(0, position - 50), position);

  for (const keyword of CONTEXT_KEYWORDS) {
    if (before.includes(keyword)) {
      return 10; // 10% boost for contextual keywords
    }
  }

  return 0;
}

/**
 * Find all unique contact mentions (deduplicated)
 * @param {Array} detectedContacts - Array of detected contacts
 * @returns {Array} Unique contacts with best confidence for each
 */
export function deduplicateContactMatches(detectedContacts) {
  const uniqueContacts = new Map();

  detectedContacts.forEach(match => {
    const existing = uniqueContacts.get(match.contactId);

    if (!existing || match.confidence > existing.confidence) {
      uniqueContacts.set(match.contactId, match);
    }
  });

  return Array.from(uniqueContacts.values());
}
