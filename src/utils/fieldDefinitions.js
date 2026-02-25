/**
 * Field Definitions for Contact Templates
 *
 * Centralized metadata for all contact fields. Used by templates to render
 * fields with appropriate types, labels, and visual treatment.
 *
 * Field Types:
 * - text: Single line input
 * - multi-text: Comma-separated values (phones, emails)
 * - textarea: Multi-line text
 * - select: Dropdown with options
 * - tags: Comma-separated displayed as badges
 * - date: Date picker
 * - url: URL input
 * - contact-lookup: Autocomplete for contacts (future)
 *
 * Field Flags:
 * - existing: true = Field exists in Google Sheets schema
 * - pendingBackend: true = Field works in dev mode, needs Google Sheets columns added for production
 */

export const FIELD_GROUPS = {
  // Contact field groups (7-tab structure for Phase A)
  NAMES: 'names',
  CONTACT: 'contact',
  PROFESSIONAL: 'professional',
  ONLINE: 'online',
  RELATIONSHIPS: 'relationships',
  MAILING: 'mailing',
  ASSETS: 'assets',
  DEMOGRAPHICS: 'demographics',
  CONTACT_PREFS: 'contact_prefs',
  COMMUNITY: 'community',
  DONOR: 'donor',
  PRIVACY: 'privacy',
  // Legacy groups (for backward compatibility)
  IDENTITY: 'names', // Maps to NAMES
  SOCIALS: 'online', // Maps to ONLINE
  ENHANCED: 'assets', // Maps to ASSETS
  // Organization field groups
  ORGANIZATION_IDENTITY: 'org_identity',
  ORGANIZATION_DETAILS: 'org_details',
  // Location field groups
  LOCATION_IDENTITY: 'loc_identity',
  LOCATION_DETAILS: 'loc_details',
  LOCATION_OPERATIONS: 'loc_operations',
};

export const TAB_CONFIG = [
  { id: 'names', label: 'Names', group: FIELD_GROUPS.NAMES },
  { id: 'contact', label: 'Contact', group: FIELD_GROUPS.CONTACT },
  { id: 'professional', label: 'Professional', group: FIELD_GROUPS.PROFESSIONAL },
  { id: 'online', label: 'Online Presence', group: FIELD_GROUPS.ONLINE },
  { id: 'relationships', label: 'Relationships', group: FIELD_GROUPS.RELATIONSHIPS },
  { id: 'mailing', label: 'Mailing', group: FIELD_GROUPS.MAILING },
  { id: 'assets', label: 'Assets & Media', group: FIELD_GROUPS.ASSETS },
  { id: 'demographics', label: 'Demographics', group: FIELD_GROUPS.DEMOGRAPHICS },
  { id: 'community', label: 'Community', group: FIELD_GROUPS.COMMUNITY },
  { id: 'contact_prefs', label: 'Preferences', group: FIELD_GROUPS.CONTACT_PREFS },
  { id: 'donor', label: 'Donor', group: FIELD_GROUPS.DONOR },
  { id: 'privacy', label: 'Privacy', group: FIELD_GROUPS.PRIVACY },
];

