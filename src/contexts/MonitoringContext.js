import React, { createContext, useContext, useState, useEffect } from 'react';
import monitoringService from '../services/cacheMonitoringService';

const MonitoringContext = createContext(null);

export function MonitoringProvider({ children }) {
  const [stats, setStats] = useState({
    cache: monitoringService.getCacheStats(),
    quota: monitoringService.getQuotaStats(),
    apiCalls: monitoringService.getApiCallLog(50),
    recentOps: monitoringService.getRecentOperations(20),
  });

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      setStats({
        cache: monitoringService.getCacheStats(),
        quota: monitoringService.getQuotaStats(),
        apiCalls: monitoringService.getApiCallLog(50),
        recentOps: monitoringService.getRecentOperations(20),
      });
    }, 1000);

    // Subscribe to immediate updates (for real-time feel)
    const unsubscribe = monitoringService.subscribe(() => {
      setStats({
        cache: monitoringService.getCacheStats(),
        quota: monitoringService.getQuotaStats(),
        apiCalls: monitoringService.getApiCallLog(50),
        recentOps: monitoringService.getRecentOperations(20),
      });
    });

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
