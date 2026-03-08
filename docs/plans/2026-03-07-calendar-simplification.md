# Calendar Simplification: Folkbase-Primary Event Model

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Folkbase the single source of truth for events. Google Calendar becomes an optional output channel for sending invites — not a sync partner.

**Architecture:** Remove bidirectional auto-sync (useCalendarSync, syncEngine, SyncConflictModal). Keep one-directional push for sending Calendar invites on demand. Keep ImportEventModal for pulling Calendar events into Folkbase. Add a lightweight Calendar fetch for CalendarView display.

**Tech Stack:** React, Google Calendar API v3 (via existing calendarApi.js + devModeWrapper.js), existing eventTransformers.js

---

### Task 1: Remove auto-sync hook from App.js

**Files:**
- Modify: `src/App.js:7,78`

**Step 1: Remove the import and call**

Remove line 7 (`import { useCalendarSync } from './hooks/useCalendarSync';`) and line 78 (`useCalendarSync();`).

```js
// DELETE these two lines:
// Line 7:  import { useCalendarSync } from './hooks/useCalendarSync';
// Line 78: useCalendarSync();
```

**Step 2: Run the build to verify no errors**

Run: `npm run build`
Expected: Build succeeds. No import errors.

**Step 3: Commit**

```bash
git add src/App.js
git commit -m "refactor: remove auto-sync calendar hook from App.js"
```

---

### Task 2: Remove auto-push from AddEvent

Currently `src/pages/AddEvent.js:96-124` auto-pushes to Google Calendar on every new event. Remove this — Calendar invites become an explicit action on EventDetails after creation.

**Files:**
- Modify: `src/pages/AddEvent.js:10-12,93-124`

**Step 1: Remove Calendar imports**

Remove `createCalendarEvent` from the devModeWrapper import (line 10) and the `crmEventToGoogleEvent` import (line 12). Also remove `hasCalendarAccess` from the useAuth destructuring (line 17).

```js
// Line 6-11: Change FROM:
import {
  readSheetData,
  SHEETS,
  generateEventID,
  createCalendarEvent,
} from '../utils/devModeWrapper';
import { crmEventToGoogleEvent } from '../utils/eventTransformers';

// Change TO:
import {
  readSheetData,
  SHEETS,
  generateEventID,
} from '../utils/devModeWrapper';

// Line 17: Change FROM:
const { accessToken, refreshAccessToken, hasCalendarAccess } = useAuth();
// Change TO:
const { accessToken, refreshAccessToken } = useAuth();
```

**Step 2: Remove the calendar push block from handleSubmit**

Remove lines 96-124 (the calendar sync check and push). The simplified handleSubmit should go straight from generating the event ID to building eventData and calling addEvent:

```js
// In handleSubmit, REMOVE this entire block (lines 96-124):
//   // Check if calendar sync is enabled
//   const settings = ...
//   const calendarSyncEnabled = ...
//   ...
//   // If calendar sync is enabled, create Google Calendar event first
//   if (calendarSyncEnabled) { ... }

// The function should flow:
//   const eventId = await generateEventID(accessToken, sheetId);
//   const eventData = { 'Event ID': eventId, ...formData, Attendees: formData['Attendees'].join(',') };
//   const sanitizedEventData = sanitizeFormData(eventData, SCHEMAS.event);
//   await addEvent(accessToken, sheetId, sanitizedEventData, refreshAccessToken);
```

**Step 3: Run existing tests**

Run: `npm test -- --run src/pages/__tests__/AddEvent.test.js`
Expected: 2 tests pass. The tests already mock `hasCalendarAccess` to return false, so removing the calendar branch won't break them.

