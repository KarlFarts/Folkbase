/**
 * Sync Hash Service
 * Tracks which contacts have been synced via Quick Sync to avoid re-importing duplicates.
 * Uses a hash-based registry stored in localStorage.
 */

import { warn } from '../utils/logger';

// LocalStorage key for sync hash registry
const STORAGE_KEY_SYNC_HASHES = 'dev_sync_hashes';

/**
 * Generate a unique hash for a contact based on phone and email
 * This allows us to identify the same contact even if the name varies slightly
 * @param {Object} contact - Contact object with Phone and Email fields
 * @returns {string} Base64-encoded hash string
 */
export function generateContactHash(contact) {
  // Extract and normalize phone numbers (remove non-digits, take last 10)
  const phones = extractPhoneNumbers(contact).sort().join('|');

  // Extract and normalize emails (lowercase, trim)
  const emails = extractEmails(contact).sort().join('|');

  // Combine into identifier
  const identifier = `${phones}::${emails}`;

  // If no phone or email, we can't reliably hash - return null
  if (!phones && !emails) {
    return null;
  }

  // Simple base64 encoding (sufficient for localStorage deduplication)
  // Replace characters that might cause issues
  return btoa(identifier).replace(/[=+/]/g, (match) => {
    if (match === '=') return '';
    if (match === '+') return '-';
    if (match === '/') return '_';
    return match;
  });
}

/**
 * Extract normalized phone numbers from a contact
 * @param {Object} contact - Contact object
 * @returns {Array<string>} Array of normalized 10-digit phone strings
 */
function extractPhoneNumbers(contact) {
  const phones = [];

  if (contact.Phone) {
    // Handle multiple phones separated by comma
    const phoneList = contact.Phone.split(',');
    for (const phone of phoneList) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        // Take last 10 digits (ignore country code)
        phones.push(digits.slice(-10));
      }
    }
  }

  return phones;
}

/**
 * Extract normalized emails from a contact
 * @param {Object} contact - Contact object
 * @returns {Array<string>} Array of lowercase email strings
 */
function extractEmails(contact) {
  const emails = [];

  if (contact.Email) {
    // Handle multiple emails separated by comma
    const emailList = contact.Email.split(',');
    for (const email of emailList) {
      const normalized = email.trim().toLowerCase();
      if (normalized && normalized.includes('@')) {
        emails.push(normalized);
      }
    }
  }

  return emails;
}

/**
 * Get all synced hashes from localStorage
 * @returns {Array<Object>} Array of hash registry entries
 */
export function getSyncedHashes() {
  const stored = localStorage.getItem(STORAGE_KEY_SYNC_HASHES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save sync hashes to localStorage
 * @param {Array<Object>} hashes - Array of hash registry entries
 */
export function saveSyncedHashes(hashes) {
  localStorage.setItem(STORAGE_KEY_SYNC_HASHES, JSON.stringify(hashes));
}

/**
 * Check if a contact has already been synced
 * @param {Object} contact - Contact object to check
 * @returns {Object|null} The matching hash entry if found, null otherwise
 */
export function isAlreadySynced(contact) {
  const hash = generateContactHash(contact);
  if (!hash) return null;

  const hashes = getSyncedHashes();
  return hashes.find((entry) => entry.hash === hash) || null;
}

/**
 * Mark a contact as synced by adding its hash to the registry
 * @param {Object} contact - Contact that was synced
 * @param {string} contactId - The Folkbase Contact ID assigned
 * @returns {Object} The hash entry that was created
 */
export function markAsSynced(contact, contactId) {
  const hash = generateContactHash(contact);
  if (!hash) {
    warn('[SYNC] Cannot mark contact as synced - no phone or email');
    return null;
  }

  const hashes = getSyncedHashes();

  // Check if already exists
  const existingIndex = hashes.findIndex((entry) => entry.hash === hash);

  const entry = {
    hash,
    syncedAt: new Date().toISOString(),
    contactId,
    contactName: contact.Name || 'Unknown',
    source: 'quick-sync',
  };

  if (existingIndex >= 0) {
    // Update existing entry
    hashes[existingIndex] = entry;
  } else {
    // Add new entry
    hashes.push(entry);
  }

  saveSyncedHashes(hashes);
  return entry;
}

/**
 * Remove a contact's hash from the registry
 * Useful if a contact is deleted and should be re-importable
 * @param {string} contactId - The Folkbase Contact ID to remove
 * @returns {boolean} True if an entry was removed
 */
export function removeSyncedHash(contactId) {
  const hashes = getSyncedHashes();
  const filtered = hashes.filter((entry) => entry.contactId !== contactId);

  if (filtered.length !== hashes.length) {
    saveSyncedHashes(filtered);
    return true;
  }

  return false;
}
