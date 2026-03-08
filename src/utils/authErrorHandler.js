/**
 * Lightweight pub/sub bridge that lets axios interceptors notify AuthContext of
 * 401/403 Google API errors without creating circular import dependencies.
 *
 * Usage:
 *   AuthContext calls registerAuthErrorHandler(fn) on mount and registerAuthErrorHandler(null) on unmount.
 *   Axios interceptors call notifyAuthError() when a 401 or 403 response is received.
 */

let _handler = null;

/**
 * Register a handler function to be called when an auth error is detected.
 * Pass null to unregister the current handler.
 *
 * @param {Function|null} handler - Callback to invoke on auth error, or null to clear.
 */
export function registerAuthErrorHandler(handler) {
  _handler = handler;
}

/**
 * Notify the registered handler of an auth error.
 * No-ops if no handler is currently registered.
 */
export function notifyAuthError() {
  if (_handler) {
    _handler();
  }
}