**Step 4: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/pages/AddEvent.js
git commit -m "refactor: remove auto-push to Calendar from AddEvent"
```

---

### Task 3: Remove sync UI from EventsList

Remove: syncEngine import, SyncConflictModal import, sync-related state, `handleSync`, `handleConflictResolved`, `handleConflictModalClose`, sync status bar, SyncConflictModal render.

Keep: ImportEventModal, import-related handlers, `calendarSyncEnabled` check (still needed for import button visibility), `personalEvents` state (will be populated differently in Task 6).

**Files:**
- Modify: `src/pages/EventsList.js:2,6,11,29-40,42-51,110-168,302-333,496-502`

**Step 1: Remove sync imports**

```js
// Line 2: Remove RefreshCw from lucide-react import (only if not used elsewhere)
// Line 6: DELETE: import { syncEvents } from '../utils/syncEngine';
// Line 11: DELETE: import SyncConflictModal from '../components/events/SyncConflictModal';
```

**Step 2: Remove sync-related state**

Remove these state declarations (keep `personalEvents` and `calendarSyncEnabled` and `importModalOpen`/`selectedGoogleEvent`):

```js
// DELETE these lines:
const [syncing, setSyncing] = useState(false);
const [conflicts, setConflicts] = useState([]);
const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
const [syncStatus, setSyncStatus] = useState({
  lastSyncedAt: null,
  lastPushed: 0,
  lastPulled: 0,
});
```

**Step 3: Remove sync status localStorage read**

Delete the useEffect at lines 42-51 that reads `touchpoint_calendar_sync_status`.

```js
// DELETE this entire useEffect:
useEffect(() => {
  const stored = localStorage.getItem('touchpoint_calendar_sync_status');
  if (stored) {
    try {
      setSyncStatus(JSON.parse(stored));
    } catch {
      // Invalid stored status, use defaults
    }
  }
}, []);
```

**Step 4: Remove conflict and sync handlers**

Delete `handleConflictResolved` (lines 110-118), `handleConflictModalClose` (lines 120-123), and `handleSync` (lines 125-168).

**Step 5: Remove sync status bar from JSX**

Delete the entire sync section div (lines 302-333):

```jsx
// DELETE this block:
{calendarSyncEnabled && (
  <div className="el-sync-section">
    ...sync status + sync button...
  </div>
)}
```

Also remove the `RefreshCw` import from lucide-react if it's no longer used (check — it was only used in the sync button).

**Step 6: Remove SyncConflictModal render**

Delete lines 496-502:

```jsx
// DELETE:
<SyncConflictModal
  isOpen={conflicts.length > 0}
  onClose={handleConflictModalClose}
  conflict={conflicts[currentConflictIndex]}
  onResolved={handleConflictResolved}
  contacts={contacts}
/>
```

**Step 7: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 8: Commit**

```bash
git add src/pages/EventsList.js
git commit -m "refactor: remove sync UI and conflict resolution from EventsList"
```

---

### Task 4: Simplify SettingsPage calendar section

Remove: manual sync button, sync status display, auto-sync toggle + interval, conflict resolution dropdown. Keep: Connect/Disconnect Calendar button, calendar selector dropdown, Enable toggle (repurpose as "Connect Calendar" on/off).

**Files:**
- Modify: `src/pages/SettingsPage.js:14-15,47-62,114-119,319-350,751-964`

**Step 1: Remove sync-related imports and state**

```js
// Line 15: Remove FolderSync from lucide-react import
// Lines 57-62: Remove syncStatus state
// Lines 114-119: Remove the useEffect that reads touchpoint_calendar_sync_status
// Lines 319-350: Remove handleManualSync function
```

**Step 2: Simplify the calendar settings UI**

Replace the section starting at line 751 with a simplified version. The section should have:
1. Section heading: "Google Calendar" (not "Google Calendar Sync")
2. Description: "Connect Google Calendar to import events and send calendar invites to attendees."
3. Connect button (existing, keep as-is)
4. When connected: Calendar selector dropdown (existing, keep as-is)
5. Remove: "Enable Sync" checkbox, sync status display, "Sync Now" button, auto-sync toggle + interval, conflict resolution dropdown

```jsx
{/* Calendar Section */}
<section className="sp-section">
  <h2 className="sp-section-heading">
    <Calendar size={18} />
    Google Calendar
  </h2>

  <div className="sp-cal-body">
    <p className="sp-section-desc">
      Connect Google Calendar to import events and send calendar invites to attendees.
    </p>

    {!calendarAccess ? (
      <div>
        {/* Keep existing Connect button exactly as-is (lines 766-793) */}
      </div>
    ) : (
      <div className="sp-cal-settings">
        <div className="sp-cal-connected">
          <CheckCircle size={16} className="sp-icon-success" />
          <span className="sp-cal-connected-label">Calendar Connected</span>
        </div>

        {/* Keep existing calendar selector dropdown (lines 821-851) */}
        <div className="sp-cal-subsection">
          <label className="sp-cal-setting-label">Default Calendar</label>
          {/* ... existing calendar dropdown ... */}
        </div>
      </div>
    )}
  </div>
