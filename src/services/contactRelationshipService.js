import { readSheetData, appendRow, updateRow, getSheetIdByName } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import axios from 'axios';
import { API_CONFIG } from '../config/constants';
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

/**
 * Contact Relationship Service
 *
 * Manages contact relationship network (family, professional, social connections).
 * Supports bidirectional and directional relationships with metadata.
 *
 * Relationship Types:
 * - Familial: Parent, Child, Spouse, Sibling, etc.
 * - Professional: Manager, Employee, Colleague, Client, Mentor, etc.
 * - Social: Friend, Acquaintance, Neighbor, etc.
 * - Custom: User-defined relationship types
 *
 * Storage:
 * - Dev mode: localStorage
 * - Production: Google Sheets (Contact Relationships tab)
 */

const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

// Dev mode storage keys
const DEV_RELATIONSHIPS_KEY = 'test_contact_relationships';

// Relationship type constants
export const RELATIONSHIP_TYPES = {
  FAMILIAL: 'Familial',
  PROFESSIONAL: 'Professional',
  SOCIAL: 'Social',
  CUSTOM: 'Custom',
};

// Predefined subtypes for each relationship type
export const RELATIONSHIP_SUBTYPES = {
  FAMILIAL: [
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
  PROFESSIONAL: [
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
  SOCIAL: [
    'Friend',
    'Close Friend',
    'Acquaintance',
    'Neighbor',
    'Volunteer',
    'Club Member',
    'Classmate',
    'Teammate',
  ],
  CUSTOM: [], // User-defined
};

// Relationship strength options
export const RELATIONSHIP_STRENGTH = {
  STRONG: 'Strong',
  GOOD: 'Good',
  DEVELOPING: 'Developing',
  NEW: 'New',
  WEAK: 'Weak',
};

// Get relationships from localStorage (dev mode)
const getLocalRelationships = () => {
  if (!isDevMode()) return [];
  const data = localStorage.getItem(DEV_RELATIONSHIPS_KEY);
  return data ? JSON.parse(data) : [];
};

// Save relationships to localStorage (dev mode)
const saveLocalRelationships = (relationships) => {
  if (!isDevMode()) return;
  localStorage.setItem(DEV_RELATIONSHIPS_KEY, JSON.stringify(relationships));
};

/**
 * Generate unique Relationship ID (REL-xxxxxxxx)
 */
async function generateRelationshipID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.RELATIONSHIP);
}

/**
 * Helper to create axios client for Sheets API
 */
function createSheetsClient(accessToken) {
  return axios.create({
    baseURL: API_CONFIG.SHEETS_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper to delete a row from a sheet by row index
 */
async function deleteSheetRow(accessToken, sheetId, sheetName, rowIndex) {
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, sheetName);
  const client = createSheetsClient(accessToken);
  await client.post(`/${sheetId}:batchUpdate`, {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: internalSheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      },
    ],
  });
}

/**
 * Create a new relationship between two contacts
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} relationshipData - Relationship information
 * @param {string} relationshipData['Source Contact ID'] - ID of source contact
 * @param {string} relationshipData['Target Contact ID'] - ID of target contact
 * @param {string} relationshipData['Relationship Type'] - Type (Familial, Professional, Social, Custom)
 * @param {string} relationshipData['Relationship Subtype'] - Specific relationship (Spouse, Manager, Friend, etc.)
 * @param {boolean} relationshipData['Is Directional'] - TRUE for one-way, FALSE for bidirectional
 * @param {string} relationshipData['Strength'] - Relationship strength (Strong, Good, etc.)
 * @param {string} relationshipData['Notes'] - Additional context
 * @param {string} relationshipData['Date Established'] - When relationship began (optional)
 * @param {string} userEmail - Email of user creating the relationship
 * @returns {Promise<Object>} Created relationship object
 */
