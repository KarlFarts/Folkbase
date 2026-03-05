/**
 * Error Reporting Integration
 *
 * Provides integration with error tracking services like Sentry.
 * Currently supports Sentry, but can be extended for other services.
 *
 * Setup:
 * 1. Install Sentry: npm install @sentry/react
 * 2. Set VITE_SENTRY_DSN environment variable
 * 3. Call initErrorReporting() in your app startup
 */

/**
 * Initialize error reporting service
 * @param {Object} options - Configuration options
 * @param {string} options.service - Error service to use ('sentry', 'custom')
 * @param {Function} options.customReporter - Custom error reporter function
 * @returns {boolean} True if initialized successfully
 */
export function initErrorReporting(options = {}) {
  const { service = 'sentry', customReporter } = options;

  // Skip error reporting in development mode
  if (import.meta.env.VITE_DEV_MODE === 'true') {
    // eslint-disable-next-line no-console
    console.log('[DEV] Error reporting disabled in development mode');
    return false;
  }

  try {
    if (service === 'sentry') {
      return initSentry();
    } else if (service === 'custom' && customReporter) {
      return initCustomReporter(customReporter);
    } else {
      console.warn(`Unknown error reporting service: ${service}`);
      return false;
    }
  } catch (err) {
    console.error('Failed to initialize error reporting:', err);
    return false;
  }
}

/**
 * Initialize Sentry error reporting
 * @returns {boolean} True if initialized successfully
 */
async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Sentry is optional - skip if DSN not configured
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.log('[INFO] Sentry DSN not configured - error reporting disabled');
    // eslint-disable-next-line no-console
    console.log('   Set VITE_SENTRY_DSN to enable error tracking');
    return false;
  }

  // Check if @sentry/react is installed
  // Use try-catch to handle missing package gracefully
  try {
    // Only try to load Sentry if we're in the browser
    if (typeof window === 'undefined') {
      return false;
    }

    // Try to dynamically import Sentry (string concat defeats Vite's static analysis)
    const sentryModule = '@sentry/' + 'react';
    const Sentry = await import(/* @vite-ignore */ sentryModule).catch(() => null);

    if (!Sentry) {
      console.warn('[WARN] Sentry not installed (optional)');
      console.warn('   To enable error tracking: npm install @sentry/react');
      return false;
    }

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || 'production',
      tracesSampleRate: 0.1,
      ignoreErrors: [
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'NetworkError',
        'Network request failed',
        'ResizeObserver loop limit exceeded',
      ],
      beforeSend(event, _hint) {
        if (import.meta.env.VITE_DEV_MODE === 'true') {
          return null;
        }
        const user = getCurrentUser();
        if (user) {
          event.user = { email: user.email, id: user.uid };
        }
        return event;
      },
    });

    // Set up error logger integration
    const { setErrorReporter } = await import('./logger.js');
    setErrorReporter((error, context) => {
      Sentry.captureException(error, { extra: context });
    });

    // eslint-disable-next-line no-console
    console.log('[INFO] Sentry error reporting initialized');
    return true;
  } catch (err) {
    console.warn('Failed to initialize Sentry:', err.message);
    return false;
  }
}

/**
 * Initialize custom error reporter
 * @param {Function} reporter - Custom reporter function (error, context) => void
 * @returns {boolean} True if initialized successfully
 */
function initCustomReporter(reporter) {
  if (typeof reporter !== 'function') {
    console.error('Custom reporter must be a function');
    return false;
  }

  import('./logger.js').then(({ setErrorReporter }) => {
    setErrorReporter(reporter);
  });

  // eslint-disable-next-line no-console
  console.log('[INFO] Custom error reporter initialized');
  return true;
}

/**
 * Get current user from auth context (helper for Sentry context)
 * @returns {Object|null} Current user object or null
 */
function getCurrentUser() {
  try {
    const authData = sessionStorage.getItem('googleAccessToken');
    if (!authData) return null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Manually capture an error to the reporting service
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
export async function captureError(error, context = {}) {
  console.error('Error captured:', error, context);
}

/**
 * Capture a message (non-error event) to the reporting service
 * @param {string} message - Message to capture
 * @param {string} level - Severity level ('info', 'warning', 'error')
 * @param {Object} context - Additional context
 */
export async function captureMessage(message, level = 'info', context = {}) {
  // eslint-disable-next-line no-console
  console.log(`[${level}] ${message}`, context);
}
