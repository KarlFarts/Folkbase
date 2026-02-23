import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  validateInvitationToken,
  joinWorkspaceViaInvitation,
} from '../services/workspaceHierarchyServiceSheets';

const JoinWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const { reloadWorkspaces, switchToWorkspace } = useWorkspace();

  const [status, setStatus] = useState('validating');
  const [workspace, setWorkspace] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const hasValidated = useRef(false);

  // Validate token on mount and when dependencies change
  useEffect(() => {
    // Prevent double validation
    if (hasValidated.current) return;

    const validate = async () => {
      if (!token) {
        setStatus('invalid');
        setError('No invitation token provided');
        return;
      }

      // Validate token format (alphanumeric, dashes, underscores only, min 20 chars)
      const isValidFormat = /^[a-zA-Z0-9_-]{20,}$/.test(token);
      if (!isValidFormat) {
        setStatus('invalid');
        setError('Invalid invitation token format');
        return;
      }

      if (!user) {
        setStatus('auth_required');
        return;
      }

      if (!accessToken || !config?.sheetId) {
        setStatus('error');
        setError('Please complete setup before joining a workspace');
        return;
      }

      hasValidated.current = true;

      try {
        const result = await validateInvitationToken(
          accessToken,
          config.sheetId,
          token,
          user.email
        );

        if (!result.valid) {
          if (result.error === 'already_member') {
            setWorkspace(result.workspace);
            setStatus('already_member');
          } else {
            setStatus('invalid');
            setError(result.error);
          }
          return;
        }

        setInvitation(result.invitation);
        setWorkspace(result.workspace);
        setStatus('valid');
      } catch {
        setStatus('error');
        setError('Failed to validate invitation. Please try again.');
      }
    };

    validate();
  }, [token, user, accessToken, config]);

  const handleJoinWorkspace = async () => {
    if (!user || !workspace || !invitation || !accessToken || !config?.sheetId) return;

    setStatus('joining');
    setError('');

    try {
      const result = await joinWorkspaceViaInvitation(
        accessToken,
        config.sheetId,
        token,
        user.email
      );

      if (!result.success) {
        setStatus('error');
        setError(result.error);
        return;
      }

      await reloadWorkspaces();
      switchToWorkspace(result.workspace);
      setStatus('joined');
    } catch {
      setStatus('error');
      setError('Failed to join workspace. Please try again.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'validating':
        return (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Validating invitation...</p>
          </div>
        );

      case 'auth_required':
        return (
          <div className="join-workspace-message">
            <h2>Authentication Required</h2>
            <p>Please sign in to join this workspace.</p>
            <button onClick={() => navigate('/')} className="button-primary">
              Go to Sign In
            </button>
          </div>
        );

      case 'invalid':
      case 'error':
        return (
          <div className="join-workspace-message error">
            <h2>Unable to Join Workspace</h2>
            <p className="error-message">{error}</p>
            <button onClick={() => navigate('/workspaces')} className="button-secondary">
              Go to Workspaces
            </button>
          </div>
        );

      case 'valid':
        return (
          <div className="join-workspace-message">
            <h2>You're Invited!</h2>
            <div className="workspace-preview">
              <h3>{workspace.name}</h3>
              {workspace.description && <p>{workspace.description}</p>}
              <div className="workspace-meta">
                <div className="meta-item">
                  <strong>Owner:</strong> {workspace.owner_email}
                </div>
              </div>
            </div>
            <p>
              You'll be added as a <strong>{workspace.default_role || 'member'}</strong> with access
              to the workspace's contact list.
            </p>
            <div className="button-group">
              <button onClick={() => navigate('/workspaces')} className="button-secondary">
                Cancel
              </button>
              <button onClick={handleJoinWorkspace} className="button-primary">
                Join Workspace
              </button>
            </div>
          </div>
        );

      case 'joining':
        return (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Joining workspace...</p>
          </div>
        );

      case 'joined':
        return (
          <div className="join-workspace-message success">
            <h2>Successfully Joined!</h2>
            <p>
              You're now a member of <strong>{workspace.name}</strong>.
            </p>
            <button onClick={() => navigate('/workspaces')} className="button-primary">
              Go to Workspace Dashboard
            </button>
          </div>
        );

      case 'already_member':
        return (
          <div className="join-workspace-message">
            <h2>Already a Member</h2>
            <p>
              You're already a member of <strong>{workspace.name}</strong>.
            </p>
            <button
              onClick={() => {
                switchToWorkspace(workspace);
                navigate('/workspaces');
              }}
              className="button-primary"
            >
              Go to Workspace
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Join Workspace</h1>
      </div>

      <div className="join-workspace-container">{renderContent()}</div>
    </div>
  );
};

export default JoinWorkspace;
