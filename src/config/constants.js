/**
 * ============================================================================
 * FOLKBASE - DATA ARCHITECTURE REFERENCE
 * ============================================================================
 *
 * This app uses Google Sheets as its database (100% free tier).
 * Each user has a "Personal Sheet" and can join "Workspace Sheets".
 *
 * TECHNOLOGY STACK (All Free):
 * - Google OAuth: Authentication (unlimited, free)
 * - Google Sheets API: Database storage (500 req/100s, free)
 * - React + Vite: Frontend (static hosting)
 *
 * ============================================================================
 * SHEET TABS OVERVIEW
 * ============================================================================
 *
 * CORE DATA TABS:
 * ┌─────────────────────┬────────────────────────────────────────────────────┐
 * │ Tab Name            │ Purpose                                            │
 * ├─────────────────────┼────────────────────────────────────────────────────┤
 * │ Contacts            │ Main contact records (name, phone, email, etc.)    │
 * │ Organizations       │ Organization records (companies, non-profits, etc.)│
 * │ Locations           │ Location records (offices, venues, stores, etc.)   │
 * │ Location Visits     │ Visit history for locations (similar to touchpts)  │
 * │ Touchpoints         │ Interaction history (calls, meetings, emails)      │
 * │ Events              │ Calendar events and meetings                       │
 * │ Tasks               │ To-do items and follow-ups                         │
 * │ Notes               │ Standalone notes (can link to contacts/events)     │
 * │ Lists               │ Custom contact lists/tags                          │
 * └─────────────────────┴────────────────────────────────────────────────────┘
 *
 * RELATIONSHIP TABS (Many-to-Many):
 * ┌─────────────────────────┬────────────────────────────────────────────────┐
 * │ Contact Lists           │ Links contacts to lists (many-to-many)         │
 * │ Contact Notes           │ Links notes to contacts (many-to-many)         │
 * │ Event Notes             │ Links notes to events (many-to-many)           │
 * │ List Notes              │ Links notes to lists (many-to-many)            │
 * │ Task Notes              │ Links notes to tasks (many-to-many)            │
 * │ Contact Relationships   │ Contact relationship network (family/work/etc) │
 * │ Contact Links           │ Syncs contacts between workspaces              │
 * └─────────────────────────┴────────────────────────────────────────────────┘
 *
 * WORKSPACE SYSTEM TABS:
 * ┌─────────────────────────┬────────────────────────────────────────────────────┐
 * │ Workspaces              │ Workspace hierarchy (supports nested sub-workspaces)│
 * │ Workspace Members       │ Users who belong to each workspace                  │
 * │ Workspace Invitations   │ Invitation tokens for joining workspaces            │
 * │ Sync Conflicts          │ Tracks conflicts when same contact edited in both   │
 * │ Activities              │ Activity log for workspaces                         │
 * └─────────────────────────┴────────────────────────────────────────────────────┘
 *
 * SYSTEM TABS:
 * ┌─────────────────────┬────────────────────────────────────────────────────┐
 * │ Audit Log           │ Change history for compliance/debugging            │
 * │ Import Settings     │ Saved import configurations                        │
 * │ Import History      │ Log of past data imports                           │
 * └─────────────────────┴────────────────────────────────────────────────────┘
 *
 * ============================================================================
 * ID FORMATS
 * ============================================================================
 * - Contact ID:        C001, C002, ...
 * - Organization ID:   ORG001, ORG002, ...
 * - Location ID:       LOC001, LOC002, ...
 * - Visit ID:          VIS001, VIS002, ...
 * - Touchpoint ID:     T001, T002, ...
 * - Event ID:          EVT001, EVT002, ...
 * - Task ID:           TSK001, TSK002, ...
 * - Note ID:           N001, N002, ...
 * - List ID:           LST001, LST002, ...
 * - Workspace ID:      WS001, WS002, ...
 * - Member ID:         MEM001, MEM002, ...
 * - Link ID:           LNK001, LNK002, ...
 * - Conflict ID:       CONF001, CONF002, ...
 * - Activity ID:       ACT001, ACT002, ...
 * - Invitation ID:     INV001, INV002, ...
 * - Relationship ID:   REL001, REL002, ... (contact-to-contact)
 * - Entity Rel ID:     ERE001, ERE002, ... (multi-entity relationships)
 *
 * ============================================================================
 */

