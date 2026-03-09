/**
 * Lightweight pub/sub bridge that lets axios interceptors notify the UI of
 * Google API rate limit (429) errors without creating circular import dependencies.
 *
 * Usage:
 *   RateLimitNotifier calls registerRateLimitHandler(fn) on mount and
 *   registerRateLimitHandler(null) on unmount.
 *   Axios interceptors call notifyRateLimit() when a 429 response is received
 *   and all retry attempts have been exhausted.
 */

let _handler = null;

/**
 * Register a handler function to be called when a rate limit error is detected.
 * Pass null to unregister the current handler.
 *
 * @param {Function|null} handler - Callback to invoke on rate limit, or null to clear.
 */
export function registerRateLimitHandler(handler) {
  _handler = handler;
}

/**
 * Notify the registered handler of a rate limit error.
 * No-ops if no handler is currently registered.
 */
export function notifyRateLimit() {
  if (_handler) {
    _handler();
  }
}
