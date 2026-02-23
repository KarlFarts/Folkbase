/**
 * Request Validation Utilities
 *
 * Validates API request sizes to prevent timeouts, quota exhaustion,
 * and exceeding Google Sheets API limits.
 */

/**
 * Google Sheets API limits
 */
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CELLS_PER_UPDATE = 5000000; // 5 million cells
const MAX_ROWS_PER_REQUEST = 40000; // Safe batch size

/**
 * Validate request payload size
 *
 * @param {*} data - Data to be sent in request
 * @param {string} operation - Operation name for error message
 * @throws {Error} If payload exceeds maximum size
 * @returns {boolean} True if valid
 */
export function validatePayloadSize(data, operation = 'API call') {
  const size = JSON.stringify(data).length;

  if (size > MAX_REQUEST_SIZE) {
    throw new Error(
      `${operation} payload too large: ${(size / 1024 / 1024).toFixed(2)}MB. ` +
        `Maximum is ${MAX_REQUEST_SIZE / 1024 / 1024}MB.`
    );
  }

  return true;
}

/**
 * Validate batch operation size
 *
 * @param {Array} items - Array of items in batch
 * @param {number} maxSize - Maximum batch size
 * @param {string} operation - Operation name for error message
 * @throws {Error} If batch exceeds maximum size
 * @returns {boolean} True if valid
 */
export function validateBatchSize(items, maxSize = MAX_ROWS_PER_REQUEST, operation = 'Batch operation') {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  if (items.length > maxSize) {
    throw new Error(
      `${operation} too large: ${items.length} items. ` +
        `Maximum is ${maxSize}. Please split into smaller batches.`
    );
  }

  return true;
}

/**
 * Export limits for external use
 */
export const LIMITS = {
  MAX_REQUEST_SIZE,
  MAX_CELLS_PER_UPDATE,
  MAX_ROWS_PER_REQUEST,
};
