/**
 * Duplicate Detector Service
 * Implements moderate matching algorithm for detecting duplicate contacts
 * Uses exact name matching + fuzzy matching (80%+ similarity) + contact info overlap
 */

import stringSimilarity from 'string-similarity';

/**
 * Confidence levels for duplicate matches
 */
export const CONFIDENCE = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  NONE: 'NONE',
};

/**
 * Normalize a string for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two strings are an exact match (case-insensitive, normalized)
 */
function exactMatch(str1, str2) {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (!normalized1 || !normalized2) return false;
  return normalized1 === normalized2;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (!normalized1 || !normalized2) return 0;
  if (normalized1 === normalized2) return 1;

  return stringSimilarity.compareTwoStrings(normalized1, normalized2);
}

/**
 * Extract all phone numbers from a contact (handles Phone field and any custom fields)
 */
function extractPhoneNumbers(contact) {
  const phones = [];

  if (contact.Phone) {
    // Remove all non-digit characters for comparison
    const digits = contact.Phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      // Take last 10 digits (ignore country code)
      phones.push(digits.slice(-10));
    }
  }

  return phones;
}

/**
 * Extract all email addresses from a contact
 */
function extractEmails(contact) {
  const emails = [];

  if (contact.Email) {
    emails.push(normalizeString(contact.Email));
  }

  return emails;
}

/**
 * Check if there's any overlap between two arrays
 */
function hasOverlap(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
    return false;
  }

  return arr1.some(item => arr2.includes(item));
}

/**
 * Determine if an incoming contact is a duplicate of an existing contact
 * Implements the moderate matching strategy from the design doc
 *
 * @param {Object} incoming - Incoming contact from import
 * @param {Object} existing - Existing contact in the system
 * @returns {string} Confidence level: 'HIGH', 'MEDIUM', or 'NONE'
 */
export function isDuplicate(incoming, existing) {
  // Extract contact information
  const incomingPhones = extractPhoneNumbers(incoming);
  const existingPhones = extractPhoneNumbers(existing);
  const incomingEmails = extractEmails(incoming);
  const existingEmails = extractEmails(existing);

  // Check for matches
  const nameMatch = exactMatch(incoming.Name, existing.Name);
  const phoneMatch = hasOverlap(incomingPhones, existingPhones);
  const emailMatch = hasOverlap(incomingEmails, existingEmails);

  // Calculate fuzzy name similarity
  const nameSimilarity = calculateSimilarity(incoming.Name || '', existing.Name || '');
  const fuzzyNameMatch = nameSimilarity >= 0.80;

  // HIGH confidence: Exact name match + (phone OR email match)
  if (nameMatch && (phoneMatch || emailMatch)) {
    return CONFIDENCE.HIGH;
  }

  // MEDIUM confidence: Fuzzy name match (80%+) + (phone OR email match)
  if (fuzzyNameMatch && (phoneMatch || emailMatch)) {
    return CONFIDENCE.MEDIUM;
  }

  // MEDIUM confidence: Just contact info match (phone OR email)
  if (phoneMatch || emailMatch) {
    return CONFIDENCE.MEDIUM;
  }

  // No match
  return CONFIDENCE.NONE;
}

/**
 * Find all potential duplicates within an existing contact list
 * Used to find duplicates among contacts already in the system
 *
 * @param {Array} contacts - Contacts to check for duplicates
 * @param {number} thresholdPercentage - Minimum confidence threshold (70-80 recommended)
 * @returns {Array} Array of duplicate pair objects
 */
export function findDuplicatesInList(contacts, thresholdPercentage = 75) {
  const duplicatePairs = [];
  const checked = new Set();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const pairKey = `${i}-${j}`;
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const contact1 = contacts[i];
      const contact2 = contacts[j];

      const confidence = isDuplicate(contact1, contact2);
      const matchDetails = getMatchDetails(contact1, contact2);

      // Only report if confidence exceeds threshold
      if (confidence !== CONFIDENCE.NONE) {
        // Convert confidence level to percentage for comparison
        let confidenceScore = 0;
        if (confidence === CONFIDENCE.HIGH) {
          confidenceScore = 95;
        } else if (confidence === CONFIDENCE.MEDIUM) {
          confidenceScore = 75; // Moderate (70-80%)
        }

        if (confidenceScore >= thresholdPercentage) {
          duplicatePairs.push({
            contact1,
            contact2,
            contact1Index: i,
            contact2Index: j,
            confidence,
            confidenceScore,
            matchDetails,
            markedAsLinked: false,
          });
        }
      }
    }
  }

  return duplicatePairs;
}

/**
 * Find all potential duplicates for a set of incoming contacts
 *
 * @param {Array} incomingContacts - Contacts being imported
 * @param {Array} existingContacts - Contacts already in the system
 * @param {Function} onProgress - Optional progress callback
 * @returns {Array} Array of duplicate match objects
 */
