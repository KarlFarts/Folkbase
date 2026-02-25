import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '../services/workspaceHierarchyServiceSheets';
import { readSheetData } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { findTouchpointFolder } from '../utils/driveFolder';

const WorkspaceDashboard = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();
  const { userWorkspaces, loading, switchToWorkspace, switchToPersonal } = useWorkspace();
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState(null);
  const [invitationToken, setInvitationToken] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [creatingInvitation, setCreatingInvitation] = useState(false);

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
      if (config?.sheetId) {
        try {
          const invitations = await getWorkspaceInvitations(
            accessToken,
            config.sheetId,
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
      // Silently fail
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewWorkspace = (workspace) => {
    switchToWorkspace(workspace);
    navigate('/contacts');
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
    if (!selectedWorkspace || !accessToken || !config?.sheetId || !user?.email) return;

    setCreatingInvitation(true);
    try {
      const invitation = await createWorkspaceInvitation(
        accessToken,
        config.sheetId,
        selectedWorkspace.id,
        { role: 'member', expiresInDays: 30 },
        user.email
      );
      setInvitationToken(invitation.token);
    } catch {
      // Silently fail
    } finally {
      setCreatingInvitation(false);
    }
  };

  const handleShareFolder = async () => {
    if (!accessToken) {
      notify.error('Please sign in first');
      return;
    }

    try {
      const folderResult = await findTouchpointFolder(accessToken);

      if (folderResult.success && folderResult.folder) {
        // Open Google Drive sharing dialog for the folder
        const shareUrl = `https://drive.google.com/drive/folders/${folderResult.folder.id}`;
        window.open(shareUrl, '_blank');
        notify.success('Opening folder in Google Drive...');
      } else {
        notify.error('Could not find Folkbase folder');
      }
    } catch (error) {
      notify.error(`Failed to open folder: ${error.message}`);
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
                  {workspaceMembers.map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-info">
                        <strong>{member.member_email}</strong>
                        <span className="member-role">{member.role}</span>
                      </div>
                      <div className="member-meta">
                        Joined{' '}
                        {member['Added Date']
                          ? new Date(member['Added Date']).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>
                  ))}
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
                      Share the Folkbase folder with workspace members to give them access to
                      the shared sheet and files.
                    </p>
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
        <button onClick={() => navigate('/workspaces/create')} className="btn btn-primary">
          + Create Workspace
        </button>
      </div>

      <div className="workspace-mode-tabs">
        <button onClick={switchToPersonal} className="tab-button">
          Personal Contacts
        </button>
        <button className="tab-button active">Workspaces</button>
      </div>

      <div className="workspaces-list">
        {userWorkspaces.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state-title">No Workspaces Yet</h2>
            <p className="empty-state-description">
              Create a workspace to collaborate with your team on contact management.
            </p>
            <div className="empty-state-actions">
              <button onClick={() => navigate('/workspaces/create')} className="btn btn-primary">
                Create Your First Workspace
              </button>
            </div>
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
                    className="btn btn-primary"
                  >
                    View
                  </button>
                  {workspace.owner_email === user?.email && (
                    <>
                      <button
                        onClick={() => handleManageWorkspace(workspace)}
                        className="btn btn-secondary"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => handleManageWorkspace(workspace)}
                        className="btn btn-secondary"
                      >
                        Invite
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDashboard;
