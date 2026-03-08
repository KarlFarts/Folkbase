/**
 * Google Sheets API Utilities
 *
 * IMPORTANT FOR DEV MODE:
 * This file contains the production Google Sheets API implementation.
 *
 * For development mode (when VITE_DEV_MODE=true):
 * - Import from 'devModeWrapper.js' instead of this file
 * - The wrapper automatically handles dev mode without any code changes needed
 *
 * Example:
 * DON'T:  import { readSheetData } from './sheets';
 * DO:     import { readSheetData } from './devModeWrapper';
 *
 * The wrapper is transparent - same API, just works with localStorage in dev mode.
 */

import axios from 'axios';
import {
  API_CONFIG,
  SHEET_NAMES,
  AUTO_FIELDS as AUTO_FIELDS_CONFIG,
  VISIBILITY,
  TOUCHPOINT_STATUS,
} from '../config/constants';
import { logApiCall } from './apiUsageLogger.js';
import { notifyAuthError } from './authErrorHandler.js';
import { canMakeRequest } from '../services/apiUsageStats.js';
import { warn } from './logger.js';
import { generateId, ID_PREFIXES } from './idGenerator';
import { getCachedData, appendToCachedData } from './indexedDbCache';

const SHEETS_API_BASE = API_CONFIG.SHEETS_API_BASE;

// Sheet tab names (re-export for backward compatibility)
const SHEETS = SHEET_NAMES;

// Special fields that have auto-generated behavior (re-export for backward compatibility)
const AUTO_FIELDS = AUTO_FIELDS_CONFIG;

/**
 * Create axios instance with auth header
 */
function createSheetsClient(accessToken) {
  const client = axios.create({
    baseURL: SHEETS_API_BASE,
    timeout: 30000, // 30 second timeout
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to track timing and check rate limits
  client.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: Date.now() };

      // Check rate limits before making request
      const rateLimitCheck = canMakeRequest('google-sheets', 1);
      if (!rateLimitCheck.allowed) {
        warn('Rate limit check failed:', rateLimitCheck.reason);
        // Log as rate limit error
        logApiCall('google-sheets', 'rate-limit-blocked', {
          success: false,
          statusCode: 429,
          duration: 0,
          error: rateLimitCheck.reason,
          isRateLimit: true,
        });
        // Throw error to prevent request
        const error = new Error(`Rate limit would be exceeded: ${rateLimitCheck.reason}`);
        error.rateLimitInfo = rateLimitCheck;
        return Promise.reject(error);
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor to track API calls
  client.interceptors.response.use(
    (response) => {
      const duration = Date.now() - response.config.metadata.startTime;
      const operation = inferOperation(response.config);

      // Log successful call
      logApiCall('google-sheets', operation, {
        success: true,
        statusCode: response.status,
        duration,
      });

      return response;
    },
    (error) => {
      const startTime = error.config?.metadata?.startTime || Date.now();
      const duration = Date.now() - startTime;
      const operation = inferOperation(error.config);
      const isRateLimit = error.response?.status === 429;

      // Log failed call
      logApiCall('google-sheets', operation, {
        success: false,
        statusCode: error.response?.status || null,
        duration,
        error: error.message,
        isRateLimit,
      });

      if (error.response?.status === 401 || error.response?.status === 403) {
        error.isAuthError = true;
        notifyAuthError();
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Infer operation name from axios config for logging
 */
function inferOperation(config) {
  if (!config) return 'unknown';

  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';

  if (url.includes(':append')) return 'appendRow';
  if (url.includes(':batchUpdate')) return 'batchUpdate';
  if (url.includes('/values/')) {
    if (method === 'GET') return 'readSheetData';
    if (method === 'PUT') return 'updateRow';
  }
  if (method === 'POST') return 'createResource';
  if (method === 'PUT') return 'updateCell';

  return `${method}_${url.split('/').pop()}`.slice(0, 50); // Keep readable length
}

/**
 * Wrapper for API calls with automatic retry on auth errors
 * If token is expired (401/403), attempts to refresh and retry once
 */
async function sheetsApiCallWithRetry(apiCall, accessToken, refreshTokenCallback) {
  try {
    return await apiCall(accessToken);
  } catch (error) {
    // If it's an auth error and we have a refresh callback, try once more
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      refreshTokenCallback
    ) {
      try {
        // Refresh token
        await refreshTokenCallback();

        // Get new token from sessionStorage
        const newToken = sessionStorage.getItem('googleAccessToken');
        if (!newToken) throw new Error('Token refresh did not provide new token');

        // Retry with new token
        return await apiCall(newToken);
      } catch {
        // Refresh failed, throw original auth error
        throw error;
      }
    }

    // Not an auth error or retry failed, throw it
    throw error;
  }
}

/**
 * Get the internal sheet ID for a given sheet name
 * The spreadsheet has an ID (like "1ABC...") and each tab/sheet within it has its own internal numeric ID
 */
export async function getSheetIdByName(accessToken, spreadsheetId, sheetName) {
  const client = createSheetsClient(accessToken);

  const response = await client.get(`/${spreadsheetId}`, {
    params: {
      fields: 'sheets(properties(sheetId,title))',
    },
  });

  const sheet = response.data.sheets?.find((s) => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
  }

  return sheet.properties.sheetId;
}

/**
 * Read sheet metadata including headers and data validation rules
 * This is the core of the dynamic architecture - everything reads from here
 *
 * NOTE: Dev mode is handled by devModeWrapper.js - import from there instead
 */
export async function readSheetMetadata(
  accessToken,
  sheetId,
  sheetName,
  refreshTokenCallback = null
) {
  const apiCall = async (token) => {
    const client = createSheetsClient(token);

    // Get spreadsheet metadata including data validation
    const response = await client.get(`/${sheetId}`, {
      params: {
        includeGridData: true,
        ranges: `${sheetName}!1:1000`,
        fields: 'sheets(properties,data(rowData(values(userEnteredValue,dataValidation))))',
      },
    });

    const sheet = response.data.sheets?.[0];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const rowData = sheet.data?.[0]?.rowData || [];

    // Get headers from first row
    const headerRow = rowData[0]?.values || [];
    const headers = headerRow.map((cell, index) => ({
      name: cell?.userEnteredValue?.stringValue || `Column ${index + 1}`,
      index: index,
      letter: String.fromCharCode(65 + index), // A, B, C, etc.
    }));

    // Extract data validation rules (dropdown options) from row 2
    const validationRow = rowData[1]?.values || [];
    const validationRules = {};

    validationRow.forEach((cell, index) => {
      const validation = cell?.dataValidation;
      if (validation?.condition?.type === 'ONE_OF_LIST') {
        const headerName = headers[index]?.name;
        if (headerName) {
          validationRules[headerName] = validation.condition.values.map(
            (v) => v.userEnteredValue || ''
          );
        }
      }
    });

    return {
      headers,
      validationRules,
      sheetName,
    };
  };

  return sheetsApiCallWithRetry(apiCall, accessToken, refreshTokenCallback);
}

/**
 * Read all data from a sheet
 *
 * NOTE: Dev mode is handled by devModeWrapper.js - import from there instead
 */
export async function readSheetData(accessToken, sheetId, sheetName, refreshTokenCallback = null) {
  const apiCall = async (token) => {
    const client = createSheetsClient(token);
    const response = await client.get(`/${sheetId}/values/${sheetName}`);
    const rows = response.data.values || [];

    if (rows.length === 0) return { headers: [], data: [] };

    const headers = rows[0];
    const data = rows.slice(1).map((row, rowIndex) => {
      const obj = { _rowIndex: rowIndex + 2 }; // +2 because sheets are 1-indexed and we skip header
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || '';
      });
      return obj;
    });

    return { headers, data };
  };

  return sheetsApiCallWithRetry(apiCall, accessToken, refreshTokenCallback);
}

/**
 * Read sheet data from cache if available, otherwise fall back to API.
 * Used for dupe checking in junction tables where stale data is acceptable.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} sheetName - Sheet name to read
 * @returns {Promise<Object>} Sheet data with headers and data array
 */
export async function readSheetDataCachedFirst(accessToken, sheetId, sheetName) {
  const cached = await getCachedData(sheetName);
  if (cached) return cached;
  return readSheetData(accessToken, sheetId, sheetName);
}

/**
 * Generate unique Contact ID (UUID-based, no API call required)
 */
export async function generateContactID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.CONTACT);
}

/**
 * Generate unique Touchpoint ID (UUID-based, no API call required)
 */
export async function generateTouchpointID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.TOUCHPOINT);
}

