# AI Agent Quick Start Guide

> **For AI Coding Assistants:** Read this first, then refer to [docs/PRODUCTION_SETUP_GUIDE.md](docs/PRODUCTION_SETUP_GUIDE.md) for detailed implementation. For the complete documentation index, see [docs/README.md](docs/README.md).

---

## 30-Second Context

**Project:** Touchpoint CRM - Contact relationship management app
**Stack:** React + Vite + Google Sheets API + @react-oauth/google
**Goal:** 100% free production architecture (no paid services)
**Current State:** 100% free (fully migrated to Google Sheets architecture)

---

## Architecture at a Glance

```
Browser (React) → Google OAuth (@react-oauth/google) → Google Sheets API (database)
Cost: $0/month | Scales to: 1,000+ users
```

**What works:** Contacts, events, touchpoints, tasks, notes, workspaces (all in Google Sheets)

---

## File Map (Critical Files Only)

```
src/
├── config/constants.js              # Sheet names, headers - READ FIRST
├── utils/
│   ├── sheets.js                    # Google Sheets API integration (reference for patterns)
│   └── devModeWrapper.js            # localStorage ↔ Sheets switcher (pattern to copy)
├── services/
│   ├── workspaceHierarchyServiceSheets.js  # Workspace system (Google Sheets-based)
│   └── contactLinkService.js               # Contact linking (Google Sheets-based)
└── contexts/
    ├── AuthContext.js               # Token management (@react-oauth/google)
    └── WorkspaceContext.js          # Workspace context provider

docs/
├── README.md                        # 📖 Master documentation index
├── PRODUCTION_SETUP_GUIDE.md        # 📖 Full production implementation guide
├── ARCHITECTURE.md                  # 📖 System architecture diagrams
└── ...                              # See docs/README.md for full list

AI_AGENT_QUICKSTART.md               # 📖 This file (quick reference)
```

---

## Common User Requests & How to Help

### 1. "Help me set up production"
**Quick Answer:**
```
1. Read docs/PRODUCTION_SETUP_GUIDE.md sections 1-3 (Google Cloud + Sheets)
2. Guide user through creating:
   - Google Cloud OAuth credentials
   - Google Sheet with 16 tabs (see sheet structure below)
3. Help configure .env file
4. Test connections
```

