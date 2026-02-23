/**
 * useApiTracking Hook
 *
 * Initializes and manages API usage tracking across the application.
 * Should be called once at app startup to register services and enable tracking.
 */

import { useEffect, useRef } from 'react';
import {
  initializeApiLogger,
  registerService,
  setTrackingEnabled,
} from '../utils/apiUsageLogger.js';
import { API_QUOTAS, TRACKING_CONFIG } from '../config/constants.js';
import { log, warn } from '../utils/logger.js';

/**
 * Initialize API tracking on app startup
 * Call this once at the root of your app
 */
export function useApiTracking() {
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      // Initialize the logger
      initializeApiLogger();

      // Enable/disable tracking based on config
      setTrackingEnabled(TRACKING_CONFIG.ENABLED);

      // Register all services with their quotas
      Object.entries(API_QUOTAS).forEach(([key, serviceConfig]) => {
        if (serviceConfig.enabled) {
          registerService(key.toLowerCase().replace(/_/g, '-'), {
            name: serviceConfig.name,
            quotas: serviceConfig.quotas,
            enabled: true,
          });

          log(`API service registered: ${serviceConfig.name}`);
        }
      });

      log('API tracking initialized successfully');
    } catch (error) {
      warn('Failed to initialize API tracking:', error.message);
    }
  }, []);
}