/**
 * Append a row to a sheet
 */
export async function appendRow(accessToken, sheetId, sheetName, values) {
  const client = createSheetsClient(accessToken);

  const response = await client.post(
    `/${sheetId}/values/${sheetName}:append`,
    {
      values: [values],
    },
    {
      params: {
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
      },
    }
  );
  return response.data;
}

/**
 * Append multiple rows to multiple sheets in a single API call.
 * Uses the values:batchUpdate endpoint to minimize request count.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} rowsBySheet - Map of sheet name to array of row value arrays
 *   e.g. { 'Contact Notes': [['N1', 'C1', '2026-01-01']], 'Event Notes': [...] }
 * @returns {Promise<Object>} API response data
 */
export async function batchAppendRows(accessToken, sheetId, rowsBySheet) {
  const entries = Object.entries(rowsBySheet);
  if (entries.length === 0) return { totalUpdatedRows: 0 };

  const client = createSheetsClient(accessToken);

  const data = entries.map(([sheetName, rows]) => ({
    range: sheetName,
    values: rows,
  }));

  const response = await client.post(
    `/${sheetId}/values:batchUpdate`,
    {
      valueInputOption: 'RAW',
      data,
    }
  );

  return response.data;
}

/**
 * Update a specific cell or range
 */
export async function updateCell(accessToken, sheetId, range, value) {
  const client = createSheetsClient(accessToken);

  const response = await client.put(
    `/${sheetId}/values/${range}`,
    {
      values: [[value]],
    },
    {
      params: {
        valueInputOption: 'RAW',
      },
    }
  );
  return response.data;
}

/**
 * Update an entire row
 */
export async function updateRow(accessToken, sheetId, sheetName, rowIndex, values) {
  const client = createSheetsClient(accessToken);

  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  const response = await client.put(
    `/${sheetId}/values/${range}`,
    {
      values: [values],
    },
    {
      params: {
        valueInputOption: 'RAW',
      },
    }
  );
  return response.data;
}

/**
 * Log an entry to the Audit Log sheet
 */
export async function logAuditEntry(accessToken, sheetId, entry) {
  const { contactId, contactName, fieldChanged, oldValue, newValue, userEmail } = entry;

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const values = [
    timestamp,
    contactId,
    contactName,
    fieldChanged,
    oldValue || '',
    newValue || '',
    userEmail,
  ];

  return appendRow(accessToken, sheetId, SHEETS.AUDIT_LOG, values);
}

/**
 * Log multiple audit entries in a single batch API call.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Array<Object>} entries - Array of audit entry objects
 * @returns {Promise<Object>} Batch response
 */
export async function batchLogAuditEntries(accessToken, sheetId, entries) {
  if (entries.length === 0) return { totalUpdatedRows: 0 };

  const rows = entries.map((entry) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    return [
      timestamp,
      entry.contactId,
      entry.contactName,
      entry.fieldChanged,
      entry.oldValue || '',
      entry.newValue || '',
      entry.userEmail,
    ];
  });

  return batchAppendRows(accessToken, sheetId, {
    [SHEETS.AUDIT_LOG]: rows,
  });
}

/**
 * Append data object as a row to a sheet
 * Converts object with field names to array of values matching header order
 */
export async function appendData(accessToken, sheetId, sheetName, data) {
  // Get headers to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, sheetName);

  // Build values array in correct column order
  const values = headers.map((h) => data[h.name] || '');

  return appendRow(accessToken, sheetId, sheetName, values);
}

/**
 * Update data in a specific row
 * Converts object with field names to array of values matching header order
 */
export async function updateData(accessToken, sheetId, sheetName, rowIndex, data) {
  // Get headers to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, sheetName);

  // Build values array in correct column order
  const values = headers.map((h) => data[h.name] || '');

  return updateRow(accessToken, sheetId, sheetName, rowIndex, values);
}

/**
 * Delete a row from a sheet using batchUpdate API
 */
export async function deleteData(accessToken, sheetId, sheetName, rowIndex) {
  // Get the internal numeric sheet ID for this tab
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, sheetName);

  const client = createSheetsClient(accessToken);

  // Use batchUpdate to delete the dimension (row)
  const response = await client.post(`/${sheetId}:batchUpdate`, {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: internalSheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-indexed for API
            endIndex: rowIndex, // exclusive end
          },
        },
      },
    ],
  });

  return response.data;
}

/**
 * Add a new contact
 */
export async function addContact(accessToken, sheetId, contactData, userEmail) {
  // Get metadata to know column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS);

  // Generate ID and timestamps
  const contactId = await generateContactID(accessToken, sheetId);
  const dateAdded = new Date().toISOString().split('T')[0];

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Contact ID') return contactId;
    if (fieldName === 'Date Added') return dateAdded;
    if (fieldName === 'Last Contact Date') return '';
    return contactData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEETS.CONTACTS, values);

  // Log to audit (non-blocking — don't let audit failure crash contact creation)
  try {
    await logAuditEntry(accessToken, sheetId, {
      contactId,
      contactName: contactData['Name'] || '',
      fieldChanged: 'Contact Created',
      oldValue: '',
      newValue: 'New contact added',
      userEmail,
    });
  } catch (auditErr) {
    console.error('Audit log failed for addContact:', auditErr);
  }

  return { contactId, ...contactData };
}

