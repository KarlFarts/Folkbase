# Workspace System Guide for Claude Code Agents

**Status:** READY FOR PRODUCTION USE
**Date:** 2025-12-29
**Audience:** AI Agents & Developers

**IMPORTANT FOR AI AGENTS:**
- No emojis should be used in code, documentation, or any outputs unless explicitly requested by the user
- Always read the KEY TAKEAWAYS section before working on workspaces
- Follow the wrapper pattern (devModeWrapper.js) for all data operations

---

## KEY TAKEAWAYS (READ THIS FIRST!)

**Before working on anything workspace-related, understand these critical points:**

### 1. **Always Import from `devModeWrapper.js` (NOT `sheets.js`)**
```javascript
CORRECT:
import { readSheetData, addContact } from '../utils/devModeWrapper';

WRONG:
import { readSheetData, addContact } from '../utils/sheets';
```
The wrapper automatically handles dev mode vs production. No manual checks needed.

### 2. **Always Use `useActiveSheetId()` for Sheet Resolution**
```javascript
import { useActiveSheetId } from '../utils/sheetResolver';

function MyComponent() {
  const sheetId = useActiveSheetId();

  // Automatically returns:
  // - config.personalSheetId in personal mode
  // - activeWorkspace.sheet_id in workspace mode
}
```

### 3. **Dev Mode is Transparent and Automatic**
- When `VITE_DEV_MODE=true`: All data operations use localStorage
- When `VITE_DEV_MODE=false`: All data operations use Google Sheets API
- **You don't need to check or handle this manually** - the wrapper does it
- Write code once, it works in both modes

### 4. **Workspace Data is Completely Separate**
- Personal contacts: Stored in `config.personalSheetId` Google Sheet
- Workspace contacts: Stored in workspace's own Google Sheet (`activeWorkspace.sheet_id`)
- Full isolation: Switching modes routes all queries to the correct sheet automatically
- Components NEVER need to know which mode they're in

### 5. **Three User Roles in Workspace Mode**
```
Owner    (Workspace Creator) → Full control
Admin    (Elevated Member)   → Can invite, manage roles
Member   (Standard User)     → Can view/edit contacts, log touchpoints
```

### 6. **Never Commit `.env` File**
- `.env` is in `.gitignore` (already protected)
- Each developer has their own `.env` with local settings
- Configuration persists in `ConfigContext` (personal sheet ID)
- Team coordination needed only for shared projects (not `.env`)

---

## Quick Start (Dev Mode)

```bash
# 1. Create .env with dev mode
echo "VITE_DEV_MODE=true" > .env

# 2. Install and start
npm install
npm start

# You get:
# - Auto-logged in as admin@dev.local
# - 6 test contacts
# - Dev Tools panel (bottom-left)
# - Role switcher (red "DEV" button)
# - All data in localStorage (no APIs needed)
```

---

## Workspace System Architecture

### What Is A Workspace?

A **Workspace** is a shared workspace where team members collaborate on contacts, events, and touchpoints for a specific initiative (outreach, fundraising, events, etc.).

**Key Differences from Personal Mode:**
- Separate Google Sheet per workspace (not shared with personal contacts)
- Team member management with roles (owner/admin/member)
- Invitation-based member joining (not direct database access)
- All workspace members access same contact database

### Workspace Creation Workflow

#### User Journey (Step-by-Step)

**Step 1: Navigate to Workspaces**
- Click "Workspaces" in navbar
- WorkspaceDashboard.js shows existing workspaces
- Click "Create Workspace"

**Step 2: Fill 3-Step Wizard**

*Page 1: Workspace Details*
- Name (required)
- Description (optional)
- Type: Outreach, Phone Banking, Voter Registration, Fundraising, Volunteer Coordination, or Other

*Page 2: Google Sheet Setup*
- Option A: Create new sheet (user creates manually, provides ID)
- Option B: Use existing sheet (provide existing Sheet ID)

*Page 3: Invitation Settings*
- Default role for new members: Member or Admin
- Invitation expiry: 7/30/90 days or Never

