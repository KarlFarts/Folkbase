import { SCHEMA_VERSION, SHEET_NAMES } from '../config/constants';
import { getSchemaVersion, setSchemaVersion, autoExpandHeaders } from '../utils/sheetCreation';
import { migrateContactNames, migrateContactMethods } from './contactMigrationService';

/**
 * Migration orchestrator - safely upgrades sheets from old schema to new
 *
 * DESIGN PRINCIPLES:
 * - Idempotent: Running twice is safe
 * - Resumable: Can be interrupted and restarted
 * - Progressive: Each step is independent
 * - Transparent: User sees what's happening
 */

export const migrateSheet = async (accessToken, sheetId, progressCallback) => {
  try {
    // Step 1: Check current version
    progressCallback?.({ step: 'checking', message: 'Checking schema version...', percent: 0 });

    const currentVersion = await getSchemaVersion(accessToken, sheetId);

    if (currentVersion >= SCHEMA_VERSION) {
      progressCallback?.({
        step: 'complete',
        message: 'Schema already up to date!',
        percent: 100,
      });
      return { success: true, upgraded: false, fromVersion: currentVersion };
    }

    // Step 2: Create missing tabs (if any)
    progressCallback?.({
      step: 'tabs',
      message: 'Checking for missing tabs...',
      percent: 20,
    });

    // Future phases will add tab creation logic here

    // Step 3: Expand headers on all existing tabs
    progressCallback?.({
      step: 'headers',
      message: 'Expanding column headers...',
      percent: 40,
    });

    const tabsToExpand = [
      SHEET_NAMES.CONTACTS,
      SHEET_NAMES.EVENTS,
      SHEET_NAMES.ORGANIZATIONS,
      SHEET_NAMES.TASKS,
      // Phase A junction tabs
      SHEET_NAMES.CONTACT_SOCIALS,
      SHEET_NAMES.CONTACT_EDUCATION,
      SHEET_NAMES.CONTACT_EMPLOYMENT,
      SHEET_NAMES.CONTACT_DISTRICTS,
      // Add Phase B/C/D junction tabs here
    ];

    let totalAdded = 0;
    for (let i = 0; i < tabsToExpand.length; i++) {
      const tabName = tabsToExpand[i];
      const percent = 40 + (i / tabsToExpand.length) * 40; // 40-80%

      progressCallback?.({
        step: 'headers',
        message: `Expanding ${tabName}...`,
        percent,
      });

      const result = await autoExpandHeaders(accessToken, sheetId, tabName);

      if (result.success && result.addedColumns && result.addedColumns.length > 0) {
        totalAdded += result.addedColumns.length;
      }
    }

    // Step 4: Run data migrations (Phase A specific - name splitting, etc.)
    progressCallback?.({
      step: 'data',
      message: 'Migrating contact names...',
      percent: 85,
    });

    if (currentVersion < 2) {
      // Phase A migrations
      await migrateContactNames(accessToken, sheetId, 'system', progressCallback);

      progressCallback?.({
        step: 'data',
        message: 'Typing contact methods...',
        percent: 90,
      });

      await migrateContactMethods(accessToken, sheetId, 'system');
    }

    // Step 5: Update schema version
    progressCallback?.({
      step: 'finalizing',
      message: 'Finalizing migration...',
      percent: 95,
    });

    await setSchemaVersion(accessToken, sheetId, SCHEMA_VERSION);

    progressCallback?.({
      step: 'complete',
      message: `Migration complete! Added ${totalAdded} columns.`,
      percent: 100,
    });

    return {
      success: true,
      upgraded: true,
      fromVersion: currentVersion,
      toVersion: SCHEMA_VERSION,
      columnsAdded: totalAdded,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Check if migration is needed
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @returns {Promise<boolean>} True if migration needed
 */
export const needsMigration = async (accessToken, sheetId) => {
  const currentVersion = await getSchemaVersion(accessToken, sheetId);
  return currentVersion < SCHEMA_VERSION;
};
