/**
 * Google Drive Folder Management
 *
 * Functions to create and manage the "Folkbase" folder in Google Drive.
 * This folder contains the main database sheet plus exports, backups, imports, etc.
 */

import { notifyAuthError } from './authErrorHandler.js';

export const FOLKBASE_FOLDER_NAME = 'Folkbase';

/**
 * Escape a string for safe use inside a Drive API query string literal.
 * Single quotes are the only special character in Drive query string values.
 * @param {string} value
 * @returns {string}
 */
function escapeDriveQueryString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Check if the access token has the Drive file scope
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} True if token has drive.file scope
 */
export async function hasDriveFileScope(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const tokenInfo = await response.json();
    const scopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];

    return scopes.some(
      (scope) =>
        scope === 'https://www.googleapis.com/auth/drive.file' ||
        scope === 'https://www.googleapis.com/auth/drive'
    );
  } catch (error) {
    console.error('Error checking token scopes:', error);
    return false;
  }
}

/**
 * Find existing Folkbase folder in Google Drive
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<{success: boolean, folder?: {id: string, name: string}, error?: string}>}
 */
export async function findFolkbaseFolder(accessToken) {
  try {
    const query = encodeURIComponent(
      `name = '${escapeDriveQueryString(FOLKBASE_FOLDER_NAME)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        notifyAuthError();
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
          isAuthError: true,
        };
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const folders = data.files || [];

    if (folders.length > 0) {
      return {
        success: true,
        folder: folders[0], // Use the most recently modified one
      };
    }

    return {
      success: true,
      folder: null,
    };
  } catch (error) {
    console.error('Error finding Folkbase folder:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}


/**
 * Create Folkbase folder in Google Drive
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<{success: boolean, folderId?: string, error?: string}>}
 */
export async function createFolkbaseFolder(accessToken) {
  try {
    // Pre-check: verify we have Drive scope before attempting
    const hasScope = await hasDriveFileScope(accessToken);
    if (!hasScope) {
      return {
        success: false,
        error: 'Missing Google Drive scope. Please re-authorize with Drive permissions.',
      };
    }

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLKBASE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Drive API error creating folder:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const folder = await response.json();

    return {
      success: true,
      folderId: folder.id,
    };
  } catch (error) {
    console.error('Error creating Folkbase folder:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}


/**
 * Move a file into a folder
 * @param {string} accessToken - Google OAuth access token
 * @param {string} fileId - ID of the file to move
 * @param {string} folderId - ID of the destination folder
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function moveFileToFolder(accessToken, fileId, folderId) {
  try {
    // First, get current parents
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileResponse.ok) {
      if (fileResponse.status === 401 || fileResponse.status === 403) {
        notifyAuthError();
      }
      const errorData = await fileResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${fileResponse.status}`);
    }

    const fileData = await fileResponse.json();
    const previousParents = fileData.parents ? fileData.parents.join(',') : '';

    // Move file to new folder (remove from old parents)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(folderId)}&removeParents=${encodeURIComponent(previousParents)}&fields=id,parents`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        notifyAuthError();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error moving file to folder:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get or create Folkbase folder
 * Finds existing folder or creates a new one if it doesn't exist
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<{success: boolean, folderId?: string, error?: string}>}
 */
export async function getOrCreateFolkbaseFolder(accessToken) {
  // Check for existing folder
  const findResult = await findFolkbaseFolder(accessToken);

  if (!findResult.success) {
    return {
      success: false,
      error: findResult.error,
    };
  }

  if (findResult.folder) {
    return {
      success: true,
      folderId: findResult.folder.id,
    };
  }

  // No folder exists, create one
  return await createFolkbaseFolder(accessToken);
}


/**
 * Creates a new Google Sheet for a workspace inside the Folkbase Drive folder.
 * Initializes it with all required tabs and column headers.
 *
 * @param {string} accessToken - Google OAuth token
 * @param {string} workspaceName - Name for the sheet title
 * @returns {Promise<{sheetId: string, title: string}>}
 */
export async function createWorkspaceSheet(accessToken, workspaceName) {
  const { SHEET_NAMES, SHEET_HEADERS } = await import('../config/constants.js');

  const title = `${workspaceName} - Folkbase`;

  // 1. Create the spreadsheet with required tabs
  const tabNames = [
    SHEET_NAMES.CONTACTS,
    SHEET_NAMES.TOUCHPOINTS,
    SHEET_NAMES.EVENTS,
    SHEET_NAMES.TASKS,
    SHEET_NAMES.NOTES,
    SHEET_NAMES.ORGANIZATIONS,
    SHEET_NAMES.LOCATIONS,
    SHEET_NAMES.LISTS,
    SHEET_NAMES.CONTACT_LISTS,
    SHEET_NAMES.CONTACT_NOTES,
    SHEET_NAMES.AUDIT_LOG,
    SHEET_NAMES.WORKSPACES,
    SHEET_NAMES.WORKSPACE_MEMBERS,
    SHEET_NAMES.WORKSPACE_INVITATIONS,
    SHEET_NAMES.CONTACT_LINKS,
  ];

  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: tabNames.map((name, index) => ({
        properties: { sheetId: index, title: name },
      })),
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    throw new Error(`Failed to create sheet: ${err.error?.message || createResponse.status}`);
  }

  const spreadsheet = await createResponse.json();
  const newSheetId = spreadsheet.spreadsheetId;

  // 2. Write column headers to each tab that has them defined
  const headerRequests = [];
  for (const tabName of tabNames) {
    const headers = SHEET_HEADERS[tabName];
    if (headers && headers.length > 0) {
      headerRequests.push({
        range: `'${tabName}'!A1`,
        values: [headers],
      });
    }
  }

  if (headerRequests.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values:batchUpdate`;
    const headerRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: headerRequests,
      }),
    });
    if (!headerRes.ok) {
      const errData = await headerRes.json().catch(() => ({}));
      throw new Error(
        `Failed to write column headers: ${errData.error?.message || `HTTP ${headerRes.status}`}`
      );
    }
  }

  // 3. Move into Folkbase folder
  const folderResult = await getOrCreateFolkbaseFolder(accessToken);
  if (folderResult.success && folderResult.folderId) {
    try {
      await moveFileToFolder(accessToken, newSheetId, folderResult.folderId);
    } catch (err) {
      console.error('Failed to move workspace sheet to Folkbase folder:', err);
      // Non-fatal: sheet still works, just not in the folder
    }
  }

  return { sheetId: newSheetId, title };
}
