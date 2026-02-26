import React, { useEffect } from 'react';

function WindowTemplate({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  showCloseButton = true,
  children,
  footer,
  className = '',
  overlayClassName = '',
  ...props
}) {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`window-overlay ${overlayClassName}`}
      onClick={handleOverlayClick}
      {...props}
    >
      <div className={`window-content window-${size} ${className}`}>
        {(title || subtitle || showCloseButton) && (
          <div className="window-header">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <div className="window-subtitle">{subtitle}</div>}
            </div>
            {showCloseButton && onClose && (
              <button className="btn-close" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="window-body">
          {children}
        </div>

        {footer && (
          <div className="window-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default WindowTemplate;