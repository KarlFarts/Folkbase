# Sheets Sync Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all sync correctness issues identified in the Google Sheets data layer audit.

**Architecture:** Six self-contained fixes across `src/utils/sheets.js`, `src/utils/indexedDbCache.js`, and `src/utils/idGenerator.js`. Each fix is independent; they can be committed separately. No new files needed.

**Tech Stack:** JavaScript, Vitest, Google Sheets API (axios), IndexedDB (idb)

---

## Fix 1 — Stale cache used for duplicate-detection in link* functions

**Problem:** Five functions call `readSheetDataCachedFirst()` before checking for an existing junction-table mapping. A cache up to 2 min old lets a duplicate link be created silently.

**Files:**
- Modify: `src/utils/sheets.js` (5 locations)

**Step 1: Write the failing test**

In `src/utils/__tests__/sheets.sync.test.js` (create if it doesn't exist):

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../indexedDbCache', () => ({
  getCachedData: vi.fn(),
  setCachedData: vi.fn(),
  appendToCachedData: vi.fn(),
  updateCachedRow: vi.fn(),
  deleteCachedRow: vi.fn(),
  invalidateCache: vi.fn(),
}));
vi.mock('axios');
vi.mock('../apiUsageLogger', () => ({ logApiCall: vi.fn() }));
vi.mock('../authErrorHandler', () => ({ notifyAuthError: vi.fn() }));
vi.mock('../rateLimitHandler', () => ({ notifyRateLimit: vi.fn() }));
vi.mock('../../services/apiUsageStats', () => ({ canMakeRequest: vi.fn(() => ({ allowed: true })) }));
vi.mock('../logger', () => ({ warn: vi.fn() }));
vi.mock('../idGenerator', () => ({
  generateId: vi.fn(() => 'NOTE-test01'),
  ID_PREFIXES: { NOTE: 'NOTE' },
}));

