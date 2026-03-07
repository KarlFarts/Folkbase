/**
 * EmptyState - reusable empty state component for lists, cards, and tables.
 *
 * @param {React.ComponentType} icon - Lucide-react icon component (optional)
 * @param {string} title - Heading text
 * @param {string} description - Supporting text (optional)
 * @param {string} action - Primary button label (optional)
 * @param {Function} onAction - Primary button handler
 * @param {string} secondaryAction - Secondary button label, e.g. "Clear Filters" (optional)
 * @param {Function} onSecondaryAction - Secondary button handler
 * @param {boolean} compact - Use compact in-card variant (default: false)
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
  compact = false,
}) {
  const className = compact ? 'empty-state-compact' : 'empty-state';
  const btnClass = compact ? 'btn btn-primary btn-sm' : 'btn btn-primary';
  const btnSecondaryClass = compact ? 'btn btn-secondary btn-sm' : 'btn btn-secondary';

  return (
    <div className={className}>
      {Icon && <Icon className="empty-state-icon" />}
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p>{description}</p>}
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <button className={btnClass} onClick={onAction}>
              {action}
            </button>
          )}
          {secondaryAction && (
            <button className={btnSecondaryClass} onClick={onSecondaryAction}>
              {secondaryAction}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
