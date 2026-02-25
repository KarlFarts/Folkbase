# Folkbase UI Redesign Scope

## Auth & Onboarding
- [x] **SetupWizard** (3 steps: Welcome/Auth, Profile, Completion) — `src/components/SetupWizard/`
- [ ] **Login/OAuth flow** (Google sign-in in navbar)

## Main Layout & Navigation
- [x] **Navbar** — `src/components/Navbar.js` — card-surface bar, card-chip nav links, ChevronDown rotation to CSS class
- [x] **Breadcrumbs** — `src/components/Breadcrumbs.js` — card-chip language, frosted glass, border tokens
- [x] **WorkspaceSwitcher** — `src/components/WorkspaceSwitcher.js` — ChevronDown inline style → CSS class
- [ ] **UniversalSearch** — `src/components/UniversalSearch.js`
- [ ] **BraindumpFAB** (floating action button) — `src/components/BraindumpFAB.js`

## Dashboard (`/`)
- [x] **Dashboard page** — `src/pages/Dashboard.js` + `src/styles/Dashboard.css` — HeroWelcome fix, hero-top scoping
- [x] **HeroWelcome** — aliased `.dashboard-welcome-row` to hero rules
- [ ] **QuickActionBar** — quick action buttons
- [ ] **DashboardSidebar** — sidebar nav
- [ ] **Widgets** (15 total): UrgentSection, NeedToContact, IncompleteTouchpoints, UpcomingBirthdays, UpcomingEvents, ToDo, ProfileCompletion, Celebrations, RecentActivity, Settings, CustomActions, CollapsibleWidget, SearchBar

## Contact System
- [x] **ContactList** (`/contacts`) — all 18 inline styles → `cl-*` CSS classes; deleted inline @keyframes spin
- [x] **ContactProfile** (`/contacts/:id`) — horizontal tab bar replaces dropdown+sidebar; action buttons in header; all 46 inline styles → `cp-*` classes
- [x] **AddContact** (`/contacts/add`) — 15 inline styles → `add-form-*` classes; removed React import
- [ ] **ContactCard** — card component
- [ ] **ContactTable** — table component
- [ ] **ContactFilters** — advanced filtering
- [ ] **ProfileHeader** — avatar, name, quick actions
- [ ] **ProfileTabs** — tab navigation in profile
- [ ] **ContactActivities** — touchpoint/note history
- [ ] **SocialsManager, EducationManager, EmploymentManager, DistrictsManager** — profile sub-sections

## Organization System
- [x] **OrganizationList** (`/organizations`) — reused `cl-*` classes; fixed double-className; removed React import
- [x] **OrganizationProfile** (`/organizations/:id`) — reused `cp-tab-bar`/`cp-linked-card`; all inline styles → `op-*` classes; corrected accent color token
- [x] **AddOrganization** (`/organizations/add`) — 16 inline styles → `add-form-*` classes; removed React import
- [ ] **OrganizationCard**
- [ ] **DepartmentsManager, OrgContactsManager** — profile sub-sections

## Location System
- [x] **LocationList** (`/locations`) — 13 inline styles → reused `cl-*` classes; removed React import; deleted inline @keyframes spin
- [x] **LocationProfile** (`/locations/:id`) — 47 inline styles → `lp-*` classes; reused `cp-tab-bar`, `op-field-stack`, `tl-item-list`; removed React import
- [ ] **AddLocation** (`/locations/add`)
- [ ] **LocationCard**

## Events System
- [x] **EventsList** (`/events`) — all inline styles → `el-*` classes; removed React import; deduped filtered views
- [x] **EventDetails** (`/events/:id`) — all ~25 inline styles → `ed-*` classes; reused `cp-linked-card`; removed React import
- [x] **AddEvent** (`/events/add`) — 7 inline styles → `add-form-field`, `add-form-actions`, `add-form-card--lg`; removed React import
- [ ] **EventCard**
- [ ] **CalendarView** — month calendar
- [ ] **TimelineView** — timeline/Gantt view
- [ ] **AttendeesManager, AttendeeSelector, AgendaManager, ResourcesManager**
- [ ] **ImportEventModal** — Google Calendar import
- [ ] **SyncConflictModal** — conflict resolution

## Touchpoints
- [x] **TouchpointsList** (`/touchpoints`) — all inline styles → `tl-*` classes; modal overlays extracted; removed React import
- [ ] **TouchpointModal** — log/edit/detail
- [ ] **LogTouchpointMinimal, LogTouchpointQuickModal** — quick logging

## Tasks
- [x] **TasksPage** (`/tasks`) — already clean, no inline styles
- [ ] **TaskProfile** (`/tasks/:id`) — checklist, time tracking
- [ ] **ChecklistManager, TimeEntryManager**

