import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';

// Simple progress bar component
const ProgressBar = ({ progress, label }) => (
  <div style={{ width: '100%' }}>
    {label && <div style={{ fontSize: '0.875rem', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>{label}</div>}
    <div style={{
      width: '100%',
      height: '8px',
      backgroundColor: 'var(--color-border)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.3s ease'
      }} />
    </div>
  </div>
);

function BulkActionsToolbar({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
  onTagContacts,
  onChangeStatus,
  onDeleteContacts,
  onExportContacts,
  onBatchEdit,
  onCopyToWorkspace,
  isLoading = false,
  progress = 0
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleTagSubmit = async () => {
    if (tagInput.trim() && onTagContacts) {
      setActiveAction('tagging');
      await onTagContacts(tagInput.trim());
      setTagInput('');
      setActiveAction(null);
    }
  };

  const handleStatusSubmit = async () => {
    if (statusFilter && onChangeStatus) {
      setActiveAction('status');
      await onChangeStatus(statusFilter);
      setStatusFilter('');
      setActiveAction(null);
    }
  };

  const handleDelete = async () => {
    setActiveAction('deleting');
    await onDeleteContacts();
    setActiveAction(null);
  };

  const handleExport = async () => {
    setActiveAction('exporting');
    await onExportContacts();
    setActiveAction(null);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-actions-toolbar">
      {/* Progress bar if action in progress */}
      {isLoading && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <ProgressBar
            progress={progress}
            label={`${activeAction}: ${Math.round(progress)}%`}
          />
        </div>
      )}

      <div className="bulk-actions-content">
        <div className="bulk-actions-left">
          <div className="bulk-actions-selection">
            <input
              type="checkbox"
              checked={selectedCount === totalCount && totalCount > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll?.();
                } else {
                  onDeselectAll?.();
                }
              }}
              title={selectedCount === totalCount ? 'Deselect all' : 'Select all'}
              style={{ cursor: 'pointer' }}
            />
            <span className="bulk-actions-count">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        </div>

        <div className="bulk-actions-right">
          {/* Tag action */}
          <div className="bulk-action-group">
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTagSubmit()}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                width: '150px'
              }}
            />
            <button
              className="btn btn-sm btn-ghost"
              onClick={handleTagSubmit}
              disabled={!tagInput.trim() || isLoading}
              title="Tag all selected contacts"
            >
              Tag
            </button>
          </div>

          {/* Status action */}
          <div className="bulk-action-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                fontSize: '14px'
              }}
            >
              <option value="">Change Status...</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Neutral">Neutral</option>
              <option value="Support">Support</option>
              <option value="Undecided">Undecided</option>
              <option value="Do Not Contact">Do Not Contact</option>
            </select>
            <button
              className="btn btn-sm btn-ghost"
              onClick={handleStatusSubmit}
              disabled={!statusFilter || isLoading}
              title="Change status for all selected"
            >
              Update
            </button>
          </div>

          {/* Batch Edit button */}
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onBatchEdit?.()}
            disabled={isLoading}
            title="Edit all selected contacts"
          >
            <Pencil size={14} /> Edit
          </button>

          {/* Copy to Workspace button */}
          {onCopyToWorkspace && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onCopyToWorkspace?.()}
              disabled={isLoading}
              title="Copy selected contacts to a workspace"
            >
              → Copy to Workspace
            </button>
          )}

          {/* Export button */}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleExport}
            disabled={isLoading || activeAction === 'exporting'}
            title="Export selected contacts to CSV"
          >
            ↓ Export
          </button>

          {/* Delete button */}
          <button
            className="btn btn-sm btn-danger"
            onClick={handleDelete}
            disabled={isLoading || activeAction === 'deleting'}
            title="Delete all selected contacts"
          >
            <X size={16} /> Delete
          </button>

          {/* Clear selection */}
          <button
            className="btn btn-sm btn-ghost"
            onClick={onDeselectAll}
            disabled={isLoading}
            title="Clear selection"
            style={{ marginLeft: 'auto' }}
          >
            Clear
          </button>
        </div>
      </div>

      <style>{`
        .bulk-actions-toolbar {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--color-bg-secondary);
          border-top: 1px solid var(--color-border);
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
          z-index: 100;
          animation: slideUp 200ms ease;
        }

        .bulk-actions-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          flex-wrap: wrap;
        }

        .bulk-actions-left {
          flex: 0 0 auto;
        }

        .bulk-actions-selection {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          min-width: 200px;
        }

        .bulk-actions-count {
          font-weight: 500;
          color: var(--color-text-muted);
          font-size: 14px;
        }

        .bulk-actions-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex: 1;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .bulk-action-group {
          display: flex;
          gap: var(--spacing-xs);
          align-items: center;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .bulk-actions-content {
            flex-direction: column;
            align-items: stretch;
          }

          .bulk-actions-right {
            justify-content: space-between;
          }

          .bulk-action-group {
            width: 100%;
          }

          .bulk-action-group input,
          .bulk-action-group select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default BulkActionsToolbar;
