import { readSheetData, appendRow, updateRow, getSheetIdByName } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import axios from 'axios';
import { API_CONFIG } from '../config/constants';
import {
  ENTITY_TYPES,
  ENTITY_CONFIG,
  RELATIONSHIP_TYPES,
  getRelationshipColor,
} from '../utils/entityTypes';

/**
 * Entity Relationship Service
 *
 * Manages relationships between all entity types (contacts, organizations, locations).
 * Extends the contact relationship service to support multi-entity relationships.
 *
 * Storage:
 * - Dev mode: localStorage
 * - Production: Google Sheets (Entity Relationships tab)
 */

const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

// Dev mode storage keys
const DEV_ENTITY_RELATIONSHIPS_KEY = 'test_entity_relationships';

// Get entity relationships from localStorage (dev mode)
const getLocalEntityRelationships = () => {
  if (!isDevMode()) return [];
  const data = localStorage.getItem(DEV_ENTITY_RELATIONSHIPS_KEY);
  return data ? JSON.parse(data) : [];
};

// Save entity relationships to localStorage (dev mode)
const saveLocalEntityRelationships = (relationships) => {
  if (!isDevMode()) return;
  localStorage.setItem(DEV_ENTITY_RELATIONSHIPS_KEY, JSON.stringify(relationships));
};

/**
 * Generate unique Entity Relationship ID (ERE001, ERE002, etc.)
 */