export const FIELD_DEFINITIONS = [
  // Identity fields (always visible in header)
  {
    key: 'Name',
    type: 'text',
    label: 'Name',
    placeholder: 'Full name',
    group: FIELD_GROUPS.IDENTITY,
    required: true,
    existing: true,
  },
  {
    key: 'Organization',
    type: 'text',
    label: 'Organization',
    placeholder: 'Company or organization',
    group: FIELD_GROUPS.IDENTITY,
    existing: true,
  },
  {
    key: 'Role',
    type: 'text',
    label: 'Role',
    placeholder: 'Job title or role',
    group: FIELD_GROUPS.IDENTITY,
    existing: true,
  },
  {
    key: 'Priority',
    type: 'select',
    label: 'Priority',
    options: ['Urgent', 'High', 'Medium', 'Low', 'No Urgency'],
    group: FIELD_GROUPS.IDENTITY,
    existing: true,
  },
  {
    key: 'Status',
    type: 'select',
    label: 'Status',
    options: ['Active', 'Inactive', 'Do Not Contact'],
    group: FIELD_GROUPS.IDENTITY,
    existing: true,
  },
  {
    key: 'Pinned',
    type: 'select',
    label: 'Pinned',
    options: ['Yes', 'No'],
    group: FIELD_GROUPS.IDENTITY,
  },
  {
    key: 'DuplicateLinkedTo',
    type: 'text',
    label: 'Linked Duplicate',
    placeholder: 'Contact ID of related duplicate',
    group: FIELD_GROUPS.IDENTITY,
    hidden: true, // Internal field, don't show in UI
  },
  {
    key: 'Avatar Color',
    type: 'text',
    label: 'Avatar Color',
    group: FIELD_GROUPS.IDENTITY,
    hidden: true, // Controlled by AvatarPicker, not shown as form field
  },
  {
    key: 'Avatar Icon',
    type: 'text',
    label: 'Avatar Icon',
    group: FIELD_GROUPS.IDENTITY,
    hidden: true, // Controlled by AvatarPicker, not shown as form field
  },

  // Contact tab fields
  {
    key: 'Phone',
    type: 'multi-text',
    label: 'Phone',
    placeholder: '313-555-0100, 248-555-0200',
    group: FIELD_GROUPS.CONTACT,
    existing: true,
    actionable: true,
    actions: ['call', 'text'],
  },
  {
    key: 'PhoneWork',
    type: 'text',
    label: 'Work Phone',
    placeholder: '555-0100',
    group: FIELD_GROUPS.CONTACT,
    existing: false,
  },
  {
    key: 'PhoneHome',
    type: 'text',
    label: 'Home Phone',
    placeholder: '555-0100',
    group: FIELD_GROUPS.CONTACT,
    existing: false,
  },
  {
    key: 'PhoneMobile',
    type: 'text',
    label: 'Mobile Phone',
    placeholder: '555-0100',
    group: FIELD_GROUPS.CONTACT,
    existing: false,
  },
  {
    key: 'PreferredTextNumber',
    type: 'select',
    label: 'Preferred for Text',
    options: ['Work', 'Home', 'Mobile'],
    group: FIELD_GROUPS.CONTACT,
    existing: false,
  },
  {
    key: 'Email',
    type: 'multi-text',
    label: 'Email',
    placeholder: 'work@example.com, personal@example.com',
    group: FIELD_GROUPS.CONTACT,
    existing: true,
    actionable: true,
    actions: ['email'],
  },
  {
    key: 'PreferredContactMethod',
    type: 'select',
    label: 'Preferred Contact Method',
    placeholder: 'How they prefer to be reached',
    options: ['Phone', 'Email', 'Text', 'In Person'],
    group: FIELD_GROUPS.CONTACT,
  },

  // Mailing tab fields
  {
    key: 'MailingAddress',
    type: 'textarea',
    label: 'Mailing Address',
    placeholder: '123 Main St\nCity, State 12345',
    group: FIELD_GROUPS.MAILING,
  },
  {
    key: 'District',
    type: 'text',
    label: 'District',
    placeholder: 'Congressional district, city ward, etc.',
    group: FIELD_GROUPS.MAILING,
    existing: true,
  },

  // Relationships tab fields
  {
    key: 'ReferredBy',
    type: 'text', // Changed from contact-lookup to text for now
    label: 'Referred By',
    placeholder: 'Name of referring contact',
    group: FIELD_GROUPS.RELATIONSHIPS,
  },
  {
    key: 'NetworkNotes',
    type: 'textarea',
    label: 'Network Notes',
    placeholder: 'Notes about their connections and relationships...',
    group: FIELD_GROUPS.RELATIONSHIPS,
  },
  {
    key: 'RelationshipStrength',
    type: 'select',
    label: 'Relationship Strength',
    options: ['Strong', 'Good', 'Developing', 'New', 'Stale'],
    group: FIELD_GROUPS.RELATIONSHIPS,
  },
  {
    key: 'FirstMet',
    type: 'text',
    label: 'First Met',
    placeholder: 'Conference 2023, Through Sarah...',
    group: FIELD_GROUPS.RELATIONSHIPS,
  },

  // Socials tab fields
  {
    key: 'Twitter',
    type: 'url',
    label: 'Twitter',
    placeholder: 'https://twitter.com/username',
    group: FIELD_GROUPS.SOCIALS,
  },
  {
    key: 'LinkedIn',
    type: 'url',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
    group: FIELD_GROUPS.SOCIALS,
  },
  {
    key: 'Facebook',
    type: 'url',
    label: 'Facebook',
    placeholder: 'https://facebook.com/username',
    group: FIELD_GROUPS.SOCIALS,
  },
  {
    key: 'Instagram',
    type: 'url',
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    group: FIELD_GROUPS.SOCIALS,
  },

  // Enhanced Details tab fields
  {
    key: 'Birthday',
    type: 'date',
    label: 'Birthday',
    placeholder: 'Select date',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'Anniversary',
    type: 'date',
    label: 'Anniversary',
    placeholder: 'Select date',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'DeathAnniversary',
    type: 'date',
    label: 'Death Anniversary',
    placeholder: 'Select date',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'QuickFlags',
    type: 'tags',
    label: 'Quick Flags',
    placeholder: 'Needs Cleanup, Review Later, Merge Candidate',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'PersonalityNotes',
    type: 'textarea',
    label: 'Personality Notes',
    placeholder: 'Prefers formal communication, punctual, direct...',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'ProjectTags',
    type: 'tags',
    label: 'Project Tags',
    placeholder: 'Website Redesign, Q1 Project, Board Election',
    group: FIELD_GROUPS.ENHANCED,
  },
  {
    key: 'Bio',
    type: 'textarea',
    label: 'Bio',
    placeholder: 'Background information about this contact...',
    group: FIELD_GROUPS.ENHANCED,
    existing: true,
  },
  {
    key: 'Tags',
    type: 'tags',
    label: 'Tags',
    placeholder: 'Labor, Endorsement, Volunteer',
    group: FIELD_GROUPS.ENHANCED,
    existing: true,
  },
  {
    key: 'Follow-up Date',
    type: 'date',
    label: 'Follow-up Reminder',
    placeholder: 'Set a date to follow up with this contact',
    group: FIELD_GROUPS.ENHANCED,
    existing: true,
  },

  // Demographics tab fields
  {
    key: 'Race / Ethnicity',
    type: 'combobox',
    label: 'Race / Ethnicity',
    placeholder: 'Select or type...',
    options: ['White', 'Black/African American', 'Hispanic/Latino', 'Asian', 'Native American/Alaska Native', 'Native Hawaiian/Pacific Islander', 'Middle Eastern/North African', 'Multiracial'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Race / Ethnicity Notes',
    type: 'textarea',
    label: 'Race / Ethnicity Notes',
    placeholder: 'Additional context...',
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Cultural / Ethnic Subgroup',
    type: 'combobox',
    label: 'Cultural / Ethnic Subgroup',
    placeholder: 'Select or type...',
    options: [],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'LGBTQ+ Identity',
    type: 'combobox',
    label: 'LGBTQ+ Identity',
    placeholder: 'Select or type...',
    options: ['Gay', 'Lesbian', 'Bisexual', 'Transgender', 'Queer', 'Non-Binary', 'Asexual', 'Pansexual', 'Prefer Not to Say'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'LGBTQ+ Identity Notes',
    type: 'textarea',
    label: 'LGBTQ+ Identity Notes',
    placeholder: 'Additional context...',
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Disability / Accessibility Needs',
    type: 'combobox',
    label: 'Disability / Accessibility Needs',
    placeholder: 'Select or type...',
    options: ['Physical', 'Visual', 'Hearing', 'Cognitive', 'Mental Health', 'Multiple', 'None', 'Prefer Not to Say'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Disability / Accessibility Notes',
    type: 'textarea',
    label: 'Disability / Accessibility Notes',
    placeholder: 'Additional context...',
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Immigration / Refugee Background',
    type: 'combobox',
    label: 'Immigration / Refugee Background',
    placeholder: 'Select or type...',
    options: ['Immigrant', 'Refugee', 'Asylum Seeker', 'DACA', 'Naturalized Citizen', 'Not Applicable', 'Prefer Not to Say'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Veteran Status',
    type: 'combobox',
    label: 'Veteran Status',
    placeholder: 'Select or type...',
    options: ['Active Duty', 'Veteran', 'Reserves', 'National Guard', 'Not Applicable'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Religious / Spiritual Affiliation',
    type: 'combobox',
    label: 'Religious / Spiritual Affiliation',
    placeholder: 'Select or type...',
    options: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Sikh', 'Unitarian', 'Spiritual but not Religious', 'Atheist/Agnostic', 'None'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Student Status',
    type: 'combobox',
    label: 'Student Status',
    placeholder: 'Select or type...',
    options: ['Full-Time Student', 'Part-Time Student', 'Graduate Student', 'Not a Student'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },
  {
    key: 'Parent / Caregiver Status',
    type: 'combobox',
    label: 'Parent / Caregiver Status',
    placeholder: 'Select or type...',
    options: ['Parent', 'Caregiver', 'Both', 'Neither'],
    group: FIELD_GROUPS.DEMOGRAPHICS,
    existing: true,
  },

  // Contact Preferences tab fields
  {
    key: 'Best Time to Contact',
    type: 'combobox',
    label: 'Best Time to Contact',
    placeholder: 'Select or type...',
    options: ['Morning', 'Afternoon', 'Evening', 'Weekends Only'],
    group: FIELD_GROUPS.CONTACT_PREFS,
    existing: true,
  },
  {
    key: 'Opt-In Status',
    type: 'select',
    label: 'Opt-In Status',
    options: ['Opted In', 'Opted Out', 'Not Asked'],
    group: FIELD_GROUPS.CONTACT_PREFS,
    existing: true,
  },

  // Community tab fields
  {
    key: 'Neighborhood / Ward / District',
    type: 'text',
    label: 'Neighborhood / Ward / District',
    placeholder: 'e.g. Corktown, Ward 7, District 13',
    group: FIELD_GROUPS.COMMUNITY,
    existing: true,
  },
  {
    key: 'Local Business Owner / Worker',
    type: 'combobox',
    label: 'Local Business Owner / Worker',
    placeholder: 'Select or type...',
    options: ['Owner', 'Worker', 'Both', 'Neither'],
    group: FIELD_GROUPS.COMMUNITY,
    existing: true,
  },

  // Donor tab fields
  {
    key: 'Donor Status',
    type: 'combobox',
    label: 'Donor Status',
    placeholder: 'Select or type...',
    options: ['Active Donor', 'Lapsed Donor', 'Prospect', 'Non-Donor'],
    group: FIELD_GROUPS.DONOR,
    existing: true,
  },

  // Privacy tab fields
  {
    key: 'Privacy Preferences',
    type: 'textarea',
    label: 'Privacy Preferences',
    placeholder: 'Any privacy requests or restrictions...',
    group: FIELD_GROUPS.PRIVACY,
    existing: true,
  },
  {
    key: 'Media Consent',
    type: 'select',
    label: 'Media Consent',
    options: ['Yes', 'No', 'Not Asked'],
    group: FIELD_GROUPS.PRIVACY,
    existing: true,
  },
];

/**
 * Organization Field Definitions
 * Fields for organization entities (companies, non-profits, government agencies)
 */
export const ORGANIZATION_FIELD_DEFINITIONS = [
  // Identity fields
  {
    key: 'Organization ID',
    type: 'text',
    label: 'Organization ID',
    group: FIELD_GROUPS.ORGANIZATION_IDENTITY,
    required: false,
    existing: true,
    hidden: true, // Auto-generated, don't show in forms
  },
  {
    key: 'Name',
    type: 'text',
    label: 'Organization Name',
    placeholder: 'Company or organization name',
    group: FIELD_GROUPS.ORGANIZATION_IDENTITY,
    required: true,
    existing: true,
  },
  {
    key: 'Type',
    type: 'select',
    label: 'Type',
    options: [
      'Corporate',
      'Non-Profit',
      'Government',
      'Educational',
      'Small Business',
      'Union',
      'Association',
      'Other',
    ],
    group: FIELD_GROUPS.ORGANIZATION_IDENTITY,
    existing: true,
  },
  {
    key: 'Priority',
    type: 'select',
    label: 'Priority',
    options: ['Urgent', 'High', 'Medium', 'Low', 'No Urgency'],
    group: FIELD_GROUPS.ORGANIZATION_IDENTITY,
    existing: true,
  },
  {
    key: 'Status',
    type: 'select',
    label: 'Status',
    options: ['Active', 'Inactive', 'Do Not Contact'],
    group: FIELD_GROUPS.ORGANIZATION_IDENTITY,
    existing: true,
  },

  // Details fields
  {
    key: 'Website',
    type: 'url',
    label: 'Website',
    placeholder: 'https://example.com',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
    actionable: true,
    actions: ['open'],
  },
  {
    key: 'Phone',
    type: 'multi-text',
    label: 'Phone',
    placeholder: '313-555-0100',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
    actionable: true,
    actions: ['call'],
  },
  {
    key: 'Email',
    type: 'multi-text',
    label: 'Email',
    placeholder: 'contact@example.com',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
    actionable: true,
    actions: ['email'],
  },
  {
    key: 'Address',
    type: 'textarea',
    label: 'Address',
    placeholder: '123 Main St\nCity, State 12345',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
  {
    key: 'Industry',
    type: 'text',
    label: 'Industry',
    placeholder: 'Technology, Healthcare, Education, etc.',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
  {
    key: 'Size',
    type: 'select',
    label: 'Size',
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Unknown'],
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
  {
    key: 'Founded Date',
    type: 'date',
    label: 'Founded Date',
    placeholder: 'When was the organization founded',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
  {
    key: 'Notes',
    type: 'textarea',
    label: 'Notes',
    placeholder: 'Additional notes about this organization...',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
  {
    key: 'Tags',
    type: 'tags',
    label: 'Tags',
    placeholder: 'Add tags, separated by commas',
    group: FIELD_GROUPS.ORGANIZATION_DETAILS,
    existing: true,
  },
];

/**
 * Location Field Definitions
 * Fields for location entities (offices, venues, stores, public spaces)
 */
export const LOCATION_FIELD_DEFINITIONS = [
  // Identity fields
  {
    key: 'Location ID',
    type: 'text',
    label: 'Location ID',
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    required: false,
    existing: true,
    hidden: true, // Auto-generated, don't show in forms
  },
  {
    key: 'Name',
    type: 'text',
    label: 'Location Name',
    placeholder: 'Name of the place',
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    required: true,
    existing: true,
  },
  {
    key: 'Address',
    type: 'textarea',
    label: 'Address',
    placeholder: '123 Main St\nCity, State 12345',
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    required: true,
    existing: true,
  },
  {
    key: 'Type',
    type: 'select',
    label: 'Type',
    options: [
      'Office',
      'Store',
      'Restaurant',
      'Venue',
      'Public Space',
      'Park',
      'Community Center',
      'Other',
    ],
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    existing: true,
  },
  {
    key: 'Priority',
    type: 'select',
    label: 'Priority',
    options: ['Urgent', 'High', 'Medium', 'Low', 'No Urgency'],
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    existing: true,
  },
  {
    key: 'Status',
    type: 'select',
    label: 'Status',
    options: ['Active', 'Inactive', 'Closed'],
    group: FIELD_GROUPS.LOCATION_IDENTITY,
    existing: true,
  },

  // Details fields
  {
    key: 'Phone',
    type: 'text',
    label: 'Phone',
    placeholder: '313-555-0100',
    group: FIELD_GROUPS.LOCATION_DETAILS,
    existing: true,
    actionable: true,
    actions: ['call'],
  },
  {
    key: 'Website',
    type: 'url',
    label: 'Website',
    placeholder: 'https://example.com',
    group: FIELD_GROUPS.LOCATION_DETAILS,
    existing: true,
    actionable: true,
    actions: ['open'],
  },
  {
    key: 'Notes',
    type: 'textarea',
    label: 'Notes',
    placeholder: 'Notes about this location (parking, accessibility, etc.)...',
    group: FIELD_GROUPS.LOCATION_DETAILS,
    existing: true,
  },
  {
    key: 'Tags',
    type: 'tags',
    label: 'Tags',
    placeholder: 'Add tags, separated by commas',
    group: FIELD_GROUPS.LOCATION_DETAILS,
    existing: true,
  },

  // Operations fields
  {
    key: 'Business Hours',
    type: 'textarea',
    label: 'Business Hours',
    placeholder: 'Mon-Fri: 9am-5pm\nSat: 10am-2pm\nSun: Closed',
    group: FIELD_GROUPS.LOCATION_OPERATIONS,
    existing: true,
  },
  {
    key: 'Accessibility Notes',
    type: 'textarea',
    label: 'Accessibility Notes',
    placeholder: 'Wheelchair accessible, elevator available, etc.',
    group: FIELD_GROUPS.LOCATION_OPERATIONS,
    existing: true,
  },
  {
    key: 'Capacity',
    type: 'text',
    label: 'Capacity',
    placeholder: 'Max occupancy (e.g., 100 people)',
    group: FIELD_GROUPS.LOCATION_OPERATIONS,
    existing: true,
  },
];

/**
 * Get fields for a specific group
 * @param {string} group - The field group
 * @param {boolean} includeAll - Include all fields (for templates)
 * @param {boolean} isDevMode - In dev mode, include pendingBackend fields
 */
export function getFieldsByGroup(group, includeAll = false) {
  return FIELD_DEFINITIONS.filter((field) => {
    if (field.group !== group) return false;
    if (field.hidden) return false; // Never show hidden fields
    if (includeAll) return true;
    // Always show all fields (no more dev mode filtering)
    return true;
  });
}

/**
 * Get all fields including future ones (for templates)
 */
export function getAllFields() {
  return FIELD_DEFINITIONS;
}

/**
 * Get identity fields (for header section)
 */
export function getIdentityFields(includeAll = false) {
  return getFieldsByGroup(FIELD_GROUPS.IDENTITY, includeAll);
}

/**
 * Get field definition by key
 */
export function getFieldByKey(key) {
  return FIELD_DEFINITIONS.find((field) => field.key === key);
}

/**
 * Get organization fields by group
 */
export function getOrganizationFieldsByGroup(group, includeAll = false) {
  return ORGANIZATION_FIELD_DEFINITIONS.filter((field) => {
    if (field.group !== group) return false;
    if (field.hidden) return false;
    if (includeAll) return true;
    return true;
  });
}

/**
 * Get location fields by group
 */
export function getLocationFieldsByGroup(group, includeAll = false) {
  return LOCATION_FIELD_DEFINITIONS.filter((field) => {
    if (field.group !== group) return false;
    if (field.hidden) return false;
    if (includeAll) return true;
    return true;
  });
}

/**
 * Get all organization fields
 */
export function getAllOrganizationFields() {
  return ORGANIZATION_FIELD_DEFINITIONS;
}

/**
 * Get all location fields
 */
export function getAllLocationFields() {
  return LOCATION_FIELD_DEFINITIONS;
}

/**
 * Get organization identity fields
 */
export function getOrganizationIdentityFields() {
  return getOrganizationFieldsByGroup(FIELD_GROUPS.ORGANIZATION_IDENTITY);
}

/**
 * Get location identity fields
 */
export function getLocationIdentityFields() {
  return getLocationFieldsByGroup(FIELD_GROUPS.LOCATION_IDENTITY);
}

export default FIELD_DEFINITIONS;
