/**
 * Workspace Hierarchy Service - Google Sheets Implementation
 *
 * Manages hierarchical workspace structures with unlimited nesting.
 * Example: "Smith for Senate" → "Door Knocking" → "District 5 Canvassing"
 *
 * Uses materialized path pattern for efficient tree queries:
 * - path: "/parent-id/child-id/grandchild-id"
 * - depth: 0 (root), 1 (sub-workspace), 2 (sub-sub-workspace), etc.
 *
 * This is the Google Sheets implementation.
 * For dev mode, import from devModeWrapper.js instead.
 */

import { SHEET_NAMES } from '../config/constants';
import { readSheetData, appendRow, updateRow, logAuditEntry } from '../utils/devModeWrapper';
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

/**
 * Generate a secure random invitation token
 * @returns {string} 32-character hex token
 */
export function generateInvitationToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate unique Workspace ID (WS-xxxxxxxx)
 */
export async function generateWorkspaceID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.WORKSPACE);
}

/**
 * Generate unique Member ID (MEM-xxxxxxxx)
 */
export async function generateMemberID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.MEMBER);
}

/**
 * Get workspace by ID
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<object|null>} Workspace object or null if not found
 */
export async function getWorkspaceById(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  return data.find((row) => row['Workspace ID'] === workspaceId) || null;
}

/**
 * Create a sub-workspace under a parent workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} parentWorkspaceId - Parent workspace ID
 * @param {object} workspaceData - Workspace details (name, description, type, etc.)
 * @param {string} userEmail - Email of user creating the workspace
 * @returns {Promise<object>} Created workspace with ID
 */
export async function createSubWorkspace(
  accessToken,
  sheetId,
  parentWorkspaceId,
  workspaceData,
  userEmail
) {
  // Get parent workspace
  const parent = await getWorkspaceById(accessToken, sheetId, parentWorkspaceId);

  if (!parent) {
    throw new Error('Parent workspace not found');
  }

  // Check for circular dependency
  if (parent['Path'] && parent['Path'].includes(workspaceData.id)) {
    throw new Error('Circular parent relationship detected');
  }

  // Generate Workspace ID
  const workspaceId = await generateWorkspaceID(accessToken, sheetId);

  // Build materialized path
  const parentPath = parent['Path'] || `/${parentWorkspaceId}`;
  const newPath = `${parentPath}/${workspaceId}`;
  const newDepth = (parent['Depth'] || 0) + 1;

  // Prepare row data
  const createdDate = new Date().toISOString();
  const values = [
    workspaceId,
    workspaceData.name,
    parentWorkspaceId,
    newPath,
    workspaceData.sheetId || '',
    createdDate,
    userEmail,
    workspaceData.status || 'active',
    workspaceData.description || '',
  ];

  // Append to Workspaces sheet
  await appendRow(accessToken, sheetId, SHEET_NAMES.WORKSPACES, values);

  // Log to Audit Log
  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Created',
    oldValue: '',
    newValue: workspaceData.name,
    userEmail,
  });

  return {
    id: workspaceId,
    name: workspaceData.name,
    parent_workspace_id: parentWorkspaceId,
    path: newPath,
    depth: newDepth,
    sheet_id: workspaceData.sheetId || '',
    created_at: createdDate,
    created_by: userEmail,
    status: workspaceData.status || 'active',
    description: workspaceData.description || '',
  };
}

/**
 * Create a root workspace (no parent)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {object} workspaceData - Workspace details
 * @param {string} userEmail - Email of user creating the workspace
 * @returns {Promise<object>} Created workspace with ID
 */
