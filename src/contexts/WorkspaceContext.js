import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import { useNotification } from './NotificationContext';
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
  const { notify } = useNotification();
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('personal'); // 'personal' or 'workspace'

  // Load user's workspaces from Google Sheets (or from localStorage cache for collaborator-only users)
  useEffect(() => {
    const loadUserWorkspaces = async () => {
      if (!user || !accessToken) {
        setUserWorkspaces([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let workspaces = [];

        if (config.personalSheetId) {
          // Normal path: user has their own personal sheet
          workspaces = await getUserWorkspaces(accessToken, config.personalSheetId, user.email);
        } else {
          // Collaborator-only path: load from known workspaces stored in localStorage
          const known = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
          for (const entry of known) {
            try {
              const ws = await getUserWorkspaces(accessToken, entry.sheetId, user.email);
              workspaces.push(...ws);
            } catch (err) {
              // User may have been removed from this workspace — skip silently
              console.error('Failed to load workspace from known entry:', entry.workspaceId, err);
            }
          }
        }

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
        notify.error('Couldn\'t load your workspaces. You can still use personal mode — try refreshing if this persists.');
      } finally {
        setLoading(false);
      }
    };

    loadUserWorkspaces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, config.personalSheetId]);

  const switchToWorkspace = useCallback((workspace) => {
    setActiveWorkspace(workspace);
    setMode('workspace');
    if (workspace) {
      const workspaceId = workspace['Workspace ID'] || workspace.id;
      localStorage.setItem('activeWorkspaceId', workspaceId);
    }
  }, []);

  const switchToPersonal = useCallback(() => {
    setActiveWorkspace(null);
    setMode('personal');
    localStorage.removeItem('activeWorkspaceId');
  }, []);

  const reloadWorkspaces = useCallback(async () => {
    if (!user || !accessToken) return;

    try {
      let workspaces = [];

      if (config.personalSheetId) {
        workspaces = await getUserWorkspaces(accessToken, config.personalSheetId, user.email);
      } else {
        const known = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
        for (const entry of known) {
          try {
            const ws = await getUserWorkspaces(accessToken, entry.sheetId, user.email);
            workspaces.push(...ws);
          } catch (err) {
            console.error('Failed to reload workspace from known entry:', entry.workspaceId, err);
          }
        }
      }

      setUserWorkspaces(workspaces);

      // Update workspace count cache
      localStorage.setItem('workspace_count', workspaces.length.toString());
    } catch (error) {
      console.error('Failed to reload workspaces:', error);
      notify.error('Couldn\'t refresh your workspace list. Try switching views or refreshing the page.');
    }
  }, [user, accessToken, config.personalSheetId, notify]);

  const getCurrentSheetId = useCallback(() => {
    if (mode === 'workspace' && activeWorkspace) {
      return activeWorkspace['Sheet ID'] || activeWorkspace.sheet_id;
    }
    return config.personalSheetId;
  }, [mode, activeWorkspace, config.personalSheetId]);

  const getWorkspaceBreadcrumbs = useCallback(
    async (workspaceId) => {
      if (!accessToken || !config.personalSheetId) return [];

      try {
        const ancestors = await getWorkspaceAncestors(
          accessToken,
          config.personalSheetId,
          workspaceId
        );
        const current = await getWorkspaceById(accessToken, config.personalSheetId, workspaceId);

        if (!current) return [];

        const sortedAncestors = ancestors.sort((a, b) => (a['Depth'] || 0) - (b['Depth'] || 0));

        return [...sortedAncestors, current].map((camp) => ({
          id: camp['Workspace ID'] || camp.id,
          name: camp['Workspace Name'] || camp.name,
          depth: camp['Depth'] || camp.depth || 0,
        }));
      } catch {
        return [];
      }
    },
    [accessToken, config.personalSheetId]
  );

  const isWorkspaceDescendant = useCallback(
    (potentialParentId, potentialChildId) => {
      const child = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === potentialChildId);
      if (!child) return false;

      const path = child['Path'] || child.path;
      if (!path) return false;

      return path.includes(`/${potentialParentId}/`) || path.startsWith(`/${potentialParentId}`);
    },
    [userWorkspaces]
  );

  const getWorkspaceChildrenInContext = useCallback(
    async (workspaceId) => {
      if (!accessToken || !config.personalSheetId) return [];

      try {
        const children = await getWorkspaceChildren(
          accessToken,
          config.personalSheetId,
          workspaceId
        );
        return children.filter((child) =>
          userWorkspaces.some(
            (uc) => (uc['Workspace ID'] || uc.id) === (child['Workspace ID'] || child.id)
          )
        );
      } catch {
        return [];
      }
    },
    [accessToken, config.personalSheetId, userWorkspaces]
  );

  const getAllSubWorkspaces = useCallback(
    (workspaceId) => {
      const subWorkspaces = [];
      const workspace = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === workspaceId);

      if (!workspace) return subWorkspaces;

      const workspacePath = workspace['Path'] || workspace.path;
      if (!workspacePath) return subWorkspaces;

      userWorkspaces.forEach((c) => {
        const cPath = c['Path'] || c.path;
        if (cPath && cPath.startsWith(`${workspacePath}/`)) {
          subWorkspaces.push(c);
        }
      });

      return subWorkspaces.sort(
        (a, b) => (a['Depth'] || a.depth || 0) - (b['Depth'] || b.depth || 0)
      );
    },
    [userWorkspaces]
  );

  const getRootWorkspaces = useCallback(() => {
    return userWorkspaces.filter((c) => {
      const parentId = c['Parent Workspace ID'] || c.parent_workspace_id;
      const depth = c['Depth'] || c.depth;
      return !parentId || depth === 0;
    });
  }, [userWorkspaces]);

  const getWorkspaceDisplayPath = useCallback(
    (workspaceId) => {
      const workspace = userWorkspaces.find((c) => (c['Workspace ID'] || c.id) === workspaceId);
      if (!workspace) return '';

      const path = workspace['Path'] || workspace.path;
      if (!path) return '';

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
    },
    [userWorkspaces]
  );

  const value = useMemo(
    () => ({
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
      getWorkspaceBreadcrumbs,
      isWorkspaceDescendant,
      getWorkspaceChildrenInContext,
      getAllSubWorkspaces,
      getRootWorkspaces,
      getWorkspaceDisplayPath,
    }),
    [
      activeWorkspace,
      userWorkspaces,
      loading,
      mode,
      switchToWorkspace,
      switchToPersonal,
      reloadWorkspaces,
      getCurrentSheetId,
      getWorkspaceBreadcrumbs,
      isWorkspaceDescendant,
      getWorkspaceChildrenInContext,
      getAllSubWorkspaces,
      getRootWorkspaces,
      getWorkspaceDisplayPath,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
