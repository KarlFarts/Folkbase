# Touchpoint CRM - Testing Feedback

**Started:** February 17, 2026
**Tester:** Elliott
**Related roadmap:** `docs/plans/2026-02-15-unified-roadmap.md`

This document tracks real-world testing feedback as Elliott goes through the app. Each section corresponds to a feature area. Feedback entries are logged with a date and a priority level.

---

## Instructions for AI Agents

When picking up work from this document:

1. **Read the roadmap first** — `docs/plans/2026-02-15-unified-roadmap.md` is the master plan. This doc is a layer on top of it, adding real user feedback to guide prioritization.
2. **Check feedback priority** — `[HIGH]` means fix before anything else. `[MED]` is a real issue but not blocking. `[LOW]` is polish/nice-to-have.
3. **Mark items resolved** — When a feedback item is fixed, add `Fixed: <date> — <short description of fix>` below it.
4. **Add new feedback** — If the user mentions something during your session, add it to the appropriate section with today's date and a priority.
5. **Cross-reference the roadmap** — If feedback maps to a planned roadmap item, note the phase (e.g., `Roadmap: Phase 6.1`).

---

## Feedback Format

```
- [PRIORITY] <What the user saw or experienced>
  Date: YYYY-MM-DD
  Expected: <What should have happened>
  Notes: <Any extra context>
  Roadmap: <Phase X.X if applicable>
  Fixed: <date + summary, filled in when resolved>
```

---

## 1. Setup Wizard

**Flow:** Welcome → Sign In → Sheet Choice → Profile → Completion

### Feedback

- [HIGH] Buttons are hard to see during the startup/setup wizard screens — contrast issue with current color scheme.
  Date: 2026-02-17
  Expected: Primary action buttons should be clearly readable and high-contrast against the wizard background.
  Notes: Happens before sign-in, so on the very first screen a new user sees. High impact on first impressions.
  Fixed:

- [HIGH] Wizard needs a full redesign — more steps, clearer intent separation. See full design spec below.
  Date: 2026-02-17
  Expected: See "Wizard Redesign Spec" section below.
  Roadmap: Supersedes current 3-step flow. New flow is 4+ steps.
  Fixed:

### Wizard Redesign Spec

The current 3-step wizard (Welcome → Profile → Complete) needs to be expanded into a clearer flow. Here is the intended new design:

**Step 1 — Welcome**
- Keep the welcome message as-is.
- Instead of a single "Sign in with Google" button, show TWO options side by side:
  - "Sign In" (returning user)
  - "Create Account" (new user)
- Both options use Google OAuth — the distinction is UX only (Google handles whether the account is new or existing).
- Add a small text link or info button: "Why Google?" that links to an external page on Elliott's website explaining the Google-only approach and privacy model.
- "Why Google?" destination: use a placeholder `#` link for now. Will be swapped for the real URL before launch.

**Step 2 — Account Type (shown after Google auth)**
- Two options:
  - "Join a Workspace" — for users who have been invited to someone else's Touchpoint workspace.
  - "Create My Own" — personal contact book, new setup.
- If "Join a Workspace" is selected: prompt for an invite code or link, then skip directly to a confirmation/completion screen.
- If "Create My Own" is selected: continue to Step 3.

**Step 3 — Connect Services (shown only for "Create My Own" path)**
- Before profile setup, show optional service connection:
  - Google Calendar — connect button + live status indicator (connected / not connected / error)
  - Google Drive — connect button + live status indicator
- Each connection should be skippable ("Skip for now" or "I'll do this later").
- Status indicator must actually verify the connection worked, not just that the OAuth flow completed.

**Step 4 — Profile Setup**
- Same as current ProfileStep: display name + avatar color/icon.

**Step 5 — Review & Finish**
- Summary card showing:
  - Google account connected (always shown, always green)
  - Google Calendar: connected / not connected
  - Google Drive: connected / not connected
  - Sheet: will be created / will be connected (based on choice)
