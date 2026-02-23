# Naming Conventions

This document outlines the naming conventions used throughout the Folkbase codebase.

## JavaScript Code

### Variables and Functions
- **Format:** `camelCase`
- **Examples:** `getUserData`, `contactList`, `handleSubmit`
- **Status:** ✅ Consistently followed throughout codebase

### Constants
- **Format:** `UPPER_SNAKE_CASE`
- **Examples:** `STORAGE_KEY_CONTACTS`, `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`
- **Status:** ✅ Consistently followed throughout codebase

### React Components
- **Format:** `PascalCase`
- **Examples:** `ContactProfile`, `QuickActionBar`, `WorkspaceSwitcher`
- **Status:** ✅ Consistently followed throughout codebase

### Test Files
- **Format:** `*.test.js`
- **Location:** Either alongside component or in `__tests__` directory
- **Examples:**
  - `ImportPage.test.js`
  - `duplicateDetector.test.js`
  - `__tests__/Timer.test.js`
- **Status:** ✅ Consistently followed throughout codebase

## LocalStorage Keys

### Current State
The codebase currently uses **mixed naming patterns** for localStorage keys:

#### Dev/Test Data Keys (using `dev_` prefix)
- `dev_contacts`
- `dev_touchpoints`
- `dev_workspaces`
- `dev_sync_hashes`
- `dev_test_data_seeded`

#### Configuration Keys (using camelCase)
- `personalSheetId`
- `googleSheetId`
- `activeWorkspaceId`
- `googleAccessToken`
- `googleAccessTokenExpiresAt`

#### UI State Keys (using kebab-case)
- `dashboard-last-selected-section`

#### Legacy/Inconsistent Keys
- `test_workspaces` (uses underscore but no prefix)
- `contacts` (no prefix, direct name)

### Recommended Standardization

To improve consistency and avoid collisions with other applications, consider standardizing to:

**Format:** `touchpoint_<category>_<name>` in snake_case

**Categories:**
- `config` - Configuration values (sheet IDs, settings)
- `auth` - Authentication tokens and state
- `ui` - UI state (theme, expanded sections, etc.)
- `dev` - Development/test data

**Examples:**
```javascript
// Configuration
touchpoint_config_personal_sheet_id
touchpoint_config_google_sheet_id
touchpoint_config_active_workspace_id

// Authentication
touchpoint_auth_access_token
touchpoint_auth_token_expires_at

// UI State
touchpoint_ui_theme_palette
touchpoint_ui_theme_brightness
touchpoint_ui_dashboard_section

// Development/Test Data
touchpoint_dev_contacts
touchpoint_dev_workspaces
touchpoint_dev_test_data_seeded
```

### Migration Notes

⚠️ **Breaking Change Warning:** Changing localStorage keys would require a migration strategy to preserve existing user data. Consider:

1. **Migration function** that runs on app startup
2. **Reads old keys** and copies to new keys
3. **Removes old keys** after successful migration
4. **Version flag** to track migration status

Example migration:
```javascript
const MIGRATION_VERSION = 'v1';
const MIGRATION_KEY = 'touchpoint_migration_version';

function migrateLocalStorage() {
  const currentVersion = localStorage.getItem(MIGRATION_KEY);

  if (currentVersion === MIGRATION_VERSION) {
    return; // Already migrated
  }

  // Migrate config keys
  const oldSheetId = localStorage.getItem('personalSheetId');
  if (oldSheetId) {
    localStorage.setItem('touchpoint_config_personal_sheet_id', oldSheetId);
    localStorage.removeItem('personalSheetId');
  }

  // ... migrate other keys

  localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
}
```

## File and Directory Names

### Components
- **Format:** `PascalCase.js`
- **Examples:** `ContactProfile.js`, `WorkspaceSwitcher.js`
- **Status:** ✅ Consistently followed

### Utilities and Services
- **Format:** `camelCase.js`
- **Examples:** `sheets.js`, `duplicateDetector.js`, `syncHashService.js`
- **Status:** ✅ Consistently followed

### Test Fixtures and Mocks
- **Format:** `camelCase.js` with descriptive suffix
- **Examples:**
  - `testContacts.js`
  - `seedTestData.js`
  - `mockAuth.js`
- **Status:** ✅ Consistently followed

### Directories
- **Format:** `camelCase` or `kebab-case`
- **Examples:**
  - `src/components/`
  - `src/utils/`
  - `src/__tests__/`
- **Status:** ✅ Consistently followed

## Summary

**Current Status:**
- ✅ JavaScript code naming is consistent and follows best practices
- ✅ Test file naming is standardized
- ⚠️ LocalStorage keys use mixed patterns and should be standardized

**Action Items:**
1. Consider implementing localStorage key standardization with migration
2. Document the chosen pattern in this file once decided
3. Create migration script if standardization is approved
