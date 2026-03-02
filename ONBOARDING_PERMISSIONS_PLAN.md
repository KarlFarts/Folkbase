# Onboarding Redesign + Role-Based Permissions — Implementation Plan

## Context

Currently, every new user is forced through a setup wizard that creates/connects a personal Google Sheet before they can do anything. This blocks collaborators who just want to join someone else's workspace. Additionally, there's no permission enforcement — all workspace members have identical access regardless of role.

This plan adds 3 onboarding paths (solo user, invited collaborator, existing user joining), introduces Owner/Editor/Viewer roles with granular overrides, integrates Google Drive sharing, and enforces permissions in the UI.

### Key architectural challenge

All workspace metadata (Workspaces, Workspace Members, Invitations) lives in the **owner's personal sheet**. `getUserWorkspaces()` in `workspaceHierarchyServiceSheets.js:534` reads membership from `config.personalSheetId`. A collaborator-only user has no personal sheet, so we need an alternative path: store known workspace references in localStorage and query the workspace's own sheet directly.

---

## Phase 1: Schema + Permissions Foundation -- COMPLETED

*Pure additive changes — nothing breaks.*

### 1A: Add Overrides column to Workspace Members -- DONE

**`src/config/constants.js`**
- Add `'Overrides'` to `SHEET_HEADERS[SHEET_NAMES.WORKSPACE_MEMBERS]` after `'Added By'`
- Add constants:
  ```javascript
  export const WORKSPACE_ROLES = { OWNER: 'owner', EDITOR: 'editor', VIEWER: 'viewer' };
  export const PERMISSION_FEATURES = ['contacts', 'touchpoints', 'notes', 'events', 'tasks'];
  ```

### 1B: Create usePermissions hook -- DONE

**Create `src/hooks/usePermissions.js`**
- Reads `mode` and `activeWorkspace` from `useWorkspace()`
- Personal mode: all permissions granted
- Workspace mode: checks `activeWorkspace.memberRole` and `activeWorkspace.memberOverrides`
- Returns: `{ role, canWrite(feature), canRead(feature), isOwner, isEditor, isViewer, guardWrite(feature) }`
- `guardWrite` shows toast and returns false if denied
- Parses overrides string `"touchpoints:write,notes:write"` into a Set

### 1C: Pass overrides through workspace data -- DONE

**`src/services/workspaceHierarchyServiceSheets.js`**
- In `getUserWorkspaces()` (line 544-550): add `memberOverrides: membership['Overrides'] || ''` to returned object
- In `addWorkspaceMember()`: accept optional `overrides` param, include in appended row

**`src/utils/devModeWrapper.js`**
- Ensure dev mode workspace member operations handle the `Overrides` column

### 1D: Add Overrides to invitation schema -- DONE

**`src/config/constants.js`**
- Add `'Default Overrides'` to `SHEET_HEADERS[SHEET_NAMES.WORKSPACE_INVITATIONS]` after `'Is Active'`

**Verify:** Build passes, tests pass. `usePermissions()` returns correct values in personal mode. No behavioral changes yet.

---

## Phase 2: Onboarding Redesign (3 Paths) -- COMPLETED

### 2A: Allow /join route without personal sheet -- DONE

**`src/App.js`** (lines 108-137)
- Current gate: `if (!user) -> SignIn` then `if (!personalSheetId) -> SetupWizard`
- New logic:
  ```javascript
  // Step 1: Auth gate (unchanged)
  if (!isDevMode && (!user || !accessToken)) { return <SignInPage ... />; }

  // Step 2: Check if /join route — let it through regardless of setup
  const isPendingJoin = window.location.pathname === '/join';

  // Step 3: Check if user has workspace access (from localStorage cache)
  const knownWorkspaces = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
  const hasWorkspaces = userWorkspaces.length > 0 || knownWorkspaces.length > 0;

  // Step 4: Setup gate — only block if no sheet AND no workspaces AND not joining
  const needsSetup = !isDevMode && !config.personalSheetId && !hasWorkspaces && !isPendingJoin;

  if (needsSetup || showSetup) {
    // Show NoWorkspaceLandingPage instead of forcing SetupWizard
    return needsSetup ? <NoWorkspaceLandingPage onSetup={() => setShowSetup(true)} />
                      : <SetupWizard ... />;
  }
  ```

