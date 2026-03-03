# Workspace Creation Wizard Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the Create Workspace wizard from 4 steps to 3, auto-create a Google Sheet per workspace, add list-based contact filtering, remove sync links, and fix CSS visibility issues.

**Architecture:** Eliminate the "Data Storage" step entirely. Every new workspace auto-creates a fresh Google Sheet in the user's Folkbase Drive folder via a new `createWorkspaceSheet()` utility. Contact copying becomes a plain data copy (no bidirectional sync links). The contact picker gains a list filter dropdown to narrow contacts by existing lists before individual selection.

**Tech Stack:** React 19, Google Sheets API v4, Google Drive API v3, CSS custom properties, Vite 7

---

## Context

### Current State (what exists)
- 4-step wizard in `src/pages/CreateWorkspace.js` (920 lines)
- Step 2 "Data Storage" asks user to paste a Google Sheet ID or choose "Create New" (which just gives manual instructions)
- Contact copying creates bidirectional sync links via `Contact Links` junction table
- Wizard CSS has visibility issues (inputs invisible against current color scheme)
- `src/utils/driveFolder.js` manages the Folkbase Drive folder but has no sheet creation

### Target State (what we're building)
- 3-step wizard: Details -> Copy Contacts -> Team Settings
- Auto-creates a new Google Sheet with all required tabs on workspace creation
- Contacts are plain copies (no sync link, no notes, no personal data)
- Contact picker has list filter dropdown
- CSS inputs/cards are visible in both light and dark mode

### Key Design Decisions
1. **Always auto-create sheet** -- no "bring your own sheet ID" option
2. **Copy only, no sync** -- contacts are independent copies; workspace members can never touch personal data
3. **No notes copied** -- notes are private by default
4. **List filter + individual select** -- filter by list membership, then check/uncheck individuals

---

## Task 1: Create `createWorkspaceSheet()` utility ✓ COMPLETED

**Files:**
- Modify: `src/utils/driveFolder.js` (add new function after line 237)
- Modify: `src/utils/devModeWrapper.js` (add dev mode mock)
- Modify: `src/config/constants.js` (reference for SHEET_HEADERS)

### Step 1: Add `createWorkspaceSheet` to driveFolder.js

Add this function after `getOrCreateFolkbaseFolder` (line 234):

```javascript
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
    await fetch(batchUrl, {
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
```

### Step 2: Add dev mode mock in devModeWrapper.js

Find the workspace-related section (around line 1204) and add a dev mode wrapper for `createWorkspaceSheet`. The mock should generate a unique localStorage namespace key like `folkbase_ws_${Date.now()}` and return it as the "sheet ID":

```javascript
export async function createWorkspaceSheetWrapped(accessToken, workspaceName) {
  if (isDevMode()) {
    const fakeSheetId = `dev_ws_sheet_${Date.now()}`;
    // Initialize empty data stores for this workspace
    localStorage.setItem(`${fakeSheetId}_Contacts`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Touchpoints`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Events`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Tasks`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Notes`, JSON.stringify([]));
    return { sheetId: fakeSheetId, title: `${workspaceName} - Folkbase` };
  }

  const { createWorkspaceSheet } = await import('./driveFolder.js');
  return createWorkspaceSheet(accessToken, workspaceName);
}
```

### Step 3: Verify build

```bash
npm run build
```

### Step 4: Commit

```bash
git add src/utils/driveFolder.js src/utils/devModeWrapper.js
git commit -m "feat: add createWorkspaceSheet utility for auto-creating workspace sheets"
```

---

## Task 2: Rewrite CreateWorkspace.js -- reduce from 4 steps to 3 ✓ COMPLETED

**Files:**
- Modify: `src/pages/CreateWorkspace.js` (major rewrite, ~920 -> ~500 lines)

### Step 1: Update formData initial state

Replace lines 35-47. Remove `sheetOption`, `existingSheetId`, `syncStrategy`, `customFields`. Add `listFilter` and `fieldScope`:

```javascript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  defaultRole: 'editor',
  defaultOverrides: [],
  invitationExpiry: '30',
  importContacts: false,
  selectedContacts: [],
  fieldScope: 'core', // 'core' or 'all'
  listFilter: '', // List ID to filter by, '' = all contacts
});
```

### Step 2: Update steps array

Replace lines 58-63:

```javascript
const steps = [
  { number: 1, title: 'Details', description: 'Name & description' },
  { number: 2, title: 'Contacts', description: 'Copy from personal' },
  { number: 3, title: 'Team', description: 'Permissions & invite' },
];
```

### Step 3: Add list loading state and fetch

Add these state variables near line 30:

```javascript
const [contactLists, setContactLists] = useState([]); // [{listId, listName}]
const [contactListMemberships, setContactListMemberships] = useState([]); // [{contactId, listId}]
```

Add a useEffect to load lists when the user enters Step 2:

```javascript
useEffect(() => {
  if (currentStep === 2 && config?.personalSheetId && accessToken) {
    const loadLists = async () => {
      try {
        const [listsResult, membershipsResult] = await Promise.all([
          readSheetData(accessToken, config.personalSheetId, SHEETS.LISTS),
          readSheetData(accessToken, config.personalSheetId, SHEETS.CONTACT_LISTS),
        ]);
        setContactLists(listsResult.data || []);
        setContactListMemberships(membershipsResult.data || []);
      } catch (err) {
        console.error('Failed to load lists:', err);
      }
    };
    loadLists();
  }
}, [currentStep, config?.personalSheetId, accessToken]);
```

### Step 4: Add filtered contacts computation

```javascript
const filteredContacts = useMemo(() => {
  if (!formData.listFilter) return personalContacts;
  const contactIdsInList = new Set(
    contactListMemberships
      .filter((m) => m['List ID'] === formData.listFilter)
      .map((m) => m['Contact ID'])
  );
  return personalContacts.filter((c) => contactIdsInList.has(c['Contact ID']));
}, [personalContacts, formData.listFilter, contactListMemberships]);
```

### Step 5: Rewrite handleCreateWorkspace

Replace lines 142-255. The new version:
1. Calls `createWorkspaceSheetWrapped()` to auto-create a sheet
2. Passes the returned `sheetId` to `createRootWorkspace` / `createSubWorkspace`
3. Copies contacts WITHOUT link config (plain addContact calls)
4. No sync link creation

```javascript
const handleCreateWorkspace = async () => {
  if (!formData.name.trim()) {
    setError('Workspace name is required');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // 1. Auto-create a new Google Sheet for this workspace
    const { sheetId: newSheetId } = await createWorkspaceSheetWrapped(
      accessToken,
      formData.name
    );

    const workspaceData = {
      name: formData.name,
      description: formData.description || '',
      owner_email: user.email,
      sheet_id: newSheetId,
      status: 'active',
      default_role: formData.defaultRole,
      default_overrides:
        formData.defaultRole === 'viewer'
          ? formData.defaultOverrides.map((f) => `${f}:write`).join(',')
          : '',
      invitation_expiry_days: parseInt(formData.invitationExpiry),
    };

    let workspaceId;
    let token;

    if (parentWorkspace) {
      const result = await createSubWorkspace(
        accessToken,
        parentWorkspace.sheet_id,
        parentWorkspace.id,
        workspaceData,
        user.email
      );
      workspaceId = result.id;
      token = generateInvitationToken();
    } else {
      const result = await createRootWorkspace(
        accessToken,
        config.personalSheetId,
        workspaceData,
        user.email
      );
      workspaceId = result.id;
      token = generateInvitationToken();
    }

    const newWorkspace = {
      id: workspaceId,
      ...workspaceData,
      parent_workspace_id: parentWorkspace?.id || null,
      invitation_token: token,
    };

    setCreatedWorkspace(newWorkspace);

    // 2. Copy contacts (plain copy, no sync links)
    let copiedCount = 0;
    if (formData.importContacts && formData.selectedContacts.length > 0) {
      const CORE_FIELDS = ['Contact ID', 'First Name', 'Last Name', 'Display Name',
        'Phone Mobile', 'Email Personal', 'Date Added'];

      for (const contactId of formData.selectedContacts) {
        try {
          const source = personalContacts.find((c) => c['Contact ID'] === contactId);
          if (!source) continue;

          // Filter fields based on scope
          let contactData;
          if (formData.fieldScope === 'core') {
            contactData = {};
            for (const field of CORE_FIELDS) {
              if (source[field]) contactData[field] = source[field];
            }
          } else {
            // All fields, but exclude private/notes-related
            contactData = { ...source };
            delete contactData['Private Notes'];
            delete contactData['Personal Tags'];
          }

          contactData['Source Type'] = 'copied_from_personal';
          contactData['Source Contact ID'] = contactId;
          contactData['Date Added'] = new Date().toISOString();

          await addContact(accessToken, newSheetId, contactData, user.email);
          copiedCount++;
        } catch (err) {
          console.error(`Failed to copy contact ${contactId}:`, err);
        }
      }
    }

    setCopiedContactCount(copiedCount);
    await reloadWorkspaces();
    switchToWorkspace(newWorkspace);
    setCurrentStep(4); // Success screen (was 5 with old 4-step wizard)
  } catch (err) {
    console.error('Failed to create workspace:', err);
    setError(`Failed to create workspace: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### Step 6: Rewrite Step 2 UI (Contacts -- was Step 3)