// Google Sheets Tab Names
// These are the actual tab names in the Google Sheet
export const SHEET_NAMES = {
  // === CORE DATA ===
  CONTACTS: 'Contacts', // Main contact records
  ORGANIZATIONS: 'Organizations', // Organization records (companies, non-profits, etc.)
  LOCATIONS: 'Locations', // Location records (offices, venues, etc.)
  TOUCHPOINTS: 'Touchpoints', // Interaction history (calls, meetings, etc.)
  EVENTS: 'Events', // Calendar events
  TASKS: 'Tasks', // To-do items
  LISTS: 'Lists', // Custom list definitions
  NOTES: 'Notes', // Standalone notes
  LOCATION_VISITS: 'Location Visits', // Visit history for locations

  // === RELATIONSHIPS (Many-to-Many) ===
  CONTACT_LISTS: 'Contact Lists', // Links contacts <-> lists
  CONTACT_SOCIALS: 'Contact Socials', // Contact social media profiles
  CONTACT_EDUCATION: 'Contact Education', // Contact education history
  CONTACT_EMPLOYMENT: 'Contact Employment', // Contact employment history
  CONTACT_DISTRICTS: 'Contact Districts', // Contact electoral districts
  CONTACT_ATTRIBUTES: 'Contact Attributes',
  CONTACT_METHODS: 'Contact Methods',
  EVENT_ATTENDEES: 'Event Attendees', // Event attendee tracking (RSVP, check-in, roles)
  EVENT_RESOURCES: 'Event Resources', // Event materials, equipment, costs
  EVENT_AGENDA: 'Event Agenda', // Event agenda items (timeline, speakers, duration)
  ORG_CONTACTS: 'Organization Contacts', // Organization key contacts (roles, departments)
  ORG_DEPARTMENTS: 'Organization Departments', // Organization departments/divisions
  TASK_CHECKLIST: 'Task Checklist', // Task checklist items (sub-tasks)
  TASK_TIME_ENTRIES: 'Task Time Entries', // Task time tracking entries
  CONTACT_NOTES: 'Contact Notes', // Links notes <-> contacts
  EVENT_NOTES: 'Event Notes', // Links notes <-> events
  LIST_NOTES: 'List Notes', // Links notes <-> lists
  TASK_NOTES: 'Task Notes', // Links notes <-> tasks
  CONTACT_RELATIONSHIPS: 'Contact Relationships', // Links contacts with relationship types
  ENTITY_RELATIONSHIPS: 'Entity Relationships', // Links any entity type (contacts, orgs, locations)

  // === SYSTEM ===
  AUDIT_LOG: 'Audit Log', // Change history
  IMPORT_SETTINGS: 'Import Settings', // Saved import configs
  IMPORT_HISTORY: 'Import History', // Import execution log

  // === WORKSPACE SYSTEM ===
  WORKSPACES: 'Workspaces', // Workspace hierarchy (nested)
  WORKSPACE_MEMBERS: 'Workspace Members', // User <-> Workspace membership
  WORKSPACE_INVITATIONS: 'Workspace Invitations', // Join tokens
  CONTACT_LINKS: 'Contact Links', // Syncs contacts across workspaces
  SYNC_CONFLICTS: 'Sync Conflicts', // Conflict resolution queue
  ACTIVITIES: 'Activities', // Workspace activity log
};