### 2B: Create NoWorkspaceLandingPage -- DONE

**Create `src/pages/NoWorkspaceLandingPage.js`**
- Simple centered page with two cards:
  1. "Set up your own contact manager" -> triggers SetupWizard
  2. "I have an invite link" -> text field to paste invite URL, extracts token, navigates to `/join?token=...`
- Also shows "Waiting for an invite? Ask a workspace owner to send you one."

### 2C: Update JoinWorkspace to work without personal sheet -- DONE

**`src/pages/JoinWorkspace.js`**
- Remove the `config?.sheetId` requirement (currently blocks if no personal sheet)
- Token validation needs the **workspace owner's sheet ID**, not the joiner's
- **Solution:** Change invite URLs to `/join?token=xyz&sheet=SHEET_ID` so the join page knows which sheet to query
- After successful join, save to localStorage:
  ```javascript
  const known = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
  known.push({ workspaceId, sheetId: workspace.sheet_id, name: workspace.name, role });
  localStorage.setItem('folkbase_known_workspaces', JSON.stringify(known));
  ```
- Navigate to workspace dashboard after join

### 2D: Update WorkspaceContext for collaborator-only users -- DONE

**`src/contexts/WorkspaceContext.js`**
- In `loadUserWorkspaces` (line 32-65): if `!config.personalSheetId`, load from `folkbase_known_workspaces` localStorage instead:
  ```javascript
  if (!config.personalSheetId) {
    const known = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
    const validWorkspaces = [];
    for (const entry of known) {
      try {
        const workspaces = await getUserWorkspaces(accessToken, entry.sheetId, user.email);
        validWorkspaces.push(...workspaces);
      } catch (err) {
        // User may have been removed — skip
      }
    }
    setUserWorkspaces(validWorkspaces);
    // ... restore active workspace as before
    return;
  }
  ```
- Also update `reloadWorkspaces` with same fallback

### 2E: Update invite link generation to include sheet ID -- DONE

**`src/pages/CreateWorkspace.js`** (or wherever invite links are generated)
- Change invite URL from `/join?token=xyz` to `/join?token=xyz&sheet=OWNER_SHEET_ID`
- The owner's `config.personalSheetId` is available in the component

**Verify:**
- Path 1 (Solo): Sign in -> no sheet, no workspaces -> NoWorkspaceLandingPage -> "Set up" -> SetupWizard -> Dashboard
- Path 2 (Invited new user): Visit `/join?token=xyz&sheet=ABC` -> SignInPage (URL preserved) -> sign in -> JoinWorkspace validates against sheet ABC -> joins -> workspace dashboard
- Path 3 (Existing user): Click invite link -> already signed in -> joins -> switches to workspace

---

## Phase 3: Google Drive Sharing Integration -- COMPLETED

### 3A: Upgrade OAuth scope -- DONE

**`src/googleAuth.js`**
- Change `drive.file` to `drive`:
  ```javascript
  'https://www.googleapis.com/auth/drive',  // Was drive.file
  ```
- Existing users will be prompted to re-consent on next sign-in (automatic with implicit flow)

### 3B: Create Drive sharing utility -- DONE

**Create `src/utils/driveSharing.js`**
- `shareFileWithUser(accessToken, fileId, email, role = 'writer')` — POST to Drive permissions API
- `removeFileSharing(accessToken, fileId, email)` — List permissions, find by email, DELETE
- `listFilePermissions(accessToken, fileId)` — GET file permissions
- All with error handling and logging
- Dev mode: no-op (return success)

### 3C: Owner-initiated sharing -- DONE

Since the joiner's token can't share someone else's file, sharing must happen when the **owner** is active.

