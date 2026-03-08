# Google Sheets Scalability Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Google Sheets API calls per user action by 5-15x through UUID-based IDs, batch writes, optimistic caching, parallel junction operations, and a retry queue for failed writes.

**Architecture:** Replace sequential read-to-generate-ID + individual append patterns with client-side UUID generation, batched multi-range writes via the Sheets `values:batchUpdate` endpoint, and IndexedDB cache patching after writes. Failed junction writes are queued in localStorage and retried automatically (up to 3 attempts) with toast notifications.

**Tech Stack:** React 19, Google Sheets API v4, IndexedDB (via `idb` library), Vitest

---

## Important Context

### Project Conventions
- **JavaScript only** (no TypeScript). JSX is in `.js` files.
- **Always import data functions from `src/utils/devModeWrapper.js`**, never from `src/utils/sheets.js` directly. The wrapper transparently routes to localStorage (dev) or Sheets API (production).
- **Test framework:** Vitest with `@testing-library/react`. Test globals (`describe`, `it`, `expect`, `vi`) are available without imports.
- **Code style:** single quotes, trailing commas (es5), 100 char width, 2-space indent, semicolons.
- **Constants:** Always use `SHEET_NAMES` from `src/config/constants.js` for sheet tab names.
- **Notifications:** Use `useNotification()` hook from `src/contexts/NotificationContext.js`. Methods: `notify.success()`, `notify.error()`, `notify.warning()`, `notify.info()`, `notify.urgent()`.
- **Do not add "Co-Authored-By: Claude"** or any AI attribution to commit messages.

### Google Sheets API Reference
- `POST /{sheetId}/values/{range}:append` — append rows (current `appendRow`)
- `PUT /{sheetId}/values/{range}` — update a single range (current `updateRow`)
- `POST /{sheetId}/values:batchUpdate` — update multiple ranges in one call (for batch writes)
- `POST /{sheetId}/values:batchGet` — read multiple ranges in one call (not currently used)
- **Rate limits:** 60 requests/min per user, 300 requests/min per project

### Files You'll Be Working With
| File | Role |
|------|------|
| `src/utils/idGenerator.js` | **NEW** — Pure synchronous ID generation |
| `src/utils/retryQueue.js` | **NEW** — Failed write retry queue |
| `src/utils/sheets.js` | Core Google Sheets API layer (~1950 lines) |
| `src/utils/devModeWrapper.js` | Dev/prod mode router (~4800 lines) |
| `src/utils/indexedDbCache.js` | IndexedDB caching layer (263 lines) |
| `src/config/constants.js` | Sheet names, ID formats, cache config |
| `src/services/contactRelationshipService.js` | Has its own `generateRelationshipID` |
| `src/services/locationService.js` | Has its own `generateLocationID` |
| `src/services/locationVisitService.js` | Has its own `generateVisitID` |
| `src/services/workspaceHierarchyServiceSheets.js` | Has `generateMemberID`, `generateInvitationID`, `generateWorkspaceID` |
| `src/components/events/ImportEventModal.js` | Calls `generateEventID` and `generateTouchpointID` directly |
| `src/services/importExecutor.js` | Calls `generateContactID` directly |

---

## Task 1: Create `src/utils/idGenerator.js` — UUID-Based ID Generation

**Files:**
- Create: `src/utils/idGenerator.js`
- Create: `src/utils/__tests__/idGenerator.test.js`

This is a pure, synchronous utility with zero API calls. It replaces all the async `generateXxxID` functions that currently read the entire table to find `max(id) + 1`.

**Step 1: Write the test file**

Create `src/utils/__tests__/idGenerator.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generateId, ID_PREFIXES } from '../idGenerator';

describe('generateId', () => {
  it('returns a string with the correct prefix', () => {
    const id = generateId('CON');
    expect(id).toMatch(/^CON-[0-9a-f]{8}$/);
  });

  it('generates unique IDs on repeated calls', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId('CON'));
    }
    expect(ids.size).toBe(1000);
  });

  it('works with all defined prefixes', () => {
    for (const [key, prefix] of Object.entries(ID_PREFIXES)) {
      const id = generateId(prefix);
      expect(id.startsWith(`${prefix}-`)).toBe(true);
      expect(id).toMatch(new RegExp(`^${prefix}-[0-9a-f]{8}$`));
    }
  });

  it('throws on empty prefix', () => {
    expect(() => generateId('')).toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/utils/__tests__/idGenerator.test.js`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/utils/idGenerator.js`:

```javascript
/**
 * UUID-Based ID Generator
 *
 * Generates globally unique IDs without any API calls.
 * Format: PREFIX-xxxxxxxx (prefix + 8 random hex chars)
 *
 * Old sequential IDs (C001, T001, etc.) remain valid throughout the app.
 * All ID comparisons use exact string matching, so both formats coexist.
 */

export const ID_PREFIXES = {
  CONTACT: 'CON',
  TOUCHPOINT: 'TP',
  EVENT: 'EVT',
  NOTE: 'NOTE',
  TASK: 'TSK',
  LIST: 'LST',
  ORGANIZATION: 'ORG',
  LOCATION: 'LOC',
  VISIT: 'VIS',
  WORKSPACE: 'WS',
  MEMBER: 'MEM',
  LINK: 'LNK',
  CONFLICT: 'CONF',
  ACTIVITY: 'ACT',
  INVITATION: 'INV',
  RELATIONSHIP: 'REL',
  ENTITY_REL: 'ERE',
};

/**
 * Generate a globally unique ID with the given prefix.
 * Format: PREFIX-xxxxxxxx (8 random hex characters)
 *
 * @param {string} prefix - The entity prefix (e.g., 'CON', 'TP', 'EVT')
 * @returns {string} A unique ID like 'CON-a7f3b2c1'
 */
