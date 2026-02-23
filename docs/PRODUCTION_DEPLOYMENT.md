# Production Deployment Checklist

This guide walks you through deploying Folkbase to production (moving from dev mode to Google Sheets API).

## Pre-Deployment: Critical Fixes Completed ✅

The following critical issues have been fixed and are ready for production:

- ✅ Fixed `throw _error` bug in token retry logic (sheets.js:154, 159)
- ✅ Implemented missing `appendData`, `updateData`, `deleteData` functions in sheets.js
- ✅ Added wrapper exports for `updateRow`, `logAuditEntry`, `getSheetIdByName`
- ✅ Fixed 10 service files to import from devModeWrapper instead of sheets.js
- ✅ Added 30-second axios timeout to prevent hanging requests
- ✅ Fixed build errors (devMode import issues)

**Build Status:** ✅ Passing

---

## Phase 1: Google Cloud Console Setup

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing: "Folkbase"
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Choose **Web application**
6. Configure:
   - **Name:** Folkbase Production
   - **Authorized JavaScript origins:**
     - `https://your-production-domain.com`
     - `http://localhost:3000` (for local testing)
   - **Authorized redirect URIs:**
     - `https://your-production-domain.com`
     - `http://localhost:3000` (for local testing)
7. Copy the **Client ID** (you'll need this for env vars)

### 1.2 Enable Required APIs

Enable these APIs in your Google Cloud project:

1. **Google Sheets API**
   - Go to **APIs & Services > Library**
   - Search "Google Sheets API"
   - Click **Enable**

2. **Google Calendar API** (for calendar sync feature)
   - Search "Google Calendar API"
   - Click **Enable**

3. **Google People API** (for profile info)
   - Search "People API"
   - Click **Enable**

### 1.3 Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace domain)
3. Fill in required fields:
   - **App name:** Folkbase
   - **User support email:** your-email@example.com
   - **Developer contact email:** your-email@example.com
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/spreadsheets`
   - `.../auth/calendar.events` (optional, for calendar sync)
5. Add test users (if in testing mode)
6. **Save and Continue**

---

## Phase 2: Google Sheets Template Setup

### 2.1 Create Your Production Google Sheet

You need to create the master Google Sheet with all required tabs. You have two options:

#### Option A: Use the Setup Wizard (Recommended)

1. Set `VITE_DEV_MODE=false` temporarily
2. Run the app locally with valid `VITE_GOOGLE_CLIENT_ID`
3. Log in with Google
4. The app will detect no sheet and show the Setup Wizard
5. Click through to create all 25+ tabs automatically
6. Copy the Sheet ID from the URL

#### Option B: Manual Creation

If you need to create the sheet manually, see `docs/SHEET_STRUCTURE.md` for the complete list of required tabs and their headers.

**Required Tabs (25 total):**
- Contacts, Organizations, Locations, Location Visits
- Touchpoints, Events, Tasks, Notes, Lists
- Contact Lists, Contact Notes, Event Notes, List Notes, Task Notes
- Contact Relationships, Entity Relationships
- Workspaces, Workspace Members, Workspace Invitations
- Contact Links, Sync Conflicts, Activities
- Audit Log, Import Settings, Import History

### 2.2 Get Your Sheet ID

Once created, copy the Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/[THIS-IS-YOUR-SHEET-ID]/edit
```

### 2.3 Share Sheet with Your Google Account

Make sure the Google account you'll use to log in has **Editor** access to this sheet.

---

## Phase 3: Environment Configuration

### 3.1 Production Environment Variables

Create a `.env.production` file (or configure in your hosting platform):

```bash
# CRITICAL: Set to false or remove entirely
VITE_DEV_MODE=false

# Google OAuth Client ID from Phase 1.1
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com

# Your Google Sheets Template ID from Phase 2.2
VITE_GOOGLE_SHEETS_ID=1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

# Optional: Billing API (if you're using premium features)
# VITE_BILLING_API_URL=https://your-billing-api.com
```

### 3.2 Build for Production

```bash
npm run build
```

This creates optimized production files in `dist/`.

### 3.3 Test Locally in Production Mode

Before deploying, test production mode locally:

```bash
# Create .env.local with production settings
cp .env.production .env.local

# Start dev server (but with production API mode)
npm start
```

**Test Checklist:**
- [ ] OAuth login works
- [ ] Can create/read/update/delete contacts
- [ ] Touchpoints, events, tasks, notes work
- [ ] Organizations and locations work
- [ ] Workspace features work
- [ ] Import/export functions
- [ ] Calendar sync (if enabled)
- [ ] Data persists to Google Sheet (check the sheet directly)

---

## Phase 4: Deploy to Hosting

### Option A: Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Configure environment variables in Vercel dashboard:
   - `VITE_DEV_MODE=false`
   - `VITE_GOOGLE_CLIENT_ID=...`
   - `VITE_GOOGLE_SHEETS_ID=...`
4. Deploy: `vercel --prod`

### Option B: Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy`
3. Configure environment variables in Netlify dashboard
4. Deploy: `netlify deploy --prod`

### Option C: Static Hosting (Firebase, AWS S3, GitHub Pages)

1. Build: `npm run build`
2. Upload `dist/` folder to your hosting service
3. Configure environment variables per platform instructions

**IMPORTANT:** Update OAuth Authorized Origins in Google Cloud Console with your deployed URL!

---

## Phase 5: Post-Deployment Verification

### 5.1 Smoke Tests

After deployment, test these critical paths:

**Authentication:**
- [ ] OAuth login popup appears
- [ ] Successfully authenticates
- [ ] Redirects back to app
- [ ] User profile displays

**Core CRUD:**
- [ ] Create a contact → verify it appears in Google Sheet
- [ ] Update contact → verify sheet updates
- [ ] Delete contact → verify sheet deletion
- [ ] Create touchpoint → verify in sheet
- [ ] Create event → verify in sheet

**Junction Tables:**
- [ ] Add contact to list → verify in Contact Lists tab
- [ ] Add note to contact → verify in Contact Notes tab
- [ ] Add contact social media → verify updates

**Workspaces:**
- [ ] Create workspace → verify in Workspaces tab
- [ ] Invite member → verify in Workspace Members tab

**Error Handling:**
- [ ] Disconnect internet → verify graceful error messages
- [ ] Use app for 60+ minutes → verify token refresh works (expect popup)

### 5.2 Monitor for Issues

**Check these for the first 24 hours:**

1. **Browser Console Errors**
   - Open DevTools → Console
   - Look for red errors
   - Common issues: CORS, OAuth redirect mismatches

2. **Google Sheets API Quotas**
   - Go to Google Cloud Console → APIs & Services → Dashboard
   - Check quota usage for Sheets API
   - Default limit: 500 requests/100 seconds per project

3. **Token Refresh UX**
   - After ~1 hour, users will see re-auth popup
   - This is expected with OAuth implicit flow
   - Note: If this is too disruptive, consider migrating to code flow with refresh tokens

### 5.3 Performance Monitoring

- Check Google Cloud Console metrics for API latency
- Monitor Google Sheets API error rates
- If hitting rate limits, consider implementing request batching

---

## Known Limitations & Future Improvements

### Current Limitations

1. **Hourly Re-Authentication Required**
   - **Why:** OAuth implicit flow doesn't support refresh tokens
   - **Impact:** Users see popup every ~60 minutes
   - **Fix:** Migrate to OAuth code flow (requires backend server)

2. **No Rollback for Batch Operations**
   - **Why:** Google Sheets API doesn't support transactions
   - **Impact:** Partial failures can leave data inconsistent
   - **Workaround:** Operations return success/failure per item
   - **Future:** Implement application-level compensation transactions

3. **Sequential API Calls**
   - **Why:** Some operations process items one-by-one
   - **Impact:** Slower for large batch operations
   - **Future:** Implement proper batch API calls where possible

### Recommended Post-Launch Improvements

**Priority: Medium**
- Replace hardcoded sheet names with `SHEET_NAMES` constants
- Consolidate duplicate `isDevMode()` checks
- Add startup validation for sheet access

**Priority: Low**
- Implement batch operation rollback
- Add network retry with exponential backoff
- Switch to OAuth code flow for silent refresh

---

## Troubleshooting

### Issue: "OAuth Error: redirect_uri_mismatch"

**Cause:** Production domain not in authorized origins
**Fix:** Add your deployed URL to Google Cloud Console > Credentials > Authorized JavaScript origins

### Issue: "Failed to read sheet: 403 Forbidden"

**Cause:** User doesn't have access to the Google Sheet
**Fix:** Share the sheet with the logged-in user's email

### Issue: "Network timeout"

**Cause:** Google Sheets API slow to respond
**Fix:** Already mitigated with 30s timeout. If persistent, check API quotas.

### Issue: "Token expired" errors

**Cause:** Token refresh failed
**Fix:** Check browser console for errors. May need to clear localStorage and re-authenticate.

### Issue: Rate limit errors (429)

**Cause:** Exceeded Google Sheets API quota
**Fix:**
- Check quotas in Google Cloud Console
- Reduce frequency of operations
- Consider request batching

### Issue: Data not syncing to sheet

**Cause:** Using wrong sheet ID or dev mode still enabled
**Fix:**
- Verify `VITE_DEV_MODE=false`
- Verify `VITE_GOOGLE_SHEETS_ID` matches your sheet URL
- Check browser localStorage - should NOT see `dev_contacts`, `dev_touchpoints` keys

---

## Support & Documentation

- **Main Docs:** `/docs/README.md`
- **Architecture:** `/docs/WORKSPACES_FOR_AGENTS.md`
- **Dev Mode Details:** `/docs/DEV_MODE_FOR_AGENTS.md`
- **Sheet Structure:** Check constants in `/src/config/constants.js`

---

## Emergency Rollback

If production deployment fails, you can immediately rollback:

1. Set `VITE_DEV_MODE=true` in environment
2. Redeploy
3. All data goes back to localStorage
4. Investigate issue, then retry production deployment

**Note:** Dev mode and production mode don't share data. Switching modes won't migrate data automatically.

---

## Migration Path: Dev → Production

If you have existing data in dev mode (localStorage) that you want to migrate:

1. **Export from Dev Mode:**
   - Set `VITE_DEV_MODE=true`
   - Use Settings → Backup & Restore → Export
   - Saves JSON file with all data

2. **Import to Production:**
   - Set `VITE_DEV_MODE=false`
   - Use Settings → Backup & Restore → Import
   - Upload the JSON file
   - Data will be written to Google Sheets

**Warning:** This overwrites existing data. Test with a copy of your production sheet first.

---

## Success Criteria

You're successfully in production when:

- ✅ `VITE_DEV_MODE=false` (or removed)
- ✅ OAuth login works without errors
- ✅ Data persists to Google Sheets (visible in the spreadsheet)
- ✅ No `dev_contacts`, `dev_touchpoints` keys in browser localStorage
- ✅ App works across browser sessions (data not lost on refresh)
- ✅ Multiple users can access their own workspaces

**Congrats - you're live!** 🎉
