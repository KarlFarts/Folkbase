# Moments Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Moments" tab to contact profiles for logging life events (vacations, trips, funerals, etc.) with CRUD operations and multi-contact tagging.

**Architecture:** Single `Moments` Google Sheet tab with a `ContactIDs` comma-separated field — no junction table. Load all Moments once, filter client-side. Full dev mode (localStorage) support via the existing seedTestData / devModeWrapper pattern.

**Tech Stack:** React 19, Vite, Google Sheets API, Vitest + Testing Library, lucide-react icons, WindowTemplate modal system.

---

## Task 1: Add ID prefix for Moments

**Files:**
- Modify: `src/utils/idGenerator.js`

**Step 1: Add MOMENT prefix to ID_PREFIXES**

In `src/utils/idGenerator.js`, add `MOMENT: 'MOM'` to the `ID_PREFIXES` export object (after `RELATIONSHIP: 'REL'`):

```js
export const ID_PREFIXES = {
  CONTACT: 'CON',
  // ... existing entries ...
  ENTITY_REL: 'ERE',
  MOMENT: 'MOM',  // <-- add this line
};
```

**Step 2: Run tests to verify nothing broke**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/utils/idGenerator.js
git commit -m "feat: add MOM id prefix for Moments"
```

---

## Task 2: Add Moments to constants

**Files:**
- Modify: `src/config/constants.js`

**Step 1: Add MOMENTS to SHEET_NAMES**

In `SHEET_NAMES` (around line 92), add under the `// === CORE DATA ===` section:

```js
MOMENTS: 'Moments', // Life events (vacations, trips, funerals, etc.)
```

Place it after `LOCATION_VISITS: 'Location Visits',`.

**Step 2: Add MOMENTS headers to SHEET_HEADERS**

In `SHEET_HEADERS` (after the `TOUCHPOINTS` entry around line 325), add:

```js
[SHEET_NAMES.MOMENTS]: [
  'Moment ID',
  'Title',
  'Type',
  'Start Date',
  'End Date',
  'Location',
  'Notes',
  'Contact IDs',
  'Created At',
],
```

**Step 3: Run tests**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/config/constants.js
git commit -m "feat: add Moments sheet name and headers to constants"
```

---

## Task 3: Add localStorage helpers to seedTestData

**Files:**
- Modify: `src/__tests__/fixtures/seedTestData.js`

**Step 1: Add storage key constant**

Near the top of the file where other `STORAGE_KEY_*` constants are defined (around line 40), add:

```js
const STORAGE_KEY_MOMENTS = 'dev_moments';
```

**Step 2: Add getter and setter functions**

At the end of the file (or grouped with other entity functions), add:

```js
// ============================================================================
// MOMENTS
// ============================================================================