</section>
```

The key change: when calendar is connected, only show the calendar selector. No sync toggles, no sync status, no conflict resolution.

**Step 3: Update calendarSettings state shape**

The `calendarSettings` state initializer can be simplified. We still write `enabled` to localStorage because `EventDetails` and `CalendarView` read it. But we no longer need `autoSync`, `autoSyncInterval`, or `conflictResolution`:

```js
const [calendarSettings, setCalendarSettings] = useState({
  enabled: false,
  selectedCalendarId: 'primary',
});
```

When reading from localStorage, the old shape (with extra fields) is still valid — we just ignore the extra keys.

**Step 4: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/pages/SettingsPage.js
git commit -m "refactor: simplify SettingsPage calendar section — remove sync UI"
```

---

### Task 5: Add "Send Calendar Invites" button to EventDetails

This is the core new feature. Add a button on the EventDetails page that pushes the event to Google Calendar with attendees, sending invite emails.

**Files:**
- Modify: `src/pages/EventDetails.js:3,21-29,43-73,303-329,446-461,715-813`
- Test: `src/pages/__tests__/EventDetails.test.js`

**Step 1: Write the failing test**

Add a test to `src/pages/__tests__/EventDetails.test.js`:

```js
it('shows "Send Calendar Invites" button for future events with attendees', async () => {
  // Override the mock to return a future event with attendees
  const { readSheetData } = await import('../../utils/devModeWrapper');
  readSheetData.mockImplementation((_a, _b, sheet) => {
    if (sheet === 'Events') {
      return Promise.resolve({
        data: [
          {
            'Event ID': 'EVT001',
            'Event Name': 'Future Meeting',
            'Event Date': '2099-01-01',
            Attendees: 'CON001',
            'Unresolved Attendees': '[]',
          },
        ],
      });
    }
    if (sheet === 'Contacts') {
      return Promise.resolve({
        data: [
          {
            'Contact ID': 'CON001',
            'First Name': 'Jane',
            'Last Name': 'Doe',
            Email: 'jane@example.com',
          },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  render(<EventDetails onNavigate={vi.fn()} />);
  expect(await screen.findByText('Send Calendar Invites')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/__tests__/EventDetails.test.js`
Expected: FAIL — "Send Calendar Invites" text not found.

**Step 3: Add Calendar invite state and handler**

In EventDetails, add imports and state:

```js
// Add to useAuth destructuring:
const { accessToken, refreshAccessToken, user, hasCalendarAccess } = useAuth();

// Add state:
const [sendingInvites, setSendingInvites] = useState(false);
const [calendarConnected, setCalendarConnected] = useState(false);

// Add useEffect to check calendar access:
useEffect(() => {
  const check = async () => {
    const settings = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
    const hasAccess = await hasCalendarAccess();
    setCalendarConnected(settings.enabled === true && hasAccess);
  };
  check();
}, [hasCalendarAccess]);
```

Add the handler function:

