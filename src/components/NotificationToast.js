import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const icons = {
  'check-circle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 12 15 16 10" />
    </svg>
  ),
  'x-circle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  'alert-triangle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'info': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  'alert-circle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

function Toast({ notification, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 200);
  };

  const handleAction = () => {
    if (notification.action?.onClick) {
      notification.action.onClick();
    }
    handleDismiss();
  };

  const typeClass = notification.type === 'urgent' ? 'danger' : notification.type;

  return (
    <div
      className={`notification-toast notification-${typeClass} ${isExiting ? 'exiting' : ''}`}
      role="alert"
      aria-live={notification.type === 'urgent' ? 'assertive' : 'polite'}
    >
      <div className="notification-icon">
        {icons[notification.icon]}
      </div>
      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>
      </div>
      <div className="notification-actions">
        {notification.action && (
          <button
            className="btn btn-sm btn-notification-action"
            onClick={handleAction}
          >
            {notification.action.label}
          </button>
        )}
        <button
          className="notification-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, dismissNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container" aria-label="Notifications">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;
