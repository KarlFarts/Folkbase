# Touchpoint CRM — QA Checklist

**Version:** 2026-02-17
**Tester:** ___________________________
**Environment:** ___________________________
**Build:** ___________________________

---

> **Legend**
> - [ ] = untested
> - [x] = pass
> - [F] = fail (log issue below)
> - [S] = skip (not applicable to environment)
>
> Write failures and notes in the **Issues Log** at the end.

---

## 1. KNOWN BUGS (Test These First)

### 1.1 Dashboard — Overdue Task Cards Navigate Nowhere

| # | What to Test | Passing Result |
|---|---|---|
| 1.1.1 | On the Dashboard, locate the **Overdue Tasks** section. Click any task card. | Navigates to `/tasks/<id>` (the Task Profile page). No toast notification fires. |
| 1.1.2 | After navigating to the task profile, press the browser Back button. | Returns to Dashboard without error. |
| 1.1.3 | If no overdue tasks exist, create a task with a past due date, return to Dashboard, and click the card. | Same as 1.1.1. |

- [ ] 1.1.1 — Task card click navigates to Task Profile
- [ ] 1.1.2 — Back navigation works correctly
- [ ] 1.1.3 — Works when task created specifically to trigger overdue state

**Notes:** _____________________________________________________________

---

## 2. CORE USER FLOWS

### 2.1 Authentication — Sign In

| # | What to Test | Passing Result |
|---|---|---|
| 2.1.1 | Open the app unauthenticated. Click **Sign in with Google**. | Google OAuth popup or redirect opens. |
| 2.1.2 | Complete OAuth consent with a valid Google account. | Redirected into app (Setup Wizard or Dashboard). No error screen. |
| 2.1.3 | Refresh the page while logged in. | Session persists; user lands on Dashboard, not the sign-in screen. |
| 2.1.4 | Click **Sign Out** from the nav menu. | Clears session, returns to sign-in screen. Cannot access `/contacts` without re-authenticating. |
| 2.1.5 | Attempt to visit `/contacts` while signed out (type URL directly). | Redirected to sign-in screen. |

- [ ] 2.1.1 — OAuth popup / redirect launches
- [ ] 2.1.2 — OAuth completes, app loads
- [ ] 2.1.3 — Session persists across page refresh
- [ ] 2.1.4 — Sign out clears session and redirects
- [ ] 2.1.5 — Unauthenticated direct URL is protected

**Notes:** _____________________________________________________________

---

### 2.2 Setup Wizard — New User Onboarding

| # | What to Test | Passing Result |
|---|---|---|
| 2.2.1 | Sign in with a Google account that has no existing Touchpoint sheet. | Setup Wizard launches automatically after OAuth. |
| 2.2.2 | Step 1 (Welcome & Auth): Confirm your Google account is shown. | Account name/email displayed; step advances to Step 2. |
| 2.2.3 | Step 2 (Profile): Enter a display name and save. | Profile saved; step advances to Step 3. |
| 2.2.4 | Step 3 (Sheet Setup): Choose "Create new sheet". | App creates a new Google Sheet in a "Touchpoint CRM" folder in Google Drive. |
| 2.2.5 | Step 3 (Sheet Setup) — alternate: Choose "Use existing sheet" and paste an existing sheet ID. | App connects to the existing sheet; moves it into the "Touchpoint CRM" folder if not already there. |
| 2.2.6 | Step 4 (Completion): View the completion screen. | All 25+ sheet tabs confirmed created; link to sheet shown; "Go to Dashboard" button works. |
| 2.2.7 | Complete the wizard, refresh the page. | Dashboard loads directly; wizard does not re-appear. |

- [ ] 2.2.1 — Wizard triggers on first sign-in
- [ ] 2.2.2 — Step 1 shows account info and advances
- [ ] 2.2.3 — Step 2 profile saves
- [ ] 2.2.4 — Step 3 creates new sheet and Drive folder
- [ ] 2.2.5 — Step 3 connects to existing sheet
- [ ] 2.2.6 — Step 4 confirms sheet structure; navigates to Dashboard
- [ ] 2.2.7 — Wizard does not re-run after completion

**Notes:** _____________________________________________________________

---

### 2.3 Primary CRM Loop — Add Contact → Log Interaction → View Dashboard

| # | What to Test | Passing Result |
|---|---|---|
| 2.3.1 | Click **Add Contact** from the nav bar or Dashboard quick action. | Add Contact form opens. |
| 2.3.2 | Fill in First Name, Last Name, and one phone number. Save. | Contact saved; redirected to contact profile or list with success toast. |
| 2.3.3 | Open the new contact's profile. Click **Log Touchpoint** or equivalent. | Touchpoint modal opens pre-associated with this contact. |
| 2.3.4 | Log a Touchpoint with type "Phone Call" and a note. Save. | Touchpoint appears in the contact's interaction timeline. Contact's "Last Contact" date updates. |
| 2.3.5 | Return to Dashboard. Verify the contact appears in relevant widgets. | Contact appears in "Needs Follow-up" or "Recent Activity" widget as appropriate. |
| 2.3.6 | Search for the contact using the nav bar search or Cmd+K. | Contact appears in search results. Clicking result navigates to their profile. |

- [ ] 2.3.1 — Add Contact form opens
- [ ] 2.3.2 — Contact saves and ID is assigned (CON001 format)
- [ ] 2.3.3 — Touchpoint modal opens linked to contact
- [ ] 2.3.4 — Touchpoint saves; Last Contact date updates
- [ ] 2.3.5 — Dashboard widgets reflect new data
- [ ] 2.3.6 — Universal search finds new contact

**Notes:** _____________________________________________________________

---

### 2.4 Import Flow — CSV to Contacts

| # | What to Test | Passing Result |
|---|---|---|
| 2.4.1 | Navigate to **Import** (`/import`). Confirm page loads (no premium gate blocking it). | Import page loads with Step 1: Upload visible. |
| 2.4.2 | Upload a valid CSV file with at least 5 contacts. | File accepted; column headers detected; advance to Step 2: Field Mapping. |
| 2.4.3 | Map CSV columns to Touchpoint fields (at minimum: first name, last name, email). | Mapping UI shows preview rows with mapped values. |
| 2.4.4 | Choose a field mapping template (e.g., Google Contacts). | Fields auto-map to template; preview updates. |
| 2.4.5 | Advance to Step 3: Validation. | Issues are flagged (bad emails, missing required fields) with counts. |
| 2.4.6 | Apply a batch correction (e.g., "Trim whitespace"). | Preview rows update immediately to show corrected values. |
| 2.4.7 | Advance to Step 4: Duplicate Review. Import a CSV that contains a name already in the system. | Duplicate detected and flagged; option to skip or merge shown. |
| 2.4.8 | Advance to Step 5: Import. Confirm import. | Progress tracker runs through phases; contacts appear in Contact List after completion. |
| 2.4.9 | Navigate to **Export** (`/export`) and export the newly imported contacts as CSV. | Download starts; file opens with correct data. |

