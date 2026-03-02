# Testing Notes - Manual QA Walkthrough

Date: 2026-03-01

## Existing Known TODOs
- [ ] SubscriptionContext: Let user choose which product (workspace, member, etc.)
- [ ] SubscriptionContext: Implement product selection UI

---

## Walkthrough Findings

### 1. Login / Sign-In Page

**Layout:**
- [ ] Split should be closer to 50/50 instead of fixed 420px left / flexible right. Currently left panel uses `flex: 0 0 420px` which looks lopsided on wide screens.

**Branding panel (right side):**
- [ ] "Folkbase" title, tagline, and description text should be centered (currently left-aligned).

**Landing page / marketing:**
- [ ] Need a proper landing/marketing page before the sign-in screen. Users hitting the site for the first time should see what the product is, features, benefits, etc. -- similar to how apps like Claude, Notion, etc. have a public site leading into sign-in. Sign-in should be a dedicated page, not the first thing users see.

**Authentication options:**
- [ ] Consider adding alternative sign-in methods beyond Google (e.g., email/password, GitHub, Apple). Not urgent, but worth exploring.

**Font:**
- Current font is **DM Sans** (Google Fonts), weights 400-700, with DM Mono for monospace.
- [ ] Confirm DM Sans is the desired font -- user wants to review this choice.

---

### 2. OAuth Consent Screen

**Scope reduction (security/trust):**
- [ ] Drop the `spreadsheets` scope entirely. Rely on `drive.file` only, which already allows read/write to Sheets the app creates. This eliminates the scary "See, edit, create, and delete ALL your Google Sheets" permission. The app only needs access to its own sheet, not every sheet the user has.
- Current scopes in `src/googleAuth.js`: `userinfo.email`, `userinfo.profile`, `spreadsheets`, `drive.file`
- Target scopes: `userinfo.email`, `userinfo.profile`, `drive.file` (drop `spreadsheets`)

**Verification notice:**
- [ ] The "This app hasn't been verified by Google" warning is showing. Will need to go through Google's OAuth verification process before public launch. Also missing Privacy Policy and Terms of Service links.

---

### 3. Setup Wizard (Welcome step)

**"Could not search for existing sheets" warning:**
- This shows because without the broad `spreadsheets` scope, the app can't search for existing sheets. Once we drop that scope (item above), this is expected and the "Connect to Existing" flow needs rethinking.

**Rethink "Connect to Existing" flow:**
- [ ] Instead of searching for/connecting to an existing Google Sheet, consider alternative onboarding paths:
  - Users with existing data could import contacts (CSV upload, vCard, etc.) into a fresh app-created sheet
  - Users joining a workspace don't need a personal sheet at all initially -- they could skip straight to workspace join
  - The "Connect to Existing" card may not be needed if we always create a new sheet and offer import instead
- [ ] Think about whether a personal Google Sheet should even be required for users who only want to join an existing workspace.

**UI notes:**
- The wizard looks clean. The step indicator (1-Welcome, 2-Profile, 3-Complete) is clear.
- Small triangle/arrow artifact visible at top center of the progress bar area -- might be a CSS issue.

---

### 4. Setup Wizard (Profile step)

**Layout / overall feel:**
- [ ] The setup wizard feels too small and constrained -- it looks like a popup modal floating on a blank page rather than a proper onboarding experience. Consider making the wizard a full-page layout (still with multiple steps) so it feels more intentional and polished. Think of how apps like Notion, Linear, etc. do full-screen onboarding flows.
- [ ] The wizard content area is too narrow, which will look especially bad on larger screens and cramped on smaller ones.

**Visual consistency:**
- [ ] The profile icon at the top of "Set Up Your Profile" section doesn't match the style of the avatar color swatches below it. The header icon should feel visually connected to the avatar picker -- either use the same style, or have the preview avatar itself serve as the header visual.

**Avatar color picker:**
- The color grid and Color/Icon tab switcher look functional.
- The color palette is on-brand (earthy tones + a few accents).

---

### 5. Setup Wizard (Complete step)

