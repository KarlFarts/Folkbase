import { readSheetData, appendRow, updateContact, getSheetIdByName } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import axios from 'axios';
import { API_CONFIG } from '../config/constants';
import { generateSecureId } from '../utils/secureId';

/**
 * Contact Link Service
 *
 * Manages contact syncing across workspaces (personal and shared).
 * Supports three sync strategies:
 * - core_fields_only: Name, Phone, Email only
 * - all_fields: Complete contact sync
 * - custom: User-selected fields
 *
 * Handles conflict detection and resolution when same field edited in both workspaces.
 *
 * Storage:
 * - Dev mode: localStorage
 * - Production: Google Sheets (Contact Links and Sync Conflicts tabs)
 */

const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

// Dev mode storage keys
const DEV_CONTACT_LINKS_KEY = 'test_contact_links';
const DEV_SYNC_CONFLICTS_KEY = 'test_sync_conflicts';

// Core fields that sync in "core_fields_only" strategy
const CORE_FIELDS = ['Name', 'Phone', 'Email'];

// Get contact links from localStorage (dev mode)
const getLocalContactLinks = () => {
  if (!isDevMode()) return [];
  const data = localStorage.getItem(DEV_CONTACT_LINKS_KEY);
  return data ? JSON.parse(data) : [];
};

// Save contact links to localStorage (dev mode)
const saveLocalContactLinks = (links) => {
  if (!isDevMode()) return;
  localStorage.setItem(DEV_CONTACT_LINKS_KEY, JSON.stringify(links));
};

// Get sync conflicts from localStorage (dev mode)
const getLocalSyncConflicts = () => {
  if (!isDevMode()) return [];
  const data = localStorage.getItem(DEV_SYNC_CONFLICTS_KEY);
  return data ? JSON.parse(data) : [];
};

// Save sync conflicts to localStorage (dev mode)
const saveLocalSyncConflicts = (conflicts) => {
  if (!isDevMode()) return;
  localStorage.setItem(DEV_SYNC_CONFLICTS_KEY, JSON.stringify(conflicts));
};

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
 * Helper to update a row in a sheet
 */
