import React from 'react';
import CollapsibleWidget from './CollapsibleWidget';

const CustomActionsWidget = ({ actions }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <CollapsibleWidget
      title="Quick Actions"
      defaultExpanded={true}
    >
      <div className="custom-actions-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            className="custom-action-btn"
            onClick={action.action}
          >
            {action.label}
          </button>
        ))}
      </div>
    </CollapsibleWidget>
  );
};

export default CustomActionsWidget;