export function generateId(prefix) {
  if (!prefix) {
    throw new Error('ID prefix is required');
  }
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}-${hex}`;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/utils/__tests__/idGenerator.test.js`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add src/utils/idGenerator.js src/utils/__tests__/idGenerator.test.js
git commit -m "feat: add UUID-based ID generator utility"
```

---

## Task 2: Replace All ID Generation in `src/utils/sheets.js`

**Files:**
- Modify: `src/utils/sheets.js`

Replace the async ID generators with the new synchronous `generateId`. The old functions become thin wrappers so callers don't break.

**Step 1: Update the imports at the top of `src/utils/sheets.js`**

At the top of the file (around line 18-28), add this import:

```javascript
import { generateId, ID_PREFIXES } from './idGenerator';
```

**Step 2: Replace `generateContactID` (lines 288-302)**

Replace the function body. Keep the export signature so callers don't break:

```javascript
export async function generateContactID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.CONTACT);
}
```

**Step 3: Replace `generateTouchpointID` (lines 307-320)**

```javascript
export async function generateTouchpointID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.TOUCHPOINT);
}
```

**Step 4: Replace `generateEventID` (find it around lines 679-692)**

```javascript
export async function generateEventID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.EVENT);
}
```

**Step 5: Replace `generateNoteID` (lines 1097-1109)**

```javascript
export async function generateNoteID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.NOTE);
}
```

**Step 6: Replace `generateListID` (lines 1758-1770)**

```javascript
export async function generateListID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.LIST);
}
```

**Step 7: Run full test suite**

Run: `npm test -- --run`
Expected: All existing tests pass. The generate functions still return strings, just different format.

**Step 8: Commit**

```bash
git add src/utils/sheets.js
git commit -m "feat: replace sheets.js ID generators with UUID-based generation"
```

---

## Task 3: Replace All ID Generation in `src/utils/devModeWrapper.js`

**Files:**
- Modify: `src/utils/devModeWrapper.js`

The dev mode wrapper has its own copy of each ID generator for localStorage mode. Replace them all.

**Step 1: Add import at the top of devModeWrapper.js**

Find the imports section (top of file) and add:

```javascript
import { generateId, ID_PREFIXES } from './idGenerator';
```

**Step 2: Replace `generateContactID` (lines 255-274)**

Replace the entire IIFE with:

```javascript
export async function generateContactID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.CONTACT);
}
```

**Step 3: Replace `generateTouchpointID` (lines 280-299)**

```javascript
export async function generateTouchpointID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.TOUCHPOINT);
}
```

**Step 4: Replace `generateEventID` (lines 1010-1029)**

```javascript
export async function generateEventID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.EVENT);
}
```

**Step 5: Replace `generateNoteID` (lines 1035-1063)**

```javascript
export async function generateNoteID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.NOTE);
}
```

**Step 6: Replace `generateTaskID` (lines 2671-2702)**

```javascript
export async function generateTaskID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.TASK);
}
```

**Step 7: Replace `generateWorkspaceID` (lines 2977-2993)**

```javascript
export async function generateWorkspaceID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.WORKSPACE);
}
```

**Step 8: Replace `generateLocationID` (lines 534-550)**

```javascript
export const generateLocationID = async function generateLocationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.LOCATION);
};
```

**Step 9: Replace `generateMemberID` (lines 3000-3016)**

```javascript
export async function generateMemberID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.MEMBER);
}
```

**Step 10: Replace `generateInvitationID` (lines 3023-3039)**

```javascript
export async function generateInvitationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.INVITATION);
}
```

**Step 11: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass. Some existing tests check for specific ID formats like `C001` — if any fail, update the test assertions to accept the new `CON-xxxxxxxx` format using regex matchers like `expect(id).toMatch(/^CON-[0-9a-f]{8}$/)`.

**Step 12: Commit**

```bash
git add src/utils/devModeWrapper.js
git commit -m "feat: replace devModeWrapper ID generators with UUID-based generation"
```

---

## Task 4: Replace ID Generation in Service Files

**Files:**
- Modify: `src/services/contactRelationshipService.js`
- Modify: `src/services/locationService.js`
- Modify: `src/services/locationVisitService.js`
- Modify: `src/services/workspaceHierarchyServiceSheets.js`
- Modify: `src/components/events/ImportEventModal.js`
- Modify: `src/services/importExecutor.js`

These files have their own ID generation functions or call the generators directly.

**Step 1: Update `contactRelationshipService.js`**

At line 100, replace `generateRelationshipID`:

```javascript
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

// Replace the entire generateRelationshipID function (around line 100-130) with:
async function generateRelationshipID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.RELATIONSHIP);
}
```

Remove the `readSheetData` and `SHEET_NAMES` imports if they were only used for ID generation (check first — they're likely used elsewhere in the file too).

**Step 2: Update `locationService.js`**

At line 20, replace `generateLocationID`:

```javascript
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

// Replace the generateLocationID function (lines 20-35) with:
export async function generateLocationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.LOCATION);
}
```

**Step 3: Update `locationVisitService.js`**

At line 20, replace `generateVisitID`:

```javascript
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

// Replace the generateVisitID function (lines 20-40) with:
export async function generateVisitID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.VISIT);
}
```

**Step 4: Update `workspaceHierarchyServiceSheets.js`**

Replace `generateMemberID` (line 50) and `generateInvitationID` (line 621):

```javascript
import { generateId, ID_PREFIXES } from '../utils/idGenerator';

// Replace generateMemberID (around line 50):
export async function generateMemberID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.MEMBER);
}

// Replace generateInvitationID (around line 621):
export async function generateInvitationID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.INVITATION);
}
```

Note: `generateWorkspaceID` is also in this file — replace it too:

```javascript
export async function generateWorkspaceID(_accessToken, _sheetId) {
  return generateId(ID_PREFIXES.WORKSPACE);
}
```

**Step 5: Update `ImportEventModal.js`**

This component imports `generateEventID` and `generateTouchpointID` — these should already come from `devModeWrapper.js`. Verify the import path:

```javascript
// Should already be:
import { generateEventID, generateTouchpointID } from '../../utils/devModeWrapper';
// If it imports from sheets.js, change it to devModeWrapper
```

**Step 6: Update `importExecutor.js`**

This service imports `generateContactID` — verify it uses the wrapper:

```javascript
// Should already be:
import { generateContactID } from '../utils/devModeWrapper';
// If it imports from sheets.js, change it to devModeWrapper
```

**Step 7: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/services/ src/components/events/ImportEventModal.js
git commit -m "feat: replace service-level ID generators with UUID-based generation"
```