- [ ] 2.4.1 — Import page loads
- [ ] 2.4.2 — CSV upload accepted; columns detected
- [ ] 2.4.3 — Manual field mapping works
- [ ] 2.4.4 — Template auto-mapping works
- [ ] 2.4.5 — Validation flags bad data
- [ ] 2.4.6 — Batch corrections apply
- [ ] 2.4.7 — Duplicate detection fires
- [ ] 2.4.8 — Import completes; contacts visible in list
- [ ] 2.4.9 — Export produces correct CSV

**Notes:** _____________________________________________________________

---

## 3. ALL IMPLEMENTED FEATURES

### 3.1 Authentication & Session Management

| # | What to Test | Passing Result |
|---|---|---|
| 3.1.1 | Leave the app idle for longer than token expiry window. Return and interact. | App either auto-refreshes the token silently or shows a re-auth prompt. Does not crash silently or show raw API errors. |
| 3.1.2 | Open Settings (`/settings`). Check Google Sheets API connection status indicator. | Green "Connected" status shown with the active sheet ID. |
| 3.1.3 | Open Settings. Check Google Calendar sync connection status. | Either "Not connected" (expected before OAuth) or "Connected" with calendar name shown. |

- [ ] 3.1.1 — Token refresh or re-auth prompt on expiry
- [ ] 3.1.2 — Settings shows Sheets API connected status
- [ ] 3.1.3 — Settings shows Calendar connection status

**Notes:** _____________________________________________________________

---

### 3.2 Dashboard

| # | What to Test | Passing Result |
|---|---|---|
| 3.2.1 | Load Dashboard. Confirm all widgets render without spinners stuck permanently. | All widgets load within 5 seconds on a normal connection. |
| 3.2.2 | **Celebrations widget**: Ensure a contact has an upcoming birthday. | Contact name and birthday appear in the widget. |
| 3.2.3 | **Upcoming Events widget**: Ensure at least one future event exists. | Event name and date appear in the widget. |
| 3.2.4 | **Need to Contact widget**: Mark a contact as needing follow-up. | Contact appears in the widget. |
| 3.2.5 | **Incomplete Touchpoints widget**: Create a touchpoint with Status=Incomplete. | Touchpoint appears in the widget with contact name. |
| 3.2.6 | **Recent Activity feed**: Perform an action (add contact, log touchpoint). | Action appears in the feed with timestamp. |
| 3.2.7 | **To-Do widget**: Create a task due today. | Task appears in the widget. |
| 3.2.8 | **Quick Actions**: Click "Add Contact" quick action from Dashboard. | Navigates to Add Contact form. |
| 3.2.9 | **Quick Actions**: Click "Log Touchpoint" quick action. | Touchpoint modal opens. |
| 3.2.10 | **Overdue Tasks section**: Click "View All Tasks" button. | Navigates to `/tasks`. |
| 3.2.11 | Click the **Manual Refresh** button on the Dashboard (if visible). | Data reloads; widgets update. |
| 3.2.12 | **Profile Completion widget**: Add a contact with minimal data. | Contact appears in the completion widget showing missing fields. |

- [ ] 3.2.1 — All widgets load without stuck spinners
- [ ] 3.2.2 — Celebrations widget shows birthday
- [ ] 3.2.3 — Upcoming Events widget works
- [ ] 3.2.4 — Need to Contact widget works
- [ ] 3.2.5 — Incomplete Touchpoints widget works
- [ ] 3.2.6 — Recent Activity feed updates
- [ ] 3.2.7 — To-Do widget shows today's tasks
- [ ] 3.2.8 — Add Contact quick action navigates correctly
- [ ] 3.2.9 — Log Touchpoint quick action opens modal
- [ ] 3.2.10 — View All Tasks navigates to `/tasks`
- [ ] 3.2.11 — Manual refresh reloads data
- [ ] 3.2.12 — Profile Completion widget flags sparse contacts

**Notes:** _____________________________________________________________

---

### 3.3 Contacts — CRUD & Core Features

| # | What to Test | Passing Result |
|---|---|---|
| 3.3.1 | **Add Contact**: Open `/contacts/add`. Fill all visible fields including multiple phone numbers and emails. Save. | Contact saved; assigned ID in format `CON001`. All fields visible in profile. |
| 3.3.2 | **View Contact Profile**: Click any contact from the list. | Profile loads with all sections (basic info, touchpoints, notes, relationships, sub-sections). |
| 3.3.3 | **Edit Contact**: Edit a contact's last name and email. Save. | Changes persist on refresh. |
| 3.3.4 | **Delete Contact**: Delete a contact. Confirm dialog appears. Confirm deletion. | Contact removed from list; no longer appears in search. |
| 3.3.5 | **Contact List — Card View**: Navigate to `/contacts`. Confirm cards display. | Card view shows avatar, name, role, and key fields. |
| 3.3.6 | **Contact List — Table View**: Switch to table view. | Table renders with sortable columns. |
| 3.3.7 | **Filter by Status**: Filter contacts by status (e.g., "Active"). | List updates to show only matching contacts. |
| 3.3.8 | **Filter by Priority**: Filter contacts by priority. | List filters correctly. |
| 3.3.9 | **Filter by Tags**: Assign a tag to a contact; filter by that tag. | Only tagged contacts appear. |
| 3.3.10 | **Filter by List**: Add a contact to a List; filter by that List. | Only list members appear. |
| 3.3.11 | **Search within Contacts**: Type in the search bar on `/contacts`. | Results narrow as you type; matches on name, email, phone. |
| 3.3.12 | **Bulk Edit**: Select multiple contacts via checkbox; open Bulk Edit modal. Change status for all. | All selected contacts updated simultaneously. |
| 3.3.13 | **Tags — Tag Manager**: Open the tag manager; create a new tag; assign it to a contact. | Tag saved; visible on contact card and filterable. |
| 3.3.14 | **Avatar Customization**: On a contact profile, change avatar color or icon. | Avatar updates immediately in the profile and contact list. |
| 3.3.15 | **Export from Contact List**: Click Export; select CSV; download. | CSV file contains only the contacts matching current filter. |
| 3.3.16 | **Social Media Profiles**: Add a Twitter and LinkedIn handle to a contact. | Both saved; displayed in profile; clicking generates correct URL. |
| 3.3.17 | **Education History**: Add an education entry with institution and degree. | Entry appears in the Education section of the profile. |
| 3.3.18 | **Employment History**: Add an employment entry with org name and role. | Entry appears in the Employment section. |
| 3.3.19 | **Electoral Districts**: Add a district entry. | Entry appears in the Districts section. |
| 3.3.20 | **Contact Relationships**: Add a relationship between two contacts (e.g., "Colleague"). | Both contacts show the relationship from their respective profiles. |