/**
 * Update a contact and log changes to audit
 */
export async function updateContact(accessToken, sheetId, contactId, oldData, newData, userEmail) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS);
  const { data } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);

  // Find the row
  const contact = data.find((c) => c['Contact ID'] === contactId);
  if (!contact) throw new Error('Contact not found');

  const rowIndex = contact._rowIndex;

  // Build updated row
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Contact ID') return contactId;
    if (fieldName === 'Date Added') return oldData['Date Added'] || '';
    if (fieldName === 'Last Contact Date') return oldData['Last Contact Date'] || '';
    return newData[fieldName] !== undefined ? newData[fieldName] : oldData[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEETS.CONTACTS, rowIndex, values);

  // Batch log all changed fields to audit (non-blocking)
  try {
    const auditEntries = [];
    for (const fieldName of Object.keys(newData)) {
      if (newData[fieldName] !== oldData[fieldName]) {
        auditEntries.push({
          contactId,
          contactName: newData['Name'] || oldData['Name'] || '',
          fieldChanged: fieldName,
          oldValue: oldData[fieldName] || '',
          newValue: newData[fieldName] || '[DELETED]',
          userEmail,
        });
      }
    }
    if (auditEntries.length > 0) {
      await batchLogAuditEntries(accessToken, sheetId, auditEntries);
    }
  } catch (auditErr) {
    console.error('Audit log failed for updateContact:', auditErr);
  }

  return { contactId, ...newData };
}

/**
 * Add a touchpoint and update contact's Last Contact Date
 */
export async function addTouchpoint(accessToken, sheetId, touchpointData) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.TOUCHPOINTS);

  // Generate ID
  const touchpointId = await generateTouchpointID(accessToken, sheetId);

  // Build row
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Touchpoint ID') return touchpointId;
    // Auto-set Status based on Contact ID presence
    if (fieldName === 'Status') {
      return touchpointData['Contact ID'] ? TOUCHPOINT_STATUS.COMPLETE : TOUCHPOINT_STATUS.INCOMPLETE;
    }
    return touchpointData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEETS.TOUCHPOINTS, values);

  // Update contact's Last Contact Date
  const contactId = touchpointData['Contact ID'];
  if (contactId) {
    const { data } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
    const { headers: contactHeaders } = await readSheetMetadata(
      accessToken,
      sheetId,
      SHEETS.CONTACTS
    );

    const contact = data.find((c) => c['Contact ID'] === contactId);
    if (contact) {
      const lastContactColIndex = contactHeaders.findIndex((h) => h.name === 'Last Contact Date');
      if (lastContactColIndex >= 0) {
        const colLetter = String.fromCharCode(65 + lastContactColIndex);
        const range = `${SHEETS.CONTACTS}!${colLetter}${contact._rowIndex}`;
        await updateCell(
          accessToken,
          sheetId,
          range,
          touchpointData['Date'] || new Date().toISOString().split('T')[0]
        );
      }
    }
  }

  return { touchpointId, ...touchpointData };
}

/**
 * Update an existing touchpoint
 */
export async function updateTouchpoint(
  accessToken,
  sheetId,
  touchpointId,
  oldData,
  newData,
  userEmail
) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.TOUCHPOINTS);
  const { data } = await readSheetData(accessToken, sheetId, SHEETS.TOUCHPOINTS);

  // Find the row
  const touchpoint = data.find((t) => t['Touchpoint ID'] === touchpointId);
  if (!touchpoint) throw new Error('Touchpoint not found');

  const rowIndex = touchpoint._rowIndex;

  // Build updated row - preserve auto fields
  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'Touchpoint ID') return touchpointId;
    if (AUTO_FIELDS[fieldName]) return oldData[fieldName] || '';
    // Auto-update Status based on Contact ID presence
    if (fieldName === 'Status') {
      const contactId =
        newData['Contact ID'] !== undefined ? newData['Contact ID'] : oldData['Contact ID'];
      return contactId ? TOUCHPOINT_STATUS.COMPLETE : TOUCHPOINT_STATUS.INCOMPLETE;
    }
    return newData[fieldName] !== undefined ? newData[fieldName] : oldData[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEETS.TOUCHPOINTS, rowIndex, values);

  // Update contact's Last Contact Date if Contact ID was added
  const oldContactId = oldData['Contact ID'];
  const newContactId = newData['Contact ID'];
  if (!oldContactId && newContactId) {
    const { data: contactData } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
    const { headers: contactHeaders } = await readSheetMetadata(
      accessToken,
      sheetId,
      SHEETS.CONTACTS
    );

    const contact = contactData.find((c) => c['Contact ID'] === newContactId);
    if (contact) {
      const lastContactColIndex = contactHeaders.findIndex((h) => h.name === 'Last Contact Date');
      if (lastContactColIndex >= 0) {
        const colLetter = String.fromCharCode(65 + lastContactColIndex);
        const range = `${SHEETS.CONTACTS}!${colLetter}${contact._rowIndex}`;
        const touchpointDate =
          newData['Date'] || oldData['Date'] || new Date().toISOString().split('T')[0];
        await updateCell(accessToken, sheetId, range, touchpointDate);
      }
    }
  }

  // Log changes to audit (non-blocking)
  try {
    for (const fieldName of Object.keys(newData)) {
      if (newData[fieldName] !== oldData[fieldName]) {
        await logAuditEntry(accessToken, sheetId, {
          contactId: oldData['Contact ID'],
          contactName: oldData['Contact Name'] || '',
          fieldChanged: `Touchpoint ${fieldName}`,
          oldValue: oldData[fieldName] || '',
          newValue: newData[fieldName] || '',
          userEmail,
        });
      }
    }
  } catch (auditErr) {
    console.error('Audit log failed for updateTouchpoint:', auditErr);
  }

  return { touchpointId, ...newData };
}

/**
 * Generate unique Event ID (UUID-based, no API call required)
 */
export async function generateEventID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.EVENT);
}

/**
 * Add an event
 */
export async function addEvent(accessToken, sheetId, eventData, refreshTokenCallback = null) {
  const apiCall = async (token) => {
    const { headers } = await readSheetMetadata(token, sheetId, SHEETS.EVENTS);

    // Generate ID
    const eventId = await generateEventID(token, sheetId);

    // Build row with auto-generated fields
    const values = headers.map((h) => {
      const fieldName = h.name;
      if (fieldName === 'Event ID') return eventId;
      if (fieldName === 'Event Created Date') return new Date().toISOString().split('T')[0];
      return eventData[fieldName] || '';
    });

    await appendRow(token, sheetId, SHEETS.EVENTS, values);

    return { eventId, ...eventData };
  };

  return sheetsApiCallWithRetry(apiCall, accessToken, refreshTokenCallback);
}

