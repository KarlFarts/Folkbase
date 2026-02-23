/**
 * Braindump Preferences Manager
 * Manages localStorage for braindump-related preferences
 * Includes contact disambiguation, frequency tracking, known locations, and UI preferences
 */

const STORAGE_KEY = 'braindump_preferences';
const DRAFT_PREFIX = 'braindump_draft_';
const DRAFT_RETENTION_DAYS = 7;

/**
 * Default preferences structure
 */
const DEFAULT_PREFERENCES = {
  version: 1,
  lastUpdated: new Date().toISOString(),

  // Disambiguation choices: "john" → Contact ID
  contactPreferences: {},

  // Link frequency tracking for scoring boost
  contactFrequency: {},

  // Recent contacts for recency boost (max 50)
  recentContacts: [],

  // User-maintained location list
  knownLocations: [],

  // Ignored suggestions
  ignoredSuggestions: [],

  // UI preferences
  ui: {
    showFAB: true,
    fabPosition: 'bottom-right',
    autoSaveDrafts: true,
    distractionFreeMode: false,
  },
};

/**
 * Load preferences from localStorage
 * @returns {Object} Preferences object
 */
export function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(stored);

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      ui: {
        ...DEFAULT_PREFERENCES.ui,
        ...(parsed.ui || {}),
      },
    };
  } catch {
      // Silent failure expected
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save preferences to localStorage
 * @param {Object} preferences - Preferences object to save
 * @returns {boolean} Success status
 */
export function savePreferences(preferences) {
  try {
    const toSave = {
      ...preferences,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch {
      // Silent failure expected
    return false;
  }
}

/**
 * Record a contact link (updates frequency and recency)
 * @param {string} contactId - Contact ID that was linked
 */
export function recordContactLink(contactId) {
  if (!contactId) return;

  const prefs = loadPreferences();

  // Update frequency
  prefs.contactFrequency[contactId] = (prefs.contactFrequency[contactId] || 0) + 1;

  // Update recency
  const existingIndex = prefs.recentContacts.findIndex(c => c.contactId === contactId);
  if (existingIndex >= 0) {
    // Remove existing entry
    prefs.recentContacts.splice(existingIndex, 1);
  }

  // Add to front
  prefs.recentContacts.unshift({
    contactId,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 50
  if (prefs.recentContacts.length > 50) {
    prefs.recentContacts = prefs.recentContacts.slice(0, 50);
  }

  savePreferences(prefs);
}

/**
 * Get contact boost score for improved matching
 * @param {string} contactId - Contact ID
 * @returns {number} Boost score (0-15)
 */
export function getContactBoost(contactId) {
  if (!contactId) return 0;

  const prefs = loadPreferences();
  let boost = 0;

  // Frequency boost: up to 15% (capped at 15 links)
  const frequency = prefs.contactFrequency[contactId] || 0;
  boost += Math.min(frequency, 15);

  // Recency boost: 10% if contacted in last 7 days
  const recentContact = prefs.recentContacts.find(c => c.contactId === contactId);
  if (recentContact) {
    const daysSince = (Date.now() - new Date(recentContact.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) {
      boost += 10;
    }
  }

  return Math.min(boost, 15); // Cap at 15% total boost
}

/**
 * Record a disambiguation choice
 * @param {string} text - The ambiguous text (e.g., "john")
 * @param {string} contactId - The chosen contact ID
 */
export function recordDisambiguation(text, contactId) {
  if (!text || !contactId) return;

  const prefs = loadPreferences();
  const normalizedText = text.toLowerCase().trim();

  prefs.contactPreferences[normalizedText] = contactId;

  savePreferences(prefs);
}

/**
 * Get disambiguation preference for a text
 * @param {string} text - The ambiguous text
 * @returns {string|null} Preferred contact ID or null
 */
export function getDisambiguationPreference(text) {
  if (!text) return null;

  const prefs = loadPreferences();
  const normalizedText = text.toLowerCase().trim();

  return prefs.contactPreferences[normalizedText] || null;
}

/**
 * Add an entity to the ignore list
 * @param {string} text - The text to ignore
 * @param {string} entityType - Type of entity (contact, location, event, task)
 * @param {string} reason - Optional reason for ignoring
 */
export function ignoreEntity(text, entityType, reason = 'user-dismissed') {
  if (!text || !entityType) return;

  const prefs = loadPreferences();

  const normalizedText = text.toLowerCase().trim();

  // Check if already ignored
  const existing = prefs.ignoredSuggestions.find(
    s => s.text === normalizedText && s.entity === entityType
  );

  if (!existing) {
    prefs.ignoredSuggestions.push({
      text: normalizedText,
      entity: entityType,
      reason,
      timestamp: new Date().toISOString(),
    });

    savePreferences(prefs);
  }
}

/**
 * Check if an entity is ignored
 * @param {string} text - The text to check
 * @param {string} entityType - Type of entity
 * @returns {boolean}
 */
export function isIgnored(text, entityType) {
  if (!text || !entityType) return false;

  const prefs = loadPreferences();
  const normalizedText = text.toLowerCase().trim();

  // Cleanup old ignored suggestions (> 90 days)
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  prefs.ignoredSuggestions = prefs.ignoredSuggestions.filter(s => {
    const timestamp = new Date(s.timestamp).getTime();
    return timestamp > ninetyDaysAgo;
  });

  return prefs.ignoredSuggestions.some(
    s => s.text === normalizedText && s.entity === entityType
  );
}

/**
 * Add a known location to the list
 * @param {string} location - Location name
 */
export function addKnownLocation(location) {
  if (!location) return;

  const prefs = loadPreferences();
  const trimmed = location.trim();

  if (!prefs.knownLocations.includes(trimmed)) {
    prefs.knownLocations.push(trimmed);
    prefs.knownLocations.sort();
    savePreferences(prefs);
  }
}

/**
 * Get all known locations
 * @returns {Array<string>}
 */
export function getKnownLocations() {
  const prefs = loadPreferences();
  return [...prefs.knownLocations];
}

/**
 * Remove a known location
 * @param {string} location - Location name
 */
export function removeKnownLocation(location) {
  if (!location) return;

  const prefs = loadPreferences();
  const index = prefs.knownLocations.indexOf(location);

  if (index >= 0) {
    prefs.knownLocations.splice(index, 1);
    savePreferences(prefs);
  }
}

/**
 * Get UI preferences
 * @returns {Object} UI preferences
 */
export function getUIPreferences() {
  const prefs = loadPreferences();
  return { ...prefs.ui };
}

/**
 * Update UI preferences
 * @param {Object} uiPrefs - UI preferences to update
 */
export function updateUIPreferences(uiPrefs) {
  const prefs = loadPreferences();
  prefs.ui = {
    ...prefs.ui,
    ...uiPrefs,
  };
  savePreferences(prefs);
}

// ============ DRAFT MANAGEMENT ============

/**
 * Save a draft to localStorage
 * @param {string} content - Draft content
 * @returns {string} Draft key
 */
export function saveDraft(content) {
  const timestamp = Date.now();
  const key = `${DRAFT_PREFIX}${timestamp}`;

  try {
    localStorage.setItem(key, JSON.stringify({
      content,
      timestamp,
      savedAt: new Date().toISOString(),
    }));

    // Cleanup old drafts
    cleanupOldDrafts();

    return key;
  } catch {
      // Silent failure expected
    return null;
  }
}

/**
 * Load a draft from localStorage
 * @param {string} key - Draft key
 * @returns {Object|null} Draft object or null
 */
export function loadDraft(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
      // Silent failure expected
    return null;
  }
}

/**
 * Get all drafts
 * @returns {Array<{key: string, content: string, timestamp: number, savedAt: string}>}
 */
export function getAllDrafts() {
  const drafts = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const draft = loadDraft(key);
        if (draft) {
          drafts.push({
            key,
            ...draft,
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    drafts.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
      // Silent failure expected
  }

  return drafts;
}

/**
 * Delete a draft
 * @param {string} key - Draft key
 */
export function deleteDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
      // Silent failure expected
  }
}

/**
 * Cleanup old drafts (older than DRAFT_RETENTION_DAYS)
 */
export function cleanupOldDrafts() {
  const retentionMs = DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - retentionMs;

  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach(key => {
      const draft = loadDraft(key);
      if (draft && draft.timestamp < cutoffTime) {
        deleteDraft(key);
      }
    });
  } catch {
      // Silent failure expected
  }
}

/**
 * Get the most recent draft
 * @returns {Object|null} Most recent draft or null
 */
export function getMostRecentDraft() {
  const drafts = getAllDrafts();
  return drafts.length > 0 ? drafts[0] : null;
}