**Step 3: System Creates Workspace**

The workspace system writes data to Google Sheets tabs (Workspaces, Workspace Members) and sets up the workspace's own Google Sheet for contact data.

**Step 4: Workspace Ready**
- User automatically switched to workspace mode
- Invitation link generated: `/join?token=abc123...`
- Can invite team members immediately

#### Critical Files
- `src/pages/CreateWorkspace.js` - Wizard component
- `src/contexts/WorkspaceContext.js` - State management & data operations
- `src/components/WorkspaceInvitationGenerator.js` - Invitation link UI

### Multi-Sheet Architecture (Core Concept)

#### The Problem
- Each user/workspace has their own Google Sheet
- Need to route all data operations to the correct sheet
- Personal mode uses one sheet, workspace mode uses another

#### The Solution: `useActiveSheetId()` Hook

```javascript
// Location: src/utils/sheetResolver.js
const sheetId = useActiveSheetId();

// Returns:
// - In personal mode: config.personalSheetId
// - In workspace mode: activeWorkspace.sheet_id
// - Automatic, no manual logic needed
```

#### How It Works

```
User Interface (ContactList, AddContact, etc.)
            |
useActiveSheetId() Hook (src/utils/sheetResolver.js)
            |
        +------------------------+
        |   Personal Mode?       |
        +---+----------------+---+
            |                |
    YES ->  |                |  <- NO
            v                v
   personal |            workspace
   Sheet ID |            Sheet ID
```

#### Components Using Sheet Resolution

All these automatically route to the correct sheet:
- `ContactList.js` - Lists contacts (personal or workspace)
- `AddContact.js` - Creates contacts
- `ContactProfile.js` - Views/edits contacts
- `TouchpointsList.js` - Shows touchpoints
- `EventsList.js` - Shows events
- `Dashboard.js` - Shows stats
- `ExportPage.js` - Exports data
- `ImportPage.js` - Imports data

**Developers never need to think about which sheet to use** - it's automatic based on mode.

### Workspace Features

#### Same as Personal Mode
- View/add/edit/delete contacts
- Log touchpoints (interactions with contacts)
- Create/manage events
- Dashboard with quick stats
- Import/export functionality
- Duplicate detection
- Audit logging

#### Workspace-Specific
- **Team Member Management** - Invite members, manage roles
- **Invitation System** - Generate shareable links with optional expiry
- **Role-Based Permissions** - Owner, Admin, Member roles
- **Workspace Switcher** - Navbar dropdown to switch personal/workspace mode

### Data Models

All workspace data is stored in Google Sheets.

#### Workspaces Sheet
```
Workspace ID | Workspace Name | Parent Workspace ID | Path | Sheet ID | Created Date | Created By | Status | Description
```

**Hierarchy Fields:**
- `Parent Workspace ID`: ID of parent workspace (empty for root-level workspaces)
- `Path`: Materialized path for efficient tree queries (e.g., "/ws0001/ws0002")
- Nesting level derived from path depth

#### Workspace Members Sheet
```
Member ID | Workspace ID | Member Email | Role | Added Date | Added By
```

#### Contact Links Sheet
```
Link ID | Source Sheet ID | Source Contact ID | Target Sheet ID | Target Contact ID | Sync Strategy | Last Sync | Created Date
```

**Purpose:** Tracks bidirectional sync relationships between contacts across workspaces. When a contact is copied with "Create sync link" enabled, a contact link is created to keep the contacts in sync.

#### Sync Conflicts Sheet
```
Conflict ID | Link ID | Field Name | Source Value | Target Value | Resolution | Resolved Date | Resolved By
```

**Purpose:** Tracks sync conflicts when the same field is modified in both workspaces. User must manually resolve via SyncConflictResolver UI.

#### Google Sheet Structure (Per Workspace)
Each workspace has a Google Sheet with these tabs (identical to personal sheet):
- **Contacts** - Workspace member information
- **Touchpoints** - Interaction logs
- **Events** - Workspace events/activities
- **Audit Log** - Change history
- **Import Settings** - Bulk import template
- **Import History** - Import records