// Auto-generated fields
export const AUTO_FIELDS = {
  'Contact ID': 'auto-generate',
  'Organization ID': 'auto-generate',
  'Location ID': 'auto-generate',
  'Visit ID': 'auto-generate',
  'Date Added': 'auto-fill',
  'Last Contact Date': 'auto-update',
  'Touchpoint ID': 'auto-generate',
  'Contact Name': 'auto-link',
  'Location Name': 'auto-link',
  'Event ID': 'auto-generate',
  'Event Created Date': 'auto-fill',
  'Task ID': 'auto-generate',
  'Task Created Date': 'auto-fill',
  'List ID': 'auto-generate',
  'List Created Date': 'auto-fill',
  'Added To List Date': 'auto-fill',
  'Note ID': 'auto-generate',
  'Created Date': 'auto-fill',
  'Created By': 'auto-fill',
  'Linked Date': 'auto-fill',
  // Contact junction tab IDs
  'Social ID': 'auto-generate',
  'Education ID': 'auto-generate',
  'Employment ID': 'auto-generate',
  'District ID': 'auto-generate',
  'Attribute ID': 'auto-generate',
  'Contact Method ID': 'auto-generate',
  // Event junction tab IDs
  'Attendee ID': 'auto-generate',
  'Resource ID': 'auto-generate',
  'Agenda Item ID': 'auto-generate',
  // Organization junction tab IDs
  'Org Contact ID': 'auto-generate',
  'Department ID': 'auto-generate',
  // Task junction tab IDs
  'Checklist Item ID': 'auto-generate',
  'Time Entry ID': 'auto-generate',
  // Workspace system fields
  'Workspace ID': 'auto-generate',
  Path: 'auto-generate',
  'Member ID': 'auto-generate',
  'Added Date': 'auto-fill',
  'Link ID': 'auto-generate',
  'Last Sync': 'auto-update',
  'Conflict ID': 'auto-generate',
  'Activity ID': 'auto-generate',
  Timestamp: 'auto-fill',
  // Relationship system fields
  'Relationship ID': 'auto-generate',
  'Last Updated': 'auto-update',
};

// Note visibility levels
export const VISIBILITY = {
  PRIVATE: 'Private',
  SHARED: 'Shared',
  CAMPAIGN_WIDE: 'Campaign-Wide',
  WORKSPACE_WIDE: 'Workspace-Wide',
};

// Touchpoint completion status
export const TOUCHPOINT_STATUS = {
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
};

// Schema Version Tracking
export const SCHEMA_VERSION = 3; // Current schema version (v1 = legacy 6-column contacts, v2 = master directory, v3 = expanded contact profile)
export const SCHEMA_STORAGE_KEY = '_folkbase_schema_version'; // localStorage key for dev mode

// Workspace Roles
export const WORKSPACE_ROLES = { OWNER: 'owner', EDITOR: 'editor', VIEWER: 'viewer' };

// Permission Features (used for per-feature write overrides)
export const PERMISSION_FEATURES = ['contacts', 'touchpoints', 'notes', 'events', 'tasks'];

// Business Logic Thresholds
export const THRESHOLDS = {
  FOLLOW_UP_DAYS: 30, // Days before contact needs follow-up
  TOKEN_REFRESH_BUFFER: 300, // Seconds before expiry to refresh token
  TOKEN_LIFETIME: 3600, // Google OAuth token lifetime in seconds
  STATUS_CHECK_INTERVAL: 30000, // Settings status check interval (ms)
  AUTO_REFRESH_CHECK: 300000, // Auto-refresh check interval (5 minutes)
};

// API Configuration
export const API_CONFIG = {
  SHEETS_API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
  TOKEN_INFO_URL: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
  REQUIRED_SCOPES: ['https://www.googleapis.com/auth/spreadsheets'],
};

