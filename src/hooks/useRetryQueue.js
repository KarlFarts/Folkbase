/**
 * Hook that processes the retry queue on mount and provides
 * failed items count for UI display.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRetryableItems,
  getFailedItems,
  incrementAttempt,
  removeFromQueue,
} from '../utils/retryQueue';
import { useNotification } from '../contexts/NotificationContext';

// Map of operation types to retry functions.
// Each function receives (accessToken, sheetId, item) and returns a Promise.
// Populated by registerRetryHandler().
const retryHandlers = {};

/**
 * Register a handler for a specific retry operation type.
 * Call this during app initialization.
 *
 * @param {string} type - Operation type (e.g., 'link-note-contact')
 * @param {Function} handler - async (accessToken, sheetId, item) => void
 */
export function registerRetryHandler(type, handler) {
  retryHandlers[type] = handler;
}

/**
 * Hook that processes the retry queue and surfaces failures.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Active Google Sheet ID
 * @returns {{ failedCount: number, processQueue: Function }}
 */
export function useRetryQueue(accessToken, sheetId) {
  const [failedCount, setFailedCount] = useState(0);
  const { notify } = useNotification();
  const hasProcessedRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (!accessToken || !sheetId) return;

    const retryable = getRetryableItems();
    if (retryable.length === 0) return;

    let successCount = 0;

    for (const item of retryable) {
      const handler = retryHandlers[item.type];
      if (!handler) {
        console.warn(`[RetryQueue] No handler for type: ${item.type}`);
        incrementAttempt(item.id);
        continue;
      }

      try {
        await handler(accessToken, sheetId, item);
        removeFromQueue(item.id);
        successCount++;
      } catch {
        incrementAttempt(item.id);
      }
    }

    if (successCount > 0) {
      notify.success(`Retried ${successCount} pending operation${successCount > 1 ? 's' : ''} successfully.`);
    }

    const nowFailed = getFailedItems();
    setFailedCount(nowFailed.length);

    if (nowFailed.length > 0) {
      notify.urgent(
        `${nowFailed.length} operation${nowFailed.length > 1 ? 's' : ''} failed after ${3} attempts. Check Settings for details.`
      );
    }
  }, [accessToken, sheetId, notify]);

  // Process on mount (once only) — intentionally exclude processQueue from deps
  useEffect(() => {
    if (!hasProcessedRef.current) {
      hasProcessedRef.current = true;
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sheetId]);

  return { failedCount, processQueue };
}