**`src/pages/WorkspaceDashboard.js`** (or workspace settings)
- Add "Share sheet with all members" button (visible to owner only)
- On click: iterate workspace members, call `shareFileWithUser` for each with `role: 'writer'`
- Show progress and results

**`src/services/workspaceHierarchyServiceSheets.js`**
- When someone joins via invitation, flag the workspace as "needs sharing"
- Owner sees a notification: "New member joined — share your sheet with them"

### 3D: Handle sharing errors gracefully -- DONE

**`src/pages/JoinWorkspace.js`**
- After joining, try to read from the workspace sheet
- If 403: show message "The workspace owner needs to share the sheet with you. You've been added as a member — they'll be notified."
- If success: proceed normally

**Verify:** Owner creates workspace -> invites someone -> new member joins -> owner clicks "Share sheet" -> new member can now access data.

---

## Phase 4: Sheet Protection (Stretch / Needs Verification)

**Important:** This phase depends on verifying that Google Sheets protected ranges do NOT block API writes from Editor-shared users. If they do, skip this phase entirely.

### 4A: Create sheet protection utility

**Create `src/utils/sheetProtection.js`**
- `protectAllTabs(accessToken, spreadsheetId, ownerEmail)` — Uses Sheets API `batchUpdate` with `addProtectedRange` for each tab, setting `editors` to only the owner
- `removeAllProtection(accessToken, spreadsheetId)` — Remove protected ranges

### 4B: Apply protection on workspace creation

**`src/pages/CreateWorkspace.js`**
- After workspace sheet is created/connected, offer to protect it
- Owner can toggle "Protect sheet from direct editing" (default on)

**Verify:** Protected sheet blocks UI edits by non-owners. API writes from Editor-shared users still work. If API writes are blocked, revert this phase.

---

## Phase 5: Permission Enforcement in UI -- COMPLETED

*Uses `usePermissions` from Phase 1.*

### 5A: Contact pages -- DONE

**`src/pages/ContactProfile.js`**
- `const { canWrite } = usePermissions();`
- Hide "Edit" button when `!canWrite('contacts')`
- Hide "Delete Contact" when `!canWrite('contacts')`
- Pass `canEdit={canWrite('contacts')}` to child components

**`src/pages/ContactList.js`**
- Hide "Add Contact" button when `!canWrite('contacts')`

### 5B: Touchpoints -- DONE

**`src/components/contact/ContactActivities.js`**
- Hide "Log Touchpoint" button when `!canWrite('touchpoints')`
- TouchpointHistoryCard: hide edit/delete actions when `!canWrite('touchpoints')`

**`src/pages/TouchpointsList.js`**
- Hide "Add Touchpoint" button when `!canWrite('touchpoints')`

### 5C: Notes -- DONE

**`src/pages/ContactProfile.js`** (notes tab)
- Hide "Write Note" button when `!canWrite('notes')`
- Pass `canEdit={canWrite('notes')}` to NotesDisplaySection

**`src/pages/NotesInbox.js`**
- Hide "New Note" button when `!canWrite('notes')`

### 5D: Events -- DONE

**`src/pages/EventDetails.js`**
- Hide edit/delete buttons when `!canWrite('events')`

**`src/pages/EventsList.js`**
- Hide "Create Event" button when `!canWrite('events')`

### 5E: Tasks -- SKIPPED (TaskProfile page does not exist)

**`src/pages/TaskProfile.js`** (if exists)
- Hide edit/complete/delete when `!canWrite('tasks')`

**Verify:** Switch to workspace as viewer -> edit buttons hidden. Viewer with `touchpoints:write` override -> touchpoint buttons visible, contact edit buttons still hidden.

---

## Phase 6: Invite UI Updates -- COMPLETED

### 6A: Update invitation creation -- DONE

**`src/pages/CreateWorkspace.js`** (Step 4: Team Settings)
- Replace `member`/`admin` role selector with `editor`/`viewer`
- When `viewer` selected, show override checkboxes:
  - Contacts, Touchpoints, Notes, Events, Tasks (each toggleable)