- [ ] 3.3.1 — Create with all fields; ID assigned
- [ ] 3.3.2 — Profile loads all sections
- [ ] 3.3.3 — Edit persists on refresh
- [ ] 3.3.4 — Delete removes contact
- [ ] 3.3.5 — Card view renders
- [ ] 3.3.6 — Table view renders
- [ ] 3.3.7 — Filter by Status
- [ ] 3.3.8 — Filter by Priority
- [ ] 3.3.9 — Filter by Tags
- [ ] 3.3.10 — Filter by List
- [ ] 3.3.11 — Text search within contacts
- [ ] 3.3.12 — Bulk Edit updates multiple contacts
- [ ] 3.3.13 — Tag Manager creates and assigns tags
- [ ] 3.3.14 — Avatar customization saves
- [ ] 3.3.15 — Export CSV from contact list
- [ ] 3.3.16 — Social media profiles save and link
- [ ] 3.3.17 — Education history saves
- [ ] 3.3.18 — Employment history saves
- [ ] 3.3.19 — Electoral districts save
- [ ] 3.3.20 — Contact relationships bidirectional

**Notes:** _____________________________________________________________

---

### 3.4 Organizations

| # | What to Test | Passing Result |
|---|---|---|
| 3.4.1 | **Add Organization**: Navigate to `/organizations/add`. Fill name, industry, website, phone, email. Save. | Organization saved with ID in format `ORG001`. |
| 3.4.2 | **View Organization Profile**: Click an organization from the list. | Profile loads with all sections. |
| 3.4.3 | **Edit Organization**: Edit the website URL. Save. | Change persists on refresh. |
| 3.4.4 | **Delete Organization**: Delete an organization. | Removed from list. |
| 3.4.5 | **Key Contacts (Org Contacts Manager)**: On an org profile, add a contact as "Executive Director". | Contact appears in the Org Contacts section with their role. |
| 3.4.6 | **Departments Manager**: Add a department named "Finance". | Department appears in the Departments section. |
| 3.4.7 | **Filter / Search Organizations**: Search by name on `/organizations`. | Results narrow correctly. |

- [ ] 3.4.1 — Create org; ID assigned
- [ ] 3.4.2 — Profile loads
- [ ] 3.4.3 — Edit persists
- [ ] 3.4.4 — Delete removes org
- [ ] 3.4.5 — Key Contacts section saves with role
- [ ] 3.4.6 — Departments section saves
- [ ] 3.4.7 — Org search works

**Notes:** _____________________________________________________________

---

### 3.5 Locations

| # | What to Test | Passing Result |
|---|---|---|
| 3.5.1 | **Add Location**: Navigate to `/locations/add`. Fill name, full address, phone. Save. | Location saved with ID in format `LOC001`. |
| 3.5.2 | **View Location Profile**: Click a location from the list. | Profile loads with address, hours, accessibility, capacity sections. |
| 3.5.3 | **Edit Location**: Edit business hours. Save. | Change persists. |
| 3.5.4 | **Delete Location**: Delete a location. | Removed from list. |
| 3.5.5 | **Visit History**: Log a visit to a location. | Visit appears in the Location Visits section of the profile. |
| 3.5.6 | **Search Locations**: Search by name. | Results narrow correctly. |

- [ ] 3.5.1 — Create location; ID assigned
- [ ] 3.5.2 — Profile loads all sections
- [ ] 3.5.3 — Edit persists
- [ ] 3.5.4 — Delete removes location
- [ ] 3.5.5 — Visit history records
- [ ] 3.5.6 — Location search works

**Notes:** _____________________________________________________________

---

### 3.6 Touchpoints (Interaction Log)

| # | What to Test | Passing Result |
|---|---|---|
| 3.6.1 | **Log from contact profile**: Open a contact; click Log Touchpoint. Select type "Email". Add a note. Save. | Touchpoint appears in the contact's timeline with correct date. Contact's Last Contact date updates. |
| 3.6.2 | **Log from Dashboard quick action**: Click "Log Touchpoint" in the quick actions. Select a contact. Save. | Same as 3.6.1. |
| 3.6.3 | **Log with status "Incomplete"**: Log a touchpoint and mark it incomplete. | Appears in the Dashboard's Incomplete Touchpoints widget. |
| 3.6.4 | **Mark touchpoint complete**: Find an incomplete touchpoint; mark it complete. | Disappears from Incomplete Touchpoints widget. |
| 3.6.5 | **Touchpoints list page**: Navigate to `/touchpoints`. | All touchpoints across all contacts listed; searchable. |
| 3.6.6 | **Search touchpoints**: Search by contact name or note content in `/touchpoints`. | Results filter correctly. |

- [ ] 3.6.1 — Log touchpoint from contact profile
- [ ] 3.6.2 — Log touchpoint from Dashboard quick action
- [ ] 3.6.3 — Incomplete touchpoint appears in widget
- [ ] 3.6.4 — Marking complete removes from widget
- [ ] 3.6.5 — Touchpoints list page loads
- [ ] 3.6.6 — Touchpoints search works

**Notes:** _____________________________________________________________

---

### 3.7 Events & Calendar

