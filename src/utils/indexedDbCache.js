/**
 * IndexedDB Caching Layer
 *
 * Provides client-side caching for Google Sheets data with TTL (Time To Live) support.
 * Dramatically reduces API calls and enables offline reads until cache expires.
 *
 * Features:
 * - Automatic TTL-based expiration (different TTLs for high/low churn data)
 * - Per-sheet caching (dynamically creates stores for all SHEET_NAMES)
 * - Graceful degradation (returns null on errors, doesn't crash)
 * - Global enable/disable toggle (CACHE_CONFIG.ENABLED)
 */

import { openDB } from 'idb';
import { SHEET_NAMES, CACHE_CONFIG } from '../config/constants';
import monitoringService from '../services/cacheMonitoringService';

// Database instance (lazy initialized)
let dbPromise = null;

// TTL mapping for different sheet types
const TTL_MAP = {
  [SHEET_NAMES.CONTACTS]: CACHE_CONFIG.HIGH_CHURN_TTL,
  [SHEET_NAMES.TOUCHPOINTS]: CACHE_CONFIG.HIGH_CHURN_TTL,
  [SHEET_NAMES.EVENTS]: CACHE_CONFIG.HIGH_CHURN_TTL,
  [SHEET_NAMES.TASKS]: CACHE_CONFIG.HIGH_CHURN_TTL,
  [SHEET_NAMES.NOTES]: CACHE_CONFIG.HIGH_CHURN_TTL,
  [SHEET_NAMES.LISTS]: CACHE_CONFIG.LOW_CHURN_TTL,
  [SHEET_NAMES.IMPORT_SETTINGS]: CACHE_CONFIG.LOW_CHURN_TTL,
  [SHEET_NAMES.IMPORT_HISTORY]: CACHE_CONFIG.LOW_CHURN_TTL,
  default: CACHE_CONFIG.DEFAULT_TTL,
};

/**
 * Initialize IndexedDB database
 * Creates object stores for each sheet name and a meta store for timestamps
 *
 * @returns {Promise<IDBDatabase>} Database instance
 */
