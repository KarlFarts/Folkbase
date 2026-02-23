# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Folkbase - a personal relationship manager. Uses a 100% free architecture: React frontend with Google Sheets as the database via Google Sheets API. No paid backend services.

**Stack:** React 19 + Vite 7 + Google Sheets API + Google OAuth (`@react-oauth/google`)
**Language:** JavaScript only (no TypeScript). JSX is in `.js` files.

## Commands

```bash
npm start          # Dev server on port 3000
npm run build      # Production build
npm test           # Run tests (Vitest)
npm run preview    # Preview production build
```

Pre-commit hooks (Husky + lint-staged) auto-run ESLint and Prettier on staged `*.{js,jsx}` files.

## Architecture

### Data Flow

```
Browser (React) → Google OAuth → Google Sheets API → User's Google Sheet in "Folkbase" folder
                                                     (each user has their own)
```

In dev mode (`VITE_DEV_MODE=true`), all data operations use localStorage instead of Google Sheets. This is transparent to application code.

### Google Drive Folder Architecture

All user data is organized in a dedicated "Folkbase" folder in Google Drive:
- **Main database sheet** - The Google Sheet with all contact/org/event tabs
- **Exports** - CSV, vCard exports (future)
- **Backups** - Timestamped sheet snapshots (future)
- **Imports** - Staged CSV files for import (future)
- **Attachments** - Profile photos, documents (future)

The setup wizard automatically creates this folder and places new sheets inside it. Existing sheets found during auto-discovery are moved into the folder for consistency.

### Context Provider Hierarchy

```
App.js
  └── AuthProvider          (Google OAuth, tokens, user profile)
      └── NotificationProvider  (toast notifications)
          └── WorkspaceProvider    (personal vs workspace mode, active workspace)
              └── AppContent       (routes, pages)
```

### Critical Data Layer Rule

**Always import data functions from `src/utils/devModeWrapper.js`, never from `src/utils/sheets.js` directly.** The wrapper transparently routes to localStorage (dev) or Sheets API (production). No manual mode checking needed in components.

```javascript
// CORRECT
import { readSheetData, addContact } from '../utils/devModeWrapper';

// WRONG - bypasses dev mode
import { readSheetData, addContact } from '../utils/sheets';
```

### Sheet ID Resolution

Use `useActiveSheetId()` from `src/utils/sheetResolver.js` to get the correct Google Sheet ID. It automatically returns the personal sheet ID or active workspace sheet ID based on current mode.

### Sheet Names and Constants

Always use `SHEET_NAMES` from `src/config/constants.js` instead of hardcoded tab name strings. This file is the single source of truth for sheet tab names, header definitions, ID formats, and auto-generated fields.

### ID Formats

IDs follow the pattern `PREFIX + zero-padded number`:
- Contact: `CON001`, Organization: `ORG001`, Location: `LOC001`
- Touchpoint: `TP001`, Event: `EVT001`, Task: `TSK001`
- Note: `NOTE001`, List: `LST001`, Workspace: `WS001`

### Google Sheets Structure

The database is a Google Sheet with 25+ tabs organized as:
- **Core data:** Contacts, Organizations, Locations, Location Visits, Touchpoints, Events, Tasks, Notes, Lists
- **Relationships (many-to-many junction tabs):** Contact Lists, Contact Notes, Event Notes, List Notes, Task Notes, Contact Relationships, Entity Relationships
- **Workspace system:** Workspaces, Workspace Members, Workspace Invitations, Contact Links, Sync Conflicts, Activities
- **System:** Audit Log, Import Settings, Import History

### Routing

All pages are lazy-loaded via `React.lazy()` in `src/App.js`. Routes use React Router v7. Page components receive an `onNavigate` prop for centralized navigation.

### UI System

Custom CSS with design tokens (CSS variables) - no UI component library. Icons from `lucide-react`. Theme system supports multiple palettes and light/dark brightness modes.

Key UI patterns:
- `WindowTemplate` component for all modals (see `docs/WINDOW_TEMPLATE_GUIDE.md`)
- `.card` / `.card-header` / `.card-body` class pattern for cards
- `.btn .btn-primary`, `.btn-sm` etc. for buttons

## Path Aliases

```
@ → ./src
@components → ./src/components
@utils → ./src/utils
@hooks → ./src/hooks
```

## Code Style

- Prettier: single quotes, trailing commas (es5), 100 char print width, 2-space tabs, semicolons
- ESLint: `no-console` warns (console.error/warn allowed), unused vars error (underscore-prefixed ignored), prop-types off
- Naming: `camelCase` for variables/functions/files, `PascalCase` for React components/files, `UPPER_SNAKE_CASE` for constants
- Test files: `*.test.js`, either alongside component or in `__tests__/`
- No emojis in code or docs unless explicitly requested
- **Do not add "Co-Authored-By: Claude" or any AI attribution to commit messages**

## Testing

- Framework: Vitest (not Jest) with jsdom environment
- Libraries: `@testing-library/react`, `@testing-library/user-event`
- Test globals (`describe`, `it`, `expect`, `vi`) are available without imports
- Setup file: `src/setupTests.js`
- Mocks: `src/__tests__/mocks/`, Fixtures: `src/__tests__/fixtures/`

## Key Documentation

The `docs/` folder has detailed guides. Most relevant for development:
- `docs/WORKSPACES_FOR_AGENTS.md` - workspace system architecture
- `docs/DEV_MODE_FOR_AGENTS.md` - dev mode wrapper pattern
- `docs/WINDOW_TEMPLATE_GUIDE.md` - modal system
- `docs/COMPONENT_PATTERNS.md` - UI component guidelines
- `docs/DESIGN_TOKENS.md` - CSS variable design system
- `docs/FIELD_RENDERING.md` - form field patterns

## Environment Variables

```bash
VITE_GOOGLE_CLIENT_ID    # Google OAuth client ID
VITE_GOOGLE_SHEETS_ID    # Personal Google Sheet ID
VITE_DEV_MODE=true       # Enable dev mode (localStorage instead of Sheets API)
```