export async function createRelationship(accessToken, sheetId, relationshipData, userEmail) {
  const timestamp = new Date().toISOString().split('T')[0];

  if (isDevMode()) {
    const relationshipId = generateId(ID_PREFIXES.RELATIONSHIP);
    const relationships = getLocalRelationships();

    const newRelationship = {
      'Relationship ID': relationshipId,
      'Source Contact ID': relationshipData['Source Contact ID'],
      'Target Contact ID': relationshipData['Target Contact ID'],
      'Relationship Type': relationshipData['Relationship Type'],
      'Relationship Subtype': relationshipData['Relationship Subtype'] || '',
      'Is Directional': relationshipData['Is Directional'] ? 'TRUE' : 'FALSE',
      Strength: relationshipData['Strength'] || 'Good',
      Notes: relationshipData['Notes'] || '',
      'Date Established': relationshipData['Date Established'] || '',
      'Created By': userEmail,
      'Created Date': timestamp,
      'Last Updated': timestamp,
    };

    relationships.push(newRelationship);
    saveLocalRelationships(relationships);
    return newRelationship;
  }

  // Production mode - use Google Sheets
  const relationshipId = await generateRelationshipID(accessToken, sheetId);

  const rowData = [
    relationshipId,
    relationshipData['Source Contact ID'],
    relationshipData['Target Contact ID'],
    relationshipData['Relationship Type'],
    relationshipData['Relationship Subtype'] || '',
    relationshipData['Is Directional'] ? 'TRUE' : 'FALSE',
    relationshipData['Strength'] || 'Good',
    relationshipData['Notes'] || '',
    relationshipData['Date Established'] || '',
    userEmail,
    timestamp,
    timestamp,
  ];

  await appendRow(accessToken, sheetId, SHEET_NAMES.CONTACT_RELATIONSHIPS, rowData);

  return {
    'Relationship ID': relationshipId,
    'Source Contact ID': relationshipData['Source Contact ID'],
    'Target Contact ID': relationshipData['Target Contact ID'],
    'Relationship Type': relationshipData['Relationship Type'],
    'Relationship Subtype': relationshipData['Relationship Subtype'] || '',
    'Is Directional': relationshipData['Is Directional'] ? 'TRUE' : 'FALSE',
    Strength: relationshipData['Strength'] || 'Good',
    Notes: relationshipData['Notes'] || '',
    'Date Established': relationshipData['Date Established'] || '',
    'Created By': userEmail,
    'Created Date': timestamp,
    'Last Updated': timestamp,
  };
}

/**
 * Update an existing relationship
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} relationshipId - ID of relationship to update
 * @param {Object} updates - Fields to update
 * @param {string} userEmail - Email of user making the update
 * @returns {Promise<Object>} Updated relationship object
 */
export async function updateRelationship(
  accessToken,
  sheetId,
  relationshipId,
  updates,
  _userEmail
) {
  const timestamp = new Date().toISOString().split('T')[0];

  if (isDevMode()) {
    const relationships = getLocalRelationships();
    const index = relationships.findIndex((r) => r['Relationship ID'] === relationshipId);

    if (index === -1) {
      throw new Error(`Relationship ${relationshipId} not found`);
    }

    relationships[index] = {
      ...relationships[index],
      ...updates,
      'Last Updated': timestamp,
    };

    saveLocalRelationships(relationships);
    return relationships[index];
  }

  // Production mode
  const relationships = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_RELATIONSHIPS
  );
  const relationship = relationships.find((r) => r['Relationship ID'] === relationshipId);

  if (!relationship) {
    throw new Error(`Relationship ${relationshipId} not found`);
  }

  const updatedRelationship = {
    ...relationship,
    ...updates,
    'Last Updated': timestamp,
  };

  const rowData = [
    updatedRelationship['Relationship ID'],
    updatedRelationship['Source Contact ID'],
    updatedRelationship['Target Contact ID'],
    updatedRelationship['Relationship Type'],
    updatedRelationship['Relationship Subtype'] || '',
    updatedRelationship['Is Directional'],
    updatedRelationship['Strength'] || '',
    updatedRelationship['Notes'] || '',
    updatedRelationship['Date Established'] || '',
    updatedRelationship['Created By'],
    updatedRelationship['Created Date'],
    updatedRelationship['Last Updated'],
  ];

  await updateRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_RELATIONSHIPS,
    relationship._rowIndex,
    rowData
  );

  return updatedRelationship;
}