- Existing sheet handling (decided 2026-02-17): Use auto-discover + validate/repair.
  - On the final step, search the user's Drive for an existing Touchpoint sheet first.
  - If one is found, offer to reconnect it. Run a health check (do all tabs exist? are headers correct?).
  - Auto-repair any missing tabs via `autoCreateMissingTabs` (already in the code).
  - If no existing sheet is found, create a new one.
  - This is a combination of options 1 and 3.
- "Get Started" button at the bottom — this is when the Google Sheet is actually created (or connected).
  - Deferred to the very last step so no side effects happen until the user confirms everything.

---

## 1b. Auth / Session Persistence

### Feedback

- [HIGH] Refreshing the page logs the user out — OAuth session is not persisted across page reloads.
  Date: 2026-02-17
  Expected: User should stay signed in after a refresh. Standard behavior for any web app.
  Fixed: 2026-02-17 — Removed validateToken() live API call from restoreSession(). It was calling the tokeninfo endpoint with an Authorization header (non-standard), causing it to fail and clear the stored token on every refresh. Now trusts the stored expiry timestamp instead.

- [HIGH] Refreshing the page shows the setup wizard again even after setup is already complete.
  Date: 2026-02-17
  Expected: Once setup is done, a refresh should go straight to the dashboard. The "setup complete" state needs to survive a page reload.
  Notes: Was caused by the auth issue above — token cleared on refresh → user null → wizard shown at step 1.
  Fixed: 2026-02-17 — Resolved by the auth fix above.

---

## 2. Dashboard

**Flow:** Landing page after setup. Personal tab, recent contacts, quick actions.

### Feedback

*(No feedback yet)*

---

## 3. Contacts

**Flow:** Contact list, contact profile, add/edit contact, touchpoint history.

### Feedback

*(No feedback yet)*

---

## 4. Organizations

**Flow:** Org list, org profile, linked contacts.

### Feedback

*(No feedback yet)*

---

## 5. Events & Calendar Sync

**Flow:** Events list, add event, event detail, sync with Google Calendar.
**Note:** Calendar sync backend is fully built (Phase 3 complete). Testing should verify the UI surface.

### Feedback

*(No feedback yet)*

---

## 6. Tasks

**Flow:** Task list, task creation, task profile, completion.

### Feedback

*(No feedback yet)*

---

## 7. Notes

**Flow:** Notes inbox, note creation, linking notes to contacts/events/tasks.

### Feedback

*(No feedback yet)*

---

## 8. Lists

**Flow:** Contact lists, adding contacts to lists, list views.

### Feedback

*(No feedback yet)*

---

## 9. Workspaces

**Flow:** Personal vs workspace mode, create workspace, invite members, workspace contacts.

### Feedback

*(No feedback yet)*

---

## 10. Import / Export

**Flow:** CSV/vCard file upload, Google Contacts import (planned — Phase 4), export.

### Feedback

*(No feedback yet)*

---

## 11. Settings

**Flow:** Profile settings, theme/palette, calendar sync settings, account.

### Feedback

*(No feedback yet)*

---

## 12. Mobile / PWA

**Flow:** Responsive layout on mobile, install prompt, offline behavior.
**Note:** PWA work is planned in Phase 5 of the roadmap. Feedback here informs that phase.

### Feedback

*(No feedback yet)*

---

## 13. General / Cross-Cutting

Issues that don't fit neatly into one section — navigation, performance, error messages, accessibility, etc.

### Feedback

*(No feedback yet)*

---

## Summary of Open Items

*(This section is maintained by AI agents — update after each session)*

| Priority | Area     | Summary                                                                                                      | Status                          |
|----------|----------|--------------------------------------------------------------------------------------------------------------|---------------------------------|
| HIGH     | Setup Wizard | Button contrast too low on first-time setup screens                                                      | Open                            |
| HIGH     | Setup Wizard | Full wizard redesign — 5-step flow, Sign In vs Create Account, service connections, deferred sheet creation | Open — design spec in Section 1 |
| HIGH     | Auth         | Refresh logged user out / showed setup wizard again                                                       | Fixed 2026-02-17                |