| # | What to Test | Passing Result |
|---|---|---|
| 3.7.1 | **Add Event**: Navigate to `/events/add`. Fill name, date, time, location. Save. | Event saved with ID in format `EVT001`. |
| 3.7.2 | **Event List — List View**: Navigate to `/events`. | Events listed in chronological order. |
| 3.7.3 | **Event List — Calendar View**: Switch to Calendar view. | Events appear on correct calendar dates. |
| 3.7.4 | **Event List — Timeline View**: Switch to Timeline view. | Events displayed in timeline order. |
| 3.7.5 | **Event Details**: Click an event. | Details page loads with all sections. |
| 3.7.6 | **Attendees Manager**: On an event, add a contact as an attendee. Set RSVP to "Yes". | Attendee appears in the Attendees section with RSVP status. |
| 3.7.7 | **Check-in an attendee**: Mark an attendee as checked in. | Check-in status updates. |
| 3.7.8 | **Resources Manager**: Add a resource (e.g., "Projector") to an event. | Resource appears in the Resources section with cost if entered. |
| 3.7.9 | **Agenda Manager**: Add an agenda item with a speaker. | Agenda item appears in correct order in the Agenda section. |
| 3.7.10 | **Edit Event**: Change the event date. Save. | Date change persists; Calendar view reflects update. |
| 3.7.11 | **Delete Event**: Delete an event. Confirm. | Event removed from list and Calendar view. |
| 3.7.12 | **Virtual meeting link**: Add a Zoom URL to an event. | Link is saved and clickable in event details. |
| 3.7.13 | **Google Calendar Sync — Connect**: In Settings, click "Connect Google Calendar". Complete OAuth. | Calendar sync section shows "Connected" with your calendar name. |
| 3.7.14 | **Google Calendar Sync — Push event**: Create a Touchpoint event after connecting Calendar. | Event appears in Google Calendar automatically. |
| 3.7.15 | **Google Calendar Sync — Manual sync**: Click the manual Sync button in Settings. | Sync runs; last synced timestamp updates; push/pull counts shown. |
| 3.7.16 | **Google Calendar Sync — Auto-sync**: Enable auto-sync with 15-minute interval. | Setting saves. (Confirm sync runs in background; check last-synced time after 15 min if possible.) |
| 3.7.17 | **Import from Google Calendar**: Use "Import Event" modal to bring in a Google Calendar event. | Event appears in Touchpoint Events list with correct data. |
| 3.7.18 | **Conflict resolution modal**: Create the same event in Touchpoint and Google Calendar with different times. Sync. | Conflict modal appears with both versions shown; choosing one resolves the conflict. |

- [ ] 3.7.1 — Create event; ID assigned
- [ ] 3.7.2 — List view loads
- [ ] 3.7.3 — Calendar view loads with events on dates
- [ ] 3.7.4 — Timeline view loads
- [ ] 3.7.5 — Event details page loads
- [ ] 3.7.6 — Attendee added with RSVP
- [ ] 3.7.7 — Check-in status updates
- [ ] 3.7.8 — Resource added to event
- [ ] 3.7.9 — Agenda item added with speaker
- [ ] 3.7.10 — Edit event date persists
- [ ] 3.7.11 — Delete event removes from all views
- [ ] 3.7.12 — Virtual meeting link saves
- [ ] 3.7.13 — Calendar OAuth connects
- [ ] 3.7.14 — New event auto-pushes to Google Calendar
- [ ] 3.7.15 — Manual sync runs and updates timestamp
- [ ] 3.7.16 — Auto-sync interval setting saves
- [ ] 3.7.17 — Import from Google Calendar works
- [ ] 3.7.18 — Conflict resolution modal appears and resolves

**Notes:** _____________________________________________________________

---

### 3.8 Tasks

| # | What to Test | Passing Result |
|---|---|---|
| 3.8.1 | **Create Task**: Navigate to `/tasks`. Click Add Task. Fill title, due date, priority. Save. | Task saved with ID in format `TSK001`. |
| 3.8.2 | **Task List**: Navigate to `/tasks`. | All tasks listed; incomplete shown before complete. |
| 3.8.3 | **Task Profile**: Click a task from the list. | Task Profile page (`/tasks/<id>`) loads with all sections. |
| 3.8.4 | **Edit Task**: Edit the task title and due date from the Task Profile. Save. | Changes persist on refresh. |
| 3.8.5 | **Mark Task Complete**: Check off a task. | Task moves to completed state; removed from incomplete count. |
| 3.8.6 | **Checklist items**: Add 3 checklist items to a task. Check one off. | Completion percentage updates (e.g., 33%). |
| 3.8.7 | **Time Entries**: Add a time entry of "2 hours" to a task. | Time entry appears in Time Entries section. |
| 3.8.8 | **Task Priority**: Change task priority to "Urgent". | Priority badge updates in list and profile. |
| 3.8.9 | **Overdue task on Dashboard**: Create a task due yesterday. Go to Dashboard. | Task appears in the Overdue Tasks widget. Click card → navigates to task profile (or test for known bug per 1.1). |
| 3.8.10 | **Filter tasks**: Filter by status "Incomplete". | Only incomplete tasks shown. |
| 3.8.11 | **Task related to contact**: Link a task to a specific contact. | Contact reference appears on the task profile. |
| 3.8.12 | **Delete Task**: Delete a task from the Task Profile. | Task removed from list and Dashboard widget. |

- [ ] 3.8.1 — Create task; ID assigned
- [ ] 3.8.2 — Task list loads with correct sort order
- [ ] 3.8.3 — Task Profile page loads
- [ ] 3.8.4 — Edit persists
- [ ] 3.8.5 — Mark complete works
- [ ] 3.8.6 — Checklist completion percentage updates
- [ ] 3.8.7 — Time entry saves
- [ ] 3.8.8 — Priority change reflected in list and profile
- [ ] 3.8.9 — Overdue task on Dashboard; click behavior tested
- [ ] 3.8.10 — Filter by status works
- [ ] 3.8.11 — Related contact link saves
- [ ] 3.8.12 — Delete removes task

**Notes:** _____________________________________________________________

---

### 3.9 Notes

| # | What to Test | Passing Result |
|---|---|---|
| 3.9.1 | **Create Note**: Navigate to `/notes`. Create a note with type "Meeting Note" and body text. Save. | Note appears in the Notes Inbox with correct type badge. |
| 3.9.2 | **Note Status**: Change a note's status from "Unprocessed" to "Processed". | Note moves to correct status bucket in the Inbox. |
| 3.9.3 | **Link note to contact**: Open a note; link it to a contact. | Contact appears in the Linked Entities section. Contact's profile shows the note. |
| 3.9.4 | **Link note to event**: Link a note to an event. | Event appears in Linked Entities. |
| 3.9.5 | **Bulk Commit**: Select multiple unprocessed notes; open Bulk Commit modal. Mark all as Processed. | All selected notes change status simultaneously. |
| 3.9.6 | **Note Visibility**: Set a note's visibility to "Private". | Note is only visible to the creating user (in multi-user context) or marked Private in the list. |
| 3.9.7 | **Search Notes**: Search by text in the Notes Inbox. | Results filter in real time. |
| 3.9.8 | **Archive a note**: Set note status to "Archived". | Note moves to archived; no longer appears in the default (unprocessed) view. |
| 3.9.9 | **Filter by type**: Filter notes by type "Phone Call". | Only Phone Call type notes shown. |
| 3.9.10 | **Delete Note**: Delete a note. | Note removed from all views. |

