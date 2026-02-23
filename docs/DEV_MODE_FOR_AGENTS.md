# Dev Mode for Claude Code Agents

**Purpose:** This guide helps future Claude Code agents work with dev mode without needing to remember any patterns or make any special considerations.

**IMPORTANT:** No emojis should be used in code, documentation, or any outputs unless explicitly requested by the user.

---

## TL;DR - Just Use the Wrapper

When you import data functions, use this:

```javascript
DON'T DO THIS:
import { readSheetData, addContact } from '../utils/sheets';

DO THIS INSTEAD:
import { readSheetData, addContact } from '../utils/devModeWrapper';
```

That's it. Dev mode works automatically. No other changes needed.

---

## Why the Wrapper?

The `devModeWrapper.js` file automatically:
- Detects if `VITE_DEV_MODE=true`
- Routes to localStorage in dev mode
- Routes to Google Sheets API in production
- Handles all the complexity so you don't have to

You never need to think about dev mode - it's completely transparent.

---

## What Functions are Wrapped?

All the data access functions you'll ever need:

| Function | What it does |
|----------|-------------|
| `readSheetMetadata()` | Get field headers and validation rules |
| `readSheetData()` | Read contacts or touchpoints |
| `generateContactID()` | Generate next contact ID |
| `generateTouchpointID()` | Generate next touchpoint ID |
| `addContact()` | Create a new contact |
| `updateContact()` | Edit an existing contact |
| `appendRow()` | Add a row to any sheet |
| `addTouchpoint()` | Log a touchpoint |
| `getContactTouchpoints()` | Get touchpoints for a contact |
| `detectDuplicates()` | Find duplicate contacts |

**All of these work transparently in both dev and production mode.**

---

## Quick Example

### Before (if dev mode wasn't automatic)

```javascript
// OLD WAY - Had to manually check dev mode everywhere
import { readSheetData, isDevMode } from '../utils/sheets';

async function loadContacts(accessToken, sheetId) {
  if (isDevMode()) {
    // Handle dev mode
    const data = getLocalContacts();
    return data;
  }

  // Handle production
  const result = await readSheetData(accessToken, sheetId, 'Contacts');
  return result.data;
}
```

### After (with wrapper - much cleaner!)

```javascript
// NEW WAY - Just import from wrapper, it handles everything
import { readSheetData } from '../utils/devModeWrapper';

async function loadContacts(accessToken, sheetId) {
  // This works the same in dev mode AND production
  const result = await readSheetData(accessToken, sheetId, 'Contacts');
  return result.data;
}
```

---

## When to Use Which Import

### Use the Wrapper For:
- Reading contacts/touchpoints
- Writing contacts/touchpoints
- Generating IDs
- Any data access that should work in both modes

```javascript
import { readSheetData, addContact, updateContact } from '../utils/devModeWrapper';
```

### Use sheets.js Directly (Rare):
- Building new data access functions that might need raw API access
- Working with other sheets not yet wrapped
- Advanced API operations

```javascript
import { readSheetData } from '../utils/sheets';  // ← Only in special cases
```

---

## What Happens in Dev Mode?

When `VITE_DEV_MODE=true`:

1. **readSheetData()** → Reads from localStorage (`dev_contacts` key)
2. **addContact()** → Writes to localStorage (auto-generates C-ID)
3. **updateContact()** → Updates in localStorage
4. **readSheetMetadata()** → Returns mock metadata with dropdowns
5. All other functions → Use localStorage instead of Google Sheets API

**Zero Google Sheets API calls are made in dev mode.**

---

## What Happens in Production?

When `VITE_DEV_MODE=false` (or not set):

1. **readSheetData()** → Calls Google Sheets API
2. **addContact()** → Calls Google Sheets API, logs to audit
3. **updateContact()** → Calls Google Sheets API, logs changes
4. **readSheetMetadata()** → Calls Google Sheets API
5. Everything works with real data in Google Sheets

---

## Common Mistakes to Avoid

### Mistake 1: Importing from sheets.js instead of devModeWrapper.js

```javascript
// DON'T DO THIS
import { readSheetData } from '../utils/sheets';

// DO THIS INSTEAD
import { readSheetData } from '../utils/devModeWrapper';
```

**Why:** The wrapper is what adds dev mode intelligence. If you import directly from sheets.js, dev mode features won't work.

---

### Mistake 2: Adding dev mode checks to your code

```javascript
// DON'T DO THIS - already handled by wrapper
if (import.meta.env.VITE_DEV_MODE === 'true') {
  const data = getLocalContacts();
} else {
  const result = await readSheetData(...);
}

// DO THIS INSTEAD - just call the function
const result = await readSheetData(...);
```

**Why:** The wrapper handles all of this for you. You don't need to check `VITE_DEV_MODE` in your code.

---

### Mistake 3: Using localStorage directly

```javascript
// DON'T DO THIS
import { getLocalContacts } from '../data/seedTestData';
const contacts = getLocalContacts();

// DO THIS INSTEAD
import { readSheetData } from '../utils/devModeWrapper';
const { data: contacts } = await readSheetData(...);
```

**Why:** Using localStorage directly breaks the abstraction. The wrapper provides a unified API that works the same whether you're reading from localStorage or Google Sheets.

---

## If You Add New Data Functions

**Future enhancement:** If you add new data access functions to `sheets.js`:

1. **Add the production function** to `sheets.js`
2. **Add a wrapper** to `devModeWrapper.js` that:
   - Checks `isDevMode()`
   - Uses localStorage operations in dev mode
   - Calls original function in production
3. **Update docs** pointing people to use the wrapper

Example template:

```javascript
// In devModeWrapper.js
export const myNewFunction = (function() {
  const originalFn = sheetsModule.myNewFunction;
  return async function myNewFunction(...args) {
    if (isDevMode()) {
      // Dev mode logic here
      console.log('[DEV MODE] Doing something');
      // ... localStorage operations
    }
    // Production
    return originalFn(...args);
  };
})();
```

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│    Your Code (Pages, Components)        │
└────────────┬────────────────────────────┘
             │
             │ import from here!
             ↓
┌─────────────────────────────────────────┐
│    devModeWrapper.js ← SMART LAYER      │
│  (detects VITE_DEV_MODE)                │
└──────┬────────────────────────────┬─────┘
       │                            │
DEV MODE│                    PRODUCTION│
       │                            │
       ↓                            ↓
┌──────────────────┐      ┌──────────────────┐
│  localStorage    │      │  Google Sheets   │
│  (test data)     │      │  API             │
└──────────────────┘      └──────────────────┘
```

---

## Summary

- **Import from `devModeWrapper.js`** (not `sheets.js`)
- **Dev mode works automatically** - no checks needed
- **Same API in both modes** - write once, works everywhere
- **Zero cognitive load** - you never have to think about it

**For future agents:** Just use the wrapper and everything just works.

---

## Working with Workspaces?

If you're working on **workspace features**, read [WORKSPACES_FOR_AGENTS.md](WORKSPACES_FOR_AGENTS.md) for:
- Workspace system architecture
- Multi-sheet data separation
- Team collaboration features
- Role-based permissions
- Development workflow for workspaces

The same wrapper pattern applies to workspace data - just import from `devModeWrapper.js` and everything works automatically.