```js
const handleSendCalendarInvites = async () => {
  setSendingInvites(true);
  try {
    const googleEvent = crmEventToGoogleEvent(event, allContacts);

    if (event['Google Calendar ID']) {
      // Update existing Calendar event
      await updateCalendarEvent(accessToken, event['Google Calendar ID'], googleEvent);
    } else {
      // Create new Calendar event
      const { createCalendarEvent } = await import('../utils/devModeWrapper');
      const created = await createCalendarEvent(accessToken, googleEvent, event['Event ID']);
      await updateEvent(accessToken, sheetId, id, {
        'Google Calendar ID': created.id,
        'Sync Source': 'CRM',
        'Last Synced At': new Date().toISOString(),
      });
    }

    await updateEvent(accessToken, sheetId, id, {
      'Last Synced At': new Date().toISOString(),
    });

    // Count attendees with emails
    const attendeesWithEmail = allContacts.filter((c) => {
      const ids = (event['Attendees'] || '').split(',').map((i) => i.trim());
      return ids.includes(c['Contact ID']) && c['Email'];
    });

    notify.success(
      `Calendar invites sent to ${attendeesWithEmail.length} attendee(s) with email addresses`
    );
    loadEventDetails();
  } catch (error) {
    console.error('Failed to send calendar invites:', error);
    notify.error('Failed to send calendar invites. Check your calendar connection.');
  } finally {
    setSendingInvites(false);
  }
};
```

**Step 4: Update the sync badge text**

Change the badge at line 446-461. Replace "Synced" with "Calendar invite sent":

```jsx
{event['Google Calendar ID'] && (
  <span
    className="ed-sync-badge"
    title={`${event['Sync Source'] === 'Imported' ? 'Imported from' : 'Invite sent via'} Google Calendar${event['Last Synced At'] ? ` (${new Date(event['Last Synced At']).toLocaleString()})` : ''}`}
  >
    {event['Sync Source'] === 'Imported' ? (
      <>
        <CalendarIcon size={12} /> Imported
      </>
    ) : (
      <>
        <CalendarIcon size={12} /> Invite Sent
      </>
    )}
  </span>
)}
```

**Step 5: Add the "Send Calendar Invites" button to the Attendees card**

After the "Log Touchpoints for All" button (around line 763), add:

```jsx
{!isPastEvent && calendarConnected && canWrite('events') && (
  <button
    className="btn btn-secondary ed-log-all-btn"
    onClick={handleSendCalendarInvites}
    disabled={sendingInvites}
  >
    <CalendarIcon size={16} />
    {sendingInvites
      ? 'Sending...'
      : event['Google Calendar ID']
        ? 'Update Calendar Invites'
        : 'Send Calendar Invites'}
  </button>
)}
```

This button appears when:
- Event is in the future (`!isPastEvent`)
- Calendar is connected (`calendarConnected`)
- User has write permission (`canWrite('events')`)

Label changes to "Update Calendar Invites" if already sent once.

**Step 6: Run tests**

Run: `npm test -- --run src/pages/__tests__/EventDetails.test.js`
Expected: All tests pass (including the new one).

**Step 7: Run the full build**

Run: `npm run build`
Expected: Build succeeds.

**Step 8: Commit**

```bash
git add src/pages/EventDetails.js src/pages/__tests__/EventDetails.test.js
git commit -m "feat: add Send Calendar Invites button to EventDetails"
```

---

### Task 6: Add lightweight Calendar fetch for CalendarView

Currently `CalendarView` gets `googleCalendarEvents` from the sync engine result. With sync removed, we need a direct fetch so CalendarView still shows personal Google Calendar events.

**Files:**
- Modify: `src/pages/EventsList.js`

**Step 1: Add Calendar fetch to EventsList**

Add a useEffect that fetches calendar events when calendar is connected and view mode is 'calendar':

```js
// Add import at top:
import { useAuth } from '../contexts/AuthContext';
// (already imported)

// After the calendarSyncEnabled useEffect, add:
useEffect(() => {
  const fetchPersonalEvents = async () => {
    if (!calendarSyncEnabled || viewMode !== 'calendar') {
      return;
    }
    try {
      const { fetchCalendarEvents } = await import('../utils/devModeWrapper');
      const now = new Date();
      const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
      const gcalEvents = await fetchCalendarEvents(accessToken, timeMin, timeMax);

      // Filter to only personal events (not managed by Folkbase)
      const personal = gcalEvents.filter(
        (e) => e.extendedProperties?.private?.touchpointManaged !== 'true'
      );
      setPersonalEvents(personal);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      // Silently fail — calendar overlay is optional
    }
  };
  fetchPersonalEvents();
}, [calendarSyncEnabled, viewMode, accessToken]);
```

