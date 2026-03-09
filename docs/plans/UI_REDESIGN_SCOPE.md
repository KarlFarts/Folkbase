# Folkbase UI Redesign Scope

## Auth & Onboarding
- [x] **SetupWizard** (3 steps: Welcome/Auth, Profile, Completion) — `src/components/SetupWizard/`
- [x] **Login/OAuth flow** — N/A: unauthenticated users see dedicated `SignInPage`; Navbar only renders post-auth

## Main Layout & Navigation
- [x] **Navbar** — `src/components/Navbar.js` — card-surface bar, card-chip nav links, ChevronDown rotation to CSS class
- [x] **Breadcrumbs** — `src/components/Breadcrumbs.js` — card-chip language, frosted glass, border tokens
- [x] **WorkspaceSwitcher** — `src/components/WorkspaceSwitcher.js` — ChevronDown inline style → CSS class
- [x] **UniversalSearch** — `src/components/UniversalSearch.js` — 35 inline styles → `us-*` classes; removed React import
- [x] **BraindumpFAB** (floating action button) — `src/components/BraindumpFAB.js` — already clean, no inline styles

## Dashboard (`/`)
- [x] **Dashboard page** — `src/pages/Dashboard.js` + `src/styles/Dashboard.css` — HeroWelcome fix, hero-top scoping
- [x] **HeroWelcome** — aliased `.dashboard-welcome-row` to hero rules; removed React import
- [x] **QuickActionBar** — 2 inline styles → `qab-*` classes; removed React import; `React.useRef` → `useRef`
- [x] **DashboardSidebar** — 0 inline styles; removed React import
- [x] **UrgentSection** — 1 inline style → `us-count-badge`; removed React import
- [x] **UrgentCard** — 6 inline styles → `uc-*` classes; removed React import
- [x] **NeedToContactWidget** — 0 inline styles; removed React import
- [x] **IncompleteTouchpointsWidget** — 13 inline styles → `itw-*` classes; removed React import
- [x] **UpcomingBirthdays** — 6 inline styles → `ub-*` classes; removed React import
- [x] **UpcomingEvents** — 5 inline styles → `ue-*` classes; removed React import
- [x] **UpcomingEventsWidget** — 0 inline styles; removed React import
- [x] **ToDoWidget** — 0 inline styles; removed React import
- [x] **ProfileCompletionWidget** — 2 inline styles → `pcw-*` classes; removed React import
- [x] **CelebrationsWidget** — 0 inline styles; removed React import
- [x] **RecentActivity** — 7 inline styles → `ra-*` classes; removed React import
- [x] **SettingsWidget** — 1 inline style → `sw-body`; removed React import
- [x] **CustomActionsWidget** — 0 inline styles; removed React import
- [x] **CollapsibleWidget** — 0 inline styles; removed React import
- [x] **SearchBar** — 4 inline styles → `sb-*` classes; removed React import
- [x] **QuickActions** — 0 inline styles; removed React import

## Contact System
- [x] **ContactList** (`/contacts`) — all 18 inline styles → `cl-*` CSS classes; deleted inline @keyframes spin
- [x] **ContactProfile** (`/contacts/:id`) — horizontal tab bar replaces dropdown+sidebar; action buttons in header; all 46 inline styles → `cp-*` classes
- [x] **AddContact** (`/contacts/add`) — 15 inline styles → `add-form-*` classes; removed React import
- [x] **ContactCard** — already clean, no inline styles
- [x] **ContactTable** — `src/components/ContactTable.js` — already clean, no inline styles
- [x] **ContactFilters** — 6 inline styles → `cf-*` classes; removed React import
- [x] **ProfileHeader** — 16 inline styles → `ph-*` classes; removed React import
- [x] **ProfileTabs** — 8 inline styles → `pt-*` classes; removed React import
- [x] **ContactActivities** — dynamic maxHeight stays inline; static styles → `ca-*` classes; removed React import
- [x] **SocialsManager** — 6 inline styles → `soc-*` classes; removed React import
- [x] **EducationManager** — 6 inline styles → `edu-*` classes; removed React import
- [x] **EmploymentManager** — 6 inline styles → `emp-*` classes; removed React import
- [x] **DistrictsManager** — 4 inline styles → `dis-*` classes; removed React import
- [x] **TouchpointModal** — 8 inline styles → `tpm-*` classes; removed React import
- [x] **ContactAttributesManager** — 9 inline styles → `cam-*` classes; removed React import
- [x] **ContactMethodsManager** — 15 inline styles → `cmm-*` classes; removed React import

