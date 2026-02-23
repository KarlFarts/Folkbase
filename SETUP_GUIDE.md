# Touchpoint CRM - Complete Setup Guide

This guide walks you through setting up Touchpoint CRM for **development, web deployment, and mobile (PWA)**. Setup takes approximately **15-20 minutes**.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Development Setup](#development-setup)
4. [Google Cloud Setup](#google-cloud-setup)
5. [Production Deployment](#production-deployment)
6. [Mobile App (PWA)](#mobile-app-pwa)
7. [Optional: Premium Features Backend](#optional-premium-features-backend)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

**For local development with built-in wizard:**

```bash
git clone https://github.com/yourusername/touchpoint-crm.git
cd touchpoint-crm
npm install
npm start
```

The **Setup Wizard** guides you through configuration on first launch. Your settings save automatically.

**For quick testing without OAuth setup:**

```bash
# Create .env file
echo "VITE_DEV_MODE=true" > .env
npm start
```

Dev mode uses localStorage with mock data - perfect for exploring features.

---

## Prerequisites

### Required

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Google account** (Gmail or Google Workspace)
- **15-20 minutes** for initial setup

### Optional (for premium features)

- **Stripe account** (for billing/subscriptions)
- **Custom domain** (for production web app)

---

## Development Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Choose Development Mode

**Option A: Dev Mode (No Google Setup)**

Best for exploring features, testing, or contributing code:

```bash
# Create .env file
echo "VITE_DEV_MODE=true" > .env
npm start
```

Features:
- Mock authentication (no real Google login)
- localStorage instead of Google Sheets
- Pre-loaded test data
- Full feature access
- Role switching for testing

**Option B: Production Mode (With Google)**

Required for real data and production testing:

Continue to [Google Cloud Setup](#google-cloud-setup)

---

## Google Cloud Setup

Required for production use with real Google Sheets database.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click project dropdown (top left) → **New Project**
3. Name: "Touchpoint CRM" → **Create**
4. Wait for project creation (30 seconds)

### Step 2: Enable APIs

1. Ensure your project is selected (top left)
2. Go to **APIs & Services** → **Library**
3. Search and enable these APIs:
   - **Google Sheets API** (required)
   - **Google Calendar API** (optional, for calendar sync)

### Step 3: Configure OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. User type: **External** → **Create**
3. Fill required fields:
   - **App name**: Touchpoint CRM
   - **User support email**: Your email
   - **Developer contact**: Your email
4. **Save and Continue**
5. **Scopes** page → **Add or Remove Scopes**:
   - Add: `https://www.googleapis.com/auth/userinfo.email`
   - Add: `https://www.googleapis.com/auth/userinfo.profile`
   - Add: `https://www.googleapis.com/auth/spreadsheets`
   - Optional: `https://www.googleapis.com/auth/calendar.events`
6. **Update** → **Save and Continue**
7. **Test users** → **+ Add Users** → Add your email
8. **Save and Continue** → **Back to Dashboard**

### Step 4: Create OAuth Credentials

1. **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Touchpoint CRM Web Client"
5. **Authorized JavaScript origins** → **+ Add URI**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com` (add later)
6. **Authorized redirect URIs** → **+ Add URI**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com` (add later)
7. **Create**
8. **Copy the Client ID** (format: `123-abc.apps.googleusercontent.com`)

### Step 5: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. **Blank** spreadsheet
3. Name it: "Touchpoint CRM Database"
4. **Copy the Sheet ID** from URL:
   - URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part

The app auto-creates required tabs on first use. Manual setup is optional.

### Step 6: Configure Environment

Create `.env` file in project root:

```bash
# Required
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_SHEETS_ID=your_sheet_id

# Optional
VITE_DEV_MODE=false
```

### Step 7: Start Development Server

```bash
npm start
```

Browser opens at `http://localhost:3000`. The Setup Wizard guides you through:
1. Sign in with Google
2. Grant permissions
3. Connect to your sheet
4. Start using the app

---

## Production Deployment

Deploy Touchpoint CRM as a web app or Progressive Web App (PWA).

### Web App Deployment

#### Build for Production

```bash
npm run build
```

Creates `dist/` folder with optimized static files.

#### Deployment Options

**Netlify (Recommended - Easiest):**

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Login: `netlify login`
3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```
4. Set environment variables in Netlify dashboard:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_SHEETS_ID`

**Vercel:**

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard

**GitHub Pages:**

```bash
npm run build
# Push dist/ folder to gh-pages branch
```

**Cloudflare Pages / AWS S3 + CloudFront / Any Static Host:**

Upload contents of `dist/` folder to your hosting service.

#### Update OAuth Credentials

After deployment:

1. **Google Cloud Console** → **Credentials**
2. Edit your OAuth Client
3. Add production URIs:
   - **Authorized JavaScript origins**: `https://your-domain.com`
   - **Authorized redirect URIs**: `https://your-domain.com`
4. **Save**

#### Environment Variables

Set these in your hosting platform:

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_SHEETS_ID=your_sheet_id
VITE_BILLING_API_URL=https://your-billing-api.com/api  # Optional
```

#### Custom Domain (Optional)

Most hosting platforms support custom domains:
- Netlify: Domain settings → Add custom domain
- Vercel: Project settings → Domains
- GitHub Pages: Repository settings → Pages → Custom domain

---

## Mobile App (PWA)

Touchpoint CRM is a **Progressive Web App** - installable on mobile devices like a native app.

### Features

- **Install to home screen** (works like a native app)
- **Offline support** (service worker caching)
- **Responsive design** (optimized for all screen sizes)
- **Push notifications** (optional, can be added)
- **Full-screen mode** (no browser chrome when installed)

### Installation Instructions for Users

**iPhone/iPad:**

1. Open app in Safari
2. Tap Share button (square with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**
5. App icon appears on home screen

**Android:**

1. Open app in Chrome
2. Tap menu (3 dots) → **Add to Home Screen**
3. Tap **Add**
4. App icon appears on home screen

**Desktop (Chrome/Edge):**

1. Open app in browser
2. Look for install icon in address bar
3. Click **Install**

### PWA Configuration

The app includes:
- **Manifest file**: `public/manifest.json` (app metadata)
- **Service worker**: Offline caching
- **Icons**: Multiple sizes for all devices (`public/icons/`)

To customize:

**Edit `public/manifest.json`:**

```json
{
  "name": "Your CRM Name",
  "short_name": "CRM",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

**Replace icons in `public/icons/`:**
- `icon-72.png` through `icon-512.png`
- Use square PNG images
- Maintain aspect ratio

---

## Optional: Premium Features Backend

For premium features (workspaces, calendar sync, import/export, etc.), deploy the billing backend.

### Local Development

```bash
cd server
npm install
cp .env.example .env
# Edit .env with Stripe credentials
npm start
```

Backend runs on `http://localhost:3001`

### Production Deployment

**Heroku:**

```bash
cd server
heroku create your-billing-api
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set FRONTEND_URL=https://your-domain.com
git push heroku main
```

**Railway / Render / Fly.io:**

Similar process - deploy `server/` directory as Node.js app.

### Configure Webhooks

1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-billing-api.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Update Frontend

Set billing API URL in frontend:

```bash
# .env (frontend)
VITE_BILLING_API_URL=https://your-billing-api.com/api
```

See `docs/MONETIZATION_PLAN.md` for complete billing setup.

---

## Troubleshooting

### Development Issues

**"No access token" error:**

1. Check `VITE_GOOGLE_CLIENT_ID` in `.env`
2. Verify OAuth redirect URIs include `http://localhost:3000`
3. Clear browser cache and localStorage
4. Sign in again

**"Failed to load data" from Google Sheets:**

1. Verify `VITE_GOOGLE_SHEETS_ID` in `.env`
2. Check you granted Sheets permission during sign-in
3. Ensure your Google account owns or has access to the sheet
4. Check browser console for detailed errors

**Authentication popup blocked:**

1. Look for popup blocked icon in address bar
2. Allow popups for localhost
3. Try signing in again

### Deployment Issues

**App shows blank page in production:**

1. Check browser console for errors (F12 → Console)
2. Verify environment variables are set in hosting platform
3. Ensure production URLs are added to OAuth credentials
4. Check network tab for failed API calls

**OAuth errors in production:**

1. Verify `VITE_GOOGLE_CLIENT_ID` matches production credentials
2. Check authorized URIs include your production domain
3. Use `https://` (not `http://`) for production
4. Clear browser cache

**PWA not installing:**

1. Ensure app is served over HTTPS (required for PWA)
2. Check `manifest.json` is accessible
3. Verify service worker is registered (check Application tab in DevTools)
4. Icons must be present in `public/icons/`

### Common Errors

**"User not allowed":**

- You're not added as a test user in OAuth consent screen
- Go to Google Cloud Console → OAuth consent screen → Test users → Add your email

**Quota exceeded:**

- Default: 100 requests per 100 seconds per user
- Check Settings → API Usage to monitor limits
- Avoid rapid page refreshes
- Request quota increase if needed

---

## Next Steps

After setup:

- ✅ **Add your first contact** - Test the app
- ✅ **Customize fields** - Add columns to your Google Sheet
- ✅ **Invite team members** - Share workspace invitations
- ✅ **Enable calendar sync** - Connect Google Calendar (Settings)
- ✅ **Set up billing** - For premium features (optional)
- ✅ **Install as PWA** - Add to home screen on mobile

---

## Documentation

### For Users
- [README.md](README.md) - Feature overview
- [CONFIG.md](CONFIG.md) - Configuration reference

### For Developers
- [AI_AGENT_QUICKSTART.md](AI_AGENT_QUICKSTART.md) - Quick reference for AI agents
- [docs/README.md](docs/README.md) - Complete documentation index
- [docs/PRODUCTION_SETUP_GUIDE.md](docs/PRODUCTION_SETUP_GUIDE.md) - Detailed production setup
- [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) - Development guide

---

## Support

Need help?

1. Check [CONFIG.md](CONFIG.md) for configuration issues
2. Review [docs/README.md](docs/README.md) for detailed guides
3. Check browser console for error messages

---

**Platform Support:**

- **Web**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile (PWA)**: iOS 11.3+, Android 5+ (Chrome)
- **Desktop (PWA)**: Chrome 73+, Edge 79+

**Production Ready:** ✅
**100% Free Architecture:** ✅
**Scales to 1,000+ users:** ✅

---

**Last updated:** 2026-02-13
