/**
 * useCalendarSync Hook
 *
 * Handles automatic background calendar sync at regular intervals.
 * Reads settings from localStorage and runs syncEvents() on the configured interval.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { syncEvents } from '../utils/syncEngine';

function readCalendarSettings() {
  try {
    const stored = localStorage.getItem('touchpoint_calendar_settings');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function useCalendarSync() {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const syncingRef = useRef(false);
  const intervalRef = useRef(null);
  const [settings, setSettings] = useState(readCalendarSettings);

  // Re-read settings periodically and on storage changes
  const refreshSettings = useCallback(() => {
    const newSettings = readCalendarSettings();
    setSettings((prev) => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(newSettings);
      return prevStr === newStr ? prev : newSettings;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('storage', refreshSettings);
    // Poll every 10s for same-tab changes (localStorage events only fire cross-tab)
    const poll = setInterval(refreshSettings, 10000);
    return () => {
      window.removeEventListener('storage', refreshSettings);
      clearInterval(poll);
    };
  }, [refreshSettings]);

  useEffect(() => {

    // Perform sync
    const performSync = async () => {
      // Skip if already syncing (mutex)
      if (syncingRef.current) {
        return;
      }

      // Skip if not properly configured
      if (!accessToken || !sheetId) {
        return;
      }

      syncingRef.current = true;

      try {
        const result = await syncEvents(accessToken, sheetId);

        // Only show toast if there were actual changes or errors
        const hasChanges =
          result.pushed.length > 0 ||
          result.pulled.length > 0 ||
          result.conflicts.length > 0 ||
          result.errors.length > 0;

        if (hasChanges) {
          const messages = [];
          if (result.pushed.length > 0) {
            messages.push(`Pushed ${result.pushed.length}`);
          }
          if (result.pulled.length > 0) {
            messages.push(`Pulled ${result.pulled.length}`);
          }
          if (result.conflicts.length > 0) {
            messages.push(`${result.conflicts.length} conflicts`);
          }
          if (result.errors.length > 0) {
            messages.push(`${result.errors.length} errors`);
          }

          const summary = messages.join(', ');
          notify(`Auto-sync: ${summary}`, result.errors.length > 0 ? 'warning' : 'success');
        }

        // Update sync status in localStorage
        const newStatus = {
          lastSyncedAt: new Date().toISOString(),
          lastPushed: result.pushed.length,
          lastPulled: result.pulled.length,
          syncing: false,
        };
        localStorage.setItem('touchpoint_calendar_sync_status', JSON.stringify(newStatus));
      } catch (error) {
        console.error('Auto-sync failed:', error);
        // Don't show error toast for auto-sync failures to avoid annoying users
        // Just log it silently
      } finally {
        syncingRef.current = false;
      }
    };

    // Set up interval based on settings
    if (settings?.enabled && settings?.autoSync && accessToken && sheetId) {
      // Convert interval from minutes to milliseconds
      const intervalMs = (settings.autoSyncInterval || 30) * 60 * 1000;

      // Run initial sync after a short delay
      const initialTimeout = setTimeout(() => {
        performSync();
      }, 5000); // 5 second delay on mount

      // Set up recurring interval
      intervalRef.current = setInterval(() => {
        performSync();
      }, intervalMs);

      // Cleanup on unmount or dependency change
      return () => {
        clearTimeout(initialTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Clean up interval if auto-sync is disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [accessToken, sheetId, notify, settings]);

  return null; // This hook doesn't return anything, it just runs in the background
}
