/**
 * Data Health Monitoring Service
 *
 * Provides insights into data state, storage usage, API consumption, and data integrity.
 * Helps users understand their database health and catch issues early.
 */

import { readSheetData } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { getRealtimeStats } from './apiUsageStats';

// Google Sheets cell limit
const GOOGLE_SHEETS_CELL_LIMIT = 10000000;

// Average columns per sheet tab (conservative estimate)
const AVERAGE_COLUMNS_PER_TAB = 20;

/**
 * Get comprehensive data health metrics
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Object} Health metrics
 */
export async function getDataHealth(accessToken, sheetId, onProgress = null) {
  const entityCounts = {};
  const sheetNames = Object.values(SHEET_NAMES);

  // Batch reads in groups of 4 to avoid rate limits (100 req/100s user limit)
  const BATCH_SIZE = 4;
  let processed = 0;

  for (let i = 0; i < sheetNames.length; i += BATCH_SIZE) {
    const batch = sheetNames.slice(i, i + BATCH_SIZE);

    // Report progress
    if (onProgress) {
      onProgress({
        phase: 'health',
        total: sheetNames.length,
        processed,
        current: `Reading ${batch[0]}...`,
        canCancel: false,
      });
    }

    // Read batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((sheetName) => readSheetData(accessToken, sheetId, sheetName))
    );

    // Process results
    batchResults.forEach((result, index) => {
      const sheetName = batch[index];
      if (result.status === 'fulfilled') {
        entityCounts[sheetName] = (result.value.data || []).length;
      } else {
        console.warn(`Failed to read ${sheetName}:`, result.reason);
        entityCounts[sheetName] = 0;
      }
    });

    processed += batch.length;
  }

  // Calculate storage estimate
  const storageEstimate = calculateStorageEstimate(entityCounts);

  // Check data integrity
  const integrityIssues = await checkDataIntegrity(accessToken, sheetId, entityCounts);

  // Get API usage
  const apiUsage = getRealtimeStats('GOOGLE_SHEETS');

  // Final progress callback
  if (onProgress) {
    onProgress({
      phase: 'health',
      total: sheetNames.length,
      processed: sheetNames.length,
      current: 'Complete',
      canCancel: false,
    });
  }

  return {
    entityCounts,
    storageEstimate,
    integrityIssues,
    apiUsage,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate storage usage estimate
 *
 * @param {Object} entityCounts - Record counts per tab
 * @returns {Object} Storage estimate
 */
export function calculateStorageEstimate(entityCounts) {
  let totalCells = 0;

  // Estimate cells for each tab
  Object.keys(entityCounts).forEach((tabName) => {
    const recordCount = entityCounts[tabName];
    // Each tab has: (records + 1 header row) * average columns
    const tabCells = (recordCount + 1) * AVERAGE_COLUMNS_PER_TAB;
    totalCells += tabCells;
  });

  const percentage = (totalCells / GOOGLE_SHEETS_CELL_LIMIT) * 100;

  // Estimate remaining capacity
  const cellsRemaining = GOOGLE_SHEETS_CELL_LIMIT - totalCells;
  const estimatedRowsRemaining = Math.floor(cellsRemaining / AVERAGE_COLUMNS_PER_TAB);

  return {
    cellsUsed: totalCells,
    cellLimit: GOOGLE_SHEETS_CELL_LIMIT,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    estimatedRowsRemaining,
  };
}

/**
 * Check data integrity for common issues
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} entityCounts - Pre-fetched entity counts (optional for optimization)
 * @returns {Array} Array of integrity issues
 */
export async function checkDataIntegrity(accessToken, sheetId, entityCounts = null) {
  const issues = [];

  try {
    // For now, we'll do basic checks without additional API calls
    // More advanced checks could be added later (e.g., orphaned relationships)

    // Check for empty tabs that should have data
    const criticalTabs = [SHEET_NAMES.CONTACTS, SHEET_NAMES.ORGANIZATIONS, SHEET_NAMES.LOCATIONS];

    if (entityCounts) {
      criticalTabs.forEach((tabName) => {
        if (entityCounts[tabName] === 0) {
          issues.push({
            type: 'warning',
            severity: 'low',
            count: 1,
            message: `${tabName} tab is empty`,
          });
        }
      });

      // Check for potential orphaned relationships
      // If we have contact lists but no contacts, that's suspicious
      if (entityCounts[SHEET_NAMES.CONTACT_LISTS] > 0 && entityCounts[SHEET_NAMES.CONTACTS] === 0) {
        issues.push({
          type: 'orphaned_data',
          severity: 'medium',
          count: entityCounts[SHEET_NAMES.CONTACT_LISTS],
          message: 'Contact Lists exist but no Contacts found',
        });
      }

      // Similar check for touchpoints
      if (entityCounts[SHEET_NAMES.TOUCHPOINTS] > 0 && entityCounts[SHEET_NAMES.CONTACTS] === 0) {
        issues.push({
          type: 'orphaned_data',
          severity: 'medium',
          count: entityCounts[SHEET_NAMES.TOUCHPOINTS],
          message: 'Touchpoints exist but no Contacts found',
        });
      }

      // Check for very large tabs (performance warning)
      Object.keys(entityCounts).forEach((tabName) => {
        if (entityCounts[tabName] > 10000) {
          issues.push({
            type: 'performance',
            severity: 'medium',
            count: entityCounts[tabName],
            message: `${tabName} has ${entityCounts[tabName].toLocaleString()} records (may impact performance)`,
          });
        }
      });
    }
  } catch (error) {
    console.error('Integrity check failed:', error);
    issues.push({
      type: 'error',
      severity: 'high',
      count: 1,
      message: `Integrity check failed: ${error.message}`,
    });
  }

  return issues;
}