export function getLocalMoments() {
  const stored = localStorage.getItem(STORAGE_KEY_MOMENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalMoments(moments) {
  localStorage.setItem(STORAGE_KEY_MOMENTS, JSON.stringify(moments));
}
```

**Step 3: Run tests**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/__tests__/fixtures/seedTestData.js
git commit -m "feat: add getLocalMoments/saveLocalMoments to seedTestData"
```

---

## Task 4: Add Moments CRUD to devModeWrapper

**Files:**
- Modify: `src/utils/devModeWrapper.js`

**Step 1: Write the failing test**

Create `src/utils/__tests__/devModeWrapper.moments.test.js`:

```js
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must set dev mode before importing the module
vi.stubEnv('VITE_DEV_MODE', 'true');

// Mock the seedTestData module
const mockMoments = [];
vi.mock('../../__tests__/fixtures/seedTestData', () => ({
  getLocalContacts: () => [],
  saveLocalContacts: vi.fn(),
  getLocalTouchpoints: () => [],
  saveLocalTouchpoints: vi.fn(),
  getLocalEvents: () => [],
  saveLocalEvents: vi.fn(),
  getLocalActivities: () => [],
  saveLocalActivities: vi.fn(),
  getLocalContactActivities: () => [],
  getLocalLists: () => [],
  saveLocalLists: vi.fn(),
  getLocalContactLists: () => [],
  saveLocalContactLists: vi.fn(),
  getLocalNotes: () => [],
  saveLocalNotes: vi.fn(),
  getLocalContactNotes: () => [],
  saveLocalContactNotes: vi.fn(),
  getLocalEventNotes: () => [],
  saveLocalEventNotes: vi.fn(),
  getLocalListNotes: () => [],
  saveLocalListNotes: vi.fn(),
  getLocalTaskNotes: () => [],
  saveLocalTaskNotes: vi.fn(),
  getNotesForContact: () => [],
  getLocalRelationships: () => [],
  getLocalOrganizations: () => [],
  saveLocalOrganizations: vi.fn(),
  getLocalLocations: () => [],
  saveLocalLocations: vi.fn(),
  getLocalLocationVisits: () => [],
  saveLocalLocationVisits: vi.fn(),
  getLocalWorkspaces: () => [],
  saveLocalWorkspaces: vi.fn(),
  getLocalWorkspaceMembers: () => [],
  saveLocalWorkspaceMembers: vi.fn(),
  getLocalWorkspaceInvitations: () => [],
  saveLocalWorkspaceInvitations: vi.fn(),
  getLocalEventAttendees: () => [],
  saveLocalEventAttendees: vi.fn(),
  getLocalEventResources: () => [],
  saveLocalEventResources: vi.fn(),
  getLocalEventAgenda: () => [],
  saveLocalEventAgenda: vi.fn(),
  getLocalOrgContacts: () => [],
  saveLocalOrgContacts: vi.fn(),
  getLocalOrgDepartments: () => [],
  saveLocalOrgDepartments: vi.fn(),
  getLocalTaskChecklist: () => [],
  saveLocalTaskChecklist: vi.fn(),
  getLocalTaskTimeEntries: () => [],
  saveLocalTaskTimeEntries: vi.fn(),
  getLocalCalendarEvents: () => [],
  saveLocalCalendarEvents: vi.fn(),
  getLocalMoments: () => [...mockMoments],
  saveLocalMoments: vi.fn((moments) => {
    mockMoments.length = 0;
    mockMoments.push(...moments);
  }),
  mockMetadata: null,
}));

vi.mock('../sheets', () => ({ SHEETS: {} }));
vi.mock('../indexedDbCache', () => ({
  getCachedData: vi.fn(() => null),
  setCachedData: vi.fn(),
  invalidateCache: vi.fn(),
  appendToCachedData: vi.fn(),
  updateCachedRow: vi.fn(),
  deleteCachedRow: vi.fn(),
}));
vi.mock('../activities', () => ({
  createActivity: vi.fn(),
  ACTIVITY_TYPES: {},
  sortActivitiesByDate: vi.fn((a) => a),
}));
vi.mock('../logger', () => ({ log: vi.fn() }));
vi.mock('../retryQueue', () => ({ queueFailedWrite: vi.fn() }));
vi.mock('../../hooks/useRetryQueue', () => ({ registerRetryHandler: vi.fn() }));
vi.mock('../../services/cacheMonitoringService', () => ({
  default: { recordApiCall: vi.fn() },
}));

const { getMomentsForContact, addMoment, updateMoment, deleteMoment } = await import(
  '../devModeWrapper'
);

describe('Moments CRUD (dev mode)', () => {
  beforeEach(() => {
    mockMoments.length = 0;
  });

  it('addMoment creates a moment with a MOM- id', async () => {
    const result = await addMoment('token', 'sheet1', {
      Title: 'Beach trip',
      Type: 'Vacation',
      'Start Date': '2025-06-01',
      'End Date': '2025-06-07',
      Location: 'Florida',
      Notes: 'Great time',
      'Contact IDs': 'CON001,CON002',
    });
    expect(result['Moment ID']).toMatch(/^MOM-/);
    expect(result.Title).toBe('Beach trip');
  });

  it('getMomentsForContact returns only moments containing that contactId', async () => {
    await addMoment('token', 'sheet1', {
      Title: 'Trip A',
      'Contact IDs': 'CON001,CON002',
    });
    await addMoment('token', 'sheet1', {
      Title: 'Trip B',
      'Contact IDs': 'CON003',
    });

    const moments = await getMomentsForContact('token', 'sheet1', 'CON001');
    expect(moments).toHaveLength(1);
    expect(moments[0].Title).toBe('Trip A');
  });

  it('updateMoment modifies the existing moment', async () => {
    const created = await addMoment('token', 'sheet1', {
      Title: 'Old title',
      'Contact IDs': 'CON001',
    });
    const updated = await updateMoment('token', 'sheet1', created['Moment ID'], {
      Title: 'New title',
    });
    expect(updated.Title).toBe('New title');
    expect(updated['Moment ID']).toBe(created['Moment ID']);
  });

  it('deleteMoment removes the moment', async () => {
    const created = await addMoment('token', 'sheet1', {
      Title: 'To delete',
      'Contact IDs': 'CON001',
    });
    await deleteMoment('token', 'sheet1', created['Moment ID']);
    const remaining = await getMomentsForContact('token', 'sheet1', 'CON001');
    expect(remaining).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/utils/__tests__/devModeWrapper.moments.test.js --run
```
Expected: FAIL — `getMomentsForContact`, `addMoment`, etc. are not exported.

**Step 3: Add Moments CRUD to devModeWrapper**

In `devModeWrapper.js`, make three changes:

**3a.** In the destructuring block from `_devSeed` (around line 43), add the moments getters/savers:

```js
getLocalMoments = () => [],
saveLocalMoments = () => {},
```

**3b.** After the `readSheetData` wrapper (or near the end of the file, following the existing function groupings), add:

```js
/**
 * WRAPPER: getMomentsForContact
 * Loads all Moments and filters by contactId (client-side) in both dev and prod.
 */
export async function getMomentsForContact(accessToken, sheetId, contactId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting moments for contact:', contactId);
    const moments = getLocalMoments();
    return moments.filter((m) => {
      const ids = (m['Contact IDs'] || '').split(',').map((s) => s.trim());
      return ids.includes(contactId);
    });
  }

  // Production mode: read full Moments tab, filter client-side
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.MOMENTS);
  return data.filter((m) => {
    const ids = (m['Contact IDs'] || '').split(',').map((s) => s.trim());
    return ids.includes(contactId);
  });
}

/**
 * WRAPPER: addMoment
 * Adds a new moment to localStorage in dev mode, Google Sheets in production.
 */
export async function addMoment(accessToken, sheetId, momentData) {
  if (isDevMode()) {
    log('[DEV MODE] Adding moment to localStorage:', momentData);

    const moments = getLocalMoments();
    const momentId = generateId(ID_PREFIXES.MOMENT);
    const createdAt = nowIso();

    const newMoment = {
      'Moment ID': momentId,
      'Created At': createdAt,
      ...momentData,
    };

    moments.push(newMoment);
    saveLocalMoments(moments);
    return { momentId, ...newMoment };
  }

  // Production mode
  const { headers } = await sheetsModule.readSheetMetadata(
    accessToken,
    sheetId,
    SHEET_NAMES.MOMENTS
  );
  const momentId = generateId(ID_PREFIXES.MOMENT);
  const createdAt = nowIso();

  const newMoment = {
    'Moment ID': momentId,
    'Created At': createdAt,
    ...momentData,
  };

  const values = headers.map((h) => newMoment[h.name] || '');
  const startTime = Date.now();
  await sheetsModule.appendRow(accessToken, sheetId, SHEET_NAMES.MOMENTS, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.MOMENTS, duration);
  await appendToCachedData(SHEET_NAMES.MOMENTS, { 'Moment ID': momentId, ...newMoment });
  return { momentId, ...newMoment };
}

/**
 * WRAPPER: updateMoment
 * Updates an existing moment.
 */
export async function updateMoment(accessToken, sheetId, momentId, momentData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating moment:', momentId);

    const moments = getLocalMoments();
    const index = moments.findIndex((m) => m['Moment ID'] === momentId);
    if (index === -1) throw new Error(`Moment ${momentId} not found`);

    moments[index] = {
      ...moments[index],
      ...momentData,
      'Moment ID': momentId,
      'Created At': moments[index]['Created At'],
    };

    saveLocalMoments(moments);
    return moments[index];
  }

  // Production mode
  const { headers } = await sheetsModule.readSheetMetadata(
    accessToken,
    sheetId,
    SHEET_NAMES.MOMENTS
  );
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.MOMENTS);
  const moment = data.find((m) => m['Moment ID'] === momentId);
  if (!moment) throw new Error(`Moment ${momentId} not found`);

  const updatedMoment = { ...moment, ...momentData, 'Moment ID': momentId };
  const values = headers.map((h) => updatedMoment[h.name] || '');
  const startTime = Date.now();
  await sheetsModule.updateRow(accessToken, sheetId, SHEET_NAMES.MOMENTS, moment._rowIndex, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.MOMENTS, duration);
  await updateCachedRow(SHEET_NAMES.MOMENTS, 'Moment ID', momentId, updatedMoment);
  return updatedMoment;
}

/**
 * WRAPPER: deleteMoment
 * Deletes a moment by ID.
 */
export async function deleteMoment(accessToken, sheetId, momentId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting moment:', momentId);

    const moments = getLocalMoments();
    const filtered = moments.filter((m) => m['Moment ID'] !== momentId);
    saveLocalMoments(filtered);
    return { success: true, momentId };
  }

  // Production mode: delete row via batchUpdate
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.MOMENTS);
  const moment = data.find((m) => m['Moment ID'] === momentId);
  if (!moment) throw new Error(`Moment ${momentId} not found`);

  const internalSheetId = await sheetsModule.getSheetIdByName(
    accessToken,
    sheetId,
    SHEET_NAMES.MOMENTS
  );
  const axios = (await import('axios')).default;
  const { API_CONFIG } = await import('../config/constants');
  const rowIndex = moment._rowIndex;

  const startTime = Date.now();
  await axios.post(
    `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: internalSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.MOMENTS, duration);
  await deleteCachedRow(SHEET_NAMES.MOMENTS, 'Moment ID', momentId);
  return { success: true, momentId };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/utils/__tests__/devModeWrapper.moments.test.js --run
```
Expected: 4 PASS.

**Step 5: Run full test suite**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/utils/devModeWrapper.js src/__tests__/fixtures/seedTestData.js src/utils/__tests__/devModeWrapper.moments.test.js
git commit -m "feat: add Moments CRUD to devModeWrapper (dev + prod)"
```

---

## Task 5: Create MomentModal component

**Files:**
- Create: `src/components/contact/MomentModal.js`

**Step 1: Write the failing test**

Create `src/components/contact/__tests__/MomentModal.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react';
import MomentModal from '../MomentModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  saving: false,
  momentData: {
    Title: '',
    Type: 'Vacation',
    'Start Date': '',
    'End Date': '',
    Location: '',
    Notes: '',
    'Contact IDs': '',
  },
  setMomentData: vi.fn(),
  allContacts: [
    { 'Contact ID': 'CON001', 'Display Name': 'Alice Smith' },
    { 'Contact ID': 'CON002', 'Display Name': 'Bob Jones' },
  ],
  currentContactId: 'CON001',
};

describe('MomentModal', () => {
  it('renders the modal title', () => {
    render(<MomentModal {...defaultProps} />);
    expect(screen.getByText('Add Moment')).toBeInTheDocument();
  });

  it('shows "Edit Moment" when momentId prop is provided', () => {
    render(<MomentModal {...defaultProps} momentId="MOM-abc123" />);
    expect(screen.getByText('Edit Moment')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<MomentModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave when Save button is clicked', () => {
    render(<MomentModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Save Moment'));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('does not show current contact in People suggestions', () => {
    render(<MomentModal {...defaultProps} />);
    // CON001 is currentContactId, should not be in suggestions list
    // CON002 Bob Jones should appear in the contacts dropdown
    const input = screen.getByPlaceholderText(/search contacts/i);
    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/components/contact/__tests__/MomentModal.test.js --run
```
Expected: FAIL — module not found.

**Step 3: Create MomentModal.js**

```js
import { useState } from 'react';
import { X } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';

const MOMENT_TYPES = ['Vacation', 'Trip', 'Family Event', 'Funeral', 'Celebration', 'Other'];

/**
 * MomentModal - Add or Edit a Moment
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {function}
 *   onSave         {function}
 *   saving         {boolean}
 *   momentId       {string|null}  null = Add, string = Edit
 *   momentData     {object}       controlled form state
 *   setMomentData  {function}
 *   allContacts    {array}        full contacts list for People search
 *   currentContactId {string}    exclude from People suggestions
 */
export default function MomentModal({
  isOpen,
  onClose,
  onSave,
  saving,
  momentId = null,
  momentData,
  setMomentData,
  allContacts = [],
  currentContactId,
}) {
  const [peopleSearch, setPeopleSearch] = useState('');

  const isEdit = Boolean(momentId);

  // Parse current ContactIDs into array
  const taggedIds = (momentData['Contact IDs'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Contacts available to tag: exclude current contact + already tagged
  const suggestions = allContacts.filter((c) => {
    const id = c['Contact ID'];
    if (id === currentContactId) return false;
    if (taggedIds.includes(id)) return false;
    const name = (c['Display Name'] || c['First Name'] || c.Name || '').toLowerCase();
    return !peopleSearch || name.includes(peopleSearch.toLowerCase());
  });

  const addPerson = (contact) => {
    const newIds = [...taggedIds, contact['Contact ID']].join(',');
    setMomentData({ ...momentData, 'Contact IDs': newIds });
    setPeopleSearch('');
  };

  const removePerson = (id) => {
    const newIds = taggedIds.filter((i) => i !== id).join(',');
    setMomentData({ ...momentData, 'Contact IDs': newIds });
  };

  const getContactName = (id) => {
    const c = allContacts.find((c) => c['Contact ID'] === id);
    return c ? c['Display Name'] || c['First Name'] || c.Name || id : id;
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Moment' : 'Add Moment'}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Moment'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Beach vacation in Florida"
          value={momentData.Title}
          onChange={(e) => setMomentData({ ...momentData, Title: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={momentData.Type}
          onChange={(e) => setMomentData({ ...momentData, Type: e.target.value })}
        >
          {MOMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-input"
            value={momentData['Start Date']}
            onChange={(e) => setMomentData({ ...momentData, 'Start Date': e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-input"
            value={momentData['End Date']}
            onChange={(e) => setMomentData({ ...momentData, 'End Date': e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          className="form-input"
          placeholder="Where did this happen?"
          value={momentData.Location}
          onChange={(e) => setMomentData({ ...momentData, Location: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          rows={5}
          placeholder="Any details to remember..."
          value={momentData.Notes}
          onChange={(e) => setMomentData({ ...momentData, Notes: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">People</label>
        {taggedIds.length > 0 && (
          <div className="moment-people-chips">
            {taggedIds.map((id) => (
              <span key={id} className="moment-chip">
                {getContactName(id)}
                <button
                  className="moment-chip-remove"
                  onClick={() => removePerson(id)}
                  aria-label={`Remove ${getContactName(id)}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          className="form-input"
          placeholder="Search contacts..."
          value={peopleSearch}
          onChange={(e) => setPeopleSearch(e.target.value)}
        />
        {peopleSearch && suggestions.length > 0 && (
          <ul className="moment-suggestions">
            {suggestions.slice(0, 6).map((c) => (
              <li key={c['Contact ID']} className="moment-suggestion-item">
                <button onClick={() => addPerson(c)}>
                  {c['Display Name'] || c['First Name'] || c.Name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WindowTemplate>
  );
}
```

**Step 4: Run tests**

```bash
npm test -- src/components/contact/__tests__/MomentModal.test.js --run
```
Expected: 5 PASS.

**Step 5: Run full suite**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/components/contact/MomentModal.js src/components/contact/__tests__/MomentModal.test.js
git commit -m "feat: add MomentModal component with add/edit and people tagging"
```

---

## Task 6: Create MomentsTab component

**Files:**
- Create: `src/components/contact/MomentsTab.js`

**Step 1: Write the failing test**

Create `src/components/contact/__tests__/MomentsTab.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react';
import MomentsTab from '../MomentsTab';

const sampleMoments = [
  {
    'Moment ID': 'MOM-001',
    Title: 'Beach vacation',
    Type: 'Vacation',
    'Start Date': '2025-06-01',
    'End Date': '2025-06-07',
    Location: 'Florida',
    Notes: 'Had a great time',
    'Contact IDs': 'CON001,CON002',
  },
  {
    'Moment ID': 'MOM-002',
    Title: "Grandma's funeral",
    Type: 'Funeral',
    'Start Date': '2024-11-15',
    'End Date': '',
    Location: 'Chicago',
    Notes: '',
    'Contact IDs': 'CON001',
  },
];

const allContacts = [
  { 'Contact ID': 'CON001', 'Display Name': 'Alice Smith' },
  { 'Contact ID': 'CON002', 'Display Name': 'Bob Jones' },
];

const defaultProps = {
  moments: sampleMoments,
  allContacts,
  currentContactId: 'CON001',
  canWrite: true,
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('MomentsTab', () => {
  it('renders a list of moments', () => {
    render(<MomentsTab {...defaultProps} />);
    expect(screen.getByText('Beach vacation')).toBeInTheDocument();
    expect(screen.getByText("Grandma's funeral")).toBeInTheDocument();
  });

  it('shows empty state when no moments', () => {
    render(<MomentsTab {...defaultProps} moments={[]} />);
    expect(screen.getByText(/no moments logged yet/i)).toBeInTheDocument();
  });

  it('calls onAdd when Add Moment button is clicked', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Moment'));
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('expands a moment on header click to show notes', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    expect(screen.getByText('Had a great time')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is clicked on an expanded card', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith(sampleMoments[0]);
  });

  it('calls onDelete when Delete is clicked', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('MOM-001');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/components/contact/__tests__/MomentsTab.test.js --run
```
Expected: FAIL — module not found.

**Step 3: Create MomentsTab.js**

```js
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_COLORS = {
  Vacation: 'badge-status-active',
  Trip: 'badge-priority-medium',
  'Family Event': 'badge-priority-low',
  Funeral: 'badge-priority-none',
  Celebration: 'badge-priority-high',
  Other: 'badge-status-inactive',
};

function formatDateRange(start, end) {
  if (!start) return null;
  if (!end) return start;
  return `${start} – ${end}`;
}

/**
 * MomentsTab - displays a contact's logged moments
 *
 * Props:
 *   moments         {array}
 *   allContacts     {array}
 *   currentContactId {string}
 *   canWrite        {boolean}
 *   onAdd           {function}
 *   onEdit          {function}  called with moment object
 *   onDelete        {function}  called with momentId
 */
export default function MomentsTab({
  moments,
  allContacts = [],
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const getContactName = (id) => {
    const c = allContacts.find((c) => c['Contact ID'] === id);
    return c ? c['Display Name'] || c['First Name'] || c.Name || id : id;
  };

  if (moments.length === 0) {
    return (
      <div className="card-body">
        <div className="empty-state">
          <p className="empty-state-title">No moments logged yet.</p>
          {canWrite && (
            <button className="btn btn-primary mt-md" onClick={onAdd}>
              Add Moment
            </button>
          )}
        </div>
      </div>
    );
  }

  const sorted = [...moments].sort(
    (a, b) => (b['Start Date'] || '').localeCompare(a['Start Date'] || '')
  );

  return (
    <div className="card-body">
      {canWrite && (
        <div className="moments-header">
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            Add Moment
          </button>
        </div>
      )}

      <div className="moments-list">
        {sorted.map((moment) => {
          const isExpanded = expandedId === moment['Moment ID'];
          const taggedIds = (moment['Contact IDs'] || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const dateRange = formatDateRange(moment['Start Date'], moment['End Date']);

          return (
            <div key={moment['Moment ID']} className="moment-card">
              <div
                className="moment-card-header"
                onClick={() =>
                  setExpandedId(isExpanded ? null : moment['Moment ID'])
                }
              >
                <div className="moment-card-meta">
                  <span className="moment-title">{moment.Title || '(Untitled)'}</span>
                  {moment.Type && (
                    <span className={`badge ${TYPE_COLORS[moment.Type] || 'badge-status-inactive'}`}>
                      {moment.Type}
                    </span>
                  )}
                  {dateRange && <span className="moment-date">{dateRange}</span>}
                  {moment.Location && (
                    <span className="moment-location">{moment.Location}</span>
                  )}
                </div>
                <span className="moment-expand-icon">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              {isExpanded && (
                <div className="moment-card-body">
                  {moment.Notes && <p className="moment-notes">{moment.Notes}</p>}

                  {taggedIds.length > 0 && (
                    <div className="moment-people">
                      <span className="moment-people-label">People:</span>
                      {taggedIds.map((id) => (
                        <span key={id} className="moment-chip moment-chip--readonly">
                          {getContactName(id)}
                        </span>
                      ))}
                    </div>
                  )}

                  {canWrite && (
                    <div className="moment-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEdit(moment)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm moment-delete-btn"
                        onClick={() => onDelete(moment['Moment ID'])}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npm test -- src/components/contact/__tests__/MomentsTab.test.js --run
```
Expected: 6 PASS.

**Step 5: Run full suite**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/components/contact/MomentsTab.js src/components/contact/__tests__/MomentsTab.test.js
git commit -m "feat: add MomentsTab component with expandable cards"
```

---

## Task 7: Add CSS for Moments components

**Files:**
- Modify: `src/styles/index.css`

**Step 1: Add CSS at the end of the file**

Search for the end of the file and append:

```css
/* ============================================================
   MOMENTS
   ============================================================ */

.moments-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-md);
}

.moments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.moment-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.moment-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  user-select: none;
  background: var(--surface-secondary);
  gap: var(--spacing-sm);
}

.moment-card-header:hover {
  background: var(--surface-tertiary);
}

.moment-card-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  min-width: 0;
}

.moment-title {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.moment-date,
.moment-location {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.moment-expand-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.moment-card-body {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}

.moment-notes {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  margin: 0;
}

.moment-people {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.moment-people-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-right: var(--spacing-xs);
}

.moment-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--surface-tertiary);
  border: 1px solid var(--border-color);
  font-size: var(--font-size-xs);
}

.moment-chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
}

