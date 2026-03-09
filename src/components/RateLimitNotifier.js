import { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { registerRateLimitHandler } from '../utils/rateLimitHandler';

/**
 * Invisible component that listens for Google API rate-limit (429) events and
 * surfaces a user-friendly warning toast.  Debounced so concurrent blocked
 * requests don't stack up multiple notifications.
 */
function RateLimitNotifier() {
  const { notify } = useNotification();
  const lastNotifiedRef = useRef(0);
  const DEBOUNCE_MS = 5000;

  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      if (now - lastNotifiedRef.current < DEBOUNCE_MS) return;
      lastNotifiedRef.current = now;
      notify.warning('Google Sheets is rate-limited — try again in a few seconds', {
        duration: 8000,
      });
    };

    registerRateLimitHandler(handler);
    return () => registerRateLimitHandler(null);
  }, [notify]);

  return null;
}

export default RateLimitNotifier;
