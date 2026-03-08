/**
 * Location Service
 *
 * CRUD operations for location entities (offices, venues, stores, public spaces, etc.)
 * Follows the same patterns as organization management.
 */

import { SHEET_NAMES } from '../config/constants';
import {
  readSheetData,
  readSheetMetadata,
  appendRow,
  updateRow,
  logAuditEntry,
} from '../utils/devModeWrapper';
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

/**
 * Generate unique Location ID (LOC-xxxxxxxx)
 */
export async function generateLocationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.LOCATION);
}

/**
 * Get all locations
 */
export async function getLocations(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
  return data;
}

/**
 * Get a single location by ID
 */
export async function getLocationById(accessToken, sheetId, locId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
  return data.find((loc) => loc['Location ID'] === locId);
}

/**
 * Create a new location
 */
export async function createLocation(accessToken, sheetId, locationData, userEmail) {
  // Get metadata to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATIONS);

  // Generate ID and timestamps
  const locationId = await generateLocationID(accessToken, sheetId);
  const dateAdded = new Date().toISOString().split('T')[0];

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Location ID') return locationId;
    if (fieldName === 'Date Added') return dateAdded;
    if (fieldName === 'Last Contact Date') return '';
    if (fieldName === 'Created By') return userEmail;
    if (fieldName === 'Last Updated') return dateAdded;
    return locationData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEET_NAMES.LOCATIONS, values);

  // Log to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: locationId,
    contactName: locationData['Name'] || '',
    fieldChanged: 'Location Created',
    oldValue: '',
    newValue: 'New location added',
    userEmail,
  });

  return { 'Location ID': locationId, ...locationData };
}

/**
 * Update a location
 */
export async function updateLocation(accessToken, sheetId, locId, oldData, newData, userEmail) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);

  // Find the row
  const location = data.find((loc) => loc['Location ID'] === locId);
  if (!location) throw new Error('Location not found');

  const rowIndex = location._rowIndex;
  const lastUpdated = new Date().toISOString().split('T')[0];

  // Build updated row
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Location ID') return locId;
    if (fieldName === 'Date Added') return oldData['Date Added'] || '';
    if (fieldName === 'Last Updated') return lastUpdated;
    if (fieldName === 'Created By') return oldData['Created By'] || userEmail;
    return newData[fieldName] !== undefined ? newData[fieldName] : oldData[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.LOCATIONS, rowIndex, values);

  // Log changes to audit
  const changedFields = Object.keys(newData).filter(
    (key) => newData[key] !== oldData[key] && key !== 'Location ID'
  );

  for (const field of changedFields) {
    await logAuditEntry(accessToken, sheetId, {
      contactId: locId,
      contactName: newData['Name'] || oldData['Name'] || '',
      fieldChanged: field,
      oldValue: oldData[field] || '',
      newValue: newData[field] || '',
      userEmail,
    });
  }

  return { 'Location ID': locId, ...oldData, ...newData };
}

/**
 * Delete a location
 * Note: Marks the location as "Inactive" instead of deleting
 */
export async function deleteLocation(accessToken, sheetId, locId, userEmail) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);

  const location = data.find((loc) => loc['Location ID'] === locId);
  if (!location) throw new Error('Location not found');

  // Update location status to "Inactive" instead of deleting
  const updatedLoc = {
    ...location,
    Status: 'Inactive',
    Notes: `[DELETED by ${userEmail} on ${new Date().toISOString().split('T')[0]}] ${location['Notes'] || ''}`,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
  const rowIndex = location._rowIndex;
  const lastUpdated = new Date().toISOString().split('T')[0];

  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Last Updated') return lastUpdated;
    return updatedLoc[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.LOCATIONS, rowIndex, values);

  // Log deletion to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: locId,
    contactName: location['Name'] || '',
    fieldChanged: 'Location Deleted',
    oldValue: 'Location existed',
    newValue: 'Location marked as deleted',
    userEmail,
  });

  return { success: true, locationId: locId };
}

/**
 * Detect duplicate locations
 * Checks for matching name and address
 */
export function detectDuplicateLocations(locations, newLoc) {
  const duplicates = [];

  const newName = (newLoc.Name || '').toLowerCase().trim();
  const newAddress = (newLoc.Address || '').toLowerCase().trim();

  if (!newName) return duplicates; // Can't detect duplicates without a name

  for (const loc of locations) {
    const locName = (loc.Name || '').toLowerCase().trim();
    const locAddress = (loc.Address || '').toLowerCase().trim();

    const reasons = [];

    // Exact name match
    if (locName === newName) {
      reasons.push('Exact name match');
    }

    // Exact or similar address (if both have addresses)
    if (newAddress && locAddress) {
      if (locAddress === newAddress) {
        reasons.push('Exact address match');
      } else if (locAddress.includes(newAddress) || newAddress.includes(locAddress)) {
        reasons.push('Similar address');
      }
    }

    if (reasons.length > 0) {
      duplicates.push({
        location: loc,
        reasons,
        score: reasons.length,
      });
    }
  }

  // Sort by score (highest first)
  return duplicates.sort((a, b) => b.score - a.score);
}

/**
 * Search locations by query
 * Searches across Name, Type, Address, Website, Tags
 */
export function searchLocations(locations, query) {
  if (!query) return locations;

  const lowerQuery = query.toLowerCase();

  return locations.filter((loc) => {
    const name = (loc.Name || '').toLowerCase();
    const type = (loc.Type || '').toLowerCase();
    const address = (loc.Address || '').toLowerCase();
    const website = (loc.Website || '').toLowerCase();
    const tags = (loc.Tags || '').toLowerCase();

    return (
      name.includes(lowerQuery) ||
      type.includes(lowerQuery) ||
      address.includes(lowerQuery) ||
      website.includes(lowerQuery) ||
      tags.includes(lowerQuery)
    );
  });
}

/**
 * Filter locations by criteria
 */
export function filterLocations(locations, filters) {
  let filtered = [...locations];

  if (filters.type && filters.type !== 'All') {
    filtered = filtered.filter((loc) => loc.Type === filters.type);
  }

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter((loc) => loc.Status === filters.status);
  }

  if (filters.priority && filters.priority !== 'All') {
    filtered = filtered.filter((loc) => loc.Priority === filters.priority);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((loc) => {
      const locTags = (loc.Tags || '').split(',').map((t) => t.trim().toLowerCase());
      return filters.tags.some((tag) => locTags.includes(tag.toLowerCase()));
    });
  }

  return filtered;
}

/**
 * Sort locations
 */
export function sortLocations(locations, sortBy, sortOrder = 'asc') {
  const sorted = [...locations];

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
  generateLocationID,
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  detectDuplicateLocations,
  searchLocations,
  filterLocations,
  sortLocations,
};
