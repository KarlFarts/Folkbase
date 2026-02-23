import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
// Import Sheets-based services instead of Firestore
import {
  getWorkspaceById,
  getWorkspaceAncestors,
  getWorkspaceChildren,
  getUserWorkspaces,
} from '../services/workspaceHierarchyServiceSheets';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('personal'); // 'personal' or 'workspace'

  // Load user's workspaces from Google Sheets
  useEffect(() => {
    const loadUserWorkspaces = async () => {
      if (!user || !accessToken || !config.personalSheetId) {
        setUserWorkspaces([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get workspaces from Google Sheets where user is a member
        const workspaces = await getUserWorkspaces(accessToken, config.personalSheetId, user.email);

        setUserWorkspaces(workspaces);

        // Cache workspace count for subscription validation
        localStorage.setItem('workspace_count', workspaces.length.toString());

        // Restore active workspace from localStorage if available
        const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
        if (savedWorkspaceId) {
          const savedWorkspace = workspaces.find((c) => c['Workspace ID'] === savedWorkspaceId);
          if (savedWorkspace) {
            setActiveWorkspace(savedWorkspace);
            setMode('workspace');
          }
        }
      } catch (error) {
        console.error('Failed to load user workspaces:', error);
        // Don't block app on workspace load failure - user can still use personal mode
      } finally {
        setLoading(false);
      }
    };

    loadUserWorkspaces();
  }, [user, accessToken, config.personalSheetId]);

  // Switch to a workspace
  const switchToWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    setMode('workspace');
    if (workspace) {
      const workspaceId = workspace['Workspace ID'] || workspace.id;
      localStorage.setItem('activeWorkspaceId', workspaceId);
    }
  };

  // Switch to personal mode
  const switchToPersonal = () => {
    setActiveWorkspace(null);
    setMode('personal');
    localStorage.removeItem('activeWorkspaceId');
  };

  // Reload workspaces (after creating or joining a new one)
  const reloadWorkspaces = async () => {
    if (!user || !accessToken || !config.personalSheetId) return;

    try {
      const workspaces = await getUserWorkspaces(accessToken, config.personalSheetId, user.email);

      setUserWorkspaces(workspaces);

      // Update workspace count cache
      localStorage.setItem('workspace_count', workspaces.length.toString());
    } catch (error) {
      console.error('Failed to reload workspaces:', error);
      // Don't throw - workspace reload is a background operation
    }
  };

  // Get current sheet ID based on mode
  const getCurrentSheetId = () => {
    if (mode === 'workspace' && activeWorkspace) {
      const sheetId = activeWorkspace['Sheet ID'] || activeWorkspace.sheet_id;
      return sheetId;
    }
    // Return personal sheet ID in personal mode
    return config.personalSheetId;
  };

  // Hierarchy Helper: Get breadcrumb navigation for a workspace
  const getWorkspaceBreadcrumbs = async (workspaceId) => {
    if (!accessToken || !config.personalSheetId) return [];

    try {
      const ancestors = await getWorkspaceAncestors(
        accessToken,
        config.personalSheetId,
        workspaceId
      );
      const current = await getWorkspaceById(accessToken, config.personalSheetId, workspaceId);

      if (!current) return [];

      // Sort ancestors by depth (root first)
      const sortedAncestors = ancestors.sort((a, b) => (a['Depth'] || 0) - (b['Depth'] || 0));

      // Build breadcrumb array: ancestors + current
      return [...sortedAncestors, current].map((camp) => ({
        id: camp['Workspace ID'] || camp.id,
        name: camp['Workspace Name'] || camp.name,
        depth: camp['Depth'] || camp.depth || 0,
      }));
    } catch {
      return [];
    }
  };

  // Hierarchy Helper: Check if a workspace is a descendant of another
  const isWorkspaceDescendant = (potentialParentId, potentialChildId) => {
    const child = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === potentialChildId);
    if (!child) return false;

    const path = child['Path'] || child.path;
    if (!path) return false;

    // Check if parent ID is in the child's path
    return path.includes(`/${potentialParentId}/`) || path.startsWith(`/${potentialParentId}`);
  };

  // Hierarchy Helper: Get direct children of a workspace
  const getWorkspaceChildrenInContext = async (workspaceId) => {
    if (!accessToken || !config.personalSheetId) return [];

    try {
      const children = await getWorkspaceChildren(accessToken, config.personalSheetId, workspaceId);
      // Filter to only workspaces the user is a member of
      return children.filter((child) =>
        userWorkspaces.some(
          (uc) => (uc['Workspace ID'] || uc.id) === (child['Workspace ID'] || child.id)
        )
      );
    } catch {
      return [];
    }
  };

  // Hierarchy Helper: Get all sub-workspaces (recursive)
  const getAllSubWorkspaces = (workspaceId) => {
    const subWorkspaces = [];
    const workspace = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === workspaceId);

    if (!workspace) return subWorkspaces;

    const workspacePath = workspace['Path'] || workspace.path;
    if (!workspacePath) return subWorkspaces;

    // Find all workspaces that are descendants
    userWorkspaces.forEach((c) => {
      const cPath = c['Path'] || c.path;
      if (cPath && cPath.startsWith(`${workspacePath}/`)) {
        subWorkspaces.push(c);
      }
    });

    // Sort by depth for hierarchical display
    return subWorkspaces.sort(
      (a, b) => (a['Depth'] || a.depth || 0) - (b['Depth'] || b.depth || 0)
    );
  };

  // Hierarchy Helper: Get root workspaces (workspaces with no parent)
  const getRootWorkspaces = () => {
    return userWorkspaces.filter((c) => {
      const parentId = c['Parent Workspace ID'] || c.parent_workspace_id;
      const depth = c['Depth'] || c.depth;
      return !parentId || depth === 0;
    });
  };

  // Hierarchy Helper: Get workspace display path (e.g., "Root > Sub > Current")
  const getWorkspaceDisplayPath = (workspaceId) => {
    const workspace = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === workspaceId);
    if (!workspace) return '';

    const path = workspace['Path'] || workspace.path;
    if (!path) return '';

    // Parse path segments and build display string
    const segments = path.split('/').filter(Boolean);
    const names = segments.map((segmentId) => {
      const segmentWorkspace = userWorkspaces.find(
        (c) => (c['Workspace ID'] || c.id) === segmentId
      );
      return segmentWorkspace
        ? segmentWorkspace['Workspace Name'] || segmentWorkspace.name
        : segmentId;
    });

    return names.join(' > ');
  };

  const value = {
    activeWorkspace,
    userWorkspaces,
    loading,
    mode,
    switchToWorkspace,
    switchToPersonal,
    reloadWorkspaces,
    getCurrentSheetId,
    isPersonalMode: mode === 'personal',
    isWorkspaceMode: mode === 'workspace',
    // Hierarchy helpers
    getWorkspaceBreadcrumbs,
    isWorkspaceDescendant,
    getWorkspaceChildrenInContext,
    getAllSubWorkspaces,
    getRootWorkspaces,
    getWorkspaceDisplayPath,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
