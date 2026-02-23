/**
 * API Usage Statistics Service
 *
 * Provides aggregated statistics and analysis for API usage tracking.
 * Calculates rates, trends, and generates reports.
 */

import {
  getServiceStats,
  getRateLimitStatus,
  getAllServices,
  getServiceCalls,
} from '../utils/apiUsageLogger.js';
import { warn } from '../utils/logger.js';

/**
 * Get real-time statistics for a specific service
 * Shows usage in different time windows
 * @param {string} serviceId - Service identifier
 * @returns {Object} Real-time statistics
 */
export function getRealtimeStats(serviceId) {
  try {
    const service = getAllServices().find((s) => s.id === serviceId);
    if (!service) return null;

    const stats = {};

    // Get stats for each quota window
    for (const quota of service.quotas) {
      const key = `${quota.window}seconds`;
      const stat = getServiceStats(serviceId, quota.window);

      if (stat) {
        stats[key] = {
          calls: stat.totalCalls,
          limit: quota.limit,
          percentage: (stat.totalCalls / quota.limit) * 100,
          window: quota.window,
          type: quota.type,
        };
      }
    }

    // Also get hourly and daily stats
    stats.lastHour = getServiceStats(serviceId, 3600);
    stats.lastDay = getServiceStats(serviceId, 86400);

    return {
      serviceId,
      service: service.name,
      timestamp: new Date().toISOString(),
      windows: stats,
    };
  } catch (error) {
    warn(`Failed to get realtime stats for ${serviceId}:`, error.message);
    return null;
  }
}

/**
 * Get rate limit warnings for a service
 * Checks all quotas and generates warnings if approaching limits
 * @param {string} serviceId - Service identifier
 * @param {number} [warningThreshold=85] - Percentage threshold for warnings
 * @returns {Object} Warning information
 */
export function getRateLimitWarnings(serviceId, warningThreshold = 85) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) return null;

    const warnings = [];
    const recommendations = [];

    for (const quota of status.allQuotas) {
      if (quota.exceeded) {
        warnings.push(`CRITICAL: Exceeded ${quota.type} quota (${quota.calls}/${quota.limit})`);
        recommendations.push('Wait for rate limit window to reset before making more requests');
      } else if (quota.percentage >= warningThreshold) {
        warnings.push(
          `Approaching ${quota.type} limit: ${quota.calls} of ${quota.limit} calls (${quota.percentage}%)`
        );
        recommendations.push(`Add delays between requests or batch operations more efficiently`);
      }
    }

    // Determine status
    let overallStatus = 'safe';
    if (warnings.some((w) => w.startsWith('CRITICAL'))) {
      overallStatus = 'critical';
    } else if (warnings.length > 0) {
      overallStatus = 'warning';
    }

    return {
      serviceId,
      status: overallStatus,
      warningCount: warnings.length,
      warnings,
      recommendations,
      nextResetTime: calculateNextResetTime(status.criticalQuota),
    };
  } catch (error) {
    warn(`Failed to get warnings for ${serviceId}:`, error.message);
    return null;
  }
}

/**
 * Get comparison of all tracked services
 * Shows high-level stats across all services
 * @returns {Object} Comparison data
 */
export function getServiceComparison() {
  try {
    const services = getAllServices();
    const comparison = {};

    services.forEach((service) => {
      const stats = getServiceStats(service.id, 3600);
      const status = getRateLimitStatus(service.id);

      comparison[service.id] = {
        name: service.name,
        callsLastHour: stats?.totalCalls || 0,
        errorsLastHour: stats?.failedCalls || 0,
        rateLimitHits: stats?.rateLimitHits || 0,
        avgDuration: stats?.averageDuration || 0,
        currentStatus: status?.status || 'unknown',
      };
    });

    return {
      timestamp: new Date().toISOString(),
      services: comparison,
    };
  } catch (error) {
    warn('Failed to get service comparison:', error.message);
    return {};
  }
}

/**
 * Get detailed error analysis for a service
 * Categorizes and summarizes all errors
 * @param {string} serviceId - Service identifier
 * @param {number} [hoursToAnalyze=24] - How far back to look
 * @returns {Object} Error analysis
 */
export function getErrorAnalysis(serviceId, hoursToAnalyze = 24) {
  try {
    const calls = getServiceCalls(serviceId, 10000);
    if (!calls) return null;

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursToAnalyze);

    const recentCalls = calls.filter((call) => new Date(call.timestamp) > cutoffTime);

    const analysis = {
      totalCalls: recentCalls.length,
      totalErrors: 0,
      byType: {
        rateLimitHits: 0,
        networkErrors: 0,
        authErrors: 0,
        serverErrors: 0,
        otherErrors: 0,
      },
      errorsByOperation: {},
      lastError: null,
    };

    recentCalls.forEach((call) => {
      if (!call.success) {
        analysis.totalErrors++;

        if (call.isRateLimit) {
          analysis.byType.rateLimitHits++;
        } else if (!call.statusCode) {
          analysis.byType.networkErrors++;
        } else if (call.statusCode === 401 || call.statusCode === 403) {
          analysis.byType.authErrors++;
        } else if (call.statusCode >= 500) {
          analysis.byType.serverErrors++;
        } else {
          analysis.byType.otherErrors++;
        }

        // Track by operation
        if (!analysis.errorsByOperation[call.operation]) {
          analysis.errorsByOperation[call.operation] = 0;
        }
        analysis.errorsByOperation[call.operation]++;

        // Store last error
        if (
          !analysis.lastError ||
          new Date(call.timestamp) > new Date(analysis.lastError.timestamp)
        ) {
          analysis.lastError = call;
        }
      }
    });

    analysis.errorRate =
      analysis.totalCalls > 0 ? ((analysis.totalErrors / analysis.totalCalls) * 100).toFixed(2) : 0;

    return analysis;
  } catch (error) {
    warn(`Failed to analyze errors for ${serviceId}:`, error.message);
    return null;
  }
}

