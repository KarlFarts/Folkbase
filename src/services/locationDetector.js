/**
 * Location Detector Service
 * Detects location mentions using known locations list and pattern matching
 */

import stringSimilarity from 'string-similarity';
import {
  extractLocationPhrases,
  extractAddresses,
  normalizeText,
} from '../utils/textAnalyzer';
import {
  getKnownLocations,
  isIgnored,
} from './braindumpPreferences';

// Threshold for fuzzy location matching
const LOCATION_SIMILARITY_THRESHOLD = 0.85;

/**
 * Detect location mentions in text
 * @param {string} text - The text to analyze
 * @param {Array} events - Array of event objects (for extracting known locations)
 * @returns {Array<{text: string, confidence: number, position: number, matchType: string}>}
 */
export function detectLocations(text, events = []) {
  if (!text) return [];

  const detectedLocations = [];
  const seenLocations = new Set();

  // Build known locations list from events and user preferences
  const knownLocations = buildKnownLocationsList(events);

  // 1. Extract location phrases ("at X", "in Y")
  const locationPhrases = extractLocationPhrases(text);
  locationPhrases.forEach(phrase => {
    if (isIgnored(phrase.text, 'location')) {
      return; // Skip ignored
    }

    const matches = matchAgainstKnownLocations(phrase.text, knownLocations);

    if (matches.length > 0) {
      // Use best match
      const bestMatch = matches[0];
      const normalized = normalizeText(phrase.text);

      if (!seenLocations.has(normalized)) {
        seenLocations.add(normalized);
        detectedLocations.push({
          text: phrase.text,
          confidence: bestMatch.confidence,
          position: phrase.position,
          matchType: 'known-location',
          knownLocation: bestMatch.location,
        });
      }
    } else {
      // Unknown location, lower confidence
      const normalized = normalizeText(phrase.text);

      if (!seenLocations.has(normalized)) {
        seenLocations.add(normalized);
        detectedLocations.push({
          text: phrase.text,
          confidence: 65, // Lower confidence for pattern-only detection
          position: phrase.position,
          matchType: 'pattern',
        });
      }
    }
  });

  // 2. Extract addresses
  const addresses = extractAddresses(text);
  addresses.forEach(address => {
    const normalized = normalizeText(address.text);

    if (!seenLocations.has(normalized) && !isIgnored(address.text, 'location')) {
      seenLocations.add(normalized);
      detectedLocations.push({
        text: address.text,
        confidence: 75, // Medium confidence for address patterns
        position: address.position,
        matchType: 'address',
      });
    }
  });

  // Sort by confidence (highest first)
  detectedLocations.sort((a, b) => b.confidence - a.confidence);

  return detectedLocations;
}

/**
 * Build list of known locations from events and user preferences
 * @param {Array} events - Array of event objects
 * @returns {Array<string>} Known locations
 */
function buildKnownLocationsList(events) {
  const locations = new Set();

  // Add from user preferences
  const userLocations = getKnownLocations();
  userLocations.forEach(loc => locations.add(loc));

  // Add from events
  if (events && Array.isArray(events)) {
    events.forEach(event => {
      if (event.Location) {
        locations.add(event.Location.trim());
      }
    });
  }

  return Array.from(locations);
}

/**
 * Match a location text against known locations
 * @param {string} locationText - Location text to match
 * @param {Array<string>} knownLocations - Known locations list
 * @returns {Array<{location: string, confidence: number}>}
 */
function matchAgainstKnownLocations(locationText, knownLocations) {
  const matches = [];
  const normalized = normalizeText(locationText);

  knownLocations.forEach(knownLocation => {
    const knownNormalized = normalizeText(knownLocation);

    // Exact match
    if (normalized === knownNormalized) {
      matches.push({
        location: knownLocation,
        confidence: 100,
      });
      return;
    }

    // Fuzzy match
    const similarity = stringSimilarity.compareTwoStrings(normalized, knownNormalized);

    if (similarity >= LOCATION_SIMILARITY_THRESHOLD) {
      matches.push({
        location: knownLocation,
        confidence: Math.round(similarity * 100),
        similarity,
      });
    }
  });

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}