- [ ] 3.9.1 — Create note with type; appears in Inbox
- [ ] 3.9.2 — Status change works
- [ ] 3.9.3 — Link to contact; visible on contact profile
- [ ] 3.9.4 — Link to event works
- [ ] 3.9.5 — Bulk Commit changes multiple statuses
- [ ] 3.9.6 — Visibility field saves
- [ ] 3.9.7 — Text search filters notes
- [ ] 3.9.8 — Archive removes from default view
- [ ] 3.9.9 — Filter by type works
- [ ] 3.9.10 — Delete note removes it

**Notes:** _____________________________________________________________

---

### 3.10 Lists

| # | What to Test | Passing Result |
|---|---|---|
| 3.10.1 | **Create List**: Create a list named "Board Members". | List saved with ID in format `LST001`. |
| 3.10.2 | **Add contact to list**: Add a contact to the "Board Members" list. | Contact appears when filtering by that list. |
| 3.10.3 | **Remove contact from list**: Remove a contact from the list. | Contact no longer appears in list filter. |
| 3.10.4 | **Delete List**: Delete the list. | List removed; contacts previously in list no longer filterable by it. |

- [ ] 3.10.1 — Create list; ID assigned
- [ ] 3.10.2 — Add contact to list works
- [ ] 3.10.3 — Remove contact from list works
- [ ] 3.10.4 — Delete list works

**Notes:** _____________________________________________________________

---

### 3.11 Quick Capture — Call Mode

| # | What to Test | Passing Result |
|---|---|---|
| 3.11.1 | Navigate to Call Mode (`/call-mode/<contactId>`). | Full-screen call interface opens showing the contact's name. |
| 3.11.2 | Confirm timer starts automatically or on clicking Start. | Timer increments in real time. |
| 3.11.3 | Type notes in the notes field during the "call". | Notes field accepts input. |
| 3.11.4 | Click End Call. | Touchpoint is auto-created for the contact with the duration and notes. Navigates back to contact profile. |
| 3.11.5 | Verify the new touchpoint in the contact profile. | Touchpoint type is "Phone Call"; duration and notes match what was typed. |

- [ ] 3.11.1 — Call Mode opens with correct contact
- [ ] 3.11.2 — Timer runs
- [ ] 3.11.3 — Notes field accepts input
- [ ] 3.11.4 — End Call auto-creates touchpoint and navigates back
- [ ] 3.11.5 — Touchpoint saved correctly on contact profile

**Notes:** _____________________________________________________________

---

### 3.12 Quick Capture — Meeting Mode

| # | What to Test | Passing Result |
|---|---|---|
| 3.12.1 | Navigate to Meeting Mode (`/meeting-mode`). | Full-screen interface opens with attendee search. |
| 3.12.2 | Search for and add 2 contacts as attendees. | Both contacts appear in the attendees list. |
| 3.12.3 | Start the timer. Take notes. | Timer runs; notes field accepts input. |
| 3.12.4 | End the meeting. | A touchpoint is created for each attendee with the notes and duration. |
| 3.12.5 | Verify on each attendee's contact profile. | Both profiles show a new touchpoint from this meeting. |

- [ ] 3.12.1 — Meeting Mode opens
- [ ] 3.12.2 — Two attendees added via search
- [ ] 3.12.3 — Timer and notes work
- [ ] 3.12.4 — End meeting creates touchpoints for all attendees
- [ ] 3.12.5 — Touchpoints appear on each contact profile

**Notes:** _____________________________________________________________

---

### 3.13 Quick Capture — Braindump

| # | What to Test | Passing Result |
|---|---|---|
| 3.13.1 | Navigate to `/braindump`. Confirm page loads (no premium gate blocking). | Braindump capture interface loads. |
| 3.13.2 | Type a note that includes a contact name already in the system (e.g., "Met with John Smith today"). | Entity suggestions panel shows "John Smith" with a confidence score. |
| 3.13.3 | Click to link the suggested entity. | John Smith appears in the Linked Entities section. |
| 3.13.4 | Type a note with a location name in the system. | Location suggested in the entity panel. |
| 3.13.5 | Close the page without saving. Reopen. | Draft restored from auto-save with a timestamp shown. |
| 3.13.6 | Click Clear. Confirm the dialog. | Draft cleared; capture field empty. |
| 3.13.7 | Save/commit the braindump note. | Note appears in Notes Inbox with status "Unprocessed". |

- [ ] 3.13.1 — Page loads without premium gate
- [ ] 3.13.2 — Contact name detected in text
- [ ] 3.13.3 — Linking entity works
- [ ] 3.13.4 — Location detection works
- [ ] 3.13.5 — Draft restored on reopen
- [ ] 3.13.6 — Clear dialog works
- [ ] 3.13.7 — Committed note appears in Notes Inbox

**Notes:** _____________________________________________________________

---

### 3.14 Quick Capture — Quick Sync

| # | What to Test | Passing Result |
|---|---|---|
| 3.14.1 | Navigate to `/quick-sync`. | Page loads with file drop zone. |
| 3.14.2 | Drop or upload a small CSV with new contacts. | File accepted; newly detected contacts shown as cards. |
| 3.14.3 | Upload the same file a second time. | Contacts flagged as "already synced" via sync hash; not re-imported. |
| 3.14.4 | Upload a file with a name matching an existing contact. | Duplicate detected and flagged before adding. |
| 3.14.5 | Assign a tag during sync. Confirm import. | New contacts created with the assigned tag. |
| 3.14.6 | View the Sync Summary. | Add/skip/duplicate counts shown correctly. |

- [ ] 3.14.1 — Quick Sync page loads
- [ ] 3.14.2 — File uploaded; new contacts shown
- [ ] 3.14.3 — Second upload of same file flagged as already synced
- [ ] 3.14.4 — Name-match duplicate flagged
- [ ] 3.14.5 — Tag assigned during sync persists on contacts
- [ ] 3.14.6 — Sync summary counts are accurate

**Notes:** _____________________________________________________________

---

### 3.15 Duplicate Detection & Merge