/**
 * Get usage trend over time
 * Calculates calls per hour for the last N hours
 * @param {string} serviceId - Service identifier
 * @param {number} [hours=24] - How many hours of history to analyze
 * @returns {Array} Array of hourly usage points
 */
export function getUsageTrend(serviceId, hours = 24) {
  try {
    const calls = getServiceCalls(serviceId, 10000);
    if (!calls) return [];

    const trend = [];
    const now = new Date();

    // Create hourly buckets
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(hourStart.getHours() - i);
      hourStart.setMinutes(0, 0, 0);

      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      const callsInHour = calls.filter((call) => {
        const callTime = new Date(call.timestamp);
        return callTime >= hourStart && callTime < hourEnd;
      });

      const successfulCalls = callsInHour.filter((c) => c.success).length;
      const failedCalls = callsInHour.filter((c) => !c.success).length;

      trend.push({
        timestamp: hourStart.toISOString(),
        total: callsInHour.length,
        successful: successfulCalls,
        failed: failedCalls,
        avgDuration:
          callsInHour.length > 0
            ? Math.round(callsInHour.reduce((sum, c) => sum + c.duration, 0) / callsInHour.length)
            : 0,
      });
    }

    return trend;
  } catch (error) {
    warn(`Failed to get usage trend for ${serviceId}:`, error.message);
    return [];
  }
}

/**
 * Get operation breakdown for a service
 * Shows which operations are called most frequently
 * @param {string} serviceId - Service identifier
 * @param {number} [hours=24] - Time period to analyze
 * @returns {Array} Array of operations with call counts
 */
export function getOperationBreakdown(serviceId, hours = 24) {
  try {
    const calls = getServiceCalls(serviceId, 10000);
    if (!calls) return [];

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const recentCalls = calls.filter((call) => new Date(call.timestamp) > cutoffTime);

    const operationMap = {};

    recentCalls.forEach((call) => {
      if (!operationMap[call.operation]) {
        operationMap[call.operation] = {
          operation: call.operation,
          total: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0,
          totalDuration: 0,
        };
      }

      operationMap[call.operation].total++;
      if (call.success) {
        operationMap[call.operation].successful++;
      } else {
        operationMap[call.operation].failed++;
      }
      operationMap[call.operation].totalDuration += call.duration;
    });

    // Calculate averages
    const operations = Object.values(operationMap).map((op) => ({
      ...op,
      avgDuration: op.total > 0 ? Math.round(op.totalDuration / op.total) : 0,
      errorRate: op.total > 0 ? ((op.failed / op.total) * 100).toFixed(2) : 0,
    }));

    // Sort by call count
    return operations.sort((a, b) => b.total - a.total);
  } catch (error) {
    warn(`Failed to get operation breakdown for ${serviceId}:`, error.message);
    return [];
  }
}

/**
 * Generate comprehensive usage report
 * @param {string} [startDate] - ISO date string
 * @param {string} [endDate] - ISO date string
 * @returns {Object} Comprehensive report
 */
export function generateUsageReport(startDate, endDate) {
  try {
    const services = getAllServices();
    const report = {
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      services: {},
      summary: {
        totalServices: services.length,
        totalCalls: 0,
        totalErrors: 0,
        totalRateLimitHits: 0,
      },
    };

    services.forEach((service) => {
      const stats = getRealtimeStats(service.id);
      const errors = getErrorAnalysis(service.id, 720); // 30 days
      const warnings = getRateLimitWarnings(service.id);

      const serviceReport = {
        id: service.id,
        name: service.name,
        stats,
        errorAnalysis: errors,
        warnings,
      };

      report.services[service.id] = serviceReport;

      // Update summary
      if (stats && stats.windows.lastDay) {
        report.summary.totalCalls += stats.windows.lastDay.totalCalls;
      }
      if (errors) {
        report.summary.totalErrors += errors.totalErrors;
        report.summary.totalRateLimitHits += errors.byType.rateLimitHits;
      }
    });

    return report;
  } catch (error) {
    warn('Failed to generate usage report:', error.message);
    return null;
  }
}

/**
 * Check if a service can make a request without hitting rate limits
 * @param {string} serviceId - Service identifier
 * @param {number} [estimatedCalls=1] - Estimated calls to make
 * @returns {Object} Permission result
 */
export function canMakeRequest(serviceId, estimatedCalls = 1) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) return { allowed: true }; // If we can't check, assume allowed

    for (const quota of status.allQuotas) {
      const projectedCalls = quota.calls + estimatedCalls;

      if (projectedCalls > quota.limit) {
        return {
          allowed: false,
          reason: `Would exceed ${quota.type} limit`,
          quota: quota.type,
          current: quota.calls,
          limit: quota.limit,
          waitTime: calculateWaitTime(quota),
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    warn(`Failed to check request permission for ${serviceId}:`, error.message);
    return { allowed: true }; // Default to allowing if check fails
  }
}

// ============ Helper Functions ============

/**
 * Calculate when the rate limit window will reset
 */
function calculateNextResetTime(quota) {
  if (!quota) return null;

  const now = new Date();
  const windowMs = quota.window * 1000;

  // Find the oldest call in this window
  // Reset happens when oldest call falls out of window
  return new Date(now.getTime() + windowMs).toISOString();
}

/**
 * Calculate how long to wait before making next request
 */
function calculateWaitTime(quota) {
  if (!quota) return 0;

  // Wait time = window duration (to let oldest calls expire)
  return quota.window * 1000;
}