/**
 * Get touchpoints for a specific contact
 */
export async function getContactTouchpoints(accessToken, sheetId, contactId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEETS.TOUCHPOINTS);
  return data.filter((t) => t['Contact ID'] === contactId);
}

/**
 * Detect duplicate contacts by name, phone, or email
 */
export async function detectDuplicates(accessToken, sheetId, contactData) {
  const { data } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
  const duplicates = [];

  const newName = (contactData['Name'] || '').toLowerCase().trim();
  const newPhones = (contactData['Phone'] || '')
    .split(',')
    .map((p) => p.trim().replace(/\D/g, ''))
    .filter(Boolean);
  const newEmails = (contactData['Email'] || '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  for (const existing of data) {
    const matchReasons = [];

    // Name match
    const existingName = (existing['Name'] || '').toLowerCase().trim();
    if (newName && existingName === newName) {
      matchReasons.push('name');
    }

    // Phone match
    const existingPhones = (existing['Phone'] || '')
      .split(',')
      .map((p) => p.trim().replace(/\D/g, ''))
      .filter(Boolean);
    for (const phone of newPhones) {
      if (existingPhones.includes(phone)) {
        matchReasons.push('phone');
        break;
      }
    }

    // Email match
    const existingEmails = (existing['Email'] || '')
      .split(',')
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);
    for (const email of newEmails) {
      if (existingEmails.includes(email)) {
        matchReasons.push('email');
        break;
      }
    }

    if (matchReasons.length > 0) {
      duplicates.push({
        existing,
        matchReasons,
      });
    }
  }

  return duplicates;
}

/**
 * Copy a contact from one sheet to another (e.g., personal to workspace)
 * Preserves contact data and adds source tracking fields
 */
export async function copyContactToWorkspace(
  accessToken,
  sourceSheetId,
  sourceContactId,
  targetSheetId,
  userEmail,
  linkConfig = null
) {
  // 1. Read source contact from personal sheet
  const { data: sourceContacts } = await readSheetData(accessToken, sourceSheetId, SHEETS.CONTACTS);
  const sourceContact = sourceContacts.find((c) => c['Contact ID'] === sourceContactId);

  if (!sourceContact) {
    throw new Error(`Contact ${sourceContactId} not found in source sheet`);
  }

  // 2. Determine which fields to copy based on sync strategy
  const CORE_FIELDS = ['Name', 'Phone', 'Email'];
  let fieldsToInclude = Object.keys(sourceContact);

  if (linkConfig && linkConfig.syncStrategy) {
    if (linkConfig.syncStrategy === 'core_fields_only') {
      fieldsToInclude = [...CORE_FIELDS, 'Contact ID', 'Date Added', 'Last Contact Date'];
    } else if (linkConfig.syncStrategy === 'custom') {
      fieldsToInclude = [
        ...(linkConfig.customFields || []),
        'Contact ID',
        'Date Added',
        'Last Contact Date',
      ];
    }
    // 'all_fields' uses all keys by default
  }

  // 3. Prepare workspace contact data
  const workspaceContactData = {};
  fieldsToInclude.forEach((field) => {
    if (
      field in sourceContact &&
      field !== 'Contact ID' &&
      field !== 'Date Added' &&
      field !== 'Last Contact Date'
    ) {
      workspaceContactData[field] = sourceContact[field] || '';
    }
  });

  // Add source tracking fields
  workspaceContactData['Source Type'] = 'copied_from_personal';
  workspaceContactData['Source Contact ID'] = sourceContactId;

  // 4. Add to target sheet using existing addContact function
  const result = await addContact(accessToken, targetSheetId, workspaceContactData, userEmail);

  // 5. Create sync link if requested
  if (linkConfig && linkConfig.createLink && result && result.contactId) {
    const { createContactLink } = await import('../services/contactLinkService');
    await createContactLink(
      {
        type: linkConfig.sourceWorkspace.type,
        id: linkConfig.sourceWorkspace.id,
        sheetId: sourceSheetId,
        contactId: sourceContactId,
      },
      {
        type: linkConfig.targetWorkspace.type,
        id: linkConfig.targetWorkspace.id,
        sheetId: targetSheetId,
        contactId: result.contactId,
      },
      linkConfig.syncStrategy || 'core_fields_only',
      linkConfig.customFields || [],
      userEmail
    );
  }

  return result;
}

/**
 * Copy multiple contacts from one sheet to another (batch operation)
 */
export async function copyMultipleContacts(
  accessToken,
  sourceSheetId,
  contactIds,
  targetSheetId,
  userEmail
) {
  const settled = await Promise.allSettled(
    contactIds.map((contactId) =>
      copyContactToWorkspace(accessToken, sourceSheetId, contactId, targetSheetId, userEmail)
        .then((result) => ({ success: true, contactId, result }))
    )
  );

  return settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { success: false, contactId: 'unknown', error: s.reason?.message || 'Unknown error' }
  );
}

/**
 * Links a note to a contact by creating a mapping in Contact Notes sheet
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to link
 * @param {string} contactId - Contact ID to link to
 * @returns {Promise<object>} Mapping object
 */
export async function linkNoteToContact(accessToken, sheetId, noteId, contactId) {
  const linkedDate = new Date().toISOString().split('T')[0];

  // Check if mapping already exists (use cache-first for faster dupe checks)
  const { data: existingMappings } = await readSheetDataCachedFirst(
    accessToken,
    sheetId,
    SHEETS.CONTACT_NOTES
  );

  const exists = existingMappings.some(
    (cn) => cn['Note ID'] === noteId && cn['Contact ID'] === contactId
  );

  if (exists) {
    return { success: true, alreadyExists: true };
  }

  // Create new mapping
  const newMapping = {
    'Note ID': noteId,
    'Contact ID': contactId,
    'Linked Date': linkedDate,
  };

  // Append to Contact Notes sheet
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACT_NOTES);

  const values = headers.map((h) => newMapping[h.name] || '');

  await appendRow(accessToken, sheetId, SHEETS.CONTACT_NOTES, values);

  // Optimistically update cache
  await appendToCachedData(SHEETS.CONTACT_NOTES, newMapping);

  return { success: true, mapping: newMapping };
}

/**
 * Unlinks a note from a contact by deleting the mapping
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to unlink
 * @param {string} contactId - Contact ID to unlink from
 * @returns {Promise<object>} Success result
 */
