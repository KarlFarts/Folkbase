# Touchpoint CRM

A powerful, privacy-first contact relationship management system for teams, nonprofits, and community organizations. Built with React and Google Sheets as the database - giving you complete control over your data.

## Why Touchpoint?

Most CRMs are expensive, complicated, or lock your data behind proprietary systems. Touchpoint is different:

- Your data lives in a Google Sheet you own and control
- 100% free architecture - no database hosting costs
- No vendor lock-in - export your data anytime
- Simple enough for non-technical users, powerful enough for teams
- Works with the tools you already use (Google Sheets, Google Calendar)

## Key Features

- **Your Data, Your Control**: All data stored in Google Sheets you own
- **Quick Setup**: Built-in wizard guides you through configuration
- **Zero Configuration**: Dynamic schema adapts to your Google Sheet
- **Fully Responsive**: Works on desktop, tablet, and mobile (PWA-ready)
- **Real-time Sync**: Changes reflected immediately in Google Sheets
- **Team Collaboration**: Multiple users can access with Google accounts
- **Audit Trail**: Every change logged with timestamp and user
- **Customizable**: Add fields/dropdowns without touching code
- **Quick Sync**: Import contacts from your phone via vCard or CSV
- **Notes Inbox**: Quick capture notes and link them to contacts
- **Meeting Mode**: Track interactions with multiple contacts at once
- **Call Mode**: Streamlined interface for phone banking
- **Duplicate Detection**: Smart matching to prevent duplicate contacts
- **Bulk Import/Export**: CSV and vCard support with field mapping
- **Organizations & Locations**: Track companies and places with full relationship support
- **Relationship Network**: Interactive graph visualization of contact relationships
- **API Usage Dashboard**: Monitor API rate limits and usage patterns
- **Calendar Sync**: Two-way Google Calendar integration (optional premium)
- **Workspaces**: Create shared team workspaces with role-based permissions (optional premium)
- **Flexible Monetization**: Freemium model with optional premium features

---

## Perfect For

- Team projects
- Nonprofit donor/volunteer management
- Community groups
- Small business CRM
- Personal contact management
- Anyone who wants a simple, powerful CRM

---

## Quick Start

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Google account (Gmail, Google Workspace, etc.)
- 15 minutes for initial setup

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm start
```

The app will open at `http://localhost:3000` and the built-in Setup Wizard will guide you through:

1. Setting up Google OAuth credentials
2. Enabling Google Sheets API
3. Connecting your database sheet
4. Configuring permissions

Your settings are saved automatically and persist across sessions!

### Development Mode (Optional)

Want to test the app without setting up Google OAuth and Sheets first? Use dev mode:

1. Create a `.env` file in the project root with: `VITE_DEV_MODE=true`
2. Run `npm start`
3. The app loads with mock data and localStorage - perfect for exploring features without credentials

See [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) for complete development setup details.

---

## Documentation

### For Users
| Document | Description |
|----------|-------------|
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Complete step-by-step setup instructions |
| **[CONFIG.md](CONFIG.md)** | Configuration reference and customization options |

### For Developers & AI Agents
| Document | Description |
|----------|-------------|
| **[AI_AGENT_QUICKSTART.md](AI_AGENT_QUICKSTART.md)** | Quick reference for AI coding assistants |
| **[docs/README.md](docs/README.md)** | Master documentation index for all docs |
| **[docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)** | Production deployment guide |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Visual architecture diagrams and data flow |
| **[docs/WORKSPACES_FOR_AGENTS.md](docs/WORKSPACES_FOR_AGENTS.md)** | Workspace system guide |
| **[docs/DEV_MODE_FOR_AGENTS.md](docs/DEV_MODE_FOR_AGENTS.md)** | Dev mode patterns and best practices |
| **[docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md)** | Complete development environment guide |
| **[docs/WINDOW_TEMPLATE_GUIDE.md](docs/WINDOW_TEMPLATE_GUIDE.md)** | Guide for creating modal windows |

---

## How It Works

### Architecture

```
User Browser ──→ @react-oauth/google ──→ Google Sheets API ──→ Your Google Sheet
                   (Direct OAuth)         (Read/Write Data)       (Database)
                          │
                          └──→ Google Calendar API (optional, for calendar sync)
```

1. **Direct Google OAuth**: Secure Google sign-in (via @react-oauth/google)
2. **Google Sheets API**: Read/write contact data
3. **Google Calendar API**: Optional two-way calendar sync
4. **Your Google Sheet**: Acts as the database (you control it!)
5. **Optional Billing Backend**: Stripe integration for premium features

### Where Your Data Lives

| Data Type | Storage Location | Privacy |
|-----------|------------------|---------|
| **Contacts, Organizations, Locations, Touchpoints, Events, Tasks, Notes** | Your Google Sheet | You own it, we never see it |
| **User authentication** | Google OAuth (encrypted) | Google's secure OAuth |
| **Settings & preferences** | Browser localStorage | Stays on your device |
| **Third-party access** | None | Your data never leaves your control |

---

## Usage

### Adding Your First Contact

1. Click "Add Contact" in the top right
2. Fill in contact details (Name is required, others optional)
3. App automatically checks for duplicates
4. Click "Add Contact"

Contact appears immediately in both the app and your Google Sheet!

### Logging a Touchpoint

1. Open a contact's profile
2. Click "Log Touchpoint"
3. Select interaction type (Call, Email, Meeting, etc.)
4. Add notes and outcome
5. (Optional) Set follow-up reminder
6. Click "Log Touchpoint"

