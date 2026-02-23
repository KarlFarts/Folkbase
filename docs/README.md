# Touchpoint CRM - Documentation for AI Agents

**Last Updated:** 2026-02-07
**Purpose:** Central index for all AI agent documentation

**CRITICAL RULES FOR AI AGENTS:**
1. No emojis in code, documentation, or outputs unless explicitly requested by user
2. Always read relevant documentation before making changes
3. Use devModeWrapper.js for all data operations (never import from sheets.js directly)
4. Follow conventional commit messages (feat:, fix:, chore:, docs:)
5. Test before committing: npm test && npm run build

---

## Quick Start for New AI Agents

**Start here:** Read [../AI_AGENT_QUICKSTART.md](../AI_AGENT_QUICKSTART.md) for a 30-second overview

**If you're working on workspaces:** Read [WORKSPACES_FOR_AGENTS.md](WORKSPACES_FOR_AGENTS.md) first

**If you're working on dev mode or data layer:** Read [DEV_MODE_FOR_AGENTS.md](DEV_MODE_FOR_AGENTS.md) first

**If you need general project context:** Read [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)

**If you're writing tests:** Read [TESTING.md](TESTING.md) first

**If you're setting up production:** Read [PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md)

---

## Documentation Structure

### For AI Agents (Primary Documents)

**[WORKSPACES_FOR_AGENTS.md](WORKSPACES_FOR_AGENTS.md)** - REQUIRED reading for workspace work
- Workspace system architecture and workflow
- Multi-sheet data separation explained
- Role-based permissions (owner/admin/member)
- Development workflow for team collaboration
- Key takeaways section at top (always read first)
- Common patterns and code examples

**[DEV_MODE_FOR_AGENTS.md](DEV_MODE_FOR_AGENTS.md)** - REQUIRED reading for data operations
- How to use devModeWrapper.js correctly
- Why wrapper pattern exists
- Common mistakes to avoid
- Dev vs production mode handling
- Function reference table

### Architecture & Production

