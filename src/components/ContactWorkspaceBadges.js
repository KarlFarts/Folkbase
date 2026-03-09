import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Unlink } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotification } from '../contexts/NotificationContext';
import { getAllLinkedWorkspaces, unlinkContact } from '../services/contactLinkService';
import ConfirmDialog from './ConfirmDialog';
import './ContactWorkspaceBadges.css';

/**
 * ContactWorkspaceBadges Component
 *
 * Displays badges showing which workspaces a contact exists in.
 * Shows sync conflict warnings and allows navigation to other workspaces.
 *
 * Props:
 * - workspaceType: 'personal' or 'workspace'
 * - workspaceId: user email or workspace ID
 * - contactId: Contact ID
 * - onWorkspaceChange: Callback when user navigates to another workspace
 */

const ContactWorkspaceBadges = ({
  workspaceType,
  workspaceId,
  contactId,
  onWorkspaceChange,
  onConflictClick,
}) => {
  const navigate = useNavigate();
  const { switchToWorkspace, switchToPersonal } = useWorkspace();
  const { notify } = useNotification();
  const [linkedWorkspaces, setLinkedWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(null);
  const [confirmUnlink, setConfirmUnlink] = useState(null);

  useEffect(() => {
    loadLinkedWorkspaces();
  }, [workspaceType, workspaceId, contactId]);

  const loadLinkedWorkspaces = async () => {
    if (!contactId) return;

    setLoading(true);
    try {
      const workspaces = await getAllLinkedWorkspaces(workspaceType, workspaceId, contactId);
      setLinkedWorkspaces(workspaces);
    } catch {
      notify.error('Failed to load linked workspaces. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceClick = (workspace) => {
    if (workspace.type === 'personal') {
      switchToPersonal();
    } else {
      // Would need to fetch full workspace object here
      switchToWorkspace({
        id: workspace.id,
        name: workspace.name,
        sheet_id: workspace.sheetId,
      });
    }

    if (onWorkspaceChange) {
      onWorkspaceChange(workspace);
    }

    navigate(`/contacts/${workspace.contactId}`);
  };

  const handleUnlink = (workspace, e) => {
    e.stopPropagation();
    setConfirmUnlink(workspace);
  };

  const handleConfirmUnlink = async () => {
    const workspace = confirmUnlink;
    setConfirmUnlink(null);
    setUnlinking(workspace.linkId);
    try {
      await unlinkContact(workspace.linkId);
      notify.success(`Unlinked from ${workspace.name}`);
      await loadLinkedWorkspaces();
    } catch {
      notify.error('Failed to unlink contact. Please try again.');
    } finally {
      setUnlinking(null);
    }
  };

  const handleConflictClick = (workspace, e) => {
    e.stopPropagation();
    if (onConflictClick) {
      onConflictClick(workspace.linkId);
    }
  };

  if (loading) {
    return (
      <div className="contact-workspace-badges loading">
        <div className="loading-spinner-sm"></div>
        <span className="loading-text">Loading linked workspaces...</span>
      </div>
    );
  }

  if (linkedWorkspaces.length === 0) {
    return null;
  }

  return (
    <>
    <ConfirmDialog
      isOpen={!!confirmUnlink}
      onConfirm={handleConfirmUnlink}
      onCancel={() => setConfirmUnlink(null)}
      title="Remove Sync Link"
      message={`Remove sync link with ${confirmUnlink?.name}? Changes will no longer sync between workspaces.`}
      confirmLabel="Remove"
    />
    <div className="contact-workspace-badges">
      <div className="badges-header">
        <h4 className="badges-title">Also in:</h4>
        <span className="badges-count">{linkedWorkspaces.length}</span>
      </div>

      <div className="badges-list">
        {linkedWorkspaces.map((workspace) => (
          <div
            key={workspace.linkId}
            className={`workspace-badge ${workspace.hasConflict ? 'has-conflict' : ''}`}
          >
            <button
              onClick={() => handleWorkspaceClick(workspace)}
              className="badge-content"
              title={`View in ${workspace.name}`}
            >
              <span className="badge-name">{workspace.name}</span>
              <ExternalLink size={14} className="badge-icon" />
            </button>

            {workspace.hasConflict && (
              <button
                onClick={(e) => handleConflictClick(workspace, e)}
                className="badge-conflict-indicator"
                title="Sync conflict detected"
              >
                <AlertTriangle size={16} />
              </button>
            )}

            <button
              onClick={(e) => handleUnlink(workspace, e)}
              className="badge-unlink-btn"
              disabled={unlinking === workspace.linkId}
              title="Remove sync link"
            >
              {unlinking === workspace.linkId ? (
                <div className="loading-spinner-sm"></div>
              ) : (
                <Unlink size={14} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

export default ContactWorkspaceBadges;