| # | What to Test | Passing Result |
|---|---|---|
| 3.15.1 | Navigate to `/duplicates`. Confirm page loads. | Duplicate Manager loads. |
| 3.15.2 | Create two contacts with the same name (e.g., "Jane Doe" and "Jane Doe"). Run a duplicate scan. | Both contacts appear as a potential duplicate pair at ≥75% similarity. |
| 3.15.3 | **Side-by-side comparison**: Open the duplicate pair. | Both contact records shown side by side with all fields. |
| 3.15.4 | **Field-level merge**: Choose which version to keep for each differing field. | Selection UI allows picking per field. |
| 3.15.5 | **Confirm merge**: Merge the two contacts. | One contact remains; merged fields contain the selected values; duplicate marked with "Duplicate Linked To" field. |
| 3.15.6 | **Link without merge**: Choose to link duplicates without merging. | Both contacts remain; each shows the other as a linked duplicate. |

- [ ] 3.15.1 — Duplicate Manager page loads
- [ ] 3.15.2 — Scan finds name-match duplicate pair
- [ ] 3.15.3 — Side-by-side comparison shows both records
- [ ] 3.15.4 — Field-level selection works
- [ ] 3.15.5 — Merge produces correct merged contact
- [ ] 3.15.6 — Link without merge leaves both intact and linked

**Notes:** _____________________________________________________________

---

### 3.16 Backup & Restore

| # | What to Test | Passing Result |
|---|---|---|
| 3.16.1 | Navigate to `/backup`. Confirm page loads. | Backup & Restore page loads. |
| 3.16.2 | **Create backup**: Click Download Backup. | JSON file downloaded to computer containing all sheet tab data. |
| 3.16.3 | **Validate backup file**: Open the JSON. | File contains keys for each sheet tab (Contacts, Organizations, etc.) and row data. |
| 3.16.4 | **Restore from backup**: Upload the backup file. Confirm restore. | Progress tracker runs through phases; data restored; record count matches backup metadata. |
| 3.16.5 | **Invalid file handling**: Try to restore a non-JSON or malformed file. | Error shown; restore does not start. |

- [ ] 3.16.1 — Backup & Restore page loads
- [ ] 3.16.2 — Backup JSON downloads
- [ ] 3.16.3 — JSON file contains correct structure
- [ ] 3.16.4 — Restore from backup completes
- [ ] 3.16.5 — Invalid file shows error

**Notes:** _____________________________________________________________

---

### 3.17 Export

| # | What to Test | Passing Result |
|---|---|---|
| 3.17.1 | Navigate to `/export`. Confirm page loads. | Export page loads. |
| 3.17.2 | **CSV export — full preset**: Select "Full" field preset; click Export. | CSV downloads with all available fields as columns. |
| 3.17.3 | **CSV export — essential preset**: Select "Essential" preset. | CSV downloads with only core fields. |
| 3.17.4 | **CSV export — custom fields**: Select individual fields manually; export. | CSV contains exactly those fields. |
| 3.17.5 | **vCard export**: Switch format to vCard; export. | `.vcf` file downloads; each contact is a valid vCard entry. |
| 3.17.6 | **Filter before export**: Apply a search filter; export. | Only filtered contacts appear in the exported file. |
| 3.17.7 | **Filename**: Inspect the downloaded filename. | Includes a timestamp (e.g., `touchpoint-contacts-20260217.csv`). |

- [ ] 3.17.1 — Export page loads
- [ ] 3.17.2 — Full CSV export
- [ ] 3.17.3 — Essential preset CSV
- [ ] 3.17.4 — Custom field selection exports correctly
- [ ] 3.17.5 — vCard export produces valid `.vcf`
- [ ] 3.17.6 — Filter is respected in export
- [ ] 3.17.7 — Filename includes timestamp

**Notes:** _____________________________________________________________

---

### 3.18 Universal Search

| # | What to Test | Passing Result |
|---|---|---|
| 3.18.1 | Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux). | Universal Search modal opens. |
| 3.18.2 | Type a contact's name. | Contact appears in results grouped under "Contacts". |
| 3.18.3 | Type an event name. | Event appears in results grouped under "Events". |
| 3.18.4 | Type an organization name. | Organization appears in results. |
| 3.18.5 | Type a location name. | Location appears in results. |
| 3.18.6 | Type a task title. | Task appears in results. |
| 3.18.7 | Click a search result. | Modal closes; navigates to the correct entity profile. |
| 3.18.8 | Press Escape while the modal is open. | Modal closes without navigating. |
| 3.18.9 | Search for a term that matches nothing. | "No results" state shown; no crash. |

- [ ] 3.18.1 — Cmd+K / Ctrl+K opens modal
- [ ] 3.18.2 — Contact found and grouped correctly
- [ ] 3.18.3 — Event found
- [ ] 3.18.4 — Organization found
- [ ] 3.18.5 — Location found
- [ ] 3.18.6 — Task found
- [ ] 3.18.7 — Click navigates to entity
- [ ] 3.18.8 — Escape closes modal
- [ ] 3.18.9 — Empty search state shown

**Notes:** _____________________________________________________________

---

### 3.19 Workspaces

| # | What to Test | Passing Result |
|---|---|---|
| 3.19.1 | Navigate to `/workspaces`. Confirm page loads. | Workspace Dashboard loads. |
| 3.19.2 | **Create Workspace**: Navigate to `/workspaces/create`. Enter a name; create. | New workspace created with a new Google Sheet in Drive. Workspace ID in format `WS001`. |
| 3.19.3 | **Switch to Workspace**: Use the Workspace Switcher in the sidebar. Select the new workspace. | App switches context; data displayed is from the workspace sheet, not personal sheet. |
| 3.19.4 | **Generate Invitation**: Generate an invite token with a 7-day expiry. | Token string shown; expiry date displayed. |
| 3.19.5 | **Join Workspace**: Navigate to `/join`. Enter the invite token. | Joined workspace appears in the Workspace Switcher. |
| 3.19.6 | **Sub-workspace**: Create a sub-workspace under the parent workspace. | Sub-workspace appears nested under parent in the workspace hierarchy. |
| 3.19.7 | **Copy contact to workspace**: Select a personal contact; copy to workspace with "Core fields only" strategy. | Contact appears in the workspace with mapped fields. |
| 3.19.8 | **Switch back to Personal**: Use the workspace switcher to return to Personal mode. | Contacts shown are personal contacts only. |

- [ ] 3.19.1 — Workspace Dashboard loads
- [ ] 3.19.2 — Create workspace; new sheet in Drive
- [ ] 3.19.3 — Switch workspace changes data context
- [ ] 3.19.4 — Invite token generated with expiry
- [ ] 3.19.5 — Join via token works
- [ ] 3.19.6 — Sub-workspace creation works
- [ ] 3.19.7 — Copy contact to workspace with field mapping
- [ ] 3.19.8 — Switch back to personal mode

