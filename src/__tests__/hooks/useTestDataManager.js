/**
 * useTestDataManager Hook
 *
 * React hook for managing test data lifecycle in development mode.
 * Provides functions to seed, clear, reload test data and get stats.
 *
 * IMPORTANT: Only works when VITE_DEV_MODE=true
 */

import { useState, useCallback } from 'react';
import {
  seedTestData,
  clearTestData,
  reloadTestData,
  clearAllDevData,
  getDevDataStats,
  isTestDataSeeded,
} from '../fixtures/seedTestData';
import { warn } from '../../utils/logger';

/**
 * Hook for managing test data in development mode
 * @returns {Object} Test data management functions and state
 */
export function useTestDataManager() {
  const [stats, setStats] = useState(getDevDataStats());
  const [isDevMode] = useState(import.meta.env.VITE_DEV_MODE === 'true');

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(() => {
    setStats(getDevDataStats());
  }, []);

  /**
   * Seed test data (idempotent)
   */
  const seed = useCallback(() => {
    if (!isDevMode) {
      warn('Not in dev mode');
      return;
    }
    seedTestData();
    refreshStats();
  }, [isDevMode, refreshStats]);

  /**
   * Clear test data only (keeps real contacts)
   */
  const clear = useCallback(() => {
    if (!isDevMode) {
      warn('Not in dev mode');
      return;
    }
    clearTestData();
    refreshStats();
  }, [isDevMode, refreshStats]);

  /**
   * Reload test data (clear and re-seed)
   */
  const reload = useCallback(() => {
    if (!isDevMode) {
      warn('Not in dev mode');
      return;
    }
    reloadTestData();
    refreshStats();
    // Reload page to reflect changes
    window.location.reload();
  }, [isDevMode, refreshStats]);

  /**
   * Clear ALL dev data (use with caution!)
   */
  const clearAll = useCallback(() => {
    if (!isDevMode) {
      warn('Not in dev mode');
      return;
    }
    if (window.confirm('Clear ALL dev data? This cannot be undone.')) {
      clearAllDevData();
      refreshStats();
    }
  }, [isDevMode, refreshStats]);

  return {
    isDevMode,
    stats,
    refreshStats,
    seed,
    clear,
    reload,
    clearAll,
    isSeeded: isTestDataSeeded(),
  };
}