## Organization System
- [x] **OrganizationList** (`/organizations`) — reused `cl-*` classes; fixed double-className; removed React import
- [x] **OrganizationProfile** (`/organizations/:id`) — reused `cp-tab-bar`/`cp-linked-card`; all inline styles → `op-*` classes; corrected accent color token
- [x] **AddOrganization** (`/organizations/add`) — 16 inline styles → `add-form-*` classes; removed React import
- [x] **OrganizationCard** — already clean, no inline styles
- [x] **DepartmentsManager** — 6 inline styles → `dm-*` classes; removed React import
- [x] **OrgContactsManager** — 9 inline styles → `dm-*` classes (shared namespace); removed React import

## Location System
- [x] **LocationList** (`/locations`) — 13 inline styles → reused `cl-*` classes; removed React import; deleted inline @keyframes spin
- [x] **LocationProfile** (`/locations/:id`) — 47 inline styles → `lp-*` classes; reused `cp-tab-bar`, `op-field-stack`, `tl-item-list`; removed React import
- [x] **AddLocation** (`/locations/add`) — 16 inline styles → `add-form-*` classes; removed React import
- [x] **LocationCard** — 1 inline style → `lc-mappin-icon`; removed React import

## Events System
- [x] **EventsList** (`/events`) — all inline styles → `el-*` classes; removed React import; deduped filtered views
- [x] **EventDetails** (`/events/:id`) — all ~25 inline styles → `ed-*` classes; reused `cp-linked-card`; removed React import
- [x] **AddEvent** (`/events/add`) — 7 inline styles → `add-form-field`, `add-form-actions`, `add-form-card--lg`; removed React import
- [x] **EventCard** — 14 inline styles → `ec-*` classes; removed React import
- [x] **CalendarView** — 10 static styles → `cv-*` classes; dynamic day cell bg/color stays inline; removed React import
- [x] **TimelineView** — 8 static styles → `tv-*` classes; dynamic past/future colors stay inline; removed React import
- [x] **AttendeesManager** — 5 inline styles → `atm-*` classes; removed React import
- [x] **AttendeeSelector** — 11 inline styles → `ats-*` classes; removed React import
- [x] **AgendaManager** — 15 inline styles → `agm-*` classes; removed React import
- [x] **ResourcesManager** — 6 inline styles → `resm-*` classes; removed React import
- [x] **ImportEventModal** — 13 inline styles → `iem-*` classes; removed React import
- [x] **SyncConflictModal** — 18 static styles → `scm-*` classes; dynamic diff highlight stays inline; kept React for Fragment

## Touchpoints
- [x] **TouchpointsList** (`/touchpoints`) — all inline styles → `tl-*` classes; modal overlays extracted; removed React import
- [x] **TouchpointModal** — moved to `src/components/contact/TouchpointModal.js`; tracked under Contact System
- [x] **LogTouchpointMinimal** — 4 inline styles → `ltm-*` classes; removed React import
- [x] **LogTouchpointQuickModal** — 6 inline styles → `ltqm-*` classes; removed React import

## Tasks
- [x] **TasksPage** (`/tasks`) — already clean, no inline styles
- [x] **TaskProfile** (`/tasks/:id`) — 33 inline styles → `tp-*` classes; removed React import
- [x] **ChecklistManager** — 14 inline styles → `cm-*` classes; removed React import
- [x] **TimeEntryManager** — 8 inline styles → `tem-*` classes; removed React import

## Notes & Braindump
- [x] **NotesInbox** (`/notes`) — 1 inline style → `.notes-status-bar-actions` class in NotesInbox.css; removed React import
- [x] **BraindumpPage** (`/braindump`) — already clean, no inline styles; removed React import
- [x] **NotesDisplaySection** — 0 inline styles; removed React import
- [x] **LinkedEntitiesDisplay** — entity-color styles are dynamic (stay inline); removed React import
- [x] **CommitNoteModal** — 15 static styles → `cnm-*` classes; dynamic progress/step colors stay inline; `React.Fragment` → `Fragment`
- [x] **BulkCommitModal** — 9 static styles → `bcm-*` classes; dynamic progress bar width stays inline; removed React import
- [x] **LinkEntitiesModal** — 13 static styles → `lem-*` classes; dynamic entity selection bg stays inline; removed React import
- [x] **QuickCommitButton** — static wrapper/toast styles → `qcb-*` classes; dynamic cursor/bg states stay inline; removed React import
- [x] **EntitySuggestionsPanel** — 0 inline styles; removed React import
- [x] **EntitySuggestionCard** — 0 inline styles; removed React import

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
- [x] **FileDropzone** — 0 inline styles; removed React import
- [x] **ImportSourceSelector** — 3 inline styles → `iss-*` classes; removed React import
- [x] **FieldMappingPreview** — 0 inline styles; removed React import
- [x] **DataCorrectionTable** — 0 inline styles; removed React import
- [x] **BatchActionsToolbar** — 0 inline styles; removed React import
- [x] **DuplicateReviewPanel** — 0 inline styles; removed React import
- [x] **ExportFilters** — 2 inline styles → `ef-*` classes; removed React import
- [x] **FieldSelector** — 7 inline styles → `fs-*` classes; removed React import; hover via CSS instead of onMouseEnter/Leave
- [x] **QuickSync components** — ContactFileDropzone, NewContactCard, QuickEnrichmentForm, SyncSummary — 0 inline styles; have own CSS files