### Permission System

#### Owner (Workspace Creator)
- Full workspace management
- Invite members
- Manage member roles
- Delete workspace
- Identified by: `workspace.owner_email === user?.email`

#### Admin (Elevated Member)
- Invite members
- Manage member roles
- Edit workspace details
- Access all data
- Identified by: `member.role === "admin"`

#### Member (Standard)
- View contacts
- Edit contacts
- Log touchpoints
- Create events
- **Cannot** manage other members
- Identified by: `member.role === "member"`

#### Check Permissions in Code
```javascript
function hasAdminAccess(workspace, workspaceMembers, user) {
  return workspace?.owner_email === user?.email ||
    workspaceMembers.some(m =>
      m.member_email === user?.email && m.role === 'admin'
    );
}
```

---

## Development Workflow for Agents

### Environment Setup (Your Configuration)

**Local Development:** Dev Mode (recommended for your team)
- Each agent works locally with `VITE_DEV_MODE=true`
- No Google Sheets credentials needed
- All data in localStorage
- Completely isolated sandboxes

**Development Environment:** Separate backend for testing real features
- Different project configuration than production
- Team can test against real backend when needed

**Production Environment:** Live system
- Separate configuration
- Real user data
- Production deployment only

### Git Workflow

**Main Branch**
- `main` is production-ready code
- All features merged here after PR review

**Feature Branches**
```bash
# Create for each workspace feature
git checkout -b feature/workspace-approval-workflow
git checkout -b feature/improve-invitation-ui
git checkout -b feature/add-workspace-analytics

# Naming: feature/description-of-work (lowercase, hyphens)
```

**Commit Convention**
```bash
# New features
git commit -m "feat: add workspace approval workflow"

# Bug fixes
git commit -m "fix: correct member role update validation"

# Improvements
git commit -m "chore: simplify workspace context state management"

# Documentation
git commit -m "docs: document workspace sheet structure"
```

**Pull Request Process**
1. Push feature branch to remote
2. Create PR to `main`
3. Code review by another agent (if available)
4. Merge when approved
5. Delete feature branch

### Pre-Commit Checklist (CRITICAL)

Before pushing your branch:

```bash
# 1. Run tests (verify everything passes)
npm test

# 2. Build production version (verify no errors)
npm run build

# 3. Test in Dev Mode locally
npm start
# Test your changes with test data

# 4. Review your changes
git diff

# 5. Verify no console errors (F12)

# 6. Commit with proper message
git commit -m "feat: your feature description"

# 7. Push to remote
git push origin feature/your-feature-name
```

### Typical Development Day (Agent Workflow)

1. **Morning**: Pull latest main
   ```bash
   git pull origin main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-workspace-feature
   ```

3. **Start dev server**
   ```bash
   npm start
   ```
   - Dev mode auto-initializes
   - You're logged in as admin@dev.local
   - 6 test contacts ready

4. **Develop your feature**
   - Use test data for development
   - Test with different user roles (red "DEV" button)
   - Verify empty state handling (clear test data, verify no crashes)

5. **Before committing**
   - Run `npm test`
   - Run `npm run build`
   - Test one more time in dev mode
   - Review `git diff`

6. **Create PR** when ready
   - Push to remote
   - Create PR to main
   - Document changes

---

## Configuration & Environment Variables

### Required Files

**`.env` (Not in Git - Gitignored)**
```bash
# Dev Mode (for local development)
VITE_DEV_MODE=true

# Production (Google Sheets API)
# VITE_DEV_MODE=false
# VITE_GOOGLE_SHEETS_ID=real_sheet_id
# VITE_GOOGLE_CLIENT_ID=real_client_id
```

### Environment Variables Reference

| Variable | Purpose | Dev Mode | Production |
|----------|---------|----------|------------|
| `VITE_DEV_MODE` | Enable dev mode | `true` | `false` or unset |
| `VITE_GOOGLE_SHEETS_ID` | Personal sheet | Not needed in dev mode | Real Sheet ID |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth | Not needed in dev mode | Real Google Client ID |