export async function unlinkNoteFromContact(accessToken, sheetId, noteId, contactId) {
  // Find the mapping row
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.CONTACT_NOTES);

  const mapping = mappings.find((cn) => cn['Note ID'] === noteId && cn['Contact ID'] === contactId);

  if (!mapping) {
    return { success: true, notFound: true };
  }

  const rowIndex = mapping._rowIndex;

  // Get internal sheet ID
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.CONTACT_NOTES);

  // Delete the row using batchUpdate
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

  return { success: true, noteId, contactId };
}

/**
 * Filter notes by visibility permissions for the current user
 * @param {Array} notes - Array of note objects
 * @param {string} userEmail - Email of the current user
 * @returns {Array} - Filtered array of notes the user can see
 */
export function filterNotesByVisibility(notes, userEmail) {
  if (!userEmail) {
    // No identity context — only return workspace-wide notes, never private ones
    return notes.filter(
      (note) => (note['Visibility'] || VISIBILITY.WORKSPACE_WIDE) === VISIBILITY.WORKSPACE_WIDE
    );
  }

  return notes.filter((note) => {
    const createdBy = note['Created By'];
    const visibility = note['Visibility'] || VISIBILITY.WORKSPACE_WIDE;

    if (visibility === VISIBILITY.PRIVATE) {
      return createdBy === userEmail;
    } else if (visibility === VISIBILITY.SHARED) {
      const sharedWith = (note['Shared With'] || '')
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);
      return createdBy === userEmail || sharedWith.includes(userEmail);
    } else {
      // Workspace-Wide (or legacy Campaign-Wide) or empty/null visibility
      return true;
    }
  });
}

/**
 * Check if a user can view a specific note
 * @param {Object} note - Note object
 * @param {string} userEmail - Email of the current user
 * @returns {boolean} - True if user can view the note
 */
export function canUserViewNote(note, userEmail) {
  if (!note || !userEmail) {
    return false;
  }

  const createdBy = note['Created By'];
  const visibility = note['Visibility'] || VISIBILITY.WORKSPACE_WIDE;

  if (visibility === VISIBILITY.PRIVATE) {
    return createdBy === userEmail;
  } else if (visibility === VISIBILITY.SHARED) {
    const sharedWith = (note['Shared With'] || '')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);
    return createdBy === userEmail || sharedWith.includes(userEmail);
  } else {
    // Workspace-Wide (or legacy Campaign-Wide)
    return true;
  }
}

/**
 * Check if a user can edit a specific note
 * @param {Object} note - Note object
 * @param {string} userEmail - Email of the current user
 * @returns {boolean} - True if user can edit the note
 */
export function canUserEditNote(note, userEmail) {
  if (!note || !userEmail) {
    return false;
  }

  return note['Created By'] === userEmail;
}

/**
 * Gets all notes linked to a specific contact
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<Array>} Array of note objects
 */
export async function getContactNotes(accessToken, sheetId, contactId) {
  // Get all notes
  const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);

  // Get contact-note mappings
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.CONTACT_NOTES);

  // Find note IDs linked to this contact
  const linkedNoteIds = mappings
    .filter((cn) => cn['Contact ID'] === contactId)
    .map((cn) => cn['Note ID']);

  // Return matching notes
  return allNotes.filter((note) => linkedNoteIds.includes(note['Note ID']));
}

/**
 * Generate unique Note ID (UUID-based, no API call required)
 */
export async function generateNoteID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.NOTE);
}

// ============================================================================
// EVENT NOTES LINKING FUNCTIONS
// ============================================================================

/**
 * Links a note to an event (many-to-many relationship)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to link
 * @param {string} eventId - Event ID to link to
 * @returns {Promise<object>} Success result
 */
export async function linkNoteToEvent(accessToken, sheetId, noteId, eventId) {
  const linkedDate = new Date().toISOString().split('T')[0];

  // Check if mapping already exists (use cache-first for faster dupe checks)
  const { data: existingMappings } = await readSheetDataCachedFirst(
    accessToken,
    sheetId,
    SHEETS.EVENT_NOTES
  );

  const exists = existingMappings.some(
    (en) => en['Note ID'] === noteId && en['Event ID'] === eventId
  );

  if (exists) {
    return { success: true, alreadyExists: true };
  }

  // Create new mapping
  const newMapping = {
    'Event ID': eventId,
    'Note ID': noteId,
    'Linked Date': linkedDate,
  };

  // Append to Event Notes sheet
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.EVENT_NOTES);
  const values = headers.map((h) => newMapping[h.name] || '');
  await appendRow(accessToken, sheetId, SHEETS.EVENT_NOTES, values);

  // Optimistically update cache
  await appendToCachedData(SHEETS.EVENT_NOTES, newMapping);

  return { success: true, mapping: newMapping };
}

/**
 * Unlinks a note from an event
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to unlink
 * @param {string} eventId - Event ID to unlink from
 * @returns {Promise<object>} Success result
 */
export async function unlinkNoteFromEvent(accessToken, sheetId, noteId, eventId) {
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.EVENT_NOTES);

  const mapping = mappings.find((en) => en['Note ID'] === noteId && en['Event ID'] === eventId);

  if (!mapping) {
    return { success: true, notFound: true };
  }

  const rowIndex = mapping._rowIndex;
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.EVENT_NOTES);

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

  return { success: true, noteId, eventId };
}

/**
 * Gets all notes linked to a specific event
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} eventId - Event ID
 * @param {string} userEmail - Optional user email for visibility filtering
 * @returns {Promise<Array>} Array of note objects
 */
export async function getEventNotes(accessToken, sheetId, eventId, userEmail = null) {
  const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.EVENT_NOTES);

  const linkedNoteIds = mappings
    .filter((en) => en['Event ID'] === eventId)
    .map((en) => en['Note ID']);

  let notes = allNotes.filter((note) => linkedNoteIds.includes(note['Note ID']));

  // Apply visibility filtering if user email provided
  if (userEmail) {
    notes = filterNotesByVisibility(notes, userEmail);
  }

  return notes;
}

// ============================================================================
// LIST NOTES LINKING FUNCTIONS
// ============================================================================

/**
 * Links a note to a list (many-to-many relationship)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to link
 * @param {string} listId - List ID to link to
 * @returns {Promise<object>} Success result
 */
export async function linkNoteToList(accessToken, sheetId, noteId, listId) {
  const linkedDate = new Date().toISOString().split('T')[0];

  // Check if mapping already exists (use cache-first for faster dupe checks)
  const { data: existingMappings } = await readSheetDataCachedFirst(
    accessToken,
    sheetId,
    SHEETS.LIST_NOTES
  );

  const exists = existingMappings.some(
    (ln) => ln['Note ID'] === noteId && ln['List ID'] === listId
  );

  if (exists) {
    return { success: true, alreadyExists: true };
  }

  const newMapping = {
    'List ID': listId,
    'Note ID': noteId,
    'Linked Date': linkedDate,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.LIST_NOTES);
  const values = headers.map((h) => newMapping[h.name] || '');
  await appendRow(accessToken, sheetId, SHEETS.LIST_NOTES, values);

  // Optimistic cache update
  await appendToCachedData(SHEETS.LIST_NOTES, newMapping);

  return { success: true, mapping: newMapping };
}

