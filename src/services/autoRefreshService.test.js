import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateChecksum, createAutoRefreshService } from './autoRefreshService';

// Helper to wait for all pending promises to resolve
async function waitForPromises() {
  // Multiple Promise.resolve() calls to flush microtask queue
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('autoRefreshService', () => {
  describe('calculateChecksum', () => {
    it('should return empty string for null/empty data', () => {
      expect(calculateChecksum(null)).toBe('');
      expect(calculateChecksum([])).toBe('');
    });

    it('should return same checksum for identical data', () => {
      const data = [
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' },
        { 'Contact ID': 'C002', 'Name': 'Jane Smith', 'Phone': '555-0101' }
      ];

      const checksum1 = calculateChecksum(data);
      const checksum2 = calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).not.toBe('');
    });

    it('should return different checksum when data changes', () => {
      const data1 = [
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' }
      ];

      const data2 = [
        { 'Contact ID': 'C001', 'Name': 'John Smith', 'Phone': '555-0100' }
      ];

      const checksum1 = calculateChecksum(data1);
      const checksum2 = calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should return different checksum when contact added', () => {
      const data1 = [
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' }
      ];

      const data2 = [
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' },
        { 'Contact ID': 'C002', 'Name': 'Jane Smith', 'Phone': '555-0101' }
      ];

      const checksum1 = calculateChecksum(data1);
      const checksum2 = calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle data in different order (sorts by Contact ID)', () => {
      const data1 = [
        { 'Contact ID': 'C002', 'Name': 'Jane Smith', 'Phone': '555-0101' },
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' }
      ];

      const data2 = [
        { 'Contact ID': 'C001', 'Name': 'John Doe', 'Phone': '555-0100' },
        { 'Contact ID': 'C002', 'Name': 'Jane Smith', 'Phone': '555-0101' }
      ];

      const checksum1 = calculateChecksum(data1);
      const checksum2 = calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('createAutoRefreshService', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create service instance with methods', () => {
      const fetchData = vi.fn();
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged);

      expect(service).toHaveProperty('start');
      expect(service).toHaveProperty('stop');
      expect(service).toHaveProperty('forceRefresh');
      expect(service).toHaveProperty('resetChecksum');
      expect(service).toHaveProperty('isRunning');
    });

    it('should call fetchData on start', async () => {
      const mockData = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const fetchData = vi.fn().mockResolvedValue(mockData);
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 1000
      });

      service.start();

      // Wait for initial fetch
      await waitForPromises();

      expect(fetchData).toHaveBeenCalled();
      service.stop();
    });

    it('should not call onDataChanged on first fetch', async () => {
      const mockData = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const fetchData = vi.fn().mockResolvedValue(mockData);
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 1000
      });

      service.start();
      await waitForPromises();

      expect(fetchData).toHaveBeenCalledTimes(1);
      expect(onDataChanged).not.toHaveBeenCalled();

      service.stop();
    });

    it('should call onDataChanged when data changes', async () => {
      const data1 = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const data2 = [
        { 'Contact ID': 'C001', 'Name': 'Test' },
        { 'Contact ID': 'C002', 'Name': 'New Contact' }
      ];

      const fetchData = vi.fn()
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2);

      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 100
      });

      service.start();

      // First fetch
      await waitForPromises();
      expect(fetchData).toHaveBeenCalledTimes(1);
      expect(onDataChanged).not.toHaveBeenCalled();

      // Second fetch with changed data - advance timer and wait for promises
      vi.advanceTimersByTime(100);
      await waitForPromises();
      expect(fetchData).toHaveBeenCalledTimes(2);
      expect(onDataChanged).toHaveBeenCalledTimes(1);
      expect(onDataChanged).toHaveBeenCalledWith(data2, expect.any(String));

      service.stop();
    });

    it('should not call onDataChanged when data stays same', async () => {
      const mockData = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const fetchData = vi.fn().mockResolvedValue(mockData);
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 100
      });

      service.start();

      // Multiple fetches with same data
      await waitForPromises();

      vi.advanceTimersByTime(100);
      await waitForPromises();

      vi.advanceTimersByTime(100);
      await waitForPromises();

      expect(fetchData).toHaveBeenCalled();
      expect(onDataChanged).not.toHaveBeenCalled();

      service.stop();
    });

    it('should stop polling when stop is called', async () => {
      const mockData = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const fetchData = vi.fn().mockResolvedValue(mockData);
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 100
      });

      service.start();
      await waitForPromises();

      expect(service.isRunning()).toBe(true);

      service.stop();
      expect(service.isRunning()).toBe(false);

      const callsAfterStop = fetchData.mock.calls.length;

      // Advance time - should not trigger more fetches
      vi.advanceTimersByTime(500);
      await waitForPromises();
      expect(fetchData).toHaveBeenCalledTimes(callsAfterStop);
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchData = vi.fn().mockRejectedValue(new Error('Network error'));
      const onDataChanged = vi.fn();
      const onError = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 100,
        onError
      });

      service.start();
      await waitForPromises();

      expect(fetchData).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onDataChanged).not.toHaveBeenCalled();

      service.stop();
    });

    it('should support force refresh', async () => {
      const data1 = [{ 'Contact ID': 'C001', 'Name': 'Test' }];
      const data2 = [{ 'Contact ID': 'C001', 'Name': 'Updated' }];

      const fetchData = vi.fn()
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2);

      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 60000 // Long interval
      });

      service.start();
      await waitForPromises();

      expect(fetchData).toHaveBeenCalledTimes(1);

      // Force refresh without waiting for interval
      await service.forceRefresh();

      expect(fetchData).toHaveBeenCalledTimes(2);
      expect(onDataChanged).toHaveBeenCalledWith(data2, expect.any(String));

      service.stop();
    });

    it('should not start if disabled', async () => {
      const fetchData = vi.fn();
      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        enabled: false
      });

      service.start();
      await waitForPromises();

      expect(service.isRunning()).toBe(false);
      expect(fetchData).not.toHaveBeenCalled();
    });

    it('should skip polling if previous fetch is still running', async () => {
      let resolveFirstFetch;
      const firstFetchPromise = new Promise(resolve => {
        resolveFirstFetch = resolve;
      });

      const fetchData = vi.fn()
        .mockReturnValueOnce(firstFetchPromise)
        .mockResolvedValue([{ 'Contact ID': 'C001', 'Name': 'Test' }]);

      const onDataChanged = vi.fn();

      const service = createAutoRefreshService(fetchData, onDataChanged, {
        intervalMs: 100
      });

      service.start();

      // Advance time to trigger second poll while first is still running
      vi.advanceTimersByTime(100);
      await Promise.resolve();

      expect(fetchData).toHaveBeenCalledTimes(1); // Should not call again

      // Resolve first fetch
      resolveFirstFetch([{ 'Contact ID': 'C001', 'Name': 'Test' }]);
      await firstFetchPromise;

      service.stop();
    });
  });
});