---

## Task 5: Update ID Format Documentation in `src/config/constants.js`

**Files:**
- Modify: `src/config/constants.js` (lines 60-82)

**Step 1: Update the ID FORMATS comment block**

Replace lines 60-80 with:

```javascript
 * ============================================================================
 * ID FORMATS
 * ============================================================================
 * New IDs use UUID format: PREFIX-xxxxxxxx (8 random hex chars)
 * Old sequential IDs (C001, ORG001, etc.) remain valid and coexist.
 *
 * Prefixes:
 * - Contact:        CON-xxxxxxxx   (legacy: C001)
 * - Organization:   ORG-xxxxxxxx   (legacy: ORG001)
 * - Location:       LOC-xxxxxxxx   (legacy: LOC001)
 * - Visit:          VIS-xxxxxxxx   (legacy: VIS001)
 * - Touchpoint:     TP-xxxxxxxx    (legacy: T001)
 * - Event:          EVT-xxxxxxxx   (legacy: EVT001)
 * - Task:           TSK-xxxxxxxx   (legacy: TSK001)
 * - Note:           NOTE-xxxxxxxx  (legacy: N001)
 * - List:           LST-xxxxxxxx   (legacy: LST001)
 * - Workspace:      WS-xxxxxxxx    (legacy: WS001)
 * - Member:         MEM-xxxxxxxx   (legacy: MEM001)
 * - Link:           LNK-xxxxxxxx   (legacy: LNK001)
 * - Conflict:       CONF-xxxxxxxx  (legacy: CONF001)
 * - Activity:       ACT-xxxxxxxx   (legacy: ACT001)
 * - Invitation:     INV-xxxxxxxx   (legacy: INV001)
 * - Relationship:   REL-xxxxxxxx   (legacy: REL001)
 * - Entity Rel:     ERE-xxxxxxxx   (legacy: ERE001)
 *
```

**Step 2: Commit**

```bash
git add src/config/constants.js
git commit -m "docs: update ID format documentation for UUID-based IDs"
```

---

## Task 6: Add `batchAppendRows` to `src/utils/sheets.js`

**Files:**
- Modify: `src/utils/sheets.js`
- Create: `src/utils/__tests__/batchAppendRows.test.js`

**Step 1: Write the test**

Create `src/utils/__tests__/batchAppendRows.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
const mockPost = vi.fn().mockResolvedValue({ data: { totalUpdatedRows: 3 } });
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: mockPost,
    }),
  },
}));

// Mock dependencies
vi.mock('../../services/apiUsageStats', () => ({
  canMakeRequest: vi.fn(() => ({ allowed: true })),
}));
vi.mock('../apiUsageLogger', () => ({
  logApiCall: vi.fn(),
}));
vi.mock('../logger', () => ({
  warn: vi.fn(),
  log: vi.fn(),
}));

import { batchAppendRows } from '../sheets';

describe('batchAppendRows', () => {
  beforeEach(() => {
    mockPost.mockClear();
  });

  it('sends a single batchUpdate request for multiple sheets', async () => {
    const rowsBySheet = {
      'Contact Notes': [['N1', 'C1', '2026-01-01']],
      'Event Notes': [
        ['N1', 'E1', '2026-01-01'],
        ['N2', 'E2', '2026-01-01'],
      ],
    };

    await batchAppendRows('token', 'sheet123', rowsBySheet);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, options] = mockPost.mock.calls[0];
    expect(url).toContain('batchUpdate');
    expect(body.data.length).toBe(2);
    expect(body.data[0].range).toBe('Contact Notes');
    expect(body.data[0].values).toEqual([['N1', 'C1', '2026-01-01']]);
    expect(body.data[1].range).toBe('Event Notes');
    expect(body.data[1].values).toEqual([
      ['N1', 'E1', '2026-01-01'],
      ['N2', 'E2', '2026-01-01'],
    ]);
  });

  it('returns without calling API when rowsBySheet is empty', async () => {
    await batchAppendRows('token', 'sheet123', {});
    expect(mockPost).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/batchAppendRows.test.js`
Expected: FAIL — `batchAppendRows` not exported

**Step 3: Add `batchAppendRows` to `src/utils/sheets.js`**

Add this function right after the existing `appendRow` function (after line 341):

```javascript
/**
 * Append multiple rows to multiple sheets in a single API call.
 * Uses the values:batchUpdate endpoint to minimize request count.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} rowsBySheet - Map of sheet name to array of row value arrays
 *   e.g. { 'Contact Notes': [['N1', 'C1', '2026-01-01']], 'Event Notes': [...] }
 * @returns {Promise<Object>} API response data
 */
export async function batchAppendRows(accessToken, sheetId, rowsBySheet) {
  const entries = Object.entries(rowsBySheet);
  if (entries.length === 0) return { totalUpdatedRows: 0 };

  const client = createSheetsClient(accessToken);

  const data = entries.map(([sheetName, rows]) => ({
    range: sheetName,
    values: rows,
  }));

  const response = await client.post(
    `/${sheetId}/values:batchUpdate`,
    {
      valueInputOption: 'RAW',
      data,
    }
  );

  return response.data;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/utils/__tests__/batchAppendRows.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/sheets.js src/utils/__tests__/batchAppendRows.test.js
git commit -m "feat: add batchAppendRows for multi-sheet writes in single API call"
```

---

## Task 7: Add Optimistic Cache Update Functions to `src/utils/indexedDbCache.js`

**Files:**
- Modify: `src/utils/indexedDbCache.js`
- Create: `src/utils/__tests__/indexedDbCache.optimistic.test.js`

**Step 1: Write the tests**

