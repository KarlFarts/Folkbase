/**
 * Rate Limit Predictor
 *
 * Predicts and prevents rate limit errors by:
 * - Checking if an operation will hit rate limits
 * - Calculating safe delay times between requests
 * - Estimating bulk operation feasibility
 */

import { getRateLimitStatus } from '../utils/apiUsageLogger.js';
import { warn } from '../utils/logger.js';

/**
 * Predict if making a request will exceed rate limits
 * @param {string} serviceId - Service identifier
 * @param {number} [estimatedCalls=1] - Number of calls estimated to make
 * @param {number} [percentageThreshold=95] - Threshold percentage for prediction (0-100)
 * @returns {Object} Prediction result
 */
export function predictRateLimitExceedance(
  serviceId,
  estimatedCalls = 1,
  percentageThreshold = 95
) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) {
      return { willExceed: false, reason: 'Could not determine rate limit status' };
    }

    const predictions = [];

    for (const quota of status.allQuotas) {
      const projectedCalls = quota.calls + estimatedCalls;
      const projectedPercentage = (projectedCalls / quota.limit) * 100;

      const willExceedLimit = projectedCalls > quota.limit;
      const willExceedThreshold = projectedPercentage > percentageThreshold;

      predictions.push({
        type: quota.type,
        window: quota.window,
        currentCalls: quota.calls,
        limit: quota.limit,
        estimatedNewCalls: estimatedCalls,
        projectedCalls,
        projectedPercentage: Math.round(projectedPercentage),
        willExceedLimit,
        willExceedThreshold,
        safeToMake: !willExceedLimit && !willExceedThreshold,
      });
    }

    const wouldExceed = predictions.some((p) => p.willExceedLimit);
    const wouldThreshold = predictions.some((p) => p.willExceedThreshold);

    return {
      serviceId,
      willExceed: wouldExceed,
      willExceedThreshold: wouldThreshold,
      predictions,
      recommendation: generateRecommendation(predictions),
    };
  } catch (error) {
    warn('Failed to predict rate limit exceedance:', error.message);
    return { willExceed: false, reason: 'Could not predict' };
  }
}

/**
 * Calculate recommended delay to safely make a request
 * @param {string} serviceId - Service identifier
 * @param {number} [estimatedCalls=1] - Number of calls estimated to make
 * @returns {Object} Delay recommendation
 */
export function calculateSafeDelay(serviceId, estimatedCalls = 1) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) {
      return { recommendedDelay: 0, reason: 'No rate limit status available' };
    }

    let maxDelayNeeded = 0;
    const delayReasons = [];

    for (const quota of status.allQuotas) {
      if (quota.exceeded) {
        // Already exceeded, need to wait full window
        maxDelayNeeded = Math.max(maxDelayNeeded, quota.window * 1000);
        delayReasons.push(
          `Already exceeded ${quota.type} - wait ${quota.window}s for window reset`
        );
      } else if (quota.calls + estimatedCalls > quota.limit) {
        // Would exceed with new calls, calculate how long to wait
        const excessCalls = quota.calls + estimatedCalls - quota.limit;
        const secondsToWait = quota.window; // Wait full window to be safe
        maxDelayNeeded = Math.max(maxDelayNeeded, secondsToWait * 1000);
        delayReasons.push(
          `Would exceed ${quota.type} by ${excessCalls} calls - wait ${secondsToWait}s`
        );
      }
    }

    return {
      recommendedDelay: maxDelayNeeded,
      delaySeconds: Math.round(maxDelayNeeded / 1000),
      canProceedImmediately: maxDelayNeeded === 0,
      reasons: delayReasons,
    };
  } catch (error) {
    warn('Failed to calculate safe delay:', error.message);
    return { recommendedDelay: 0 };
  }
}

/**
 * Estimate how many calls of a given operation can be made
 * without hitting rate limits
 * @param {string} serviceId - Service identifier
 * @param {string} operation - Operation name
 * @param {number} [callsPerOperation=1] - Number of calls per operation
 * @returns {Object} Feasibility analysis
 */
export function estimateBulkOperationFeasibility(serviceId, operation, callsPerOperation = 1) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) {
      return {
        feasible: true,
        estimatedMaxOperations: Infinity,
        reason: 'Could not determine rate limits',
      };
    }

    // Find the most restrictive quota
    let mostRestrictiveQuota = null;
    let minOperationsPossible = Infinity;

    for (const quota of status.allQuotas) {
      if (quota.exceeded) {
        return {
          feasible: false,
          estimatedMaxOperations: 0,
          mostRestrictiveQuota: quota,
          reason: `Rate limit already exceeded for ${quota.type}`,
          recommendation: `Wait ${quota.window} seconds for window reset`,
        };
      }

      const availableCalls = quota.limit - quota.calls;
      const operationsPossible = Math.floor(availableCalls / callsPerOperation);

      if (operationsPossible < minOperationsPossible) {
        minOperationsPossible = operationsPossible;
        mostRestrictiveQuota = {
          ...quota,
          availableCalls,
          operationsPossible,
        };
      }
    }

    const feasible = minOperationsPossible > 0;

    return {
      serviceId,
      operation,
      feasible,
      estimatedMaxOperations: minOperationsPossible,
      mostRestrictiveQuota,
      callsPerOperation,
      recommendation: feasible
        ? `Can safely make ~${minOperationsPossible} ${operation} operations`
        : `Cannot make ${operation} - would exceed rate limits. Wait for window reset.`,
    };
  } catch (error) {
    warn('Failed to estimate bulk operation feasibility:', error.message);
    return {
      feasible: true,
      estimatedMaxOperations: Infinity,
      reason: 'Could not estimate',
    };
  }
}