**Google Drive folder creation bug:**
- [ ] BUG: "Could not create the Folkbase folder" error on the completion screen. The `drive.file` scope should allow creating folders via the Drive API, so this needs investigation. Possibly the scope check in `hasDriveFileScope()` is passing but the actual API call is failing for another reason. This has never worked -- needs debugging.
- The app gracefully degrades ("Your sheet still works without the folder") which is good, but this should work.

**UI:**
- The completion summary (Google Account: Connected, Google Sheets: Connected, Google Drive: Error) and "What's next?" section look good.
- Same overall width/layout concern as the rest of the wizard (see Section 4).

---

### 6. Global: Rename "Touchpoint" to "Folkbase" throughout codebase

**Naming cleanup:**
- [ ] The codebase still uses "Touchpoint" in many places (variable names, folder names, function names, constants, comments). Now that the product is "Folkbase", do a systematic rename:
  - `TOUCHPOINT_FOLDER_NAME` -> `FOLKBASE_FOLDER_NAME` (in `src/utils/driveFolder.js`)
  - `findTouchpointFolder` -> `findFolkbaseFolder`
  - `createTouchpointFolder` -> `createFolkbaseFolder`
  - `getOrCreateTouchpointFolder` -> `getOrCreateFolkbaseFolder`
  - `moveFileToFolder` -- fine as-is (generic)
  - Any other references to "Touchpoint" in code, comments, docs, and UI strings
- [ ] Audit all user-facing strings for any remaining "Touchpoint" references.
- Note: The data entity "Touchpoint" (as in a logged interaction with a contact) is a different concept and should stay -- this is only about the product/brand name.

---

### 7. Dashboard (Home page)

**Overall visual design -- needs major rework:**
- [ ] The dark mode color scheme feels unfinished and arbitrary. Background, text colors, and card colors don't feel cohesive. Needs a thoughtful dark mode palette.
- [ ] Move to a more modern aesthetic: gradient/glassmorphism-style backgrounds instead of flat dark. Think frosted glass cards, subtle gradients, depth.
- [ ] Add subtle animations throughout: hover effects on cards, smooth transitions, micro-interactions. Should feel polished and modern.

**Dashboard stat cards (red box area):**
- [ ] Cards are too large and spread out. Make them smaller, more compact, with clearer borders.
- [ ] The column-based color coding (blue, yellow, pink, green) is nice -- make it more pronounced and intentional.
- [ ] Second row (Locations, Upcoming Celebrations, Workspaces) is inconsistent -- some have numbers, "Upcoming Celebrations" has text. Needs a consistent card format.
- [ ] Row 2 only has 3 cards vs row 1's 4 -- uneven grid looks unfinished.

**Upcoming events column (blue box area -- top right):**
- [ ] Replace the "Upcoming Celebrations" card with a dedicated right-side column/panel showing:
  - Current date and time at the top
  - Upcoming events below (birthdays, anniversaries, etc. from active contacts)
  - Not a card -- more of a sidebar or integrated panel
  - Should fit naturally with the rest of the dashboard layout, not feel bolted on