Create `src/utils/__tests__/indexedDbCache.optimistic.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb
const mockStore = {};
const mockDb = {
  get: vi.fn((store, key) => mockStore[`${store}:${key}`] || null),
  put: vi.fn((store, value, key) => {
    mockStore[`${store}:${key}`] = value;
  }),
  delete: vi.fn((store, key) => {
    delete mockStore[`${store}:${key}`];
  }),
};

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('../../config/constants', () => ({
  SHEET_NAMES: { CONTACTS: 'Contacts', NOTES: 'Notes' },
  CACHE_CONFIG: { ENABLED: true, DEFAULT_TTL: 300, HIGH_CHURN_TTL: 120, LOW_CHURN_TTL: 1800 },
}));

vi.mock('../../services/cacheMonitoringService', () => ({
  default: { recordCacheHit: vi.fn(), recordCacheMiss: vi.fn() },
}));

import { appendToCachedData, updateCachedRow, deleteCachedRow } from '../indexedDbCache';

describe('optimistic cache updates', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  describe('appendToCachedData', () => {
    it('appends a row to existing cached data', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [{ 'Contact ID': 'CON-aaa', Name: 'Alice' }],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await appendToCachedData('Contacts', { 'Contact ID': 'CON-bbb', Name: 'Bob' });

      const cached = mockStore['Contacts:data'];
      expect(cached.data.length).toBe(2);
      expect(cached.data[1].Name).toBe('Bob');
    });

    it('does nothing if cache is empty', async () => {
      await appendToCachedData('Contacts', { 'Contact ID': 'CON-bbb', Name: 'Bob' });
      expect(mockStore['Contacts:data']).toBeUndefined();
    });
  });

  describe('updateCachedRow', () => {
    it('updates a matching row in cache', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [{ 'Contact ID': 'CON-aaa', Name: 'Alice' }],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await updateCachedRow('Contacts', 'Contact ID', 'CON-aaa', { Name: 'Alicia' });

      expect(mockStore['Contacts:data'].data[0].Name).toBe('Alicia');
    });
  });

  describe('deleteCachedRow', () => {
    it('removes a matching row from cache', async () => {
      mockStore['Contacts:data'] = {
        headers: [{ name: 'Contact ID' }, { name: 'Name' }],
        data: [
          { 'Contact ID': 'CON-aaa', Name: 'Alice' },
          { 'Contact ID': 'CON-bbb', Name: 'Bob' },
        ],
      };
      mockStore['_syncMeta:Contacts'] = { timestamp: Date.now() };

      await deleteCachedRow('Contacts', 'Contact ID', 'CON-aaa');

      const cached = mockStore['Contacts:data'];
      expect(cached.data.length).toBe(1);
      expect(cached.data[0].Name).toBe('Bob');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/indexedDbCache.optimistic.test.js`
Expected: FAIL — functions not exported

**Step 3: Add optimistic update functions to `src/utils/indexedDbCache.js`**

Add these functions at the end of the file (after the `invalidateAllCaches` function, before the closing of the module):

```javascript
/**
 * Append a new row to cached data for a sheet (optimistic update).
 * If no cache exists for the sheet, does nothing (next read will fetch fresh).
 *
 * @param {string} sheetName - Sheet name
 * @param {Object} newRow - Row object with field names as keys
 * @returns {Promise<void>}
 */
export async function appendToCachedData(sheetName, newRow) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    data.data.push(newRow);
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to append to cache:', error);
  }
}

/**
 * Update a row in cached data by matching an ID field (optimistic update).
 * If no cache exists or no matching row found, does nothing.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} idField - The field name to match on (e.g., 'Contact ID')
 * @param {string} idValue - The ID value to find
 * @param {Object} updatedFields - Fields to merge into the existing row
 * @returns {Promise<void>}
 */
export async function updateCachedRow(sheetName, idField, idValue, updatedFields) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    const rowIndex = data.data.findIndex((row) => row[idField] === idValue);
    if (rowIndex === -1) return;

    data.data[rowIndex] = { ...data.data[rowIndex], ...updatedFields };
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to update cached row:', error);
  }
}

/**
 * Delete a row from cached data by matching an ID field (optimistic update).
 * If no cache exists or no matching row found, does nothing.
 *
 * @param {string} sheetName - Sheet name
 * @param {string} idField - The field name to match on (e.g., 'Contact ID')
 * @param {string} idValue - The ID value to find
 * @returns {Promise<void>}
 */
export async function deleteCachedRow(sheetName, idField, idValue) {
  if (!CACHE_CONFIG.ENABLED) return;

  try {
    const db = await initializeCache();
    if (!db) return;

    const data = await db.get(sheetName, 'data');
    if (!data) return;

    data.data = data.data.filter((row) => row[idField] !== idValue);
    await db.put(sheetName, data, 'data');
    await db.put('_syncMeta', { timestamp: Date.now() }, sheetName);
  } catch (error) {
    console.warn('[IndexedDB] Failed to delete cached row:', error);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/utils/__tests__/indexedDbCache.optimistic.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/indexedDbCache.js src/utils/__tests__/indexedDbCache.optimistic.test.js
git commit -m "feat: add optimistic cache update functions to IndexedDB cache"
```

---

## Task 8: Wire Optimistic Cache Updates Into `devModeWrapper.js` Production Paths

**Files:**
- Modify: `src/utils/devModeWrapper.js`

Currently, production-mode write operations in `devModeWrapper.js` call `invalidateCache(sheetName)` after writes (e.g., line 807). Replace `invalidateCache` calls with optimistic updates using the new functions.

**Step 1: Add imports at top of devModeWrapper.js**

Find the existing imports from `indexedDbCache.js` and add the new functions:

```javascript
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  appendToCachedData,
  updateCachedRow,
  deleteCachedRow,
} from './indexedDbCache';
```

**Step 2: Update `addContact` production path**

Find the `addContact` wrapper's production path (around line 325). After the `originalFn` call returns `result`, replace `invalidateCache(SHEET_NAMES.CONTACTS)` with:

```javascript
await appendToCachedData(SHEET_NAMES.CONTACTS, { 'Contact ID': result.contactId, ...result });
```

**Step 3: Update `updateContact` production path**

Find the production path. Replace `invalidateCache(SHEET_NAMES.CONTACTS)` with:

```javascript
await updateCachedRow(SHEET_NAMES.CONTACTS, 'Contact ID', result.contactId, result);
```

**Step 4: Update `addTouchpoint` production path (around line 804)**