/**
 * Analyze if a series of operations can be batched safely
 * @param {string} serviceId - Service identifier
 * @param {Array<Object>} operations - Array of operations: [{operation, estimatedCalls}]
 * @returns {Object} Batching analysis
 */
export function analyzeBatchFeasibility(serviceId, operations) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) {
      return {
        canBatchAll: true,
        recommendation: 'Could not determine rate limits',
      };
    }

    let totalEstimatedCalls = operations.reduce((sum, op) => sum + (op.estimatedCalls || 1), 0);

    const analysis = {
      totalOperations: operations.length,
      totalEstimatedCalls,
      byQuota: [],
      canBatchAll: true,
      partialBatchSize: null,
      recommendation: '',
    };

    for (const quota of status.allQuotas) {
      const availableCalls = quota.limit - quota.calls;
      const canFitAll = totalEstimatedCalls <= availableCalls;

      if (!canFitAll) {
        analysis.canBatchAll = false;
      }

      const operationsFitting = operations.filter((op) => {
        let runningTotal = 0;
        return op.estimatedCalls <= availableCalls - runningTotal;
      }).length;

      analysis.byQuota.push({
        type: quota.type,
        window: quota.window,
        availableCalls,
        canFitAll,
        operationsFitting,
      });
    }

    if (analysis.canBatchAll) {
      analysis.recommendation = 'All operations can be batched safely';
    } else {
      // Calculate how many operations can fit
      let operationsCanFit = operations.length;
      let currentTotal = 0;

      for (let i = 0; i < operations.length; i++) {
        currentTotal += operations[i].estimatedCalls || 1;

        // Check against all quotas
        const fitsAllQuotas = status.allQuotas.every(
          (quota) => currentTotal <= quota.limit - quota.calls
        );

        if (!fitsAllQuotas) {
          operationsCanFit = i;
          break;
        }
      }

      analysis.partialBatchSize = operationsCanFit;
      analysis.recommendation =
        operationsCanFit > 0
          ? `Split batch: ${operationsCanFit}/${operations.length} operations can run now, rest after window reset`
          : 'Cannot batch any operations now - wait for rate limit window reset';
    }

    return analysis;
  } catch (error) {
    warn('Failed to analyze batch feasibility:', error.message);
    return { canBatchAll: true, recommendation: 'Could not analyze' };
  }
}

/**
 * Get detailed rate limit health for a service
 * @param {string} serviceId - Service identifier
 * @returns {Object} Health status
 */
export function getRateLimitHealth(serviceId) {
  try {
    const status = getRateLimitStatus(serviceId);
    if (!status) return { health: 'unknown' };

    const quotaHealths = status.allQuotas.map((quota) => {
      let health = 'healthy';
      let score = 0;

      if (quota.exceeded) {
        health = 'critical';
        score = -1;
      } else if (quota.percentage > 95) {
        health = 'critical';
        score = 0.1;
      } else if (quota.percentage > 85) {
        health = 'warning';
        score = 0.3;
      } else if (quota.percentage > 70) {
        health = 'caution';
        score = 0.5;
      } else {
        health = 'healthy';
        score = 0.8;
      }

      return {
        type: quota.type,
        window: quota.window,
        health,
        score,
        percentage: quota.percentage,
        callsRemaining: Math.max(0, quota.limit - quota.calls),
      };
    });

    // Overall health is the worst of any quota
    const overallHealth = quotaHealths.reduce((worst, current) => {
      const healthOrder = { critical: 0, warning: 1, caution: 2, healthy: 3 };
      return healthOrder[current.health] < healthOrder[worst.health]
        ? current.health
        : worst.health;
    });

    const overallScore = Math.min(...quotaHealths.map((q) => q.score));

    return {
      serviceId,
      health: overallHealth,
      healthScore: overallScore,
      quotaHealths,
      summary:
        overallHealth === 'healthy'
          ? 'API usage is healthy'
          : overallHealth === 'caution'
            ? 'Monitor API usage'
            : overallHealth === 'warning'
              ? 'API usage is high'
              : 'API rate limit exceeded',
    };
  } catch (error) {
    warn(`Failed to get rate limit health for ${serviceId}:`, error.message);
    return { health: 'unknown' };
  }
}

// ============ Helper Functions ============

/**
 * Generate recommendation based on predictions
 */
function generateRecommendation(predictions) {
  const exceeded = predictions.find((p) => p.willExceedLimit);
  const threshold = predictions.find((p) => p.willExceedThreshold);

  if (exceeded) {
    return `Would exceed ${exceeded.type} rate limit. Wait before making request.`;
  }

  if (threshold) {
    return `Would approach ${threshold.type} limit (${threshold.projectedPercentage}%). Consider adding delay between requests.`;
  }

  return 'Safe to proceed with request';
}
