# Folkbase UI Redesign Scope

## Auth & Onboarding
- [x] **SetupWizard** (3 steps: Welcome/Auth, Profile, Completion) — `src/components/SetupWizard/`
- [ ] **Login/OAuth flow** (Google sign-in in navbar)

## Main Layout & Navigation
- [x] **Navbar** — `src/components/Navbar.js` — card-surface bar, card-chip nav links, ChevronDown rotation to CSS class
- [x] **Breadcrumbs** — `src/components/Breadcrumbs.js` — card-chip language, frosted glass, border tokens
- [x] **WorkspaceSwitcher** — `src/components/WorkspaceSwitcher.js` — ChevronDown inline style → CSS class
- [x] **UniversalSearch** — `src/components/UniversalSearch.js` — 35 inline styles → `us-*` classes; removed React import
- [x] **BraindumpFAB** (floating action button) — `src/components/BraindumpFAB.js` — already clean, no inline styles

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
- [x] **ContactCard** — already clean, no inline styles
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
- [x] **OrganizationCard** — already clean, no inline styles
- [ ] **DepartmentsManager, OrgContactsManager** — profile sub-sections

## Location System
- [x] **LocationList** (`/locations`) — 13 inline styles → reused `cl-*` classes; removed React import; deleted inline @keyframes spin
- [x] **LocationProfile** (`/locations/:id`) — 47 inline styles → `lp-*` classes; reused `cp-tab-bar`, `op-field-stack`, `tl-item-list`; removed React import
- [x] **AddLocation** (`/locations/add`) — 16 inline styles → `add-form-*` classes; removed React import
- [x] **LocationCard** — 1 inline style → `lc-mappin-icon`; removed React import

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
- [x] **TaskProfile** (`/tasks/:id`) — 33 inline styles → `tp-*` classes; removed React import
- [x] **ChecklistManager** — 14 inline styles → `cm-*` classes; removed React import
- [x] **TimeEntryManager** — 8 inline styles → `tem-*` classes; removed React import

## Notes & Braindump
- [x] **NotesInbox** (`/notes`) — 1 inline style → `.notes-status-bar-actions` class in NotesInbox.css; removed React import
- [x] **BraindumpPage** (`/braindump`) — already clean, no inline styles; removed React import
- [ ] **NotesDisplaySection** — note list/cards
- [ ] **LinkedEntitiesDisplay** — entity chips on notes
- [ ] **CommitNoteModal, BulkCommitModal, LinkEntitiesModal, QuickCommitButton**
- [ ] **EntitySuggestionsPanel, EntitySuggestionCard** — braindump entity detection

## Relationships
- [x] **RelationshipManager** — 11 inline styles → `rm-*` classes; removed React import; `React.useCallback` → `useCallback`
- [x] **RelationshipGraph** — 6 extractable inline styles → `rg-*` classes; dynamic node styles remain inline; removed React import
- [x] **RelationshipList** — 29 inline styles → `rl-*` classes; removed React import
- [x] **AddRelationshipModal** — 38 inline styles → `arm-*` classes; removed React import

## Import/Export
- [x] **ImportPage** (`/import`) — 1 inline style → `import-cancel-row`; removed React import
- [x] **ExportPage** (`/export`) — 20 inline styles → `export-*` classes; removed React import
- [x] **QuickSyncPage** (`/quick-sync`) — 0 inline styles; removed React import
- [x] **ProgressTracker** — dynamic `width` style remains inline (data-driven); removed React import
- [ ] **FileDropzone, ImportSourceSelector, FieldMappingPreview, DataCorrectionTable, BatchActionsToolbar, DuplicateReviewPanel**
- [ ] **ExportFilters, FieldSelector**
- [ ] **QuickSync components** — ContactFileDropzone, NewContactCard, QuickEnrichmentForm, SyncSummary

## Call & Meeting Modes
- [x] **CallMode** (`/call-mode/:contactId`) — 14 inline styles → `focus-mode-*` classes
- [x] **MeetingMode** (`/meeting-mode`) — 10 inline styles → `focus-mode-*` + attendee classes
- [x] **Timer** — 3 inline styles → `timer-*` classes