/**
 * Delete a relationship
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} relationshipId - ID of relationship to delete
 * @param {string} userEmail - Email of user deleting the relationship
 * @returns {Promise<void>}
 */
export async function deleteRelationship(accessToken, sheetId, relationshipId, _userEmail) {
  if (isDevMode()) {
    const relationships = getLocalRelationships();
    const filtered = relationships.filter((r) => r['Relationship ID'] !== relationshipId);
    saveLocalRelationships(filtered);
    return;
  }

  // Production mode
  const relationships = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_RELATIONSHIPS
  );
  const relationship = relationships.find((r) => r['Relationship ID'] === relationshipId);

  if (!relationship) {
    throw new Error(`Relationship ${relationshipId} not found`);
  }

  await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_RELATIONSHIPS,
    relationship._rowIndex
  );
}

/**
 * Get all relationships for a specific contact
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} contactId - ID of contact
 * @returns {Promise<Array>} Array of relationships
 */
export async function getContactRelationships(accessToken, sheetId, contactId) {
  if (isDevMode()) {
    const relationships = getLocalRelationships();
    return relationships.filter(
      (r) => r['Source Contact ID'] === contactId || r['Target Contact ID'] === contactId
    );
  }

  // Production mode
  const relationships = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_RELATIONSHIPS
  );
  return relationships.filter(
    (r) => r['Source Contact ID'] === contactId || r['Target Contact ID'] === contactId
  );
}

/**
 * Get all relationships in the system
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<Array>} Array of all relationships
 */
export async function getAllRelationships(accessToken, sheetId) {
  if (isDevMode()) {
    return getLocalRelationships();
  }

  return await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_RELATIONSHIPS);
}

/**
 * Expand bidirectional relationships for graph visualization
 * Converts single bidirectional row into two edges (A→B and B→A)
 *
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} Expanded relationships (bidirectional relationships appear twice)
 */
export function expandBidirectionalRelationships(relationships) {
  const expanded = [];

  relationships.forEach((rel) => {
    // Always add the original direction
    expanded.push(rel);

    // If bidirectional, add the reverse direction as well
    if (rel['Is Directional'] === 'FALSE' || rel['Is Directional'] === false) {
      expanded.push({
        ...rel,
        'Source Contact ID': rel['Target Contact ID'],
        'Target Contact ID': rel['Source Contact ID'],
        _reversed: true, // Mark as reversed for UI purposes
      });
    }
  });

  return expanded;
}

/**
 * Build relationship network for graph visualization
 * Uses BFS to find all contacts within N degrees of separation
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} contactId - Starting contact ID
 * @param {number} depth - Number of degrees of separation (default: 2)
 * @returns {Promise<Object>} { nodes: Array, edges: Array, contacts: Array }
 */
export async function getRelationshipNetwork(accessToken, sheetId, contactId, depth = 2) {
  const allRelationships = await getAllRelationships(accessToken, sheetId);
  const expanded = expandBidirectionalRelationships(allRelationships);

  // BFS to find all contacts within depth levels
  const visited = new Set([contactId]);
  const queue = [{ id: contactId, level: 0 }];
  const networkContactIds = new Set([contactId]);
  const networkEdges = [];

  while (queue.length > 0) {
    const { id, level } = queue.shift();

    if (level >= depth) continue;

    // Find all relationships from this contact
    const outgoing = expanded.filter((r) => r['Source Contact ID'] === id);

    outgoing.forEach((rel) => {
      const targetId = rel['Target Contact ID'];

      // Add edge
      networkEdges.push(rel);

      // Add target to network if not visited
      if (!visited.has(targetId)) {
        visited.add(targetId);
        networkContactIds.add(targetId);
        queue.push({ id: targetId, level: level + 1 });
      }
    });
  }

  return {
    contactIds: Array.from(networkContactIds),
    relationships: networkEdges,
  };
}

