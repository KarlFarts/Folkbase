import React from 'react';
import '../../styles/BatchActionsToolbar.css';

/**
 * BatchActionsToolbar Component
 * Provides bulk action buttons for selected rows in data correction table
 */
function BatchActionsToolbar({ selectedCount, onFormatPhones, onExcludeSelected }) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="batch-actions-toolbar">
      <div className="selection-info">
        {selectedCount > 0 ? (
          <span>{selectedCount} selected</span>
        ) : (
          <span>No rows selected</span>
        )}
      </div>
      <div className="batch-actions">
        <button
          className="batch-action-button"
          onClick={onFormatPhones}
          disabled={!hasSelection}
          title="Format phone numbers to standard format"
        >
          Format All Phones
        </button>
        <button
          className="batch-action-button exclude-button"
          onClick={onExcludeSelected}
          disabled={!hasSelection}
          title="Exclude selected rows from import"
        >
          Exclude Selected
        </button>
      </div>
    </div>
  );
}

export default BatchActionsToolbar;