// Sheet Headers Configuration
export const SHEET_HEADERS = {
  [SHEET_NAMES.CONTACTS]: [
    // System (3)
    'Contact ID',
    'Date Added',
    'Last Updated',
    // Names (5)
    'First Name',
    'Last Name',
    'Middle Name',
    'Preferred Name',
    'Display Name',
    // Contact Methods (10)
    'Phone Mobile',
    'Phone Home',
    'Phone Work',
    'Email Personal',
    'Email Work',
    'Preferred Contact Method',
    'Preferred Text Number',
    'Website',
    'LinkedIn',
    'Twitter Handle',
    // Identity (5)
    'Pronoun',
    'Date of Birth',
    'Age',
    'Gender',
    'Language Preference',
    // Professional (4)
    'Organization',
    'Role',
    'Department',
    'Work Status',
    // Mailing (6)
    'Mailing Address',
    'Street',
    'City',
    'State',
    'ZIP',
    'Country',
    // Political (5)
    'Party Affiliation',
    'Voter Status',
    'Voting Precinct',
    'Volunteer Status',
    'Donation History',
    // Engagement (7)
    'Priority',
    'Status',
    'Tags',
    'Bio',
    'Notes',
    'Pinned',
    'Last Contact Date',
    // Avatar (2)
    'Avatar Color',
    'Avatar Icon',
    // Demographics (12)
    'Race / Ethnicity',
    'Race / Ethnicity Notes',
    'Cultural / Ethnic Subgroup',
    'LGBTQ+ Identity',
    'LGBTQ+ Identity Notes',
    'Disability / Accessibility Needs',
    'Disability / Accessibility Notes',
    'Immigration / Refugee Background',
    'Veteran Status',
    'Religious / Spiritual Affiliation',
    'Student Status',
    'Parent / Caregiver Status',
    // Contact Preferences (2)
    'Best Time to Contact',
    'Opt-In Status',
    // Community (2)
    'Neighborhood / Ward / District',
    'Local Business Owner / Worker',
    // Donor (1)
    'Donor Status',
    // Privacy (2)
    'Privacy Preferences',
    'Media Consent',
    // Internal (3)
    'Created By',
    'Duplicate Linked To',
    'Source',
    // LEGACY FIELD FOR BACKWARD COMPATIBILITY (deprecated, use Display Name)
    'Name',
    // LEGACY FIELDS FOR BACKWARD COMPATIBILITY (deprecated, use typed fields)
    'Phone',
    'Email',
  ],
  [SHEET_NAMES.TOUCHPOINTS]: [
    'Touchpoint ID',
    'Contact ID',
    'Contact Name',
    'Type',
    'Date',
    'Notes',
    'Status',
    'Outcome',
    'Follow-up Needed',
    'Follow-up Date',
    'Duration (min)',
    'Attendees',
    'Location',
    'Event ID',
  ],
  [SHEET_NAMES.EVENTS]: [
    // System (3)
    'Event ID',
    'Event Created Date',
    'Last Updated',
    // Identity (6)
    'Event Name',
    'Event Type',
    'Event Category',
    'Event Series',
    'Event Code',
    'Display Order',
    // Scheduling (6)
    'Event Date',
    'Start Time',
    'End Time',
    'Duration (Minutes)',
    'Time Zone',
    'Is All Day Event',
    // Location (5)
    'Location ID',
    'Location',
    'Venue Name',
    'Address',
    'Virtual Meeting Link',
    // Description (3)
    'Description',
    'Target Audience',
    'Goals/Objectives',
    // Attendance (5)
    'Expected Attendees',
    'Confirmed Attendees',
    'Actual Attendance',
    'Attendees',
    'RSVP Deadline',
    // Logistics (4)
    'Organizer Contact ID',
    'Budget',
    'Actual Cost',
    'Materials Needed',
    // Communication (2)
    'Registration Link',
    'Notes',
    // Status/Meta (1)
    'Status',
    // Calendar Sync (3)
    'Google Calendar ID',
    'Last Synced At',
    'Sync Source',
  ],
  [SHEET_NAMES.TASKS]: [
    // System (3)
    'Task ID',
    'Task Created Date',
    'Last Updated',
    // Core (7)
    'Title',
    'Description',
    'Task Type',
    'Priority',
    'Status',
    'Completion Percentage',
    'Tags',
    // Assignment (4)
    'Assigned To',
    'Assigned To Name',
    'Created By',
    'Delegated From',
    // Dependencies (3)
    'Parent Task ID',
    'Depends On',
    'Blocks',
    // Progress (3)
    'Started Date',
    'Completed Date',
    'Actual Hours',
    // Scheduling (5)
    'Due Date',
    'Start Date',
    'Estimated Hours',
    'Reminder Date',
    'Recurrence Pattern',
    // Context (4)
    'Related Contact ID',
    'Related Event ID',
    'Related Organization ID',
    'Project/Category',
    // Meta (1)
    'Notes',
  ],
  [SHEET_NAMES.NOTES]: [
    'Note ID',
    'Created Date',
    'Created By',
    'Content',
    'Note Type',
    'Status',
    'Event ID',
    'Visibility',
    'Shared With',
    'Tags',
  ],
  [SHEET_NAMES.CONTACT_NOTES]: ['Note ID', 'Contact ID', 'Linked Date'],
  [SHEET_NAMES.EVENT_NOTES]: ['Event ID', 'Note ID', 'Linked Date'],
  [SHEET_NAMES.LIST_NOTES]: ['List ID', 'Note ID', 'Linked Date'],
  [SHEET_NAMES.TASK_NOTES]: ['Task ID', 'Note ID', 'Linked Date'],
  [SHEET_NAMES.LISTS]: ['List ID', 'List Created Date', 'List Name', 'Description'],
  [SHEET_NAMES.CONTACT_LISTS]: ['Contact ID', 'List ID', 'Added To List Date'],
  [SHEET_NAMES.CONTACT_SOCIALS]: [
    'Social ID',
    'Contact ID',
    'Platform',
    'Handle',
    'URL',
    'Is Primary',
    'Notes',
  ],
  [SHEET_NAMES.CONTACT_EDUCATION]: [
    'Education ID',
    'Contact ID',
    'Institution',
    'Degree',
    'Field of Study',
    'Start Year',
    'End Year',
    'Is Current',
    'Notes',
  ],
  [SHEET_NAMES.CONTACT_EMPLOYMENT]: [
    'Employment ID',
    'Contact ID',
    'Organization ID',
    'Organization Name',
    'Role',
    'Department',
    'Start Date',
    'End Date',
    'Is Current',
    'Notes',
  ],
  [SHEET_NAMES.CONTACT_DISTRICTS]: [
    'District ID',
    'Contact ID',
    'District Type',
    'District Name',
    'District Number',
    'Representative',
    'Representative Contact',
    'Notes',
  ],
  [SHEET_NAMES.CONTACT_ATTRIBUTES]: [
    'Attribute ID',
    'Contact ID',
    'Category',
    'Value',
    'Notes',
    'Date Added',
  ],
  [SHEET_NAMES.CONTACT_METHODS]: [
    'Contact Method ID',
    'Contact ID',
    'Type',
    'Label',
    'Value',
    'Is Primary',
    'Notes',
  ],
  [SHEET_NAMES.EVENT_ATTENDEES]: [
    'Attendee ID',
    'Event ID',
    'Contact ID',
    'Contact Name',
    'RSVP Status',
    'Check-In Time',
    'Role',
    'Notes',
  ],
  [SHEET_NAMES.EVENT_RESOURCES]: [
    'Resource ID',
    'Event ID',
    'Resource Type',
    'Item Name',
    'Quantity',
    'Cost Per Unit',
    'Total Cost',
    'Provider/Source',
    'Notes',
  ],
  [SHEET_NAMES.EVENT_AGENDA]: [
    'Agenda Item ID',
    'Event ID',
    'Start Time',
    'End Time',
    'Duration (Minutes)',
    'Title',
    'Description',
    'Speaker Contact ID',
    'Speaker Name',
    'Location/Room',
    'Notes',
  ],
  [SHEET_NAMES.ORG_CONTACTS]: [
    'Org Contact ID',
    'Organization ID',
    'Contact ID',
    'Contact Name',
    'Role/Title',
    'Department',
    'Start Date',
    'End Date',
    'Is Current',
    'Is Primary Contact',
    'Notes',
  ],
  [SHEET_NAMES.ORG_DEPARTMENTS]: [
    'Department ID',
    'Organization ID',
    'Department Name',
    'Department Type',
    'Phone',
    'Email',
    'Head Contact ID',
    'Head Contact Name',
    'Size',
    'Notes',
  ],
  [SHEET_NAMES.TASK_CHECKLIST]: [
    'Checklist Item ID',
    'Task ID',
    'Item Text',
    'Is Completed',
    'Completed Date',
    'Assigned To',
    'Assigned To Name',
    'Display Order',
    'Notes',
  ],
  [SHEET_NAMES.TASK_TIME_ENTRIES]: [
    'Time Entry ID',
    'Task ID',
    'Contact ID',
    'Contact Name',
    'Start Time',
    'End Time',
    'Duration (Hours)',
    'Date',
    'Notes',
  ],
  [SHEET_NAMES.AUDIT_LOG]: [
    'Timestamp',
    'Contact ID',
    'Contact Name',
    'Field Changed',
    'Old Value',
    'New Value',
    'User Email',
  ],
  [SHEET_NAMES.IMPORT_SETTINGS]: [
    'Import ID',
    'Import Name',
    'Field Mappings',
    'Schedule',
    'Created Date',
  ],
  [SHEET_NAMES.IMPORT_HISTORY]: [
    'Import ID',
    'Execution Date',
    'Status',
    'Rows Processed',
    'Errors',
    'User Email',
  ],
  // Workspace system sheets
  [SHEET_NAMES.WORKSPACES]: [
    'Workspace ID',
    'Workspace Name',
    'Parent Workspace ID',
    'Path',
    'Sheet ID',
    'Created Date',
    'Created By',
    'Status',
    'Description',
  ],
  [SHEET_NAMES.WORKSPACE_MEMBERS]: [
    'Member ID',
    'Workspace ID',
    'Member Email',
    'Role',
    'Added Date',
    'Added By',
    'Overrides',
  ],
  [SHEET_NAMES.WORKSPACE_INVITATIONS]: [
    'Invitation ID',
    'Workspace ID',
    'Token',
    'Created By',
    'Created Date',
    'Expires At',
    'Max Uses',
    'Current Uses',
    'Role',
    'Is Active',
    'Default Overrides',
  ],
  [SHEET_NAMES.CONTACT_LINKS]: [
    'Link ID',
    'Source Sheet ID',
    'Source Contact ID',
    'Target Sheet ID',
    'Target Contact ID',
    'Sync Strategy',
    'Last Sync',
    'Created Date',
  ],
  [SHEET_NAMES.SYNC_CONFLICTS]: [
    'Conflict ID',
    'Link ID',
    'Field Name',
    'Source Value',
    'Target Value',
    'Resolution',
    'Resolved Date',
    'Resolved By',
  ],
  [SHEET_NAMES.ACTIVITIES]: [
    'Activity ID',
    'Activity Type',
    'Contact ID',
    'Workspace ID',
    'Timestamp',
    'User Email',
    'Details',
  ],
  [SHEET_NAMES.CONTACT_RELATIONSHIPS]: [
    'Relationship ID',
    'Source Entity Type',
    'Source Entity ID',
    'Source Contact ID',
    'Target Entity Type',
    'Target Entity ID',
    'Target Contact ID',
    'Relationship Type',
    'Relationship Subtype',
    'Is Directional',
    'Strength',
    'Notes',
    'Date Established',
    'Created By',
    'Created Date',
    'Last Updated',
  ],
  [SHEET_NAMES.ENTITY_RELATIONSHIPS]: [
    'Relationship ID',
    'Source Entity Type',
    'Source Entity ID',
    'Target Entity Type',
    'Target Entity ID',
    'Relationship Type',
    'Relationship Subtype',
    'Is Directional',
    'Strength',
    'Notes',
    'Date Established',
    'Created By',
    'Created Date',
    'Last Updated',
  ],
  [SHEET_NAMES.ORGANIZATIONS]: [
    // System (3)
    'Organization ID',
    'Date Added',
    'Last Updated',
    // Identity (7)
    'Name',
    'Display Name',
    'Type',
    'Legal Name',
    'Tax ID/EIN',
    'Founded Date',
    'Industry',
    // Contact Info (7)
    'Phone',
    'Email',
    'Website',
    'Facebook',
    'Twitter',
    'LinkedIn',
    'Instagram',
    // Location (6)
    'Address',
    'Street',
    'City',
    'State',
    'ZIP',
    'Country',
    // Organizational (6)
    'Size',
    'Annual Budget',
    'Annual Revenue',
    'Leadership Structure',
    'Parent Organization ID',
    'Headquarters Location',
    // Political (5)
    'Political Affiliation',
    'Endorsement Status',
    'Endorsement Priority',
    'Key Issues',
    'Electoral Focus',
    // Engagement (5)
    'Priority',
    'Status',
    'Tags',
    'Notes',
    'Last Contact Date',
    // Internal (1)
    'Created By',
  ],
  [SHEET_NAMES.LOCATIONS]: [
    'Location ID',
    'Date Added',
    'Last Contact Date',
    'Name',
    'Address',
    'Phone',
    'Type',
    'Website',
    'Business Hours',
    'Notes',
    'Tags',
    'Priority',
    'Status',
    'Accessibility Notes',
    'Capacity',
    'Created By',
    'Last Updated',
  ],
  [SHEET_NAMES.LOCATION_VISITS]: [
    'Visit ID',
    'Location ID',
    'Location Name',
    'Contact ID',
    'Date',
    'Purpose',
    'Notes',
    'Duration',
    'Follow-up Needed',
    'Follow-up Date',
    'Created By',
    'Created Date',
  ],
};