export async function createRootWorkspace(accessToken, sheetId, workspaceData, userEmail) {
  const workspaceId = await generateWorkspaceID(accessToken, sheetId);
  const createdDate = new Date().toISOString();
  const path = `/${workspaceId}`;

  const values = [
    workspaceId,
    workspaceData.name,
    '', // No parent
    path,
    workspaceData.sheetId || '',
    createdDate,
    userEmail,
    workspaceData.status || 'active',
    workspaceData.description || '',
  ];

  await appendRow(accessToken, sheetId, SHEET_NAMES.WORKSPACES, values);

  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Created',
    oldValue: '',
    newValue: workspaceData.name,
    userEmail,
  });

  return {
    id: workspaceId,
    name: workspaceData.name,
    parent_workspace_id: null,
    path: path,
    depth: 0,
    sheet_id: workspaceData.sheetId || '',
    created_at: createdDate,
    created_by: userEmail,
    status: workspaceData.status || 'active',
    description: workspaceData.description || '',
  };
}

/**
 * Get all direct children of a workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<array>} Array of child workspaces
 */
export async function getWorkspaceChildren(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  return data.filter((row) => row['Parent Workspace ID'] === workspaceId);
}

/**
 * Get breadcrumb path from root to workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<array>} Array of workspaces from root to current [root, parent, current]
 */
export async function getWorkspacePath(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  const workspace = data.find((c) => c['Workspace ID'] === workspaceId);

  if (!workspace) return [];

  const breadcrumb = [workspace];
  let currentId = workspace['Parent Workspace ID'];

  while (currentId) {
    const parent = data.find((c) => c['Workspace ID'] === currentId);
    if (!parent) break;
    breadcrumb.unshift(parent);
    currentId = parent['Parent Workspace ID'];
  }

  return breadcrumb;
}

/**
 * Get full workspace tree starting from a root workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} rootWorkspaceId - Root workspace ID
 * @param {number} maxDepth - Maximum depth to fetch (default: 10)
 * @returns {Promise<object>} Tree structure with nested children
 */
export async function getWorkspaceTree(accessToken, sheetId, rootWorkspaceId, maxDepth = 10) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  const root = data.find((c) => c['Workspace ID'] === rootWorkspaceId);

  if (!root) return null;

  const buildTree = (workspace, currentDepth = 0) => {
    if (currentDepth >= maxDepth) {
      return { ...workspace, children: [], hasMore: true };
    }

    const children = data
      .filter((c) => c['Parent Workspace ID'] === workspace['Workspace ID'])
      .map((child) => buildTree(child, currentDepth + 1));

    return { ...workspace, children };
  };

  return buildTree(root);
}

/**
 * Delete workspace and all descendants recursively
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID to delete
 * @param {string} userEmail - Email of user deleting the workspace
 * @returns {Promise<number>} Number of workspaces deleted
 */
