/**
 * Universal API Usage Logger
 *
 * Tracks usage for any external API (Google Sheets, Google OAuth, third-party APIs, etc.)
 * Stores data in localStorage with smart size management.
 *
 * Features:
 * - Track all outbound HTTP requests
 * - Per-service tracking with configurable quota types
 * - Track successes, errors, rate limits, and retries
 * - Auto-cleanup of old data
 * - Export capabilities
 */

import { log, warn } from './logger.js';

const STORAGE_KEY = 'touchpoint_api_usage';
const MAX_STORAGE_MB = 5;
const RETENTION_DAYS = 30;

/**
 * Initialize the API usage logger
 * Sets up default configuration if not already initialized
 */
export function initializeApiLogger() {
  try {
    const existing = getStoredData();
    if (!existing) {
      const defaultData = {
        services: {},
        settings: {
          enabled: true,
          retentionDays: RETENTION_DAYS,
          maxStorageMB: MAX_STORAGE_MB,
          trackInDevMode: false,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          lastCleanup: new Date().toISOString(),
        },
      };
      saveStoredData(defaultData);
      log('API Logger initialized');
    }
  } catch (error) {
    warn('Failed to initialize API logger:', error.message);
  }
}

/**
 * Register a service with the logger
 * @param {string} serviceId - Unique service identifier (e.g., 'google-sheets')
 * @param {Object} config - Service configuration
 * @param {string} config.name - Display name (e.g., 'Google Sheets API')
 * @param {Array} config.quotas - Array of quota definitions with type, limit, window
 * @param {boolean} [config.enabled=true] - Whether to track this service
 */
export function registerService(serviceId, config) {
  try {
    const data = getStoredData();
    if (!data) return;

    if (!data.services[serviceId]) {
      data.services[serviceId] = {
        id: serviceId,
        name: config.name || serviceId,
        quotas: config.quotas || [],
        enabled: config.enabled !== false,
        calls: [],
        registeredAt: new Date().toISOString(),
      };
      saveStoredData(data);
      log(`Service registered: ${serviceId}`);
    }
  } catch (error) {
    warn(`Failed to register service ${serviceId}:`, error.message);
  }
}

/**
 * Log an API call
 * @param {string} serviceId - Service identifier
 * @param {string} operation - Operation name (e.g., 'readSheetData', 'appendRow')
 * @param {Object} result - Result object
 * @param {boolean} result.success - Whether the call succeeded
 * @param {number} result.statusCode - HTTP status code
 * @param {number} result.duration - Duration in milliseconds
 * @param {string} [result.error] - Error message if failed
 * @param {boolean} [result.isRateLimit] - Whether this was a rate limit error (429)
 * @param {number} [result.retryCount=0] - Number of retries
 */
export function logApiCall(serviceId, operation, result) {
  try {
    // Check if tracking is enabled
    const data = getStoredData();
    if (!data || !data.settings.enabled) return;

    // Skip in dev mode if configured to do so
    if (data.settings.trackInDevMode === false && isDevMode()) {
      return;
    }

    // Ensure service exists
    const service = data.services[serviceId];
    if (!service) {
      warn(`Service not registered: ${serviceId}`);
      return;
    }

    // Create call record
    const callRecord = {
      timestamp: new Date().toISOString(),
      operation,
      success: result.success,
      statusCode: result.statusCode || null,
      duration: result.duration || 0,
      error: result.error || null,
      isRateLimit: result.isRateLimit === true,
      retryCount: result.retryCount || 0,
    };

    // Add to service's calls array
    service.calls.push(callRecord);

    // Keep only recent calls (limit per service)
    const MAX_CALLS_PER_SERVICE = 1000;
    if (service.calls.length > MAX_CALLS_PER_SERVICE) {
      service.calls = service.calls.slice(-MAX_CALLS_PER_SERVICE);
    }

    // Save and check storage
    saveStoredData(data);
    checkAndCleanupStorage(data);
  } catch (error) {
    warn('Failed to log API call:', error.message);
  }
}

/**
 * Get statistics for a service over a time window
 * @param {string} serviceId - Service identifier
 * @param {number} [windowSeconds=100] - Time window in seconds
 * @returns {Object} Statistics object
 */
