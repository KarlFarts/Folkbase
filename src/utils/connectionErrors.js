/**
 * Connection error classifier — maps raw auth/sheet errors to user-friendly messages.
 */

export const CONNECTION_STEPS = ['account', 'sheets', 'drive', 'calendar'];

const ERROR_MAP = [
  // Account errors
  {
    test: (msg) => /popup.?blocked/i.test(msg),
    code: 'popup_blocked',
    step: 'account',
    detail: 'The sign-in popup was blocked by your browser.',
    fix: 'Allow popups for this site and try again.',
  },
  {
    test: (msg) => /access_denied|user.?cancel|closed the/i.test(msg),
    code: 'user_cancelled',
    step: 'account',
    detail: 'You closed the sign-in window.',
    fix: 'Click Sign In to try again.',
  },
  {
    test: (msg) => /state validation|csrf/i.test(msg),
    code: 'csrf_mismatch',
    step: 'account',
    detail: 'Security validation failed.',
    fix: 'Please try signing in again.',
  },
  {
    test: (msg) => /fetch user info|networkerror|could not reach|network/i.test(msg),
    code: 'network_error',
    step: 'account',
    detail: 'Could not reach Google servers.',
    fix: 'Check your internet connection and try again.',
  },

  // Sheets errors
  {
    test: (msg) => /session has expired|401|unauthorized/i.test(msg),
    code: 'token_expired',
    step: 'sheets',
    detail: 'Your session has expired.',
    fix: 'Click Refresh to re-authenticate.',
  },
  {
    test: (msg) => /access denied|403|permission/i.test(msg),
    code: 'scope_denied',
    step: 'sheets',
    detail: 'Spreadsheet permission was not granted.',
    fix: 'Sign in again and accept all permissions.',
  },
  {
    test: (msg) => /not found|404|deleted/i.test(msg),
    code: 'sheet_lost',
    step: 'sheets',
    detail: 'Cannot access your Folkbase spreadsheet.',
    fix: 'The sheet may have been deleted or unshared. Check Google Drive.',
  },

  // Drive errors
  {
    test: (msg) => /folder/i.test(msg),
    code: 'drive_folder',
    step: 'drive',
    detail: 'Could not create the Folkbase folder.',
    fix: 'Check Drive storage and permissions.',
  },
];

/**
 * Classify a raw Error into a structured connection error.
 * @param {Error|string} error - The error to classify
 * @returns {{ step: string, detail: string, fix: string, code: string }}
 */
export function classifyAuthError(error) {
  const msg = typeof error === 'string' ? error : error?.message || '';

  for (const entry of ERROR_MAP) {
    if (entry.test(msg)) {
      return {
        step: entry.step,
        detail: entry.detail,
        fix: entry.fix,
        code: entry.code,
      };
    }
  }

  return {
    step: 'account',
    detail: 'An unexpected error occurred.',
    fix: 'Please try again.',
    code: 'unknown',
  };
}