.moment-chip-remove:hover {
  color: var(--color-danger);
}

.moment-people-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.moment-suggestions {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  max-height: 180px;
  overflow-y: auto;
}

.moment-suggestion-item button {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.moment-suggestion-item button:hover {
  background: var(--surface-secondary);
}

.moment-card-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.moment-delete-btn {
  color: var(--color-danger);
}
```

**Step 2: Run tests**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 3: Build to check for CSS errors**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds.

**Step 4: Commit**

```bash
git add src/styles/index.css
git commit -m "feat: add Moments CSS styles"
```

---

## Task 8: Wire Moments into ContactProfile

**Files:**
- Modify: `src/pages/ContactProfile.js`

**Step 1: Write the failing test**

In `src/pages/__tests__/ContactProfile.moments.test.js` (create new):

```js
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

// Minimal mocks for ContactProfile dependencies
vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn(() => Promise.resolve({ headers: [], data: [] })),
  readSheetMetadata: vi.fn(() => Promise.resolve({ headers: [] })),
  getContactTouchpoints: vi.fn(() => Promise.resolve([])),
  updateContact: vi.fn(),
  addTouchpoint: vi.fn(),
  updateTouchpoint: vi.fn(),
  deleteTouchpoint: vi.fn(),
  copyContactToWorkspace: vi.fn(),
  logActivity: vi.fn(),
  getContactActivities: vi.fn(() => Promise.resolve([])),
  getContactNotes: vi.fn(() => Promise.resolve([])),
  addNote: vi.fn(),
  linkNoteToContact: vi.fn(),
  getContactEmployment: vi.fn(() => Promise.resolve([])),
  getMomentsForContact: vi.fn(() => Promise.resolve([])),
  addMoment: vi.fn(),
  updateMoment: vi.fn(),
  deleteMoment: vi.fn(),
  SHEETS: { CONTACTS: 'Contacts', EVENTS: 'Events', ORGANIZATIONS: 'Organizations', TASKS: 'Tasks', MOMENTS: 'Moments' },
  ACTIVITY_TYPES: {},
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'test@test.com' }, accessToken: 'token' }),
}));
vi.mock('../../utils/sheetResolver', () => ({
  useActiveSheetId: () => 'sheet1',
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ mode: 'personal', userWorkspaces: [], activeWorkspace: null }),
}));
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { success: vi.fn(), error: vi.fn() } }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ canWrite: () => true }),
}));

