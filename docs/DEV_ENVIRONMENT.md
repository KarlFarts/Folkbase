# Touchpoint Development Environment

**Last Updated:** 2025-12-29
**Purpose:** Enable focused UI development with pre-seeded test data and mock authentication - no Firebase or Google Sheets credentials required.

---

## Quick Start (30 Seconds)

### 1. Enable Dev Mode

```bash
# Create .env file
echo "VITE_DEV_MODE=true" > .env

# Add required Firebase placeholders (not used, but needed for app init)
cat >> .env << 'EOF'
VITE_FIREBASE_API_KEY=dummy
VITE_FIREBASE_AUTH_DOMAIN=dummy.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dummy
VITE_FIREBASE_STORAGE_BUCKET=dummy.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123
VITE_FIREBASE_APP_ID=dummy
EOF

# Start dev server
npm start
```

### 2. What You Get

When the app loads in dev mode:

- ✅ **Auto-login** as "Dev Admin" (admin@dev.local)
- ✅ **6 test contacts** loaded automatically
- ✅ **No Firebase/Google Sheets** needed
- ✅ **Dev tools panel** (bottom-left corner)
- ✅ **Role switcher** (red "DEV" button in navbar)

### 3. Test Contacts

Six pre-made contacts are automatically available:

1. **Adam A. A.** (TEST0102001) - Urgent priority
2. **Sarah B Johnson** (TEST0102002) - High priority, Community Outreach
3. **Michael Chen** (TEST0102003) - Medium priority, Tech For Good
4. **Emily Grace Rodriguez** (TEST0102004) - High priority, Youth Engagement
5. **James P Williams** (TEST0102005) - Medium priority, Donor
6. **Patricia Martinez** (TEST0102006) - Low priority, Environmental Advocate

All contacts have full schema (phone, email, organization, bio, tags, etc.)

### 4. Managing Test Data

**Dev Tools Panel** (bottom-left):
- 🌱 **Seed Test Data** - Add test contacts
- 🔄 **Reload Test Data** - Clear and re-add
- 🗑️ **Clear Test Data** - Remove only test contacts
- 💥 **Clear All Data** - Delete everything (with confirmation)

### 5. Switching Roles

Click red **"DEV"** button in navbar to switch between:
- **Admin** (admin@dev.local) - Full permissions
- **Volunteer** (volunteer@dev.local) - Read, write
- **Workspace Manager** (manager@dev.local) - Read, write, manage_contacts

---

## Full Development Guide

### Mock Authentication System

#### Available Mock Users

Three mock user profiles are available in dev mode:

**1. Admin**
- Email: admin@dev.local
- Role: admin
- Permissions: read, write, delete, manage_users

**2. Volunteer**
- Email: volunteer@dev.local
- Role: volunteer
- Permissions: read, write

**3. Workspace Manager**
- Email: manager@dev.local
- Role: workspace_manager
- Permissions: read, write, manage_contacts

#### How Auth Bypass Works

When `VITE_DEV_MODE=true`:

1. **AuthContext** detects dev mode
2. Instead of Firebase `signInWithPopup()`, it uses `mockSignIn()`
3. A mock user is immediately set with a mock access token
4. Setup wizard is skipped
5. App initializes directly to the dashboard

The real Firebase code is never executed in dev mode, preventing auth errors when credentials are missing.

#### Switching User Roles

1. Click the red "DEV" button in the top-right navbar
2. Select any role to switch to it
3. The page automatically refreshes with the new user
4. Selection persists across page reloads (stored in localStorage)
5. The current user is displayed in the navbar

#### Re-enabling Real Auth

To switch back to production authentication:

1. Remove or set `VITE_DEV_MODE=false` in `.env`
2. Restart your dev server
3. Firebase authentication will be used normally

---

### Test Data System

#### What Test Data Exists

Six pre-made contacts are provided for development:

**1. Adam A** (TEST0102001)
- Phone: 313-757-1611
- Email: almaleky@umich.edu
- Role: Role Test
- Priority: Urgent

**2. Sarah B Johnson** (TEST0102002)
- Phone: 555-123-4567
- Email: sarah.johnson@test.local
- Organization: Community Outreach
- Priority: High

**3. Michael Chen** (TEST0102003)
- Phone: 555-987-6543
- Email: mchen@test.local
- Organization: Tech For Good
- Priority: Medium

**4. Emily Grace Rodriguez** (TEST0102004)
- Phone: 555-456-7890
- Email: emily.r@test.local
- Organization: Youth Engagement Network
- Priority: High

**5. James P Williams** (TEST0102005)
- Phone: 555-321-0987
- Email: jwilliams@test.local
- Priority: Medium

**6. Patricia Martinez** (TEST0102006)
- Phone: 555-654-3210
- Email: pmartinez@test.local
- Organization: Environmental Action Group
- Priority: Low

All test contacts have:
- Full contact information (name, phone, email, organization, etc.)
- Realistic roles and bios
- Status and priority levels
- Tags for categorization
- `__TEST_DATA__: true` flag for easy identification

