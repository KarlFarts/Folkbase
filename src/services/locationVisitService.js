/**
 * Location Visit Service
 *
 * Service for tracking visits to locations (similar to touchpoints for contacts).
 * Each visit represents an interaction with a location - meetings, inspections, events, etc.
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
 * Generate unique Visit ID (VIS001, VIS002, etc.)
 */
export async function generateVisitID(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);

  if (data.length === 0) return 'VIS001';

  // Find highest existing ID
  const ids = data
    .map((row) => row['Visit ID'])
    .filter((id) => id && id.startsWith('VIS'))
    .map((id) => parseInt(id.substring(3), 10))
    .filter((num) => !isNaN(num));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `VIS${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * Log a visit to a location
 */
export async function logLocationVisit(accessToken, sheetId, visitData, userEmail) {
  // Get metadata to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);

  // Generate ID and timestamps
  const visitId = await generateVisitID(accessToken, sheetId);
  const createdDate = new Date().toISOString().split('T')[0];

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Visit ID') return visitId;
    if (fieldName === 'Created By') return userEmail;
    if (fieldName === 'Created Date') return createdDate;
    return visitData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS, values);

  // Log to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: visitData['Location ID'] || '',
    contactName: visitData['Location Name'] || '',
    fieldChanged: 'Visit Logged',
    oldValue: '',
    newValue: `Visit on ${visitData['Date']} - ${visitData['Purpose'] || 'No purpose specified'}`,
    userEmail,
  });

  return { 'Visit ID': visitId, ...visitData };
}

/**
 * Get all visits for a location
 */
export async function getLocationVisits(accessToken, sheetId, locationId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);
  return data
    .filter((visit) => visit['Location ID'] === locationId)
    .sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''));
}

/**
 * Get all visits (optionally filtered by contact)
 */
export async function getAllVisits(accessToken, sheetId, contactId = null) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);

  if (contactId) {
    return data
      .filter((visit) => visit['Contact ID'] === contactId)
      .sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''));
  }

  return data.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''));
}

/**
 * Update a visit record
 */
export async function updateVisit(accessToken, sheetId, visitId, oldData, newData, userEmail) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);

  // Find the row
  const visit = data.find((v) => v['Visit ID'] === visitId);
  if (!visit) throw new Error('Visit not found');

  const rowIndex = visit._rowIndex;

  // Build updated row
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Visit ID') return visitId;
    if (fieldName === 'Created By') return oldData['Created By'] || userEmail;
    if (fieldName === 'Created Date') return oldData['Created Date'] || '';
    return newData[fieldName] !== undefined ? newData[fieldName] : oldData[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS, rowIndex, values);

  // Log changes to audit
  const changedFields = Object.keys(newData).filter(
    (key) => newData[key] !== oldData[key] && key !== 'Visit ID'
  );

  for (const field of changedFields) {
    await logAuditEntry(accessToken, sheetId, {
      contactId: newData['Location ID'] || oldData['Location ID'] || '',
      contactName: newData['Location Name'] || oldData['Location Name'] || '',
      fieldChanged: `Visit ${field}`,
      oldValue: oldData[field] || '',
      newValue: newData[field] || '',
      userEmail,
    });
  }

  return { 'Visit ID': visitId, ...oldData, ...newData };
}

/**
 * Delete a visit record
 * Note: Marks with deletion note instead of actual deletion
 */
export async function deleteVisit(accessToken, sheetId, visitId, userEmail) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);

  const visit = data.find((v) => v['Visit ID'] === visitId);
  if (!visit) throw new Error('Visit not found');

  // Update visit with deletion marker
  const updatedVisit = {
    ...visit,
    Notes: `[DELETED by ${userEmail} on ${new Date().toISOString().split('T')[0]}] ${visit['Notes'] || ''}`,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS);
  const rowIndex = visit._rowIndex;

  const values = headers.map((h) => {
    const fieldName = h.name;
    return updatedVisit[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEET_NAMES.LOCATION_VISITS, rowIndex, values);

  // Log deletion to audit
  await logAuditEntry(accessToken, sheetId, {
    contactId: visit['Location ID'] || '',
    contactName: visit['Location Name'] || '',
    fieldChanged: 'Visit Deleted',
    oldValue: 'Visit existed',
    newValue: 'Visit marked as deleted',
    userEmail,
  });

  return { success: true, visitId };
}

/**
 * Get visit statistics for a location
 */
export function getVisitStats(visits) {
  const totalVisits = visits.length;

  if (totalVisits === 0) {
    return {
      totalVisits: 0,
      lastVisitDate: null,
      averageDuration: 0,
      purposeBreakdown: {},
      followUpNeeded: 0,
    };
  }

  const lastVisitDate = visits[0]?.['Date'] || null; // Already sorted by date desc

  // Calculate average duration
  const durationsWithValues = visits
    .map((v) => parseFloat(v['Duration']) || 0)
    .filter((d) => d > 0);
  const averageDuration =
    durationsWithValues.length > 0
      ? durationsWithValues.reduce((sum, d) => sum + d, 0) / durationsWithValues.length
      : 0;

  // Purpose breakdown
  const purposeBreakdown = {};
  visits.forEach((v) => {
    const purpose = v['Purpose'] || 'Unspecified';
    purposeBreakdown[purpose] = (purposeBreakdown[purpose] || 0) + 1;
  });

  // Count follow-ups needed
  const followUpNeeded = visits.filter((v) => v['Follow-up Needed'] === 'Yes').length;

  return {
    totalVisits,
    lastVisitDate,
    averageDuration: Math.round(averageDuration),
    purposeBreakdown,
    followUpNeeded,
  };
}

export default {
  generateVisitID,
  logLocationVisit,
  getLocationVisits,
  getAllVisits,
  updateVisit,
  deleteVisit,
  getVisitStats,
};
