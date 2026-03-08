# Contact Review Queue — Design

## Goal

Surface incomplete contacts one at a time. Let user braindump what they know. Save detected entities back to the contact. No AI. No external calls. No new sheet tabs.

---

## Completeness Score

Computed locally in JS. Score = filled core fields / 9 core fields.

Core fields:
- `First Name` or `Last Name` (counts as 1 if either present)
- `Email Personal` or `Email Work` (counts as 1 if either present)
- `Phone Mobile` or `Phone Home` (counts as 1 if either present)
- `Organization`
- `Role`
- `Tags`
- `Bio`
- `Notes`
- `Last Contact Date`

Score range: 0–9. Queue sorts ascending (lowest score first).

Utility: `src/utils/contactCompleteness.js`

```js
export function scoreContact(contact) {
  let score = 0;
  if (contact['First Name'] || contact['Last Name']) score++;
  if (contact['Email Personal'] || contact['Email Work']) score++;
  if (contact['Phone Mobile'] || contact['Phone Home']) score++;
  if (contact['Organization']) score++;
  if (contact['Role']) score++;
  if (contact['Tags']) score++;
  if (contact['Bio']) score++;
  if (contact['Notes']) score++;
  if (contact['Last Contact Date']) score++;
  return score; // 0–9
}
```

---

## Snooze / Dismiss Storage

**localStorage only** (device-local, no API calls).

Keys:
- `folkbase_review_snoozed` — JSON object: `{ [contactId]: isoDateString }` (snooze expires after 7 days)
- `folkbase_review_dismissed` — JSON array of contact IDs permanently dismissed from queue

Show a `ⓘ` tooltip on Skip button: *"Snooze is saved on this device only."*

---

## New Files

| File | Purpose |
|------|---------|
| `src/utils/contactCompleteness.js` | `scoreContact(contact)` — returns 0–9 |
| `src/pages/ContactReviewPage.js` | Queue list + review panel |
| `src/pages/ContactReviewPage.css` | Styles |

No new sheet tabs. No new sheet columns.

---

## ContactReviewPage

### Queue view

1. Load contacts via `readSheetData` (hits IndexedDB cache — no extra API quota).
2. Filter out dismissed contact IDs (from `folkbase_review_dismissed`).
3. Filter out snoozed contact IDs where snooze date has not expired.
4. Score remaining contacts with `scoreContact()`.
5. Sort ascending by score. Show top 50 max.
6. Render each as a card: avatar, display name, score bar (`X / 9 fields`).
7. Clicking a card opens the braindump panel for that contact.

### Braindump panel

Rendered inline below the card (no navigation away).

Elements:
- Contact name heading
- `<textarea>` placeholder: `"Write anything you know about [Name]..."`
  - `maxLength={10000}` (matches `INPUT_LIMITS.veryLongText`)
- Entity suggestions rendered by existing `<EntitySuggestionsPanel>` component
  - Reuses `useEntityDetection(text, { contacts, events })`
  - User confirms/dismisses each suggestion — nothing auto-writes
- Three action buttons: **Save**, **Skip for now**, **Done for now**

### Save action

1. Collect confirmed entity suggestions (tags, org, events).
2. Build `updateData` object with only the confirmed fields.
3. Run `sanitizeFormData(updateData, SCHEMAS.contact)` — **required, no exceptions**.
4. Call `updateContact(accessToken, sheetId, contactId, sanitizedData)`.
5. Save raw textarea text as a Note: `addNote(accessToken, sheetId, { Content: sanitizedRawText, 'Note Type': 'Review', Visibility: 'Private' }, user?.email)` then `linkNoteToContact(...)`.
6. Remove contact from queue (add to dismissed list).
7. Advance to next card.

### Skip action

Store `{ [contactId]: new Date().toISOString() }` in `folkbase_review_snoozed`. Show tooltip. Advance to next card.

### Done for now action

Navigate back to contacts list via `onNavigate('contacts')`.

---

## Reused (do not duplicate)

| What | Where |
|------|-------|
| `useEntityDetection` | `src/hooks/useEntityDetection.js` |
| `EntitySuggestionsPanel` | `src/components/braindump/EntitySuggestionsPanel.js` |
| `addNote`, `linkNoteToContact`, `updateContact`, `readSheetData` | `src/utils/devModeWrapper.js` |
| `sanitizeFormData`, `SCHEMAS` | `src/utils/inputSanitizer.js` |
| `useActiveSheetId` | `src/utils/sheetResolver.js` |
| `usePermissions` / `guardWrite` | `src/hooks/usePermissions.js` |
| `WindowTemplate` | `src/components/WindowTemplate.js` — use `size="lg"` if modal needed |

---

## Routing

Add lazy route in `src/App.js`:

```js
const ContactReviewPage = React.lazy(() => import('./pages/ContactReviewPage'));
// route: /contacts/review
```

Add nav entry point from `ContactList.js` (a button or link — exact placement TBD by implementer).

---

## Security checklist

- [ ] All writes go through `sanitizeFormData(data, SCHEMAS.contact)` before `updateContact`
- [ ] Raw braindump text goes through `sanitizeStringInput(text, INPUT_LIMITS.veryLongText)` before `addNote`
- [ ] No eval, no innerHTML, no dangerouslySetInnerHTML
- [ ] Entity detection reads only from contacts/events already loaded — no external lookups

---

## What this is NOT

- No AI. Detection is fuzzy string matching (`string-similarity` library) against the user's own data.
- No new Google Sheets tabs or columns.
- No cross-device snooze sync (by design — localStorage only).
- No auto-writing of any detected entity without explicit user confirmation.
