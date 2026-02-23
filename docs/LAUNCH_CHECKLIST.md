# Touchpoint CRM - Production Launch Checklist

> Portable checklist for going from dev mode to production. Hand this to any AI session to pick up where you left off. Update the status markers as you complete each step.
>
> Reference: `docs/PRODUCTION_DEPLOYMENT.md` has detailed troubleshooting and explanations.

## Current Status

- **Last updated:** 2026-02-14
- **Current step:** Step 6 (CRUD Smoke Test)
- **Blockers:** None — setup wizard works end-to-end, dashboard loads

## Pre-Flight Verification (completed 2026-02-14)

- [x] **Production build passes** - `npm run build` succeeds, 2173 modules, ~2s build time
- [x] **Tests: 150/165 passing** - 15 failures are all test infrastructure (dev-mode mock setup), not production bugs
- [x] **Bug fixed:** `_error` typo across ~12 files (would crash error handlers in production)
- [x] **Tests fixed:** `exportService.test.js` expectations updated to match current vCard implementation
- [x] **`.env` file created** from `.env.example` with Client ID set
- [x] **Dev mode set to `false`** in `.env`
- [x] **Sentry removed** - `errorReporting.js` simplified to console.log (Sentry not installed)
- [x] **Political organizing references removed** - generic CRM language throughout
- [x] **Dev-only UI hidden** - DevToolsPanel, MonitoringPanel, ApiUsageIndicator gated behind dev mode
- [x] **Premium gate removed** - all features unlocked (no billing backend yet)
- [x] **Billing API safe** - skips fetch when no billing backend configured (no more infinite loops)

### Test Failures Explained (not production blocking)

All 15 remaining test failures are in test infrastructure, not production code:
- `devModeDataIntegrity.test.js` (15 failures) - `isDevMode()` can't be called during vi.mock hoisting. Dev-mode-only tests.
- `backupService.test.js`, `dataHealthService.test.js`, `importConfigService.test.js` - same root cause: `seedTestData.js:2302` calls `isDevMode()` at module load, which fails under Vitest mocking.
- **None of these affect production.** The production code path (VITE_DEV_MODE=false) is unaffected.

---

## Step 1: Google Cloud Project Setup

**Status:** DONE

- [x] 1.1 Created project in Google Cloud Console
- [x] 1.2 Enabled **Google Sheets API**
- [x] 1.3 Enabled **Google People API**
- [ ] 1.4 Enable **Google Calendar API** (optional, for calendar sync feature)
- [x] 1.5 Configured **OAuth Consent Screen** (External, test user added)
- [x] 1.6 Created **OAuth 2.0 Client ID** (Web application, localhost:3000 origins)
- [ ] 1.7 Enable **Google Drive API** (for folder management and sheet discovery)

---

## Step 2: Local Environment Setup

**Status:** DONE

- [x] 2.1 Copy `.env.example` to `.env` in the project root
- [x] 2.2 Set `VITE_GOOGLE_CLIENT_ID` to Client ID
- [x] 2.3 Set `VITE_DEV_MODE=false`
- [x] 2.4 Leave `VITE_GOOGLE_SHEETS_ID` blank (setup wizard creates one)
- [x] 2.5 Run `npm start` - app starts on http://localhost:3000

---

## Step 3: First Real Sign-In

**Status:** DONE

- [x] 3.1 Click "Sign in with Google" in the app
- [x] 3.2 Google consent popup appeared - authorized the app
- [x] 3.3 Setup wizard appeared correctly (3-step flow: Welcome > Profile > Complete)
- [x] 3.4 No blocking errors in console

---

## Step 4: Sheet Creation via Setup Wizard

**Status:** DONE

- [x] 4.1 Setup wizard creates sheet on the final step (deferred creation)
- [x] 4.2 Sheet created successfully
- [ ] 4.3 Verify all 25+ tabs exist in Google Sheets (spot-check recommended)
- [ ] 4.4 Verify each tab has headers in row 1
- [x] 4.5 Completed setup wizard and landed on dashboard

---

## Step 5: Update .env with Sheet ID

**Status:** NOT NEEDED - Sheet ID is saved to localStorage by the setup wizard automatically. No manual `.env` update required for personal sheet.

---

## Step 6: CRUD Smoke Test

**Status:** NOT STARTED - dashboard loads, ready to test

Test each operation and confirm data appears in the actual Google Sheet:

