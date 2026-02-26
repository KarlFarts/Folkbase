import { useState } from 'react';

function CollapsibleWidget({
  title,
  label,
  count,
  defaultExpanded = true,
  onViewAll,
  viewAllLabel = "VIEW ALL",
  children
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`dashboard-widget ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="dashboard-widget-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="dashboard-widget-header-left">
          <span className="dashboard-widget-expand-icon">{isExpanded ? '▼' : '▶'}</span>
          <h3 className="dashboard-widget-title">{title}</h3>
          {label && <span className="dashboard-widget-label">{label}</span>}
          {count > 0 && <span className="dashboard-widget-count">{count}</span>}
        </div>
        {onViewAll && isExpanded && (
          <button
            className="dashboard-widget-view-all"
            onClick={(e) => { e.stopPropagation(); onViewAll(); }}
          >
            {viewAllLabel} →
          </button>
        )}
      </div>
      {isExpanded && <div className="dashboard-widget-body">{children}</div>}
    </div>
  );
}

export default CollapsibleWidget;
