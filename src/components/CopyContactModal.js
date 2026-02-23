import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { getRootWorkspaces, getWorkspaceTree } from '../services/workspaceHierarchyServiceSheets';
import { getContactNotes } from '../utils/devModeWrapper';
import WindowTemplate from './WindowTemplate';

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

function CopyContactModal({ isOpen, onClose, contact, workspaces, onCopy }) {
  const { user, accessToken } = useAuth();
  const { activeWorkspace, mode, getCurrentSheetId } = useWorkspace();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [syncStrategy, setSyncStrategy] = useState('core_fields_only');
  const [createLink, setCreateLink] = useState(true);
  const [customFields, setCustomFields] = useState([]);
  const [workspaceTrees, setWorkspaceTrees] = useState([]); // eslint-disable-line no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Notes sharing state
  const [shareNotes, setShareNotes] = useState(false);
  const [notesVisibility, setNotesVisibility] = useState('Workspace-Wide');
  const [notesCount, setNotesCount] = useState(0);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkspaceTrees();
      loadNotesCount();
      // Reset form
      setSelectedWorkspaceId('');
      setSyncStrategy('core_fields_only');
      setCreateLink(true);
      setCustomFields([]);
      setShareNotes(false);
      setNotesVisibility('Workspace-Wide');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadNotesCount = async () => {
    if (!contact || !accessToken) return;

    try {
      setLoadingNotes(true);
      const sheetId = getCurrentSheetId();
      const notes = await getContactNotes(accessToken, sheetId, contact['Contact ID'], user?.email);
      setNotesCount(notes?.length || 0);
    } catch {
      setNotesCount(0);
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadWorkspaceTrees = async () => {
    try {
      const rootWorkspaces = await getRootWorkspaces();
      const trees = await Promise.all(rootWorkspaces.map((root) => getWorkspaceTree(root.id, 10)));
      setWorkspaceTrees(trees);
    } catch {
      // Silent failure - workspace trees not critical
    }
  };

  const handleFieldToggle = (field) => {
    if (customFields.includes(field)) {
      setCustomFields(customFields.filter((f) => f !== field));
    } else {
      setCustomFields([...customFields, field]);
    }
  };

  const selectedWorkspace = workspaces.find((c) => c.id === selectedWorkspaceId);

  const handleCopy = async () => {
    if (!selectedWorkspaceId) {
      setError('Please select a workspace');
      return;
    }

    if (syncStrategy === 'custom' && customFields.length === 0) {
      setError('Please select at least one field to sync');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Build linkConfig if creating a sync link
      let linkConfig = null;
      if (createLink) {
        const sourceWorkspaceType = mode === 'workspace' ? 'workspace' : 'personal';
        const sourceWorkspaceId = mode === 'workspace' ? activeWorkspace?.id : user.email;
        const sourceSheetId = getCurrentSheetId();

        const targetWorkspace = workspaces.find((c) => c.id === selectedWorkspaceId);

        linkConfig = {
          createLink: true,
          syncStrategy,
          customFields: syncStrategy === 'custom' ? customFields : [],
          sourceWorkspace: {
            type: sourceWorkspaceType,
            id: sourceWorkspaceId,
            sheetId: sourceSheetId,
            contactId: contact['Contact ID'],
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
            contactId: contact['Contact ID'],
          }
        : null;

      await onCopy(selectedWorkspaceId, linkConfig, notesConfig);
      setSelectedWorkspaceId('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to copy contact');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title="Copy Contact to Workspace"
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
            {isLoading ? 'Copying...' : 'Copy Contact'}
          </button>
        </>
      }
    >
      <div className="contact-info-section">
        <p className="text-sm text-muted">Copying contact:</p>
        <p className="text-base font-semibold">{contact.Name}</p>
        {contact.Email && <p className="text-sm">{contact.Email}</p>}
      </div>

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

      {selectedWorkspace && (
        <div className="workspace-info-section">
          <p className="text-sm text-muted">Workspace Details:</p>
          <div className="info-item">
            <span className="label">Name:</span>
            <span className="value">{selectedWorkspace.name}</span>
          </div>
          {selectedWorkspace.description && (
            <div className="info-item">
              <span className="label">Description:</span>
              <span className="value">{selectedWorkspace.description}</span>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={createLink}
            onChange={(e) => setCreateLink(e.target.checked)}
            disabled={isLoading}
          />
          <span style={{ marginLeft: '0.5rem' }}>
            Create sync link (changes will sync between workspaces)
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
              <strong>Sync Link:</strong> Changes to synced fields will update in both workspaces.
              Conflicts will require manual resolution.
            </>
          ) : (
            <>
              <strong>One-time Copy:</strong> A new contact will be created in the workspace sheet.
              The original contact will remain unchanged.
            </>
          )}
        </p>
      </div>

      {/* Notes Sharing Section */}
      {selectedWorkspaceId && notesCount > 0 && (
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
              disabled={isLoading || loadingNotes}
            />
            <span style={{ marginLeft: '0.5rem' }}>Also share linked notes to workspace</span>
          </label>

          {loadingNotes ? (
            <p className="text-sm text-muted" style={{ marginLeft: '1.5rem' }}>
              Loading notes...
            </p>
          ) : (
            <p className="text-sm text-muted" style={{ marginLeft: '1.5rem' }}>
              <Info size={16} /> {notesCount} note{notesCount !== 1 ? 's' : ''} linked to this
              contact
            </p>
          )}

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

export default CopyContactModal;