## Workspaces
- [x] **WorkspaceDashboard** (`/workspaces`) — 3 inline styles → `ws-folder-*` classes; removed React import
- [x] **CreateWorkspace** (`/workspaces/create`) — already clean, no inline styles
- [x] **JoinWorkspace** (`/join`) — already clean, no inline styles
- [x] **WorkspaceInvitationGenerator** — 1 inline style → `info-box` class in index.css; removed React import
- [ ] **SubWorkspaceManager**
- [ ] **ContactWorkspaceBadges**
- [x] **CopyContactModal** — 5 inline styles → `ccm-*` classes; removed React import
- [ ] **BulkCopyModal** — does not exist yet

## Settings
- [x] **SettingsPage** (`/settings`) — 127 inline styles → `sp-*` classes; removed React import
- [x] **BillingPanel** — `src/pages/SettingsPanels/BillingPanel.js` — 1 inline style → `billing-free-info-upgrade-heading`; removed React import
- [x] **BackupRestorePage** (`/backup`) — 27 inline styles → `br-*` classes; removed React import

## Duplicate Management
- [x] **DuplicateManager** (`/duplicates`) — 5 inline styles + `<style jsx>` block → `dm-*` CSS classes; removed React import
- [x] **MergePreview** — already clean, no inline styles

## Modal/Dialog System
- [x] **WindowTemplate** — already clean, no inline styles
- [x] **ConfirmDialog** — already clean, no inline styles
- [x] **BatchEditModal** — 6 inline styles → `bem-*` classes; removed React import

## Global UI Components
- [x] **Avatar** — 1 dynamic `backgroundColor` inline (data-driven, cannot extract); removed React import
- [x] **AvatarPicker** — 1 dynamic `backgroundColor` inline (data-driven, cannot extract); removed React import
- [x] **SkeletonLoader** — 7 extractable inline styles → `skeleton-*` classes; dynamic width/height props remain; removed React import
- [x] **NotificationToast** — already clean, no inline styles
- [x] **ErrorBoundary** — already clean, no inline styles
- [x] **PremiumGate, UpgradePrompt** — already clean, no inline styles
- [x] **InstallPrompt** — 1 inline style → `install-prompt-inline-icon` in InstallPrompt.css; removed React import
- [x] **MigrationBanner** — 1 extractable inline style → `migration-banner-content` in MigrationBanner.css; dynamic `width` remains; removed React import
- [x] **TokenExpiryNotifier** — already clean, no inline styles
- [x] **ListManager** — 21 inline styles → `lm-*` classes in index.css; removed React import
- [x] **ListsFilter** — already clean, no inline styles
- [x] **TagManager** — 9 inline styles → `tm-*` classes in index.css; removed React import
- [x] **TimelineItem** — 1 inline style → `timeline-dot-icon` class; dynamic cursor remains; removed React import

## Shared Stylesheets

- [x] **index.css** — `cl-*`, `cp-*`, `op-*`, `el-*`, `ed-*`, `tl-*`, `add-form-*`, `focus-mode-*`, `lp-*`, `export-*`, `ws-*`, `dm-*`, `sp-*`, `tp-*`, `lm-*`, `skeleton-*`, `tm-*`, `bem-*`, `timeline-dot-icon`, `info-box`, `br-*`, `us-*`, `arm-*`, `rl-*`, `cm-*`, `rm-*`, `rg-*`, `tem-*`, `ccm-*`, `timer-*`, `lc-*` sections added; breadcrumbs updated
- [x] **Dashboard.css** — HeroWelcome alias, hero-top scoping
- [ ] **themes.css** — color palette/tokens (`src/styles/themes.css`)

## Stats
- **31 pages** | **116+ components** | **34 CSS files** | **677 inline style occurrences**
- **Session progress:** All existing files with inline styles processed; remaining items are non-existent files or future component work
- Done (this session): UniversalSearch, AddLocation, BackupRestorePage, BillingPanel, TaskProfile, ListManager, SkeletonLoader, TagManager, BatchEditModal, TimelineItem, MigrationBanner, InstallPrompt, WorkspaceInvitationGenerator, Avatar, AvatarPicker, AddRelationshipModal, RelationshipList, ChecklistManager, RelationshipManager, RelationshipGraph, TimeEntryManager, CopyContactModal, Timer, LocationCard, ProgressTracker + all zero-style components checked off
