/**
 * Entity Detector Service
 * Main orchestrator for detecting all entity types in text
 * Combines contact, location, event, and task detection
 */

import { detectContacts, deduplicateContactMatches } from './contactDetector';
import { detectLocations } from './locationDetector';
import { detectEvents } from './eventDetector';
import { detectTasks } from './taskDetector';

// Confidence thresholds
export const CONFIDENCE_THRESHOLD = {
  DISPLAY: 60,      // Minimum to show to user
  AUTO_LINK: 85,    // Minimum to auto-link without confirmation
};

/**
 * Detect all entities in text
 * @param {string} text - The text to analyze
 * @param {Object} context - Context objects (contacts, events, locations)
 * @param {Array} context.contacts - Array of contact objects
 * @param {Array} context.events - Array of event objects
 * @returns {Object} Detected entities by type
 */
export function detectEntities(text, context = {}) {
  if (!text || typeof text !== 'string') {
    return {
      contacts: [],
      events: [],
      locations: [],
      tasks: [],
      summary: {
        total: 0,
        byType: {
          contacts: 0,
          events: 0,
          locations: 0,
          tasks: 0,
        },
        highConfidence: 0,
      },
    };
  }

  const { contacts = [], events = [] } = context;

  // Run all detectors
  const detectedContacts = detectContacts(text, contacts);
  const detectedLocations = detectLocations(text, events);
  const detectedEvents = detectEvents(text, events);
  const detectedTasks = detectTasks(text);

  // Filter by display threshold
  const filteredContacts = filterByConfidence(detectedContacts, CONFIDENCE_THRESHOLD.DISPLAY);
  const filteredLocations = filterByConfidence(detectedLocations, CONFIDENCE_THRESHOLD.DISPLAY);
  const filteredEvents = filterByConfidence(detectedEvents, CONFIDENCE_THRESHOLD.DISPLAY);
  const filteredTasks = filterByConfidence(detectedTasks, CONFIDENCE_THRESHOLD.DISPLAY);

  // Deduplicate contacts
  const uniqueContacts = deduplicateContactMatches(filteredContacts);

  // Calculate summary stats
  const summary = calculateSummary(
    uniqueContacts,
    filteredLocations,
    filteredEvents,
    filteredTasks
  );

  return {
    contacts: uniqueContacts,
    locations: filteredLocations,
    events: filteredEvents,
    tasks: filteredTasks,
    summary,
  };
}

/**
 * Filter entities by confidence threshold
 * @param {Array} entities - Array of entity objects
 * @param {number} threshold - Minimum confidence
 * @returns {Array} Filtered entities
 */
function filterByConfidence(entities, threshold) {
  return entities.filter(entity => entity.confidence >= threshold);
}

/**
 * Calculate summary statistics
 * @param {Array} contacts - Detected contacts
 * @param {Array} locations - Detected locations
 * @param {Array} events - Detected events
 * @param {Array} tasks - Detected tasks
 * @returns {Object} Summary object
 */
function calculateSummary(contacts, locations, events, tasks) {
  const total = contacts.length + locations.length + events.length + tasks.length;

  // Count high-confidence entities (>= AUTO_LINK threshold)
  const highConfidence = [
    ...contacts,
    ...locations,
    ...events,
    ...tasks,
  ].filter(e => e.confidence >= CONFIDENCE_THRESHOLD.AUTO_LINK).length;

  return {
    total,
    byType: {
      contacts: contacts.length,
      locations: locations.length,
      events: events.length,
      tasks: tasks.length,
    },
    highConfidence,
  };
}

/**
 * Get entities above auto-link threshold
 * @param {Object} detectedEntities - Result from detectEntities()
 * @returns {Object} High-confidence entities
 */
export function getHighConfidenceEntities(detectedEntities) {
  return {
    contacts: detectedEntities.contacts.filter(
      c => c.confidence >= CONFIDENCE_THRESHOLD.AUTO_LINK
    ),
    locations: detectedEntities.locations.filter(
      l => l.confidence >= CONFIDENCE_THRESHOLD.AUTO_LINK
    ),
    events: detectedEntities.events.filter(
      e => e.confidence >= CONFIDENCE_THRESHOLD.AUTO_LINK
    ),
    tasks: detectedEntities.tasks.filter(
      t => t.confidence >= CONFIDENCE_THRESHOLD.AUTO_LINK
    ),
  };
}

/**
 * Format entity for display
 * @param {Object} entity - Entity object
 * @param {string} type - Entity type
 * @returns {string} Formatted display string
 */
export function formatEntityForDisplay(entity, type) {
  switch (type) {
    case 'contact':
      return entity.contact ? entity.contact.Name : entity.text;

    case 'location':
      return entity.knownLocation || entity.text;

    case 'event':
      return entity.event ? entity.event['Event Name'] : entity.text;

    case 'task':
      return entity.deadline
        ? `${entity.text} (by ${entity.deadline})`
        : entity.text;

    default:
      return entity.text;
  }
}

/**
 * Get entity icon for display
 * @param {string} type - Entity type
 * @returns {string} Icon emoji
 */
export function getEntityIcon(type) {
  const icons = {
    contact: 'User',
    location: 'MapPin',
    event: 'Calendar',
    task: 'Check',
  };

  return icons[type] || 'Pin';
}

/**
 * Get confidence color class
 * @param {number} confidence - Confidence score (0-100)
 * @returns {string} CSS class name
 */
export function getConfidenceColorClass(confidence) {
  if (confidence >= 85) return 'confidence-high';
  if (confidence >= 70) return 'confidence-medium';
  return 'confidence-low';
}