/**
 * Unlinks a note from a list
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to unlink
 * @param {string} listId - List ID to unlink from
 * @returns {Promise<object>} Success result
 */
export async function unlinkNoteFromList(accessToken, sheetId, noteId, listId) {
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.LIST_NOTES);

  const mapping = mappings.find((ln) => ln['Note ID'] === noteId && ln['List ID'] === listId);

  if (!mapping) {
    return { success: true, notFound: true };
  }

  const rowIndex = mapping._rowIndex;
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.LIST_NOTES);

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

  return { success: true, noteId, listId };
}

/**
 * Gets all notes linked to a specific list
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} listId - List ID
 * @param {string} userEmail - Optional user email for visibility filtering
 * @returns {Promise<Array>} Array of note objects
 */
export async function getListNotes(accessToken, sheetId, listId, userEmail = null) {
  const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.LIST_NOTES);

  const linkedNoteIds = mappings
    .filter((ln) => ln['List ID'] === listId)
    .map((ln) => ln['Note ID']);

  let notes = allNotes.filter((note) => linkedNoteIds.includes(note['Note ID']));

  if (userEmail) {
    notes = filterNotesByVisibility(notes, userEmail);
  }

  return notes;
}

// ============================================================================
// TASK NOTES LINKING FUNCTIONS
// ============================================================================

/**
 * Links a note to a task (many-to-many relationship)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to link
 * @param {string} taskId - Task ID to link to
 * @returns {Promise<object>} Success result
 */
export async function linkNoteToTask(accessToken, sheetId, noteId, taskId) {
  const linkedDate = new Date().toISOString().split('T')[0];

  // Check if mapping already exists (use cache-first for faster dupe checks)
  const { data: existingMappings } = await readSheetDataCachedFirst(
    accessToken,
    sheetId,
    SHEETS.TASK_NOTES
  );

  const exists = existingMappings.some(
    (tn) => tn['Note ID'] === noteId && tn['Task ID'] === taskId
  );

  if (exists) {
    return { success: true, alreadyExists: true };
  }

  const newMapping = {
    'Task ID': taskId,
    'Note ID': noteId,
    'Linked Date': linkedDate,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.TASK_NOTES);
  const values = headers.map((h) => newMapping[h.name] || '');
  await appendRow(accessToken, sheetId, SHEETS.TASK_NOTES, values);

  // Optimistic cache update
  await appendToCachedData(SHEETS.TASK_NOTES, newMapping);

  return { success: true, mapping: newMapping };
}

/**
 * Unlinks a note from a task
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to unlink
 * @param {string} taskId - Task ID to unlink from
 * @returns {Promise<object>} Success result
 */
export async function unlinkNoteFromTask(accessToken, sheetId, noteId, taskId) {
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.TASK_NOTES);

  const mapping = mappings.find((tn) => tn['Note ID'] === noteId && tn['Task ID'] === taskId);

  if (!mapping) {
    return { success: true, notFound: true };
  }

  const rowIndex = mapping._rowIndex;
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.TASK_NOTES);

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

  return { success: true, noteId, taskId };
}

/**
 * Gets all notes linked to a specific task
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} taskId - Task ID
 * @param {string} userEmail - Optional user email for visibility filtering
 * @returns {Promise<Array>} Array of note objects
 */
export async function getTaskNotes(accessToken, sheetId, taskId, userEmail = null) {
  const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.TASK_NOTES);

  const linkedNoteIds = mappings
    .filter((tn) => tn['Task ID'] === taskId)
    .map((tn) => tn['Note ID']);

  let notes = allNotes.filter((note) => linkedNoteIds.includes(note['Note ID']));

  if (userEmail) {
    notes = filterNotesByVisibility(notes, userEmail);
  }

  return notes;
}

// ============================================================================
// ENHANCED NOTE RETRIEVAL & BATCH OPERATIONS
// ============================================================================

/**
 * Gets a note with all its linked entities
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID
 * @param {string} userEmail - Optional user email for visibility filtering
 * @returns {Promise<object>} Note object with linkedContacts, linkedEvents, linkedLists, linkedTasks arrays
 */
export async function getNoteWithEntities(accessToken, sheetId, noteId, userEmail = null) {
  // Get the note
  const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);
  const note = allNotes.find((n) => n['Note ID'] === noteId);

  if (!note) {
    return null;
  }

  // Check visibility
  if (userEmail && !canUserViewNote(note, userEmail)) {
    return null;
  }

  // Fetch all junction tables in parallel
  const [
    { data: contactMappings },
    { data: eventMappings },
    { data: listMappings },
    { data: taskMappings },
    { data: allContacts },
    { data: allEvents },
    { data: allLists },
    { data: allTasks },
  ] = await Promise.all([
    readSheetData(accessToken, sheetId, SHEETS.CONTACT_NOTES),
    readSheetData(accessToken, sheetId, SHEETS.EVENT_NOTES),
    readSheetData(accessToken, sheetId, SHEETS.LIST_NOTES),
    readSheetData(accessToken, sheetId, SHEETS.TASK_NOTES),
    readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
    readSheetData(accessToken, sheetId, SHEETS.EVENTS),
    readSheetData(accessToken, sheetId, SHEETS.LISTS),
    readSheetData(accessToken, sheetId, SHEETS.TASKS),
  ]);

  // Get linked entity IDs
  const linkedContactIds = contactMappings
    .filter((cm) => cm['Note ID'] === noteId)
    .map((cm) => cm['Contact ID']);

  const linkedEventIds = eventMappings
    .filter((em) => em['Note ID'] === noteId)
    .map((em) => em['Event ID']);

  const linkedListIds = listMappings
    .filter((lm) => lm['Note ID'] === noteId)
    .map((lm) => lm['List ID']);

  const linkedTaskIds = taskMappings
    .filter((tm) => tm['Note ID'] === noteId)
    .map((tm) => tm['Task ID']);

  // Attach linked entities to note
  note.linkedContacts = allContacts.filter((c) => linkedContactIds.includes(c['Contact ID']));
  note.linkedEvents = allEvents.filter((e) => linkedEventIds.includes(e['Event ID']));
  note.linkedLists = allLists.filter((l) => linkedListIds.includes(l['List ID']));
  note.linkedTasks = allTasks.filter((t) => linkedTaskIds.includes(t['Task ID']));

  return note;
}

/**
 * Batch links a note to multiple entities at once (for commit workflow)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} noteId - Note ID to link
 * @param {object} entityLinks - Object with contactIds, eventIds, listIds, taskIds arrays
 * @returns {Promise<object>} Results of all link operations
 */