**Notes:** _____________________________________________________________

---

### 3.20 Settings Page

| # | What to Test | Passing Result |
|---|---|---|
| 3.20.1 | Navigate to `/settings`. | Page loads with all sections visible. |
| 3.20.2 | **User Profile section**: Edit display name. Save. | Name updated; appears in nav or greeting. |
| 3.20.3 | **Google Sheets section**: Confirm sheet ID shown and status is green. | Sheet ID matches the one in the setup wizard; status shows "Connected". |
| 3.20.4 | **Data Health check**: Click "Run Data Health Check". | Health report generated showing counts of any orphaned records, missing fields, or broken links. |
| 3.20.5 | **API Usage indicator**: Confirm API usage stats are displayed. | Shows quota usage percentage; no crash. |
| 3.20.6 | **Cache settings**: View cache configuration. | Cache TTL values shown; no crash. |
| 3.20.7 | **Calendar sync section**: Confirm sync status visible even before connecting. | Section renders; either "Not connected" or connected state shown. |

- [ ] 3.20.1 — Settings page loads all sections
- [ ] 3.20.2 — Display name edit saves
- [ ] 3.20.3 — Sheets API status shows Connected
- [ ] 3.20.4 — Data health check runs and reports
- [ ] 3.20.5 — API usage stats display
- [ ] 3.20.6 — Cache config renders
- [ ] 3.20.7 — Calendar sync section renders

**Notes:** _____________________________________________________________

---

### 3.21 Premium Feature Gating

| # | What to Test | Passing Result |
|---|---|---|
| 3.21.1 | Navigate to `/import`. | Page loads directly — no upgrade gate or paywall blocks access. |
| 3.21.2 | Navigate to `/export`. | Page loads directly. |
| 3.21.3 | Navigate to `/duplicates`. | Page loads directly. |
| 3.21.4 | Navigate to `/backup`. | Page loads directly. |
| 3.21.5 | Navigate to `/braindump`. | Page loads directly. |
| 3.21.6 | Navigate to `/workspaces`. | Page loads directly. |
| 3.21.7 | Confirm the upgrade/billing flow is a no-op. Open Settings and look for a Manage Subscription or Upgrade button. Click it. | In production (no billing backend), clicking does nothing or shows a graceful message — it does not crash or redirect to a broken Stripe URL. |

- [ ] 3.21.1 — Import accessible without paywall
- [ ] 3.21.2 — Export accessible
- [ ] 3.21.3 — Duplicates accessible
- [ ] 3.21.4 — Backup accessible
- [ ] 3.21.5 — Braindump accessible
- [ ] 3.21.6 — Workspaces accessible
- [ ] 3.21.7 — Upgrade button is graceful no-op (no crash)

**Notes:** _____________________________________________________________

---

## 4. EDGE CASES, ERROR HANDLING & MOBILE

### 4.1 Empty States

| # | What to Test | Passing Result |
|---|---|---|
| 4.1.1 | Navigate to `/contacts` with zero contacts in the sheet. | Empty state illustration or message shown; no blank white screen or JS error. |
| 4.1.2 | Navigate to `/events` with no events. | Empty state shown. |
| 4.1.3 | Navigate to `/tasks` with no tasks. | Empty state shown. |
| 4.1.4 | Navigate to `/notes` with no notes. | Empty state shown. |
| 4.1.5 | Load Dashboard with no data at all (fresh sheet). | All widgets show empty states gracefully; no widget crashes the page. |
| 4.1.6 | Search for a term with no matches (Universal Search). | "No results" state shown; not blank. |
| 4.1.7 | Filter contacts by a tag that no contacts have. | Empty state shown for the contact list. |
| 4.1.8 | Open a contact profile with no touchpoints logged. | Touchpoints section shows "No touchpoints yet" or similar; does not crash. |
| 4.1.9 | Navigate to `/duplicates` with no duplicate-worthy contacts. | Empty state or "No duplicates found" shown after scan. |

- [ ] 4.1.1 — Empty contacts list
- [ ] 4.1.2 — Empty events list
- [ ] 4.1.3 — Empty tasks list
- [ ] 4.1.4 — Empty notes inbox
- [ ] 4.1.5 — Dashboard all-empty state
- [ ] 4.1.6 — Universal search no results
- [ ] 4.1.7 — Contact filter returns no results
- [ ] 4.1.8 — Contact profile no touchpoints
- [ ] 4.1.9 — Duplicate scan no results

**Notes:** _____________________________________________________________

---

### 4.2 Error Handling — Network & API

| # | What to Test | Passing Result |
|---|---|---|
| 4.2.1 | Open the app with no internet connection (disable Wi-Fi or use DevTools offline mode). | App shows a meaningful error or offline message; does not display a blank screen or crash. |
| 4.2.2 | Start editing a contact; disconnect internet mid-save. Reconnect. | Error toast shown for the failed save. Data not silently lost. Re-save succeeds after reconnect. |
| 4.2.3 | Open the app with an expired/revoked Google token. | User prompted to re-authenticate; not stuck in a broken state. |
| 4.2.4 | Attempt to import a completely empty CSV file. | Validation error shown; import does not proceed to produce 0 contacts with no feedback. |
| 4.2.5 | Attempt to restore a backup with a JSON file that has incorrect structure. | Error message shown; restore does not corrupt data. |
| 4.2.6 | Navigate to a contact URL with a non-existent ID (e.g., `/contacts/CON999`). | 404 or "Contact not found" state; not a crash or blank screen. |
| 4.2.7 | Navigate to a task URL with a non-existent ID (e.g., `/tasks/TSK999`). | 404 or "Task not found" state. |
| 4.2.8 | Trigger an unexpected JS error (if possible via a broken route). | Error Boundary catches it; fallback UI shown with option to reload. |

- [ ] 4.2.1 — Offline shows meaningful message
- [ ] 4.2.2 — Save failure during disconnect shows error toast
- [ ] 4.2.3 — Expired token prompts re-auth
- [ ] 4.2.4 — Empty CSV import shows validation error
- [ ] 4.2.5 — Malformed backup JSON shows error
- [ ] 4.2.6 — Non-existent contact ID shows 404/not-found state
- [ ] 4.2.7 — Non-existent task ID shows not-found state
- [ ] 4.2.8 — JS error caught by Error Boundary

**Notes:** _____________________________________________________________

---

### 4.3 Data Integrity — Inputs & Special Characters