export async function deleteWorkspaceRecursive(accessToken, sheetId, workspaceId, userEmail) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  let deleteCount = 0;

  const deleteWithChildren = async (id) => {
    const children = data.filter((c) => c['Parent Workspace ID'] === id);

    // Recursively delete children first
    for (const child of children) {
      await deleteWithChildren(child['Workspace ID']);
    }

    // Delete workspace members
    const { data: members } = await readSheetData(
      accessToken,
      sheetId,
      SHEET_NAMES.WORKSPACE_MEMBERS
    );
    const workspaceMembers = members.filter((m) => m['Workspace ID'] === id);

    workspaceMembers.forEach(() => {
      // Delete member row (we need to rebuild the sheet without this row)
      // For now, we'll mark the row for deletion by clearing it
      // A better approach would be to use batchUpdate to delete rows
    });

    // Find and delete the workspace row
    const workspaceIndex = data.findIndex((c) => c['Workspace ID'] === id);
    if (workspaceIndex !== -1) {
      const workspace = data[workspaceIndex];

      // Log deletion
      await logAuditEntry(accessToken, sheetId, {
        contactId: '',
        contactName: '',
        fieldChanged: 'Workspace Deleted',
        oldValue: workspace['Workspace Name'],
        newValue: '',
        userEmail,
      });

      // Note: Actual row deletion requires batchUpdate API
      // For now, we'll clear the row
      const rowIndex = workspace._rowIndex;
      if (rowIndex) {
        await updateRow(accessToken, sheetId, SHEET_NAMES.WORKSPACES, rowIndex, [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      }

      deleteCount++;
    }
  };

  await deleteWithChildren(workspaceId);
  return deleteCount;
}

/**
 * Move a workspace to a new parent (re-parent)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace to move
 * @param {string} newParentId - New parent workspace ID (null for root)
 * @param {string} userEmail - Email of user moving the workspace
 * @returns {Promise<object>} Updated workspace
 */
export async function moveWorkspace(accessToken, sheetId, workspaceId, newParentId, userEmail) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  const workspace = data.find((c) => c['Workspace ID'] === workspaceId);

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  let newPath, newDepth;

  if (newParentId === null) {
    // Moving to root
    newPath = `/${workspaceId}`;
    newDepth = 0;
  } else {
    // Moving to new parent
    const newParent = data.find((c) => c['Workspace ID'] === newParentId);

    if (!newParent) {
      throw new Error('New parent workspace not found');
    }

    // Check for circular dependency
    if (newParent['Path'] && newParent['Path'].includes(workspaceId)) {
      throw new Error('Cannot move workspace to its own descendant');
    }

    newPath = `${newParent['Path'] || `/${newParentId}`}/${workspaceId}`;
    newDepth = (newParent['Depth'] || 0) + 1;
  }

  // Update the workspace row
  const rowIndex = workspace._rowIndex;
  if (rowIndex) {
    const updatedValues = [
      workspace['Workspace ID'],
      workspace['Workspace Name'],
      newParentId || '',
      newPath,
      workspace['Sheet ID'],
      workspace['Created Date'],
      workspace['Created By'],
      workspace['Status'],
      workspace['Description'],
    ];

    await updateRow(accessToken, sheetId, SHEET_NAMES.WORKSPACES, rowIndex, updatedValues);

    // Log the change
    await logAuditEntry(accessToken, sheetId, {
      contactId: '',
      contactName: '',
      fieldChanged: 'Workspace Moved',
      oldValue: workspace['Parent Workspace ID'] || 'root',
      newValue: newParentId || 'root',
      userEmail,
    });
  }

  return {
    id: workspaceId,
    ...workspace,
    parent_workspace_id: newParentId,
    path: newPath,
    depth: newDepth,
  };
}

/**
 * Get all root workspaces (workspaces with no parent)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<array>} Array of root workspaces
 */
export async function getRootWorkspaces(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  return data.filter((c) => !c['Parent Workspace ID']);
}

/**
 * Check if workspace has any children
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<boolean>} True if workspace has children
 */
export async function hasChildren(accessToken, sheetId, workspaceId) {
  const children = await getWorkspaceChildren(accessToken, sheetId, workspaceId);
  return children.length > 0;
}

/**
 * Get all ancestor workspaces from root to parent (excluding current workspace)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<array>} Array of ancestor workspaces from root to parent
 */
export async function getWorkspaceAncestors(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  const workspace = data.find((c) => c['Workspace ID'] === workspaceId);

  if (!workspace) return [];

  const ancestors = [];
  let currentId = workspace['Parent Workspace ID'];

  while (currentId) {
    const parent = data.find((c) => c['Workspace ID'] === currentId);
    if (!parent) break;
    ancestors.unshift(parent);
    currentId = parent['Parent Workspace ID'];
  }

  return ancestors;
}

/**
 * Add a member to a workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @param {string} memberEmail - Member's email
 * @param {string} role - Member role (owner, admin, viewer, etc.)
 * @param {string} userEmail - Email of user adding the member
 * @returns {Promise<object>} Created member with ID
 */
