# Touchpoint CRM - Architecture Overview

> Visual guide to the 100% free production architecture

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │           React Application (Vite)                        │ │
│  │                                                           │ │
│  │  Components:                                              │ │
│  │  • ContactList, ContactProfile, AddContact                │ │
│  │  • EventsList, AddEvent                                   │ │
│  │  • WorkspaceDashboard, CreateWorkspace                     │ │
│  │  • TasksPage, NotesInbox                                  │ │
│  │                                                           │ │
│  │  Contexts:                                                │ │
│  │  • AuthContext (token management)                         │ │
│  │  • WorkspaceContext (workspace state)                      │ │
│  │                                                           │ │
│  │  Services:                                                │ │
│  │  • workspaceHierarchyServiceSheets.js                     │ │
│  │  • contactLinkService.js                                  │ │
│  │  • importExecutor.js                                      │ │
│  │                                                           │ │
│  │  Utils:                                                   │ │
│  │  • sheets.js (Google Sheets API)                          │ │
│  │  • devModeWrapper.js (dev/prod switcher)                  │ │
│  │  • activities.js (activity tracking)                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │ HTTPS API Calls                  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
    ┌──────────────────┐          ┌──────────────────┐
    │   Google         │          │   Google         │
    │   Sheets API     │          │   Calendar API   │
    │                  │          │   (optional)     │
    └────────┬─────────┘          └────────┬─────────┘
             │                              │
             │                              │
             ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │   Google Sheets  │          │   Google         │
    │   Database       │          │   Calendar       │
    │                  │          │                  │
    │  25+ Tabs:       │          │  • Events        │
    │  • Contacts      │          │  • Reminders     │
    │  • Events        │          │  • Sync          │
    │  • Workspaces    │          │                  │
    │  • Tasks         │          │                  │
    │  • Notes         │          │                  │
    │  • ...etc        │          │                  │
    └──────────────────┘          └──────────────────┘

         FREE                           FREE
    Unlimited data                 Unlimited sync
```

---

## Data Flow Diagram

### User Sign-In Flow

```
1. User clicks "Sign in with Google"
   │
   ▼
2. AuthContext initiates @react-oauth/google
   │
   ▼
3. Direct Google OAuth 2.0 flow
   │
   ▼
4. User grants permissions (Google Sheets scope)
   │
   ▼
5. Google OAuth returns access token
   │
   ▼
6. Token saved to localStorage
   │  • googleAccessToken
   │  • googleAccessTokenExpiresAt (timestamp + 3600s)
   │
   ▼
7. User redirected to app dashboard
   │
   ▼
8. App makes Sheets API calls with token
```

### Contact Creation Flow

```
1. User fills out "Add Contact" form
   │
   ▼
2. Component calls addContact()
   │
   ▼
3. addContact() generates Contact ID (C0001, C0002, etc.)
   │  • Reads all existing contacts
   │  • Finds max ID
   │  • Increments by 1
   │
   ▼
4. Prepares row data
   │  • Contact ID (auto)
   │  • Date Added (auto)
   │  • Last Contact Date (auto, initially empty)
   │  • Name (user input)
   │  • Phone (user input)
   │  • Email (user input)
   │
   ▼
5. Calls appendRow() → Google Sheets API
   │  POST https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/{range}:append
   │
   ▼
6. Logs to Audit Log
   │  • Timestamp: now
   │  • Contact ID: C0001
   │  • Field Changed: "Contact Created"
   │  • Old Value: ""
   │  • New Value: "John Doe"
   │  • User Email: user@example.com
   │
   ▼
7. Returns Contact ID to UI
   │
   ▼
8. UI refreshes contact list
```

### Workspace Hierarchy Flow

```
1. User creates "2024 Workspace"
   │
   ▼
2. createSubWorkspace() called
   │
   ▼
3. Generate Workspace ID (WS0001)
   │
   ▼
4. Calculate materialized path
   │  • Parent path: ""
   │  • New path: "/2024-workspace"
   │
   ▼
