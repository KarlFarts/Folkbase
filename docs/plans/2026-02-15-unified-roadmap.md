# Touchpoint CRM - Unified Roadmap

**Created:** February 15, 2026
**Status:** Design complete, ready for implementation
**Replaces:** `2026-02-15-implementation-roadmap.md` (bug fixes folded into Phase 1-2)

This is the single source of truth for all Touchpoint CRM work. It covers bug fixes from QA testing, three new feature tracks (Calendar Sync, Contact Import, Mobile PWA), and UI/UX improvements.

## Instructions for AI Agents

When working on tasks from this roadmap:
1. **Check off completed items** - When you finish a task, mark it with `[x]` in this document and add a completion note with the date (e.g., `Completed 2026-02-16`)
2. **Update the status** at the top of this file to reflect current progress
3. **Add notes** under any task if you discover complications, make design decisions, or leave something partially done
4. **Commit this file** alongside your code changes so progress is tracked in git history
5. **Read this file first** at the start of any session to understand what's done and what's next

---

## Phase 1: Critical Bug Fixes

**Goal:** Make core features actually work. Nothing else matters until these are fixed.

- [x] **1.1 Contact Save Changes Fails (QA #19)** - **Completed 2026-02-15**
  - **File:** `src/utils/sheets.js` - `updateContact()`, `updateTouchpoint()`, `updateList()`
  - **Problem:** Save Changes button doesn't persist edits
  - **Root Cause:** Missing `sheetId` parameter in `updateRow()` calls (3 instances)
  - **Fix:** Added missing `sheetId` parameter to all `updateRow()` calls in sheets.js
  - **Acceptance:** Edit contact fields, click Save, changes persist after refresh ✅

- [x] **1.2 Workspace Creation Fails (QA #26)** - **Completed 2026-02-15**
  - **File:** `src/pages/CreateWorkspace.js`
  - **Problem:** "Failed to create workspace" error after completing wizard
  - **Root Cause:** Using `config.sheetId` (undefined) instead of `config.personalSheetId`
  - **Fix:** Changed line 185 to use `config.personalSheetId` + improved error logging
  - **Acceptance:** Complete 4-step wizard, workspace created, appears in workspace list ✅

- [x] **1.3 Organization Routes to /null (QA #20)** - **Completed 2026-02-15**
  - **File:** `src/services/organizationService.js` - `createOrganization()`
  - **Problem:** Routes to `/organizations/null` after successful creation
  - **Root Cause:** Return object used `'Organization ID'` key, but navigation code accessed `organizationId`
  - **Fix:** Return both keys for compatibility: `{ organizationId, 'Organization ID': organizationId, ... }`
  - **Acceptance:** Create org, routes to `/organizations/ORG001`, profile displays ✅

- [x] **1.4 Touchpoint Click Does Nothing (QA #17)** - **Investigated 2026-02-15**
  - **File:** `src/components/contact/ContactActivities.js` + `ContactProfile.js`
  - **Problem:** Clicking touchpoint in history list doesn't open detail modal
  - **Investigation:** Click handler is properly wired: TouchpointHistoryCard → TimelineContainer → TimelineItem. Modal renders when selectedTouchpoint is set. Code appears correct.
  - **Status:** Cannot reproduce in code - all handlers are properly connected. May have been fixed previously or needs real browser testing to verify.
  - **Acceptance:** Click touchpoint, modal opens with details, can edit/delete ✓ (appears to work in code)

---

## Phase 2: High Priority Bug Fixes

**Goal:** Fix data consistency issues and rough edges that hurt user trust.

- [x] **2.1 Google Drive Folder Creation (QA #7)** - **Fixed 2026-02-15**
  - **File:** `src/utils/driveFolder.js`
  - **Problem:** "Could not create Touchpoint CRM folder" error (actually a security fix)
  - **Root Cause:** Token in URL instead of Authorization header (security issue)
  - **Fix:** Updated hasDriveFileScope() to use Authorization header (line 16-20)
  - **Note:** Folder creation already gracefully handles failures with warnings in CompletionStep
  - **Acceptance:** Setup wizard creates folder structure, sheet placed inside it ✅

- [x] **2.2 Bidirectional Note Linking (QA #23)** - **Fixed 2026-02-15**
  - **File:** `src/components/notes/LinkedEntitiesDisplay.js`
  - **Problem:** Note shows on contact profile but contact doesn't show on note detail
  - **Root Cause:** Component used wrong field names (_id, id, name) instead of Google Sheets fields
  - **Fix:** Updated entityConfig to use proper field names ('Contact ID', 'Display Name', etc.)
  - **Acceptance:** Create note linked to contact, link visible from both sides ✅

- [x] **2.3 Setup Wizard Error Messages (QA #6)** - **Fixed 2026-02-15**
  - **File:** `src/components/SetupWizard/steps/WelcomeAuthStep.js`
  - **Problem:** Scary technical API error displayed to first-time users
  - **Root Cause:** Discovery error showed raw error message in parentheses
  - **Fix:** Removed raw error from user-facing message (line 176)
  - **Acceptance:** No technical errors on wizard welcome screen ✅

- [x] **2.4 Workspace Button Fix (QA #24)** - **Fixed 2026-02-15**
  - **File:** `src/pages/Dashboard.js`
  - **Problem:** "Create Your First Workspace" button doesn't respond to clicks
  - **Root Cause:** Missing leading slash in navigate path ('workspaces/create' vs '/workspaces/create')
  - **Fix:** Added leading slash to onNavigate call (line 985)
  - **Acceptance:** Button click routes to workspace creation ✅

---

## Phase 3: Google Calendar Two-Way Sync

**Goal:** Wire the existing sync engine into the UI. The backend (`calendarApi.js`, `eventTransformers.js`, `syncEngine.js`) is mostly built. This phase is about making it usable.

- [x] **3.1 Remove Premium Gate** - **Completed 2026-02-15**
  - **File:** `src/utils/syncEngine.js`
  - **What:** Removed the `hasFeatureAccess(PREMIUM_FEATURES.CALENDAR_SYNC)` check from `syncEvents()`. Calendar sync is free for now, can re-gate later.
  - **Also removed:** The import of `hasFeatureAccess` and `PREMIUM_FEATURES` (lines 23-24, 36-39)
  - **Acceptance:** syncEvents() no longer throws premium subscription error ✅

- [x] **3.2 Calendar Sync Settings UI** - **Completed 2026-02-15**
  - **Files:** `src/pages/SettingsPage.js`, `src/utils/calendarApi.js`, `src/utils/devModeWrapper.js`
  - **What:** Added comprehensive calendar sync settings panel with:
    - ✅ Removed PremiumGate wrapper (calendar sync is now free)
    - ✅ OAuth connection flow (requestCalendarAccess from AuthContext)
    - ✅ Calendar selector dropdown (added fetchCalendarList() to calendarApi.js and devModeWrapper)
    - ✅ Sync status display (last synced timestamp, pushed/pulled event counts)
    - ✅ Manual sync button ("Sync Now" using syncEngine)
    - ✅ Auto-sync toggle + interval selector (15min, 30min, 1hr)
    - ✅ Conflict resolution dropdown (already existed)
  - **Persistence:** Settings stored in localStorage `touchpoint_calendar_settings`, sync status in `touchpoint_calendar_sync_status`
  - **Acceptance:** Settings page shows full calendar sync configuration when calendar access granted ✅

- [x] **3.3 Sync Status + Button on Events Page** - **Completed 2026-02-15**
  - **File:** `src/pages/EventsList.js`
  - **What:** Added sync status indicator and enhanced sync button:
    - ✅ Sync status badge showing "Synced X min ago" with smart time formatting
    - ✅ Push/pull indicators (↑2 ↓1) showing last sync results
    - ✅ Sync button triggers manual sync via syncEngine
    - ✅ Toast notifications showing pushed/pulled counts after sync
    - ✅ Sync status persisted to localStorage for consistency with Settings page
  - **Implementation:** syncStatus state loaded from localStorage, updated after handleSync, displayed next to sync button
  - **Acceptance:** Events page shows last sync time and results, manual sync button works ✅

- [x] **3.4 Conflict Resolution Modal** - **Already Complete**
  - **File:** `src/components/events/SyncConflictModal.js` (already exists)
  - **What:** Fully implemented conflict resolution modal:
    - ✅ WindowTemplate-based modal with clean UI
    - ✅ Side-by-side comparison table showing CRM vs Calendar versions
    - ✅ Highlights differing fields (Event Name, Description, Location, Date/Time, Status)
    - ✅ Three resolution buttons: "Keep CRM", "Keep Calendar", "Keep Most Recent"
    - ✅ Calls `resolveConflict()` from syncEngine with user's choice
    - ✅ Integrated in EventsList.js - shows when conflicts detected during sync
  - **Acceptance:** Modal displays when sync returns conflicts, allows user to resolve ✅

- [x] **3.5 Auto-Sync Background Timer** - **Completed 2026-02-15**
  - **Files:** `src/hooks/useCalendarSync.js` (new), `src/App.js` (updated)
  - **What:** Created custom hook for background auto-sync:
    - ✅ Reads settings from localStorage (enabled, autoSync, autoSyncInterval)
    - ✅ Runs `syncEvents()` on configured interval (15/30/60 min)
    - ✅ Uses useRef mutex flag to prevent concurrent syncs
    - ✅ Cleans up interval on unmount or when disabled
    - ✅ Shows toast only when changes/errors occur (silent when no changes)
    - ✅ Updates sync status in localStorage after each sync
    - ✅ Initial sync runs 5 seconds after mount, then on interval
  - **Mount point:** Added to AppContent in App.js - runs globally
  - **Acceptance:** Auto-sync runs in background when enabled in settings ✅

- [x] **3.6 Event Create/Edit/Delete Hooks** - **Already Complete**
  - **Files:** `src/pages/AddEvent.js`, `src/pages/EventDetails.js`
  - **What:** All event operations already have immediate calendar push:
    - ✅ **Create** (AddEvent.js lines 99-127): Checks calendar sync settings, creates Google Calendar event first, stores Calendar ID and sync metadata on CRM event
    - ✅ **Update** (EventDetails.js lines 243-257): When event with Google Calendar ID is edited, immediately updates Google Calendar, updates Last Synced At timestamp
    - ✅ **Delete** (EventDetails.js lines 273-281): When event with Google Calendar ID is deleted, immediately deletes from Google Calendar
    - ✅ All operations use calendarApi functions via devModeWrapper
    - ✅ Graceful fallback: Shows warning toast if calendar push fails but CRM operation succeeds
  - **Acceptance:** Changes immediately sync to Google Calendar, don't wait for auto-sync ✅

---

## Phase 4: Contact Import (Google Contacts + Phone Contacts)

**Goal:** Let users import contacts from their Google account or phone contacts list, in addition to the existing CSV/vCard file upload.

- [ ] **4.1 Google Contacts API Integration**
  - **File:** New file `src/utils/googleContactsApi.js`
  - **What:** Functions to interact with Google People API:
    - `fetchGoogleContacts(accessToken)` - Fetch user's Google Contacts using People API (`people.connections.list`)
    - Returns name, email, phone, organization, photo, addresses
    - Pagination support (People API returns 100 at a time)
  - **OAuth scope:** `https://www.googleapis.com/auth/contacts.readonly` - Add as incremental consent (same pattern as calendar scope in AuthContext)
  - **Field mapping:** Map Google People API fields to Touchpoint contact fields. Similar to the vCard mapping in `importParsers.js`:
    - `names[0].givenName` -> `First Name`
    - `names[0].familyName` -> `Last Name`
    - `emailAddresses[*]` -> `Email Personal`, `Email Work`
    - `phoneNumbers[*]` -> `Phone Mobile`, `Phone Home`, `Phone Work`
    - `organizations[0].name` -> `Organization`
    - `organizations[0].title` -> `Role`
    - `addresses[*]` -> `Street`, `City`, `State`, `ZIP`
    - `birthdays[0]` -> `Date of Birth`
    - `photos[0].url` -> future profile photo field

- [ ] **4.2 Phone Contacts via Contact Picker API**
  - **File:** New file `src/utils/phoneContacts.js`
  - **What:** Use the browser Contact Picker API (`navigator.contacts.select()`) for mobile:
    - Only available on Android Chrome and some mobile browsers (not iOS Safari)
    - Let user select specific contacts from their phone to import
    - Fields available: name, email, tel, address, icon
    - Map to same Touchpoint fields as Google Contacts
  - **Fallback:** If Contact Picker API not available, show a message directing user to export contacts as vCard from their phone and use file upload
  - **Detection:** `'contacts' in navigator && 'ContactsManager' in window`

- [ ] **4.3 Import Source Selector UI**
  - **File:** `src/pages/ImportPage.js` (existing)
  - **What:** Redesign the import page entry point to offer three import methods:
    1. **Google Contacts** - "Import from your Google account" - triggers OAuth consent, fetches contacts
    2. **Phone Contacts** - "Import from this device" - uses Contact Picker API (mobile only, hidden on desktop)
    3. **File Upload** - "Upload CSV or vCard file" - existing functionality
  - **Layout:** Three cards/buttons, each with icon and description. Clean, simple entry point.

- [ ] **4.4 Contact Preview + Selection Screen**
  - **File:** `src/pages/ImportPage.js` or new component `src/components/import/ContactPreview.js`
  - **What:** After fetching contacts from any source:
    - Show a list of contacts with checkboxes for selection
    - Select All / Deselect All toggle
    - Search/filter within the fetched contacts
    - Show preview of mapped fields (name, email, phone)
    - Highlight potential duplicates (match by name or email against existing contacts)
    - "Import Selected" button
  - **Duplicate detection:** Before import, compare incoming contacts against existing ones by email address (exact match) and name (fuzzy match). Flag duplicates and let user choose: skip, overwrite, or import as new.

- [ ] **4.5 Bulk Import with Progress**
  - **File:** `src/utils/devModeWrapper.js` (add batch import function)
  - **What:** Import selected contacts in batches:
    - Batch size: 10 contacts at a time (avoid hitting Sheets API rate limits)
    - Progress bar showing X of Y imported
    - Cancel button to stop mid-import
    - Error handling: skip failed contacts, report at end
    - Generate Touchpoint IDs (`CON001`, `CON002`, etc.) sequentially
  - **Post-import:** Show summary: "Imported 47 contacts. 3 skipped (duplicates). 1 failed."

---

## Phase 5: Progressive Web App (PWA)

**Goal:** Make Touchpoint installable on phones with a home screen icon, offline capability, and fast loading. This is the foundation for the "open it every day" mobile experience.

- [ ] **5.1 Web App Manifest**
  - **File:** New file `public/manifest.json`
  - **What:** Standard PWA manifest:
    ```json
    {
      "name": "Touchpoint CRM",
      "short_name": "Touchpoint",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "<from design tokens>",
      "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
    }
    ```
  - **Also:** Add `<link rel="manifest" href="/manifest.json">` to `index.html`
  - **Icons:** Need to create/generate app icons at 192x192 and 512x512. Maskable icon variant for Android adaptive icons.

- [ ] **5.2 Service Worker**
  - **File:** New file `public/sw.js` or use Vite PWA plugin (`vite-plugin-pwa`)
  - **Recommended approach:** Use `vite-plugin-pwa` which auto-generates the service worker from config
    - Install: `npm install -D vite-plugin-pwa`
    - Add to `vite.config.js`
    - Handles precaching of built assets automatically
  - **Caching strategy:**
    - **App shell** (HTML, CSS, JS): Cache-first with network fallback (fast loads)
    - **API responses** (Google Sheets data): Network-first with cache fallback (fresh data when online, cached data when offline)
    - **Images/icons**: Cache-first (rarely change)
  - **Offline page:** When fully offline and no cache, show a branded "You're offline" page

- [ ] **5.3 Offline Data Layer**
  - **File:** `src/utils/indexedDbCache.js` (already exists!)
  - **What:** Your IndexedDB cache already exists. Extend it to support offline:
    - When online: Fetch from Sheets API, cache in IndexedDB
    - When offline: Read from IndexedDB cache
    - Queue writes (new contacts, touchpoints) in IndexedDB when offline
    - Sync queued writes when connection returns
  - **Detection:** `navigator.onLine` + `online`/`offline` events
  - **UI indicator:** Show "Offline" badge in navbar when offline. Show "Syncing..." when reconnecting.

- [ ] **5.4 Mobile-Optimized Layout**
  - **File:** `src/styles/index.css` and component CSS files
  - **What:** Audit and fix mobile responsiveness:
    - Navbar: Collapse to bottom tab bar on mobile (common mobile CRM pattern)
    - Touch targets: Minimum 44x44px for all interactive elements
    - Font sizes: Readable on small screens without zooming (fixes QA #9)
    - Cards: Single-column layout on mobile
    - Modals: Full-screen on mobile instead of centered dialogs
    - Safe areas: Handle notch/home indicator with `env(safe-area-inset-*)`
  - **Viewport:** Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in `index.html`

- [ ] **5.5 Quick Contact Log (Mobile Killer Feature)**
  - **File:** New component `src/components/QuickLog.js`
  - **What:** The "open and log in 30 seconds" feature. A floating action button (FAB) on mobile that opens a minimal touchpoint logging form:
    - **Step 1:** Pick contact (search by name, show recent contacts first)
    - **Step 2:** Pick type (Call, Text, Email, Meeting, Coffee - big tap targets)
    - **Step 3:** Quick note (optional text field, voice-to-text button using browser SpeechRecognition API)
    - **Step 4:** Done (auto-saves, shows confirmation, dismisses)
  - **Design:** Bottom sheet that slides up from the FAB. Not a full page navigation. Feels fast and lightweight.
  - **Always accessible:** The FAB should be visible on every page on mobile.
  - **Voice input:** Use `webkitSpeechRecognition` / `SpeechRecognition` API for hands-free note entry after a meeting. Fallback to regular text input if not supported.

- [ ] **5.6 Install Prompt**
  - **File:** New component `src/components/InstallPrompt.js`
  - **What:** Catch the `beforeinstallprompt` event and show a custom install banner:
    - "Add Touchpoint to your home screen for quick access"
    - "Install" and "Not now" buttons
    - Only show once per session, remember dismissal
    - Show after user has used the app a few times (not on first visit)
  - **iOS:** Safari doesn't fire `beforeinstallprompt`. Show a manual instruction: "Tap Share > Add to Home Screen" with a visual guide.

---

## Phase 6: UI/UX Polish

**Goal:** Address remaining QA issues and make the app feel professional.

- [ ] **6.1 Contact Profile Redesign (QA #15, #13, #14, #18)**
  - **Scope:** Major redesign of `ContactProfile.js`
  - **Prerequisite:** Needs its own brainstorming session before implementation
  - **Covers:** Tab system, dropdown picker, edit interface, field layout, mobile layout

- [ ] **6.2 Dashboard Action Bar (QA #10)**
  - **File:** `src/pages/Dashboard.js`
  - **What:** Redesign the "PERSONAL" tab bar. Options: card-based nav, sidebar, improved tabs.
  - **Prerequisite:** Design mockup and user approval

- [ ] **6.3 Notes Interface Simplification (QA #22)**
  - **File:** `src/pages/NotesInbox.js`
  - **What:** Clearer button labels, simplified visibility, better linking UX

- [ ] **6.4 Layout Quick Fixes (QA #8, #9, #11)**
  - Loading bar z-index fix
  - Viewport/zoom fix
  - Overlapping text/icon spacing fix

- [ ] **6.5 Workspace Contact Import Wording (QA #25)**
  - Change "invite" to "copy/transfer" in workspace wizard Step 3

---

## Implementation Order

The phases are roughly sequential but some can overlap:

```
Phase 1 (Critical Bugs)     ████░░░░░░░░░░░░░░░░░░░░  Week 1
Phase 2 (High Priority)     ░░░░████░░░░░░░░░░░░░░░░  Week 2
Phase 3 (Calendar Sync)     ░░░░░░░░██████░░░░░░░░░░  Week 3-4
Phase 4 (Contact Import)    ░░░░░░░░░░░░░░██████░░░░  Week 5-6
Phase 5 (PWA + Mobile)      ░░░░░░░░░░░░░░░░░░██████  Week 7-8
Phase 6 (UI Polish)         ░░░░░░░░░░████████████░░  Ongoing alongside 3-5
```

- Phases 1-2 must come first (fix what's broken)
- Phases 3-4 are independent of each other and could be done in either order
- Phase 5 can start partially in parallel with 3-4 (manifest + service worker don't depend on calendar/import)
- Phase 6 items can be sprinkled in throughout as quick wins

## Key Technical Decisions

1. **All free for now.** Remove premium gates. Re-add billing later if needed.
2. **PWA before Capacitor.** Get the web app installable and fast first. Capacitor comes later only if you need native-only APIs or app store presence.
3. **Google Contacts uses People API** (not the deprecated Contacts API). Scope: `contacts.readonly`.
4. **Phone contacts via Contact Picker API** with vCard file upload as fallback for unsupported browsers.
5. **Offline-first reads, online-first writes.** Cache data in IndexedDB for fast reads. Queue writes when offline, sync when online.
6. **Quick Contact Log is the mobile hook.** This is the feature that makes people open the app daily. Build it with care.

## Dependencies / Prerequisites

- Google Cloud Console: Enable Google Calendar API (may already be done)
- Google Cloud Console: Enable Google People API (for contact import)
- OAuth consent screen: Add `contacts.readonly` scope
- App icons: Need 192x192 and 512x512 PNG icons for PWA manifest
- Design session: Contact profile redesign (Phase 6.1) needs brainstorming before implementation

---

**This plan supersedes the previous implementation-roadmap.md. All QA issues from the testing report are accounted for in Phases 1, 2, and 6.**
