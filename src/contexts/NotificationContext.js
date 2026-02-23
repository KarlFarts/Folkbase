import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const NOTIFICATION_DEFAULTS = {
  success: { duration: 5000, icon: 'check-circle' },
  error: { duration: 8000, icon: 'x-circle' },
  warning: { duration: 6000, icon: 'alert-triangle' },
  info: { duration: 5000, icon: 'info' },
  urgent: { duration: null, icon: 'alert-circle', persistent: true },
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const idCounter = useRef(0);

  const generateId = useCallback(() => {
    idCounter.current += 1;
    return `notification-${Date.now()}-${idCounter.current}`;
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (type, message, options = {}) => {
      const defaults = NOTIFICATION_DEFAULTS[type] || NOTIFICATION_DEFAULTS.info;
      const id = generateId();

      const notification = {
        id,
        type,
        message,
        duration: options.duration ?? defaults.duration,
        persistent: options.persistent ?? defaults.persistent ?? false,
        action: options.action ?? null,
        icon: options.icon ?? defaults.icon,
        createdAt: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      if (!notification.persistent && notification.duration) {
        setTimeout(() => {
          dismissNotification(id);
        }, notification.duration);
      }

      return id;
    },
    [generateId, dismissNotification]
  );

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const notify = useMemo(
    () => ({
      success: (message, options) => addNotification('success', message, options),
      error: (message, options) => addNotification('error', message, options),
      warning: (message, options) => addNotification('warning', message, options),
      info: (message, options) => addNotification('info', message, options),
      urgent: (message, options) =>
        addNotification('urgent', message, { ...options, persistent: true }),
    }),
    [addNotification]
  );

  const value = {
    notifications,
    notify,
    addNotification,
    dismissNotification,
    dismissAll,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
