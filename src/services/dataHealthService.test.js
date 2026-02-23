import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDataHealth, calculateStorageEstimate, checkDataIntegrity } from './dataHealthService';
import * as devModeWrapper from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';

// Mock the dependencies
vi.mock('../utils/devModeWrapper', async () => {
  const actual = await vi.importActual('../utils/devModeWrapper');
  return {
    ...actual,
    readSheetData: vi.fn(),
  };
});

vi.mock('./apiUsageStats', () => ({
  getRealtimeStats: vi.fn(() => ({
    serviceId: 'GOOGLE_SHEETS',
    service: 'Google Sheets API',
    timestamp: '2025-01-01T00:00:00Z',
    windows: {
      '100seconds': {
        calls: 10,
        limit: 100,
        percentage: 10,
        window: 100,
        type: 'per_user',
      },
    },
  })),
}));

describe('dataHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateStorageEstimate', () => {
    it('should calculate cells used correctly', () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 100,
        [SHEET_NAMES.ORGANIZATIONS]: 50,
        [SHEET_NAMES.LOCATIONS]: 25,
      };

      const estimate = calculateStorageEstimate(entityCounts);

      // (100 + 1) * 20 + (50 + 1) * 20 + (25 + 1) * 20 = 2020 + 1020 + 520 = 3560
      expect(estimate.cellsUsed).toBe(3560);
      expect(estimate.cellLimit).toBe(10000000);
      expect(estimate.percentage).toBeLessThan(1);
      expect(estimate.estimatedRowsRemaining).toBeGreaterThan(0);
    });

    it('should handle empty entityCounts', () => {
      const estimate = calculateStorageEstimate({});

      expect(estimate.cellsUsed).toBe(0);
      expect(estimate.percentage).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 50000, // Large dataset
      };

      const estimate = calculateStorageEstimate(entityCounts);

      // (50000 + 1) * 20 = 1,000,020 cells
      // 1,000,020 / 10,000,000 = 10.0002%
      expect(estimate.cellsUsed).toBe(1000020);
      expect(estimate.percentage).toBeGreaterThanOrEqual(10);
      expect(estimate.percentage).toBeLessThan(10.01);
    });

    it('should calculate remaining rows correctly', () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 1000,
      };

      const estimate = calculateStorageEstimate(entityCounts);

      // cellsUsed = (1000 + 1) * 20 = 20,020
      // cellsRemaining = 10,000,000 - 20,020 = 9,979,980
      // estimatedRowsRemaining = 9,979,980 / 20 = 498,999
      expect(estimate.estimatedRowsRemaining).toBeGreaterThan(498000);
      expect(estimate.estimatedRowsRemaining).toBeLessThan(499000);
    });
  });

  describe('checkDataIntegrity', () => {
    it('should detect empty critical tabs', async () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 0,
        [SHEET_NAMES.ORGANIZATIONS]: 10,
        [SHEET_NAMES.LOCATIONS]: 0,
      };

      const issues = await checkDataIntegrity('token', 'sheetId', entityCounts);

      const emptyTabIssues = issues.filter((i) => i.message.includes('empty'));
      expect(emptyTabIssues.length).toBeGreaterThan(0);
    });

    it('should detect orphaned contact lists', async () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 0,
        [SHEET_NAMES.CONTACT_LISTS]: 50,
      };

      const issues = await checkDataIntegrity('token', 'sheetId', entityCounts);

      const orphanedIssue = issues.find(
        (i) => i.type === 'orphaned_data' && i.message.includes('Contact Lists')
      );
      expect(orphanedIssue).toBeDefined();
      expect(orphanedIssue.severity).toBe('medium');
    });

    it('should detect orphaned touchpoints', async () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 0,
        [SHEET_NAMES.TOUCHPOINTS]: 100,
      };

      const issues = await checkDataIntegrity('token', 'sheetId', entityCounts);

      const orphanedIssue = issues.find(
        (i) => i.type === 'orphaned_data' && i.message.includes('Touchpoints')
      );
      expect(orphanedIssue).toBeDefined();
    });

    it('should warn about large tabs', async () => {
      const entityCounts = {
        [SHEET_NAMES.CONTACTS]: 15000, // Very large
      };

      const issues = await checkDataIntegrity('token', 'sheetId', entityCounts);

      const performanceIssue = issues.find((i) => i.type === 'performance');
      expect(performanceIssue).toBeDefined();
      expect(performanceIssue.message).toContain('performance');
    });

    it('should handle null entityCounts', async () => {
      const issues = await checkDataIntegrity('token', 'sheetId', null);

      // Should not crash, just return empty or minimal issues
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('getDataHealth', () => {
    it('should batch reads correctly', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['ID'],
        data: [{ ID: '1' }],
      });

      await getDataHealth('token', 'sheetId');

      // Should call readSheetData for each sheet name
      expect(devModeWrapper.readSheetData).toHaveBeenCalled();

      // Total calls should equal number of sheet names
      const totalSheets = Object.values(SHEET_NAMES).length;
      expect(devModeWrapper.readSheetData).toHaveBeenCalledTimes(totalSheets);
    });

    it('should call progress callback', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['ID'],
        data: [],
      });

      const progressCallback = vi.fn();
      await getDataHealth('token', 'sheetId', progressCallback);

      expect(progressCallback).toHaveBeenCalled();

      // Check structure of first call
      const firstCall = progressCallback.mock.calls[0][0];
      expect(firstCall).toHaveProperty('phase');
      expect(firstCall).toHaveProperty('total');
      expect(firstCall).toHaveProperty('processed');
      expect(firstCall).toHaveProperty('current');
    });

    it('should return complete health data', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['ID', 'Name'],
        data: [
          { ID: '1', Name: 'Test' },
          { ID: '2', Name: 'Test 2' },
        ],
      });

      const health = await getDataHealth('token', 'sheetId');

      expect(health).toHaveProperty('entityCounts');
      expect(health).toHaveProperty('storageEstimate');
      expect(health).toHaveProperty('integrityIssues');
      expect(health).toHaveProperty('apiUsage');
      expect(health).toHaveProperty('timestamp');
    });

    it('should handle read failures gracefully', async () => {
      devModeWrapper.readSheetData.mockImplementation((token, sheetId, sheetName) => {
        if (sheetName === SHEET_NAMES.CONTACTS) {
          return Promise.reject(new Error('Read failed'));
        }
        return Promise.resolve({ headers: ['ID'], data: [] });
      });

      const health = await getDataHealth('token', 'sheetId');

      // Should still return data, with failed tab having 0 count
      expect(health.entityCounts[SHEET_NAMES.CONTACTS]).toBe(0);
    });

    it('should include API usage stats', async () => {
      devModeWrapper.readSheetData.mockResolvedValue({
        headers: ['ID'],
        data: [],
      });

      const health = await getDataHealth('token', 'sheetId');

      expect(health.apiUsage).toBeDefined();
      expect(health.apiUsage.serviceId).toBe('GOOGLE_SHEETS');
    });
  });
});