export async function detectDuplicates(incomingContacts, existingContacts, onProgress = null) {
  const duplicates = [];
  const totalToCheck = incomingContacts.length;

  for (let i = 0; i < incomingContacts.length; i++) {
    const incoming = incomingContacts[i];

    // Update progress
    if (onProgress) {
      onProgress({
        phase: 'detecting',
        total: totalToCheck,
        processed: i,
        current: `Checking for duplicates... (${i + 1} of ${totalToCheck})`,
        canCancel: true,
      });
    }

    // Check against all existing contacts
    for (const existing of existingContacts) {
      const confidence = isDuplicate(incoming, existing);

      if (confidence !== CONFIDENCE.NONE) {
        duplicates.push({
          incomingContact: incoming,
          incomingIndex: i,
          existingContact: existing,
          confidence,
          action: 'skip', // Default action
          matchDetails: getMatchDetails(incoming, existing),
        });

        // Only report the first match for each incoming contact
        // (avoid showing multiple duplicates for the same import contact)
        break;
      }
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      phase: 'detecting',
      total: totalToCheck,
      processed: totalToCheck,
      current: `Found ${duplicates.length} potential duplicate(s)`,
      canCancel: false,
    });
  }

  return duplicates;
}

/**
 * Get detailed information about what matched between two contacts
 */
function getMatchDetails(incoming, existing) {
  const details = {
    nameMatch: false,
    fuzzyNameMatch: false,
    nameSimilarity: 0,
    phoneMatch: false,
    emailMatch: false,
  };

  // Name matching
  details.nameMatch = exactMatch(incoming.Name, existing.Name);
  details.nameSimilarity = calculateSimilarity(incoming.Name || '', existing.Name || '');
  details.fuzzyNameMatch = details.nameSimilarity >= 0.80;

  // Contact info matching
  const incomingPhones = extractPhoneNumbers(incoming);
  const existingPhones = extractPhoneNumbers(existing);
  const incomingEmails = extractEmails(incoming);
  const existingEmails = extractEmails(existing);

  details.phoneMatch = hasOverlap(incomingPhones, existingPhones);
  details.emailMatch = hasOverlap(incomingEmails, existingEmails);

  return details;
}

/**
 * Format match details into a human-readable string
 */
export function formatMatchDetails(matchDetails) {
  const parts = [];

  if (matchDetails.nameMatch) {
    parts.push('exact name');
  } else if (matchDetails.fuzzyNameMatch) {
    const percentage = Math.round(matchDetails.nameSimilarity * 100);
    parts.push(`similar name (${percentage}%)`);
  }

  if (matchDetails.phoneMatch) {
    parts.push('phone');
  }

  if (matchDetails.emailMatch) {
    parts.push('email');
  }

  return parts.join(', ');
}

/**
 * Merge two contacts, preferring new data over existing
 * Fields that are empty in the incoming contact will preserve existing values
 *
 * @param {Object} incoming - Incoming contact
 * @param {Object} existing - Existing contact
 * @returns {Object} Merged contact with both old and new data
 */
export function mergeContacts(incoming, existing) {
  const merged = { ...existing };

  // List of fields to merge (exclude system fields like Contact ID, Date Added)
  const mergeableFields = [
    'Name', 'Phone', 'Email', 'Organization', 'Role',
    'Priority', 'Status', 'District', 'Tags', 'Bio',
  ];

  for (const field of mergeableFields) {
    // Only override if incoming has a non-empty value
    if (incoming[field] !== undefined && incoming[field] !== null && incoming[field] !== '') {
      merged[field] = incoming[field];
    }
  }

  return merged;
}

/**
 * Apply duplicate resolution actions
 *
 * @param {Array} duplicates - Array of duplicate match objects with actions
 * @param {Array} incomingContacts - All incoming contacts
 * @returns {Object} Resolution results
 */
export function applyDuplicateResolutions(duplicates, incomingContacts) {
  const results = {
    toImport: [],      // New contacts to import
    toMerge: [],       // Contacts to merge with existing
    skipped: [],       // Contacts skipped due to duplicates
  };

  // Track which incoming contacts have been processed
  const processedIndices = new Set();

  // Process duplicates based on their action
  for (const duplicate of duplicates) {
    const { incomingIndex, incomingContact, existingContact, action } = duplicate;

    processedIndices.add(incomingIndex);

    if (action === 'skip') {
      results.skipped.push({
        contact: incomingContact,
        reason: 'Duplicate of existing contact',
      });
    } else if (action === 'merge') {
      const merged = mergeContacts(incomingContact, existingContact);
      results.toMerge.push({
        contactId: existingContact['Contact ID'],
        original: existingContact,
        updated: merged,
        incomingData: incomingContact,
      });
    } else if (action === 'add') {
      results.toImport.push(incomingContact);
    }
  }

  // Add all non-duplicate contacts to import list
  for (let i = 0; i < incomingContacts.length; i++) {
    if (!processedIndices.has(i)) {
      results.toImport.push(incomingContacts[i]);
    }
  }

  return results;
}