**[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- High-level architecture diagrams
- Data flow diagrams
- Sheet structure and relationships
- Authentication flow
- Dev mode vs production mode

**[PRODUCTION_SETUP_GUIDE.md](PRODUCTION_SETUP_GUIDE.md)** - Production deployment guide
- Google Cloud setup
- Google Sheet template setup
- Workspace migration to Sheets
- Setup wizard implementation
- AI agent instructions

**[MONETIZATION_PLAN.md](MONETIZATION_PLAN.md)** - Premium features & billing setup
- Freemium model architecture
- Premium feature gating
- Stripe integration
- Billing backend setup
- Subscription management

**[../PROGRESS.md](../PROGRESS.md)** - Calendar sync implementation progress
- Phase-by-phase completion status
- Feature checklist
- Testing status

### Comprehensive Guides

**[DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)** - Complete development environment guide
- Dev mode setup (30 seconds)
- Mock authentication system
- Test data management
- UI resilience and empty states
- Development workflow best practices
- Troubleshooting guide

**[WINDOW_TEMPLATE_GUIDE.md](WINDOW_TEMPLATE_GUIDE.md)** - Window/modal system guide
- WindowTemplate component usage
- CSS architecture and classes
- Usage patterns (dialogs, forms, settings)
- Theming and customization

**[TESTING.md](TESTING.md)** - Testing patterns and best practices
- Test setup and configuration with Vitest
- Running tests in dev vs production mode
- Test data fixtures and seeding system
- Mock authentication with role-based testing
- Common testing patterns and troubleshooting

**[NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md)** - Code naming standards
- JavaScript naming conventions (variables, constants, components)
- LocalStorage key patterns and migration strategy
- File and directory naming standards
- Test file naming conventions

---

## Key Concepts (Must Understand)

### 1. Dev Mode Wrapper Pattern

**CRITICAL:** Always import from devModeWrapper.js, never from sheets.js directly.

```javascript
CORRECT:
import { readSheetData, addContact } from '../utils/devModeWrapper';

WRONG:
import { readSheetData, addContact } from '../utils/sheets';
```

**Why:** The wrapper automatically routes to localStorage (dev mode) or Google Sheets API (production). No manual mode checking needed.

### 2. Multi-Sheet Architecture

**Personal Mode:** Uses config.personalSheetId (personal contacts)
**Workspace Mode:** Uses activeWorkspace.sheet_id (workspace contacts)

**Resolution:** Use `useActiveSheetId()` hook from src/utils/sheetResolver.js
- Automatically returns correct sheet ID based on mode
- Components never need to know which mode they're in

### 3. Workspace Roles

**Owner** - Full control (workspace creator)
**Admin** - Can invite/manage members
**Member** - Can view/edit contacts, log touchpoints

Check permissions:
```javascript
const isOwnerOrAdmin = workspace?.owner_email === user?.email ||
  workspaceMembers.some(m => m.member_email === user?.email && m.role === 'admin');
```

### 4. Data Separation

Personal and workspace contacts are completely isolated:
- Different Google Sheets
- Different localStorage keys (in dev mode)
- Automatic routing via useActiveSheetId() hook
- No cross-contamination possible

### 5. Multi-Entity System

Three core entity types with full relationship support:
- **Contacts** (CON prefix) - People in your network
- **Organizations** (ORG prefix) - Companies, nonprofits, groups
- **Locations** (LOC prefix) - Venues, offices, important places

**Relationship Network:**
- Interactive graph visualization powered by React Flow
- Cross-entity relationships (Contact↔Organization, Contact↔Location)
- 5 relationship categories: Familial, Professional, Social, Organizational, Locational
- RelationshipGraph component for visual exploration

---

## File Structure Reference

### Critical Files for Data Operations

```
src/
  utils/
    devModeWrapper.js       ← ALWAYS import from here
    sheetResolver.js        ← useActiveSheetId() hook
    sheets.js               ← Don't import directly

  contexts/
    AuthContext.js          ← User authentication
    WorkspaceContext.js     ← Workspace state management
    ConfigContext.js        ← Personal sheet config

  pages/
    WorkspaceDashboard.js   ← Workspace listing/management
    CreateWorkspace.js      ← Workspace creation wizard
    JoinWorkspace.js        ← Invitation acceptance
    OrganizationList.js     ← Organization management
    OrganizationProfile.js  ← Organization details
    LocationList.js         ← Location management
    LocationProfile.js      ← Location details

  components/
    WorkspaceSwitcher.js    ← Personal/workspace mode switcher
    RelationshipGraph.js    ← Interactive relationship visualization
    OrganizationCard.js     ← Organization display component
    LocationCard.js         ← Location display component
    DevToolsPanel.js        ← Dev mode tools (bottom-left)
    DevModeRoleSwitcher.js  ← Role switcher (red DEV button)
```

### Test Data Files (Dev Mode)

```
src/
  auth/
    mockAuth.js             ← Mock user profiles

  data/
    testContacts.js         ← 6 test contacts
    seedTestData.js         ← Seeding logic

  hooks/
    useTestDataManager.js   ← Test data lifecycle
```

---

## Common Tasks Quick Reference

### Starting New Workspace Feature

1. Read [WORKSPACES_FOR_AGENTS.md](WORKSPACES_FOR_AGENTS.md) KEY TAKEAWAYS section
2. Create feature branch: `git checkout -b feature/description`
3. Import from devModeWrapper.js for data operations
4. Use useActiveSheetId() for sheet resolution
5. Test before committing: `npm test && npm run build`

### Adding New Data Function

1. Add function to src/utils/sheets.js (production implementation)
2. Add wrapper to src/utils/devModeWrapper.js (dev mode support)
3. Update [DEV_MODE_FOR_AGENTS.md](DEV_MODE_FOR_AGENTS.md) function table
4. Test in both dev and production modes

### Modifying Workspace Permissions

1. Understand current role system (owner/admin/member)
2. Check [WORKSPACES_FOR_AGENTS.md](WORKSPACES_FOR_AGENTS.md) permission section
3. Update UI permission checks
4. Test with different roles (use DevModeRoleSwitcher)

### Working with Test Data

**Dev Tools Panel (bottom-left in dev mode):**
- Seed Test Data - Add 6 test contacts
- Reload Test Data - Clear and re-add
- Clear Test Data - Remove test contacts only
- Clear All Data - Delete everything

**Via code:**
```javascript
import { seedTestData, clearTestData } from '../data/seedTestData';
```

---

## Development Workflow

### Daily Workflow

1. Pull latest: `git pull origin main`
2. Create branch: `git checkout -b feature/your-feature`
3. Start dev server: `npm start` (dev mode auto-initializes)
4. Develop with test data
5. Test with different roles (red DEV button)
6. Before commit:
   - `npm test`
   - `npm run build`
   - Review changes: `git diff`
7. Commit: `git commit -m "feat: description"`
8. Push: `git push origin feature/your-feature`

### Pre-Commit Checklist

- [ ] npm test passes
- [ ] npm run build succeeds
- [ ] Tested in dev mode with multiple roles
- [ ] No console errors
- [ ] Imports from devModeWrapper.js (not sheets.js)
- [ ] Uses useActiveSheetId() for sheet resolution
- [ ] Conventional commit message
- [ ] No emojis in code/docs

---

## Environment Variables

### Dev Mode (Local Development)

```bash
VITE_DEV_MODE=true
VITE_FIREBASE_API_KEY=dummy
VITE_FIREBASE_AUTH_DOMAIN=dummy.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dummy
VITE_FIREBASE_STORAGE_BUCKET=dummy.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123
VITE_FIREBASE_APP_ID=dummy
```

### Production

```bash
VITE_DEV_MODE=false
VITE_FIREBASE_API_KEY=real_api_key
VITE_FIREBASE_AUTH_DOMAIN=real_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=real_project_id
VITE_GOOGLE_SHEETS_ID=real_sheet_id
VITE_GOOGLE_CLIENT_ID=real_client_id.apps.googleusercontent.com
```

---

## Troubleshooting

### Test data not loading
- Verify VITE_DEV_MODE=true in .env
- Restart dev server
- Click "Seed Test Data" in Dev Tools panel

### Wrong sheet being accessed
- Check useActiveSheetId() is being used
- Verify WorkspaceContext is providing correct mode
- Check imports are from devModeWrapper.js

### Build errors
- Run: `npm test`
- Run: `npm run build`
- Check for circular dependencies
- Verify all imports resolve correctly

### Workspace features not working
- Verify workspace mode is active (check navbar dropdown)
- Check user has workspace membership
- Check browser console for errors

---

### API Integration

**[API_TRACKING.md](API_TRACKING.md)** - API usage tracking system
- Quick start guide
- Architecture and components
- Monitoring and troubleshooting

---

## Additional Resources

**Project Root Documentation:**
- [../SETUP_GUIDE.md](../SETUP_GUIDE.md) - Complete setup instructions
- [../CONFIG.md](../CONFIG.md) - Configuration reference
- [../AI_AGENT_QUICKSTART.md](../AI_AGENT_QUICKSTART.md) - Quick reference for AI agents

**For Users (Not AI Agents):**
- Setup wizard built into app
- In-app help documentation
- GitHub issues for support

---

## Summary

**For AI Agents:**
1. Always read KEY TAKEAWAYS in WORKSPACES_FOR_AGENTS.md before workspace work
2. Always import from devModeWrapper.js for data operations
3. Always use useActiveSheetId() for sheet resolution
4. Never use emojis unless explicitly requested
5. Test before committing: npm test && npm run build

**Core Architecture:**
- Wrapper pattern abstracts dev/production mode
- Multi-sheet architecture separates personal/workspace data
- Role-based permissions control workspace access
- Complete isolation between modes

**Documentation Priority:**
1. WORKSPACES_FOR_AGENTS.md - For workspace features
2. DEV_MODE_FOR_AGENTS.md - For data operations
3. DEV_ENVIRONMENT.md - For environment setup
4. This file (README.md) - For navigation

---

**Status:** READY FOR AGENT USE
**Last Updated:** 2026-02-07
