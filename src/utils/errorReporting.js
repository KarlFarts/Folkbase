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

import { error as logError } from './logger.js';

/**
 * Initialize error reporting service
 * @param {Object} options - Configuration options
 * @param {string} options.service - Error service to use ('sentry', 'custom')
 * @param {Function} options.customReporter - Custom error reporter function
 */
export function initErrorReporting(options = {}) {
  const { service = 'sentry', customReporter } = options;

  // Skip error reporting in development mode
  if (import.meta.env.VITE_DEV_MODE === 'true') {
    return;
  }

  if (service === 'sentry') {
    initSentry().catch((err) => {
      console.error('Failed to initialize error reporting:', err);
    });
  } else if (service === 'custom' && customReporter) {
    initCustomReporter(customReporter);
  } else {
    console.warn(`Unknown error reporting service: ${service}`);
  }
}

/**
 * Initialize Sentry error reporting
 */
async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Sentry is optional - skip if DSN not configured
  if (!dsn) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Try to dynamically import Sentry (string concat defeats Vite's static analysis)
    const sentryModule = '@sentry/' + 'react';
    const Sentry = await import(/* @vite-ignore */ sentryModule).catch(() => null);

    if (!Sentry) {
      return;
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
        return event;
      },
    });

    // Wire Sentry into the logger's error reporter so all logger.error() calls
    // are forwarded to Sentry automatically.
    const { setErrorReporter } = await import('./logger.js');
    setErrorReporter((error, context) => {
      Sentry.captureException(error, { extra: context });
    });
  } catch (err) {
    console.warn('Failed to initialize Sentry:', err.message);
  }
}

/**
 * Initialize custom error reporter
 * @param {Function} reporter - Custom reporter function (error, context) => void
 */
function initCustomReporter(reporter) {
  if (typeof reporter !== 'function') {
    console.error('Custom reporter must be a function');
    return;
  }

  import('./logger.js').then(({ setErrorReporter }) => {
    setErrorReporter(reporter);
  });
}

/**
 * Capture an error to the configured reporting service (Sentry, custom, or console).
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
export function captureError(error, context = {}) {
  logError(error, context);
}