**Welcome message / greeting:**
- [ ] The dev mode refresh button (red circle) next to the greeting should not exist for users. Instead, the welcome message should auto-rotate on its own (similar to how Claude's greeting refreshes automatically).
- [ ] Remove the manual refresh button entirely from production.

**User avatar bug:**
- [ ] BUG: The avatar color/icon shown on the dashboard doesn't match what was selected during profile setup. The avatar picker may not be persisting correctly, or the dashboard is pulling from a different source (e.g., Google profile pic vs app avatar settings).
- [ ] Consider whether the avatar customization feature is worth the complexity -- if it can't reliably persist, maybe simplify it.

**Notifications / loading indicators:**
- [ ] Any popup notifications or loading indicators should be card-based toasts in the top-right corner, not inline banners or overlays. The loading state that briefly appeared was barely visible and felt off.

**Quick braindump button (bottom right, lightning icon):**
- [ ] Needs testing later -- the floating action button is there but behavior is unclear.
- [ ] BUG: The settings gear icon in the bottom-right doesn't navigate to settings -- instead it highlights/changes the lightning button color, then resets it. This interaction is broken and confusing.

**Navbar / top bar:**
- [ ] Needs a redesign. Current nav items: FOLKBASE, Home, Touchpoints, Contacts (dropdown), Events, Notes, Personal Contacts (dropdown), Workspaces.
- [ ] "Touchpoints" is still in the nav -- rename or reconsider placement as part of the Folkbase rename (Section 6). Note: "Touchpoints" as a feature/data concept is fine, but verify it's the right nav label.
- [ ] Nav feels incomplete -- may be missing items. Needs review of what should be top-level navigation.
- [ ] The "Home" label has a visible active/selected state (outline) which is good.

---

### 8. Contacts Page (main list)

**Overall:**
- Looks good structurally. Empty state with "+ Add Contact" CTA is clean.

**Layout tweaks:**
- [ ] The contacts content area / card could be shifted up a bit -- too much dead space between the toolbar and the content.
- [ ] Navbar: consider a floating/rounded style with some breathing room at the top (rounded rectangle, maybe slightly detached from the top edge). This would apply globally, not just contacts.

**Toolbar buttons:**
- Import, Upload Contacts, Export, Select Multiple, Find Duplicates, + Add Contact -- good set of actions.
- Grid/list view toggle is there (grid selected).
- [ ] The refresh icon (spinning arrows) between Export and Select Multiple feels orphaned -- needs a label or tooltip, or remove if not needed.

**Filter bar:**
- Search, All Priorities, All Statuses, Sort by Name dropdowns present.
- [ ] Consider replacing "All Priorities" / "All Statuses" dropdowns with a tag-based search/filter instead. Tags may be more useful than priority/status for most users.
- [ ] Add a way to filter by custom lists (since contacts can be added to lists). Could be a dropdown or a button that opens a modal to browse lists.

**Manage Tags button (bottom left):**
- Functional, looks fine.

---

### 9. Import Contacts Page

**Import options (iPhone/Apple, Android/Google, CSV, vCard):**
- [ ] The import source options should be more card-like with centered text/icons, rather than the current stacked list layout. Each option should feel like a selectable card.
- Drag & drop zone at the bottom is good.

**Export instructions:**
- The platform-specific export instructions (iPhone/iCloud, Android/Google Contacts, Outlook) are helpful and well-written. Good feature.
- Not uploading actual contacts yet -- will test import flow later with real data.

---

### 10. Upload Contacts Page ("Quick Sync")

- [ ] This page may be redundant with the Import page. Both offer file upload for CSV/vCard. Consider merging them into one flow or clarifying when each is used.
- [ ] BUG: The "Back" button on the Quick Sync page navigates to the Home screen instead of back to Contacts. Should go back to Contacts.
- [ ] The color/page transition when navigating back is jarring (light contacts page -> different toned home page). Part of the broader dark mode / color scheme issue (Section 7).

---

### 11. Duplicate Manager

**Rethink the approach:**
- [ ] The current standalone "Scan for Duplicates" page feels disconnected. Instead, consider:
  - Auto-detect duplicates when contacts are added/imported (proactive, not reactive)
  - Show a "Review Duplicates" status indicator on the Contacts page (e.g., badge: "3 potential duplicates")
  - Clicking it opens a panel/modal to review and merge duplicates
  - Keep a manual "Scan" option as secondary, but the primary flow should be automatic
- [ ] The "Scan 0 Contacts" button text is accurate but feels odd -- when there are contacts, verify it updates to "Scan N Contacts".

---

### 12. Touchpoints Page

**Empty state:**
- Clean. "No Touchpoints Yet" with "Add Touchpoint" CTA looks fine.
- Same dead-space / content-too-low issue as other pages.

**Add Touchpoint modal:**
- Fields: Contact (search), Date, Type (Call/Text/Email/Meeting/Event/Other), Outcome, Follow-up Needed, Duration. Good set.
- [ ] BUG: When closing the modal without saving, it retains the previously entered values (type, date, notes, etc.) next time it opens. Should reset to defaults on close.
- [ ] Add a confirmation dialog when closing the modal IF the user has modified any fields ("Discard changes?" / "Are you sure?"). Don't prompt if nothing was changed.

**Incomplete/unlinked touchpoints:**
- [ ] Add a section or indicator on the Touchpoints page for touchpoints that are missing info or not linked to a contact. E.g., a "Needs attention" filter or badge showing touchpoints without a contact, without notes, or flagged for follow-up.

**Type dropdown:**
- The native select dropdown (Call, Text, Email, Meeting, Event, Other) works but looks like a browser default `<select>`. Should match the app's custom dropdown styling for consistency.

---

### 13. Add Contact Form

**Simplify the initial form:**
- [ ] Remove District, Priority, and Status fields from the initial Add Contact form. These are power-user fields that clutter onboarding.
- [ ] Tags input should use a pill/chip-based UI with Enter/comma to add tags (not a plain text field or dropdown).

---

### 14. Contact Detail Page -- Navigation Overhaul

**Too many tabs (currently 14):**
- [ ] Consolidate from 14 tabs down to ~6 core tabs: **Profile, Touchpoints, Notes, Events, Tasks, Relationships**.
- [ ] Merge the following into the Profile tab (as collapsible sections or nested cards):
  - Organizations
  - Lists
  - Socials
  - Education
  - Employment
  - Districts
  - Methods (contact methods)
  - Attributes
- [ ] Only show populated sections by default. Add an "Add more fields" or "Show all sections" option to reveal empty ones.

**Left sidebar in Profile (currently 12 sub-sections):**
- [ ] Replace the left sidebar navigation (Names, Contact, Professional, Online Presence, Relationships, Mailing, Assets & Media, Demographics, Community, Preferences, Donor, Privacy) with a single scrollable profile view.
- [ ] Most users won't touch Demographics, Donor, Assets & Media, etc. These should be hidden unless populated.
- [ ] Sub-tabs shouldn't be in a left sidebar -- if "Profile" is the active main tab, show a horizontal sub-navbar below it (or just use collapsible sections within Profile).

**"Not set" everywhere:**
- [ ] Hide empty/unpopulated fields entirely instead of showing "Not set" for every field.
- [ ] Provide an "Add more fields" button that reveals the empty fields when the user wants to fill them in.

**Layout gap:**
- [ ] There is a huge gap between the "Back to Contacts" link and the contact header card. Reduce this spacing significantly.

---

### 15. Contact Detail -- Log Touchpoint Modal

**Modal sizing:**
- [ ] The Log Touchpoint modal feels small and crunched. Give it more breathing room -- wider modal, more padding.

**Quick add vs full detail:**
- [ ] The current modal should serve as a "quick add" for touchpoints.
- [ ] Add a "Full Details" or "More Options" button in the modal that expands to show additional fields:
  - Attendees (link to other contacts)
  - Physical location
  - Link to an existing event
- [ ] These additional fields will likely require new columns in the Touchpoints sheet.

**Touchpoint history (in the Touchpoints tab):**
- [ ] Touchpoint history items should be clickable/expandable to show full detail (not just the one-line summary).
- [ ] Allow editing a touchpoint from the expanded view (re-open the modal pre-filled).

**Events + Touchpoints connection:**
- [ ] Think about connecting touchpoints to events (a touchpoint can reference an event ID).
- [ ] Consider logging events to both Google Sheets AND Google Calendar for sync.

---

### 16. Contact Detail -- Notes

**"Add Note" button in Profile > Notes section:**
- [ ] BUG: Clicking "+ Add Note" under the Profile > Notes section navigates away to the main Notes page. It should open a modal (like the Write Note button does) instead of navigating away.

**Write Note modal (from the sidebar button):**
- [ ] The Write Note modal works but the content textarea is tiny -- needs to be taller.
- [ ] Add an "Extended Info" or "More Options" button for additional fields (tags, linked contacts, etc.).
- [ ] The shadowed/outlined area at the bottom of the Notes tab content looks bad -- clean up the styling.

**Note linking bug:**
- [ ] BUG: Notes written from a contact's page are not automatically linked to that contact. The note shows up on the main Notes page but without the contact association. The contact ID should be auto-populated when writing a note from a contact's detail page.

---

### 17. Contact Detail -- Organizations Tab

**Should not be a top-level tab:**
- [ ] Move Organizations into the Profile tab as a card/section.
- [ ] The empty state text feels dismissive/rude -- rewrite to be friendlier and more encouraging.

---

### 18. Contact Detail -- Relationships Tab

**Missing core functionality:**
- [ ] The Relationships tab is empty with no way to add relationships.
- [ ] Need relationship tree/graph visualization.
- [ ] Need a way to add relationships:
  - Suggest potential relationships based on shared last name
  - Allow manual search to link contacts as related
  - Store relationship type (family, colleague, friend, etc.)
  - Option to mark contacts as "related" or "not related" when suggestions appear
  - Each relationship stored in the sheet (e.g., Contact Relationships tab) with both contact IDs and relationship type
  - Should be removable/editable later

---

### 19. Contact Detail -- Lists Tab

- [ ] Needs visual cleanup -- current state looks rough.
- [ ] (Will be merged into Profile tab as part of the tab consolidation in Section 14.)

---

### 20. Contact Detail -- Edit Contact

**Save bug:**
- [ ] BUG: Clicking "Save Changes" after editing any field shows "Failed to save changes" error. Editing contacts is completely broken -- nothing saves. This is a critical bug.

**Avatar color picker:**
- The color picker UI (Color/Icon tabs, color swatches) looks decent.
- The "Auto" color option is a nice touch.

---

### 21. Session / Authentication

**Session expiry handling:**
- [ ] BUG: When session is about to expire ("expires in 5 minutes"), clicking "Sync Now" navigates to a separate Google sign-in page. This should re-authenticate silently in the background or at least stay in-app (popup, not redirect).

---

### 22. PWA Install Prompt

**Timing:**
- [ ] Don't show the PWA install prompt on first visit. Delay it until the user's second visit or after they've used the app for a minimum amount of time. Showing it immediately feels pushy.

---

### 23. Cost / Hosting / Self-Hosting Model

**Clarify and document:**
- [ ] Google Sheets API has generous free quotas (~500 requests per 100 seconds per project). Normal usage = $0.
- [ ] Netlify free tier handles hosting at no cost.
- [ ] The architecture is designed so each user/org can set up their own Google Cloud project and OAuth credentials -- not everyone runs through a single project.
- [ ] Document the self-hosting setup clearly so other users can deploy their own instance with their own Google Cloud project.
- [ ] Verify and document any usage limits that could trigger charges at scale.

---

### 24. Notes Page (standalone)

**General observations (from walkthrough):**
- The list/detail split view works well (note list on left, detail on right).
- Auto-sync indicator ("Updates every 60s") is visible.
- Stats bar (Total, Unprocessed, Processed) is useful.
- Search + filter dropdowns (Status, Types, All Notes) are present.

**Issues:**
- [ ] Notes created from a contact's page should show the linked contact in the detail view. Currently shows "No contacts linked yet" with "+ Add Contact Link" even for notes written from a contact page (see Section 16 bug).
- [ ] "WORKSPACE-WIDE" badge shows on personal notes -- verify this is correct behavior or if it should say "PERSONAL".

---

### 25. Events Page (standalone list)

**Overall:**
- Has the same basic/flat UI as the Contacts page -- needs the glassmorphism/card-based treatment we've been discussing.
- [ ] Should look distinct from the Contacts page, not like a copy of it. Different entity types should have their own visual identity while staying within the design system.

---

### 26. Create Event Form

**Positive notes:**
- The form looks better than most other forms in the app. Fields are clear: Event Name, Date, Type, Location, Description, Attendees with contact search.

**Attendees field:**
- [ ] The suggested contacts list could be overwhelming with many contacts. Add an option to select entire lists of people (e.g., "Add from list: Team A") in addition to individual search.

---

### 27. Event Detail Page

**Positive notes:**
- The 3-column layout (Event Details, Attendees, Notes) is a good foundation. "Upcoming Event" badge is a nice touch.

**Enhancements:**
- [ ] Apply glassmorphism/card-based styling to match the new design direction. Current cards are too plain/flat.
- [ ] Add an "Add Attendees" button to easily add more people after event creation.
- [ ] Add more event detail fields:
  - Start time / end time (not just date)
  - Recurring event option
  - Status (planned, confirmed, completed, cancelled)
- [ ] Add a "Meeting Prep" section:
  - Link to an agenda (e.g., paste a Google Docs URL)
  - "Shared Work" area for related documents that can be shared with attendees
- [ ] Consider a two-row layout with spaced columns instead of the current single-row 3-column.
- [ ] Google Calendar integration:
  - Sync event to Google Calendar
  - Send calendar invites to attendees
  - (May already be partially implemented -- needs verification)
- [ ] Connect events to touchpoints (see Section 15 -- a touchpoint can reference an event).

---

### 28. Navbar / Top Bar Redesign

**Current state:**
- Nav items: FOLKBASE, Home, Touchpoints, Contacts (dropdown), Events, Notes, Personal Contacts (dropdown), Workspaces
- Too many top-level items, some don't warrant their own nav slot.

**Proposed restructure:**
- [ ] Consolidate Locations and Organizations out of the top nav. These are secondary entities that can be accessed from:
  - A contact's Profile tab (org they belong to, locations they frequent)
  - A dedicated "Directory" or similar grouped section if needed
  - Or nested under a Contacts dropdown/mega-menu
- [ ] Merge "Personal Contacts" and "Workspaces" into a single compact area on the right side of the nav bar (e.g., a dropdown or toggle showing current mode + available workspaces).
- [ ] Add a user profile icon (avatar) at the far top-right that opens a dropdown with:
  - Settings
  - Connected workspaces list
  - Account info
  - Sign out
- [ ] The nav should feel cleaner with fewer top-level items. Core nav: Home, Contacts, Touchpoints, Events, Notes (and maybe Tasks). Everything else is secondary.

---

### 29. Locations Page

- [ ] Not yet walked through in detail. Needs review.
- [ ] Likely should not be a top-level nav item -- consider nesting it (see Section 28).
- [ ] Locations are relevant to contacts (where they live/work) and events (where events happen). The UI should reflect those relationships.

---

### 30. Organizations Page

- [ ] Not yet walked through in detail. Needs review.
- [ ] Like Locations, probably shouldn't be a top-level nav item.
- [ ] Organizations relate to contacts (employer, membership) -- should be accessible from contact profiles and possibly from a grouped "Directory" section.

---

### 31. Settings Page

- [ ] Not yet walked through in detail. Needs review.
- [ ] Should be accessible from the user profile icon dropdown (see Section 28), not as a standalone nav item.
- [ ] Should include: account settings, theme/appearance, connected Google account info, workspace management, data export/backup options.

---

## Walkthrough Summary

**Critical bugs to fix first:**
1. Edit Contact "Failed to save changes" (Section 20)
2. Notes not auto-linking to contacts (Section 16)
3. Session expiry redirect (Section 21)
4. "+ Add Note" in Profile navigates away instead of opening modal (Section 16)
5. Google Drive folder creation failure (Section 5)

**Biggest UX wins (high impact, touches everything):**
1. Contact Detail tab consolidation: 14 tabs -> 6 (Section 14)
2. Hide empty fields / "Not set" cleanup (Section 14)
3. Navbar redesign + user profile icon (Section 28)
4. Global glassmorphism/card-based design refresh (Sections 7, 25, 27)
5. Profile sidebar -> scrollable sections (Section 14)

**Feature additions (important but can follow the cleanup):**
1. Relationships: tree/graph + add relationship flow (Section 18)
2. Event detail enhancements: meeting prep, shared work, calendar sync (Section 27)
3. Touchpoint quick-add vs full-detail modes (Section 15)
4. PWA install timing (Section 22)
5. Landing/marketing page (Section 1)

---

### 32. (Walkthrough complete -- ready to prioritize and begin implementation)