export function getServiceStats(serviceId, windowSeconds = 100) {
  try {
    const data = getStoredData();
    if (!data) return null;

    const service = data.services[serviceId];
    if (!service) return null;

    const now = new Date();
    const windowMs = windowSeconds * 1000;
    const cutoffTime = new Date(now.getTime() - windowMs);

    // Filter calls within the window
    const recentCalls = service.calls.filter((call) => new Date(call.timestamp) > cutoffTime);

    // Calculate statistics
    return {
      serviceId,
      windowSeconds,
      totalCalls: recentCalls.length,
      successfulCalls: recentCalls.filter((c) => c.success).length,
      failedCalls: recentCalls.filter((c) => !c.success).length,
      rateLimitHits: recentCalls.filter((c) => c.isRateLimit).length,
      averageDuration:
        recentCalls.length > 0
          ? Math.round(recentCalls.reduce((sum, c) => sum + c.duration, 0) / recentCalls.length)
          : 0,
      lastCall: recentCalls[recentCalls.length - 1] || null,
    };
  } catch (error) {
    warn('Failed to get service stats:', error.message);
    return null;
  }
}

/**
 * Get rate limit status for a service
 * Checks all quotas and returns overall status
 * @param {string} serviceId - Service identifier
 * @returns {Object} Rate limit status
 */
export function getRateLimitStatus(serviceId) {
  try {
    const data = getStoredData();
    if (!data) return null;

    const service = data.services[serviceId];
    if (!service) return null;

    const now = new Date();
    const quotaStatuses = [];

    // Check each quota type
    for (const quota of service.quotas) {
      const windowMs = quota.window * 1000;
      const cutoffTime = new Date(now.getTime() - windowMs);

      const calls = service.calls.filter((call) => new Date(call.timestamp) > cutoffTime);

      const percentage = (calls.length / quota.limit) * 100;

      quotaStatuses.push({
        type: quota.type,
        window: quota.window,
        limit: quota.limit,
        calls: calls.length,
        percentage: Math.round(percentage),
        nearLimit: percentage > 85,
        exceeded: calls.length > quota.limit,
      });
    }

    // Determine overall status
    const anyExceeded = quotaStatuses.some((q) => q.exceeded);
    const anyNearLimit = quotaStatuses.some((q) => q.nearLimit);

    return {
      serviceId,
      status: anyExceeded ? 'exceeded' : anyNearLimit ? 'warning' : 'safe',
      quotas: quotaStatuses,
      criticalQuota: quotaStatuses.find((q) => q.exceeded || q.nearLimit),
      allQuotas: quotaStatuses,
    };
  } catch (error) {
    warn('Failed to get rate limit status:', error.message);
    return null;
  }
}

/**
 * Get all tracked services
 * @returns {Array} Array of service objects
 */
export function getAllServices() {
  try {
    const data = getStoredData();
    if (!data) return [];

    return Object.values(data.services || {});
  } catch (error) {
    warn('Failed to get all services:', error.message);
    return [];
  }
}

/**
 * Get summary stats across all services
 * @returns {Object} Summary statistics
 */
export function getAllServiceStats() {
  try {
    const services = getAllServices();
    const stats = {};

    services.forEach((service) => {
      const serviceStats = getServiceStats(service.id);
      if (serviceStats) {
        stats[service.id] = {
          name: service.name,
          ...serviceStats,
        };
      }
    });

    return stats;
  } catch (error) {
    warn('Failed to get all service stats:', error.message);
    return {};
  }
}

/**
 * Get all API calls for a service
 * @param {string} serviceId - Service identifier
 * @param {number} [limit=100] - Maximum number of recent calls to return
 * @returns {Array} Array of call records
 */
export function getServiceCalls(serviceId, limit = 100) {
  try {
    const data = getStoredData();
    if (!data) return [];

    const service = data.services[serviceId];
    if (!service) return [];

    return service.calls.slice(-limit).reverse();
  } catch (error) {
    warn('Failed to get service calls:', error.message);
    return [];
  }
}

/**
 * Export API usage data to JSON
 * @param {string} [startDate] - ISO date string
 * @param {string} [endDate] - ISO date string
 * @returns {Object} Exported data
 */
