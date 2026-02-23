/**
 * Google Drive Folder Management
 *
 * Functions to create and manage the "Folkbase" folder in Google Drive.
 * This folder contains the main database sheet plus exports, backups, imports, etc.
 */

export const TOUCHPOINT_FOLDER_NAME = 'Folkbase';

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
export async function findTouchpointFolder(accessToken) {
  try {
    const query = encodeURIComponent(
      `name = '${TOUCHPOINT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
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
    console.error('Error finding Touchpoint folder:', error);
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
export async function createTouchpointFolder(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: TOUCHPOINT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const folder = await response.json();

    return {
      success: true,
      folderId: folder.id,
    };
  } catch (error) {
    console.error('Error creating Touchpoint folder:', error);
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
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileResponse.ok) {
      const errorData = await fileResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${fileResponse.status}`);
    }

    const fileData = await fileResponse.json();
    const previousParents = fileData.parents ? fileData.parents.join(',') : '';

    // Move file to new folder (remove from old parents)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}&fields=id,parents`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
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
export async function getOrCreateTouchpointFolder(accessToken) {
  // Check for existing folder
  const findResult = await findTouchpointFolder(accessToken);

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
  return await createTouchpointFolder(accessToken);
}