This only fetches when the user switches to Calendar view AND has Calendar connected. Lazy loading — no upfront cost.

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/pages/EventsList.js
git commit -m "feat: fetch personal Calendar events for CalendarView display"
```

---

### Task 7: Delete dead sync files

With all callers removed, these files are dead code.

**Files:**
- Delete: `src/hooks/useCalendarSync.js`
- Delete: `src/utils/syncEngine.js`
- Delete: `src/components/events/SyncConflictModal.js`

**Step 1: Verify no remaining imports**

Run a grep to confirm nothing still imports these:

```bash
grep -r "useCalendarSync\|syncEngine\|SyncConflictModal" src/ --include="*.js"
```

Expected: No results (all import sites were cleaned up in Tasks 1-4).

**Step 2: Delete the files**

```bash
rm src/hooks/useCalendarSync.js
rm src/utils/syncEngine.js
rm src/components/events/SyncConflictModal.js
```

**Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 4: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete dead sync files (useCalendarSync, syncEngine, SyncConflictModal)"
```

---

### Task 8: Clean up stale localStorage keys

The `touchpoint_calendar_sync_status` key is no longer written or read by anything. Clean up references.

**Files:**
- Modify: `src/contexts/ConfigContext.js` (the `ensureConfigForUser` function that clears per-user keys)

**Step 1: Remove sync status from the wipe list**

In `ConfigContext.js`, find the line that removes `touchpoint_calendar_sync_status` in `ensureConfigForUser` and remove it (since it's no longer used, there's nothing to wipe on account switch).

If the key is listed alongside other keys being cleared, just remove that one entry.

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/contexts/ConfigContext.js
git commit -m "chore: remove stale touchpoint_calendar_sync_status localStorage cleanup"
```

---

### Task 9: Final verification

**Step 1: Run full test suite**

Run: `npm test -- --run`
Expected: All tests pass.

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no warnings about missing imports.

**Step 3: Grep for any remaining sync references**

```bash
grep -r "syncEvents\|resolveConflict\|deleteSyncedEvent\|SyncConflictModal\|useCalendarSync\|touchpoint_calendar_sync_status" src/ --include="*.js"
```

Expected: No results.

**Step 4: Grep for any remaining auto-sync settings references**

```bash
grep -r "autoSync\|autoSyncInterval\|conflictResolution" src/ --include="*.js"
```

Expected: No results (or only in localStorage read code that gracefully ignores unknown keys).

**Step 5: Final commit (if any cleanup needed)**

---

## Impact Summary

| What | Before | After |
|------|--------|-------|
| Auto background sync | Every 30 min via useCalendarSync | Removed |
| Bidirectional sync | Calendar changes update Folkbase | Removed |
| Conflict resolution | SyncConflictModal + resolution UI | Removed |
| Event creation | Auto-pushes to Calendar | Folkbase-only |
| Calendar invites | Side effect of sync | Explicit "Send Calendar Invites" button |
| CalendarView | Shows personal events from sync result | Lazy-fetches on demand |
| Settings | 6 calendar config options | Connect toggle + calendar selector |
| EventDetails badge | "Synced" | "Invite Sent" or "Imported" |

## Files NOT Changed (verified safe)

- `src/utils/calendarApi.js` — low-level API, still needed for push + import
- `src/utils/eventTransformers.js` — pure functions, still needed
- `src/utils/devModeWrapper.js` — calendar wrappers stay (used by EventDetails, ImportEventModal)
- `src/components/events/ImportEventModal.js` — zero sync dependency, works as-is
- `src/components/events/CalendarView.js` — interface unchanged, still receives props
- `src/components/events/AttendeeSelector.js` — unrelated
- `src/pages/ContactReviewPage.js` — unresolved attendee review, unrelated
- All test files — existing tests continue to pass
