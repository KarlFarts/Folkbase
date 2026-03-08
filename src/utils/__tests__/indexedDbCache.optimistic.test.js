import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb
const mockStore = {};
const mockDb = {
  get: vi.fn((store, key) => mockStore[`${store}:${key}`] || null),
  put: vi.fn((store, value, key) => {
    mockStore[`${store}:${key}`] = value;
  }),
  delete: vi.fn((store, key) => {
    delete mockStore[`${store}:${key}`];
  }),
};

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('../../config/constants', () => ({
  SHEET_NAMES: { CONTACTS: 'Contacts', NOTES: 'Notes' },
  CACHE_CONFIG: { ENABLED: true, DEFAULT_TTL: 300, HIGH_CHURN_TTL: 120, LOW_CHURN_TTL: 1800 },
}));

vi.mock('../../services/cacheMonitoringService', () => ({
  default: { recordCacheHit: vi.fn(), recordCacheMiss: vi.fn() },
}));

import { appendToCachedData, updateCachedRow, deleteCachedRow } from '../indexedDbCache';

describe('optimistic cache updates', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  describe('appendToCachedData', () => {
    it('appends a row to existing cached data', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [{ 'Contact ID': 'CON-aaa', Name: 'Alice' }],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await appendToCachedData('Contacts', { 'Contact ID': 'CON-bbb', Name: 'Bob' });

      const cached = mockStore['Contacts:data'];
      expect(cached.data.length).toBe(2);
      expect(cached.data[1].Name).toBe('Bob');
    });

    it('does nothing if cache is empty', async () => {
      await appendToCachedData('Contacts', { 'Contact ID': 'CON-bbb', Name: 'Bob' });
      expect(mockStore['Contacts:data']).toBeUndefined();
    });
  });

  describe('updateCachedRow', () => {
    it('updates a matching row in cache', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [{ 'Contact ID': 'CON-aaa', Name: 'Alice' }],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await updateCachedRow('Contacts', 'Contact ID', 'CON-aaa', { Name: 'Alicia' });

      expect(mockStore['Contacts:data'].data[0].Name).toBe('Alicia');
    });
  });

  describe('deleteCachedRow', () => {
    it('removes a matching row from cache', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [
          { 'Contact ID': 'CON-aaa', Name: 'Alice' },
          { 'Contact ID': 'CON-bbb', Name: 'Bob' },
        ],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await deleteCachedRow('Contacts', 'Contact ID', 'CON-aaa');

      const cached = mockStore['Contacts:data'];
      expect(cached.data.length).toBe(1);
      expect(cached.data[0].Name).toBe('Bob');
    });
  });
});