### Separate Development Environments (For Team)

**Local Development** (Each Agent)
- `.env` with `VITE_DEV_MODE=true`
- localStorage data only
- No external dependencies

**Development Backend** (Shared - Optional)
- Separate environment for testing real features
- Real backend for testing features
- Created/managed by team lead

**Production** (Live)
- Separate production configuration
- Real user data
- Deployment only

---

## Critical Files & Imports

### Data Layer (Always Use These)

| File | Purpose | How to Use |
|------|---------|-----------|
| `src/utils/devModeWrapper.js` | **ALWAYS IMPORT FROM HERE** | `import { readSheetData, addContact } from '../utils/devModeWrapper'` |
| `src/utils/sheetResolver.js` | Sheet ID resolution | `const sheetId = useActiveSheetId()` |
| `src/utils/sheets.js` | Google Sheets API | Don't import directly (use wrapper) |

### Workspace Core Files

| File | Purpose |
|------|---------|
| `src/contexts/WorkspaceContext.js` | Workspace state management & data operations |
| `src/pages/WorkspaceDashboard.js` | Workspace listing & management UI |
| `src/pages/CreateWorkspace.js` | Workspace creation wizard |
| `src/pages/JoinWorkspace.js` | Invitation acceptance |
| `src/components/WorkspaceSwitcher.js` | Personal/workspace mode switcher |
| `src/components/WorkspaceInvitationGenerator.js` | Invitation link UI |

### Context Files

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.js` | User auth (has dev mode support) |
| `src/contexts/WorkspaceContext.js` | Workspace state |
| `src/contexts/ConfigContext.js` | Personal sheet configuration |

### Dev Mode Files (For Reference)

| File | Purpose |
|------|---------|
| `src/auth/mockAuth.js` | Mock users (Admin, Volunteer, Workspace Manager) |
| `src/data/testContacts.js` | 6 test contacts |
| `src/data/seedTestData.js` | Test data seeding logic |
| `src/components/DevToolsPanel.js` | Dev tools (bottom-left) |
| `src/components/DevModeRoleSwitcher.js` | Role switcher button |

---

## Common Patterns & Examples

### Importing Data Functions (CRITICAL)

```javascript
// CORRECT - Always use wrapper
import { readSheetData, addContact, updateContact } from '../utils/devModeWrapper';

// WRONG - Never import directly
import { readSheetData, addContact } from '../utils/sheets';
```

### Using Sheet Resolution

```javascript
import { useActiveSheetId } from '../utils/sheetResolver';

function MyComponent() {
  const sheetId = useActiveSheetId();

  // In personal mode: config.personalSheetId
  // In workspace mode: activeWorkspace.sheet_id
  // You don't need to check which - it's automatic
}
```

### Reading Contacts

```javascript
import { readSheetData } from '../utils/devModeWrapper';
import { useActiveSheetId } from '../utils/sheetResolver';

function ContactList() {
  const sheetId = useActiveSheetId();

  useEffect(() => {
    async function loadContacts() {
      const result = await readSheetData(accessToken, sheetId, 'Contacts');
      // Works automatically in dev mode (localStorage) or production (API)
    }
    loadContacts();
  }, [sheetId, accessToken]);
}
```

### Adding a Contact

```javascript
import { addContact } from '../utils/devModeWrapper';
import { useActiveSheetId } from '../utils/sheetResolver';

function AddContactForm() {
  const sheetId = useActiveSheetId();

  async function handleSubmit(contactData) {
    await addContact(
      accessToken,
      sheetId,
      'Contacts',
      contactData
    );
    // Automatically writes to localStorage in dev mode
    // Automatically writes to Google Sheets API in production
  }
}
```

### Checking Workspace Permissions

```javascript
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