export async function addWorkspaceMember(
  accessToken,
  sheetId,
  workspaceId,
  memberEmail,
  role,
  userEmail,
  overrides = ''
) {
  const memberId = await generateMemberID(accessToken, sheetId);
  const addedDate = new Date().toISOString();

  const values = [memberId, workspaceId, memberEmail, role, addedDate, userEmail, overrides];

  await appendRow(accessToken, sheetId, SHEET_NAMES.WORKSPACE_MEMBERS, values);

  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Member Added',
    oldValue: '',
    newValue: `${memberEmail} (${role})`,
    userEmail,
  });

  return {
    id: memberId,
    workspace_id: workspaceId,
    member_email: memberEmail,
    role: role,
    added_date: addedDate,
    added_by: userEmail,
  };
}

/**
 * Get all members of a workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<array>} Array of workspace members
 */
export async function getWorkspaceMembers(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACE_MEMBERS);
  return data.filter((row) => row['Workspace ID'] === workspaceId);
}

/**
 * Update a workspace member's role and/or overrides.
 */
export async function updateWorkspaceMember(accessToken, sheetId, memberId, updates) {
  const { data, rowMap } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_MEMBERS
  );
  const member = data.find((m) => m['Member ID'] === memberId);
  if (!member) throw new Error(`Member ${memberId} not found`);

  const rowIndex = rowMap?.[memberId];
  if (!rowIndex) throw new Error(`Row index for member ${memberId} not found`);

  const updatedValues = [
    member['Member ID'],
    member['Workspace ID'],
    member['Member Email'],
    updates.role !== undefined ? updates.role : member['Role'],
    member['Added Date'],
    member['Added By'],
    updates.overrides !== undefined ? updates.overrides : (member['Overrides'] || ''),
  ];

  await updateRow(accessToken, sheetId, SHEET_NAMES.WORKSPACE_MEMBERS, rowIndex, updatedValues);
  return { ...member, Role: updatedValues[3], Overrides: updatedValues[6] };
}

/**
 * Remove a workspace member by clearing their row (sets role to empty).
 */
export async function removeWorkspaceMember(accessToken, sheetId, memberId) {
  const { data, rowMap } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_MEMBERS
  );
  const member = data.find((m) => m['Member ID'] === memberId);
  if (!member) throw new Error(`Member ${memberId} not found`);

  const rowIndex = rowMap?.[memberId];
  if (!rowIndex) throw new Error(`Row index for member ${memberId} not found`);

  // Clear role to mark as removed
  const clearedValues = [
    member['Member ID'],
    member['Workspace ID'],
    member['Member Email'],
    '', // Role cleared
    member['Added Date'],
    member['Added By'],
    '',
  ];

  await updateRow(accessToken, sheetId, SHEET_NAMES.WORKSPACE_MEMBERS, rowIndex, clearedValues);
  return { success: true };
}

/**
 * Get all workspaces a user is a member of
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} userEmail - User's email
 * @returns {Promise<array>} Array of workspaces with member role
 */
export async function getUserWorkspaces(accessToken, sheetId, userEmail) {
  const { data: members } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_MEMBERS
  );
  const userMemberships = members.filter((m) => m['Member Email'] === userEmail);

  const { data: workspaces } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);

  return userMemberships.map((membership) => {
    const workspace = workspaces.find((c) => c['Workspace ID'] === membership['Workspace ID']);
    return {
      ...workspace,
      memberRole: membership['Role'],
      memberOverrides: membership['Overrides'] || '',
    };
  });
}

// ============================================================================
// WORKSPACE INVITATION SYSTEM
// ============================================================================

/**
 * Generate unique Invitation ID (INV-xxxxxxxx)
 */
export async function generateInvitationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.INVITATION);
}

/**
 * Create a workspace invitation
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID (central sheet)
 * @param {string} workspaceId - Workspace ID to invite to
 * @param {object} options - Invitation options
 * @param {string} options.role - Role for invited users (default: 'member')
 * @param {number} options.maxUses - Maximum uses (null = unlimited)
 * @param {number} options.expiresInDays - Days until expiration (default: 30)
 * @param {string} createdBy - Email of user creating the invitation
 * @returns {Promise<object>} Created invitation with token
 */