| # | What to Test | Passing Result |
|---|---|---|
| 4.3.1 | Create a contact with a name containing special characters: `O'Brien & "Associates" <Test>`. | Name saved and displayed correctly; no HTML encoding artifacts or missing characters. |
| 4.3.2 | Enter an email with leading/trailing spaces: ` test@example.com `. Save. | Spaces trimmed automatically; email stored as `test@example.com`. |
| 4.3.3 | Enter a phone number with dashes, dots, and parentheses: `(313) 555-0100`. | Phone normalized and saved; displayed consistently. |
| 4.3.4 | Paste 10,000 characters into a notes field. Save. | Note saves without crash; no data truncation visible to user without a warning. |
| 4.3.5 | Create 50+ contacts rapidly using the import tool. Navigate to contacts list. | All 50+ contacts appear; no pagination or loading errors. |
| 4.3.6 | Create a contact with only required fields (first name). No optional fields. | Contact saves; profile displays gracefully with empty optional sections. |
| 4.3.7 | Assign the same tag to 100 contacts. Filter by that tag. | All 100 contacts returned; no timeout or crash. |

- [ ] 4.3.1 — Special characters in name save and display correctly
- [ ] 4.3.2 — Email whitespace trimmed
- [ ] 4.3.3 — Phone number normalized
- [ ] 4.3.4 — Very long notes field saves
- [ ] 4.3.5 — 50+ contacts in list; no loading error
- [ ] 4.3.6 — Minimal-field contact profile renders cleanly
- [ ] 4.3.7 — Bulk tag filter handles 100 contacts

**Notes:** _____________________________________________________________

---

### 4.4 Mobile & Responsive Behavior

| # | What to Test | Passing Result |
|---|---|---|
| 4.4.1 | Open the app on a mobile device or resize browser to 375px wide (iPhone SE). | App layout adjusts; no horizontal scroll. Navigation is accessible. |
| 4.4.2 | Navigate to Contact List on mobile. | Cards stack vertically; no content cut off. |
| 4.4.3 | Open a Contact Profile on mobile. | All sections accessible by scrolling; no overlapping UI elements. |
| 4.4.4 | Open the Add Contact form on mobile. | Form fields are tappable and keyboard does not obscure them. |
| 4.4.5 | Open Universal Search (Cmd+K or via nav) on mobile. | Modal is full-screen or appropriately sized; keyboard opens without breaking layout. |
| 4.4.6 | Use Call Mode on mobile. | Full-screen layout renders; notes field usable with on-screen keyboard. |
| 4.4.7 | Use Meeting Mode on mobile. | Attendee search and timer accessible; full-screen layout usable. |
| 4.4.8 | Open the Dashboard on a tablet (768px wide). | Widgets arrange in a readable multi-column layout. |
| 4.4.9 | Open the PWA install prompt (if on a supported browser). | Install prompt appears and is dismissable. Installing adds app to home screen. |
| 4.4.10 | Test navigation menu on mobile. | Menu is accessible (hamburger or bottom nav); all main sections reachable. |

- [ ] 4.4.1 — 375px layout has no horizontal scroll
- [ ] 4.4.2 — Contact List stacks on mobile
- [ ] 4.4.3 — Contact Profile scrollable on mobile
- [ ] 4.4.4 — Add Contact form tappable fields
- [ ] 4.4.5 — Universal Search modal usable on mobile
- [ ] 4.4.6 — Call Mode full-screen on mobile
- [ ] 4.4.7 — Meeting Mode accessible on mobile
- [ ] 4.4.8 — Dashboard tablet layout (768px)
- [ ] 4.4.9 — PWA install prompt works
- [ ] 4.4.10 — Mobile navigation reaches all sections

**Notes:** _____________________________________________________________

---

### 4.5 Theme & Visual Consistency

| # | What to Test | Passing Result |
|---|---|---|
| 4.5.1 | Load the app in the default (warm window palette) theme. | All pages use consistent color tokens; no raw hex colors visible as outliers. |
| 4.5.2 | Switch to dark mode (if OS dark mode is enabled or a toggle exists). | All pages respect dark mode tokens; no white boxes on dark background; text legible. |
| 4.5.3 | Open 3 different modal dialogs (Add Contact, Log Touchpoint, Add Event). | All use the WindowTemplate; consistent header/body/footer structure across all three. |
| 4.5.4 | Open a toast notification (trigger a save). | Toast appears with correct type styling (success = green, error = red); auto-dismisses. |
| 4.5.5 | Navigate to the 404 page (visit `/nonexistent`). | Custom 404 page shown; not a blank screen or browser default 404. |

- [ ] 4.5.1 — Warm palette consistent across pages
- [ ] 4.5.2 — Dark mode legible across all pages
- [ ] 4.5.3 — Modal dialogs use consistent WindowTemplate
- [ ] 4.5.4 — Toast notifications styled correctly and auto-dismiss
- [ ] 4.5.5 — Custom 404 page shown for unknown routes

**Notes:** _____________________________________________________________

---

### 4.6 Notifications & Feedback

| # | What to Test | Passing Result |
|---|---|---|
| 4.6.1 | Save a contact successfully. | Success toast appears briefly and disappears. |
| 4.6.2 | Attempt to save a contact with a missing required field. | Inline validation error on the field; form does not submit; no crash. |
| 4.6.3 | Perform a destructive action (delete a contact). | Confirmation dialog appears before deletion. Canceling does nothing. |
| 4.6.4 | Trigger multiple toasts in quick succession (save + another action). | Toasts stack correctly; none overlap destructively. |

- [ ] 4.6.1 — Success toast on save
- [ ] 4.6.2 — Required field validation prevents submit
- [ ] 4.6.3 — Destructive action requires confirmation
- [ ] 4.6.4 — Multiple toasts stack correctly

**Notes:** _____________________________________________________________

---

## 5. ISSUES LOG

Use this table to record failures during testing.

| # | Section | Item # | Description | Steps to Reproduce | Severity (High/Med/Low) | Status |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

---

## 6. SIGN-OFF

| | |
|---|---|
| **Testing complete:** | ☐ Yes ☐ No |
| **Total items tested:** | ___ / 174 |
| **Passed:** | ___ |
| **Failed:** | ___ |
| **Skipped:** | ___ |
| **Tester signature:** | ___________________________ |
| **Date completed:** | ___________________________ |
| **Ready for release?** | ☐ Yes ☐ No — pending fixes: ___________________________ |

---

*Generated 2026-02-17 from codebase audit of Touchpoint CRM v2.*