Replace `invalidateCache(SHEET_NAMES.TOUCHPOINTS)` with:

```javascript
await appendToCachedData(SHEET_NAMES.TOUCHPOINTS, { 'Touchpoint ID': result.touchpointId, ...result });
```

Keep the `invalidateCache(SHEET_NAMES.CONTACTS)` call for Last Contact Date updates — this cross-entity effect is hard to patch locally.

**Step 5: Apply the same pattern to other write wrappers**

For each entity wrapper in devModeWrapper.js that currently calls `invalidateCache` after a write:

- `addEvent` → `appendToCachedData(SHEET_NAMES.EVENTS, ...)`
- `updateEvent` → `updateCachedRow(SHEET_NAMES.EVENTS, 'Event ID', ...)`
- `addNote` / `addNoteWithLink` → `appendToCachedData(SHEET_NAMES.NOTES, ...)`
- `updateNote` → `updateCachedRow(SHEET_NAMES.NOTES, 'Note ID', ...)`
- `deleteNote` → `deleteCachedRow(SHEET_NAMES.NOTES, 'Note ID', ...)`
- `addList` → `appendToCachedData(SHEET_NAMES.LISTS, ...)`
- `updateList` → `updateCachedRow(SHEET_NAMES.LISTS, 'List ID', ...)`
- `deleteList` → `deleteCachedRow(SHEET_NAMES.LISTS, 'List ID', ...)`
- `updateTouchpoint` → `updateCachedRow(SHEET_NAMES.TOUCHPOINTS, 'Touchpoint ID', ...)`

For junction table writes (link/unlink functions), apply the same pattern using the junction sheet name.

**Step 6: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/utils/devModeWrapper.js
git commit -m "feat: wire optimistic cache updates into production write paths"
```

---

## Task 9: Batch Audit Log Entries in `src/utils/sheets.js`

**Files:**
- Modify: `src/utils/sheets.js`

The `updateContact` function (lines 502-541) logs each changed field individually with sequential `await logAuditEntry()` calls. Batch these into one `batchAppendRows` call.

**Step 1: Add a `batchLogAuditEntries` function**

Add this near `logAuditEntry` (after line 402):

```javascript
/**
 * Log multiple audit entries in a single batch API call.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Array<Object>} entries - Array of audit entry objects
 * @returns {Promise<Object>} Batch response
 */
export async function batchLogAuditEntries(accessToken, sheetId, entries) {
  if (entries.length === 0) return { totalUpdatedRows: 0 };

  const rows = entries.map((entry) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    return [
      timestamp,
      entry.contactId,
      entry.contactName,
      entry.fieldChanged,
      entry.oldValue || '',
      entry.newValue || '',
      entry.userEmail,
    ];
  });

  return batchAppendRows(accessToken, sheetId, {
    [SHEETS.AUDIT_LOG]: rows,
  });
}
```

**Step 2: Update `updateContact` to use batch audit logging**

In `updateContact` (lines 502-541), replace the sequential audit logging loop (lines 524-537):

```javascript
// OLD (lines 524-537):
// try {
//   for (const fieldName of Object.keys(newData)) {
//     if (newData[fieldName] !== oldData[fieldName]) {
//       await logAuditEntry(accessToken, sheetId, { ... });
//     }
//   }
// } catch (auditErr) { ... }

// NEW:
try {
  const auditEntries = [];
  for (const fieldName of Object.keys(newData)) {
    if (newData[fieldName] !== oldData[fieldName]) {
      auditEntries.push({
        contactId,
        contactName: newData['Name'] || oldData['Name'] || '',
        fieldChanged: fieldName,
        oldValue: oldData[fieldName] || '',
        newValue: newData[fieldName] || '[DELETED]',
        userEmail,
      });
    }
  }
  if (auditEntries.length > 0) {
    await batchLogAuditEntries(accessToken, sheetId, auditEntries);
  }
} catch (auditErr) {
  console.error('Audit log failed for updateContact:', auditErr);
}
```

**Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/utils/sheets.js
git commit -m "feat: batch audit log entries for updateContact"
```

---

## Task 10: Parallelize `batchLinkNoteToEntities` in `src/utils/sheets.js`

**Files:**
- Modify: `src/utils/sheets.js`

The current `batchLinkNoteToEntities` (lines 1502-1553) runs 4 sequential `for` loops. Replace with `Promise.allSettled` for parallel execution.

**Step 1: Replace the function body**

Replace lines 1502-1553 with:

```javascript
export async function batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks) {
  const { contactIds = [], eventIds = [], listIds = [], taskIds = [] } = entityLinks;

  const allPromises = [
    ...contactIds.map((contactId) =>
      linkNoteToContact(accessToken, sheetId, noteId, contactId)
        .then((result) => ({ type: 'contact', id: contactId, ...result }))
        .catch((error) => ({ type: 'contact', id: contactId, success: false, error: error.message }))
    ),
    ...eventIds.map((eventId) =>
      linkNoteToEvent(accessToken, sheetId, noteId, eventId)
        .then((result) => ({ type: 'event', id: eventId, ...result }))
        .catch((error) => ({ type: 'event', id: eventId, success: false, error: error.message }))
    ),
    ...listIds.map((listId) =>
      linkNoteToList(accessToken, sheetId, noteId, listId)
        .then((result) => ({ type: 'list', id: listId, ...result }))
        .catch((error) => ({ type: 'list', id: listId, success: false, error: error.message }))
    ),
    ...taskIds.map((taskId) =>
      linkNoteToTask(accessToken, sheetId, noteId, taskId)
        .then((result) => ({ type: 'task', id: taskId, ...result }))
        .catch((error) => ({ type: 'task', id: taskId, success: false, error: error.message }))
    ),
  ];

  const settled = await Promise.allSettled(allPromises);

  const results = { contacts: [], events: [], lists: [], tasks: [] };
  for (const item of settled) {
    const val = item.status === 'fulfilled' ? item.value : { ...item.reason, success: false };
    const key = `${val.type}s`;
    if (results[key]) results[key].push(val);
  }

  return results;
}
```

