/**
 * Entity Type System
 *
 * Defines the three core entity types in Folkbase:
 * - Contacts: People (customers, volunteers, community members, etc.)
 * - Organizations: Companies, non-profits, government agencies, etc.
 * - Locations: Physical places (offices, venues, stores, etc.)
 *
 * This configuration provides metadata for each entity type including
 * ID prefixes, field names, visual styling (icons, colors, node shapes),
 * and sheet mappings.
 */

import { SHEET_NAMES } from '../config/constants';

/**
 * Entity type constants
 */
export const ENTITY_TYPES = {
  CONTACT: 'Contact',
  ORGANIZATION: 'Organization',
  LOCATION: 'Location',
};

/**
 * Entity configuration with metadata for each type
 *
 * Each entity type has:
 * - idPrefix: Prefix for auto-generated IDs (CON001, ORG001, LOC001)
 * - idField: Field name for the entity's ID
 * - nameField: Field name for the entity's display name
 * - icon: Emoji icon for visual identification
 * - color: Brand color (used for borders, badges, graph nodes)
 * - nodeShape: Shape for relationship graph nodes
 * - sheetName: Google Sheets tab name
 * - pluralLabel: Plural form for UI labels
 * - addRoute: Route for "Add Entity" page
 * - listRoute: Route for entity list page
 * - profileRoute: Route pattern for entity profile (use :id placeholder)
 */
export const ENTITY_CONFIG = {
  Contact: {
    idPrefix: 'CON',
    idField: 'Contact ID',
    nameField: 'Name',
    icon: 'User',
    color: '#c2703e', // Terracotta
    nodeShape: 'circle',
    sheetName: SHEET_NAMES.CONTACTS,
    pluralLabel: 'Contacts',
    addRoute: '/add-contact',
    listRoute: '/contacts',
    profileRoute: '/contact/:id',
  },
  Organization: {
    idPrefix: 'ORG',
    idField: 'Organization ID',
    nameField: 'Name',
    icon: 'Building2',
    color: '#d4875a', // Warm clay
    nodeShape: 'rectangle',
    sheetName: SHEET_NAMES.ORGANIZATIONS,
    pluralLabel: 'Organizations',
    addRoute: '/add-organization',
    listRoute: '/organizations',
    profileRoute: '/organization/:id',
  },
  Location: {
    idPrefix: 'LOC',
    idField: 'Location ID',
    nameField: 'Name',
    icon: 'MapPin',
    color: '#059669', // Success green
    nodeShape: 'diamond',
    sheetName: SHEET_NAMES.LOCATIONS,
    pluralLabel: 'Locations',
    addRoute: '/add-location',
    listRoute: '/locations',
    profileRoute: '/location/:id',
  },
};

/**
 * Get entity configuration by type
 * @param {string} entityType - Entity type (Contact, Organization, Location)
 * @returns {Object} Entity configuration object
 */
export function getEntityConfig(entityType) {
  if (!ENTITY_CONFIG[entityType]) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return ENTITY_CONFIG[entityType];
}

/**
 * Get entity type from ID prefix
 * @param {string} id - Entity ID (e.g., CON001, ORG001, LOC001)
 * @returns {string} Entity type
 */
export function getEntityTypeFromId(id) {
  if (!id) return null;

  const prefix = id.substring(0, 3);

  for (const [type, config] of Object.entries(ENTITY_CONFIG)) {
    if (config.idPrefix === prefix) {
      return type;
    }
  }

  return null;
}

/**
 * Get profile route for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {string} Profile route path
 */
export function getEntityProfileRoute(entityType, entityId) {
  const config = getEntityConfig(entityType);
  return config.profileRoute.replace(':id', entityId);
}

/**
 * Relationship type configurations
 * Extends the existing contact-to-contact relationship types
 * with new types for cross-entity relationships
 */