export function exportData(startDate, endDate) {
  try {
    const data = getStoredData();
    if (!data) return null;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const exportData = {
      exportedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      services: {},
    };

    Object.entries(data.services).forEach(([serviceId, service]) => {
      let calls = service.calls;

      if (start || end) {
        calls = calls.filter((call) => {
          const callTime = new Date(call.timestamp);
          if (start && callTime < start) return false;
          if (end && callTime > end) return false;
          return true;
        });
      }

      exportData.services[serviceId] = {
        name: service.name,
        callsExported: calls.length,
        calls: calls,
      };
    });

    return exportData;
  } catch (error) {
    warn('Failed to export data:', error.message);
    return null;
  }
}

/**
 * Clear all tracked data
 * @param {string} [serviceId] - If provided, only clear data for this service
 */
export function clearData(serviceId) {
  try {
    const data = getStoredData();
    if (!data) return;

    if (serviceId) {
      const service = data.services[serviceId];
      if (service) {
        service.calls = [];
      }
    } else {
      Object.values(data.services).forEach((service) => {
        service.calls = [];
      });
    }

    saveStoredData(data);
    log(`API tracking data cleared${serviceId ? ` for ${serviceId}` : ''}`);
  } catch (error) {
    warn('Failed to clear data:', error.message);
  }
}

/**
 * Disable/enable tracking globally
 * @param {boolean} enabled - Whether to enable tracking
 */
export function setTrackingEnabled(enabled) {
  try {
    const data = getStoredData();
    if (!data) return;

    data.settings.enabled = enabled;
    saveStoredData(data);
    log(`API tracking ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    warn('Failed to set tracking state:', error.message);
  }
}

/**
 * Get logger settings
 * @returns {Object} Current settings
 */
export function getLoggerSettings() {
  try {
    const data = getStoredData();
    if (!data) return null;

    return data.settings;
  } catch (error) {
    warn('Failed to get logger settings:', error.message);
    return null;
  }
}

/**
 * Update logger settings
 * @param {Object} settings - Settings to update
 */
export function updateLoggerSettings(settings) {
  try {
    const data = getStoredData();
    if (!data) return;

    Object.assign(data.settings, settings);
    saveStoredData(data);
    log('API logger settings updated');
  } catch (error) {
    warn('Failed to update logger settings:', error.message);
  }
}

// ============ Internal Helper Functions ============

/**
 * Check if running in dev mode
 */
function isDevMode() {
  return import.meta.env.VITE_DEV_MODE === 'true';
}

/**
 * Get stored data from localStorage
 */
function getStoredData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    warn('Failed to read from localStorage:', error.message);
    return null;
  }
}

/**
 * Save data to localStorage
 */
function saveStoredData(data) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      warn('localStorage quota exceeded, running cleanup');
      // If quota exceeded, run aggressive cleanup
      cleanupOldData(data, 7); // Keep only 7 days
      saveStoredData(data);
    } else {
      warn('Failed to save to localStorage:', error.message);
    }
  }
}

/**
 * Check storage size and cleanup if needed
 */
function checkAndCleanupStorage(data) {
  try {
    const json = JSON.stringify(data);
    const sizeInMB = new Blob([json]).size / (1024 * 1024);

    if (sizeInMB > MAX_STORAGE_MB * 0.8) {
      // If >80% full, cleanup
      cleanupOldData(data, data.settings.retentionDays);
      saveStoredData(data);
    }

    // Also cleanup if last cleanup was more than 24 hours ago
    const lastCleanup = new Date(data.metadata.lastCleanup);
    const now = new Date();
    const hoursSinceCleanup = (now - lastCleanup) / (1000 * 60 * 60);

    if (hoursSinceCleanup > 24) {
      cleanupOldData(data, data.settings.retentionDays);
      data.metadata.lastCleanup = new Date().toISOString();
      saveStoredData(data);
    }
  } catch (error) {
    warn('Failed to check storage:', error.message);
  }
}

/**
 * Remove old data older than specified days
 */
function cleanupOldData(data, daysToKeep) {
  const cutoffTime = new Date();
  cutoffTime.setDate(cutoffTime.getDate() - daysToKeep);

  Object.values(data.services).forEach((service) => {
    const originalCount = service.calls.length;
    service.calls = service.calls.filter((call) => new Date(call.timestamp) > cutoffTime);
    const removedCount = originalCount - service.calls.length;
    if (removedCount > 0) {
      log(`Cleaned up ${removedCount} old calls from ${service.name}`);
    }
  });
}
