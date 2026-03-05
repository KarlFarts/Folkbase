/**
 * Google Sheets Discovery Utilities
 *
 * Functions to search Google Drive for existing Folkbase sheets.
 * Used by the setup wizard to auto-detect sheets after sign-in.
 *
 * Discovery strategy:
 * 1. Look for "Folkbase" folder first
 * 2. If folder exists, look for sheets inside it (preferred)
 * 3. Fall back to root-level search for sheets (legacy/migrated sheets)
 */

import { findFolkbaseFolder } from './driveFolder';

/**
 * Check if the access token has Drive access (file or metadata scope)
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} True if token has drive.file, drive.metadata.readonly, or drive scope
 */
export async function hasDriveScope(accessToken) {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return false;
    }

    const tokenInfo = await response.json();
    const scopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];

    return scopes.some(
      (scope) =>
        scope === 'https://www.googleapis.com/auth/drive.file' ||
        scope === 'https://www.googleapis.com/auth/drive.metadata.readonly' ||
        scope === 'https://www.googleapis.com/auth/drive'
    );
  } catch (error) {
    console.error('Error checking token scopes:', error);
    return false;
  }
}

// Alias for backward compatibility
export const hasDriveMetadataScope = hasDriveScope;

/**
 * Search for sheets within a specific folder
 * @param {string} accessToken - Google OAuth access token
 * @param {string} folderId - ID of the folder to search in
 * @returns {Promise<{success: boolean, sheets: Array<{id: string, name: string, modifiedTime: string}>, error?: string}>}
 */
async function findSheetsInFolder(accessToken, folderId) {
  try {
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const sheets = data.files || [];

    return {
      success: true,
      sheets,
    };
  } catch (error) {
    console.error('Error searching for sheets in folder:', error);
    return {
      success: false,
      sheets: [],
      error: error.message,
    };
  }
}

/**
 * Search Google Drive for existing Folkbase sheets
 * Strategy: Look in Folkbase folder first, fall back to root-level search
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<{success: boolean, sheets: Array<{id: string, name: string, modifiedTime: string, inFolder?: boolean}>, folderId?: string, error?: string}>}
 */
export async function findExistingSheets(accessToken) {
  try {
    // Step 1: Look for Folkbase folder
    const folderResult = await findFolkbaseFolder(accessToken);

    if (folderResult.success && folderResult.folder) {
      // Folder exists - search for sheets inside it
      const sheetsResult = await findSheetsInFolder(accessToken, folderResult.folder.id);

      if (sheetsResult.success && sheetsResult.sheets.length > 0) {
        // Found sheets in folder - mark them as folder-based
        const sheets = sheetsResult.sheets.map((sheet) => ({
          ...sheet,
          inFolder: true,
        }));

        return {
          success: true,
          sheets,
          folderId: folderResult.folder.id,
        };
      }
    }

    // Step 2: Fall back to root-level search (legacy sheets or no folder)
    // Query: name contains "Folkbase" or "Touchpoint CRM" (legacy), is a spreadsheet, not in trash
    const query = encodeURIComponent(
      "(name contains 'Folkbase' or name contains 'Touchpoint CRM') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const sheets = (data.files || []).map((sheet) => ({
      ...sheet,
      inFolder: false,
    }));

    return {
      success: true,
      sheets,
      folderId: folderResult.success && folderResult.folder ? folderResult.folder.id : null,
    };
  } catch (error) {
    console.error('Error searching for sheets:', error);
    return {
      success: false,
      sheets: [],
      error: error.message,
    };
  }
}
