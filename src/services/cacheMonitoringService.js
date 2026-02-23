/**
 * Cache Monitoring Service
 *
 * Singleton service that tracks cache operations, API calls, and quota usage.
 * Provides real-time statistics for monitoring and debugging.
 */

class CacheMonitoringService {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = [];
    this.cacheOperations = [];
    this.maxHistorySize = 100;
    this.listeners = new Set();
  }

  /**
   * Record a cache hit
   * @param {string} entityType - e.g., 'Contacts', 'Touchpoints'
   * @param {number} age - Cache age in seconds
   */
  recordCacheHit(entityType, age) {
    this.cacheHits++;
    this.cacheOperations.push({
      type: 'hit',
      entityType,
      age,
      timestamp: Date.now(),
    });
    this._pruneHistory();
    this._notifyListeners();
  }

  /**
   * Record a cache miss
   * @param {string} entityType
   * @param {string} reason - 'not-cached', 'expired', 'invalidated'
   */
  recordCacheMiss(entityType, reason) {
    this.cacheMisses++;
    this.cacheOperations.push({
      type: 'miss',
      entityType,
      reason,
      timestamp: Date.now(),
    });
    this._pruneHistory();
    this._notifyListeners();
  }

  /**
   * Record an API call
   * @param {string} operation - 'read', 'write', 'delete'
   * @param {string} entityType
   * @param {number} duration - Call duration in milliseconds
   */
  recordApiCall(operation, entityType, duration) {
    this.apiCalls.push({
      operation,
      entityType,
      duration,
      timestamp: Date.now(),
    });
    this._pruneHistory();
    this._notifyListeners();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) : 0;

    // Group operations by entity type
    const byEntity = {};
    this.cacheOperations.forEach((op) => {
      if (!byEntity[op.entityType]) {
        byEntity[op.entityType] = { hits: 0, misses: 0 };
      }
      if (op.type === 'hit') {
        byEntity[op.entityType].hits++;
      } else {
        byEntity[op.entityType].misses++;
      }
    });

    // Calculate average cache age
    const hitOps = this.cacheOperations.filter((op) => op.type === 'hit' && op.age);
    const avgAge =
      hitOps.length > 0 ? hitOps.reduce((sum, op) => sum + op.age, 0) / hitOps.length : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate: parseFloat(hitRate),
      byEntity,
      avgAge: Math.round(avgAge),
    };
  }

  /**
   * Get API call log
   * @param {number} limit - Max number of calls to return
   * @returns {Array} Recent API calls
   */
  getApiCallLog(limit = 50) {
    return this.apiCalls.slice(-limit).reverse();
  }

  /**
   * Get quota usage statistics
   * @returns {Object} Quota stats
   */
  getQuotaStats() {
    const now = Date.now();
    const last100Seconds = this.apiCalls.filter((call) => now - call.timestamp < 100000);
    const lastHour = this.apiCalls.filter((call) => now - call.timestamp < 3600000);

    return {
      last100Seconds: last100Seconds.length,
      lastHour: lastHour.length,
      quotaLimit100s: 100,
      quotaLimitHour: 1000,
      percentUsed100s: ((last100Seconds.length / 100) * 100).toFixed(1),
      percentUsedHour: ((lastHour.length / 1000) * 100).toFixed(1),
    };
  }

  /**
   * Get recent cache operations
   * @param {number} limit
   * @returns {Array} Recent operations
   */
  getRecentOperations(limit = 20) {
    return this.cacheOperations.slice(-limit).reverse();
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = [];
    this.cacheOperations = [];
    this._notifyListeners();
  }

  /**
   * Subscribe to monitoring updates
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Prune old entries to prevent memory leaks
   * @private
   */
  _pruneHistory() {
    if (this.apiCalls.length > this.maxHistorySize) {
      this.apiCalls = this.apiCalls.slice(-this.maxHistorySize);
    }
    if (this.cacheOperations.length > this.maxHistorySize) {
      this.cacheOperations = this.cacheOperations.slice(-this.maxHistorySize);
    }
  }

  /**
   * Notify all listeners of updates
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }
}

// Singleton instance
const monitoringService = new CacheMonitoringService();

export default monitoringService;