**Step 2: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/sheets.js
git commit -m "feat: parallelize batchLinkNoteToEntities with Promise.allSettled"
```

---

## Task 11: Parallelize `copyMultipleContacts` in `src/utils/sheets.js`

**Files:**
- Modify: `src/utils/sheets.js`

The current `copyMultipleContacts` (lines 875-908) runs a sequential `for...of`. Replace with parallel execution.

**Step 1: Replace the function body**

Replace lines 875-908 with:

```javascript
export async function copyMultipleContacts(
  accessToken,
  sourceSheetId,
  contactIds,
  targetSheetId,
  userEmail
) {
  const settled = await Promise.allSettled(
    contactIds.map((contactId) =>
      copyContactToWorkspace(accessToken, sourceSheetId, contactId, targetSheetId, userEmail)
        .then((result) => ({ success: true, contactId, result }))
    )
  );

  return settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { success: false, contactId: 'unknown', error: s.reason?.message || 'Unknown error' }
  );
}
```

**Step 2: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/utils/sheets.js
git commit -m "feat: parallelize copyMultipleContacts with Promise.allSettled"
```

---

## Task 12: Lazy Dupe Checking — Use Cache Before API

**Files:**
- Modify: `src/utils/sheets.js`

Junction link functions (e.g., `linkNoteToContact` at line 918) read the entire junction table to check for duplicates before each append. Instead, check the IndexedDB cache first — only fall back to an API read if cache is missing.

**Step 1: Add import for getCachedData**

At the top of `sheets.js`, add:

```javascript
import { getCachedData, appendToCachedData } from './indexedDbCache';
```

**Step 2: Create a helper function for cached-or-API reads**

Add this helper near the top of the file (after the imports):

```javascript
/**
 * Read sheet data from cache if available, otherwise fall back to API.
 * Used for dupe checking in junction tables where stale data is acceptable.
 */
async function readSheetDataCachedFirst(accessToken, sheetId, sheetName) {
  const cached = await getCachedData(sheetName);
  if (cached) return cached;
  return readSheetData(accessToken, sheetId, sheetName);
}
```

**Step 3: Update `linkNoteToContact` (line 918)**

Replace the `readSheetData` call on line 922 with `readSheetDataCachedFirst`:

```javascript
// OLD (line 922):
const { data: existingMappings } = await readSheetData(accessToken, sheetId, SHEETS.CONTACT_NOTES);

// NEW:
const { data: existingMappings } = await readSheetDataCachedFirst(accessToken, sheetId, SHEETS.CONTACT_NOTES);
```

**Step 4: Apply the same change to all other link functions**

Apply the same `readSheetDataCachedFirst` replacement to the dupe-check reads in:
- `linkNoteToEvent` (around line 1123)
- `linkNoteToList` (around line 1229)
- `linkNoteToTask` (around line 1331)
- `addContactToList` (around line 1900 — if it has a dupe check read)

**Step 5: After each successful link append, update the cache**

After each `appendRow` call in the link functions, add an optimistic cache update. For example, in `linkNoteToContact` after the `appendRow` call (around line 948):

```javascript
await appendRow(accessToken, sheetId, SHEETS.CONTACT_NOTES, values);

// Optimistic cache update
await appendToCachedData(SHEETS.CONTACT_NOTES, newMapping);
```

Apply the same pattern to the other link functions.

**Step 6: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/utils/sheets.js
git commit -m "feat: lazy dupe checking using cache-first reads for junction tables"
```

---

## Task 13: Create `src/utils/retryQueue.js` — Failed Write Retry Queue

**Files:**
- Create: `src/utils/retryQueue.js`
- Create: `src/utils/__tests__/retryQueue.test.js`

**Step 1: Write the tests**

Create `src/utils/__tests__/retryQueue.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueFailedWrite,
  getRetryQueue,
  getFailedItems,
  removeFromQueue,
  incrementAttempt,
  clearRetryQueue,
  MAX_ATTEMPTS,
} from '../retryQueue';

