/**
 * Organization Service
 *
 * CRUD operations for organization entities (companies, non-profits, government agencies, etc.)
 * Follows the same patterns as contact management but for organizations.
 */

import { SHEET_NAMES } from '../config/constants';
import {
  readSheetData,
  readSheetMetadata,
  appendRow,
  updateRow,
  logAuditEntry,
} from '../utils/devModeWrapper';

/**
 * Generate unique Organization ID (ORG001, ORG002, etc.)
 */
export async function generateOrganizationID(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);

  if (data.length === 0) return 'ORG001';

  // Find highest existing ID
  const ids = data
    .map((row) => row['Organization ID'])
    .filter((id) => id && id.startsWith('ORG'))
    .map((id) => parseInt(id.substring(3), 10))
    .filter((num) => !isNaN(num));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `ORG${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * Get all organizations
 */
export async function getOrganizations(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);
  return data;
}

/**
 * Get a single organization by ID
 */
export async function getOrganizationById(accessToken, sheetId, orgId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);
  return data.find((org) => org['Organization ID'] === orgId);
}

/**
 * Create a new organization
 */
export async function createOrganization(accessToken, sheetId, organizationData, userEmail) {
  // Get metadata to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);

  // Generate ID and timestamps
  const organizationId = await generateOrganizationID(accessToken, sheetId);
  const dateAdded = new Date().toISOString().split('T')[0];

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Organization ID') return organizationId;
    if (fieldName === 'Date Added') return dateAdded;
    if (fieldName === 'Last Contact Date') return '';
    if (fieldName === 'Created By') return userEmail;
    if (fieldName === 'Last Updated') return dateAdded;
    return organizationData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS, values);

  // Log to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: organizationId,
    contactName: organizationData['Name'] || '',
    fieldChanged: 'Organization Created',
    oldValue: '',
    newValue: 'New organization added',
    userEmail,
  });

  return { organizationId, 'Organization ID': organizationId, ...organizationData };
}

/**
 * Update an organization
 */
export async function updateOrganization(accessToken, sheetId, orgId, oldData, newData, userEmail) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);

  // Find the row
  const organization = data.find((org) => org['Organization ID'] === orgId);
  if (!organization) throw new Error('Organization not found');

  const rowIndex = organization._rowIndex;
  const lastUpdated = new Date().toISOString().split('T')[0];

  // Build updated row
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Organization ID') return orgId;
    if (fieldName === 'Date Added') return oldData['Date Added'] || '';
    if (fieldName === 'Last Updated') return lastUpdated;
    if (fieldName === 'Created By') return oldData['Created By'] || userEmail;
    return newData[fieldName] !== undefined ? newData[fieldName] : oldData[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS, rowIndex, values);

  // Log changes to audit
  const changedFields = Object.keys(newData).filter(
    (key) => newData[key] !== oldData[key] && key !== 'Organization ID'
  );

  for (const field of changedFields) {
    await logAuditEntry(accessToken, sheetId, {
      contactId: orgId,
      contactName: newData['Name'] || oldData['Name'] || '',
      fieldChanged: field,
      oldValue: oldData[field] || '',
      newValue: newData[field] || '',
      userEmail,
    });
  }

  return { 'Organization ID': orgId, ...oldData, ...newData };
}

/**
 * Delete an organization
 * Note: Since we don't have a deleteRow function in sheets.js,
 * we'll mark the organization as "Inactive" and log the deletion
 */
export async function deleteOrganization(accessToken, sheetId, orgId, userEmail) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);

  const organization = data.find((org) => org['Organization ID'] === orgId);
  if (!organization) throw new Error('Organization not found');

  // Update organization status to "Inactive" instead of deleting
  const updatedOrg = {
    ...organization,
    Status: 'Inactive',
    Notes: `[DELETED by ${userEmail} on ${new Date().toISOString().split('T')[0]}] ${organization['Notes'] || ''}`,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);
  const rowIndex = organization._rowIndex;
  const lastUpdated = new Date().toISOString().split('T')[0];

  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Last Updated') return lastUpdated;
    return updatedOrg[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS, rowIndex, values);

  // Log deletion to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: orgId,
    contactName: organization['Name'] || '',
    fieldChanged: 'Organization Deleted',
    oldValue: 'Organization existed',
    newValue: 'Organization marked as deleted',
    userEmail,
  });

  return { success: true, organizationId: orgId };
}

/**
 * Detect duplicate organizations
 * Checks for matching name and address
 */
export function detectDuplicateOrganizations(organizations, newOrg) {
  const duplicates = [];

  const newName = (newOrg.Name || '').toLowerCase().trim();
  const newAddress = (newOrg.Address || '').toLowerCase().trim();

  if (!newName) return duplicates; // Can't detect duplicates without a name

  for (const org of organizations) {
    const orgName = (org.Name || '').toLowerCase().trim();
    const orgAddress = (org.Address || '').toLowerCase().trim();

    const reasons = [];

    // Exact name match
    if (orgName === newName) {
      reasons.push('Exact name match');
    }

    // Similar address (if both have addresses)
    if (newAddress && orgAddress && orgAddress.includes(newAddress)) {
      reasons.push('Similar address');
    }

    if (reasons.length > 0) {
      duplicates.push({
        organization: org,
        reasons,
        score: reasons.length,
      });
    }
  }

  // Sort by score (highest first)
  return duplicates.sort((a, b) => b.score - a.score);
}

/**
 * Search organizations by query
 * Searches across Name, Type, Industry, Address, Website
 */
export function searchOrganizations(organizations, query) {
  if (!query) return organizations;

  const lowerQuery = query.toLowerCase();

  return organizations.filter((org) => {
    const name = (org.Name || '').toLowerCase();
    const type = (org.Type || '').toLowerCase();
    const industry = (org.Industry || '').toLowerCase();
    const address = (org.Address || '').toLowerCase();
    const website = (org.Website || '').toLowerCase();
    const tags = (org.Tags || '').toLowerCase();

    return (
      name.includes(lowerQuery) ||
      type.includes(lowerQuery) ||
      industry.includes(lowerQuery) ||
      address.includes(lowerQuery) ||
      website.includes(lowerQuery) ||
      tags.includes(lowerQuery)
    );
  });
}

/**
 * Filter organizations by criteria
 */
export function filterOrganizations(organizations, filters) {
  let filtered = [...organizations];

  if (filters.type && filters.type !== 'All') {
    filtered = filtered.filter((org) => org.Type === filters.type);
  }

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter((org) => org.Status === filters.status);
  }

  if (filters.priority && filters.priority !== 'All') {
    filtered = filtered.filter((org) => org.Priority === filters.priority);
  }

  if (filters.industry) {
    const lowerIndustry = filters.industry.toLowerCase();
    filtered = filtered.filter((org) => (org.Industry || '').toLowerCase().includes(lowerIndustry));
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((org) => {
      const orgTags = (org.Tags || '').split(',').map((t) => t.trim().toLowerCase());
      return filters.tags.some((tag) => orgTags.includes(tag.toLowerCase()));
    });
  }

  return filtered;
}

/**
 * Sort organizations
 */
export function sortOrganizations(organizations, sortBy, sortOrder = 'asc') {
  const sorted = [...organizations];

  sorted.sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';

    // Handle dates
    if (sortBy === 'Date Added' || sortBy === 'Last Contact Date') {
      aVal = aVal ? new Date(aVal) : new Date(0);
      bVal = bVal ? new Date(bVal) : new Date(0);
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

export default {
  generateOrganizationID,
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  detectDuplicateOrganizations,
  searchOrganizations,
  filterOrganizations,
  sortOrganizations,
};
