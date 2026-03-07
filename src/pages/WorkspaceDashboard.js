import { useState, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import WorkspaceInvitationGenerator from '../components/WorkspaceInvitationGenerator';
import SubWorkspaceManager from '../components/SubWorkspaceManager';
import {
  getWorkspaceMembers,
  createWorkspaceInvitation,
  getWorkspaceInvitations,
  updateWorkspaceMember,
  removeWorkspaceMember,
} from '../services/workspaceHierarchyServiceSheets';
import { readSheetData } from '../utils/devModeWrapper';
import { SHEET_NAMES, WORKSPACE_ROLES, PERMISSION_FEATURES } from '../config/constants';
import { findFolkbaseFolder } from '../utils/driveFolder';
import { shareFileWithUser } from '../utils/driveSharing';

const WorkspaceDashboard = ({ onNavigate }) => {
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();
  const { userWorkspaces, loading, switchToWorkspace } = useWorkspace();
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState(null);
  const [invitationToken, setInvitationToken] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [sharingSheet, setSharingSheet] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // { id, role, overrides }

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceDetails();
    }
  }, [selectedWorkspace]);

  const loadWorkspaceDetails = async () => {
    if (!selectedWorkspace || !accessToken || !selectedWorkspace.sheet_id) return;

    setLoadingDetails(true);
    try {
      // Load members from Google Sheets
      const members = await getWorkspaceMembers(
        accessToken,
        selectedWorkspace.sheet_id,
        selectedWorkspace.id
      );
      setWorkspaceMembers(members);

      // Load contact count from the workspace's Google Sheet
      const contacts = await readSheetData(
        accessToken,
        selectedWorkspace.sheet_id,
        SHEET_NAMES.CONTACTS
      );

      setWorkspaceStats({
        contactCount: contacts?.length || 0,
        memberCount: members.length,
        lastActivity: new Date(),
      });

      // Load existing invitation or create a new one for owners/admins
      if (config?.personalSheetId) {
        try {
          const invitations = await getWorkspaceInvitations(
            accessToken,
            config.personalSheetId,
            selectedWorkspace.id
          );
          // Find an active invitation
          const activeInvitation = invitations.find((inv) => inv.is_active);
          if (activeInvitation) {
            setInvitationToken(activeInvitation.token);
          } else {
            setInvitationToken('');
          }
        } catch {
          setInvitationToken('');
        }
      }
    } catch {
      notify.error('Failed to load workspace details. Try refreshing the page.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewWorkspace = (workspace) => {
    switchToWorkspace(workspace);
    onNavigate('contacts');
  };

  const handleManageWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
  };

  const isOwnerOrAdmin = (workspace) => {
    return (
      workspace.owner_email === user?.email ||
      workspaceMembers.some((m) => m.member_email === user?.email && m.role === 'admin')
    );
  };

  const handleCreateInvitation = async () => {
    if (!selectedWorkspace || !accessToken || !config?.personalSheetId || !user?.email) return;

    setCreatingInvitation(true);
    try {
      const invitation = await createWorkspaceInvitation(
        accessToken,
        config.personalSheetId,
        selectedWorkspace.id,
        { role: 'member', expiresInDays: 30 },
        user.email
      );
      setInvitationToken(invitation.token);
    } catch {
      notify.error('Failed to generate invitation link. Please try again.');
    } finally {
      setCreatingInvitation(false);
    }
  };

  const handleShareSheetWithMembers = async () => {
    if (!selectedWorkspace || !accessToken) return;

    const sheetId = selectedWorkspace.sheet_id || selectedWorkspace['Sheet ID'];
    if (!sheetId) {
      notify.error('No sheet ID found for this workspace.');
      return;
    }

    const emails = workspaceMembers
      .map((m) => m['Member Email'] || m.member_email)
      .filter((e) => e && e !== user?.email);

    if (emails.length === 0) {
      notify.warning('No other members to share with.');
      return;
    }

    setSharingSheet(true);
    let succeeded = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        await shareFileWithUser(accessToken, sheetId, email, 'writer');
        succeeded++;
      } catch (err) {
        console.error(`Failed to share with ${email}:`, err);
        failed++;
      }
    }

    setSharingSheet(false);

    if (failed === 0) {
      notify.success(`Sheet shared with ${succeeded} member${succeeded !== 1 ? 's' : ''}.`);
    } else {
      notify.warning(
        `Shared with ${succeeded} member${succeeded !== 1 ? 's' : ''}. ${failed} failed — check console for details.`
      );
    }
  };

  const handleSaveMember = async () => {
    if (!editingMember || !selectedWorkspace?.sheet_id) return;
    try {
      const overridesStr =
        editingMember.role === WORKSPACE_ROLES.VIEWER
          ? (editingMember.overrides || []).map((f) => `${f}:write`).join(',')
          : '';
      await updateWorkspaceMember(accessToken, selectedWorkspace.sheet_id, editingMember.id, {
        role: editingMember.role,
        overrides: overridesStr,
      });
      setWorkspaceMembers((prev) =>
        prev.map((m) =>
          m['Member ID'] === editingMember.id || m.id === editingMember.id
            ? { ...m, Role: editingMember.role, role: editingMember.role, Overrides: overridesStr }
            : m
        )
      );
      setEditingMember(null);
      notify.success('Member updated.');
    } catch (err) {
      console.error('Failed to update member:', err);
      notify.error('Failed to update member. Please try again.');
    }
  };

  const handleRemoveMember = async (member) => {
    const memberId = member['Member ID'] || member.id;
    const email = member['Member Email'] || member.member_email;
    if (!memberId || !selectedWorkspace?.sheet_id) return;
    if (!window.confirm(`Remove ${email} from this workspace?`)) return;
    try {
      await removeWorkspaceMember(accessToken, selectedWorkspace.sheet_id, memberId);
      setWorkspaceMembers((prev) =>
        prev.filter((m) => (m['Member ID'] || m.id) !== memberId)
      );
      notify.success(`${email} removed from workspace.`);
    } catch (err) {
      console.error('Failed to remove member:', err);
      notify.error('Failed to remove member. Please try again.');
    }
  };

  const handleShareFolder = async () => {
    if (!accessToken) {
      notify.error('Please sign in first');
      return;
    }

    try {
      const folderResult = await findFolkbaseFolder(accessToken);

      if (folderResult.success && folderResult.folder) {
        // Open Google Drive sharing dialog for the folder
        const shareUrl = `https://drive.google.com/drive/folders/${folderResult.folder.id}`;
        window.open(shareUrl, '_blank');
        notify.success('Opening folder in Google Drive...');
      } else {
        notify.error('Could not find Folkbase folder');
      }
    } catch (error) {
      notify.error('Failed to open the Folkbase folder. Check your connection and try again.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (selectedWorkspace) {
    return (
      <div className="page-container">
        <div className="workspace-detail-header">
          <button onClick={() => setSelectedWorkspace(null)} className="btn btn-secondary btn-back">
            ← Back to Workspaces
          </button>
          <h1>{selectedWorkspace.name}</h1>
        </div>

        <div className="workspace-details">
          {loadingDetails ? (
            <div className="loading-spinner"></div>
          ) : (
            <>
              <SubWorkspaceManager
                workspace={selectedWorkspace}
                onWorkspaceSelect={setSelectedWorkspace}
              />

              <div className="workspace-info-section">
                <h2>Workspace Information</h2>
                {selectedWorkspace.description && (
                  <p className="workspace-description">{selectedWorkspace.description}</p>
                )}
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Type</strong>
                    <span>{selectedWorkspace.type}</span>
                  </div>
                  <div className="info-item">
                    <strong>Owner</strong>
                    <span>{selectedWorkspace.owner_email}</span>
                  </div>
                  <div className="info-item">
                    <strong>Status</strong>
                    <span>{selectedWorkspace.status}</span>
                  </div>
                  <div className="info-item">
                    <strong>Members</strong>
                    <span>{workspaceStats?.memberCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="workspace-members-section">
                <h2>Team Members</h2>
                <div className="members-list">
                  {workspaceMembers.map((member) => {
                    const memberId = member['Member ID'] || member.id;
                    const email = member['Member Email'] || member.member_email;
                    const role = member['Role'] || member.role || '';
                    const isEditing = editingMember?.id === memberId;
                    const isOwnerRow = email === selectedWorkspace?.owner_email;

                    return (
                      <div key={memberId} className="member-card">
                        <div className="member-info">
                          <strong>{email}</strong>
                          {isOwnerRow ? (
                            <span className="member-role member-role--owner">owner</span>
                          ) : (
                            <span className="member-role">{role}</span>
                          )}
                        </div>
                        <div className="member-meta">
                          Joined{' '}
                          {member['Added Date']
                            ? new Date(member['Added Date']).toLocaleDateString()
                            : 'N/A'}
                        </div>

                        {isOwnerOrAdmin(selectedWorkspace) && !isOwnerRow && (
                          <>
                            {isEditing ? (
                              <div className="member-edit-form">
                                <div className="member-edit-row">
                                  <label className="member-edit-label">Role</label>
                                  <select
                                    className="member-edit-select"
                                    value={editingMember.role}
                                    onChange={(e) =>
                                      setEditingMember((prev) => ({ ...prev, role: e.target.value, overrides: [] }))
                                    }
                                  >
                                    <option value={WORKSPACE_ROLES.EDITOR}>Editor</option>
                                    <option value={WORKSPACE_ROLES.VIEWER}>Viewer</option>
                                  </select>
                                </div>
                                {editingMember.role === WORKSPACE_ROLES.VIEWER && (
                                  <div className="member-edit-overrides">
                                    <label className="member-edit-label">Write access for:</label>
                                    <div className="wizard-overrides-checks">
                                      {PERMISSION_FEATURES.map((feat) => (
                                        <label key={feat} className="wizard-override-check">
                                          <input
                                            type="checkbox"
                                            checked={(editingMember.overrides || []).includes(feat)}
                                            onChange={(e) => {
                                              const next = e.target.checked
                                                ? [...(editingMember.overrides || []), feat]
                                                : (editingMember.overrides || []).filter((f) => f !== feat);
                                              setEditingMember((prev) => ({ ...prev, overrides: next }));
                                            }}
                                          />
                                          {feat}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="member-edit-actions">
                                  <button className="btn btn-primary btn-sm" onClick={handleSaveMember}>
                                    Save
                                  </button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingMember(null)}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="member-card-actions">
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    const currentOverrides = (member['Overrides'] || member.memberOverrides || '')
                                      .split(',')
                                      .map((s) => s.replace(':write', '').trim())
                                      .filter(Boolean);
                                    setEditingMember({ id: memberId, role, overrides: currentOverrides });
                                  }}
                                >
                                  Edit Role
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isOwnerOrAdmin(selectedWorkspace) && (
                <>
                  <div className="workspace-invitations-section">
                    <h2>Invite Team Members</h2>
                    {invitationToken ? (
                      <WorkspaceInvitationGenerator
                        workspace={selectedWorkspace}
                        token={invitationToken}
                        sheetId={config.personalSheetId || config.personalSheetId}
                      />
                    ) : (
                      <div className="create-invitation-prompt">
                        <p>Create an invitation link to allow others to join this workspace.</p>
                        <button
                          onClick={handleCreateInvitation}
                          className="btn btn-primary"
                          disabled={creatingInvitation}
                        >
                          {creatingInvitation ? 'Creating...' : 'Generate Invitation Link'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="workspace-folder-section">
                    <h2>Collaborate with Google Drive</h2>
                    <p className="text-muted ws-folder-desc">
                      Share the workspace sheet directly with members so they can access it, or
                      open the Folkbase folder to manage sharing manually.
                    </p>
                    <div className="ws-folder-actions">
                      <button
                        onClick={handleShareSheetWithMembers}
                        className="btn btn-primary ws-folder-btn"
                        disabled={sharingSheet || workspaceMembers.length <= 1}
                        title="Grant all workspace members write access to the sheet via Drive API"
                      >
                        {sharingSheet ? 'Sharing...' : 'Share Sheet with All Members'}
                      </button>
                      <button
                        onClick={handleShareFolder}
                        className="btn btn-secondary ws-folder-btn"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          <line x1="12" y1="11" x2="12" y2="17" />
                          <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        Open Folkbase Folder
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="button-group">
                <button
                  onClick={() => handleViewWorkspace(selectedWorkspace)}
                  className="btn btn-primary"
                >
                  View Workspace Contacts
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Workspaces</h1>
        <button onClick={() => onNavigate('create-workspace')} className="btn btn-primary btn-sm">
          + Create Workspace
        </button>
      </div>

      {userWorkspaces.length === 0 ? (
        <div className="workspace-empty-state">
          <h2>No Workspaces Yet</h2>
          <p>
            Workspaces let you collaborate with your team on shared contacts. Create one to get
            started, or ask a teammate to invite you.
          </p>
          <button onClick={() => onNavigate('create-workspace')} className="btn btn-primary">
            Create Your First Workspace
          </button>
        </div>
      ) : (
        <div className="workspaces-grid">
          {userWorkspaces.map((workspace) => (
            <div key={workspace.id} className="workspace-card">
              <div className="workspace-card-header">
                <h3>{workspace.name}</h3>
                <span className="workspace-type-badge">{workspace.type}</span>
              </div>

              {workspace.description && (
                <p className="workspace-card-description">{workspace.description}</p>
              )}

              <div className="workspace-card-stats">
                <div className="stat">
                  <strong>Owner:</strong> {workspace.owner_email}
                </div>
              </div>

              <div className="workspace-card-actions">
                <button
                  onClick={() => handleViewWorkspace(workspace)}
                  className="btn btn-primary btn-sm"
                >
                  View
                </button>
                {workspace.owner_email === user?.email && (
                  <button
                    onClick={() => handleManageWorkspace(workspace)}
                    className="btn btn-secondary btn-sm"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceDashboard;