The contact's "Last Contact Date" updates automatically!

### Customizing Fields

No code needed! Just edit your Google Sheet:

1. Add a column header in Google Sheets (e.g., "Source")
2. (Optional) Add data validation for dropdown values
3. Refresh Touchpoint CRM
4. New field appears in forms automatically!

### Workspaces - Team Collaboration

Create separate workspaces for different teams or initiatives:

1. Click "Workspaces" in the navbar
2. Click "Create Workspace"
3. Fill in workspace details (name, description)
4. Generate an invitation link to share with team members
5. Each workspace has its own Google Sheet and team members

Features:
- Invite team members with customizable roles
- Complete data isolation between workspaces and personal contacts
- Role-based permissions (Owner, Admin, Member)
- All features available (contacts, touchpoints, events)

See [docs/WORKSPACES_FOR_AGENTS.md](docs/WORKSPACES_FOR_AGENTS.md) for complete workspace system documentation.

### Quick Sync - Import from Phone

Easily import contacts from your phone or other devices:

1. Click "Quick Sync" in the navbar or dashboard
2. Export contacts from your phone:
   - **iPhone**: iCloud.com → Contacts → Export vCard
   - **Android**: contacts.google.com → Export → vCard
   - **Outlook**: File → Export → CSV
3. Drop the file into Touchpoint
4. Review new contacts (duplicates auto-filtered)
5. Add context (how you met, tags, priority)
6. Click "Add" or "Add All"

Quick Sync remembers what you've imported, so you won't see the same contacts twice.

### Calendar Sync - Two-Way Integration (Premium)

Keep your CRM events and Google Calendar in sync:

1. Enable Calendar Sync in Settings
2. Grant Google Calendar permissions
3. Events you create in Touchpoint appear in Google Calendar
4. Import personal calendar events as CRM events or touchpoints
5. Automatic conflict detection and resolution

Features:
- Two-way sync (CRM ↔ Calendar)
- Selective import from personal calendar
- Conflict resolution with side-by-side diff
- Manual and automatic sync options

### Notes Inbox - Quick Capture

Capture notes on the go and link them to contacts later:

1. Click the floating note button (bottom right)
2. Jot down your note
3. Notes appear in the Notes Inbox
4. Link notes to contacts when you're ready

### Meeting Mode

Track interactions with multiple contacts at once:

1. Click "Start Meeting" in the navbar
2. Select contacts attending
3. Log touchpoints for all participants simultaneously

### Organizations & Locations

Track companies, venues, and places alongside your contacts:

**Organizations:**
1. Click "Organizations" in the navbar
2. Add companies, nonprofits, or groups
3. Link contacts to organizations (employee, board member, client, etc.)
4. View organization profiles with related contacts

**Locations:**
1. Click "Locations" in the navbar
2. Add venues, offices, or important places
3. Track visits with notes and dates
4. Link contacts and organizations to locations

### Relationship Network

Visualize your contact relationships:

1. Open any contact's profile
2. Click "View Network" to see the interactive relationship graph
3. Drag and zoom to explore connections
4. Click nodes to navigate between related contacts, organizations, and locations

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **React Router 7** | Client-side routing |
| **Vite 7** | Build tool and dev server |
| **@react-oauth/google** | User authentication (FREE) |
| **Google Sheets API** | Database operations (FREE) |
| **Google Calendar API** | Calendar sync (FREE, optional) |
| **React Flow** | Interactive relationship graph visualization |
| **PapaParse** | CSV/vCard parsing |
| **Stripe** | Payment processing (optional, for premium features) |
| **Node.js/Express** | Billing backend (optional) |

**100% Free Architecture**

- All data in Google Sheets - No paid database needed
- Direct Google OAuth - No intermediary auth service
- Workspace system - Fully Google Sheets-based
- Scales to 1,000+ users - All on free tier
- $0/month - Forever (optional premium features available)

**Why Google Sheets?**

- No database hosting costs
- Familiar interface for non-technical users
- Built-in collaboration and permissions
- Easy data export and backup

---

## Security & Privacy

### Data Privacy

- **Your Data**: Stored only in your Google Sheet
- **No Third Parties**: We don't store or access your data
- **Google's Security**: Benefits from Google's enterprise-grade security
- **GDPR Compliant**: You control all data, easy to export/delete

### Authentication

- **OAuth 2.0**: Industry-standard Google sign-in
- **Token Auto-Refresh**: Seamless re-authentication
- **Secure Tokens**: Stored securely in browser localStorage

### Security

See [docs/SECURITY.md](docs/SECURITY.md) for comprehensive security documentation including:

- Security architecture and threat model
- XSS and CSRF protection details
- Developer security checklist
- Vulnerability reporting process

**Last Security Audit:** 2026-02-15 | **Security Grade:** A

---

## Troubleshooting

### "No access token" error

**Solution:** Check `VITE_GOOGLE_CLIENT_ID` in `.env` and ensure OAuth redirect URIs include `http://localhost:3000`.

### "Failed to load data" from Sheets

**Solution:** Verify `VITE_GOOGLE_SHEETS_ID` and ensure sheet tabs are named exactly: "Contacts", "Touchpoints", "Audit Log".

### Authentication popup blocked

**Solution:** Allow popups for localhost in your browser settings, or click the popup blocked icon in the address bar.

**More help:** See [SETUP_GUIDE.md - Troubleshooting](SETUP_GUIDE.md#troubleshooting)
