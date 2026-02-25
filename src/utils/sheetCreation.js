import { SHEET_NAMES, SHEET_HEADERS, SCHEMA_STORAGE_KEY } from '../config/constants';
import { isDevMode } from './devModeWrapper';

/**
 * Extract Google Sheets ID from URL or return ID if already provided
 * @param {string} input - Sheet URL or ID
 * @returns {string} - Extracted sheet ID
 */
export const extractSheetId = (input) => {
  if (!input || typeof input !== 'string') return '';

  // Remove any whitespace
  const trimmed = input.trim();

  // If it's already just an ID (no slashes), return as-is
  if (!trimmed.includes('/')) {
    return trimmed;
  }

  // Try to extract ID from Google Sheets URL
  // URL format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If no match found, return the original input (might already be an ID)
  return trimmed;
};

/**
 * Validate sheet input format and return helpful feedback
 * @param {string} input - Sheet URL or ID
 * @returns {Object} - Validation result with errors, warnings, and extracted ID
 */
export const validateSheetInput = (input) => {
  const errors = [];
  const warnings = [];

  if (!input?.trim()) {
    return {
      valid: false,
      errors: ['Please enter a Google Sheets URL or ID'],
      warnings: [],
      sheetId: null,
    };
  }

  const trimmed = input.trim();
  let extractedId = null;

  // URL validation
  if (trimmed.includes('/')) {
    if (!trimmed.includes('docs.google.com/spreadsheets')) {
      errors.push(
        "This doesn't look like a Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/..."
      );
    } else {
      const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        extractedId = match[1];
      } else {
        errors.push('Could not extract Sheet ID from URL. Make sure you copied the full URL.');
      }
    }
  } else {
    // Direct ID validation
    extractedId = trimmed;
    if (!/^[a-zA-Z0-9-_]{25,60}$/.test(extractedId)) {
      warnings.push(
        "This ID looks unusual. Google Sheet IDs are typically 44 characters long. Double-check it's correct."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sheetId: extractedId,
  };
};

/**
 * Validate that we can access the sheet and check for required tabs
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<Object>} - Validation result with existing and missing tabs
 */
export const validateSheetAccess = async (accessToken, sheetId) => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, error: 'Sheet not found. Check if the ID is correct.' };
      }
      if (response.status === 403) {
        return {
          valid: false,
          error: 'Access denied. Make sure you have permission to view this sheet.',
        };
      }
      return { valid: false, error: `Unable to access sheet (HTTP ${response.status})` };
    }

    const data = await response.json();
    const existingTabs = data.sheets.map((s) => s.properties.title);

    // Check for all required tabs from SHEET_NAMES
    const allRequiredTabs = Object.values(SHEET_NAMES);
    const missingTabs = allRequiredTabs.filter((tab) => !existingTabs.includes(tab));

    return {
      valid: true,
      existingTabs,
      missingTabs,
      needsAutoCreate: missingTabs.length > 0,
      totalTabsToCreate: missingTabs.length,
    };
  } catch {
    return { valid: false, error: 'Network error. Please check your connection.' };
  }
};

/**
 * Auto-create missing sheet tabs with proper headers
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string[]} missingTabs - Array of tab names to create
 * @returns {Promise<Object>} - Success status and error message if failed
 */
export const autoCreateMissingTabs = async (accessToken, sheetId, missingTabs) => {
  try {
    // First, create the sheets
    const requests = missingTabs.map((tabName) => ({
      addSheet: { properties: { title: tabName } },
    }));

    const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
    const batchResponse = await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!batchResponse.ok) {
      throw new Error('Failed to create sheet tabs');
    }

    // Then add headers to each new tab
    for (const tabName of missingTabs) {
      const headers = SHEET_HEADERS[tabName] || [];
      if (headers.length > 0) {
        const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=RAW`;
        await fetch(headerUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [headers] }),
        });
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create a new Google Sheet with all required tabs and headers
 * @param {string} accessToken - Google OAuth access token
 * @param {string} userName - User's display name for sheet title
 * @returns {Promise<Object>} - Created sheet details (sheetId, sheetTitle, tabCount)
 */
export const createNewSheet = async (accessToken, userName) => {
  try {
    const sheetTitle = `Folkbase - ${userName}`;
    const allTabs = Object.values(SHEET_NAMES);

    // Step 1: Create the spreadsheet with all tabs
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: sheetTitle },
        sheets: allTabs.map((tabName) => ({
          properties: { title: tabName },
        })),
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      const detail = errorData.error?.message || `HTTP ${createResponse.status}`;
      throw new Error(`Failed to create new sheet: ${detail}`);
    }

    const createdSheet = await createResponse.json();
    const sheetId = createdSheet.spreadsheetId;

    // Step 2: Add headers to all tabs in one batch request
    const headerData = allTabs
      .map((tabName) => {
        const headers = SHEET_HEADERS[tabName];
        if (!headers || headers.length === 0) return null;
        return {
          range: `${tabName}!A1`,
          values: [headers],
        };
      })
      .filter(Boolean);

    if (headerData.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: headerData,
        }),
      });
    }

    // Step 3: Delete the auto-created "Sheet1" tab
    const sheetsInfo = createdSheet.sheets || [];
    const defaultSheet = sheetsInfo.find((s) => s.properties.title === 'Sheet1');

    if (defaultSheet) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{ deleteSheet: { sheetId: defaultSheet.properties.sheetId } }],
        }),
      });
    }

    return {
      sheetId,
      sheetTitle,
      tabCount: allTabs.length,
    };
  } catch (error) {
    throw new Error(`Failed to create sheet: ${error.message}`);
  }
};

/**
 * Get current schema version from a sheet
 * In production: Uses spreadsheet properties metadata
 * In dev mode: Uses localStorage
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @returns {Promise<number>} Current schema version (0 if not set)
 */
export const getSchemaVersion = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const version = localStorage.getItem(SCHEMA_STORAGE_KEY);
    return version ? parseInt(version, 10) : 0;
  }

  // Production: Read from spreadsheet developer metadata
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=developerMetadata`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return 0;

    const data = await response.json();
    const versionMeta = data.developerMetadata?.find((m) => m.metadataKey === 'schema_version');

    return versionMeta ? parseInt(versionMeta.metadataValue, 10) : 0;
  } catch {
    return 0; // Assume legacy if metadata not readable
  }
};

/**
 * Set schema version on a sheet
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @param {number} version - Version number to set
 * @returns {Promise<boolean>} Success status
 */
export const setSchemaVersion = async (accessToken, sheetId, version) => {
  if (isDevMode()) {
    localStorage.setItem(SCHEMA_STORAGE_KEY, version.toString());
    return true;
  }

  // Production: Write to spreadsheet developer metadata
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              createDeveloperMetadata: {
                developerMetadata: {
                  metadataKey: 'schema_version',
                  metadataValue: version.toString(),
                  location: { spreadsheet: true },
                  visibility: 'DOCUMENT',
                },
              },
            },
          ],
        }),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Auto-expand headers on existing tab by appending missing columns
 * SAFETY GUARANTEES:
 * - Never deletes existing columns
 * - Never reorders existing columns
 * - Idempotent (safe to run multiple times)
 * - Returns list of added columns for logging
 *
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @param {string} tabName - Tab name to expand
 * @returns {Promise<Object>} { success, addedColumns: string[], existingColumns: string[] }
 */