export async function createWorkspaceInvitation(
  accessToken,
  sheetId,
  workspaceId,
  options = {},
  createdBy
) {
  const invitationId = await generateInvitationID(accessToken, sheetId);
  const token = generateInvitationToken();
  const createdDate = new Date().toISOString();

  // Calculate expiration date
  const expiresInDays = options.expiresInDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const values = [
    invitationId,
    workspaceId,
    token,
    createdBy,
    createdDate,
    expiresAt.toISOString(),
    options.maxUses || '', // Empty = unlimited
    '0', // Current uses starts at 0
    options.role || 'editor',
    'TRUE', // Is Active
    options.defaultOverrides || '',
  ];

  await appendRow(accessToken, sheetId, SHEET_NAMES.WORKSPACE_INVITATIONS, values);

  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Invitation Created',
    oldValue: '',
    newValue: `Invitation for ${workspaceId}`,
    userEmail: createdBy,
  });

  return {
    id: invitationId,
    workspace_id: workspaceId,
    token,
    created_by: createdBy,
    created_at: createdDate,
    expires_at: expiresAt.toISOString(),
    max_uses: options.maxUses || null,
    current_uses: 0,
    role: options.role || 'member',
    is_active: true,
  };
}

/**
 * Validate an invitation token
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} token - Invitation token to validate
 * @param {string} userEmail - Email of user trying to join
 * @returns {Promise<object>} Validation result { valid, invitation, workspace, error }
 */
export async function validateInvitationToken(accessToken, sheetId, token, userEmail) {
  // Find invitation by token
  const { data: invitations } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_INVITATIONS
  );
  const invitation = invitations.find((inv) => inv['Token'] === token);

  if (!invitation) {
    return { valid: false, error: 'Invalid invitation token' };
  }

  // Check if active
  if (invitation['Is Active'] !== 'TRUE') {
    return { valid: false, error: 'This invitation link has been deactivated' };
  }

  // Check expiration
  const expiresAt = new Date(invitation['Expires At']);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'This invitation link has expired' };
  }

  // Check max uses
  const maxUses = invitation['Max Uses'] ? parseInt(invitation['Max Uses'], 10) : null;
  const currentUses = parseInt(invitation['Current Uses'] || '0', 10);
  if (maxUses && currentUses >= maxUses) {
    return { valid: false, error: 'This invitation link has reached its maximum number of uses' };
  }

  // Get workspace details
  const workspaceId = invitation['Workspace ID'];
  const { data: workspaces } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACES);
  const workspace = workspaces.find((c) => c['Workspace ID'] === workspaceId);

  if (!workspace) {
    return { valid: false, error: 'Workspace not found' };
  }

  // Check if user is already a member
  const { data: members } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_MEMBERS
  );
  const existingMember = members.find(
    (m) => m['Workspace ID'] === workspaceId && m['Member Email'] === userEmail
  );

  if (existingMember) {
    return {
      valid: false,
      error: 'already_member',
      workspace: {
        id: workspace['Workspace ID'],
        name: workspace['Workspace Name'],
        description: workspace['Description'],
        type: workspace['Type'] || 'general',
        owner_email: workspace['Created By'],
      },
    };
  }

  return {
    valid: true,
    invitation: {
      id: invitation['Invitation ID'],
      workspace_id: workspaceId,
      role: invitation['Role'] || 'member',
      _rowIndex: invitation._rowIndex,
    },
    workspace: {
      id: workspace['Workspace ID'],
      name: workspace['Workspace Name'],
      description: workspace['Description'],
      type: workspace['Type'] || 'general',
      owner_email: workspace['Created By'],
      sheet_id: workspace['Sheet ID'],
      default_role: invitation['Role'] || 'member',
    },
  };
}

/**
 * Join a workspace using an invitation token
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} token - Invitation token
 * @param {string} userEmail - Email of user joining
 * @returns {Promise<object>} Result { success, workspace, error }
 */