**Detailed Guide:** [docs/PRODUCTION_SETUP_GUIDE.md - Phases 1-3](docs/PRODUCTION_SETUP_GUIDE.md#phase-1-google-cloud-setup)

---

### 2. "Validate my setup"
**Quick Checklist:**
```bash
# .env file has these variables
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_SHEETS_ID
VITE_DEV_MODE=false

# Google Sheet has 16 tabs
Contacts, Touchpoints, Events, Tasks, Notes, Contact Notes
Lists, Contact Lists, Audit Log, Import Settings, Import History
Activities
Workspaces, Workspace Members, Contact Links, Sync Conflicts

# Headers in row 1 of each sheet
See constants.js -> SHEET_HEADERS

# Authentication works
User can sign in with Google (@react-oauth/google)
Token stored in localStorage
Sheets API calls succeed
```

---

## Google Sheet Structure (16 Tabs)

### Core Data (8 tabs)
1. **Contacts** - `Contact ID | Date Added | Last Contact Date | Name | Phone | Email`
2. **Touchpoints** - `Touchpoint ID | Contact ID | Type | Date | Notes | Status`
3. **Events** - `Event ID | Event Created Date | Event Name | Event Date | Event Type | Location | Description | Attendees`
4. **Tasks** - `Task ID | Task Created Date | Title | Description | Due Date | Status | Assigned To`
5. **Notes** - `Note ID | Created Date | Content | Tags`
6. **Contact Notes** - `Note ID | Contact ID | Linked Date`
7. **Lists** - `List ID | List Created Date | List Name | Description`
8. **Contact Lists** - `Contact ID | List ID | Added To List Date`

### System (3 tabs)
9. **Audit Log** - `Timestamp | Contact ID | Field Changed | Old Value | New Value | User Email`
10. **Import Settings** - `Import ID | Import Name | Field Mappings | Schedule | Created Date`
11. **Import History** - `Import ID | Execution Date | Status | Rows Processed | Errors | User Email`

### New (5 tabs) - for 100% free architecture
12. **Activities** - `Activity ID | Activity Type | Contact ID | Workspace ID | Timestamp | User Email | Details`
13. **Workspaces** - `Workspace ID | Workspace Name | Parent Workspace ID | Path | Sheet ID | Created Date | Created By | Status | Description`
14. **Workspace Members** - `Member ID | Workspace ID | Member Email | Role | Added Date | Added By`
15. **Contact Links** - `Link ID | Source Sheet ID | Source Contact ID | Target Sheet ID | Target Contact ID | Sync Strategy | Last Sync | Created Date`
16. **Sync Conflicts** - `Conflict ID | Link ID | Field Name | Source Value | Target Value | Resolution | Resolved Date | Resolved By`

---

## Code Patterns to Follow

### ✅ GOOD - Follow this pattern
```javascript
// Pattern from src/utils/sheets.js
export async function createEntity(accessToken, sheetId, data, userEmail) {
  // 1. Generate ID
  const entityId = await generateEntityID(accessToken, sheetId);

  // 2. Prepare row
  const values = [
    entityId,
    data.name,
    new Date().toISOString() // Auto-fill timestamp
  ];

  // 3. Append to sheet
  await appendRow(accessToken, sheetId, SHEET_NAMES.ENTITY, values);

  // 4. Log to audit
  await logAuditEntry(accessToken, sheetId, {
    timestamp: new Date().toISOString(),
    contactId: '',
    fieldChanged: 'Entity Created',
    oldValue: '',
    newValue: data.name,
    userEmail
  });

  return entityId;
}
```

### ❌ BAD - Don't do this
```javascript
// Direct API calls without error handling or audit logging
export async function createEntity(accessToken, sheetId, data) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}...`);
  return response.json(); // No error handling, no audit log, no ID generation
}
```

---

## ID Generation Pattern

**All IDs follow this format:**
```javascript
Contact ID:   C0001, C0002, C0003, ...
Touchpoint ID: T0001, T0002, T0003, ...
Event ID:      E0001, E0002, E0003, ...
Workspace ID:  WS0001, WS0002, ...
Note ID:       N0001, N0002, ...
```

**Implementation:**
```javascript
async function generateContactID(accessToken, sheetId) {
  const contacts = await readSheetData(accessToken, sheetId, 'Contacts');

  const maxId = contacts.reduce((max, row) => {
    const id = row['Contact ID'];
    if (id && id.startsWith('C')) {
      const num = parseInt(id.replace('C', ''));
      return num > max ? num : max;
    }
    return max;
  }, 0);

  return `C${String(maxId + 1).padStart(4, '0')}`;
}
```

**Reference:** See `src/utils/sheets.js` lines 800-850 for full implementation.

---

## Auto-Generated Fields (NEVER manually edit)

**These fields are auto-managed by code:**
- `Contact ID` - Generated on creation
- `Date Added` - Auto-filled on creation
- `Last Contact Date` - Auto-updated when touchpoint logged
- `Touchpoint ID` - Generated on creation
- `Event ID` - Generated on creation
- `Event Created Date` - Auto-filled
- `Task ID` - Generated on creation
- `Task Created Date` - Auto-filled
- `Note ID` - Generated on creation
- `Created Date` (Notes) - Auto-filled
- `Linked Date` - Auto-filled when linking
- `Audit Log Timestamp` - Auto-filled
- `Workspace ID` - Generated on creation

**See:** `src/config/constants.js` for complete list

---

## Common Pitfalls to Avoid

### ❌ Don't hardcode sheet names
```javascript
// BAD
await readSheetData(accessToken, sheetId, 'Contacts');

// GOOD
await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS);
```

### ❌ Don't skip audit logging
```javascript
// BAD - No audit trail
await updateContact(accessToken, sheetId, contactId, newData);

// GOOD - Logs changes
await updateContact(accessToken, sheetId, contactId, oldData, newData, userEmail);
// This function internally calls logAuditEntry()
```

### ❌ Don't forget token refresh
```javascript
// BAD - Will fail after 1 hour
const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