export async function batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks) {
  const { contactIds = [], eventIds = [], listIds = [], taskIds = [] } = entityLinks;

  const allPromises = [
    ...contactIds.map((contactId) =>
      linkNoteToContact(accessToken, sheetId, noteId, contactId)
        .then((result) => ({ type: 'contact', id: contactId, ...result }))
        .catch((error) => ({ type: 'contact', id: contactId, success: false, error: error.message }))
    ),
    ...eventIds.map((eventId) =>
      linkNoteToEvent(accessToken, sheetId, noteId, eventId)
        .then((result) => ({ type: 'event', id: eventId, ...result }))
        .catch((error) => ({ type: 'event', id: eventId, success: false, error: error.message }))
    ),
    ...listIds.map((listId) =>
      linkNoteToList(accessToken, sheetId, noteId, listId)
        .then((result) => ({ type: 'list', id: listId, ...result }))
        .catch((error) => ({ type: 'list', id: listId, success: false, error: error.message }))
    ),
    ...taskIds.map((taskId) =>
      linkNoteToTask(accessToken, sheetId, noteId, taskId)
        .then((result) => ({ type: 'task', id: taskId, ...result }))
        .catch((error) => ({ type: 'task', id: taskId, success: false, error: error.message }))
    ),
  ];

  const settled = await Promise.allSettled(allPromises);

  const results = { contacts: [], events: [], lists: [], tasks: [] };
  for (const item of settled) {
    const val = item.status === 'fulfilled' ? item.value : { ...item.reason, success: false };
    const key = `${val.type}s`;
    if (results[key]) results[key].push(val);
  }

  return results;
}

/**
 * Shares notes linked to contact(s) with workspace by updating visibility
 * Used when copying contacts to workspaces
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Array<string>} contactIds - Contact IDs being copied
 * @param {string} shareStrategy - 'workspace-wide' | 'shared'
 * @param {Array<string>} specificEmails - For 'shared' strategy, list of emails
 * @param {string} userEmail - Current user's email (for permission check)
 * @returns {Promise<object>} Results with sharedCount, skippedCount, errors
 */
export async function shareContactNotes(
  accessToken,
  sheetId,
  contactIds,
  shareStrategy,
  specificEmails = [],
  userEmail = null
) {
  const results = {
    sharedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    // Get all notes linked to these contacts
    const { data: contactNoteMappings } = await readSheetData(
      accessToken,
      sheetId,
      SHEETS.CONTACT_NOTES
    );

    const linkedNoteIds = contactNoteMappings
      .filter((cn) => contactIds.includes(cn['Contact ID']))
      .map((cn) => cn['Note ID']);

    // Remove duplicates
    const uniqueNoteIds = [...new Set(linkedNoteIds)];

    // Get all notes
    const { data: allNotes } = await readSheetData(accessToken, sheetId, SHEETS.NOTES);

    // Filter to notes user can share (only their own notes or already workspace-wide)
    const notesToShare = allNotes.filter((note) => {
      if (!uniqueNoteIds.includes(note['Note ID'])) return false;

      const createdBy = note['Created By'];
      const visibility = note['Visibility'] || VISIBILITY.WORKSPACE_WIDE;

      // User can only share their own notes or notes that are already workspace-wide
      return (
        createdBy === userEmail ||
        visibility === VISIBILITY.CAMPAIGN_WIDE ||
        visibility === VISIBILITY.WORKSPACE_WIDE
      );
    });

    // Update visibility for each note
    for (const note of notesToShare) {
      try {
        const rowIndex = note._rowIndex;

        let updateData = {};

        if (shareStrategy === 'workspace-wide') {
          updateData = {
            Visibility: VISIBILITY.WORKSPACE_WIDE,
            'Shared With': '', // Clear shared with list for workspace-wide
          };
        } else if (shareStrategy === 'shared') {
          updateData = {
            Visibility: VISIBILITY.SHARED,
            'Shared With': specificEmails.join(', '),
          };
        }

        // Update the note row
        const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.NOTES);
        const visibilityColIndex = headers.findIndex((h) => h.name === 'Visibility');
        const sharedWithColIndex = headers.findIndex((h) => h.name === 'Shared With');

        const updates = [];
        if (visibilityColIndex >= 0) {
          updates.push({
            range: `${SHEETS.NOTES}!${String.fromCharCode(65 + visibilityColIndex)}${rowIndex}`,
            values: [[updateData.Visibility || '']],
          });
        }
        if (sharedWithColIndex >= 0) {
          updates.push({
            range: `${SHEETS.NOTES}!${String.fromCharCode(65 + sharedWithColIndex)}${rowIndex}`,
            values: [[updateData['Shared With'] || '']],
          });
        }

        if (updates.length > 0) {
          const client = createSheetsClient(accessToken);
          await client.put(`/${sheetId}/values:batchUpdate`, {
            data: updates,
            valueInputOption: 'RAW',
          });

          results.sharedCount++;
        }
      } catch (error) {
        results.errors.push({ noteId: note['Note ID'], error: error.message });
      }
    }

    results.skippedCount = uniqueNoteIds.length - notesToShare.length;
  } catch (error) {
    results.errors.push({ general: error.message });
  }

  return results;
}

/**
 * Creates a note and links it to a contact in a single batch operation
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {object} noteData - Note data
 * @param {string} contactId - Contact ID to link to (optional)
 * @param {string} userEmail - User email for Created By field (optional)
 * @returns {Promise<object>} Created note with linkage result
 */
export async function addNoteWithLink(
  accessToken,
  sheetId,
  noteData,
  contactId = null,
  userEmail = null
) {
  // Generate IDs
  const noteId = await generateNoteID(accessToken, sheetId);
  const createdDate = new Date().toISOString().split('T')[0];

  const newNote = {
    'Note ID': noteId,
    'Created Date': createdDate,
    'Created By': userEmail || '',
    ...noteData,
    // Set default visibility if not provided
    Visibility: noteData.Visibility || VISIBILITY.WORKSPACE_WIDE,
  };

  // Build note row
  const { headers: notesHeaders } = await readSheetMetadata(accessToken, sheetId, SHEETS.NOTES);
  const noteValues = notesHeaders.map((h) => newNote[h.name] || '');

  // If contact ID provided, we'll do batch operation
  if (contactId) {
    const { headers: contactNotesHeaders } = await readSheetMetadata(
      accessToken,
      sheetId,
      SHEETS.CONTACT_NOTES
    );

    const linkedDate = new Date().toISOString().split('T')[0];
    const mapping = {
      'Note ID': noteId,
      'Contact ID': contactId,
      'Linked Date': linkedDate,
    };

    const mappingValues = contactNotesHeaders.map((h) => mapping[h.name] || '');

    // Append note first, then link. If linking fails, note is still saved.
    await appendRow(accessToken, sheetId, SHEETS.NOTES, noteValues);

    try {
      await appendRow(accessToken, sheetId, SHEETS.CONTACT_NOTES, mappingValues);
    } catch (linkErr) {
      console.error('Note saved but contact link failed:', linkErr);
      return {
        noteId,
        ...newNote,
        linked: false,
        linkError: linkErr.message,
      };
    }

    return {
      noteId,
      ...newNote,
      linked: true,
    };
  } else {
    // Just append note
    await appendRow(accessToken, sheetId, SHEETS.NOTES, noteValues);

    return {
      noteId,
      ...newNote,
      linked: false,
    };
  }
}