Replace the old Step 3 contacts section. Add a list filter dropdown above the contact list:

```jsx
{currentStep === 2 && (
  <div className="wizard-step-content">
    <div className="wizard-step-header">
      <h2>Copy Contacts</h2>
      <p>Optionally start your workspace with contacts from your personal sheet.
         Only contact info is copied -- notes, touchpoints, and personal data stay private.</p>
    </div>

    <div className="wizard-checkbox-card"
      onClick={() => updateFormData('importContacts', !formData.importContacts)}>
      <input type="checkbox" checked={formData.importContacts} readOnly />
      <div>
        <strong>Copy contacts from my personal workspace</strong>
        <p>Selected contacts will be copied as independent records.</p>
      </div>
    </div>

    {formData.importContacts && (
      <>
        {/* List filter */}
        <div className="wizard-form-section">
          <label className="wizard-label">Filter by list</label>
          <select
            className="wizard-select"
            value={formData.listFilter}
            onChange={(e) => updateFormData('listFilter', e.target.value)}
          >
            <option value="">All Contacts ({personalContacts.length})</option>
            {contactLists.map((list) => (
              <option key={list['List ID']} value={list['List ID']}>
                {list['List Name']}
              </option>
            ))}
          </select>
        </div>

        {/* Field scope toggle */}
        <div className="wizard-form-section">
          <label className="wizard-label">Fields to copy</label>
          <div className="wizard-card-options wizard-card-options--row">
            <div
              className={`wizard-card-option ${formData.fieldScope === 'core' ? 'selected' : ''}`}
              onClick={() => updateFormData('fieldScope', 'core')}
            >
              <strong>Core Fields Only</strong>
              <p>Name, Phone, Email</p>
            </div>
            <div
              className={`wizard-card-option ${formData.fieldScope === 'all' ? 'selected' : ''}`}
              onClick={() => updateFormData('fieldScope', 'all')}
            >
              <strong>All Fields</strong>
              <p>All contact info (excludes private notes)</p>
            </div>
          </div>
        </div>

        {/* Select/Deselect + count */}
        <div className="wizard-contact-toolbar">
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={handleToggleSelectAll}>
            {formData.selectedContacts.length === filteredContacts.length
              ? 'Deselect All' : 'Select All'}
          </button>
          <span className="wizard-contact-count">
            {formData.selectedContacts.length} of {filteredContacts.length} contacts selected
          </span>
        </div>

        {/* Contact list */}
        <div className="wizard-contact-list">
          {filteredContacts.map((contact) => (
            <div
              key={contact['Contact ID']}
              className={`wizard-contact-item ${
                formData.selectedContacts.includes(contact['Contact ID']) ? 'selected' : ''
              }`}
              onClick={() => toggleContactSelection(contact['Contact ID'])}
            >
              <input
                type="checkbox"
                checked={formData.selectedContacts.includes(contact['Contact ID'])}
                readOnly
              />
              <div className="wizard-contact-avatar">
                {(contact['Display Name'] || contact['First Name'] || '?')[0]}
              </div>
              <div className="wizard-contact-info">
                <strong>{contact['Display Name'] || `${contact['First Name']} ${contact['Last Name']}`}</strong>
                <span>{contact['Email Personal'] || contact['Phone Mobile'] || ''}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
)}
```