async function updateSheetRow(accessToken, sheetId, sheetName, rowIndex, values) {
  const client = createSheetsClient(accessToken);
  const range = `'${sheetName}'!A${rowIndex}`;
  await client.put(
    `/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      values: [values],
    }
  );
}

/**
 * Convert link object to row values for Google Sheets
 */
function linkToRowValues(link) {
  return [
    link.id || link['Link ID'],
    link.source_workspace_type,
    link.source_workspace_id,
    link.source_contact_id,
    link.source_sheet_id,
    link.target_workspace_type,
    link.target_workspace_id,
    link.target_contact_id,
    link.target_sheet_id,
    link.sync_strategy,
    JSON.stringify(link.custom_fields || []),
    link.linked_at,
    link.linked_by,
    link.last_synced_at,
    link.has_conflict ? 'TRUE' : 'FALSE',
    JSON.stringify(link.conflict_fields || []),
  ];
}

/**
 * Convert row data from Google Sheets to link object
 */
function rowToLink(row) {
  return {
    id: row['Link ID'],
    _rowIndex: row._rowIndex,
    source_workspace_type: row['Source Workspace Type'],
    source_workspace_id: row['Source Workspace ID'],
    source_contact_id: row['Source Contact ID'],
    source_sheet_id: row['Source Sheet ID'],
    target_workspace_type: row['Target Workspace Type'],
    target_workspace_id: row['Target Workspace ID'],
    target_contact_id: row['Target Contact ID'],
    target_sheet_id: row['Target Sheet ID'],
    sync_strategy: row['Sync Strategy'],
    custom_fields: JSON.parse(row['Custom Fields'] || '[]'),
    linked_at: row['Linked At'],
    linked_by: row['Linked By'],
    last_synced_at: row['Last Synced At'],
    has_conflict: row['Has Conflict'] === 'TRUE',
    conflict_fields: JSON.parse(row['Conflict Fields'] || '[]'),
  };
}

/**
 * Convert conflict object to row values for Google Sheets
 */
function conflictToRowValues(conflict) {
  return [
    conflict.id || conflict['Conflict ID'],
    conflict.link_id,
    conflict.field_name,
    conflict.source_value || '',
    conflict.target_value || '',
    conflict.source_modified_at,
    conflict.target_modified_at,
    conflict.detected_at,
    conflict.resolved ? 'TRUE' : 'FALSE',
    conflict.resolved_at || '',
    conflict.resolved_by || '',
    conflict.resolution || '',
  ];
}

/**
 * Convert row data from Google Sheets to conflict object
 */
function rowToConflict(row) {
  return {
    id: row['Conflict ID'],
    _rowIndex: row._rowIndex,
    link_id: row['Link ID'],
    field_name: row['Field Name'],
    source_value: row['Source Value'],
    target_value: row['Target Value'],
    source_modified_at: row['Source Modified At'],
    target_modified_at: row['Target Modified At'],
    detected_at: row['Detected At'],
    resolved: row['Resolved'] === 'TRUE',
    resolved_at: row['Resolved At'] || null,
    resolved_by: row['Resolved By'] || null,
    resolution: row['Resolution'] || null,
  };
}

/**
 * Create a contact link between two workspaces
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links
 * @param {object} sourceWorkspace - { type: 'personal'|'workspace', id: email|workspaceId, sheetId, contactId }
 * @param {object} targetWorkspace - { type: 'personal'|'workspace', id: email|workspaceId, sheetId, contactId }
 * @param {string} syncStrategy - 'core_fields_only' | 'all_fields' | 'custom'
 * @param {array} customFields - If strategy is 'custom', list of field names
 * @param {string} linkedBy - Email of user creating the link
 * @returns {Promise<object>} Created link with ID
 */
export const createContactLink = async (
  accessToken,
  sheetId,
  sourceWorkspace,
  targetWorkspace,
  syncStrategy = 'core_fields_only',
  customFields = [],
  linkedBy
) => {
  const newLink = {
    id: generateSecureId('link'),
    source_workspace_type: sourceWorkspace.type,
    source_workspace_id: sourceWorkspace.id,
    source_contact_id: sourceWorkspace.contactId,
    source_sheet_id: sourceWorkspace.sheetId,
    target_workspace_type: targetWorkspace.type,
    target_workspace_id: targetWorkspace.id,
    target_contact_id: targetWorkspace.contactId,
    target_sheet_id: targetWorkspace.sheetId,
    sync_strategy: syncStrategy,
    custom_fields: customFields,
    linked_at: new Date().toISOString(),
    linked_by: linkedBy,
    last_synced_at: new Date().toISOString(),
    has_conflict: false,
    conflict_fields: [],
  };

  if (isDevMode()) {
    const links = getLocalContactLinks();
    links.push(newLink);
    saveLocalContactLinks(links);
    return newLink;
  }

  // Production: Google Sheets
  await appendRow(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS, linkToRowValues(newLink));
  return newLink;
};

/**
 * Get all contact links for a specific contact in a workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links
 * @param {string} workspaceType - 'personal' or 'workspace'
 * @param {string} workspaceId - User email or workspace ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<array>} Array of contact links
 */
export const getContactLinks = async (
  accessToken,
  sheetId,
  workspaceType,
  workspaceId,
  contactId
) => {
  if (isDevMode()) {
    const links = getLocalContactLinks();
    return links.filter(
      (link) =>
        (link.source_workspace_type === workspaceType &&
          link.source_workspace_id === workspaceId &&
          link.source_contact_id === contactId) ||
        (link.target_workspace_type === workspaceType &&
          link.target_workspace_id === workspaceId &&
          link.target_contact_id === contactId)
    );
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS);
  if (!data || data.length === 0) return [];

  return data
    .filter(
      (row) =>
        (row['Source Workspace Type'] === workspaceType &&
          row['Source Workspace ID'] === workspaceId &&
          row['Source Contact ID'] === contactId) ||
        (row['Target Workspace Type'] === workspaceType &&
          row['Target Workspace ID'] === workspaceId &&
          row['Target Contact ID'] === contactId)
    )
    .map(rowToLink);
};

/**
 * Get a single contact link by ID
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links
 * @param {string} linkId - Contact link ID
 * @returns {Promise<object|null>} Contact link or null
 */
export const getContactLinkById = async (accessToken, sheetId, linkId) => {
  if (isDevMode()) {
    const links = getLocalContactLinks();
    return links.find((l) => l.id === linkId) || null;
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS);
  if (!data || data.length === 0) return null;

  const row = data.find((r) => r['Link ID'] === linkId);
  return row ? rowToLink(row) : null;
};

/**
 * Get all workspaces where this contact exists (linked)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links
 * @param {string} workspaceType - Current workspace type
 * @param {string} workspaceId - Current workspace ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<array>} Array of workspaces with workspace names
 */
export const getAllLinkedWorkspaces = async (
  accessToken,
  sheetId,
  workspaceType,
  workspaceId,
  contactId
) => {
  const links = await getContactLinks(accessToken, sheetId, workspaceType, workspaceId, contactId);

  const workspaces = [];

  for (const link of links) {
    // Determine if current workspace is source or target
    const isSource =
      link.source_workspace_type === workspaceType &&
      link.source_workspace_id === workspaceId &&
      link.source_contact_id === contactId;

    const otherWorkspace = isSource
      ? {
          type: link.target_workspace_type,
          id: link.target_workspace_id,
          contactId: link.target_contact_id,
          sheetId: link.target_sheet_id,
        }
      : {
          type: link.source_workspace_type,
          id: link.source_workspace_id,
          contactId: link.source_contact_id,
          sheetId: link.source_sheet_id,
        };

    // If it's a workspace, fetch workspace name from the Workspaces sheet
    if (otherWorkspace.type === 'workspace') {
      if (isDevMode()) {
        const workspaces = JSON.parse(localStorage.getItem('test_workspaces') || '[]');
        const ws = workspaces.find((w) => w.id === otherWorkspace.id);
        otherWorkspace.name = ws?.name || 'Unknown Workspace';
      } else {
        // Read from Workspaces sheet
        const workspaces = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
        const ws = workspaces?.find((w) => w['Workspace ID'] === otherWorkspace.id);
        otherWorkspace.name = ws?.Name || 'Unknown Workspace';
      }
    } else {
      otherWorkspace.name = 'Personal Contacts';
    }

    workspaces.push({ ...otherWorkspace, linkId: link.id, hasConflict: link.has_conflict });
  }

  return workspaces;
};

/**
 * Get fields to sync based on strategy
 */
const getFieldsToSync = (syncStrategy, customFields, sourceContact) => {
  switch (syncStrategy) {
    case 'core_fields_only':
      return CORE_FIELDS;
    case 'all_fields':
      return Object.keys(sourceContact);
    case 'custom':
      return customFields;
    default:
      return CORE_FIELDS;
  }
};

/**
 * Update a contact link's last synced timestamp
 */
async function updateLinkSyncTimestamp(accessToken, sheetId, linkId) {
  if (isDevMode()) {
    const links = getLocalContactLinks();
    const index = links.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      links[index].last_synced_at = new Date().toISOString();
      saveLocalContactLinks(links);
    }
    return;
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS);
  const row = data?.find((r) => r['Link ID'] === linkId);
  if (row) {
    const link = rowToLink(row);
    link.last_synced_at = new Date().toISOString();
    await updateSheetRow(
      accessToken,
      sheetId,
      SHEET_NAMES.CONTACT_LINKS,
      row._rowIndex,
      linkToRowValues(link)
    );
  }
}

/**
 * Sync contact data from source to target based on link strategy
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links
 * @param {string} linkId - Contact link ID
 * @param {string} direction - 'source_to_target' | 'target_to_source' | 'bidirectional'
 * @param {string} userEmail - Email of user performing sync
 * @returns {Promise<object>} Sync result
 */
export const syncContactData = async (
  accessToken,
  sheetId,
  linkId,
  direction = 'source_to_target',
  userEmail
) => {
  // Get link
  const link = await getContactLinkById(accessToken, sheetId, linkId);
  if (!link) throw new Error('Contact link not found');

  // Read source and target contacts
  const sourceContact = await readSheetData(accessToken, link.source_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.source_contact_id)
  );

  const targetContact = await readSheetData(accessToken, link.target_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.target_contact_id)
  );

  if (!sourceContact || !targetContact) {
    throw new Error('Source or target contact not found');
  }

  // Get fields to sync
  const fieldsToSync = getFieldsToSync(link.sync_strategy, link.custom_fields, sourceContact);

  // Build update data
  const updates = {};
  fieldsToSync.forEach((field) => {
    if (direction === 'source_to_target' || direction === 'bidirectional') {
      updates[field] = sourceContact[field];
    }
  });

  // Update target contact
  await updateContact(
    accessToken,
    link.target_sheet_id,
    link.target_contact_id,
    targetContact,
    { ...targetContact, ...updates },
    userEmail
  );

  // Update last synced timestamp
  await updateLinkSyncTimestamp(accessToken, sheetId, linkId);

  return {
    success: true,
    fieldsSynced: fieldsToSync,
    direction,
  };
};

/**
 * Update a contact link with conflict status
 */
async function updateLinkConflictStatus(accessToken, sheetId, linkId, hasConflict, conflictFields) {
  if (isDevMode()) {
    const links = getLocalContactLinks();
    const index = links.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      links[index].has_conflict = hasConflict;
      links[index].conflict_fields = conflictFields;
      saveLocalContactLinks(links);
    }
    return;
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS);
  const row = data?.find((r) => r['Link ID'] === linkId);
  if (row) {
    const link = rowToLink(row);
    link.has_conflict = hasConflict;
    link.conflict_fields = conflictFields;
    await updateSheetRow(
      accessToken,
      sheetId,
      SHEET_NAMES.CONTACT_LINKS,
      row._rowIndex,
      linkToRowValues(link)
    );
  }
}

/**
 * Detect conflicts between source and target contacts
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links and conflicts
 * @param {string} linkId - Contact link ID
 * @returns {Promise<array>} Array of conflicts detected
 */
export const detectConflicts = async (accessToken, sheetId, linkId) => {
  // Get link
  const link = await getContactLinkById(accessToken, sheetId, linkId);
  if (!link) throw new Error('Contact link not found');

  // Read source and target contacts
  const sourceContact = await readSheetData(accessToken, link.source_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.source_contact_id)
  );

  const targetContact = await readSheetData(accessToken, link.target_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.target_contact_id)
  );

  if (!sourceContact || !targetContact) {
    return [];
  }

  // Get fields to check
  const fieldsToCheck = getFieldsToSync(link.sync_strategy, link.custom_fields, sourceContact);

  // Detect conflicts
  const conflicts = [];
  const conflictFields = [];

  fieldsToCheck.forEach((field) => {
    const sourceValue = sourceContact[field];
    const targetValue = targetContact[field];

    if (sourceValue !== targetValue) {
      const conflict = {
        id: generateSecureId('conflict'),
        link_id: linkId,
        field_name: field,
        source_value: sourceValue,
        target_value: targetValue,
        source_modified_at: sourceContact['Date Added'] || new Date().toISOString(),
        target_modified_at: targetContact['Date Added'] || new Date().toISOString(),
        detected_at: new Date().toISOString(),
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        resolution: null,
      };

      conflicts.push(conflict);
      conflictFields.push(field);
    }
  });

  // Save conflicts
  if (conflicts.length > 0) {
    if (isDevMode()) {
      const existingConflicts = getLocalSyncConflicts();
      const allConflicts = [...existingConflicts, ...conflicts];
      saveLocalSyncConflicts(allConflicts);
    } else {
      // Production: Append to Sync Conflicts sheet
      for (const conflict of conflicts) {
        await appendRow(
          accessToken,
          sheetId,
          SHEET_NAMES.SYNC_CONFLICTS,
          conflictToRowValues(conflict)
        );
      }
    }

    // Update link with conflict status
    await updateLinkConflictStatus(accessToken, sheetId, linkId, true, conflictFields);
  }

  return conflicts;
};

/**
 * Get a conflict by ID
 */
async function getConflictById(accessToken, sheetId, conflictId) {
  if (isDevMode()) {
    const conflicts = getLocalSyncConflicts();
    return conflicts.find((c) => c.id === conflictId) || null;
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.SYNC_CONFLICTS);
  if (!data || data.length === 0) return null;

  const row = data.find((r) => r['Conflict ID'] === conflictId);
  return row ? rowToConflict(row) : null;
}

/**
 * Resolve a sync conflict
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links and conflicts
 * @param {string} conflictId - Conflict ID
 * @param {string} resolution - 'use_source' | 'use_target' | 'use_custom'
 * @param {string} customValue - If resolution is 'use_custom', the custom value
 * @param {string} userEmail - Email of user resolving conflict
 * @returns {Promise<object>} Resolution result
 */
export const resolveConflict = async (
  accessToken,
  sheetId,
  conflictId,
  resolution,
  customValue,
  userEmail
) => {
  // Get conflict
  const conflict = await getConflictById(accessToken, sheetId, conflictId);
  if (!conflict) throw new Error('Conflict not found');

  // Get link
  const link = await getContactLinkById(accessToken, sheetId, conflict.link_id);
  if (!link) throw new Error('Contact link not found');

  // Determine final value
  let finalValue;
  switch (resolution) {
    case 'use_source':
      finalValue = conflict.source_value;
      break;
    case 'use_target':
      finalValue = conflict.target_value;
      break;
    case 'use_custom':
      finalValue = customValue;
      break;
    default:
      throw new Error('Invalid resolution type');
  }

  // Update both contacts with final value
  const sourceContact = await readSheetData(accessToken, link.source_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.source_contact_id)
  );

  const targetContact = await readSheetData(accessToken, link.target_sheet_id, SHEET_NAMES.CONTACTS).then(
    (data) => data.find((c) => c['Contact ID'] === link.target_contact_id)
  );

  await Promise.all([
    updateContact(
      accessToken,
      link.source_sheet_id,
      link.source_contact_id,
      sourceContact,
      { ...sourceContact, [conflict.field_name]: finalValue },
      userEmail
    ),
    updateContact(
      accessToken,
      link.target_sheet_id,
      link.target_contact_id,
      targetContact,
      { ...targetContact, [conflict.field_name]: finalValue },
      userEmail
    ),
  ]);

  // Mark conflict as resolved
  if (isDevMode()) {
    const conflicts = getLocalSyncConflicts();
    const index = conflicts.findIndex((c) => c.id === conflictId);
    if (index !== -1) {
      conflicts[index].resolved = true;
      conflicts[index].resolved_at = new Date().toISOString();
      conflicts[index].resolved_by = userEmail;
      conflicts[index].resolution = resolution;
      saveLocalSyncConflicts(conflicts);
    }

    // Update link to remove conflict if all resolved
    const remainingConflicts = conflicts.filter(
      (c) => c.link_id === conflict.link_id && !c.resolved
    );
    if (remainingConflicts.length === 0) {
      await updateLinkConflictStatus(accessToken, sheetId, conflict.link_id, false, []);
    }
  } else {
    // Production: Update the conflict row in Sync Conflicts sheet
    const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.SYNC_CONFLICTS);
    const row = data?.find((r) => r['Conflict ID'] === conflictId);
    if (row) {
      const updatedConflict = {
        ...conflict,
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userEmail,
        resolution: resolution,
      };
      await updateSheetRow(
        accessToken,
        sheetId,
        SHEET_NAMES.SYNC_CONFLICTS,
        row._rowIndex,
        conflictToRowValues(updatedConflict)
      );
    }

    // Check if all conflicts for this link are resolved
    const allConflicts = data?.filter((r) => r['Link ID'] === conflict.link_id) || [];
    const unresolvedConflicts = allConflicts.filter(
      (r) => r['Resolved'] !== 'TRUE' && r['Conflict ID'] !== conflictId
    );
    if (unresolvedConflicts.length === 0) {
      await updateLinkConflictStatus(accessToken, sheetId, conflict.link_id, false, []);
    }
  }

  return {
    success: true,
    fieldResolved: conflict.field_name,
    finalValue,
    resolution,
  };
};

/**
 * Get all conflicts for a contact link
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing conflicts
 * @param {string} linkId - Contact link ID
 * @returns {Promise<array>} Array of unresolved conflicts
 */
export const getConflictsForLink = async (accessToken, sheetId, linkId) => {
  if (isDevMode()) {
    const conflicts = getLocalSyncConflicts();
    return conflicts.filter((c) => c.link_id === linkId && !c.resolved);
  }

  // Production: Google Sheets
  const data = await readSheetData(accessToken, sheetId, SHEET_NAMES.SYNC_CONFLICTS);
  if (!data || data.length === 0) return [];

  return data
    .filter((row) => row['Link ID'] === linkId && row['Resolved'] !== 'TRUE')
    .map(rowToConflict);
};

/**
 * Unlink a contact (break sync relationship)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Sheet ID for storing links and conflicts
 * @param {string} linkId - Contact link ID
 * @returns {Promise<object>} Result
 */
export const unlinkContact = async (accessToken, sheetId, linkId) => {
  if (isDevMode()) {
    const links = getLocalContactLinks();
    const index = links.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      links.splice(index, 1);
      saveLocalContactLinks(links);
    }

    // Also delete associated conflicts
    const conflicts = getLocalSyncConflicts();
    const remainingConflicts = conflicts.filter((c) => c.link_id !== linkId);
    saveLocalSyncConflicts(remainingConflicts);

    return { success: true };
  }

  // Production: Google Sheets
  // Find and delete the link row
  const linksData = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS);
  const linkRow = linksData?.find((r) => r['Link ID'] === linkId);
  if (linkRow) {
    await deleteSheetRow(accessToken, sheetId, SHEET_NAMES.CONTACT_LINKS, linkRow._rowIndex);
  }

  // Find and delete associated conflict rows (in reverse order to maintain row indices)
  const conflictsData = await readSheetData(accessToken, sheetId, SHEET_NAMES.SYNC_CONFLICTS);
  const conflictRows = conflictsData?.filter((r) => r['Link ID'] === linkId) || [];

  // Sort by row index descending so we delete from bottom up
  conflictRows.sort((a, b) => b._rowIndex - a._rowIndex);

  for (const conflictRow of conflictRows) {
    await deleteSheetRow(accessToken, sheetId, SHEET_NAMES.SYNC_CONFLICTS, conflictRow._rowIndex);
  }

  return { success: true };
};
