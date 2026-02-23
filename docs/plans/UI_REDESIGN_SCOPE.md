# Folkbase UI Redesign Scope

## Auth & Onboarding
- [ ] **SetupWizard** (3 steps: Welcome/Auth, Profile, Completion) — `src/components/SetupWizard/`
- [ ] **Login/OAuth flow** (Google sign-in in navbar)

## Main Layout & Navigation
- [ ] **Navbar** — `src/components/Navbar.js`
- [ ] **Breadcrumbs** — `src/components/Breadcrumbs.js`
- [ ] **WorkspaceSwitcher** — `src/components/WorkspaceSwitcher.js`
- [ ] **UniversalSearch** — `src/components/UniversalSearch.js`
- [ ] **BraindumpFAB** (floating action button) — `src/components/BraindumpFAB.js`

## Dashboard (`/`)
- [ ] **Dashboard page** — `src/pages/Dashboard.js` + `src/styles/Dashboard.css`
- [ ] **HeroWelcome** — greeting/welcome section
- [ ] **QuickActionBar** — quick action buttons
- [ ] **DashboardSidebar** — sidebar nav
- [ ] **Widgets** (15 total): UrgentSection, NeedToContact, IncompleteTouchpoints, UpcomingBirthdays, UpcomingEvents, ToDo, ProfileCompletion, Celebrations, RecentActivity, Settings, CustomActions, CollapsibleWidget, SearchBar

## Contact System
- [ ] **ContactList** (`/contacts`) — table + card views, filters, bulk actions
- [ ] **ContactProfile** (`/contacts/:id`) — tabbed profile (Overview, Touchpoints, Notes, Details, Events, Relationships)
- [ ] **AddContact** (`/contacts/add`) — creation form
- [ ] **ContactCard** — card component
- [ ] **ContactTable** — table component
- [ ] **ContactFilters** — advanced filtering
- [ ] **ProfileHeader** — avatar, name, quick actions
- [ ] **ProfileTabs** — tab navigation in profile
- [ ] **ContactActivities** — touchpoint/note history
- [ ] **SocialsManager, EducationManager, EmploymentManager, DistrictsManager** — profile sub-sections

## Organization System
- [ ] **OrganizationList** (`/organizations`)
- [ ] **OrganizationProfile** (`/organizations/:id`)
- [ ] **AddOrganization** (`/organizations/add`)
- [ ] **OrganizationCard**
- [ ] **DepartmentsManager, OrgContactsManager** — profile sub-sections

## Location System
- [ ] **LocationList** (`/locations`)
- [ ] **LocationProfile** (`/locations/:id`)
- [ ] **AddLocation** (`/locations/add`)
- [ ] **LocationCard**

## Events System
- [ ] **EventsList** (`/events`) — list + calendar + timeline views
- [ ] **EventDetails** (`/events/:id`) — attendees, agenda, resources
- [ ] **AddEvent** (`/events/add`)
- [ ] **EventCard**
- [ ] **CalendarView** — month calendar
- [ ] **TimelineView** — timeline/Gantt view
- [ ] **AttendeesManager, AttendeeSelector, AgendaManager, ResourcesManager**
- [ ] **ImportEventModal** — Google Calendar import
- [ ] **SyncConflictModal** — conflict resolution

## Touchpoints
- [ ] **TouchpointsList** (`/touchpoints`) — history, filtering
- [ ] **TouchpointModal** — log/edit/detail
- [ ] **LogTouchpointMinimal, LogTouchpointQuickModal** — quick logging

## Tasks
- [ ] **TasksPage** (`/tasks`)
- [ ] **TaskProfile** (`/tasks/:id`) — checklist, time tracking
- [ ] **ChecklistManager, TimeEntryManager**

## Notes & Braindump
- [ ] **NotesInbox** (`/notes`) — `src/pages/NotesInbox.css`
- [ ] **BraindumpPage** (`/braindump`) — `src/pages/BraindumpPage.css`
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
- [ ] **ImportPage** (`/import`) — 5-step wizard
- [ ] **ExportPage** (`/export`)
- [ ] **QuickSyncPage** (`/quick-sync`) — `src/pages/QuickSyncPage.css`
- [ ] **FileDropzone, ImportSourceSelector, FieldMappingPreview, DataCorrectionTable, BatchActionsToolbar, DuplicateReviewPanel, ProgressTracker**
- [ ] **ExportFilters, FieldSelector**
- [ ] **QuickSync components** — ContactFileDropzone, NewContactCard, QuickEnrichmentForm, SyncSummary

## Call & Meeting Modes
- [ ] **CallMode** (`/call-mode/:contactId`) — full-screen call interface
- [ ] **MeetingMode** (`/meeting-mode`) — multi-attendee meeting
- [ ] **Timer** component

## Workspaces
- [ ] **WorkspaceDashboard** (`/workspaces`)
- [ ] **CreateWorkspace** (`/workspaces/create`) — multi-step wizard
- [ ] **JoinWorkspace** (`/join`)
- [ ] **WorkspaceInvitationGenerator**
- [ ] **SubWorkspaceManager**
- [ ] **ContactWorkspaceBadges**
- [ ] **CopyContactModal, BulkCopyModal**

## Settings
- [ ] **SettingsPage** (`/settings`) — multiple panels
- [ ] **BillingPanel** — `src/pages/SettingsPanels/BillingPanel.js`
- [ ] **BackupRestorePage** (`/backup`)

## Duplicate Management
- [ ] **DuplicateManager** (`/duplicates`)
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
- [ ] **index.css** — global styles, design tokens (`src/styles/index.css`)
- [ ] **themes.css** — color palette/tokens (`src/styles/themes.css`)
- [ ] **Dashboard.css** — `src/styles/Dashboard.css`

## Stats
- **31 pages** | **116+ components** | **34 CSS files** | **677 inline style occurrences**
- Heavy inline `style={}` usage across almost all pages — consider migrating to CSS classes