### Step 7: Rewrite Step 3 UI (Team -- was Step 4)

Keep the existing Team step largely intact but renumber it from step 4 to step 3. Remove the summary line that referenced "Data Storage: New Sheet / Existing Sheet". Update the step number checks throughout.

### Step 8: Rewrite Success Screen (Step 4 -- was Step 5)

Remove the "manual Google Sheet setup instructions" block entirely. The success screen should only show:
- Workspace name
- Contact count copied
- Invitation link (WorkspaceInvitationGenerator)
- "Go to Workspace" button

### Step 9: Remove Step 2 "Data Storage" UI

Delete the entire old Step 2 block (lines ~388-517 in the original file). This includes:
- "Create New Sheet" / "Use Existing Sheet" card options
- `existingSheetId` text input
- Info banners about sheet setup
- All references to `formData.sheetOption`

### Step 10: Update imports

- Add: `import { createWorkspaceSheetWrapped } from '../utils/devModeWrapper';`
- Add: `import { addContact } from '../utils/devModeWrapper';` (if not already imported)
- Add: `import { useMemo } from 'react';` (if not already imported)
- Remove: unused icon imports (`Folder`, `BarChart3`, `Lightbulb`, `FileText`, `Sparkles` -- audit after rewrite)
- Remove: `copyContactToWorkspace` import (no longer used)

### Step 11: Verify build

```bash
npm run build
```

### Step 12: Commit

```bash
git add src/pages/CreateWorkspace.js
git commit -m "feat: simplify workspace wizard to 3 steps with auto-create sheet"
```

---

## Task 3: Fix wizard CSS visibility issues ✓ COMPLETED

**Files:**
- Modify: `src/styles/index.css` (wizard CSS section, lines ~5765-6272)

### Step 1: Fix input/textarea visibility

Add explicit color and background to wizard form inputs so they're visible in all themes:

```css
/* After existing .wizard-form-section styles */
.wizard-form-section input[type='text'],
.wizard-form-section textarea,
.wizard-form-section select,
.wizard-select {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--border-color-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  width: 100%;
}

.wizard-form-section input[type='text']:focus,
.wizard-form-section textarea:focus,
.wizard-form-section select:focus,
.wizard-select:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-primary-rgb, 0, 0, 0), 0.15);
}
```

### Step 2: Fix card option visibility and selected state

Update `.wizard-card-option` to have visible borders and a stronger selected state:

```css
.wizard-card-option {
  /* Keep existing padding/border-radius */
  border: 1px solid var(--border-color-default);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.wizard-card-option:hover {
  border-color: var(--color-accent-secondary);
  background: var(--color-bg-secondary);
}

.wizard-card-option.selected {
  border: 2px solid var(--color-accent-primary);
  background: var(--color-bg-secondary);
}
```

### Step 3: Add new CSS classes for list filter and contact toolbar

