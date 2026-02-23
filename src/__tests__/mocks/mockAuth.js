/**
 * Mock Authentication Layer for Development
 *
 * This module provides mock user profiles and authentication bypass for development mode.
 * When VITE_DEV_MODE is enabled, this replaces real Google OAuth authentication.
 *
 * IMPORTANT: This code only runs when VITE_DEV_MODE=true in .env
 * Production builds will use real authentication.
 */

export const mockUsers = {
  admin: {
    id: 'mock-admin-001',
    email: 'admin@dev.local',
    displayName: 'Dev Admin',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'manage_users'],
    photoURL: null,
  },
  volunteer: {
    id: 'mock-volunteer-001',
    email: 'volunteer@dev.local',
    displayName: 'Dev Volunteer',
    role: 'volunteer',
    permissions: ['read', 'write'],
    photoURL: null,
  },
  workspaceManager: {
    id: 'mock-manager-001',
    email: 'manager@dev.local',
    displayName: 'Dev Workspace Manager',
    role: 'workspace_manager',
    permissions: ['read', 'write', 'manage_contacts'],
    photoURL: null,
  },
};

// Mock access token for Google Sheets API (dev mode only)
export const MOCK_ACCESS_TOKEN = 'mock-dev-token-' + Date.now();

// LocalStorage key for persisting selected mock user
const MOCK_USER_KEY = 'dev_mock_user_role';

/**
 * Get the currently selected mock user from localStorage
 * @returns {Object} Mock user object
 */
export function getCurrentMockUser() {
  const savedRole = localStorage.getItem(MOCK_USER_KEY);
  const role = savedRole && mockUsers[savedRole] ? savedRole : 'admin';
  return mockUsers[role];
}

/**
 * Set the active mock user role
 * @param {string} role - One of: 'admin', 'volunteer', 'workspaceManager'
 */
export function setMockUserRole(role) {
  if (!mockUsers[role]) {
    return;
  }
  localStorage.setItem(MOCK_USER_KEY, role);
}

/**
 * Get the current mock user's role key
 * @returns {string} Role key (e.g., 'admin', 'volunteer', 'workspaceManager')
 */
export function getCurrentMockRole() {
  const savedRole = localStorage.getItem(MOCK_USER_KEY);
  return savedRole && mockUsers[savedRole] ? savedRole : 'admin';
}

/**
 * Check if dev mode is enabled
 * @returns {boolean} True if REACT_APP_DEV_MODE is enabled
 */
export function isDevMode() {
  return import.meta.env.VITE_DEV_MODE === 'true';
}

/**
 * Mock sign-in function (instant, no network call)
 * @returns {Promise<Object>} Mock user object
 */
export async function mockSignIn() {
  return getCurrentMockUser();
}

/**
 * Mock sign-out function
 * @returns {Promise<void>}
 */
export async function mockSignOut() {
  // In dev mode, just clear the mock user selection
  localStorage.removeItem(MOCK_USER_KEY);
}