function WorkspaceAdminButton() {
  const { user } = useAuth();
  const { activeWorkspace, workspaceMembers } = useWorkspace();

  const isOwnerOrAdmin =
    activeWorkspace?.owner_email === user?.email ||
    workspaceMembers.some(m =>
      m.member_email === user?.email && m.role === 'admin'
    );

  if (!isOwnerOrAdmin) return null;

  return <button>Manage Workspace</button>;
}
```

### Testing Different User Roles

1. Click red "DEV" button in navbar
2. Select role: Admin, Volunteer, or Workspace Manager
3. Page refreshes with new user
4. Test features with different permissions

### Managing Test Data

**Via UI:**
- Dev Tools panel (bottom-left)
  - Seed Test Data - Add test contacts
  - Reload Test Data - Clear and re-add
  - Clear Test Data - Remove only test contacts
  - Clear All Data - Delete everything

---

## Troubleshooting

### Test data not showing
1. Verify `VITE_DEV_MODE=true` in `.env`
2. Restart dev server: `npm start`
3. Check Dev Tools panel (bottom-left)
4. Click "Seed Test Data" button

### Can't see workspace features
1. Verify in workspace mode (dropdown in navbar)
2. Check `WorkspaceContext` is initialized
3. Verify user has workspace membership

### Import from wrong file
1. Always use: `import from '../utils/devModeWrapper'`
2. Never use: `import from '../utils/sheets'`
3. Check current files don't have direct sheets imports

### Build errors
1. Run `npm test` to check for issues
2. Run `npm run build` to verify
3. Clear node_modules if needed: `rm -rf node_modules && npm install`

---

## Agent Checklists

### Before Starting Workspace Work
- [ ] Read "KEY TAKEAWAYS" section (above)
- [ ] Verify dev mode works: `npm start`
- [ ] Check test contacts load
- [ ] Review workspace data models
- [ ] Understand sheet resolution system

### When Adding Workspace Features
- [ ] Use `devModeWrapper.js` for data operations
- [ ] Use `useActiveSheetId()` for sheet resolution
- [ ] Test with different user roles
- [ ] Test empty state (clear test data)
- [ ] Run `npm test` and `npm run build`
- [ ] Create feature branch before coding

### Before Committing Workspace Code
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - no errors
- [ ] Test in dev mode with multiple roles
- [ ] Check for console errors (F12)
- [ ] Review `git diff`
- [ ] Use conventional commit message
- [ ] Push to feature branch (not main)

### Before Merging PR
- [ ] Code review completed
- [ ] All tests passing
- [ ] No conflicts with main
- [ ] Build succeeds
- [ ] Clear description of changes

---

## Related Documentation

- **[DEV_MODE_FOR_AGENTS.md](DEV_MODE_FOR_AGENTS.md)** - Dev mode patterns for agents
- **[DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)** - Complete development environment guide
- **[README.md](../README.md)** - Project overview
- **[SETUP_GUIDE.md](../SETUP_GUIDE.md)** - Complete setup instructions
- **[CONFIG.md](../CONFIG.md)** - Configuration reference

---

## Summary

### What You Need to Know About Workspaces

1. **Workspace = Shared workspace** with separate Google Sheet and team members
2. **Complete data separation** between personal and workspace modes (via sheet resolution)
3. **Role-based permissions** (owner, admin, member) control workspace management
4. **Invitation system** allows secure team member onboarding
5. **All features from personal mode available** in workspace mode

### What You Need to Know About Development

1. **Dev Mode is automatic** - Just import from `devModeWrapper.js`
2. **Sheet resolution is automatic** - Use `useActiveSheetId()` hook
3. **No manual mode checking needed** - Wrapper handles everything
4. **Each developer has isolated environment** - Dev Mode uses localStorage
5. **Separate environments** keep dev/production isolated

### What Makes This Work

**Zero-config wrapper pattern** - One import, works everywhere
**Automatic sheet resolution** - Hook handles mode switching
**Transparent dev mode** - Wrapper routes to localStorage automatically
**Complete isolation** - Personal and workspace data never mix
**Role-based access control** - Permissions enforced at data layer

---

**Status: READY FOR AGENT USE**

Date: 2025-12-29
For Questions: See related documentation listed above