describe('ContactProfile Moments tab', () => {
  it('renders a Moments tab in the tab bar', async () => {
    render(
      <MemoryRouter initialEntries={['/contacts/CON001']}>
        <Routes>
          <Route path="/contacts/:id" element={<ContactProfile onNavigate={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );
    // The tab bar should include "Moments"
    // (component loads async, so we just check the tab renders once not loading)
    // This test confirms the tab exists in CONTENT_TABS
    const { default: ContactProfile } = await import('../../pages/ContactProfile');
    // Re-render with the actual component
    render(
      <MemoryRouter initialEntries={['/contacts/CON001']}>
        <Routes>
          <Route path="/contacts/:id" element={<ContactProfile onNavigate={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );
    // Moments tab should be visible in the tab bar
    expect(await screen.findByRole('button', { name: 'Moments' })).toBeInTheDocument();
  });
});
```

Note: This test just verifies the tab exists. Full integration testing of the Moments tab behavior is covered by MomentsTab.test.js.

**Step 2: Run test to verify it fails**

```bash
npm test -- src/pages/__tests__/ContactProfile.moments.test.js --run
```
Expected: FAIL — no "Moments" button found.

**Step 3: Make changes to ContactProfile.js**

**3a.** Add `moments` to imports from `devModeWrapper` (line ~8):

```js
import {
  // ... existing imports ...
  getMomentsForContact,
  addMoment,
  updateMoment,
  deleteMoment,
} from '../utils/devModeWrapper';
```

**3b.** Add new component imports (after the existing component imports, around line 50):

```js
import MomentsTab from '../components/contact/MomentsTab';
import MomentModal from '../components/contact/MomentModal';
```

**3c.** Add `'moments'` tab to `CONTENT_TABS` (line 55):

```js
const CONTENT_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'touchpoints', label: 'Touchpoints' },
  { value: 'notes', label: 'Notes' },
  { value: 'events', label: 'Events' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'moments', label: 'Moments' },   // <-- add
];
```

**3d.** Add state variables (after existing `useState` calls, around line 79):

```js
const [moments, setMoments] = React.useState([]);
const [showMomentModal, setShowMomentModal] = useState(false);
const [editingMoment, setEditingMoment] = useState(null);
const [momentData, setMomentData] = useState({
  Title: '',
  Type: 'Vacation',
  'Start Date': '',
  'End Date': '',
  Location: '',
  Notes: '',
  'Contact IDs': contactId,
});
const [savingMoment, setSavingMoment] = useState(false);
const [showDeleteMomentConfirm, setShowDeleteMomentConfirm] = useState(false);
const [momentToDelete, setMomentToDelete] = useState(null);
```

**3e.** Add `getMomentsForContact` to the `Promise.all` in `loadContact` (around line 106):

```js
const [
  contactsResult,
  touchpointsResult,
  metaResult,
  activitiesResult,
  notesResult,
  eventsResult,
  employmentResult,
  orgsResult,
  tasksResult,
  momentsResult,   // <-- add
] = await Promise.all([
  readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
  getContactTouchpoints(accessToken, sheetId, contactId),
  readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS),
  getContactActivities(contactId),
  getContactNotes(accessToken, sheetId, contactId, user?.email),
  readSheetData(accessToken, sheetId, SHEETS.EVENTS),
  getContactEmployment(accessToken, sheetId, contactId),
  readSheetData(accessToken, sheetId, SHEETS.ORGANIZATIONS),
  readSheetData(accessToken, sheetId, SHEETS.TASKS),
  getMomentsForContact(accessToken, sheetId, contactId),  // <-- add
]);
```

Then after the other `actions.set*` calls, add:

```js
setMoments(momentsResult || []);
```

**3f.** Add Moment handlers (after `handleSaveEdit` or in a logical grouping):

```js
const EMPTY_MOMENT = {
  Title: '',
  Type: 'Vacation',
  'Start Date': '',
  'End Date': '',
  Location: '',
  Notes: '',
  'Contact IDs': contactId,
};

const handleOpenAddMoment = () => {
  setEditingMoment(null);
  setMomentData({ ...EMPTY_MOMENT, 'Contact IDs': contactId });
  setShowMomentModal(true);
};

const handleOpenEditMoment = (moment) => {
  setEditingMoment(moment);
  setMomentData({
    Title: moment.Title || '',
    Type: moment.Type || 'Vacation',
    'Start Date': moment['Start Date'] || '',
    'End Date': moment['End Date'] || '',
    Location: moment.Location || '',
    Notes: moment.Notes || '',
    'Contact IDs': moment['Contact IDs'] || contactId,
  });
  setShowMomentModal(true);
};

const handleSaveMoment = async () => {
  try {
    setSavingMoment(true);
    if (editingMoment) {
      const updated = await updateMoment(
        accessToken,
        sheetId,
        editingMoment['Moment ID'],
        momentData
      );
      setMoments((prev) =>
        prev.map((m) => (m['Moment ID'] === updated['Moment ID'] ? updated : m))
      );
      notify.success('Moment updated.');
    } else {
      const created = await addMoment(accessToken, sheetId, momentData);
      setMoments((prev) => [...prev, created]);
      notify.success('Moment logged.');
    }
    setShowMomentModal(false);
    setEditingMoment(null);
  } catch (err) {
    console.error('Failed to save moment:', err);
    notify.error(err.message || 'Failed to save moment.');
  } finally {
    setSavingMoment(false);
  }
};

const handleDeleteMoment = (momentId) => {
  setMomentToDelete(momentId);
  setShowDeleteMomentConfirm(true);
};

const handleConfirmDeleteMoment = async () => {
  try {
    await deleteMoment(accessToken, sheetId, momentToDelete);
    setMoments((prev) => prev.filter((m) => m['Moment ID'] !== momentToDelete));
    notify.success('Moment deleted.');
  } catch (err) {
    console.error('Failed to delete moment:', err);
    notify.error(err.message || 'Failed to delete moment.');
  } finally {
    setShowDeleteMomentConfirm(false);
    setMomentToDelete(null);
  }
};
```

**3g.** Add Moments tab render inside the content card (after the `relationships` tab block):

```jsx
{state.contentView === 'moments' && (
  <MomentsTab
    moments={moments}
    allContacts={allContacts}
    currentContactId={contactId}
    canWrite={canWrite('contacts')}
    onAdd={handleOpenAddMoment}
    onEdit={handleOpenEditMoment}
    onDelete={handleDeleteMoment}
  />
)}
```

**3h.** Add the MomentModal and delete ConfirmDialog (alongside other modals at the bottom of the JSX return):

```jsx
{showMomentModal && (
  <MomentModal
    isOpen={showMomentModal}
    onClose={() => {
      setShowMomentModal(false);
      setEditingMoment(null);
    }}
    onSave={handleSaveMoment}
    saving={savingMoment}
    momentId={editingMoment?.['Moment ID'] || null}
    momentData={momentData}
    setMomentData={setMomentData}
    allContacts={allContacts}
    currentContactId={contactId}
  />
)}

<ConfirmDialog
  isOpen={showDeleteMomentConfirm}
  title="Delete Moment"
  message="Are you sure you want to delete this moment? This cannot be undone."
  confirmLabel="Delete"
  onConfirm={handleConfirmDeleteMoment}
  onCancel={() => {
    setShowDeleteMomentConfirm(false);
    setMomentToDelete(null);
  }}
/>
```

**Step 4: Run the new test**

```bash
npm test -- src/pages/__tests__/ContactProfile.moments.test.js --run
```
Expected: PASS.

**Step 5: Run full test suite**

```bash
npm test -- --run
```
Expected: all tests pass.

**Step 6: Build**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds with no errors.

**Step 7: Commit**

```bash
git add src/pages/ContactProfile.js src/pages/__tests__/ContactProfile.moments.test.js
git commit -m "feat: wire Moments tab into ContactProfile with full CRUD"
```

---

## Final Verification

```bash
npm test -- --run
npm run build
```

Both must pass with zero errors before marking this feature complete.