```css
.wizard-label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.wizard-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.wizard-card-options--row {
  display: flex;
  gap: var(--spacing-md);
}

.wizard-card-options--row .wizard-card-option {
  flex: 1;
}

.wizard-contact-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--spacing-md) 0;
}

.wizard-contact-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

### Step 4: Constrain wizard width

```css
.wizard-container {
  max-width: 700px;
  margin: 0 auto;
}
```

### Step 5: Verify build

```bash
npm run build
```

### Step 6: Commit

```bash
git add src/styles/index.css
git commit -m "fix: wizard CSS visibility, card selection, and layout constraints"
```

---

## Task 4: Clean up removed code and unused imports ✓ COMPLETED

**Files:**
- Modify: `src/pages/CreateWorkspace.js` (remove dead code)
- Modify: `src/utils/devModeWrapper.js` (remove sync link from copyContactToWorkspace dev mock)

### Step 1: Remove sync link code from devModeWrapper

In `src/utils/devModeWrapper.js` around line 1272-1291, the dev mode `copyContactToWorkspace` creates sync links. Since we no longer use `copyContactToWorkspace` in the wizard (we use `addContact` directly), this function is still used elsewhere but the wizard no longer depends on it. No changes needed to the existing function -- just don't import it in CreateWorkspace.

### Step 2: Audit CreateWorkspace.js for dead references

After the rewrite, search for any remaining references to:
- `formData.sheetOption` -- remove all
- `formData.existingSheetId` -- remove all
- `formData.syncStrategy` -- remove all
- `formData.customFields` -- remove all
- `copyContactToWorkspace` -- remove import
- `linkConfig` -- remove all
- Step number `5` (old success screen) -- should now be `4`

### Step 3: Run tests

```bash
npm test
```

### Step 4: Verify build

```bash
npm run build
```

### Step 5: Commit

```bash
git add -A
git commit -m "chore: clean up dead code from workspace wizard simplification"
```

---

## Task 5: Final integration test and push ✓ COMPLETED

### Step 1: Full build check

```bash
npm run build
```

### Step 2: Run all tests

```bash
npm test
```

### Step 3: Manual smoke test checklist

In dev mode (`VITE_DEV_MODE=true`):
- [ ] Navigate to /workspaces
- [ ] Click "+ Create Workspace"
- [ ] Step 1: Enter name and description, click Continue
- [ ] Step 2: Toggle "Copy contacts", verify list filter dropdown appears
- [ ] Step 2: Select a list filter, verify contacts are filtered
- [ ] Step 2: Toggle between "Core Fields" and "All Fields"
- [ ] Step 2: Select some contacts, click Continue
- [ ] Step 3: Set default role, click "Create Workspace"
- [ ] Verify success screen shows workspace name and contact count
- [ ] Click "Go to Workspace" -- verify it switches to workspace mode
- [ ] Verify no console errors

### Step 4: Push to main

```bash
git push origin main
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/utils/driveFolder.js` | Modify | Add `createWorkspaceSheet()` function |
| `src/utils/devModeWrapper.js` | Modify | Add `createWorkspaceSheetWrapped()` dev mode mock |
| `src/pages/CreateWorkspace.js` | Major rewrite | 4 steps -> 3, auto-create sheet, list filter, no sync links |
| `src/styles/index.css` | Modify | Fix wizard input visibility, card selection, add new classes |

## Dependencies

- `getOrCreateFolkbaseFolder` and `moveFileToFolder` from `driveFolder.js` (existing)
- `addContact` from `devModeWrapper.js` (existing)
- `readSheetData` with `SHEETS.LISTS` and `SHEETS.CONTACT_LISTS` (existing)
- `SHEET_NAMES` and `SHEET_HEADERS` from `constants.js` (existing)
- Google Sheets API v4 `spreadsheets.create` endpoint (new usage)
- Google Sheets API v4 `spreadsheets.values.batchUpdate` endpoint (new usage)

## Risk Notes

- **Drive API scope**: `createWorkspaceSheet` needs the Drive scope to move the file into the Folkbase folder. The app already requests this scope for folder creation, so no new permissions needed.
- **Sheets API quota**: Creating a sheet + batch updating headers = 2 API calls per workspace creation. Well within free tier limits.
- **Error recovery**: If sheet creation succeeds but workspace registration fails, there will be an orphaned sheet in Drive. Acceptable for now -- user can delete it manually. Future improvement: add cleanup on failure.
