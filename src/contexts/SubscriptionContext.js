import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { PREMIUM_FEATURES, SUBSCRIPTION_STATUS } from '../config/constants';
import { isDevMode } from '../__tests__/mocks/mockAuth';
import { log, warn } from '../utils/logger';
import {
  fetchSubscription as fetchSubscriptionAPI,
  createPortalSession,
} from '../utils/billingApi';

const SubscriptionContext = createContext();

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Default free tier subscription
const FREE_TIER = {
  status: SUBSCRIPTION_STATUS.FREE,
  features: [],
  workspaceSlots: 0,
  memberSlots: 0,
  stripeCustomerId: null,
  currentPeriodEnd: null,
};

// Cache configuration
const CACHE_KEY = 'subscription_cache';
const CACHE_EXPIRY_KEY = 'subscription_cache_expiry';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Dev mode subscription key
const DEV_SUBSCRIPTION_KEY = 'dev_subscription';

/**
 * Get cached subscription if available and not expired
 */
function getCachedSubscription() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

    if (!cached || !expiry) return null;

    const now = Date.now();
    if (now > parseInt(expiry, 10)) {
      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    warn('Failed to read subscription cache:', error);
    return null;
  }
}

/**
 * Cache subscription state
 */
function cacheSubscription(subscription) {
  try {
    const expiry = Date.now() + CACHE_TTL;
    localStorage.setItem(CACHE_KEY, JSON.stringify(subscription));
    localStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
  } catch (error) {
    warn('Failed to cache subscription:', error);
  }
}

/**
 * Get dev mode subscription (for testing premium features without backend)
 */
function getDevModeSubscription() {
  try {
    const devSub = localStorage.getItem(DEV_SUBSCRIPTION_KEY);
    if (devSub) {
      return JSON.parse(devSub);
    }
  } catch (error) {
    warn('Failed to read dev mode subscription:', error);
  }
  return FREE_TIER;
}

/**
 * Check if a feature is unlocked (non-React utility)
 * NOTE: All features are currently unlocked (no billing backend yet)
 * @param {string} featureKey - Feature key from PREMIUM_FEATURES
 * @returns {boolean} Whether the feature is unlocked
 */
export function hasFeatureAccess() {
  return true;
}

export function SubscriptionProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [subscription, setSubscription] = useState(FREE_TIER);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  /**
   * Fetch subscription from backend
   */
  const fetchSubscription = useCallback(async () => {
    // In dev mode, use localStorage mock subscription
    if (isDevMode()) {
      const devSub = getDevModeSubscription();
      setSubscription(devSub);
      setLoading(false);
      log('Dev mode subscription loaded:', devSub);
      return devSub;
    }

    // Not authenticated - return free tier
    if (!user || !accessToken) {
      setSubscription(FREE_TIER);
      setLoading(false);
      return FREE_TIER;
    }

    // Check cache first
    const cached = getCachedSubscription();
    if (cached) {
      setSubscription(cached);
      setLoading(false);
      log('Subscription loaded from cache:', cached);
      return cached;
    }

    // Fetch from backend
    try {
      const data = await fetchSubscriptionAPI(accessToken);

      // Cache the subscription
      cacheSubscription(data);

      setSubscription(data);
      setLoading(false);
      log('Subscription loaded from backend:', data);
      return data;
    } catch (error) {
      // Network error - fail open to free tier
      warn('Failed to fetch subscription:', error);
      setSubscription(FREE_TIER);
      setLoading(false);
      return FREE_TIER;
    }
  }, [user, accessToken]);

  /**
   * Refresh subscription (bypass cache)
   */
  const refreshSubscription = useCallback(async () => {
    // Clear cache
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);

    return fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Check if user has a specific premium feature
   * NOTE: All features are currently unlocked (no billing backend yet)
   */
  const hasFeature = useCallback(() => {
    return true;
  }, []);

  /**
   * Check if user can create a workspace
   * NOTE: Currently unlimited (no billing backend yet)
   */
  const canCreateWorkspace = useCallback(() => true, []);

  /**
   * Check if user can add a member to a workspace
   * NOTE: Currently unlimited (no billing backend yet)
   */
  const canAddMember = useCallback(() => true, []);

  /**
   * Open upgrade flow (Stripe Checkout)
   */
  const openUpgrade = useCallback(async () => {
    // In dev mode, allow toggling premium for testing
    if (isDevMode()) {
      const premiumSub = {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        features: Object.values(PREMIUM_FEATURES),
        workspaceSlots: 5,
        memberSlots: 10,
        stripeCustomerId: 'cus_test_123',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(DEV_SUBSCRIPTION_KEY, JSON.stringify(premiumSub));
      setSubscription(premiumSub);
      log('Dev mode: Upgraded to premium');
      return;
    }

    if (!accessToken) {
      warn('Cannot upgrade: not authenticated');
      return;
    }

    try {
      // TODO: Let user choose which product (workspace, member, etc.)
      // For now, redirect to a basic checkout
      // This is a placeholder - you'll want to show a product selection UI
      log('openUpgrade called - redirecting to upgrade page');
      // You could navigate to a dedicated upgrade page or show a modal
      // TODO: Implement product selection UI
    } catch (error) {
      warn('Failed to open upgrade flow:', error);
    }
  }, [accessToken]);

  /**
   * Open subscription management (Stripe Customer Portal)
   */
  const openManage = useCallback(async () => {
    // In dev mode, allow downgrading for testing
    if (isDevMode()) {
      localStorage.removeItem(DEV_SUBSCRIPTION_KEY);
      setSubscription(FREE_TIER);
      log('Dev mode: Downgraded to free tier');
      return;
    }

    if (!accessToken) {
      warn('Cannot manage subscription: not authenticated');
      return;
    }

    try {
      const portalUrl = await createPortalSession(accessToken);
      window.location.href = portalUrl;
    } catch (error) {
      warn('Failed to open customer portal:', error);
    }
  }, [accessToken]);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    if (!fetchedRef.current || user) {
      fetchedRef.current = true;
      // Fetch asynchronously without blocking render
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchSubscription();
    }
  }, [user, fetchSubscription]);

  const value = {
    subscription,
    loading,
    hasFeature,
    canCreateWorkspace,
    canAddMember,
    openUpgrade,
    openManage,
    refreshSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
