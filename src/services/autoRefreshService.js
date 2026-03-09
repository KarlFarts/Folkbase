/**
 * Auto-refresh service for polling Google Sheets data
 * Implements 60-second polling with checksum-based change detection
 *
 * Multi-tab note: each browser tab that renders a component using this service
 * creates its own independent polling interval. Two tabs open to ContactList will
 * each poll every 60 seconds, doubling API usage. The isFetching guard prevents
 * overlapping requests within a single instance but not across tabs.
 * This does not cause data corruption (polls are read-only). If rate-limit
 * pressure becomes a concern, a BroadcastChannel or navigator.locks leader-election
 * pattern can designate a single polling tab.
 */

const POLL_INTERVAL_MS = 60000; // 60 seconds

/**
 * Calculate checksum for data to detect changes
 * @param {Array} data - Array of contact objects
 * @returns {string} Checksum hash
 */
export function calculateChecksum(data) {
  if (!data || data.length === 0) return '';

  // Create a simple checksum from length and sample data
  const sortedData = [...data].sort((a, b) =>
    (a['Contact ID'] || '').localeCompare(b['Contact ID'] || '')
  );

  // Use first, middle, and last contacts for checksum
  const samples = [
    sortedData[0],
    sortedData[Math.floor(sortedData.length / 2)],
    sortedData[sortedData.length - 1],
  ];

  const checksumString = JSON.stringify({
    length: data.length,
    samples: samples.map((s) => ({
      id: s?.['Contact ID'],
      name: s?.['Name'],
      phone: s?.['Phone'],
      email: s?.['Email'],
    })),
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < checksumString.length; i++) {
    const char = checksumString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(16);
}

/**
 * Create an auto-refresh service instance
 * @param {Function} fetchData - Async function to fetch latest data
 * @param {Function} onDataChanged - Callback when data changes
 * @param {Object} options - Configuration options
 * @returns {Object} Service instance with start/stop/forceRefresh methods
 */
export function createAutoRefreshService(fetchData, onDataChanged, options = {}) {
  const { intervalMs = POLL_INTERVAL_MS, onError = null, enabled = true } = options;

  let intervalId = null;
  let lastChecksum = null;
  let isActive = false;
  let isFetching = false;

  /**
   * Check for data updates
   */
  async function checkForUpdates() {
    if (isFetching) {
      // Skip this poll if previous one is still running
      return;
    }

    try {
      isFetching = true;
      const newData = await fetchData();

      // Calculate checksum
      const newChecksum = calculateChecksum(newData);

      // Compare with last known checksum
      if (lastChecksum === null) {
        // First fetch, just store the checksum
        lastChecksum = newChecksum;
      } else if (newChecksum !== lastChecksum) {
        // Data has changed
        lastChecksum = newChecksum;
        await onDataChanged(newData, newChecksum);
      }
      // else: No change, do nothing
    } catch (error) {
      if (onError) {
        onError(error);
      }
    } finally {
      isFetching = false;
    }
  }

  /**
   * Start polling
   */
  function start() {
    if (isActive || !enabled) return;

    isActive = true;
    intervalId = setInterval(checkForUpdates, intervalMs);

    // Do initial check
    checkForUpdates();
  }

  /**
   * Stop polling
   */
  function stop() {
    if (!isActive) return;

    isActive = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Force immediate refresh
   * @returns {Promise<void>}
   */
  async function forceRefresh() {
    await checkForUpdates();
  }

  /**
   * Reset checksum (useful when data is manually changed)
   */
  function resetChecksum() {
    lastChecksum = null;
  }

  /**
   * Check if service is currently active
   */
  function isRunning() {
    return isActive;
  }

  return {
    start,
    stop,
    forceRefresh,
    resetChecksum,
    isRunning,
  };
}
