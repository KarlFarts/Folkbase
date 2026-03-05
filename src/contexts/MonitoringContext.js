import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import monitoringService from '../services/cacheMonitoringService';

const MonitoringContext = createContext(null);

function getStats() {
  return {
    cache: monitoringService.getCacheStats(),
    quota: monitoringService.getQuotaStats(),
    apiCalls: monitoringService.getApiCallLog(50),
    recentOps: monitoringService.getRecentOperations(20),
  };
}

export function MonitoringProvider({ children }) {
  const [stats, setStats] = useState(getStats);
  const prevJsonRef = useRef('');

  useEffect(() => {
    const updateIfChanged = () => {
      const next = getStats();
      const nextJson = JSON.stringify(next);
      if (nextJson !== prevJsonRef.current) {
        prevJsonRef.current = nextJson;
        setStats(next);
      }
    };

    // Update stats every second (with shallow comparison to avoid unnecessary re-renders)
    const interval = setInterval(updateIfChanged, 1000);

    // Subscribe to immediate updates
    const unsubscribe = monitoringService.subscribe(updateIfChanged);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return <MonitoringContext.Provider value={stats}>{children}</MonitoringContext.Provider>;
}

export function useCacheMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useCacheMonitoring must be used within MonitoringProvider');
  }
  return context;
}