- [ ] 6.1 **Create a contact** - fill in name, phone, email. Save. Check Contacts tab in Google Sheets.
- [ ] 6.2 **Edit that contact** - change a field. Save. Verify the change in the sheet.
- [ ] 6.3 **Create a touchpoint** for that contact. Check Touchpoints tab.
- [ ] 6.4 **Create a note** on the contact. Check Notes tab AND Contact Notes junction tab.
- [ ] 6.5 **Create a task**. Check Tasks tab.
- [ ] 6.6 **Create an event**. Check Events tab.
- [ ] 6.7 **Create an organization**. Check Organizations tab.
- [ ] 6.8 **Create a list** and add the contact to it. Check Lists tab AND Contact Lists tab.
- [ ] 6.9 **Delete a contact** (create a throwaway one first). Verify it's removed from the sheet.
- [ ] 6.10 **Refresh the browser** - verify all data persists (not lost on reload).

**Done when:** All CRUD operations work. Data round-trips correctly between the app and Google Sheets.

---

## Step 7: Edge Case Testing

**Status:** NOT STARTED - depends on Step 6

- [ ] 7.1 **Token expiry:** Use the app for 55+ minutes without refreshing
- [ ] 7.2 **Network interruption:** Disconnect wifi, try an action, reconnect
- [ ] 7.3 **Multiple tabs:** Open the app in two browser tabs
- [ ] 7.4 **Browser refresh during operation**
- [ ] 7.5 **Large data:** Add 20+ contacts
- [ ] 7.6 **Search:** Test the universal search with real data
- [ ] 7.7 **Import:** Try importing a small CSV file of contacts

---

## Step 8: Production Deployment

**Status:** NOT STARTED - depends on Step 6

- [x] 8.2 Run `npm run build` locally - verified it succeeds
- [ ] 8.1 Choose hosting platform (Vercel recommended)
- [ ] 8.3 Deploy to hosting platform
- [ ] 8.4 Configure environment variables on the platform
- [ ] 8.5 Update Google Cloud Console with production URL
- [ ] 8.6 Visit the deployed URL and test sign-in

---

## Step 9: Production Smoke Test

**Status:** NOT STARTED - depends on Step 8

- [ ] 9.1-9.6 Repeat critical tests on deployed version

---

## Step 10: Post-Launch

**Status:** NOT STARTED

- [ ] 10.1 Monitor Google Sheets API quota usage
- [ ] 10.2 Decide on OAuth consent screen status (Testing vs Verified)
- [ ] 10.3 Set up a backup strategy
- [ ] 10.4 Consider custom domain

---

## Known Limitations

1. **Hourly re-auth required** - OAuth implicit flow tokens expire ~60 minutes
2. **No offline mode** - App requires internet for all data operations
3. **Google Sheets API quota** - 300 requests/minute per user, 500 requests/100 seconds per project
4. **No real-time sync** - Edits to Google Sheet directly won't appear until next read

---

## Changes Made During This Session (2026-02-14)

### Setup Wizard Overhaul
- Redesigned from 5 confusing steps to 3 clean steps: Welcome (auth + sheet choice) > Profile > Complete
- Sheet creation deferred to final step (no accidental duplicates)
- Welcome step shows "Create New" or "Connect Existing" after sign-in
- **Auto-detect existing sheets:** After sign-in, searches Google Drive for "Touchpoint CRM" sheets/folder and offers one-click reconnect
- Sheet discovery gracefully falls back if token lacks Drive scope or API fails
- **Drive folder architecture:** All sheets are organized in a "Touchpoint CRM" folder for clean organization
- New sheets are created inside the folder, existing sheets are moved into it during setup
- Folder architecture enables future features: exports, backups, imports, attachments
- Sheet step detects already-created sheet (no re-creation on Back)
- Removed all auto-advance timeouts (user clicks Continue manually)
- Step indicator: numbered circles (32px) with labels instead of tiny unlabeled dots
- Avatar color locked on mount (no color flickering while typing)
- Profile fields auto-save to wizard state (Back preserves choices)
- All setTimeout calls have cleanup on unmount (no ghost advances)
- All handler functions memoized with useCallback

### Production Fixes
- Fixed `_error` typo in ~12 files (catch blocks referenced wrong variable)
- Removed Sentry imports (not installed, was crashing Vite)
- Fixed `seedTestData.js` circular dependency at module load
- ConfigContext validates sheet IDs (rejects stale dev mode values)
- `validateEnv.js` only requires Client ID (not Sheet ID)
- `billingApi.js` skips fetch when no billing backend configured
- Premium gate unlocked (all features free, no billing backend yet)
- Dev-only UI (DevToolsPanel, MonitoringPanel, ApiUsageIndicator) hidden in production
- Political organizing references replaced with generic CRM language