## Notes & Braindump
- [x] **NotesInbox** (`/notes`) — 1 inline style → `.notes-status-bar-actions` class in NotesInbox.css; removed React import
- [x] **BraindumpPage** (`/braindump`) — already clean, no inline styles; removed React import
- [ ] **NotesDisplaySection** — note list/cards
- [ ] **LinkedEntitiesDisplay** — entity chips on notes
- [ ] **CommitNoteModal, BulkCommitModal, LinkEntitiesModal, QuickCommitButton**
- [ ] **EntitySuggestionsPanel, EntitySuggestionCard** — braindump entity detection

## Relationships
- [ ] **RelationshipManager**
- [ ] **RelationshipGraph** — visual graph
- [ ] **RelationshipList**
- [ ] **AddRelationshipModal**

## Import/Export
- [x] **ImportPage** (`/import`) — 1 inline style → `import-cancel-row`; removed React import
- [x] **ExportPage** (`/export`) — 20 inline styles → `export-*` classes; removed React import
- [x] **QuickSyncPage** (`/quick-sync`) — 0 inline styles; removed React import
- [ ] **FileDropzone, ImportSourceSelector, FieldMappingPreview, DataCorrectionTable, BatchActionsToolbar, DuplicateReviewPanel, ProgressTracker**
- [ ] **ExportFilters, FieldSelector**
- [ ] **QuickSync components** — ContactFileDropzone, NewContactCard, QuickEnrichmentForm, SyncSummary

## Call & Meeting Modes
- [x] **CallMode** (`/call-mode/:contactId`) — 14 inline styles → `focus-mode-*` classes
- [x] **MeetingMode** (`/meeting-mode`) — 10 inline styles → `focus-mode-*` + attendee classes
- [ ] **Timer** component

## Workspaces
- [x] **WorkspaceDashboard** (`/workspaces`) — 3 inline styles → `ws-folder-*` classes; removed React import
- [ ] **CreateWorkspace** (`/workspaces/create`) — multi-step wizard
- [ ] **JoinWorkspace** (`/join`)
- [ ] **WorkspaceInvitationGenerator**
- [ ] **SubWorkspaceManager**
- [ ] **ContactWorkspaceBadges**
- [ ] **CopyContactModal, BulkCopyModal**

## Settings
- [x] **SettingsPage** (`/settings`) — 127 inline styles → `sp-*` classes; removed React import
- [ ] **BillingPanel** — `src/pages/SettingsPanels/BillingPanel.js`
- [ ] **BackupRestorePage** (`/backup`)

## Duplicate Management
- [x] **DuplicateManager** (`/duplicates`) — 5 inline styles + `<style jsx>` block → `dm-*` CSS classes; removed React import
- [ ] **MergePreview**

## Modal/Dialog System
- [ ] **WindowTemplate** — base modal component (all modals inherit from this)
- [ ] **ConfirmDialog**
- [ ] **BatchEditModal**

## Global UI Components
- [ ] **Avatar, AvatarPicker**
- [ ] **SkeletonLoader** — loading states
- [ ] **NotificationToast**
- [ ] **ErrorBoundary** — error states
- [ ] **PremiumGate, UpgradePrompt** — paywall UI
- [ ] **InstallPrompt** — PWA install
- [ ] **MigrationBanner**
- [ ] **TokenExpiryNotifier**
- [ ] **ListManager, ListsFilter, TagManager**
- [ ] **TimelineItem**

## Shared Stylesheets
- [x] **index.css** — `cl-*`, `cp-*`, `op-*`, `el-*`, `ed-*`, `tl-*`, `add-form-*`, `focus-mode-*`, `lp-*`, `export-*`, `ws-*`, `dm-*`, `sp-*` sections added; breadcrumbs updated
- [x] **Dashboard.css** — HeroWelcome alias, hero-top scoping
- [ ] **themes.css** — color palette/tokens (`src/styles/themes.css`)

## Stats
- **31 pages** | **116+ components** | **34 CSS files** | **677 inline style occurrences**
- **Session progress:** ~26 pages/components done (all major pages complete); component layer remaining
- Pages done: Navbar, Breadcrumbs, WorkspaceSwitcher, Dashboard, ContactList, ContactProfile, OrganizationList, OrganizationProfile, EventsList, EventDetails, TasksPage, TouchpointsList, NotesInbox, BraindumpPage, AddContact, AddOrganization, LocationList, LocationProfile, CallMode, MeetingMode, AddEvent, ImportPage, QuickSyncPage, WorkspaceDashboard, DuplicateManager, ExportPage, SettingsPage