- Store as comma-separated: `"touchpoints:write,notes:write"`

**`src/services/workspaceHierarchyServiceSheets.js`**
- `createWorkspaceInvitation()`: accept `defaultOverrides` option, store in new column
- `joinWorkspaceViaInvitation()`: read `Default Overrides` from invitation, pass to `addWorkspaceMember()`

### 6B: Workspace member management (owner view) -- DONE

**`src/pages/WorkspaceDashboard.js`** (or new workspace settings section)
- Member list showing: name/email, role badge, overrides
- Owner can: change role (editor/viewer), toggle overrides, remove member
- Uses `updateRow` to modify Workspace Members sheet

**Verify:** Owner creates invite with viewer + touchpoints override -> new user joins -> has viewer role with touchpoints:write -> can log touchpoints but not edit contacts.

---

## Phase 7: Settings Page Update -- COMPLETED

### 7A: Personal sheet setup for collaborators -- DONE

**`src/pages/SettingsPage.js`**
- When `!config.personalSheetId`: show subtle card with "Set up personal contact sheet" button
- Button opens SetupWizard as modal (`isInitialSetup={false}`)

**Verify:** Collaborator-only user sees option in settings. Regular user does not.

---

## Phase 8: Dev Mode Support -- COMPLETED

### 8A: Update dev mode fixtures -- DONE

**`src/utils/devModeWrapper.js`**
- Handle `Overrides` column in workspace member CRUD operations
- Mock `driveSharing.js` functions (no-op, return success)

### 8B: Test usePermissions hook -- DONE

**Create `src/hooks/__tests__/usePermissions.test.js`**
- Test: personal mode -> all permissions granted
- Test: workspace owner -> all permissions granted
- Test: workspace editor -> all permissions granted
- Test: workspace viewer -> canWrite returns false for all features
- Test: workspace viewer with overrides -> canWrite returns true for overridden features

**Verify:** `npm test` passes. Dev mode app works with all 3 onboarding paths.

---

## Key Files Reference

| File | Phases |
|------|--------|
| `src/config/constants.js` | 1A, 1D |
| `src/hooks/usePermissions.js` (new) | 1B |
| `src/services/workspaceHierarchyServiceSheets.js` | 1C, 3C, 6A |
| `src/App.js` | 2A |
| `src/pages/NoWorkspaceLandingPage.js` (new) | 2B |
| `src/pages/JoinWorkspace.js` | 2C, 3D |
| `src/contexts/WorkspaceContext.js` | 2D |
| `src/pages/CreateWorkspace.js` | 2E, 4B, 6A |
| `src/googleAuth.js` | 3A |
| `src/utils/driveSharing.js` (new) | 3B |
| `src/utils/sheetProtection.js` (new) | 4A |
| `src/pages/ContactProfile.js` | 5A, 5C |
| `src/pages/ContactList.js` | 5A |
| `src/components/contact/ContactActivities.js` | 5B |
| `src/pages/TouchpointsList.js` | 5B |
| `src/pages/NotesInbox.js` | 5C |
| `src/pages/EventDetails.js` | 5D |
| `src/pages/EventsList.js` | 5D |
| `src/pages/WorkspaceDashboard.js` | 3C, 6B |
| `src/pages/SettingsPage.js` | 7A |
| `src/utils/devModeWrapper.js` | 1C, 8A |

## Execution Order

**Phase 1** (schema + hook) -> **Phase 2** (onboarding redesign) -> **Phase 5** (UI enforcement, can parallel with 3) -> **Phase 3** (Drive sharing) -> **Phase 6** (invite UI) -> **Phase 7** (settings) -> **Phase 4** (sheet protection, stretch) -> **Phase 8** (dev mode + tests)

## Verification Plan

After each phase:
1. `npm start` — dev server starts without errors
2. `npm test` — all tests pass
3. `npm run build` — production build succeeds
4. Manual walkthrough of affected flows in dev mode
