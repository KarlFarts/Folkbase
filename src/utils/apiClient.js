/**
 * Generic API Client Wrapper
 *
 * Wrapper for making calls to third-party APIs with automatic
 * rate limit tracking and intelligent error handling.
 *
 * Usage:
 * const result = await callExternalApi('openstreetmap', 'geocode', async () => {
 *   return axios.get('https://nominatim.openstreetmap.org/search', { params });
 * });
 */

import { logApiCall, getRateLimitStatus } from './apiUsageLogger.js';
import { canMakeRequest } from '../services/apiUsageStats.js';

/**
 * Make an external API call with automatic tracking and rate limiting
 * @param {string} serviceId - Service identifier (e.g., 'openstreetmap')
 * @param {string} operation - Operation name (e.g., 'geocode')
 * @param {Function} apiCallFn - Async function that makes the actual API call
 * @param {Object} [options] - Additional options
 * @param {number} [options.retries=0] - Number of retries on failure
 * @param {number} [options.retryDelay=1000] - Delay between retries in ms
 * @param {boolean} [options.throwOnRateLimit=true] - Throw error if rate limited
 * @returns {Promise} Result from apiCallFn
 * @throws {RateLimitError} If rate limit exceeded (if throwOnRateLimit=true)
 * @throws {ApiError} Other errors from the API call
 */
export async function callExternalApi(serviceId, operation, apiCallFn, options = {}) {
  const { retries = 0, retryDelay = 1000, throwOnRateLimit = true } = options;

  let lastError;
  let retryCount = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let startTime;
    try {
      startTime = Date.now();

      // Check if we can proceed with the call
      const canProceed = canMakeRequest(serviceId, 1);
      if (!canProceed.allowed && throwOnRateLimit) {
        const error = new RateLimitError(
          `Rate limit exceeded for ${serviceId}: ${canProceed.reason}`,
          {
            serviceId,
            quota: canProceed.quota,
            waitTime: canProceed.waitTime,
          }
        );

        // Log as error
        logApiCall(serviceId, operation, {
          success: false,
          statusCode: 429,
          duration: 0,
          error: error.message,
          isRateLimit: true,
          retryCount,
        });

        throw error;
      }

      // Make the actual API call
      const result = await apiCallFn();
      const duration = Date.now() - startTime;

      // Log success
      logApiCall(serviceId, operation, {
        success: true,
        statusCode: result.status || 200,
        duration,
        retryCount,
      });

      return result;
    } catch (error) {
      lastError = error;
      const duration = Date.now() - (startTime || Date.now());

      // Check if this is a rate limit error
      const isRateLimit = error.response?.status === 429 || error instanceof RateLimitError;

      // Log the error
      logApiCall(serviceId, operation, {
        success: false,
        statusCode: error.response?.status || null,
        duration,
        error: error.message,
        isRateLimit,
        retryCount,
      });

      // If rate limited and throwOnRateLimit is false, throw anyway
      if (isRateLimit) {
        if (throwOnRateLimit) {
          throw error;
        }
        // Even with throwOnRateLimit=false, stop retrying on rate limits
        break;
      }

      // If we have retries left, wait and retry
      if (attempt < retries) {
        retryCount++;
        await sleep(retryDelay);
        continue;
      }

      // No more retries, throw the error
      throw error;
    }
  }

  throw lastError;
}

/**
 * Make an API call with automatic retry on 429 rate limit errors
 * @param {string} serviceId - Service identifier
 * @param {string} operation - Operation name
 * @param {Function} apiCallFn - Async function making the API call
 * @param {Object} [options] - Options
 * @param {number} [options.maxRetries=3] - Max retries on rate limit
 * @param {number} [options.baseDelay=1000] - Base delay in ms (exponential backoff)
 * @returns {Promise} Result from apiCallFn
 */