/**
 * ============================================================================
 * API RATE LIMITS & QUOTAS
 * ============================================================================
 *
 * This configuration defines all external APIs used by Folkbase.
 * Each entry includes rate limit information for automatic tracking.
 *
 * ADDING A NEW API:
 * -----------------
 * The easiest way is to run: npm run add-api
 *
 * Or manually add an entry following this structure:
 *
 * @example
 * MY_API: {
 *   name: 'Display Name',           // Human-readable name
 *   cost: 'FREE (1000 calls/day)',  // Pricing info for display
 *   enabled: true,                   // Set false to disable tracking
 *   quotas: [
 *     {
 *       type: 'per-day',            // per-second, per-minute, per-hour, per-day, per-month
 *       limit: 1000,                // Number of requests allowed
 *       window: 86400,              // Window in seconds (86400 = 1 day)
 *       description: 'Free tier',   // Human-readable description
 *     },
 *   ],
 *   documentationUrl: 'https://...',  // Link to API docs
 * },
 *
 * QUOTA TYPES:
 * ------------
 * - 'per-second'      : window = 1
 * - 'per-minute'      : window = 60
 * - 'per-hour'        : window = 3600
 * - 'per-day'         : window = 86400
 * - 'per-month'       : window = 2592000
 * - 'per-100-seconds' : window = 100 (Google's format)
 *
 * DOCUMENTATION:
 * --------------
 * - Full guide: docs/API_INTEGRATION_GUIDE.md
 * - Free APIs: docs/FREE_APIS_CATALOG.md
 * - Examples: docs/examples/
 *
 * ============================================================================
 */
