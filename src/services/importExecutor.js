import {
  readSheetMetadata,
  appendRow,
  logAuditEntry,
  generateContactID,
  updateContact,
} from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { logImportHistory } from './importConfigService';
import { warn } from '../utils/logger';

const BATCH_SIZE = 50; // Rows per batch write
const MAX_RETRIES = 3; // Maximum retry attempts for failed operations
const RETRY_DELAY_MS = 1000; // Base delay between retries (will increase exponentially)

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise} Result of function
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, operationName = 'operation') {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Silent failure expected
      lastError = error;

      // Don't retry on certain errors (authentication, validation, etc.)
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error; // Auth errors should not be retried
      }

      if (attempt < maxRetries) {
        // Calculate exponential backoff delay
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        warn(
          `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Execute bulk import of contacts to Google Sheets
 * @param {Object} options - Import options
 * @param {string} options.accessToken - Google OAuth access token
 * @param {string} options.sheetId - Google Sheet ID
 * @param {Array} options.contacts - Array of contact objects to import
 * @param {Array} options.merges - Array of merge operations (optional)
 * @param {Object} options.fieldMapping - Mapping of source fields to Folkbase fields
 * @param {string} options.userEmail - Email of user performing import
 * @param {Function} options.onProgress - Callback for progress updates
 * @param {Object} options.cancelToken - Cancellation token with isCancelled property
 * @returns {Promise<Object>} Import results summary
 */
export async function executeImport({
  accessToken,
  sheetId,
  contacts,
  merges = [],
  fieldMapping,
  userEmail,
  onProgress,
  cancelToken = { isCancelled: false },
}) {
  const results = {
    added: 0,
    merged: 0,
    failed: 0,
    errors: [],
    cancelled: false,
  };

  // Get sheet metadata to understand column order
  const { headers } = await readSheetMetadata(accessToken, sheetId, SHEET_NAMES.CONTACTS);
  const headerNames = headers.map((h) => h.name);

  // STEP 1: Process merges first
  if (merges && merges.length > 0) {
    onProgress?.({
      phase: 'importing',
      total: contacts.length + merges.length,
      processed: 0,
      current: `Merging ${merges.length} duplicate(s)...`,
      canCancel: true,
    });

    for (let i = 0; i < merges.length; i++) {
      // Check for cancellation
      if (cancelToken.isCancelled) {
        results.cancelled = true;
        return results;
      }

      const merge = merges[i];
      try {
        // Retry merge operation with exponential backoff
        await retryWithBackoff(
          async () => {
            await updateContact(
              accessToken,
              sheetId,
              merge.contactId,
              merge.original,
              merge.updated,
              userEmail
            );
          },
          MAX_RETRIES,
          `Merge contact ${merge.contactId}`
        );
        results.merged++;

        // Log merge to audit (don't retry audit logging failures)
        try {
          await logAuditEntry(accessToken, sheetId, {
            contactId: merge.contactId,
            contactName: merge.updated.Name || merge.original.Name || '',
            fieldChanged: 'Merge from Import',
            oldValue: '',
            newValue: 'Contact updated with data from import',
            userEmail,
          });
        } catch (auditError) {
          warn('Failed to log merge to audit:', auditError);
          // Don't fail merge if audit logging fails
        }
      } catch (error) {
        // Silent failure expected
        results.failed++;
        results.errors.push({
          contact: merge.updated.Name || 'Unknown',
          error: `Merge failed after ${MAX_RETRIES} retries: ${error.message}`,
        });
      }
    }
  }

  // STEP 2: Process new contacts in batches
  const totalContacts = contacts.length;
  let processedCount = 0;

  for (let i = 0; i < totalContacts; i += BATCH_SIZE) {
    // Check for cancellation at start of each batch
    if (cancelToken.isCancelled) {
      results.cancelled = true;
      return results;
    }

    const batch = contacts.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalContacts / BATCH_SIZE);

    onProgress?.({
      phase: 'importing',
      total: totalContacts,
      processed: processedCount,
      current: `Importing batch ${batchNumber} of ${totalBatches}...`,
      canCancel: true,
    });

    // Process each contact in the batch
    for (const contact of batch) {
      // Check for cancellation
      if (cancelToken.isCancelled) {
        results.cancelled = true;
        return results;
      }

      try {
        // Retry contact creation with exponential backoff
        await retryWithBackoff(
          async () => {
            // Generate new Contact ID
            const contactId = await generateContactID(accessToken, sheetId);
            const dateAdded = new Date().toISOString().split('T')[0];

            // Build row values in correct column order
            const rowValues = headerNames.map((headerName) => {
              if (headerName === 'Contact ID') return contactId;
              if (headerName === 'Date Added') return dateAdded;
              if (headerName === 'Last Contact Date') return '';

              // Find the source field that maps to this header
              const sourceField = Object.entries(fieldMapping).find(
                ([, target]) => target === headerName
              )?.[0];

              if (sourceField && contact[sourceField]) {
                return contact[sourceField];
              }

              // Return default values for certain fields
              if (headerName === 'Priority') return contact.Priority || 'Medium';
              if (headerName === 'Status') return contact.Status || 'Active';

              return '';
            });

            // Append row to sheet
            await appendRow(accessToken, sheetId, SHEET_NAMES.CONTACTS, rowValues);
          },
          MAX_RETRIES,
          `Add contact ${contact.Name || 'Unknown'}`
        );

        results.added++;
      } catch (error) {
        // Silent failure expected
        results.failed++;
        results.errors.push({
          contact: contact.Name || contact[Object.keys(contact)[0]] || 'Unknown',
          error: `Failed after ${MAX_RETRIES} retries: ${error.message}`,
        });
      }

      processedCount++;
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < totalContacts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Log bulk import to audit log
  try {
    const summary = [
      `Added: ${results.added}`,
      results.merged > 0 ? `Merged: ${results.merged}` : null,
      results.failed > 0 ? `Failed: ${results.failed}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    await logAuditEntry(accessToken, sheetId, {
      contactId: 'BULK',
      contactName: 'Bulk Import',
      fieldChanged: 'Import Executed',
      oldValue: '',
      newValue: `Bulk import completed - ${summary}`,
      userEmail,
    });
  } catch {
    // Silent failure expected
  }

  // Log import to history
  try {
    await logImportHistory(accessToken, sheetId, {
      filename: fieldMapping._filename || 'unknown.csv',
      importedBy: userEmail,
      totalRows: contacts.length + merges.length,
      contactsAdded: results.added,
      duplicatesMerged: results.merged,
      duplicatesSkipped: fieldMapping._duplicatesSkipped || 0,
      invalidExcluded: fieldMapping._invalidExcluded || 0,
      templateUsed: fieldMapping._templateUsed || 'Manual',
      status: results.failed > 0 ? 'Completed with errors' : 'Completed',
    });
  } catch {
    // Silent failure expected
    // Don't fail import if history logging fails
  }

  // Final progress update
  onProgress?.({
    phase: 'importing',
    total: totalContacts,
    processed: totalContacts,
    current: 'Import complete!',
    canCancel: false,
  });

  return results;
}

/**
 * Transform parsed contacts using field mapping
 * @param {Array} rawContacts - Raw parsed contacts from file
 * @param {Object} fieldMapping - Mapping of source fields to Folkbase fields
 * @returns {Array} Transformed contacts
 */
export function transformContacts(rawContacts, fieldMapping) {
  return rawContacts.map((raw) => {
    const transformed = {};

    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (targetField && raw[sourceField] !== undefined) {
        transformed[targetField] = raw[sourceField];
      }
    }

    // Ensure required defaults
    if (!transformed.Priority) transformed.Priority = 'Medium';
    if (!transformed.Status) transformed.Status = 'Active';

    return transformed;
  });
}