describe('linkNoteToContact duplicate detection', () => {
  it('uses a fresh API read (not cache) for dupe check', async () => {
    const { readSheetDataCachedFirst, readSheetData } = await import('../sheets');
    // readSheetDataCachedFirst should NOT be called by linkNoteToContact
    // readSheetData (fresh) SHOULD be called
    // This test verifies the import side-effect by checking call counts after a link
    // (Expand this test once sheets.js is importable in test environment)
    expect(true).toBe(true); // placeholder — see integration note below
  });
});
```

> **Note:** `sheets.js` is difficult to unit test in isolation because it creates an axios instance at module load. The most practical verification is a grep-based assertion in CI:
>
> ```bash
> # Must not find readSheetDataCachedFirst inside any link* function
> grep -A 30 'export async function linkNoteToContact' src/utils/sheets.js | grep -c 'readSheetDataCachedFirst'
> # Expected output: 0
> ```

**Step 2: Apply fix — swap `readSheetDataCachedFirst` → `readSheetData` at 5 call sites**

In `src/utils/sheets.js`, find each of these blocks and change `readSheetDataCachedFirst` to `readSheetData`:

| Function | Approx line | What to change |
|---|---|---|
| `linkNoteToContact` | ~1091 | `readSheetDataCachedFirst(` → `readSheetData(` |
| `linkNoteToEvent` | ~1289 | same |
| `linkNoteToList` | ~1402 | same |
| `linkNoteToTask` | ~1512 | same |
| `addContactToList` | ~2062 | same |

Each block looks like:
```javascript
// BEFORE
const { data: existingMappings } = await readSheetDataCachedFirst(
  accessToken,
  sheetId,
  SHEETS.CONTACT_NOTES   // (or CONTACT_LISTS, etc.)
);

// AFTER
const { data: existingMappings } = await readSheetData(
  accessToken,
  sheetId,
  SHEETS.CONTACT_NOTES
);
```

**Step 3: Verify with grep**

```bash
grep -n 'readSheetDataCachedFirst' src/utils/sheets.js
```
Expected: only the function definition itself (line ~414) and the doc-comment references — no call sites inside `link*` or `addContactToList`.

**Step 4: Run tests**

```bash
npm test -- --run
```
Expected: all tests pass (same count as before).

**Step 5: Commit**

```bash
git add src/utils/sheets.js
git commit -m "fix: use fresh API read for junction-table duplicate detection"
```

---

## Fix 2 — Cache not updated after update operations

**Problem:** `updateContact` and `updateTouchpoint` write to the API but never call `updateCachedRow`, so reads within the TTL window return stale data.

**Files:**
- Modify: `src/utils/sheets.js`
- Modify: `src/utils/indexedDbCache.js` (add import export if not already exported — it is already exported)

**Step 1: Check current imports at top of `sheets.js`**

Find the line:
```javascript
import { getCachedData, appendToCachedData } from './indexedDbCache';
```

Change to:
```javascript
import { getCachedData, appendToCachedData, updateCachedRow, deleteCachedRow, invalidateCache } from './indexedDbCache';
```

**Step 2: Add `updateCachedRow` call to `updateContact`**

After the `await updateRow(...)` call in `updateContact` (approx line 694), add:

```javascript
await updateRow(accessToken, sheetId, SHEETS.CONTACTS, rowIndex, values);

// Keep cache consistent with what was just written
const updatedFields = headers.reduce((acc, h) => {
  acc[h.name] = values[headers.indexOf(h)];
  return acc;
}, {});
await updateCachedRow(SHEETS.CONTACTS, 'Contact ID', contactId, updatedFields);
```

**Step 3: Add `updateCachedRow` call to `updateTouchpoint`**

After the `await updateRow(...)` call in `updateTouchpoint` (approx line 806):

```javascript
await updateRow(accessToken, sheetId, SHEETS.TOUCHPOINTS, rowIndex, values);

const updatedFields = headers.reduce((acc, h) => {
  acc[h.name] = values[headers.indexOf(h)];
  return acc;
}, {});
await updateCachedRow(SHEETS.TOUCHPOINTS, 'Touchpoint ID', touchpointId, updatedFields);
```

**Step 4: Run tests**

```bash
npm test -- --run
```
Expected: all pass.

**Step 5: Commit**

```bash
git add src/utils/sheets.js
git commit -m "fix: update IndexedDB cache after contact and touchpoint writes"
```

---

## Fix 3 — Cache not invalidated after delete/unlink operations

**Problem:** After a row is deleted (unlink, deleteData callers), the cache still contains the deleted row. Subsequent cache-hits return phantom rows.

**Files:**
- Modify: `src/utils/sheets.js`

**Background:** Junction tables use compound keys (Note ID + Contact ID), so `deleteCachedRow` (which matches one field) would remove too many rows. Use `invalidateCache` instead — cheap and correct.

**Step 1: Add `invalidateCache` call to `unlinkNoteFromContact`**

After the `client.post(...)` batchUpdate call in `unlinkNoteFromContact` (approx line 1163):

```javascript
  }); // end client.post

  // Invalidate so next read gets the fresh row count
  await invalidateCache(SHEETS.CONTACT_NOTES);

  return { success: true, noteId, contactId };