export const API_QUOTAS = {
  /**
   * Google Sheets API - Primary database for Folkbase
   * @see https://developers.google.com/sheets/api/limits
   */
  GOOGLE_SHEETS: {
    name: 'Google Sheets API',
    cost: 'FREE (unlimited)',
    enabled: true,
    quotas: [
      {
        type: 'per-100-seconds-project',
        limit: 500,
        window: 100,
        description: 'Total requests across all users in the project',
      },
      {
        type: 'per-100-seconds-user',
        limit: 100,
        window: 100,
        description: 'Requests per individual user',
      },
    ],
    documentationUrl: 'https://developers.google.com/sheets/api/limits',
  },

  // ============================================================================
  // TEMPLATES FOR COMMON API TYPES
  // ============================================================================
  // Uncomment and modify these templates when adding new APIs.
  // Or use: npm run add-api for an interactive setup.

  /*
   * TEMPLATE: API with daily limit (most common)
   * Example: OpenWeatherMap, ExchangeRate-API
   */
  // WEATHER_API: {
  //   name: 'OpenWeatherMap',
  //   cost: 'FREE (1000 calls/day)',
  //   enabled: true,
  //   quotas: [
  //     {
  //       type: 'per-day',
  //       limit: 1000,
  //       window: 86400,
  //       description: 'Free tier daily limit',
  //     },
  //   ],
  //   documentationUrl: 'https://openweathermap.org/api',
  // },

  /*
   * TEMPLATE: API with per-second limit (strict rate limiting)
   * Example: Nominatim geocoding
   */
  // NOMINATIM: {
  //   name: 'OpenStreetMap Nominatim',
  //   cost: 'FREE (no key required)',
  //   enabled: true,
  //   quotas: [
  //     {
  //       type: 'per-second',
  //       limit: 1,
  //       window: 1,
  //       description: 'Max 1 request per second (strictly enforced)',
  //     },
  //   ],
  //   documentationUrl: 'https://nominatim.org/release-docs/latest/',
  // },

  /*
   * TEMPLATE: API with monthly limit
   * Example: ExchangeRate-API, Abstract API
   */
  // CURRENCY_API: {
  //   name: 'ExchangeRate-API',
  //   cost: 'FREE (1500 calls/month)',
  //   enabled: true,
  //   quotas: [
  //     {
  //       type: 'per-month',
  //       limit: 1500,
  //       window: 2592000,
  //       description: 'Free tier monthly limit',
  //     },
  //   ],
  //   documentationUrl: 'https://www.exchangerate-api.com/',
  // },

  /*
   * TEMPLATE: API with no rate limits (self-impose reasonable limits)
   * Example: REST Countries
   */
  // REST_COUNTRIES: {
  //   name: 'REST Countries',
  //   cost: 'FREE (no limits)',
  //   enabled: true,
  //   quotas: [
  //     {
  //       type: 'per-minute',
  //       limit: 100,
  //       window: 60,
  //       description: 'Self-imposed reasonable limit',
  //     },
  //   ],
  //   documentationUrl: 'https://restcountries.com/',
  // },

  /*
   * TEMPLATE: API with multiple rate limits
   * Example: APIs with both per-minute and per-day limits
   */
  // MULTI_LIMIT_API: {
  //   name: 'Multi-Limit API',
  //   cost: 'FREE (60/min, 1000/day)',
  //   enabled: true,
  //   quotas: [
  //     {
  //       type: 'per-minute',
  //       limit: 60,
  //       window: 60,
  //       description: 'Rate limit per minute',
  //     },
  //     {
  //       type: 'per-day',
  //       limit: 1000,
  //       window: 86400,
  //       description: 'Daily quota',
  //     },
  //   ],
  //   documentationUrl: 'https://example.com/api-docs',
  // },
};

