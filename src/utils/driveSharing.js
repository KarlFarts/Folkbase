import { isDevMode } from './devModeWrapper';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Share a Drive file with a user by email.
 * @param {string} accessToken
 * @param {string} fileId - Google Drive file (spreadsheet) ID
 * @param {string} email - Recipient email
 * @param {'writer'|'reader'|'commenter'} role - Drive permission role
 */
export async function shareFileWithUser(accessToken, fileId, email, role = 'writer') {
  if (isDevMode()) {
    return { success: true };
  }

  const res = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress: email,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('Drive shareFileWithUser failed:', res.status, body);
    throw new Error(body?.error?.message || `Drive sharing failed (${res.status})`);
  }

  return { success: true };
}

/**
 * List all permissions on a Drive file.
 * @param {string} accessToken
 * @param {string} fileId
 * @returns {Promise<Array>} Array of permission objects
 */
export async function listFilePermissions(accessToken, fileId) {
  if (isDevMode()) {
    return [];
  }

  const res = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,emailAddress,role,type)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('Drive listFilePermissions failed:', res.status, body);
    throw new Error(body?.error?.message || `Failed to list permissions (${res.status})`);
  }

  const data = await res.json();
  return data.permissions || [];
}

/**
 * Remove sharing for a specific user from a Drive file.
 * Looks up the permission ID by email then deletes it.
 * @param {string} accessToken
 * @param {string} fileId
 * @param {string} email
 */
export async function removeFileSharing(accessToken, fileId, email) {
  if (isDevMode()) {
    return { success: true };
  }

  const permissions = await listFilePermissions(accessToken, fileId);
  const perm = permissions.find(
    (p) => p.emailAddress?.toLowerCase() === email.toLowerCase() && p.type === 'user'
  );

  if (!perm) {
    return { success: true }; // Already not shared
  }

  const res = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(perm.id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    console.error('Drive removeFileSharing failed:', res.status, body);
    throw new Error(body?.error?.message || `Failed to remove sharing (${res.status})`);
  }

  return { success: true };
}