describe('retryQueue', () => {
  beforeEach(() => {
    clearRetryQueue();
  });

  describe('queueFailedWrite', () => {
    it('adds an operation to the queue', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
        payload: { sheetName: 'Contact Notes' },
      });

      const queue = getRetryQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('link-note-contact');
      expect(queue[0].attempts).toBe(0);
      expect(queue[0].sourceId).toBe('NOTE-aaa');
    });
  });

  describe('incrementAttempt', () => {
    it('increments the attempt count', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      incrementAttempt(queue[0].id);

      const updated = getRetryQueue();
      expect(updated[0].attempts).toBe(1);
    });
  });

  describe('getFailedItems', () => {
    it('returns items with attempts >= MAX_ATTEMPTS', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        incrementAttempt(queue[0].id);
      }

      const failed = getFailedItems();
      expect(failed.length).toBe(1);
    });

    it('returns empty if no items have exceeded max attempts', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const failed = getFailedItems();
      expect(failed.length).toBe(0);
    });
  });

  describe('removeFromQueue', () => {
    it('removes an item by id', () => {
      queueFailedWrite({
        type: 'link-note-contact',
        sourceId: 'NOTE-aaa',
        targetId: 'CON-bbb',
      });

      const queue = getRetryQueue();
      removeFromQueue(queue[0].id);

      expect(getRetryQueue().length).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/utils/__tests__/retryQueue.test.js`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/utils/retryQueue.js`:

```javascript
/**
 * Retry Queue for Failed Writes
 *
 * Stores failed junction/link write operations in localStorage.
 * Items are retried automatically on app load and after successful writes.
 * After MAX_ATTEMPTS failures, items surface as persistent notifications.
 *
 * Storage key: folkbase_retry_queue
 */

const STORAGE_KEY = 'folkbase_retry_queue';
export const MAX_ATTEMPTS = 3;

/**
 * Generate a simple unique ID for queue items.
 */
function generateQueueId() {
  return `rq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get the current retry queue from localStorage.
 * @returns {Array<Object>} Queue items
 */
export function getRetryQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save the queue to localStorage.
 * @param {Array<Object>} queue
 */
function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[RetryQueue] Failed to save queue:', error);
  }
}

/**
 * Add a failed write operation to the retry queue.
 * @param {Object} operation
 * @param {string} operation.type - Operation type (e.g., 'link-note-contact')
 * @param {string} operation.sourceId - Source entity ID
 * @param {string} operation.targetId - Target entity ID
 * @param {Object} [operation.payload] - Additional data needed for retry
 */
export function queueFailedWrite(operation) {
  const queue = getRetryQueue();
  queue.push({
    id: generateQueueId(),
    type: operation.type,
    sourceId: operation.sourceId,
    targetId: operation.targetId,
    payload: operation.payload || {},
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
  });
  saveQueue(queue);
}

/**
 * Increment the attempt count for a queue item.
 * @param {string} itemId - Queue item ID
 */
export function incrementAttempt(itemId) {
  const queue = getRetryQueue();
  const item = queue.find((i) => i.id === itemId);
  if (item) {
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    saveQueue(queue);
  }
}

/**
 * Remove an item from the queue (on success or manual dismiss).
 * @param {string} itemId - Queue item ID
 */
export function removeFromQueue(itemId) {
  const queue = getRetryQueue().filter((i) => i.id !== itemId);
  saveQueue(queue);
}

/**
 * Get items that have exceeded MAX_ATTEMPTS.
 * These should be surfaced to the user as persistent notifications.
 * @returns {Array<Object>} Failed items
 */
export function getFailedItems() {
  return getRetryQueue().filter((i) => i.attempts >= MAX_ATTEMPTS);
}

/**
 * Get items that are eligible for retry (attempts < MAX_ATTEMPTS).
 * @returns {Array<Object>} Retryable items
 */
export function getRetryableItems() {
  return getRetryQueue().filter((i) => i.attempts < MAX_ATTEMPTS);
}

/**
 * Clear the entire retry queue.
 */
export function clearRetryQueue() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/utils/__tests__/retryQueue.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/retryQueue.js src/utils/__tests__/retryQueue.test.js
git commit -m "feat: add retry queue for failed write operations"
```

---

## Task 14: Create `src/hooks/useRetryQueue.js` — Retry Processing Hook

**Files:**
- Create: `src/hooks/useRetryQueue.js`

This hook processes the retry queue on mount and exposes failed items for UI display.

**Step 1: Write the hook**

Create `src/hooks/useRetryQueue.js`:

```javascript
/**
 * Hook that processes the retry queue on mount and provides
 * failed items count for UI display.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getRetryableItems,
  getFailedItems,
  incrementAttempt,
  removeFromQueue,
} from '../utils/retryQueue';
import { useNotification } from '../contexts/NotificationContext';

// Map of operation types to retry functions.
// Each function receives (accessToken, sheetId, item) and returns a Promise.
// Populated by registerRetryHandler().
const retryHandlers = {};

/**
 * Register a handler for a specific retry operation type.
 * Call this during app initialization.
 *
 * @param {string} type - Operation type (e.g., 'link-note-contact')
 * @param {Function} handler - async (accessToken, sheetId, item) => void
 */
export function registerRetryHandler(type, handler) {
  retryHandlers[type] = handler;
}

/**
 * Hook that processes the retry queue and surfaces failures.
 *
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Active Google Sheet ID
 * @returns {{ failedCount: number, processQueue: Function }}
 */
export function useRetryQueue(accessToken, sheetId) {
  const [failedCount, setFailedCount] = useState(0);
  const { notify } = useNotification();

  const processQueue = useCallback(async () => {
    if (!accessToken || !sheetId) return;

    const retryable = getRetryableItems();
    if (retryable.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const item of retryable) {
      const handler = retryHandlers[item.type];
      if (!handler) {
        console.warn(`[RetryQueue] No handler for type: ${item.type}`);
        incrementAttempt(item.id);
        continue;
      }

      try {
        await handler(accessToken, sheetId, item);
        removeFromQueue(item.id);
        successCount++;
      } catch {
        incrementAttempt(item.id);
        failCount++;
      }
    }

    if (successCount > 0) {
      notify.success(`Retried ${successCount} pending operation${successCount > 1 ? 's' : ''} successfully.`);
    }

    const nowFailed = getFailedItems();
    setFailedCount(nowFailed.length);

    if (nowFailed.length > 0) {
      notify.urgent(
        `${nowFailed.length} operation${nowFailed.length > 1 ? 's' : ''} failed after ${3} attempts. Check Settings for details.`
      );
    }
  }, [accessToken, sheetId, notify]);

  // Process on mount
  useEffect(() => {
    processQueue();
  }, [processQueue]);

  return { failedCount, processQueue };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useRetryQueue.js
git commit -m "feat: add useRetryQueue hook for automatic retry processing"
```

---

## Task 15: Wire Retry Queue Into `batchLinkNoteToEntities` in `devModeWrapper.js`

**Files:**
- Modify: `src/utils/devModeWrapper.js`

When the production-mode `batchLinkNoteToEntities` wrapper detects failures in the results, queue them for retry.

**Step 1: Add imports**

At the top of `devModeWrapper.js`, add:

```javascript
import { queueFailedWrite } from './retryQueue';
```

**Step 2: Find the `batchLinkNoteToEntities` wrapper**

Find where the wrapper calls the production `originalFn`. After it returns `results`, add failure queueing logic. If the wrapper currently just passes through to the original, wrap the production path like this:

```javascript
// After getting results from the original function (production path):
const results = await originalFn(accessToken, sheetId, noteId, entityLinks);

// Queue any failures for retry
const allResults = [
  ...results.contacts.map((r) => ({ ...r, type: 'link-note-contact', sourceId: noteId, targetId: r.contactId || r.id })),
  ...results.events.map((r) => ({ ...r, type: 'link-note-event', sourceId: noteId, targetId: r.eventId || r.id })),
  ...results.lists.map((r) => ({ ...r, type: 'link-note-list', sourceId: noteId, targetId: r.listId || r.id })),
  ...results.tasks.map((r) => ({ ...r, type: 'link-note-task', sourceId: noteId, targetId: r.taskId || r.id })),
];

for (const r of allResults) {
  if (r.success === false) {
    queueFailedWrite({
      type: r.type,
      sourceId: r.sourceId,
      targetId: r.targetId,
      payload: { sheetId },
    });
  }
}

return results;
```

**Step 3: Register retry handlers**

In the same file, after the imports section, register the retry handlers for link operations:

```javascript
import { registerRetryHandler } from '../hooks/useRetryQueue';

// Register retry handlers for link operations (runs at module load time)
registerRetryHandler('link-note-contact', async (accessToken, sheetId, item) => {
  await sheetsModule.linkNoteToContact(accessToken, sheetId, item.sourceId, item.targetId);
});
registerRetryHandler('link-note-event', async (accessToken, sheetId, item) => {
  await sheetsModule.linkNoteToEvent(accessToken, sheetId, item.sourceId, item.targetId);
});
registerRetryHandler('link-note-list', async (accessToken, sheetId, item) => {
  await sheetsModule.linkNoteToList(accessToken, sheetId, item.sourceId, item.targetId);
});
registerRetryHandler('link-note-task', async (accessToken, sheetId, item) => {
  await sheetsModule.linkNoteToTask(accessToken, sheetId, item.sourceId, item.targetId);
});
```

**Step 4: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/utils/devModeWrapper.js
git commit -m "feat: wire retry queue into batchLinkNoteToEntities for failed writes"
```

---

## Task 16: Mount `useRetryQueue` in App

**Files:**
- Modify: `src/App.js`

**Step 1: Read `src/App.js` to understand the component structure**

The app has a provider hierarchy: `AuthProvider > NotificationProvider > WorkspaceProvider > AppContent`. The retry queue hook needs both auth context (for `accessToken`) and notification context (for toasts), so it should be mounted inside a component that has access to both.

**Step 2: Add the retry queue to `AppContent` or a similar inner component**

Find the component that has access to both `useAuth()` and is inside `NotificationProvider`. Add:

```javascript
import { useRetryQueue } from './hooks/useRetryQueue';
import { useActiveSheetId } from './utils/sheetResolver';

// Inside the component function body:
const { accessToken } = useAuth();
const sheetId = useActiveSheetId();
const { failedCount } = useRetryQueue(accessToken, sheetId);
```

The `failedCount` is available for future UI display (e.g., a badge on Settings). For now, the hook handles processing and notifications automatically.

**Step 3: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 4: Run the dev server and verify no errors**

Run: `npm start`
Check browser console for any import or runtime errors.

**Step 5: Commit**

```bash
git add src/App.js
git commit -m "feat: mount retry queue processing in App component"
```

---

## Task 17: Fix Any Failing Tests From ID Format Changes

**Files:**
- Modify: `src/utils/__tests__/devModeDataIntegrity.test.js`
- Modify: any other test files that assert specific ID formats

After Tasks 1-4, some tests may assert the old `C001` format. This task fixes them.

**Step 1: Run the full test suite and identify failures**

Run: `npm test -- --run`
Note any failures related to ID format expectations.

**Step 2: Update test assertions**

For each test that checks IDs, replace exact string assertions with regex matchers:

```javascript
// OLD:
expect(result.contactId).toBe('C001');

// NEW:
expect(result.contactId).toMatch(/^CON-[0-9a-f]{8}$/);
```

Common patterns to look for:
- `toBe('C001')` → `toMatch(/^CON-[0-9a-f]{8}$/)`
- `toBe('T001')` → `toMatch(/^TP-[0-9a-f]{8}$/)`
- `toBe('EVT001')` → `toMatch(/^EVT-[0-9a-f]{8}$/)`
- `toBe('N001')` → `toMatch(/^NOTE-[0-9a-f]{8}$/)`
- `toBe('TSK001')` → `toMatch(/^TSK-[0-9a-f]{8}$/)`
- `toBe('LST001')` → `toMatch(/^LST-[0-9a-f]{8}$/)`
- `toBe('WS001')` → `toMatch(/^WS-[0-9a-f]{8}$/)`

Also update any tests that check `id.startsWith('C')` — these should now check for `id.startsWith('CON-')`.

**Step 3: Update mock data in test fixtures if needed**

Check `src/__tests__/fixtures/` and `src/__tests__/mocks/` for hardcoded IDs. Old format IDs in fixtures are fine — the app supports both formats. Only update assertions about **newly generated** IDs.

**Step 4: Run full test suite to confirm all pass**

Run: `npm test -- --run`
Expected: All tests pass (0 failures)

**Step 5: Commit**

```bash
git add -A
git commit -m "test: update ID format assertions for UUID-based IDs"
```

---

## Task 18: Final Verification

**Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: All tests pass

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run ESLint**

Run: `npx eslint src/utils/idGenerator.js src/utils/retryQueue.js src/hooks/useRetryQueue.js`
Expected: No errors (warnings about exhaustive-deps are OK)

**Step 4: Verify dev mode works**

Run: `npm start`
Test in browser: Create a contact, add a touchpoint, add a note. Verify new UUID-format IDs appear in the UI and localStorage.

**Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup for sheets scalability optimization"
```

---

## Summary of API Call Reduction

| Operation | Before (API calls) | After (API calls) | Reduction |
|-----------|--------------------|--------------------|-----------|
| Add contact | 5 (metadata + full read for ID + append + audit metadata + audit append) | 2 (metadata + append) | 60% |
| Update contact (3 fields changed) | 5 (metadata + read + update + 3x audit) | 3 (metadata + read + update + 1 batch audit) | 40% |
| Add note + link to contact | 7 (note ID read + note metadata + note append + dupe check read + junction metadata + junction append) | 3 (note metadata + note append + junction append; dupe check from cache) | 57% |
| Link note to 4 entities | 12 (3 per link x4, sequential) | 4 (parallel, dupe checks from cache) | 67% |
| Copy 5 contacts | 25 (5 per contact x5, sequential) | 25 (same count but parallel, runs ~5x faster) | 0% calls, ~80% wall time |

**Net effect:** Power users performing bulk operations go from potentially 60+ API calls/minute to ~15-20, comfortably within the 60 req/min per-user limit.