// API Usage Tracking Configuration
export const TRACKING_CONFIG = {
  ENABLED: true,
  RETENTION_DAYS: 30, // Keep 30 days of history
  MAX_STORAGE_MB: 5, // Max 5MB for tracking data in localStorage
  AUTO_CLEANUP: true, // Auto-delete old data
  TRACK_IN_DEV_MODE: true, // Track even in dev mode (useful for testing and visibility)
};

// Rate Limit Warning Thresholds
export const API_WARNINGS = {
  SAFE_THRESHOLD: 0.7, // Below 70% is safe
  WARNING_THRESHOLD: 0.85, // 70-85% shows warning
  CRITICAL_THRESHOLD: 0.95, // Above 95% is critical
};

// IndexedDB Cache Configuration
export const CACHE_CONFIG = {
  ENABLED: true, // Set to false to disable caching globally
  DEFAULT_TTL: 300, // 5 minutes (seconds)
  HIGH_CHURN_TTL: 120, // 2 minutes - for frequently changing data
  LOW_CHURN_TTL: 1800, // 30 minutes - for rarely changing data
  MAX_CACHE_SIZE_MB: 50, // Maximum cache size (not enforced yet)
};

// Premium Features - Features that require a paid subscription
export const PREMIUM_FEATURES = {
  WORKSPACES: 'workspaces',
  CALENDAR_SYNC: 'calendar_sync',
  IMPORT_EXPORT: 'import_export',
  DUPLICATE_DETECTION: 'duplicate_detection',
  BACKUP_RESTORE: 'backup_restore',
  BRAINDUMP: 'braindump',
};

// Subscription Status - User subscription states
export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  TRIALING: 'trialing',
};

export default {
  SHEET_NAMES,
  AUTO_FIELDS,
  THRESHOLDS,
  API_CONFIG,
  SHEET_HEADERS,
  API_QUOTAS,
  TRACKING_CONFIG,
  API_WARNINGS,
  CACHE_CONFIG,
  PREMIUM_FEATURES,
  SUBSCRIPTION_STATUS,
};
