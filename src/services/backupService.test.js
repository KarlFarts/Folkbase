import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFullBackup,
  restoreFromBackup,
  validateBackup,
  getBackupStats,
} from './backupService';
import * as devModeWrapper from '../utils/devModeWrapper';
import * as sheets from '../utils/sheets';
import { SHEET_NAMES } from '../config/constants';

// Mock the dependencies
vi.mock('../utils/devModeWrapper', async () => {
  const actual = await vi.importActual('../utils/devModeWrapper');
  return {
    ...actual,
    readSheetData: vi.fn(),
    isDevMode: vi.fn(() => false),
  };
});

vi.mock('../utils/sheets', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appendRow: vi.fn(),
  };
});

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFullBackup', () => {
    it('should iterate all tabs from SHEET_NAMES', async () => {
      // Mock readSheetData to return empty data
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['Test Header'],
        data: [],
      });

      const backup = await createFullBackup('token', 'sheetId');

      // Verify it called readSheetData for each sheet name
      expect(devModeWrapper.readSheetData).toHaveBeenCalledTimes(Object.values(SHEET_NAMES).length);
      expect(backup.metadata.totalTabs).toBe(Object.values(SHEET_NAMES).length);
    });

    it('should call progress callbacks with correct structure', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['Test'],
        data: [],
      });

      const progressCallback = vi.fn();
      await createFullBackup('token', 'sheetId', progressCallback);

      // Verify progress callback was called
      expect(progressCallback).toHaveBeenCalled();

      // Check structure of first call
      const firstCall = progressCallback.mock.calls[0][0];
      expect(firstCall).toHaveProperty('phase');
      expect(firstCall).toHaveProperty('total');
      expect(firstCall).toHaveProperty('processed');
      expect(firstCall).toHaveProperty('current');
      expect(firstCall).toHaveProperty('canCancel');
    });

    it('should handle tab read errors gracefully', async () => {
      // Mock some tabs to fail
      devModeWrapper.readSheetData.mockImplementation((token, sheetId, sheetName) => {
        if (sheetName === SHEET_NAMES.CONTACTS) {
          return Promise.reject(new Error('Read failed'));
        }
        return Promise.resolve({ headers: ['Test'], data: [] });
      });

      const backup = await createFullBackup('token', 'sheetId');

      // Should still complete and log error
      expect(backup.tabs[SHEET_NAMES.CONTACTS]).toBeDefined();
      expect(backup.tabs[SHEET_NAMES.CONTACTS].error).toBe('Read failed');
      expect(backup.metadata.errors).toHaveLength(1);
      expect(backup.metadata.errors[0].sheet).toBe(SHEET_NAMES.CONTACTS);
    });

    it('should include correct metadata', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['ID', 'Name'],
        data: [{ ID: '1', Name: 'Test' }],
      });

      const backup = await createFullBackup('token', 'sheetId');

      expect(backup.version).toBeDefined();
      expect(backup.createdAt).toBeDefined();
      expect(backup.createdBy).toBe('Folkbase');
      expect(backup.metadata.totalTabs).toBeGreaterThan(0);
      expect(backup.metadata.totalRecords).toBeGreaterThan(0);
    });

    it('should count total records correctly', async () => {
      devModeWrapper.readSheetData.mockImplementation((token, sheetId, sheetName) => {
        if (sheetName === SHEET_NAMES.CONTACTS) {
          return Promise.resolve({
            headers: ['ID'],
            data: [{ ID: '1' }, { ID: '2' }, { ID: '3' }],
          });
        }
        if (sheetName === SHEET_NAMES.ORGANIZATIONS) {
          return Promise.resolve({
            headers: ['ID'],
            data: [{ ID: '1' }, { ID: '2' }],
          });
        }
        return Promise.resolve({ headers: [], data: [] });
      });

      const backup = await createFullBackup('token', 'sheetId');

      // Should count 3 + 2 = 5 records
      expect(backup.metadata.totalRecords).toBe(5);
    });
  });

  describe('validateBackup', () => {
    it('should detect missing required fields', () => {
      const result = validateBackup(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate backup with missing version', () => {
      const backup = {
        tabs: {},
        metadata: {},
      };

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('version'))).toBe(true);
    });

    it('should validate backup with missing tabs', () => {
      const backup = {
        version: '1.0',
        metadata: {},
      };

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('tabs'))).toBe(true);
    });

    it('should warn about obsolete tabs in backup', () => {
      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: { headers: [], data: [] },
          'Obsolete Tab': { headers: [], data: [] },
        },
        metadata: {},
      };

      const result = validateBackup(backup);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Obsolete Tab'))).toBe(true);
    });

    it('should warn about missing tabs from current schema', () => {
      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: { headers: [], data: [] },
        },
        metadata: {},
      };

      const result = validateBackup(backup);
      // Should warn about missing many tabs
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('missing'))).toBe(true);
    });

    it('should validate correct backup structure', () => {
      const backup = {
        version: '1.0',
        tabs: Object.values(SHEET_NAMES).reduce((acc, name) => {
          acc[name] = { headers: [], data: [] };
          return acc;
        }, {}),
        metadata: {},
      };

      const result = validateBackup(backup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('restoreFromBackup', () => {
    beforeEach(() => {
      sheets.appendRow.mockResolvedValue();
    });

    it('should warn about overwrite mode limitations', async () => {
      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID', 'Name'],
            data: [{ ID: '1', Name: 'Test' }],
            recordCount: 1,
          },
        },
        metadata: {},
      };

      const result = await restoreFromBackup('token', 'sheetId', backup, { mode: 'overwrite' });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Overwrite'))).toBe(true);
    });

    it('should write rows correctly', async () => {
      // Create backup with 5 records
      const data = Array.from({ length: 5 }, (_, i) => ({
        ID: `${i}`,
        Name: `Test ${i}`,
      }));

      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID', 'Name'],
            data,
          },
        },
        metadata: {},
      };

      await restoreFromBackup('token', 'sheetId', backup);

      // Should call appendRow 5 times (once per record)
      expect(sheets.appendRow).toHaveBeenCalledTimes(5);
    });

    it('should skip tabs not in current schema', async () => {
      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID'],
            data: [{ ID: '1' }],
          },
          'Obsolete Tab': {
            headers: ['ID'],
            data: [{ ID: '1' }],
          },
        },
        metadata: {},
      };

      const result = await restoreFromBackup('token', 'sheetId', backup);

      expect(result.warnings.some((w) => w.includes('obsolete'))).toBe(true);
      expect(result.tabsRestored).toBe(1);
    });

    it('should throw error for invalid backup', async () => {
      await expect(restoreFromBackup('token', 'sheetId', null)).rejects.toThrow('Invalid backup');
    });

    it('should return correct results summary', async () => {
      const backup = {
        version: '1.0',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID'],
            data: [{ ID: '1' }, { ID: '2' }],
          },
          [SHEET_NAMES.ORGANIZATIONS]: {
            headers: ['ID'],
            data: [{ ID: '1' }],
          },
        },
        metadata: {},
      };

      const result = await restoreFromBackup('token', 'sheetId', backup);

      expect(result.tabsRestored).toBe(2);
      expect(result.recordsRestored).toBe(3);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('getBackupStats', () => {
    it('should return stats for valid backup', () => {
      const backup = {
        version: '1.0',
        createdAt: '2025-01-01T00:00:00Z',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID'],
            data: [{ ID: '1' }, { ID: '2' }],
            recordCount: 2,
          },
          [SHEET_NAMES.ORGANIZATIONS]: {
            headers: ['ID'],
            data: [{ ID: '1' }],
            recordCount: 1,
          },
        },
        devMode: false,
      };

      const stats = getBackupStats(backup);

      expect(stats.version).toBe('1.0');
      expect(stats.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(stats.totalTabs).toBe(2);
      expect(stats.totalRecords).toBe(3);
      expect(stats.tabCounts[SHEET_NAMES.CONTACTS]).toBe(2);
      expect(stats.tabCounts[SHEET_NAMES.ORGANIZATIONS]).toBe(1);
      expect(stats.devMode).toBe(false);
    });

    it('should handle null backup', () => {
      const stats = getBackupStats(null);

      expect(stats.version).toBe('Unknown');
      expect(stats.totalTabs).toBe(0);
      expect(stats.totalRecords).toBe(0);
    });

    it('should handle backup with missing recordCount', () => {
      const backup = {
        version: '1.0',
        createdAt: '2025-01-01T00:00:00Z',
        tabs: {
          [SHEET_NAMES.CONTACTS]: {
            headers: ['ID'],
            data: [{ ID: '1' }],
            // Missing recordCount
          },
        },
      };

      const stats = getBackupStats(backup);

      expect(stats.totalRecords).toBe(0);
      expect(stats.tabCounts[SHEET_NAMES.CONTACTS]).toBe(0);
    });
  });
});