/**
 * Generate a unique List ID (UUID-based, no API call required)
 */
export async function generateListID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.LIST);
}

/**
 * Add a new list
 */
export async function addList(accessToken, sheetId, listData) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.LISTS);
  const listId = await generateListID(accessToken, sheetId);

  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'List ID') return listId;
    if (fieldName === 'List Created Date') return new Date().toISOString().split('T')[0];
    return listData[fieldName] || '';
  });

  await appendRow(accessToken, sheetId, SHEETS.LISTS, values);
  return { listId, ...listData };
}

/**
 * Update an existing list (preserves List ID and List Created Date)
 */
export async function updateList(accessToken, sheetId, listId, listData) {
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.LISTS);
  const { data } = await readSheetData(accessToken, sheetId, SHEETS.LISTS);

  const list = data.find((l) => l['List ID'] === listId);
  if (!list) throw new Error(`List ${listId} not found`);

  const rowIndex = list._rowIndex;

  const values = headers.map((h) => {
    const fieldName = h.name;
    if (fieldName === 'List ID') return listId;
    if (fieldName === 'List Created Date') return list['List Created Date'] || '';
    return listData[fieldName] !== undefined ? listData[fieldName] : list[fieldName] || '';
  });

  await updateRow(accessToken, sheetId, SHEETS.LISTS, rowIndex, values);
  return { listId, ...listData };
}

/**
 * Delete a list with cascade (removes Contact Lists and List Notes mappings first)
 */
export async function deleteList(accessToken, sheetId, listId) {
  const client = createSheetsClient(accessToken);

  // 1. Delete List Notes mappings (bottom-up to avoid index shifting)
  const { data: listNotes } = await readSheetData(accessToken, sheetId, SHEETS.LIST_NOTES);
  const lnRows = listNotes
    .filter((ln) => ln['List ID'] === listId)
    .map((ln) => ln._rowIndex)
    .sort((a, b) => b - a); // bottom-up

  if (lnRows.length > 0) {
    const lnSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.LIST_NOTES);
    for (const rowIndex of lnRows) {
      await client.post(`/${sheetId}:batchUpdate`, {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: lnSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      });
    }
  }

  // 2. Delete Contact Lists mappings (bottom-up)
  const { data: contactLists } = await readSheetData(accessToken, sheetId, SHEETS.CONTACT_LISTS);
  const clRows = contactLists
    .filter((cl) => cl['List ID'] === listId)
    .map((cl) => cl._rowIndex)
    .sort((a, b) => b - a); // bottom-up

  if (clRows.length > 0) {
    const clSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.CONTACT_LISTS);
    for (const rowIndex of clRows) {
      await client.post(`/${sheetId}:batchUpdate`, {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: clSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      });
    }
  }

  // 3. Delete the list row itself
  const { data: lists } = await readSheetData(accessToken, sheetId, SHEETS.LISTS);
  const list = lists.find((l) => l['List ID'] === listId);
  if (!list) throw new Error(`List ${listId} not found`);

  const listSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.LISTS);
  await client.post(`/${sheetId}:batchUpdate`, {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: listSheetId,
            dimension: 'ROWS',
            startIndex: list._rowIndex - 1,
            endIndex: list._rowIndex,
          },
        },
      },
    ],
  });

  return { success: true, listId };
}

/**
 * Add a contact to a list (creates a Contact Lists mapping)
 */
export async function addContactToList(accessToken, sheetId, contactId, listId) {
  // Check if mapping already exists (use cache-first for faster dupe checks)
  const { data: existingMappings } = await readSheetDataCachedFirst(
    accessToken,
    sheetId,
    SHEETS.CONTACT_LISTS
  );

  const exists = existingMappings.some(
    (cl) => cl['Contact ID'] === contactId && cl['List ID'] === listId
  );

  if (exists) {
    return { success: true, alreadyExists: true };
  }

  const addedDate = new Date().toISOString().split('T')[0];
  const newMapping = {
    'Contact ID': contactId,
    'List ID': listId,
    'Added To List Date': addedDate,
  };

  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACT_LISTS);
  const values = headers.map((h) => newMapping[h.name] || '');
  await appendRow(accessToken, sheetId, SHEETS.CONTACT_LISTS, values);

  // Optimistic cache update
  await appendToCachedData(SHEETS.CONTACT_LISTS, newMapping);

  return { success: true, mapping: newMapping };
}

/**
 * Remove a contact from a list (deletes the Contact Lists mapping row)
 */
export async function removeContactFromList(accessToken, sheetId, contactId, listId) {
  const { data: mappings } = await readSheetData(accessToken, sheetId, SHEETS.CONTACT_LISTS);

  const mapping = mappings.find((cl) => cl['Contact ID'] === contactId && cl['List ID'] === listId);

  if (!mapping) {
    return { success: true, notFound: true };
  }

  const rowIndex = mapping._rowIndex;
  const internalSheetId = await getSheetIdByName(accessToken, sheetId, SHEETS.CONTACT_LISTS);

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

  return { success: true, contactId, listId };
}

/**
 * Get all lists a contact belongs to (joins Contact Lists + Lists)
 */
export async function getContactLists(accessToken, sheetId, contactId) {
  const [{ data: contactLists }, { data: lists }] = await Promise.all([
    readSheetData(accessToken, sheetId, SHEETS.CONTACT_LISTS),
    readSheetData(accessToken, sheetId, SHEETS.LISTS),
  ]);

  const contactListIds = contactLists
    .filter((cl) => cl['Contact ID'] === contactId)
    .map((cl) => cl['List ID']);

  return lists.filter((l) => contactListIds.includes(l['List ID']));
}

/**
 * Get all contacts in a list (joins Contact Lists + Contacts)
 */
export async function getListContacts(accessToken, sheetId, listId) {
  const [{ data: contactLists }, { data: contacts }] = await Promise.all([
    readSheetData(accessToken, sheetId, SHEETS.CONTACT_LISTS),
    readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
  ]);

  const listContactIds = contactLists
    .filter((cl) => cl['List ID'] === listId)
    .map((cl) => cl['Contact ID']);

  return contacts.filter((c) => listContactIds.includes(c['Contact ID']));
}

export { SHEETS, AUTO_FIELDS };
