import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import {
  getWorkspaceChildren,
  getWorkspacePath,
  hasChildren as checkHasChildren,
} from '../utils/devModeWrapper';
import './SubWorkspaceManager.css';

/**
 * SubWorkspaceManager Component
 *
 * Displays hierarchical workspace structure with tree view.
 * Shows breadcrumbs for navigation and allows creating sub-workspaces.
 *
 * Example hierarchy:
 * Smith for Senate 2024
 * ├── Door Knocking
 * │   ├── District 1 Canvassing
 * │   └── District 2 Canvassing
 * ├── Phone Banking
 * └── Fundraising Events
 */

const SubWorkspaceManager = ({ workspace, onWorkspaceSelect }) => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { switchToWorkspace } = useWorkspace();
  const [children, setChildren] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(new Set());
  const [childrenMap, setChildrenMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaceData();
  }, [workspace, accessToken, sheetId]);

  const loadWorkspaceData = async () => {
    if (!workspace || !accessToken || !sheetId) return;

    setLoading(true);
    try {
      // Load direct children
      const directChildren = await getWorkspaceChildren(accessToken, sheetId, workspace.id);
      setChildren(directChildren);

      // Load breadcrumb path
      const path = await getWorkspacePath(accessToken, sheetId, workspace.id);
      setBreadcrumbs(path);

      // Check which children have their own children
      const childrenWithSubworkspaces = {};
      for (const child of directChildren) {
        const hasSubworkspaces = await checkHasChildren(accessToken, sheetId, child.id);
        childrenWithSubworkspaces[child.id] = hasSubworkspaces;
      }
      setChildrenMap(childrenWithSubworkspaces);
    } catch {
      // Silent failure expected
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubWorkspace = () => {
    navigate(`/workspaces/create?parent=${workspace.id}`);
  };

  const handleWorkspaceClick = (clickedWorkspace) => {
    if (onWorkspaceSelect) {
      onWorkspaceSelect(clickedWorkspace);
    } else {
      switchToWorkspace(clickedWorkspace);
      navigate('/contacts');
    }
  };

  const handleBreadcrumbClick = (breadcrumbWorkspace) => {
    if (onWorkspaceSelect) {
      onWorkspaceSelect(breadcrumbWorkspace);
    }
  };

  const toggleExpand = (workspaceId) => {
    const newExpanded = new Set(expandedWorkspaces);
    if (newExpanded.has(workspaceId)) {
      newExpanded.delete(workspaceId);
    } else {
      newExpanded.add(workspaceId);
    }
    setExpandedWorkspaces(newExpanded);
  };

  const isOwnerOrAdmin = () => {
    return workspace.owner_email === user?.email;
  };

  if (loading) {
    return (
      <div className="subworkspace-manager loading">
        <div className="loading-spinner"></div>
        <p>Loading workspace structure...</p>
      </div>
    );
  }

  return (
    <div className="subworkspace-manager">
      {breadcrumbs.length > 1 && (
        <div className="workspace-breadcrumbs">
          <nav aria-label="Workspace hierarchy breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id} className="breadcrumb-item">
                {index > 0 && <span className="breadcrumb-separator">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(crumb)}
                  className="breadcrumb-link"
                  disabled={index === breadcrumbs.length - 1}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
        </div>
      )}

      <div className="subworkspace-header">
        <div className="subworkspace-info">
          <h3>{workspace.name}</h3>
          {workspace.description && (
            <p className="workspace-description">{workspace.description}</p>
          )}
          <div className="workspace-meta">
            <span className="workspace-type-badge">{workspace.type}</span>
            {workspace.depth > 0 && (
              <span className="workspace-depth-badge">Level {workspace.depth} Sub-Workspace</span>
            )}
          </div>
        </div>

        {isOwnerOrAdmin() && (
          <button
            onClick={handleCreateSubWorkspace}
            className="btn btn-primary create-subworkspace-btn"
          >
            + Create Sub-Workspace
          </button>
        )}
      </div>

      {children.length > 0 ? (
        <div className="subworkspace-tree">
          <h4 className="tree-title">
            {workspace.depth === 0 ? 'Workspace Tasks & Workstreams' : 'Sub-Tasks'}
          </h4>
          <ul className="workspace-tree-list">
            {children.map((child) => (
              <WorkspaceTreeNode
                key={child.id}
                workspace={child}
                accessToken={accessToken}
                sheetId={sheetId}
                hasChildren={childrenMap[child.id]}
                isExpanded={expandedWorkspaces.has(child.id)}
                onToggleExpand={() => toggleExpand(child.id)}
                onWorkspaceClick={handleWorkspaceClick}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div className="empty-subworkspaces">
          <p className="empty-state-text">
            {workspace.depth === 0
              ? 'No tasks or workstreams yet. Create sub-workspaces to organize your work.'
              : 'No sub-tasks yet.'}
          </p>
          {isOwnerOrAdmin() && (
            <button onClick={handleCreateSubWorkspace} className="btn btn-secondary">
              Create First {workspace.depth === 0 ? 'Task' : 'Sub-Task'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * WorkspaceTreeNode Component
 * Renders a single node in the workspace tree with expand/collapse support
 */
const WorkspaceTreeNode = ({
  workspace,
  accessToken,
  sheetId,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onWorkspaceClick,
}) => {
  const [childWorkspaces, setChildWorkspaces] = useState([]);
  const [childrenMap, setChildrenMap] = useState({});
  const [expandedChildren, setExpandedChildren] = useState(new Set());
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (isExpanded && hasChildren && childWorkspaces.length === 0) {
      loadChildren();
    }
  }, [isExpanded]);

  const loadChildren = async () => {
    setLoadingChildren(true);
    try {
      const children = await getWorkspaceChildren(accessToken, sheetId, workspace.id);
      setChildWorkspaces(children);

      const childrenWithSubworkspaces = {};
      for (const child of children) {
        const childHasChildren = await checkHasChildren(accessToken, sheetId, child.id);
        childrenWithSubworkspaces[child.id] = childHasChildren;
      }
      setChildrenMap(childrenWithSubworkspaces);
    } catch {
      // Silent failure expected
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleChildExpand = (childId) => {
    const newExpanded = new Set(expandedChildren);
    if (newExpanded.has(childId)) {
      newExpanded.delete(childId);
    } else {
      newExpanded.add(childId);
    }
    setExpandedChildren(newExpanded);
  };

  return (
    <li className="workspace-tree-node">
      <div className="tree-node-content">
        {hasChildren && (
          <button
            onClick={onToggleExpand}
            className="tree-node-toggle"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <button onClick={() => onWorkspaceClick(workspace)} className="tree-node-link">
          <span className="tree-node-name">{workspace.name}</span>
          <span className="tree-node-type">{workspace.type}</span>
        </button>
      </div>

      {isExpanded && hasChildren && (
        <div className="tree-node-children">
          {loadingChildren ? (
            <div className="loading-children">
              <div className="loading-spinner-sm"></div>
            </div>
          ) : (
            <ul className="workspace-tree-list nested">
              {childWorkspaces.map((child) => (
                <WorkspaceTreeNode
                  key={child.id}
                  workspace={child}
                  accessToken={accessToken}
                  sheetId={sheetId}
                  hasChildren={childrenMap[child.id] || false}
                  isExpanded={expandedChildren.has(child.id)}
                  onToggleExpand={() => toggleChildExpand(child.id)}
                  onWorkspaceClick={onWorkspaceClick}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export default SubWorkspaceManager;