5. Write to "Workspaces" sheet
   │  • Workspace ID: WS0001
   │  • Workspace Name: 2024 Workspace
   │  • Parent Workspace ID: (empty)
   │  • Path: /2024-workspace
   │  • Sheet ID: (workspace's Google Sheet ID)
   │  • Created Date: 2026-01-25T12:00:00Z
   │  • Created By: user@example.com
   │  • Status: active
   │
   ▼
6. User creates sub-workspace "Q1 Outreach"
   │
   ▼
7. createSubWorkspace() called with parent = WS0001
   │
   ▼
8. Calculate path
   │  • Parent path: "/2024-workspace"
   │  • New path: "/2024-workspace/q1-outreach"
   │
   ▼
9. Write to "Workspaces" sheet
   │  • Workspace ID: WS0002
   │  • Workspace Name: Q1 Outreach
   │  • Parent Workspace ID: WS0001
   │  • Path: /2024-workspace/q1-outreach
   │  • ...
   │
   ▼
10. To query children: SELECT WHERE Path LIKE '/2024-workspace/%'
    │  Returns: WS0002 (Q1 Outreach) and any other sub-workspaces
```

---

## Sheet Structure & Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOOGLE SHEETS DATABASE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │  Contacts   │◄────┬───┤ Touchpoints │                       │
│  │             │     │   │             │                       │
│  │ Contact ID  │     │   │ Contact ID  │  (Foreign Key)        │
│  │ Name        │     │   │ Type        │                       │
│  │ Phone       │     │   │ Date        │                       │
│  │ Email       │     │   │ Notes       │                       │
│  └──────┬──────┘     │   └─────────────┘                       │
│         │            │                                          │
│         │            │   ┌─────────────┐                       │
│         │            └───┤    Notes    │                       │
│         │                │             │                       │
│         │                │ Note ID     │                       │
│         │                │ Content     │                       │
│         │                └──────┬──────┘                       │
│         │                       │                              │
│         │                       │                              │
│         │                ┌──────▼──────┐                       │
│         └────────────────┤Contact Notes│  (Junction Table)     │
│                          │             │                       │
│                          │ Note ID     │                       │
│                          │ Contact ID  │                       │
│                          └─────────────┘                       │
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │ Workspaces  │◄────┬───┤  Workspace  │                       │
│  │             │     │   │   Members   │                       │
│  │Workspace ID │     │   │             │                       │
│  │ Name        │     │   │Workspace ID │  (Foreign Key)        │
│  │ Path        │     │   │ Member Email│                       │
│  │ Sheet ID    │     │   │ Role        │                       │
│  └──────┬──────┘     │   └─────────────┘                       │
│         │            │                                          │
│         │            │   ┌─────────────┐                       │
│         └────────────────┤Contact Links│                       │
│                          │             │                       │
│                          │ Source      │                       │
│                          │  Sheet ID   │                       │
│                          │ Source      │                       │
│                          │  Contact ID │                       │
│                          │ Target      │                       │
│                          │  Sheet ID   │                       │
│                          │ Target      │                       │
│                          │  Contact ID │                       │
│                          └─────────────┘                       │
│                                                                 │
│  ┌─────────────┐                                               │
│  │ Audit Log   │  (Tracks all changes)                         │
│  │             │                                               │
│  │ Timestamp   │                                               │
│  │ Contact ID  │                                               │
│  │ Field       │                                               │
│  │ Old Value   │                                               │
│  │ New Value   │                                               │
│  │ User Email  │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION SEQUENCE                      │
└─────────────────────────────────────────────────────────────────┘

Browser                 Firebase Auth       Google OAuth      Sheets API
   │                         │                   │               │
   │ 1. Click "Sign In"      │                   │               │
   ├────────────────────────►│                   │               │
   │                         │                   │               │
   │                         │ 2. Redirect       │               │
   │                         ├──────────────────►│               │
   │                         │                   │               │
   │                         │                   │ 3. User grants│
   │                         │                   │    permissions│
   │                         │                   │    (Sheets    │
   │                         │                   │     scope)    │
   │                         │                   │               │
   │                         │ 4. Return token   │               │
   │                         │◄──────────────────┤               │
   │                         │                   │               │
   │ 5. Token + user info    │                   │               │
   │◄────────────────────────┤                   │               │
   │                         │                   │               │
   │ 6. Save to localStorage │                   │               │
   │    • googleAccessToken  │                   │               │
   │    • expiresAt          │                   │               │
   │                         │                   │               │
   │ 7. Redirect to app      │                   │               │
   │                         │                   │               │
   │                         │                   │               │
   │ 8. Make Sheets API call │                   │               │
   │    with token           │                   │               │
   ├─────────────────────────────────────────────────────────────►│
   │                         │                   │               │
   │                         │                   │ 9. Validate   │
   │                         │                   │    token      │
   │                         │                   │               │
   │                         │                   │ 10. Return    │
   │                         │                   │     data      │
   │◄─────────────────────────────────────────────────────────────┤
   │                         │                   │               │
   │                         │                   │               │
   │ ... 55 minutes pass ... │                   │               │
   │                         │                   │               │
   │ 11. Token expires       │                   │               │
   │     (expiresAt reached) │                   │               │
   │                         │                   │               │
   │ 12. Next API call gets  │                   │               │
   │     401 Unauthorized    │                   │               │
   │◄─────────────────────────────────────────────────────────────┤
   │                         │                   │               │
   │ 13. Refresh token       │                   │               │
   ├────────────────────────►│                   │               │
   │                         │                   │               │
   │ 14. New token           │                   │               │
   │◄────────────────────────┤                   │               │
   │                         │                   │               │
   │ 15. Retry original      │                   │               │
   │     API call            │                   │               │
   ├─────────────────────────────────────────────────────────────►│
   │                         │                   │               │
   │ 16. Success             │                   │               │
   │◄─────────────────────────────────────────────────────────────┤
   │                         │                   │               │
```

---

## Dev Mode vs Production Mode

### Dev Mode (VITE_DEV_MODE=true)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEV MODE ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

React Components
   │
   ▼
devModeWrapper.js  ◄─── Intercepts all Sheets API calls
   │
   │  if (import.meta.env.VITE_DEV_MODE === 'true')
   │      ↓
   │  Use localStorage instead of Sheets API
   │
   ▼
localStorage
   • test_contacts
   • test_touchpoints
   • test_events
   • test_workspaces
   • test_notes
   • etc.

Benefits:
  ✓ No internet required
  ✓ Instant API responses
  ✓ No quota limits
  ✓ Easy testing
  ✓ No Google account needed
```

### Production Mode (VITE_DEV_MODE=false)

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCTION MODE ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

React Components
   │
   ▼
devModeWrapper.js  ◄─── Passes through to sheets.js
   │
   │  if (import.meta.env.VITE_DEV_MODE === 'false')
   │      ↓
   │  Use real Sheets API
   │
   ▼
sheets.js
   │
   ▼
Google Sheets API
   │
   ▼
Google Sheets Database (16 tabs)

Benefits:
  ✓ Multi-user access
  ✓ Persistent storage
  ✓ Real-time updates (via polling)
  ✓ Audit trail
  ✓ Export to CSV/Excel
```

---

## Workspace Hierarchy (Materialized Path Pattern)

```
┌─────────────────────────────────────────────────────────────────┐
│                     WORKSPACE HIERARCHY                         │
└─────────────────────────────────────────────────────────────────┘

Workspace ID│ Name              │ Parent ID │ Path
────────────┼───────────────────┼───────────┼─────────────────────────
WS0001      │ 2024 Workspace    │           │ /2024-workspace
WS0002      │ Q1 Outreach       │ WS0001    │ /2024-workspace/q1-outreach
WS0003      │ Q2 Outreach       │ WS0001    │ /2024-workspace/q2-outreach
WS0004      │ Email Workspace   │ WS0002    │ /2024-workspace/q1-outreach/email
WS0005      │ Phone Workspace   │ WS0002    │ /2024-workspace/q1-outreach/phone
WS0006      │ 2025 Workspace    │           │ /2025-workspace

Visualization:

2024 Workspace (WS0001)
├── Q1 Outreach (WS0002)
│   ├── Email Workspace (WS0004)
│   └── Phone Workspace (WS0005)
└── Q2 Outreach (WS0003)

2025 Workspace (WS0006)


Queries:

1. Get all workspaces for 2024:
   SELECT * FROM Workspaces WHERE Path LIKE '/2024-workspace%'

2. Get direct children of Q1 Outreach:
   SELECT * FROM Workspaces WHERE Parent ID = 'WS0002'

3. Get all descendants of 2024 Workspace:
   SELECT * FROM Workspaces WHERE Path LIKE '/2024-workspace/%'

4. Get workspace depth:
   Depth = Path.split('/').length - 1
   Example: /2024-workspace/q1-outreach/email → depth = 3
```

---

## Contact Syncing Between Workspaces

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACT SYNC ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

Personal Sheet                    Workspace Sheet
  (Sheet ID: ABC123)                (Sheet ID: XYZ789)

┌─────────────────┐              ┌─────────────────┐
│  Contacts Tab   │              │  Contacts Tab   │
│                 │              │                 │
│ Contact ID: C001│              │ Contact ID: C015│
│ Name: John Doe  │              │ Name: John Doe  │
│ Phone: 555-1234 │              │ Phone: 555-1234 │
│ Email: john@... │              │ Email: john@... │
│ [Custom Fields] │              │ [Custom Fields] │
└─────────────────┘              └─────────────────┘
         │                                │
         │                                │
         └────────────┬───────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │ Contact Links   │
            │      Tab        │
            │                 │
            │ Link ID: L001   │
            │ Source Sheet:   │
            │   ABC123        │
            │ Source Contact: │
            │   C001          │
            │ Target Sheet:   │
            │   XYZ789        │
            │ Target Contact: │
            │   C015          │
            │ Sync Strategy:  │
            │   core_fields   │
            │   _only         │
            │ Last Sync:      │
            │   2026-01-25    │
            └─────────────────┘

Sync Strategies:

1. core_fields_only
   → Only sync: Name, Phone, Email
   → Custom fields stay independent

2. all_fields
   → Sync everything
   → Updates propagate both ways

3. custom
   → User selects which fields to sync
   → Stored as JSON in Contact Links

Conflict Resolution:

When both sheets have updates:

Personal Sheet        Workspace Sheet     Resolution
─────────────────────────────────────────────────────
Name: John Doe        Name: Jonathan Doe  → CONFLICT
Phone: 555-1234       Phone: 555-1234     → Match
Email: john@...       Email: john@...     → Match

Conflict logged to Sync Conflicts tab:
┌─────────────────────────────────────────────────┐
│ Conflict ID: CON001                             │
│ Link ID: L001                                   │
│ Field Name: Name                                │
│ Source Value: John Doe                          │
│ Target Value: Jonathan Doe                      │
│ Resolution: pending (user must choose)          │
└─────────────────────────────────────────────────┘
```

---

## Import Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                       IMPORT PIPELINE                           │
└─────────────────────────────────────────────────────────────────┘

1. User uploads CSV file
   │
   ▼
2. Parse CSV with PapaParse
   │  → Returns array of objects
   │
   ▼
3. Read Import Settings sheet
   │  → Get field mappings
   │  → CSV Column "Full Name" → Contact Field "Name"
   │  → CSV Column "Tel" → Contact Field "Phone"
   │
   ▼
4. Transform data using mappings
   │  → Apply transformations
   │  → Validate required fields
   │
   ▼
5. Detect duplicates
   │  → Compare Phone and Email with existing contacts
   │  → Mark duplicates for merge or skip
   │
   ▼
6. User reviews import preview
   │  → Shows: 50 new, 10 duplicates, 5 errors
   │  → User chooses: Skip duplicates OR Update duplicates
   │
   ▼
7. Batch write to Contacts sheet
   │  → Process in batches of 50 rows
   │  → Use appendRow() for new contacts
   │  → Use updateRow() for duplicate updates
   │
   ▼
8. Log each change to Audit Log
   │  → Timestamp, Contact ID, Field Changed, Old/New Values
   │
   ▼
9. Write to Import History sheet
   │  → Import ID, Status: Success, Rows Processed: 60
   │
   ▼
10. Show completion summary to user
    → "Successfully imported 50 new contacts, updated 10 duplicates"

Error Handling:

• Network error → Retry with exponential backoff (1s, 2s, 4s, 8s)
• Auth error (401) → Refresh token and retry
• Validation error → Skip row, log to errors array
• Partial batch failure → Continue with remaining batches
```

---

## Auto-Refresh System

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO-REFRESH MECHANISM                       │
└─────────────────────────────────────────────────────────────────┘

Timeline:

  0s ───► User opens app
           │
           ▼
  0s ───► Initial data load
           │  • Contacts
           │  • Touchpoints
           │  • Events
           │  • Workspaces
           │
           ▼
 60s ───► Poll for changes (autoRefreshService.js)
           │
           │  1. Fetch latest data from Sheets
           │  2. Calculate checksum (hash of all data)
           │  3. Compare with previous checksum
           │
           ├─ If different: Update UI
           │
           └─ If same: No update (avoid unnecessary re-renders)
           │
           ▼
120s ───► Poll again
           │
           ▼
180s ───► Poll again
           │
          ...continues every 60 seconds...

Checksum Calculation:

const checksum = calculateChecksum([contacts, touchpoints, events]);
// Uses MD5 or simple string hash

previousChecksum: "a1b2c3d4"
currentChecksum:  "a1b2c3d4"  → No changes, skip update

previousChecksum: "a1b2c3d4"
currentChecksum:  "x9y8z7w6"  → Changes detected, update UI


Manual Refresh:

User clicks "Refresh" button
   │
   ▼
forceRefresh() called
   │
   ▼
Bypass checksum, always update UI
```

---

## Rate Limiting & Quota Management

```
┌─────────────────────────────────────────────────────────────────┐
│                  GOOGLE SHEETS API QUOTAS                       │
└─────────────────────────────────────────────────────────────────┘

Free Tier Limits:
  • 500 requests per 100 seconds per user
  • ~40,000 cells read/write per minute

Your App Usage:

Per User Per Day:
  • Login: 1 request
  • Load contacts: 1 request
  • Load touchpoints: 1 request
  • Load events: 1 request
  • Load workspaces: 1 request
  • Load notes: 1 request
  • Add contact: 1 request
  • Add touchpoint: 1 request
  • Auto-refresh (60s): 4 requests/hour × 8 hours = 32 requests
  ─────────────────────────────────────────────────────────────
  Total: ~40 requests/day per user

Capacity:
  • Quota: 500 requests per 100 seconds = 18,000 requests/hour
  • Your usage: 40 requests/day = 5 requests/hour
  • Buffer: 3,600x headroom ✓

Scaling:
  • 100 users: 500 req/hour = well within quota ✓
  • 1,000 users: 5,000 req/hour = approaching limit ⚠️
  • 10,000 users: 50,000 req/hour = exceeded, need caching ❌

Optimization Strategies (for 1,000+ users):

1. Implement caching layer (Redis or Google Apps Script)
2. Batch requests (read multiple sheets in one call)
3. Use conditional requests (If-None-Match headers)
4. Increase polling interval (60s → 120s)
5. Implement request queue with rate limiting
```

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
  ┌─────────────────────────────────────────────────────────┐
  │ Firebase Auth + Google OAuth                            │
  │                                                         │
  │ ✓ User must sign in with Google account                │
  │ ✓ OAuth token has limited lifetime (1 hour)            │
  │ ✓ Token refresh requires user interaction              │
  │ ✓ User can revoke access at any time                   │
  └─────────────────────────────────────────────────────────┘

Layer 2: Authorization
  ┌─────────────────────────────────────────────────────────┐
  │ Google Sheets Access Control                           │
  │                                                         │
  │ ✓ Sheet must be shared with user's Google account      │
  │ ✓ Permissions: View/Edit/Owner                         │
  │ ✓ User can only access sheets they have permission for │
  └─────────────────────────────────────────────────────────┘

Layer 3: Audit Trail
  ┌─────────────────────────────────────────────────────────┐
  │ Audit Log Sheet                                         │
  │                                                         │
  │ ✓ Every change logged with timestamp                   │
  │ ✓ User email recorded for all operations               │
  │ ✓ Old/new values tracked                               │
  │ ✓ Immutable log (append-only)                          │
  └─────────────────────────────────────────────────────────┘

Layer 4: Client-Side Security
  ┌─────────────────────────────────────────────────────────┐
  │ Browser Security                                        │
  │                                                         │
  │ ✓ HTTPS only (enforced by hosting)                     │
  │ ✓ Token stored in localStorage (not cookies)           │
  │ ✓ No server-side secrets (client-side app)             │
  │ ✓ OAuth scope limited to Sheets API only               │
  └─────────────────────────────────────────────────────────┘

What's NOT Secured:
  ❌ No server-side validation (client can modify requests)
  ❌ No rate limiting enforcement (relies on Google's limits)
  ❌ No encryption at rest (Google Sheets stores plain text)
  ❌ No field-level access control (all or nothing)

Acceptable for:
  ✓ Small teams (trusted users)
  ✓ Internal tools
  ✓ Non-sensitive data

Not suitable for:
  ❌ Public-facing applications
  ❌ Highly sensitive data (PII, financial, health)
  ❌ Untrusted users
```

---

## Cost Breakdown (100% Free)

```
┌─────────────────────────────────────────────────────────────────┐
│                      MONTHLY COST: $0                           │
└─────────────────────────────────────────────────────────────────┘

Service                  Free Tier           Usage           Cost
─────────────────────────────────────────────────────────────────
Google Sheets API        Unlimited data      ~1GB data        $0
                         500 req/100s/user   ~40 req/day/user

Google OAuth 2.0         Unlimited           All auth         $0

Firebase Auth            Unlimited users     100 users        $0
(Spark Plan)

Google Calendar API      Unlimited           Optional         $0
(optional)

Domain Name              Optional            Optional         $0-15/year
(can use free subdomain)                                      (optional)
─────────────────────────────────────────────────────────────────
TOTAL                                                         $0/month

Free tier capacity:
  • 100 users: ✓ Well within limits
  • 1,000 users: ✓ At limit, still free
  • 10,000+ users: Need Apps Script caching (still free)
```

---

**Last Updated:** 2026-02-07
**Version:** 1.0.0
**Architecture Status:** Production-Ready (100% Free)
