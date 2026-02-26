import { useState } from 'react';
import { Circle, Loader, CheckCircle, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import './ConnectionStatusPanel.css';

const STATUS_ICONS = {
  idle: Circle,
  checking: Loader,
  connected: CheckCircle,
  error: AlertCircle,
};

const STATUS_TEXT = {
  idle: 'Not started',
  checking: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
};

/**
 * Displays connection status for Google services as a vertical step list.
 * Error steps are expandable to show detail, fix hint, and retry button.
 *
 * @param {Array} steps - Array of { id, label, status, error? }
 * @param {Function} onRetry - Called with stepId when user clicks Retry
 * @param {boolean} compact - Smaller layout for embedding in SignInPage
 */
function ConnectionStatusPanel({ steps, onRetry, compact = false }) {
  const [expandedId, setExpandedId] = useState(null);

  // Only show steps that aren't idle
  const visibleSteps = steps.filter((s) => s.status !== 'idle');

  if (visibleSteps.length === 0) return null;

  const toggleExpand = (stepId) => {
    setExpandedId((prev) => (prev === stepId ? null : stepId));
  };

  return (
    <div className={`csp${compact ? ' csp--compact' : ''}`}>
      {visibleSteps.map((step) => {
        const Icon = STATUS_ICONS[step.status];
        const isError = step.status === 'error';
        const isExpanded = expandedId === step.id;

        return (
          <div key={step.id} className={`csp-step csp-step--${step.status}`}>
            <div
              className={`csp-step-header${isError ? ' csp-step-header--clickable' : ''}`}
              onClick={isError ? () => toggleExpand(step.id) : undefined}
              role={isError ? 'button' : undefined}
              tabIndex={isError ? 0 : undefined}
              onKeyDown={
                isError
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleExpand(step.id);
                    }
                  : undefined
              }
            >
              <Icon
                size={compact ? 14 : 16}
                className={`csp-step-icon${step.status === 'checking' ? ' spinner' : ''}`}
              />
              <span className="csp-step-label">{step.label}</span>
              {step.id === 'calendar' && step.status === 'idle' && (
                <span className="csp-step-badge">Optional</span>
              )}
              <span className="csp-step-status">{STATUS_TEXT[step.status]}</span>
              {isError && (
                <ChevronDown
                  size={14}
                  className={`csp-expand-icon${isExpanded ? ' csp-expand-icon--open' : ''}`}
                />
              )}
            </div>

            {isError && isExpanded && step.error && (
              <div className="csp-step-detail">
                <p className="csp-detail-text">{step.error.detail}</p>
                <p className="csp-fix-text">{step.error.fix}</p>
                {onRetry && (
                  <button
                    className="btn btn-sm btn-secondary csp-retry-btn"
                    onClick={() => onRetry(step.id)}
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ConnectionStatusPanel;
