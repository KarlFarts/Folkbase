/**
 * Retry Queue for Failed Writes
 *
 * Stores failed junction/link write operations in localStorage.
 * Items are retried automatically on app load and after successful writes.
 * After MAX_ATTEMPTS failures, items surface as persistent notifications.
 *
 * Storage key: folkbase_retry_queue
 */

const STORAGE_KEY = 'folkbase_retry_queue';
export const MAX_ATTEMPTS = 3;

/**
 * Generate a simple unique ID for queue items.
 */
function generateQueueId() {
  return `rq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get the current retry queue from localStorage.
 * @returns {Array<Object>} Queue items
 */
export function getRetryQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save the queue to localStorage.
 * @param {Array<Object>} queue
 */
function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[RetryQueue] Failed to save queue:', error);
  }
}

/**
 * Add a failed write operation to the retry queue.
 * @param {Object} operation
 * @param {string} operation.type - Operation type (e.g., 'link-note-contact')
 * @param {string} operation.sourceId - Source entity ID
 * @param {string} operation.targetId - Target entity ID
 * @param {Object} [operation.payload] - Additional data needed for retry
 */
export function queueFailedWrite(operation) {
  const queue = getRetryQueue();
  queue.push({
    id: generateQueueId(),
    type: operation.type,
    sourceId: operation.sourceId,
    targetId: operation.targetId,
    payload: operation.payload || {},
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
  });
  saveQueue(queue);
}

/**
 * Increment the attempt count for a queue item.
 * @param {string} itemId - Queue item ID
 */
export function incrementAttempt(itemId) {
  const queue = getRetryQueue();
  const item = queue.find((i) => i.id === itemId);
  if (item) {
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    saveQueue(queue);
  }
}

/**
 * Remove an item from the queue (on success or manual dismiss).
 * @param {string} itemId - Queue item ID
 */
export function removeFromQueue(itemId) {
  const queue = getRetryQueue().filter((i) => i.id !== itemId);
  saveQueue(queue);
}

/**
 * Get items that have exceeded MAX_ATTEMPTS.
 * These should be surfaced to the user as persistent notifications.
 * @returns {Array<Object>} Failed items
 */
export function getFailedItems() {
  return getRetryQueue().filter((i) => i.attempts >= MAX_ATTEMPTS);
}

/**
 * Get items that are eligible for retry (attempts < MAX_ATTEMPTS).
 * @returns {Array<Object>} Retryable items
 */
export function getRetryableItems() {
  return getRetryQueue().filter((i) => i.attempts < MAX_ATTEMPTS);
}

/**
 * Clear the entire retry queue.
 */
export function clearRetryQueue() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