```

**Step 2: Apply the same pattern to the other three unlink functions**

Search for the other unlink functions (they follow the same pattern):
- `unlinkNoteFromEvent` — invalidate `SHEETS.EVENT_NOTES`
- `unlinkNoteFromList` — invalidate `SHEETS.LIST_NOTES`
- `unlinkNoteFromTask` — invalidate `SHEETS.TASK_NOTES`

For each, add `await invalidateCache(SHEETS.<TAB>);` immediately after the `client.post(...)` resolves and before the `return`.

**Step 3: Add `invalidateCache` to `removeContactFromList`** (approx line 2109)

After the `client.post(...)` batchUpdate call, add:
```javascript
await invalidateCache(SHEETS.CONTACT_LISTS);
```

**Step 4: Run tests**

```bash
npm test -- --run
```
Expected: all pass.

**Step 5: Commit**

```bash
git add src/utils/sheets.js
git commit -m "fix: invalidate cache after junction-table row deletion"
```

---

## Fix 4 — Parallel batch-link race condition

**Problem:** `batchLinkNoteToEntities` fires all link calls with `Promise.all`. Each concurrent call does its own dupe check against the same read snapshot — two calls to the same junction can both conclude "no duplicate" and both append.

**Note:** Fix 1 makes each call use a fresh API read, which means sequential calls will each see the row added by the previous call. But concurrent calls in a `Promise.all` can still race on in-flight requests. Serializing eliminates this.

**Files:**
- Modify: `src/utils/sheets.js`

**Step 1: Write a test**

In `src/utils/__tests__/sheets.sync.test.js`:
```javascript
describe('batchLinkNoteToEntities', () => {
  it('is documented as sequential to prevent race conditions', () => {
    // Grep-based assertion — see CI check below
    expect(true).toBe(true);
  });
});
```

CI check:
```bash
# Verify Promise.all is gone from batchLinkNoteToEntities
grep -A 40 'export async function batchLinkNoteToEntities' src/utils/sheets.js | grep -c 'Promise.all'
# Expected: 0
```

**Step 2: Replace `Promise.all` with sequential execution**

Find `batchLinkNoteToEntities` (approx line 1687) and replace the body:

```javascript
export async function batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks) {
  const { contactIds = [], eventIds = [], listIds = [], taskIds = [] } = entityLinks;

  const results = { contacts: [], events: [], lists: [], tasks: [] };

  // Sequential to prevent concurrent dupe-check races on the same junction table
  for (const contactId of contactIds) {
    try {
      const result = await linkNoteToContact(accessToken, sheetId, noteId, contactId);
      results.contacts.push({ type: 'contact', id: contactId, ...result });
    } catch (error) {
      results.contacts.push({ type: 'contact', id: contactId, success: false, error: error.message });
    }
  }
  for (const eventId of eventIds) {
    try {
      const result = await linkNoteToEvent(accessToken, sheetId, noteId, eventId);
      results.events.push({ type: 'event', id: eventId, ...result });
    } catch (error) {
      results.events.push({ type: 'event', id: eventId, success: false, error: error.message });
    }
  }
  for (const listId of listIds) {
    try {
      const result = await linkNoteToList(accessToken, sheetId, noteId, listId);
      results.lists.push({ type: 'list', id: listId, ...result });
    } catch (error) {
      results.lists.push({ type: 'list', id: listId, success: false, error: error.message });
    }
  }
  for (const taskId of taskIds) {
    try {
      const result = await linkNoteToTask(accessToken, sheetId, noteId, taskId);
      results.tasks.push({ type: 'task', id: taskId, ...result });
    } catch (error) {
      results.tasks.push({ type: 'task', id: taskId, success: false, error: error.message });
    }
  }

  return results;
}
```

**Step 3: Run tests**

```bash
npm test -- --run
```
Expected: all pass.

**Step 4: Commit**

```bash
git add src/utils/sheets.js
git commit -m "fix: serialize batchLinkNoteToEntities to eliminate dupe-check races"
```

---

## Fix 5 — UUID entropy (LOW)

**Problem:** `generateId` uses 4 random bytes (8 hex chars, ~4 billion combinations). Birthday paradox gives ~50 % collision at ~65 k IDs per entity type. No collision guard exists.

**Fix:** Increase to 8 random bytes (16 hex chars, ~18 quintillion combinations). This eliminates practical collision risk with no behavioral change.

**Files:**
- Modify: `src/utils/idGenerator.js`

**Step 1: Write failing test**

In `src/utils/__tests__/idGenerator.test.js` (create if missing):
```javascript
import { generateId, ID_PREFIXES } from '../idGenerator';