export async function joinWorkspaceViaInvitation(accessToken, sheetId, token, userEmail) {
  // Validate the token first
  const validation = await validateInvitationToken(accessToken, sheetId, token, userEmail);

  if (!validation.valid) {
    return { success: false, error: validation.error, workspace: validation.workspace };
  }

  const { invitation, workspace } = validation;

  // Add user as workspace member (carry over default overrides from invitation)
  await addWorkspaceMember(
    accessToken,
    sheetId,
    invitation.workspace_id,
    userEmail,
    invitation.role,
    userEmail, // Added by themselves via invitation
    invitation['Default Overrides'] || ''
  );

  // Increment invitation uses
  const { data: invitations } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_INVITATIONS
  );
  const invitationRow = invitations.find((inv) => inv['Invitation ID'] === invitation.id);

  if (invitationRow && invitationRow._rowIndex) {
    const currentUses = parseInt(invitationRow['Current Uses'] || '0', 10);
    const updatedValues = [
      invitationRow['Invitation ID'],
      invitationRow['Workspace ID'],
      invitationRow['Token'],
      invitationRow['Created By'],
      invitationRow['Created Date'],
      invitationRow['Expires At'],
      invitationRow['Max Uses'],
      String(currentUses + 1), // Increment current uses
      invitationRow['Role'],
      invitationRow['Is Active'],
    ];

    await updateRow(
      accessToken,
      sheetId,
      SHEET_NAMES.WORKSPACE_INVITATIONS,
      invitationRow._rowIndex,
      updatedValues
    );
  }

  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Joined via Invitation',
    oldValue: '',
    newValue: `${userEmail} joined ${workspace.name}`,
    userEmail,
  });

  return {
    success: true,
    workspace,
  };
}

/**
 * Deactivate an invitation (revoke it)
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} invitationId - Invitation ID to deactivate
 * @param {string} userEmail - Email of user deactivating
 * @returns {Promise<boolean>} Success
 */
export async function deactivateInvitation(accessToken, sheetId, invitationId, userEmail) {
  const { data: invitations } = await readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_INVITATIONS
  );
  const invitation = invitations.find((inv) => inv['Invitation ID'] === invitationId);

  if (!invitation || !invitation._rowIndex) {
    throw new Error('Invitation not found');
  }

  const updatedValues = [
    invitation['Invitation ID'],
    invitation['Workspace ID'],
    invitation['Token'],
    invitation['Created By'],
    invitation['Created Date'],
    invitation['Expires At'],
    invitation['Max Uses'],
    invitation['Current Uses'],
    invitation['Role'],
    'FALSE', // Deactivate
  ];

  await updateRow(
    accessToken,
    sheetId,
    SHEET_NAMES.WORKSPACE_INVITATIONS,
    invitation._rowIndex,
    updatedValues
  );

  await logAuditEntry(accessToken, sheetId, {
    contactId: '',
    contactName: '',
    fieldChanged: 'Workspace Invitation Deactivated',
    oldValue: 'active',
    newValue: 'inactive',
    userEmail,
  });

  return true;
}

/**
 * Get all invitations for a workspace
 * @param {string} accessToken - Google access token
 * @param {string} sheetId - Google Sheet ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<array>} Array of invitations
 */
export async function getWorkspaceInvitations(accessToken, sheetId, workspaceId) {
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.WORKSPACE_INVITATIONS);
  return data
    .filter((row) => row['Workspace ID'] === workspaceId)
    .map((row) => ({
      id: row['Invitation ID'],
      workspace_id: row['Workspace ID'],
      token: row['Token'],
      created_by: row['Created By'],
      created_at: row['Created Date'],
      expires_at: row['Expires At'],
      max_uses: row['Max Uses'] ? parseInt(row['Max Uses'], 10) : null,
      current_uses: parseInt(row['Current Uses'] || '0', 10),
      role: row['Role'],
      is_active: row['Is Active'] === 'TRUE',
    }));
}