export async function initializeCache() {
  if (!CACHE_CONFIG.ENABLED) {
    return null;
  }

  if (dbPromise) {
    return dbPromise;
  }

  try {
    dbPromise = openDB('FolkbaseCache', 1, {
      upgrade(db) {
        // Create object store for each sheet name
        Object.values(SHEET_NAMES).forEach((sheetName) => {
          if (!db.objectStoreNames.contains(sheetName)) {
            db.createObjectStore(sheetName);
          }
        });

        // Create sync metadata store
        if (!db.objectStoreNames.contains('_syncMeta')) {
          db.createObjectStore('_syncMeta');
        }
      },
    }).catch((error) => {
      console.error('[IndexedDB] Failed to initialize cache:', error);
      dbPromise = null;
      return null;
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to initialize cache:', error);
    dbPromise = null;
    return null;
  }

  return dbPromise;
}

/**
 * Get TTL for a specific sheet
 * Checks localStorage for custom overrides first
 *
 * @param {string} sheetName - Sheet name
 * @returns {number} TTL in seconds
 */
function getTTL(sheetName) {
  // Check localStorage for custom config
  try {
    const saved = localStorage.getItem('touchpoint_cache_config');
    if (saved) {
      const config = JSON.parse(saved);

      // Check for custom TTL for this specific sheet
      if (config.customTTLs && config.customTTLs[sheetName]) {
        return config.customTTLs[sheetName];
      }

      // Apply preset multiplier
      if (config.preset) {
        const presetMultipliers = {
          'real-time': 0.5,
          balanced: 1.0,
          performance: 3.0,
        };
        const multiplier = presetMultipliers[config.preset] || 1.0;
        const baseTTL = TTL_MAP[sheetName] || TTL_MAP.default;
        return Math.round(baseTTL * multiplier);
      }
    }
  } catch (error) {
    console.warn('[Cache] Failed to read custom TTL config:', error);
  }

  // Fall back to default TTL
  return TTL_MAP[sheetName] || TTL_MAP.default;
}

/**
 * Get cached data for a sheet
 * Returns null if cache is stale or missing
 *
 * @param {string} sheetName - Sheet name
 * @returns {Promise<Object|null>} Cached data or null
 */
export async function getCachedData(sheetName) {
  if (!CACHE_CONFIG.ENABLED) {
    return null;
  }

  try {
    const db = await initializeCache();
    if (!db) {
      monitoringService.recordCacheMiss(sheetName, 'not-cached');
      return null;
    }

    // Get cached data
    const data = await db.get(sheetName, 'data');
    if (!data) {
      // Cache miss - no data found
      monitoringService.recordCacheMiss(sheetName, 'not-cached');
      return null;
    }

    // Get sync metadata
    const meta = await db.get('_syncMeta', sheetName);
    if (!meta || !meta.timestamp) {
      // Cache miss - no metadata found
      monitoringService.recordCacheMiss(sheetName, 'not-cached');
      return null;
    }

    // Check TTL
    const ttl = getTTL(sheetName);
    const age = (Date.now() - meta.timestamp) / 1000; // Convert to seconds

    if (age > ttl) {
      // Cache miss - expired
      monitoringService.recordCacheMiss(sheetName, 'expired');
      return null;
    }

    // Cache hit - returning cached data
    monitoringService.recordCacheHit(sheetName, age);
    return data;
  } catch (error) {
    console.warn('[IndexedDB] Failed to get cached data:', error);
    monitoringService.recordCacheMiss(sheetName, 'error');
    return null;
  }
}

/**
 * Set cached data for a sheet
 *
 * @param {string} sheetName - Sheet name
 * @param {Object} data - Data to cache (should have { headers, data })
 * @returns {Promise<void>}
 */
export async function setCachedData(sheetName, data) {
  if (!CACHE_CONFIG.ENABLED) {
    return;
  }

  try {
    const db = await initializeCache();
    if (!db) return;

    // Store data
    await db.put(sheetName, data, 'data');

    // Store sync metadata
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);

    // Data cached successfully
  } catch (error) {
    console.warn('[IndexedDB] Failed to set cached data:', error);
  }
}

/**
 * Clear cached data for a sheet (or all sheets)
 *
 * @param {string} [sheetName] - Sheet name (optional, clears all if omitted)
 * @returns {Promise<void>}
 */
export async function clearCache(sheetName = null) {
  if (!CACHE_CONFIG.ENABLED) {
    return;
  }

  try {
    const db = await initializeCache();
    if (!db) return;

    if (sheetName) {
      // Clear specific sheet
      await db.delete(sheetName, 'data');
      await db.delete('_syncMeta', sheetName);
      // Cache cleared for specific sheet
    } else {
      // Clear all sheets
      const sheetNames = Object.values(SHEET_NAMES);
      for (const name of sheetNames) {
        await db.delete(name, 'data');
        await db.delete('_syncMeta', name);
      }
      // All cache sheets cleared
    }
  } catch (error) {
    console.warn('[IndexedDB] Failed to clear cache:', error);
  }
}

/**
 * Check if cached data is valid (exists and not expired)
 *
 * @param {string} sheetName - Sheet name
 * @returns {Promise<boolean>} True if cache is valid
 */
export async function isCacheValid(sheetName) {
  const data = await getCachedData(sheetName);
  return data !== null;
}

/**
 * Invalidate cache for a sheet (alias for clearCache with single sheet)
 *
 * @param {string} sheetName - Sheet name
 * @returns {Promise<void>}
 */
export async function invalidateCache(sheetName) {
  await clearCache(sheetName);
}

/**
 * Invalidate all caches (clears all sheets)
 *
 * @returns {Promise<void>}
 */
export async function invalidateAllCaches() {
  await clearCache();
}

/**
 * Append a new row to cached data for a sheet (optimistic update).
 * If no cache exists for the sheet, does nothing (next read will fetch fresh).
 *
 * @param {string} sheetName - Sheet name
 * @param {Object} newRow - Row object with field names as keys
 * @returns {Promise<void>}
 */
export async function appendToCachedData(sheetName, newRow) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    data.data.push(newRow);
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to append to cache:', error);
  }
}

/**
 * Update a row in cached data by matching an ID field (optimistic update).
 * If no cache exists or no matching row found, does nothing.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} idField - The field name to match on (e.g., 'Contact ID')
 * @param {string} idValue - The ID value to find
 * @param {Object} updatedFields - Fields to merge into the existing row
 * @returns {Promise<void>}
 */
export async function updateCachedRow(sheetName, idField, idValue, updatedFields) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    const rowIndex = data.data.findIndex((row) => row[idField] === idValue);
    if (rowIndex === -1) return;

    data.data[rowIndex] = { ...data.data[rowIndex], ...updatedFields };
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to update cached row:', error);
  }
}

/**
 * Delete a row from cached data by matching an ID field (optimistic update).
 * If no cache exists or no matching row found, does nothing.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} idField - The field name to match on (e.g., 'Contact ID')
 * @param {string} idValue - The ID value to find
 * @returns {Promise<void>}
 */
export async function deleteCachedRow(sheetName, idField, idValue) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    data.data = data.data.filter((row) => row[idField] !== idValue);
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to delete cached row:', error);
  }
}