// GOOD - Has retry logic built-in
const data = await readSheetData(accessToken, sheetId, sheetName);
// This uses the retry logic from sheets.js
```

### ❌ Don't assume .env is loaded
```javascript
// BAD - Will crash if undefined
const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;

// GOOD - Provides helpful error
const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
if (!sheetId) {
  throw new Error('VITE_GOOGLE_SHEETS_ID not configured. Please run setup wizard or check .env file.');
}
```

---

## Testing Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Validate sheet structure (custom script)
node scripts/validateSheetStructure.js

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Environment Variables (.env)

```bash
# Google Configuration (required)
VITE_GOOGLE_SHEETS_ID=1a2b3c4d5e6f7g8h9i0j_your_sheet_id
VITE_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com

# Mode (set to false for production)
VITE_DEV_MODE=false
```

**Where to get these:**
- Google Client ID: Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs
- Google Sheets ID: From spreadsheet URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

---

## Free Tier Limits

| Service | Free Tier Limit | Your Usage | Status |
|---------|-----------------|------------|--------|
| Google Sheets API | 500 req/100sec per user | ~22 req/day per user | Safe |
| Google OAuth | Unlimited users | N/A | Free |

**Result:** Scales to **1,000+ concurrent users** on 100% free tier.

---

## When to Ask User for Clarification

**Ask if:**
- User wants manual setup OR setup wizard (default: wizard)
- User has existing production data to migrate (default: assume fresh start)
- User needs email/SMS in future (affects architecture decisions)

**Don't assume:**
- User has backend dev experience (guide them step-by-step)
- User knows Google Cloud Console (provide screenshots/links)
- .env file is configured correctly (always validate)

---

## Quick Debugging

### Issue: "401 Unauthorized" on Sheets API calls
**Fix:**
1. Check `localStorage.googleAccessToken` exists
2. Check `localStorage.googleAccessTokenExpiresAt` is in future
3. Sign out and sign back in
4. Verify OAuth client ID in Google Cloud Console

### Issue: "Sheet not found"
**Fix:**
1. Verify `VITE_GOOGLE_SHEETS_ID` in .env
2. Check sheet ID matches Google Sheet URL
3. Ensure user has access to the sheet (signed in with correct Google account)

### Issue: "Missing required headers"
**Fix:**
1. Check row 1 of sheet has correct headers (see constants.js)
2. Verify sheet name matches exactly (case-sensitive)
3. Use `SHEET_NAMES` constants, not hardcoded strings

### Issue: "Workspaces not loading"
**Fix:**
1. Verify Workspaces, Workspace Members tabs exist in Google Sheet
2. Check browser console for specific error message
3. Verify `WorkspaceContext.js` is using Sheets service

---

## Next Steps for User

**Phase 1: Manual Setup (2-4 hours)**
1. Create Google Cloud Project + OAuth credentials
2. Create Firebase project + enable Auth
3. Create Google Sheet with 16 tabs + headers
4. Configure .env file

---

## Resources

- **Documentation Index:** [docs/README.md](docs/README.md)
- **Full Production Guide:** [docs/PRODUCTION_SETUP_GUIDE.md](docs/PRODUCTION_SETUP_GUIDE.md)
- **Architecture Diagrams:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Constants:** [src/config/constants.js](src/config/constants.js)
- **Sheets API Reference:** [src/utils/sheets.js](src/utils/sheets.js)
- **Dev Mode Wrapper:** [src/utils/devModeWrapper.js](src/utils/devModeWrapper.js)

---

## Summary for AI Agents

**What you need to know:**
1. App is 100% free (fully Google Sheets-based, including workspaces)
2. All data stored in Google Sheets - no paid services needed
3. Follow patterns in `sheets.js` for all new code
4. Always use constants from `constants.js`
5. Always log to Audit Log
6. Always handle token expiration

**Your job:**
1. Help user set up Google Cloud + Firebase + Sheets
2. Test and validate everything works

**Read this file, then dive into [docs/README.md](docs/README.md) for the complete documentation index or [docs/PRODUCTION_SETUP_GUIDE.md](docs/PRODUCTION_SETUP_GUIDE.md) for detailed implementation steps.**
