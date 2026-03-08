# Moments Feature Design

**Date:** 2026-03-08
**Status:** Approved, ready for implementation

## Overview

Add a "Moments" feature to Folkbase — a way to log life events (vacations, trips, family events, funerals, celebrations, etc.) and attach them to contact profiles. Moments are shared across contacts via a `ContactIDs` field, not a junction table, to minimize Google Sheets API calls.

---

## Data Schema

**New sheet tab: `Moments`**

| Column | Notes |
|---|---|
| `MomentID` | Auto-generated, format `MOM001` |
| `Title` | e.g. "Beach vacation in Florida" |
| `Type` | Vacation \| Trip \| Family Event \| Funeral \| Celebration \| Other |
| `StartDate` | ISO date string |
| `EndDate` | Optional |
| `Location` | Free text |
| `Notes` | Free text |
| `ContactIDs` | Comma-separated, e.g. `CON001,CON004,CON012` |
| `CreatedAt` | Timestamp |

---

## Architecture

- **Single `Moments` tab** — no junction table. `ContactIDs` is a comma-separated field. Load all Moments once, filter client-side by whether `contactId` appears in `ContactIDs`. One API call per load.
- All functions wrapped in `devModeWrapper.js` so dev mode (localStorage) works transparently.
- New `MOMENTS` key added to `SHEET_NAMES` and `SHEET_HEADERS` in `constants.js`.
- ID format `MOM001` registered alongside other ID formats in `constants.js`.

### Data Functions

| Function | Description |
|---|---|
| `getMomentsForContact(sheetId, contactId)` | Loads all Moments tab rows, filters client-side where `ContactIDs` contains `contactId` |
| `addMoment(sheetId, momentData)` | Appends a new row, auto-generates `MOM` ID |
| `updateMoment(sheetId, momentId, updates)` | Finds row by `MomentID`, updates in place |
| `deleteMoment(sheetId, momentId)` | Finds row by `MomentID`, removes it |

---

## UI

### Placement

New **"Moments"** tab in `ContactProfile.js`, alongside Touchpoints, Notes, Events, Tasks, Relationships.

### List View

- Cards sorted newest-first
- Each card shows: title, type badge, date(s), location (if set), truncated notes preview
- Click card header to expand inline (same pattern as `TimelineItem`)

### Expanded Card

- Full notes
- Tagged people as clickable contact pills (clicking navigates to that contact's profile)
- Edit + Delete buttons

### Add / Edit Modal

- Size `"lg"`
- Fields: Title, Type, Start Date, End Date, Location, Notes, People
- People field: contact search input — type to find contacts, adds as removable pills
- Edit modal pre-fills all fields

### Delete

Uses existing `ConfirmDialog` pattern (consistent with rest of app).

### Empty State

"No moments logged yet." with an Add Moment button.

---

## Implementation Order

1. **Constants** — add `MOMENTS` to `SHEET_NAMES`, `SHEET_HEADERS`, and ID format prefix
2. **`sheets.js`** — raw Sheets API CRUD functions
3. **`devModeWrapper.js`** — localStorage equivalents + exported wrappers
4. **`MomentModal.js`** — Add/Edit modal component
5. **`MomentsTab.js`** — tab content: list, expandable cards, empty state
6. **Wire into `ContactProfile.js`** — add "Moments" tab, pass handlers
