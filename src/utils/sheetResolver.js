import { useConfig } from '../contexts/ConfigContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

/**
 * Get the active Google Sheet ID based on current mode
 * @param {Object} config - ConfigContext.config value
 * @param {Object} workspace - WorkspaceContext value
 * @returns {string|null} Active sheet ID (personalSheetId in personal mode, workspace.sheet_id in workspace mode)
 */
export function getActiveSheetId(config, workspace) {
  if (workspace.mode === 'workspace' && workspace.activeWorkspace?.sheet_id) {
    return workspace.activeWorkspace.sheet_id;
  }
  return config.personalSheetId;
}

/**
 * Hook version for easier component usage
 * Returns the currently active sheet ID based on personal/workspace mode
 * @returns {string|null} Active sheet ID
 */
export function useActiveSheetId() {
  const { config } = useConfig();
  const workspace = useWorkspace();
  return getActiveSheetId(config, workspace);
}
