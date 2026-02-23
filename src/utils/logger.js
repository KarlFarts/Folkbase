const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

/**
 * Logger utility for conditional console logging based on dev mode
 *
 * Supports external error reporting services like Sentry.
 * Set errorReporter to integrate with your error tracking service.
 *
 * Usage:
 *   import { log, error, setErrorReporter } from '../utils/logger';
 *
 *   // Configure error reporter (e.g., Sentry)
 *   setErrorReporter((error, context) => {
 *     Sentry.captureException(error, { extra: context });
 *   });
 *
 *   log('Debug info');  // Only logs in dev mode
 *   error('Error!');    // Always logs + sends to error reporter in production
 */

// Error reporter function (can be set externally)
let errorReporter = null;

/**
 * Set an external error reporting function
 * @param {Function} reporter - Function that receives (error, context)
 */
export const setErrorReporter = (reporter) => {
  errorReporter = reporter;
};

/**
 * Conditional console.log that only outputs in dev mode
 * @param {...any} args - Arguments to log
 */
export const log = (...args) => {
  if (isDevMode()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/**
 * Always logs errors regardless of dev mode
 * Also sends to external error reporter in production if configured
 * @param {...any} args - Error arguments to log
 */
export const error = (...args) => {
  console.error(...args);

  // Send to external error reporter in production
  if (!isDevMode() && errorReporter && typeof errorReporter === 'function') {
    try {
      // Extract error object and context from args
      const errorObj = args.find((arg) => arg instanceof Error) || new Error(args.join(' '));
      const context = {
        message: args.filter((arg) => !(arg instanceof Error)).join(' '),
        timestamp: new Date().toISOString(),
      };
      errorReporter(errorObj, context);
    } catch (reporterError) {
      // Failsafe: Don't let error reporter break the app
      console.error('Error reporter failed:', reporterError);
    }
  }
};

/**
 * Conditional console.warn that only outputs in dev mode
 * @param {...any} args - Warning arguments to log
 */
export const warn = (...args) => {
  if (isDevMode()) {
    console.warn(...args);
  }
};

/**
 * Conditional console.info that only outputs in dev mode
 * @param {...any} args - Info arguments to log
 */
export const info = (...args) => {
  if (isDevMode()) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
};