export const RELATIONSHIP_TYPES = {
  Familial: {
    label: 'Familial',
    color: '#dc2626', // Red/danger
    subtypes: [
      'Spouse',
      'Partner',
      'Parent',
      'Child',
      'Sibling',
      'Grandparent',
      'Grandchild',
      'Aunt/Uncle',
      'Niece/Nephew',
      'Cousin',
      'Extended Family',
    ],
    validEntityTypes: ['Contact'], // Only contacts can have familial relationships
  },
  Professional: {
    label: 'Professional',
    color: '#c2703e', // Terracotta
    subtypes: [
      'Manager',
      'Employee',
      'Colleague',
      'Client',
      'Vendor',
      'Mentor',
      'Mentee',
      'Business Partner',
      'Consultant',
    ],
    validEntityTypes: ['Contact', 'Organization'], // Contacts and orgs
  },
  Social: {
    label: 'Social',
    color: '#059669', // Success green
    subtypes: [
      'Friend',
      'Close Friend',
      'Acquaintance',
      'Neighbor',
      'Volunteer',
      'Club Member',
      'Classmate',
      'Teammate',
    ],
    validEntityTypes: ['Contact'], // Only contacts
  },
  Organizational: {
    label: 'Organizational',
    color: '#d4875a', // Warm clay
    subtypes: [
      'Employee',
      'Manager',
      'Board Member',
      'Volunteer',
      'Client',
      'Vendor',
      'Partner',
      'Founder',
      'Advisor',
      'Member',
    ],
    validEntityTypes: ['Contact', 'Organization'], // Contact <-> Organization relationships
  },
  Locational: {
    label: 'Locational',
    color: '#7c6853', // Warm brown/info
    subtypes: [
      'Works At',
      'Lives Near',
      'Owns',
      'Manages',
      'Frequent Visitor',
      'Event Location',
      'Headquarters',
      'Branch Location',
    ],
    validEntityTypes: ['Contact', 'Organization', 'Location'], // Any entity can relate to a location
  },
  Custom: {
    label: 'Custom',
    color: '#8b5cf6', // Purple
    subtypes: [],
    validEntityTypes: ['Contact', 'Organization', 'Location'], // Any to any
  },
};

/**
 * Get relationship type color
 * @param {string} relationshipType - Relationship type name
 * @returns {string} Hex color code
 */
export function getRelationshipColor(relationshipType) {
  const type = RELATIONSHIP_TYPES[relationshipType];
  return type ? type.color : '#8b5cf6'; // Default to purple for unknown types
}

/**
 * Get valid relationship types for a pair of entities
 * @param {string} sourceEntityType - Source entity type
 * @param {string} targetEntityType - Target entity type
 * @returns {Array} Array of valid relationship type names
 */
export function getValidRelationshipTypes(sourceEntityType, targetEntityType) {
  const validTypes = [];

  for (const [typeName, typeConfig] of Object.entries(RELATIONSHIP_TYPES)) {
    const validForSource = typeConfig.validEntityTypes.includes(sourceEntityType);
    const validForTarget = typeConfig.validEntityTypes.includes(targetEntityType);

    if (validForSource && validForTarget) {
      validTypes.push(typeName);
    }
  }

  return validTypes;
}

/**
 * Check if a relationship type is valid for a pair of entities
 * @param {string} relationshipType - Relationship type
 * @param {string} sourceEntityType - Source entity type
 * @param {string} targetEntityType - Target entity type
 * @returns {boolean} True if valid
 */
export function isValidRelationshipType(relationshipType, sourceEntityType, targetEntityType) {
  const typeConfig = RELATIONSHIP_TYPES[relationshipType];
  if (!typeConfig) return false;

  const validForSource = typeConfig.validEntityTypes.includes(sourceEntityType);
  const validForTarget = typeConfig.validEntityTypes.includes(targetEntityType);

  return validForSource && validForTarget;
}

export default {
  ENTITY_TYPES,
  ENTITY_CONFIG,
  RELATIONSHIP_TYPES,
  getEntityConfig,
  getEntityTypeFromId,
  getEntityProfileRoute,
  getRelationshipColor,
  getValidRelationshipTypes,
  isValidRelationshipType,
};