#### How Test Data is Marked

All test contacts are marked with a special flag: `__TEST_DATA__: true`

This allows the system to:
- Easily identify which contacts are test data
- Remove them without affecting real contacts
- Filter them out if needed

Test contact IDs all start with `TEST` to avoid collisions with real contacts.

#### Managing Test Data

**Using the Dev Tools Panel:**

Click the minimized "Dev Tools" panel in the bottom-left corner of the app:

- **🌱 Seed Test Data**: Adds test contacts if not already present (idempotent)
- **🔄 Reload Test Data**: Clears all test contacts and re-adds them
- **🗑️ Clear Test Data**: Removes only test contacts (keeps real contacts)
- **💥 Clear All Data**: Permanently deletes ALL data (contacts + touchpoints)

The panel also shows:
- Total number of contacts
- Count of test vs. real contacts
- Number of touchpoints
- Whether test data is seeded

**Using the Programmatic API:**

In browser console, you can import and use the seeding functions:

```javascript
// Import the seeding module
import { seedTestData, clearTestData, reloadTestData, getDevDataStats } from './data/seedTestData';

// Seed test data
seedTestData();

// Clear only test data
clearTestData();

// Clear and re-seed
reloadTestData();

// Get statistics
const stats = getDevDataStats();
console.log(stats);
// Output: { totalContacts: 6, testContacts: 6, realContacts: 0, touchpoints: 0, isSeeded: true }
```

---

### UI Resilience & Empty States

All components in Touchpoint gracefully handle empty states:

#### What's Guaranteed

- ✅ Clicking "Add Contact" when you have zero contacts shows the form (no crash)
- ✅ Clearing all test data doesn't break the dashboard (shows "No contacts" message)
- ✅ Search/filter on empty contact list returns empty results (no error)
- ✅ Contact list view displays "No contacts yet" with an "Add Contact" button
- ✅ Dashboard stats correctly show 0 for all metrics when empty
- ✅ Touchpoint history shows "No touchpoints logged yet" when empty

#### Testing Empty States

1. **View with test data**:
   - Dev Tools Panel → Seed Test Data
   - View Dashboard, Contact List, etc.

2. **Clear test data**:
   - Dev Tools Panel → Clear Test Data
   - Verify no crashes occur
   - Check "No contacts" messages appear

3. **Delete all test contacts manually**:
   - Add some contacts via UI
   - Delete them one by one
   - Verify list still displays properly

---

### Development Workflow

#### Typical Day

1. **Start development server**:
   ```bash
   npm start
   ```
   → Dev mode auto-initializes with "Dev Admin" and 6 test contacts

2. **Work on features**:
   - Build new components with test data
   - Test with different user roles (switch via "DEV" button)
   - Add/edit/delete contacts to test functionality

3. **Test empty states**:
   - Use "Clear Test Data" button
   - Verify UI doesn't crash
   - Check "No contacts" messages show properly

4. **Switch user roles**:
   - Test permission-dependent features with different roles
   - Verify what each role can see/do

5. **Reload test data**:
   - When test data gets messy from manual testing
   - Use "Reload Test Data" button to reset

#### Best Practices

- ✅ Always verify UI handles empty data states before marking features as done
- ✅ Test with different user roles (admin, volunteer, workspace manager)
- ✅ Never remove the `__TEST_DATA__` flag from test contacts
- ✅ Use "Reload Test Data" to reset to a clean state
- ✅ Check browser console for any errors when switching modes

---

## Architecture: Zero-Config Development

### The Problem We Solved

**Before:** Developers had to:
- Remember to import from wrapper vs. sheets
- Check `isDevMode()` in multiple places
- Implement localStorage logic in components
- Test both dev and production code paths

**After:** Developers just:
- Import from `devModeWrapper.js`
- Use functions normally
- Everything works automatically
- No special logic needed anywhere

### How It Works

#### For Developers: Nothing Special

```javascript
// Just import normally from the wrapper
import { readSheetData, addContact } from '../utils/devModeWrapper';

// Use it exactly the same whether dev or production
async function loadContacts(accessToken, sheetId) {
  const { data } = await readSheetData(accessToken, sheetId, 'Contacts');
  return data;
}
```

That's it. Done.

#### Behind the Scenes: Automatic Magic

The `devModeWrapper.js` file:

1. **Detects mode** once at import time
2. **Wraps ALL functions** (readSheetData, addContact, etc.)
3. **Routes calls** to localStorage OR Google Sheets
4. **Zero decision-making needed** by the developer

### The Smart Design

Each function in the wrapper follows this pattern:

```javascript
export const functionName = (function() {
  const originalFn = sheetsModule.functionName;

  return async function functionName(...args) {
    if (isDevMode()) {
      // Dev mode: use localStorage
      return /* localStorage operation */;
    }
    // Production: use original function
    return originalFn(...args);
  };
})();
```