export async function callWithRateLimitRetry(serviceId, operation, apiCallFn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let startTime;
    try {
      startTime = Date.now();
      const result = await apiCallFn();
      const duration = Date.now() - startTime;

      logApiCall(serviceId, operation, {
        success: true,
        statusCode: result.status || 200,
        duration,
        retryCount: attempt,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - (startTime || Date.now());
      const isRateLimit = error.response?.status === 429;

      logApiCall(serviceId, operation, {
        success: false,
        statusCode: error.response?.status || null,
        duration,
        error: error.message,
        isRateLimit,
        retryCount: attempt,
      });

      lastError = error;

      if (!isRateLimit || attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff: baseDelay * 2^attempt
      const delayMs = baseDelay * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Batch multiple API calls with rate limit awareness
 * @param {string} serviceId - Service identifier
 * @param {Array<{operation, fn}>} calls - Array of calls to make
 * @param {Object} [options] - Options
 * @param {number} [options.delayBetweenCalls=0] - Delay between calls in ms
 * @param {boolean} [options.stopOnError=false] - Stop if any call fails
 * @returns {Promise<Array>} Results array
 */
export async function batchApiCalls(serviceId, calls, options = {}) {
  const { delayBetweenCalls = 0, stopOnError = false } = options;

  const results = [];

  for (let i = 0; i < calls.length; i++) {
    const { operation, fn } = calls[i];

    try {
      const result = await callExternalApi(serviceId, operation, fn, {
        throwOnRateLimit: stopOnError,
      });
      results.push({ success: true, data: result });
    } catch (error) {
      results.push({ success: false, error });

      if (stopOnError) {
        throw error;
      }
    }

    // Add delay between calls (except after last call)
    if (i < calls.length - 1 && delayBetweenCalls > 0) {
      await sleep(delayBetweenCalls);
    }
  }

  return results;
}

/**
 * Throttled API call - automatically adds delay if approaching rate limit
 * @param {string} serviceId - Service identifier
 * @param {string} operation - Operation name
 * @param {Function} apiCallFn - Async function making the call
 * @param {Object} [options] - Options
 * @param {number} [options.warningThreshold=85] - Percentage threshold for throttling
 * @returns {Promise} Result from apiCallFn
 */
export async function callWithAutoThrottle(serviceId, operation, apiCallFn, options = {}) {
  const { warningThreshold = 85 } = options;

  // Check current rate limit status
  const status = getRateLimitStatus(serviceId);
  if (!status) {
    return await callExternalApi(serviceId, operation, apiCallFn);
  }

  // Find the most critical quota
  let maxPercentage = 0;
  let delayNeeded = 0;

  for (const quota of status.allQuotas) {
    if (quota.percentage > maxPercentage) {
      maxPercentage = quota.percentage;
    }

    if (quota.percentage > warningThreshold) {
      // Add delay proportional to how close we are to the limit
      const excessPercentage = quota.percentage - warningThreshold;
      const maxExcessPercentage = 100 - warningThreshold;
      const delayFraction = excessPercentage / maxExcessPercentage;
      const maxDelayMs = quota.window * 1000;
      delayNeeded = Math.max(delayNeeded, delayFraction * maxDelayMs);
    }
  }

  // Apply delay if needed
  if (delayNeeded > 0) {
    await sleep(Math.min(delayNeeded, 5000)); // Cap delay at 5 seconds
  }

  return await callExternalApi(serviceId, operation, apiCallFn);
}

/**
 * Check if a service is rate-limited before making a call
 * @param {string} serviceId - Service identifier
 * @returns {Object} Rate limit status
 */
export function checkRateLimit(serviceId) {
  return getRateLimitStatus(serviceId);
}

/**
 * Custom error class for rate limit errors
 *
 * This error is thrown when you've made too many requests to an API.
 * The error includes helpful information for beginners about what happened
 * and how to fix it.
 */
export class RateLimitError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.serviceId = options.serviceId || null;
    this.quota = options.quota || null;
    this.waitTime = options.waitTime || null;

    // Beginner-friendly explanation
    this.friendlyMessage = this._generateFriendlyMessage();
    this.howToFix = this._generateHowToFix();
    this.learnMoreUrl = 'docs/API_INTEGRATION_GUIDE.md#troubleshooting';
  }

  _generateFriendlyMessage() {
    const serviceName = this.serviceId
      ? this.serviceId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'the API';

    return (
      `You've made too many requests to ${serviceName}. ` +
      `Free APIs limit how often you can request data to prevent overuse.`
    );
  }

  _generateHowToFix() {
    const solutions = [];

    if (this.waitTime) {
      const seconds = Math.ceil(this.waitTime / 1000);
      solutions.push(`Wait ${seconds} seconds before trying again`);
    } else {
      solutions.push('Wait a moment before trying again');
    }

    solutions.push('Check the API Dashboard (/settings) to see your usage');
    solutions.push('Consider caching results to reduce API calls');
    solutions.push('Use callWithAutoThrottle() to automatically slow down requests');

    return solutions;
  }

  /**
   * Get a formatted error message suitable for displaying to users
   */
  toUserFriendlyString() {
    const lines = [
      'API Rate Limit Reached',
      '',
      `What happened: ${this.friendlyMessage}`,
      '',
      'How to fix:',
      ...this.howToFix.map((s) => `  • ${s}`),
      '',
      `Learn more: ${this.learnMoreUrl}`,
    ];
    return lines.join('\n');
  }
}

/**
 * Custom error class for API errors
 *
 * This error wraps other API errors with beginner-friendly explanations.
 */
export class ApiError extends Error {
  constructor(message, statusCode, originalError, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.serviceId = options.serviceId || null;
    this.operation = options.operation || null;

    // Beginner-friendly explanation
    this.friendlyMessage = this._generateFriendlyMessage();
    this.howToFix = this._generateHowToFix();
    this.learnMoreUrl = 'docs/API_INTEGRATION_GUIDE.md#troubleshooting';
  }

  _generateFriendlyMessage() {
    const statusMessages = {
      400: "The API didn't understand the request. There might be a problem with the data you sent.",
      401: 'The API key is missing or invalid. You need to authenticate to use this API.',
      403: 'Access denied. Your API key might not have permission for this operation.',
      404: "The requested resource wasn't found. The URL or data you're looking for doesn't exist.",
      500: 'The API server had an internal error. This is usually temporary.',
      502: 'The API server is temporarily unavailable. Try again in a few moments.',
      503: 'The API service is temporarily down for maintenance. Try again later.',
    };

    return (
      statusMessages[this.statusCode] || `The API request failed with status ${this.statusCode}.`
    );
  }

  _generateHowToFix() {
    const solutions = [];

    switch (this.statusCode) {
      case 401:
        solutions.push('Check that your API key is correct in the .env file');
        solutions.push('Make sure the environment variable name matches what the service expects');
        solutions.push('Restart your dev server after adding/changing the API key');
        break;
      case 403:
        solutions.push('Verify your API key has the required permissions');
        solutions.push('Check if you need to enable specific API features in your dashboard');
        break;
      case 404:
        solutions.push('Check the API endpoint URL is correct');
        solutions.push("Verify the data you're requesting exists");
        break;
      case 500:
      case 502:
      case 503:
        solutions.push('Wait a few minutes and try again');
        solutions.push("Check the API provider's status page");
        break;
      default:
        solutions.push('Check the API documentation for this error');
        solutions.push('Verify your request parameters are correct');
    }

    solutions.push('Check the browser console for more details');

    return solutions;
  }

  /**
   * Get a formatted error message suitable for displaying to users
   */
  toUserFriendlyString() {
    const serviceName = this.serviceId
      ? this.serviceId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'API';

    const lines = [
      `${serviceName} Error (${this.statusCode})`,
      '',
      `What happened: ${this.friendlyMessage}`,
      '',
      'How to fix:',
      ...this.howToFix.map((s) => `  • ${s}`),
      '',
      `Learn more: ${this.learnMoreUrl}`,
    ];
    return lines.join('\n');
  }
}

// ============ Helper Functions ============

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
