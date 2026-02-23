# Configuration Reference

This document provides a complete reference for all configuration options in Touchpoint CRM.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Application Constants](#application-constants)
3. [Google Sheets Schema](#google-sheets-schema)
4. [Customization Options](#customization-options)
5. [Security Best Practices](#security-best-practices)

---

## Environment Variables

All environment variables are prefixed with `VITE_` to be accessible in the Vite application.

### Required Variables (Production)

| Variable | Description | Example | Where to Get It |
|----------|-------------|---------|-----------------|
| `VITE_GOOGLE_SHEETS_ID` | Your Google Sheet ID | `1BxiMVs0XRA5nFMd...` | Google Sheet URL (between `/d/` and `/edit`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `123-abc.apps.googleusercontent.com` | [Google Cloud Console](https://console.cloud.google.com) → Credentials |

### Optional Variables

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `VITE_DEV_MODE` | Enable development mode with localStorage | `false` | `true` or `false` |
| `VITE_BILLING_API_URL` | Billing backend API URL (for premium features) | N/A | `http://localhost:3001/api` or production URL |

---

## Application Constants

These constants are defined in `src/config/constants.js` and can be modified without environment variables.

### Sheet Names

```javascript
export const SHEET_NAMES = {
  // Core data
  CONTACTS: 'Contacts',
  ORGANIZATIONS: 'Organizations',
  LOCATIONS: 'Locations',
  TOUCHPOINTS: 'Touchpoints',
  EVENTS: 'Events',
  TASKS: 'Tasks',
  LISTS: 'Lists',
  NOTES: 'Notes',
  LOCATION_VISITS: 'Location Visits',

  // Relationships (Many-to-Many)
  CONTACT_LISTS: 'Contact Lists',
  CONTACT_NOTES: 'Contact Notes',
  EVENT_NOTES: 'Event Notes',
  LIST_NOTES: 'List Notes',
  TASK_NOTES: 'Task Notes',
  CONTACT_RELATIONSHIPS: 'Contact Relationships',
  ENTITY_RELATIONSHIPS: 'Entity Relationships',

  // Workspace system
  WORKSPACES: 'Workspaces',
  WORKSPACE_MEMBERS: 'Workspace Members',
  WORKSPACE_INVITATIONS: 'Workspace Invitations',
  CONTACT_LINKS: 'Contact Links',
  SYNC_CONFLICTS: 'Sync Conflicts',
  ACTIVITIES: 'Activities',

  // System
  AUDIT_LOG: 'Audit Log',
  IMPORT_SETTINGS: 'Import Settings',
  IMPORT_HISTORY: 'Import History'
};
```

**To customize:** Edit the values (right side) to match your Google Sheet tab names.

### Auto-Generated Fields

```javascript
export const AUTO_FIELDS = {
  // Contacts
  'Contact ID': 'CON001',
  'Date Added': 'auto-fill',
  'Last Contact Date': 'auto-update',

  // Organizations
  'Organization ID': 'ORG001',
  'Organization Created Date': 'auto-fill',

  // Locations
  'Location ID': 'LOC001',
  'Location Created Date': 'auto-fill',

  // Touchpoints
  'Touchpoint ID': 'TP001',
  'Contact Name': 'auto-link',

  // Events
  'Event ID': 'EVT001',
  'Event Created Date': 'auto-fill',

  // Tasks
  'Task ID': 'TSK001',
  'Task Created Date': 'auto-fill',

  // Notes
  'Note ID': 'NOTE001',
  'Created Date': 'auto-fill',

  // Lists
  'List ID': 'LST001',
  'List Created Date': 'auto-fill',

  // Workspaces
  'Workspace ID': 'WS001',
  'Created Date': 'auto-fill'
};
```

**To customize:** Add or remove fields based on your needs.

### Thresholds

```javascript
export const THRESHOLDS = {
  FOLLOW_UP_DAYS: 30,           // Dashboard "Needs Follow-Up" threshold
  TOKEN_REFRESH_BUFFER: 300,    // Seconds before expiry to refresh token
  STATUS_CHECK_INTERVAL: 30000, // Settings status check (30 seconds)
  AUTO_REFRESH_CHECK: 300000    // Auto-refresh check (5 minutes)
};
```

**To customize:** Adjust values in milliseconds or seconds as indicated.

### API Configuration

```javascript
export const API_CONFIG = {
  SHEETS_API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
  CALENDAR_API_BASE: 'https://www.googleapis.com/calendar/v3',
  TOKEN_INFO_URL: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
  REQUIRED_SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar.events' // Optional, for calendar sync
  ]
};
```

### Premium Features (Monetization)

```javascript
export const PREMIUM_FEATURES = {
  WORKSPACES: 'workspaces',
  CALENDAR_SYNC: 'calendar_sync',
  IMPORT_EXPORT: 'import_export',
  DUPLICATE_DETECTION: 'duplicate_detection',
  BACKUP_RESTORE: 'backup_restore',
  BRAINDUMP: 'braindump'
};

export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  TRIALING: 'trialing'
};
```

---

## Google Sheets Schema

### Contacts Sheet

**Required Columns:**

| Column | Type | Description | Auto-Generated? |
|--------|------|-------------|-----------------|
| Contact ID | Text | Unique identifier (CON001, CON002...) | ✅ Yes |
| Name | Text | Contact's full name | No |
| Date Added | Date | When contact was created | ✅ Yes |
| Last Contact Date | Date | Most recent touchpoint date | ✅ Auto-updated |

**Optional Columns (Customize as needed):**

| Column | Type | Description | Data Validation |
|--------|------|-------------|-----------------|
| Phone | Text | Phone number(s) | None |
| Email | Text | Email address(es) | None |
| Organization | Text | Company/org name | None |
| Role | Text | Job title/position | None |
| Bio | Text | Notes about contact | None |
| Tags | Text | Comma-separated tags | None |
| Priority | Dropdown | Contact priority | Urgent, High, Medium, Low, No Urgency |
| Status | Dropdown | Contact status | Active, Inactive, Do Not Contact |

**Adding Custom Columns:**

1. Add column header in Row 1 of Contacts sheet
2. (Optional) Add data validation in Row 2
3. Refresh Touchpoint CRM - new field appears automatically!

### Events Sheet

**Required Columns:**

| Column | Type | Description | Auto-Generated? |
|--------|------|-------------|-----------------|
| Event ID | Text | Unique identifier (EVT001, EVT002...) | ✅ Yes |
| Event Name | Text | Name of the event | No |
| Event Date | Date | When event occurs | No |
| Event Created Date | Date | When created in system | ✅ Yes |

**Calendar Sync Columns (Optional):**

| Column | Type | Description | Auto-Generated? |
|--------|------|-------------|-----------------|
| Google Calendar ID | Text | Google Calendar event ID | ✅ Yes (when synced) |
| Last Synced At | DateTime | Last sync timestamp | ✅ Yes |
| Sync Source | Dropdown | CRM, Calendar, Imported | ✅ Yes |

### Workspaces Sheet

**Required Columns:**

| Column | Type | Description | Auto-Generated? |
|--------|------|-------------|-----------------|
| Workspace ID | Text | Unique identifier (WS001, WS002...) | ✅ Yes |
| Workspace Name | Text | Name of workspace | No |
| Sheet ID | Text | Google Sheet ID for workspace | No |
| Owner Email | Email | Workspace creator | ✅ Yes |
| Created Date | DateTime | When created | ✅ Yes |
| Parent Workspace ID | Text | Parent workspace (for hierarchy) | No |

---

## Customization Options

### Changing Default Values

**Follow-up Reminder Threshold:**

Edit `src/config/constants.js`:

```javascript
export const THRESHOLDS = {
  FOLLOW_UP_DAYS: 45,  // Changed from 30 to 45 days
  // ...
};
```

**Contact ID Format:**

Edit `src/config/constants.js`:

```javascript
// Current format: CON001, CON002, CON003...
export const ID_FORMATS = {
  CONTACT: 'CON',
  ORGANIZATION: 'ORG',
  LOCATION: 'LOC',
  // ... etc
};

// To customize, change the prefix:
export const ID_FORMATS = {
  CONTACT: 'CONTACT-',  // Results in: CONTACT-001, CONTACT-002...
  // ...
};
```

### Adding Custom Dropdown Values

**In Google Sheets (Recommended):**
1. Select the column with data validation
2. Data → Data validation
3. Edit the list of items
4. Save

Changes appear immediately in Touchpoint CRM.

### Changing Color Scheme

Edit `src/styles/index.css`:

```css
:root {
  /* Primary colors */
  --color-primary: #3b82f6;  /* Change this */
  --color-primary-hover: #2563eb;  /* And this */

  /* Status colors */
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
}
```

See `docs/DESIGN_TOKENS.md` for complete theming system.

---

## Security Best Practices

### Environment Variables

**DO:**
- ✅ Store credentials in `.env` file
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Use environment variables for all sensitive data
- ✅ Rotate OAuth credentials periodically

**DON'T:**
- ❌ Commit `.env` to version control
- ❌ Share `.env` file publicly
- ❌ Hardcode credentials in source files
- ❌ Include credentials in screenshots/documentation

### Google OAuth Security

**Authentication:**
- Uses `@react-oauth/google` for direct OAuth 2.0 authentication
- No intermediary authentication service
- Users authenticate directly with Google
- Access tokens stored in browser localStorage (encrypted)

**Permissions:**
- Google Sheets API scope: `https://www.googleapis.com/auth/spreadsheets`
- Google Calendar API scope (optional): `https://www.googleapis.com/auth/calendar.events`
- Users can only access sheets they own or have permission to

**OAuth Configuration:**

**Redirect URIs:**
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`
- Never use `http://` in production

**Authorized Origins:**
- Match your redirect URIs
- Don't use wildcards (`*`)
- Add all domains where app is hosted

### Billing Backend Security (Optional)

If using the premium features billing backend:

**Authentication:**
- Backend validates Google OAuth tokens
- Uses Google token verification endpoint
- No passwords or separate auth system

**API Endpoints:**
- Protected with Google OAuth token validation
- Stripe webhooks use signature verification
- CORS configured for frontend origin only

---

## Advanced Configuration

### Development Mode

Enable dev mode for local development without Google OAuth:

```bash
# .env
VITE_DEV_MODE=true
```

Features:
- Uses localStorage instead of Google Sheets
- Mock authentication (no real Google login)
- Pre-loaded test data
- Role switching for testing permissions

See `docs/DEV_ENVIRONMENT.md` for complete guide.

### Billing Backend (Optional)

For premium features (workspaces, calendar sync, etc.):

1. Navigate to `server/` directory
2. Copy `.env.example` to `.env`
3. Add Stripe credentials:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. Start backend: `npm start`

See `docs/MONETIZATION_PLAN.md` for complete setup.

### Production Deployment

**Web App Deployment:**
- Build: `npm run build`
- Deploy `dist/` folder to:
  - Netlify, Vercel, GitHub Pages
  - Any static hosting service
  - CloudFlare Pages, AWS S3 + CloudFront

**Mobile App (Progressive Web App):**
- App is PWA-ready (installable on mobile)
- Service worker for offline support
- Responsive design for all screen sizes
- Add to home screen functionality

**Native Mobile (Future):**
- React Native port possible
- Shared business logic
- Platform-specific UI wrappers

---

## Migration Guide

### Updating from Older Versions

**If upgrading from a version with Firebase:**

The app no longer uses Firebase. To migrate:

1. Pull latest changes
2. Update `.env` file (remove Firebase variables)
3. Add new variables:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   VITE_GOOGLE_SHEETS_ID=your_sheet_id
   ```
4. Create new OAuth credentials in Google Cloud Console
5. Clear browser localStorage: `localStorage.clear()`
6. Sign in with new OAuth flow

---

## Troubleshooting Configuration

### Environment Variables Not Loading

**Symptoms:** App shows "Missing configuration"

**Solutions:**
1. Ensure `.env` is in project root (not `src/`)
2. Restart dev server: `npm start`
3. Check for syntax errors in `.env` (no quotes, no spaces around =)
4. Verify file is named exactly `.env` (not `.env.txt`)

### OAuth Redirect Mismatch

**Symptoms:** "redirect_uri_mismatch" error

**Solutions:**
1. Check Google Cloud Console → Credentials
2. Ensure authorized URIs match exactly: `http://localhost:3000`
3. No trailing slashes
4. Protocol must match (http vs https)

### Sheets API Quota Exceeded

**Symptoms:** "Quota exceeded" or "429 Too Many Requests"

**Solutions:**
- Default quota: 100 requests per 100 seconds per user
- Avoid rapid page refreshes
- App includes built-in rate limit tracking (see Settings)
- Request quota increase in Google Cloud Console (if needed)

See `docs/API_TRACKING.md` for monitoring API usage.

---

## Support

For configuration issues not covered here:

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for setup instructions
2. Review [docs/README.md](docs/README.md) for documentation index
3. Check [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) for development setup

---

**Last updated:** 2026-02-13