async function generateEntityRelationshipID(accessToken, sheetId) {
  if (isDevMode()) {
    const relationships = getLocalEntityRelationships();
    if (relationships.length === 0) return 'ERE001';

    const ids = relationships
      .map((r) => r['Relationship ID'])
      .filter((id) => id && id.startsWith('ERE'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `ERE${String(maxId + 1).padStart(3, '0')}`;
  }

  // Production mode
  const relationships = await readSheetData(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS);

  if (!relationships || relationships.length === 0) return 'ERE001';

  const ids = relationships
    .map((r) => r['Relationship ID'])
    .filter((id) => id && id.startsWith('ERE'))
    .map((id) => parseInt(id.substring(3), 10))
    .filter((num) => !isNaN(num));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `ERE${String(maxId + 1).padStart(3, '0')}`;
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
 * Create a new relationship between any two entities
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} sourceEntityType - Type of source entity (Contact, Organization, Location)
 * @param {string} sourceEntityId - ID of source entity
 * @param {string} targetEntityType - Type of target entity
 * @param {string} targetEntityId - ID of target entity
 * @param {Object} relationshipData - Relationship information
 * @param {string} relationshipData['Relationship Type'] - Type (Professional, Organizational, Locational, etc.)
 * @param {string} relationshipData['Relationship Subtype'] - Specific relationship
 * @param {boolean} relationshipData['Is Directional'] - TRUE for one-way, FALSE for bidirectional
 * @param {string} relationshipData['Strength'] - Relationship strength (Strong, Good, etc.)
 * @param {string} relationshipData['Notes'] - Additional context
 * @param {string} relationshipData['Date Established'] - When relationship began (optional)
 * @param {string} userEmail - Email of user creating the relationship
 * @returns {Promise<Object>} Created relationship object
 */
export async function createEntityRelationship(
  accessToken,
  sheetId,
  sourceEntityType,
  sourceEntityId,
  targetEntityType,
  targetEntityId,
  relationshipData,
  userEmail
) {
  const timestamp = new Date().toISOString().split('T')[0];

  if (isDevMode()) {
    const relationships = getLocalEntityRelationships();
    const relationshipId = `ERE${String(relationships.length + 1).padStart(3, '0')}`;

    const newRelationship = {
      'Relationship ID': relationshipId,
      'Source Entity Type': sourceEntityType,
      'Source Entity ID': sourceEntityId,
      'Target Entity Type': targetEntityType,
      'Target Entity ID': targetEntityId,
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
    saveLocalEntityRelationships(relationships);
    return newRelationship;
  }

  // Production mode - use Google Sheets
  const relationshipId = await generateEntityRelationshipID(accessToken, sheetId);

  const rowData = [
    relationshipId,
    sourceEntityType,
    sourceEntityId,
    targetEntityType,
    targetEntityId,
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

  await appendRow(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS, rowData);

  return {
    'Relationship ID': relationshipId,
    'Source Entity Type': sourceEntityType,
    'Source Entity ID': sourceEntityId,
    'Target Entity Type': targetEntityType,
    'Target Entity ID': targetEntityId,
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
 * Update an existing entity relationship
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} relationshipId - ID of relationship to update
 * @param {Object} updates - Fields to update
 * @param {string} userEmail - Email of user making the update
 * @returns {Promise<Object>} Updated relationship object
 */
export async function updateEntityRelationship(
  accessToken,
  sheetId,
  relationshipId,
  updates,
  _userEmail
) {
  const timestamp = new Date().toISOString().split('T')[0];

  if (isDevMode()) {
    const relationships = getLocalEntityRelationships();
    const index = relationships.findIndex((r) => r['Relationship ID'] === relationshipId);

    if (index === -1) {
      throw new Error(`Relationship ${relationshipId} not found`);
    }

    relationships[index] = {
      ...relationships[index],
      ...updates,
      'Last Updated': timestamp,
    };

    saveLocalEntityRelationships(relationships);
    return relationships[index];
  }

  // Production mode
  const relationships = await readSheetData(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS);
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
    updatedRelationship['Source Entity Type'],
    updatedRelationship['Source Entity ID'],
    updatedRelationship['Target Entity Type'],
    updatedRelationship['Target Entity ID'],
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
    SHEET_NAMES.ENTITY_RELATIONSHIPS,
    relationship._rowIndex,
    rowData
  );

  return updatedRelationship;
}

/**
 * Delete an entity relationship
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} relationshipId - ID of relationship to delete
 * @param {string} userEmail - Email of user deleting the relationship
 * @returns {Promise<void>}
 */
export async function deleteEntityRelationship(accessToken, sheetId, relationshipId, _userEmail) {
  if (isDevMode()) {
    const relationships = getLocalEntityRelationships();
    const filtered = relationships.filter((r) => r['Relationship ID'] !== relationshipId);
    saveLocalEntityRelationships(filtered);
    return;
  }

  // Production mode
  const relationships = await readSheetData(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS);
  const relationship = relationships.find((r) => r['Relationship ID'] === relationshipId);

  if (!relationship) {
    throw new Error(`Relationship ${relationshipId} not found`);
  }

  await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.ENTITY_RELATIONSHIPS,
    relationship._rowIndex
  );
}

/**
 * Get all relationships for a specific entity
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} entityType - Type of entity (Contact, Organization, Location)
 * @param {string} entityId - ID of entity
 * @returns {Promise<Array>} Array of relationships
 */
export async function getEntityRelationships(accessToken, sheetId, entityType, entityId) {
  if (isDevMode()) {
    const relationships = getLocalEntityRelationships();
    return relationships.filter(
      (r) =>
        (r['Source Entity Type'] === entityType && r['Source Entity ID'] === entityId) ||
        (r['Target Entity Type'] === entityType && r['Target Entity ID'] === entityId)
    );
  }

  // Production mode
  const relationships = await readSheetData(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS);
  return relationships.filter(
    (r) =>
      (r['Source Entity Type'] === entityType && r['Source Entity ID'] === entityId) ||
      (r['Target Entity Type'] === entityType && r['Target Entity ID'] === entityId)
  );
}

/**
 * Get all entity relationships in the system
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<Array>} Array of all relationships
 */
export async function getAllEntityRelationships(accessToken, sheetId) {
  if (isDevMode()) {
    return getLocalEntityRelationships();
  }

  const relationships = await readSheetData(accessToken, sheetId, SHEET_NAMES.ENTITY_RELATIONSHIPS);
  return relationships || [];
}

/**
 * Expand bidirectional relationships for graph visualization
 * Converts single bidirectional row into two edges (A→B and B→A)
 *
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} Expanded relationships (bidirectional relationships appear twice)
 */
export function expandBidirectionalEntityRelationships(relationships) {
  const expanded = [];

  relationships.forEach((rel) => {
    // Always add the original direction
    expanded.push(rel);

    // If bidirectional, add the reverse direction as well
    if (rel['Is Directional'] === 'FALSE' || rel['Is Directional'] === false) {
      expanded.push({
        ...rel,
        'Source Entity Type': rel['Target Entity Type'],
        'Source Entity ID': rel['Target Entity ID'],
        'Target Entity Type': rel['Source Entity Type'],
        'Target Entity ID': rel['Source Entity ID'],
        _reversed: true, // Mark as reversed for UI purposes
      });
    }
  });

  return expanded;
}

/**
 * Build multi-entity relationship network for graph visualization
 * Uses BFS to find all entities within N degrees of separation
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} entityType - Starting entity type
 * @param {string} entityId - Starting entity ID
 * @param {number} depth - Number of degrees of separation (default: 2)
 * @returns {Promise<Object>} { entities: Map, edges: Array }
 */
export async function getRelationshipNetworkMultiEntity(
  accessToken,
  sheetId,
  entityType,
  entityId,
  depth = 2
) {
  const allRelationships = await getAllEntityRelationships(accessToken, sheetId);
  const expanded = expandBidirectionalEntityRelationships(allRelationships);

  // BFS to find all entities within depth levels
  const visited = new Set([`${entityType}:${entityId}`]);
  const queue = [{ type: entityType, id: entityId, level: 0 }];
  const networkEntities = new Map();
  networkEntities.set(`${entityType}:${entityId}`, { type: entityType, id: entityId });
  const networkEdges = [];

  while (queue.length > 0) {
    const { type, id, level } = queue.shift();

    if (level >= depth) continue;

    // Find all relationships from this entity
    const outgoing = expanded.filter(
      (r) => r['Source Entity Type'] === type && r['Source Entity ID'] === id
    );

    outgoing.forEach((rel) => {
      const targetType = rel['Target Entity Type'];
      const targetId = rel['Target Entity ID'];
      const key = `${targetType}:${targetId}`;

      // Add edge
      networkEdges.push(rel);

      // Add target to network if not visited
      if (!visited.has(key)) {
        visited.add(key);
        networkEntities.set(key, { type: targetType, id: targetId });
        queue.push({ type: targetType, id: targetId, level: level + 1 });
      }
    });
  }

  return {
    entities: networkEntities,
    relationships: networkEdges,
  };
}

/**
 * Convert multi-entity relationships to graph data format for ReactFlow
 *
 * @param {Array} relationships - Array of relationship objects
 * @param {Object} entitiesData - Map of entity data { contacts: [], organizations: [], locations: [] }
 * @param {string} primaryEntityType - Type of central entity
 * @param {string} primaryEntityId - ID of central entity
 * @returns {Object} { nodes: Array, edges: Array } in ReactFlow format
 */
export function convertToGraphDataMultiEntity(
  relationships,
  entitiesData,
  primaryEntityType,
  primaryEntityId
) {
  // Create maps for quick lookup
  const contactMap = new Map((entitiesData.contacts || []).map((c) => [c['Contact ID'], c]));
  const organizationMap = new Map(
    (entitiesData.organizations || []).map((o) => [o['Organization ID'], o])
  );
  const locationMap = new Map((entitiesData.locations || []).map((l) => [l['Location ID'], l]));

  // Get unique entities from relationships
  const entityKeys = new Set();
  relationships.forEach((rel) => {
    entityKeys.add(`${rel['Source Entity Type']}:${rel['Source Entity ID']}`);
    entityKeys.add(`${rel['Target Entity Type']}:${rel['Target Entity ID']}`);
  });

  // Create nodes
  const nodes = Array.from(entityKeys).map((key) => {
    const [entityType, entityId] = key.split(':');
    let entity, config;

    // Get entity data and config
    if (entityType === ENTITY_TYPES.CONTACT) {
      entity = contactMap.get(entityId);
      config = ENTITY_CONFIG.Contact;
    } else if (entityType === ENTITY_TYPES.ORGANIZATION) {
      entity = organizationMap.get(entityId);
      config = ENTITY_CONFIG.Organization;
    } else if (entityType === ENTITY_TYPES.LOCATION) {
      entity = locationMap.get(entityId);
      config = ENTITY_CONFIG.Location;
    }

    const isPrimary = entityType === primaryEntityType && entityId === primaryEntityId;

    return {
      id: key,
      type: 'entityNode', // Custom node type for multi-entity
      data: {
        entityType,
        entityId,
        label: entity?.[config?.nameField] || entityId,
        icon: config?.icon || 'Pin',
        color: config?.color || '#6b7280',
        nodeShape: config?.nodeShape || 'circle',
        isPrimary,
      },
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
    };
  });

  // Create edges
  const edges = relationships.map((rel, index) => {
    const isDirectional = rel['Is Directional'] === 'TRUE' || rel['Is Directional'] === true;
    const sourceKey = `${rel['Source Entity Type']}:${rel['Source Entity ID']}`;
    const targetKey = `${rel['Target Entity Type']}:${rel['Target Entity ID']}`;

    return {
      id: `${rel['Relationship ID']}-${index}`,
      source: sourceKey,
      target: targetKey,
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
        sourceEntityType: rel['Source Entity Type'],
        targetEntityType: rel['Target Entity Type'],
      },
      style: {
        stroke: getRelationshipColor(rel['Relationship Type']),
        strokeWidth: getEdgeWidth(rel['Strength']),
      },
      markerEnd: isDirectional ? { type: 'arrowclosed' } : undefined,
    };
  });

  return { nodes, edges };
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

/**
 * Export relationship types from entityTypes.js for convenience
 */
export { RELATIONSHIP_TYPES };