**Why this works:**
- ✅ Wrapper is transparent to callers
- ✅ No need to check dev mode in calling code
- ✅ Same function signature, same behavior
- ✅ Can't forget to handle dev mode (wrapper does it)

### Wrapped Functions (Complete List)

All data access functions are wrapped:

| Category | Functions |
|----------|-----------|
| **Read** | `readSheetMetadata`, `readSheetData`, `getContactTouchpoints` |
| **Write** | `addContact`, `updateContact`, `appendRow`, `addTouchpoint` |
| **Generate** | `generateContactID`, `generateTouchpointID` |
| **Search** | `detectDuplicates` |

### Why This Approach?

**Benefits:**
1. **Prevents duplication** - Dev mode logic in one place (wrapper)
2. **Scales** - Add 10 new functions, all automatically work
3. **Testable** - Can test wrapper + sheets independently
4. **Maintainable** - Future developers don't need to know about dev mode
5. **Safe** - Can't accidentally call Google Sheets in dev mode

**Why NOT Other Approaches?**

| Approach | Problems |
|----------|----------|
| Dev mode checks in components | Scattered logic, hard to maintain, easy to miss |
| Separate dev/prod codebase | Duplicate code, nightmare to maintain |
| Runtime parameter switching | Cognitive load on every function call |
| **Our approach (wrapper)** | ✅ Single source of truth, transparent, maintainable |

---

## Important Files

### Core Dev Mode Files

| File | Purpose |
|------|---------|
| [src/auth/mockAuth.js](../src/auth/mockAuth.js) | Mock user profiles and auth bypass |
| [src/data/testContacts.js](../src/data/testContacts.js) | 6 pre-made test contacts |
| [src/data/seedTestData.js](../src/data/seedTestData.js) | Seeding, clearing, reloading logic |
| [src/hooks/useTestDataManager.js](../src/hooks/useTestDataManager.js) | React hook for test data management |
| [src/components/DevModeRoleSwitcher.js](../src/components/DevModeRoleSwitcher.js) | Role switcher dropdown |
| [src/components/DevToolsPanel.js](../src/components/DevToolsPanel.js) | Floating dev tools panel |
| [src/utils/devModeWrapper.js](../src/utils/devModeWrapper.js) | **KEY FILE** - Data layer abstraction |

### Modified Files

- [src/contexts/AuthContext.js](../src/contexts/AuthContext.js) - Added dev mode checks
- [src/App.js](../src/App.js) - Seeds test data and skips setup wizard
- [src/components/Navbar.js](../src/components/Navbar.js) - Added role switcher display

---

## Troubleshooting

### Test data not showing

1. **Check dev mode is enabled**:
   ```bash
   cat .env | grep VITE_DEV_MODE
   ```
   Should output: `VITE_DEV_MODE=true`

2. **Check localStorage**:
   - Open browser DevTools → Application → Local Storage
   - Look for key: `dev_test_data_seeded`
   - Should be `true`

3. **Manually seed via Dev Tools Panel**:
   - Click "Dev Tools" in bottom-left
   - Click "Seed Test Data" button

4. **Check browser console** for errors (F12)

### "No contacts yet" showing when you expect data

1. **Clear All and Reseed**:
   - Dev Tools Panel → Clear All Data
   - Dev Tools Panel → Seed Test Data

2. **Check localStorage isn't corrupted**:
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

### Role switcher not showing

- Verify `VITE_DEV_MODE=true` is set
- Restart dev server after changing `.env`
- Check browser console for errors
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Dev Tools panel not showing

- Same as role switcher - verify dev mode is enabled
- Panel minimizes to small button; look bottom-left corner
- Click the button to expand

---

## AI Agent Checklist

When making changes to authentication, data structure, or contact handling:

- [ ] Read this guide before making major edits
- [ ] After changes, verify test data still loads correctly
- [ ] After changes, verify UI handles empty states (no crashes)
- [ ] After changes, verify mock auth still works
- [ ] If auth/data structure changes, update this guide
- [ ] Test with multiple user roles (switch via DEV button)
- [ ] Ensure `__TEST_DATA__` flag is never removed from test contacts
- [ ] Verify test data persists across page reloads

---

## Additional Resources

- **Main README**: [README.md](../README.md)
- **Setup Guide**: [SETUP_GUIDE.md](../SETUP_GUIDE.md)
- **Configuration**: [CONFIG.md](../CONFIG.md)
- **For Claude Agents**: [DEV_MODE_FOR_AGENTS.md](DEV_MODE_FOR_AGENTS.md)

---

## Summary

Development mode enables rapid UI development by:

1. **Bypassing authentication** - No login required, auto-logged in as mock user
2. **Providing test data** - 6 realistic contacts ready to use
3. **Storing locally** - No Google Sheets API calls needed
4. **Easy role switching** - Test different permission levels
5. **Graceful empty states** - UI handles zero contacts without crashing
6. **Zero-config wrapper pattern** - Import from `devModeWrapper.js` and everything just works

**To get started:** Set `VITE_DEV_MODE=true` and restart the dev server.
