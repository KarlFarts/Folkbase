import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

function TokenExpiryNotifier() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { notify, dismissNotification } = useNotification();
  const lastWarningRef = useRef(null);
  const notificationIdRef = useRef(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const checkExpiry = () => {
      const expiresAt = sessionStorage.getItem('googleAccessTokenExpiresAt');
      if (!expiresAt) return;

      const expiresAtTime = parseInt(expiresAt, 10);
      const now = Date.now();
      const timeRemaining = expiresAtTime - now;
      const minutes = Math.floor(timeRemaining / (60 * 1000));

      let warningLevel = null;
      if (minutes <= 1) {
        warningLevel = 'critical';
      } else if (minutes <= 3) {
        warningLevel = 'warning';
      } else if (minutes <= 5) {
        warningLevel = 'info';
      }

      if (warningLevel && warningLevel !== lastWarningRef.current) {
        lastWarningRef.current = warningLevel;

        if (notificationIdRef.current) {
          dismissNotification(notificationIdRef.current);
        }

        const handleRefresh = async () => {
          try {
            await refreshAccessToken();
            notify.success('Session refreshed successfully');
          } catch (err) {
            console.error('Token refresh failed:', err);
            notify.error('Failed to refresh session. Please sign in again.');
          }
        };

        const message = `Session expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`;

        if (warningLevel === 'critical') {
          notificationIdRef.current = notify.urgent(message, {
            action: { label: 'Refresh Now', onClick: handleRefresh },
          });
        } else if (warningLevel === 'warning') {
          notificationIdRef.current = notify.warning(message, {
            action: { label: 'Refresh Now', onClick: handleRefresh },
            persistent: true,
          });
        } else {
          notificationIdRef.current = notify.info(message, {
            action: { label: 'Refresh Now', onClick: handleRefresh },
            duration: 10000,
          });
        }
      }

      if (minutes > 5) {
        lastWarningRef.current = null;
        if (notificationIdRef.current) {
          dismissNotification(notificationIdRef.current);
          notificationIdRef.current = null;
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 30000);

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken, notify, dismissNotification]);

  return null;
}

export default TokenExpiryNotifier;
