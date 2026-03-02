import { useMemo } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotification } from '../contexts/NotificationContext';
import { WORKSPACE_ROLES } from '../config/constants';

/**
 * Parses override string like "touchpoints:write,notes:write" into a Set of feature keys.
 */
function parseOverrides(overridesStr) {
  if (!overridesStr) return new Set();
  return new Set(
    overridesStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.endsWith(':write'))
      .map((s) => s.replace(':write', ''))
  );
}

/**
 * Hook that returns permission helpers based on current workspace mode and member role.
 *
 * Personal mode: all permissions granted.
 * Workspace owner/editor: all permissions granted.
 * Workspace viewer: canWrite returns false unless feature is in overrides.
 *
 * Returns:
 *   role         - 'owner' | 'editor' | 'viewer' | null (personal mode)
 *   isOwner      - boolean
 *   isEditor     - boolean
 *   isViewer     - boolean
 *   canRead()    - always true for now
 *   canWrite(feature) - boolean
 *   guardWrite(feature) - shows error toast and returns false if not permitted
 */
export function usePermissions() {
  const { mode, activeWorkspace } = useWorkspace();
  const notify = useNotification();

  return useMemo(() => {
    // Personal mode — full access
    if (mode !== 'workspace' || !activeWorkspace) {
      return {
        role: null,
        isOwner: false,
        isEditor: false,
        isViewer: false,
        canRead: () => true,
        canWrite: () => true,
        guardWrite: () => true,
      };
    }

    const role = (activeWorkspace.memberRole || '').toLowerCase();
    const overrides = parseOverrides(activeWorkspace.memberOverrides || '');

    const isOwner = role === WORKSPACE_ROLES.OWNER;
    const isEditor = role === WORKSPACE_ROLES.EDITOR;
    const isViewer = role === WORKSPACE_ROLES.VIEWER;

    const canWrite = (feature) => {
      if (isOwner || isEditor) return true;
      if (isViewer) return overrides.has(feature);
      // Unknown role — deny by default
      return false;
    };

    const guardWrite = (feature) => {
      if (canWrite(feature)) return true;
      notify.warning('You do not have permission to edit this item.');
      return false;
    };

    return {
      role,
      isOwner,
      isEditor,
      isViewer,
      canRead: () => true,
      canWrite,
      guardWrite,
    };
  }, [mode, activeWorkspace, notify]);
}