export const autoExpandHeaders = async (accessToken, sheetId, tabName) => {
  if (isDevMode()) {
    // Dev mode: Update localStorage seed data structure
    const expectedHeaders = SHEET_HEADERS[tabName];
    if (!expectedHeaders) {
      return { success: false, error: `No header definition for ${tabName}` };
    }

    // Get localStorage key for this tab
    const storageKey = `dev_${tabName.toLowerCase().replace(/\s+/g, '_')}`;
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');

    if (data.length === 0) {
      // No data yet, nothing to expand
      return { success: true, addedColumns: [], existingColumns: [] };
    }

    // Get existing columns from first row
    const existingHeaders = Object.keys(data[0]).filter(
      (k) => k !== '__TEST_DATA__' && k !== '_rowIndex'
    );

    // Find missing columns
    const missingHeaders = expectedHeaders.filter((h) => !existingHeaders.includes(h));

    if (missingHeaders.length === 0) {
      return { success: true, addedColumns: [], existingColumns: existingHeaders };
    }

    // Add missing fields to all rows with empty string default
    const expandedData = data.map((row) => {
      const newRow = { ...row };
      missingHeaders.forEach((header) => {
        newRow[header] = '';
      });
      return newRow;
    });

    localStorage.setItem(storageKey, JSON.stringify(expandedData));

    return {
      success: true,
      addedColumns: missingHeaders,
      existingColumns: existingHeaders,
    };
  }

  // PRODUCTION MODE
  try {
    const expectedHeaders = SHEET_HEADERS[tabName];
    if (!expectedHeaders) {
      return { success: false, error: `No header definition for ${tabName}` };
    }

    // Step 1: Read existing headers (row 1)
    const rangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!1:1`;
    const readResponse = await fetch(rangeUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!readResponse.ok) {
      return { success: false, error: 'Failed to read existing headers' };
    }

    const readData = await readResponse.json();
    const existingHeaders = readData.values?.[0] || [];

    // Step 2: Find missing columns
    const missingHeaders = expectedHeaders.filter((h) => !existingHeaders.includes(h));

    if (missingHeaders.length === 0) {
      // Already up to date
      return { success: true, addedColumns: [], existingColumns: existingHeaders };
    }

    // Step 3: Append missing headers to row 1
    // Calculate column letter for append position
    const startCol = existingHeaders.length;
    const endCol = startCol + missingHeaders.length - 1;
    const range = `${tabName}!${columnToLetter(startCol)}1:${columnToLetter(endCol)}1`;

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    const writeResponse = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [missingHeaders] }),
    });

    if (!writeResponse.ok) {
      return { success: false, error: 'Failed to append new headers' };
    }

    return {
      success: true,
      addedColumns: missingHeaders,
      existingColumns: existingHeaders,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper: Convert column index to letter (0 = A, 1 = B, etc.)
function columnToLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

/**
 * Lightweight probe: verify token can read the user's sheet.
 * Used after sign-in to catch invalid tokens or revoked access before
 * the user reaches the dashboard.
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID to probe
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const probeSheetAccess = async (accessToken, sheetId) => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (response.ok) return { ok: true };
    if (response.status === 401) return { ok: false, error: 'Your session has expired. Please sign in again.' };
    if (response.status === 403) return { ok: false, error: 'Access denied. Make sure you granted permission to Google Sheets.' };
    if (response.status === 404) return { ok: false, error: 'Sheet not found. It may have been deleted.' };
    return { ok: false, error: `Unexpected error (HTTP ${response.status}). Please try again.` };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
};
