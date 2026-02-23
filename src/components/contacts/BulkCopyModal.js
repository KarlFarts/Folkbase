import React, { useState } from 'react';
import { Info } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';

const FIELD_OPTIONS = [
  'Name',
  'Phone',
  'Email',
  'Address',
  'City',
  'State',
  'Zip',
  'Notes',
  'Tags',
  'Status',
  'Priority',
  'Source',
];

/**
 * BulkCopyModal - Modal for copying multiple contacts to a workspace
 */
function BulkCopyModal({
  isOpen,
  selectedCount,
  workspaces,
  currentWorkspace,
  onCopy,
  onClose,
  isLoading,
  sheetId,
  totalNotesCount = 0, // Total notes across all selected contacts
}) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [syncStrategy, setSyncStrategy] = useState('core_fields_only');
  const [createLink, setCreateLink] = useState(true);
  const [customFields, setCustomFields] = useState([]);
  const [error, setError] = useState('');

  // Notes sharing state
  const [shareNotes, setShareNotes] = useState(false);
  const [notesVisibility, setNotesVisibility] = useState('Workspace-Wide');

  const handleFieldToggle = (field) => {
    if (customFields.includes(field)) {
      setCustomFields(customFields.filter((f) => f !== field));
    } else {
      setCustomFields([...customFields, field]);
    }
  };

  const handleCopy = async () => {
    if (!selectedWorkspaceId) {
      setError('Please select a workspace');
      return;
    }

    if (syncStrategy === 'custom' && customFields.length === 0) {
      setError('Please select at least one field to sync');
      return;
    }

    const targetWorkspace = workspaces.find((c) => c.id === selectedWorkspaceId);
    let linkConfig = null;

    if (createLink) {
      linkConfig = {
        createLink: true,
        syncStrategy,
        customFields: syncStrategy === 'custom' ? customFields : [],
        sourceWorkspace: {
          type: currentWorkspace.type,
          id: currentWorkspace.id,
          sheetId: sheetId,
          contactId: null, // Will be set per contact
        },
        targetWorkspace: {
          type: 'workspace',
          id: selectedWorkspaceId,
          sheetId: targetWorkspace.sheet_id,
          contactId: null, // Will be set after copy
        },
      };
    }

    // Build notes sharing config if requested
    const notesConfig = shareNotes
      ? {
          shareNotes: true,
          visibility: notesVisibility,
        }
      : null;

    await onCopy(selectedWorkspaceId, linkConfig, notesConfig);
  };

  if (!isOpen) return null;

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title={`Copy ${selectedCount} Contact${selectedCount !== 1 ? 's' : ''} to Workspace`}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={!selectedWorkspaceId || isLoading}
          >
            {isLoading
              ? 'Copying...'
              : `Copy ${selectedCount} Contact${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label htmlFor="workspace-select" className="form-label">
          Select Target Workspace
        </label>
        <select
          id="workspace-select"
          className="form-control"
          value={selectedWorkspaceId}
          onChange={(e) => {
            setSelectedWorkspaceId(e.target.value);
            setError('');
          }}
          disabled={isLoading}
        >
          <option value="">-- Choose a workspace --</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={createLink}
            onChange={(e) => setCreateLink(e.target.checked)}
            disabled={isLoading}
          />
          <span style={{ marginLeft: '0.5rem' }}>
            Create sync links (changes will sync between workspaces)
          </span>
        </label>
      </div>

      {createLink && (
        <>
          <div className="form-group">
            <label className="form-label">Sync Strategy</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="core_fields_only"
                  checked={syncStrategy === 'core_fields_only'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>Core Fields Only</strong>
                  <p className="text-sm">Sync Name, Phone, and Email only</p>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="all_fields"
                  checked={syncStrategy === 'all_fields'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>All Fields</strong>
                  <p className="text-sm">Sync all contact information</p>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="custom"
                  checked={syncStrategy === 'custom'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>Custom Fields</strong>
                  <p className="text-sm">Choose specific fields to sync</p>
                </div>
              </label>
            </div>
          </div>

          {syncStrategy === 'custom' && (
            <div className="form-group">
              <label className="form-label">Select Fields to Sync</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {FIELD_OPTIONS.map((field) => (
                  <label
                    key={field}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={customFields.includes(field)}
                      onChange={() => handleFieldToggle(field)}
                      disabled={isLoading}
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="copy-info-box">
        <p className="text-sm">
          {createLink ? (
            <>
              <strong>Sync Links:</strong> Changes to synced fields will update in both workspaces.
              Conflicts will require manual resolution.
            </>
          ) : (
            <>
              <strong>One-time Copy:</strong> {selectedCount} contact
              {selectedCount !== 1 ? 's will' : ' will'} be copied to the workspace sheet. The
              original contacts will remain unchanged.
            </>
          )}
        </p>
      </div>

      {/* Notes Sharing Section */}
      {selectedWorkspaceId && totalNotesCount > 0 && (
        <div
          className="form-group"
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color-default)',
          }}
        >
          <label className="form-label">
            <input
              type="checkbox"
              checked={shareNotes}
              onChange={(e) => setShareNotes(e.target.checked)}
              disabled={isLoading}
            />
            <span style={{ marginLeft: '0.5rem' }}>Also share linked notes to workspace</span>
          </label>

          <p className="text-sm text-muted" style={{ marginLeft: '1.5rem' }}>
            <Info size={16} /> {totalNotesCount} total note{totalNotesCount !== 1 ? 's' : ''} linked
            to selected contacts
          </p>

          {shareNotes && (
            <div style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
              <label className="form-label">Note Visibility in Workspace</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="notesVisibility"
                    value="Workspace-Wide"
                    checked={notesVisibility === 'Workspace-Wide'}
                    onChange={(e) => setNotesVisibility(e.target.value)}
                    disabled={isLoading}
                  />
                  <div>
                    <strong>Workspace-Wide</strong>
                    <p className="text-sm">All workspace members can view these notes</p>
                  </div>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="notesVisibility"
                    value="Shared"
                    checked={notesVisibility === 'Shared'}
                    onChange={(e) => setNotesVisibility(e.target.value)}
                    disabled={isLoading}
                  />
                  <div>
                    <strong>Shared</strong>
                    <p className="text-sm">Share with specific workspace members</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
    </WindowTemplate>
  );
}

export default BulkCopyModal;