## Call & Meeting Modes
- [x] **CallMode** (`/call-mode/:contactId`) — 14 inline styles → `focus-mode-*` classes
- [x] **MeetingMode** (`/meeting-mode`) — 10 inline styles → `focus-mode-*` + attendee classes
- [x] **Timer** — 3 inline styles → `timer-*` classes

## Workspaces
- [x] **WorkspaceDashboard** (`/workspaces`) — 3 inline styles → `ws-folder-*` classes; removed React import
- [x] **CreateWorkspace** (`/workspaces/create`) — already clean, no inline styles
- [x] **JoinWorkspace** (`/join`) — already clean, no inline styles
- [x] **WorkspaceInvitationGenerator** — 1 inline style → `info-box` class in index.css; removed React import
- [x] **SubWorkspaceManager** — 0 inline styles; removed React import
- [x] **ContactWorkspaceBadges** — 0 inline styles; removed React import
- [x] **CopyContactModal** — 5 inline styles → `ccm-*` classes; removed React import
- [x] **BulkCopyModal** — 7 inline styles → `bcm2-*` classes; removed React import

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

- [x] **index.css** — `cl-*`, `cp-*`, `op-*`, `el-*`, `ed-*`, `tl-*`, `add-form-*`, `focus-mode-*`, `lp-*`, `export-*`, `ws-*`, `dm-*`, `sp-*`, `tp-*`, `lm-*`, `skeleton-*`, `tm-*`, `bem-*`, `timeline-dot-icon`, `info-box`, `br-*`, `us-*`, `arm-*`, `rl-*`, `cm-*`, `rm-*`, `rg-*`, `tem-*`, `ccm-*`, `timer-*`, `lc-*`, `qab-*`, `us-count-badge`, `uc-*`, `itw-*`, `ub-*`, `ue-*`, `ra-*`, `pcw-*`, `sb-*`, `sw-*`, `ph-*`, `pt-*`, `ca-*`, `soc-*`, `edu-*`, `emp-*`, `dis-*`, `tpm-*`, `cam-*`, `cmm-*`, `bcm2-*`, `cf-*`, `cnm-*`, `bcm-*`, `lem-*`, `qcb-*`, `led-*`, `ec-*`, `cv-*`, `tv-*`, `atm-*`, `ats-*`, `agm-*`, `resm-*`, `iem-*`, `scm-*`, `iss-*`, `ltm-*`, `ltqm-*`, `dm-*` (org), `ef-*`, `fs-*` sections added; breadcrumbs updated
- [x] **Dashboard.css** — HeroWelcome alias, hero-top scoping
- [x] **themes.css** — already pure CSS custom properties, no inline styles to migrate

## Stats

- **31 pages** | **116+ components** | **34 CSS files** | **677+ inline style occurrences**
- **Batches 1–5 complete:** All existing components processed
- **Remaining:** `themes.css` (exists, not reviewed); `Login/OAuth flow` (not yet built)
- Done (batches 1–3): UniversalSearch, AddLocation, BackupRestorePage, BillingPanel, TaskProfile, ListManager, SkeletonLoader, TagManager, BatchEditModal, TimelineItem, MigrationBanner, InstallPrompt, WorkspaceInvitationGenerator, Avatar, AvatarPicker, AddRelationshipModal, RelationshipList, ChecklistManager, RelationshipManager, RelationshipGraph, TimeEntryManager, CopyContactModal, Timer, LocationCard, ProgressTracker + all zero-style components checked off
- Done (batch 4): All dashboard widgets, contact/ managers, notes/ components, events/ components, import/ components, remaining top-level components
- Done (batch 5): DepartmentsManager, OrgContactsManager, ExportFilters, FieldSelector, EntitySuggestionsPanel, EntitySuggestionCard