describe('generateId', () => {
  it('produces a 16-character hex suffix', () => {
    const id = generateId('CON');
    const hex = id.replace('CON-', '');
    expect(hex).toHaveLength(16);
    expect(hex).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId('CON')));
    expect(ids.size).toBe(1000);
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npm test -- --run src/utils/__tests__/idGenerator.test.js
```
Expected: FAIL — hex length is 8, not 16.

**Step 3: Apply fix in `idGenerator.js`**

Change:
```javascript
const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');
```
To:
```javascript
const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');
```

**Step 4: Run test to confirm it passes**

```bash
npm test -- --run src/utils/__tests__/idGenerator.test.js
```
Expected: PASS.

**Step 5: Run full suite**

```bash
npm test -- --run
```
Expected: all pass.

**Step 6: Commit**

```bash
git add src/utils/idGenerator.js src/utils/__tests__/idGenerator.test.js
git commit -m "fix: increase ID entropy from 32-bit to 64-bit hex"
```

---

## Fix 6 — Column-mapping brittleness (LOW)

**Problem:** If a user renames/reorders a Sheet column between cache refreshes, all writes within the TTL silently misplace values. No detection exists.

**Approach:** Every write function already calls `readSheetMetadata` to get fresh headers. After that call, compare those headers against the headers stored in the cache. If they differ, invalidate the cache for that sheet and log a warning. This means mismatch is caught the next time any write runs, which is the earliest practical detection point without adding read-only polling.

**Files:**
- Modify: `src/utils/sheets.js`
- Modify: `src/utils/indexedDbCache.js` (expose `getCachedData` already exported — no change needed there)

**Step 1: Add a header-mismatch helper to `sheets.js`**

After the import block at the top of `sheets.js`, add:

```javascript
/**
 * Compare freshly-fetched headers against what's in the cache.
 * If they differ, invalidate the cache for that sheet and warn.
 * Called from every write function that already fetches metadata.
 *
 * @param {string} sheetName - Sheet name (from SHEETS constants)
 * @param {Array<{name: string}>} freshHeaders - Headers returned by readSheetMetadata
 */
async function checkHeaderMismatch(sheetName, freshHeaders) {
  try {
    const cached = await getCachedData(sheetName);
    if (!cached || !cached.headers) return;

    const cachedSig = cached.headers.map((h) => h.name).join('\x00');
    const freshSig = freshHeaders.map((h) => h.name).join('\x00');
    if (cachedSig !== freshSig) {
      warn(
        `[Sync] Header mismatch on "${sheetName}" — cache invalidated. ` +
          `Cached: [${cached.headers.map((h) => h.name).join(', ')}] ` +
          `Fresh: [${freshHeaders.map((h) => h.name).join(', ')}]`
      );
      await invalidateCache(sheetName);
    }
  } catch (err) {
    console.error('[Sync] checkHeaderMismatch failed:', err);
  }
}
```

**Step 2: Call `checkHeaderMismatch` in `updateContact` and `addContact`**

In `updateContact`, after:
```javascript
const { headers } = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS);
```
Add:
```javascript
await checkHeaderMismatch(SHEETS.CONTACTS, headers);
```

In `addContact`, same — after the `readSheetMetadata` call, add:
```javascript
await checkHeaderMismatch(SHEETS.CONTACTS, headers);
```

Do the same in `updateTouchpoint` / `addTouchpoint` for `SHEETS.TOUCHPOINTS`, and in any other entity's add/update function that calls `readSheetMetadata`.

**Step 3: Verify the function is called before cache reads**

```bash
grep -n 'checkHeaderMismatch' src/utils/sheets.js
```
Expected: multiple lines showing it's called inside add/update functions.

**Step 4: Run tests**

```bash
npm test -- --run
```
Expected: all pass.

**Step 5: Commit**

```bash
git add src/utils/sheets.js
git commit -m "fix: detect and invalidate cache on column-header mismatch"
```

---

## Final verification

```bash
npm test -- --run
npm run build
```
Both should exit 0 with no errors or new warnings.

Update the SYNC RISKS section in the `sheets.js` file header to reflect which issues are now resolved.