/**
 * Find shortest path between two contacts
 * Uses BFS to find the shortest relationship path
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} sourceContactId - Starting contact ID
 * @param {string} targetContactId - Destination contact ID
 * @returns {Promise<Array|null>} Array of contact IDs representing path, or null if no path exists
 */
export async function findPath(accessToken, sheetId, sourceContactId, targetContactId) {
  if (sourceContactId === targetContactId) {
    return [sourceContactId];
  }

  const allRelationships = await getAllRelationships(accessToken, sheetId);
  const expanded = expandBidirectionalRelationships(allRelationships);

  // BFS for shortest path
  const visited = new Set([sourceContactId]);
  const queue = [{ id: sourceContactId, path: [sourceContactId] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift();

    // Find all relationships from this contact
    const outgoing = expanded.filter((r) => r['Source Contact ID'] === id);

    for (const rel of outgoing) {
      const nextId = rel['Target Contact ID'];

      if (nextId === targetContactId) {
        return [...path, nextId];
      }

      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, path: [...path, nextId] });
      }
    }
  }

  return null; // No path found
}

/**
 * Convert relationships and contacts to graph data format for ReactFlow
 *
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} contacts - Array of contact objects
 * @param {string} primaryContactId - ID of the central contact (highlighted differently)
 * @returns {Object} { nodes: Array, edges: Array } in ReactFlow format
 */
export function convertToGraphData(relationships, contacts, primaryContactId) {
  // Create a map for quick contact lookup
  const contactMap = new Map(contacts.map((c) => [c['Contact ID'], c]));

  // Get unique contact IDs from relationships
  const contactIds = new Set();
  relationships.forEach((rel) => {
    contactIds.add(rel['Source Contact ID']);
    contactIds.add(rel['Target Contact ID']);
  });

  // Create nodes
  const nodes = Array.from(contactIds).map((contactId) => {
    const contact = contactMap.get(contactId);
    return {
      id: contactId,
      type: 'contactNode',
      data: {
        label: contact?.Name || contactId,
        organization: contact?.Organization || '',
        isPrimary: contactId === primaryContactId,
      },
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
    };
  });

  // Create edges
  const edges = relationships.map((rel, index) => {
    const isDirectional = rel['Is Directional'] === 'TRUE' || rel['Is Directional'] === true;

    return {
      id: `${rel['Relationship ID']}-${index}`,
      source: rel['Source Contact ID'],
      target: rel['Target Contact ID'],
      type: isDirectional ? 'default' : 'straight',
      animated: false,
      label: rel['Relationship Subtype'] || rel['Relationship Type'],
      data: {
        relationshipId: rel['Relationship ID'],
        type: rel['Relationship Type'],
        subtype: rel['Relationship Subtype'],
        strength: rel['Strength'],
        notes: rel['Notes'],
        isDirectional,
      },
      style: {
        stroke: getEdgeColor(rel['Relationship Type']),
        strokeWidth: getEdgeWidth(rel['Strength']),
      },
      markerEnd: isDirectional ? { type: 'arrowclosed' } : undefined,
    };
  });

  return { nodes, edges };
}

/**
 * Get edge color based on relationship type
 */
function getEdgeColor(relationshipType) {
  const colors = {
    Familial: '#dc2626', // Red/danger
    Professional: '#c2703e', // Terracotta
    Social: '#059669', // Success green
    Custom: '#8b5cf6', // Purple
  };
  return colors[relationshipType] || '#6b7280'; // Muted gray default
}

/**
 * Get edge width based on relationship strength
 */
function getEdgeWidth(strength) {
  const widths = {
    Strong: 3,
    Good: 2,
    Developing: 1.5,
    New: 1,
    Weak: 1,
  };
  return widths[strength] || 1.5;
}
