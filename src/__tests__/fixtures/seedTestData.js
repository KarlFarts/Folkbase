/**
 * Test Data Seeding System for Development Mode
 *
 * This module handles seeding test contacts into localStorage for development.
 * When VITE_DEV_MODE is enabled, contacts are stored locally instead of Google Sheets.
 *
 * IMPORTANT: This only runs when VITE_DEV_MODE=true in .env
 */

import { testContacts, TEST_DATA_MARKER, isTestContact } from './testContacts';
import { log, warn } from '../../utils/logger';
import {
  SHEET_NAMES,
  SHEET_HEADERS,
  SCHEMA_VERSION,
  SCHEMA_STORAGE_KEY,
} from '../../config/constants';
const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

// LocalStorage keys
const STORAGE_KEY_CONTACTS = 'dev_contacts';
const STORAGE_KEY_TOUCHPOINTS = 'dev_touchpoints';
const STORAGE_KEY_EVENTS = 'dev_events';
const STORAGE_KEY_ACTIVITIES = 'dev_activities';
const STORAGE_KEY_LISTS = 'dev_lists';
const STORAGE_KEY_CONTACT_LISTS = 'dev_contact_lists';
const STORAGE_KEY_NOTES = 'dev_notes';
const STORAGE_KEY_CONTACT_NOTES = 'dev_contact_notes';
const STORAGE_KEY_EVENT_NOTES = 'dev_event_notes';
const STORAGE_KEY_LIST_NOTES = 'dev_list_notes';
const STORAGE_KEY_TASK_NOTES = 'dev_task_notes';
const STORAGE_KEY_WORKSPACES = 'dev_workspaces';
const STORAGE_KEY_WORKSPACE_MEMBERS = 'dev_workspace_members';
const STORAGE_KEY_WORKSPACE_INVITATIONS = 'dev_workspace_invitations';
const STORAGE_KEY_CONTACT_LINKS = 'dev_contact_links';
const STORAGE_KEY_SYNC_CONFLICTS = 'dev_sync_conflicts';
const STORAGE_KEY_TASKS = 'dev_tasks';
const STORAGE_KEY_RELATIONSHIPS = 'dev_relationships';
const STORAGE_KEY_ORGANIZATIONS = 'dev_organizations';
const STORAGE_KEY_LOCATIONS = 'dev_locations';
const STORAGE_KEY_LOCATION_VISITS = 'dev_location_visits';
const STORAGE_KEY_CONTACT_SOCIALS = 'dev_contact_socials';
const STORAGE_KEY_CONTACT_EDUCATION = 'dev_contact_education';
const STORAGE_KEY_CONTACT_EMPLOYMENT = 'dev_contact_employment';
const STORAGE_KEY_CONTACT_DISTRICTS = 'dev_contact_districts';
export const STORAGE_KEY_CONTACT_METHODS = 'dev_contact_methods';
export const STORAGE_KEY_CONTACT_ATTRIBUTES = 'dev_contact_attributes';
const STORAGE_KEY_EVENT_ATTENDEES = 'dev_event_attendees';
const STORAGE_KEY_EVENT_RESOURCES = 'dev_event_resources';
const STORAGE_KEY_EVENT_AGENDA = 'dev_event_agenda';
const STORAGE_KEY_ORG_CONTACTS = 'dev_org_contacts';
const STORAGE_KEY_ORG_DEPARTMENTS = 'dev_org_departments';
const STORAGE_KEY_TASK_CHECKLIST = 'dev_task_checklist';
const STORAGE_KEY_TASK_TIME_ENTRIES = 'dev_task_time_entries';
const STORAGE_KEY_CALENDAR_EVENTS = 'touchpoint_dev_calendar_events';
const STORAGE_KEY_SEEDED = 'dev_test_data_seeded';

// Test touchpoints data
const testTouchpoints = [
  {
    'Touchpoint ID': 'TP-TEST-001',
    'Contact ID': 'TEST0102001',
    Date: '2025-12-28',
    Type: 'Call',
    Notes:
      'Discussed upcoming workspace volunteer opportunities. Very interested in helping with outreach.',
    'Follow-up Needed': 'Yes',
    'Follow-up Date': '2025-12-31',
    Outcome: 'Successful',
    'Duration (min)': '15',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Touchpoint ID': 'TP-TEST-002',
    'Contact ID': 'TEST0102002',
    Date: '2025-12-27',
    Type: 'Email',
    Notes: 'Sent information about January volunteer training session',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: 'Successful',
    'Duration (min)': '',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Touchpoint ID': 'TP-TEST-003',
    'Contact ID': 'TEST0102001',
    Date: '2025-12-25',
    Type: 'Meeting',
    Notes: 'Coffee meeting at local cafe. Discussed legislative priorities for next session.',
    'Follow-up Needed': 'Yes',
    'Follow-up Date': '2026-01-05',
    Outcome: 'Will Follow Up',
    'Duration (min)': '45',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Touchpoint ID': 'TP-TEST-004',
    'Contact ID': 'TEST0102002',
    Date: '2025-12-20',
    Type: 'Text',
    Notes: 'Quick check-in about volunteer coordinator role',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: 'Successful',
    'Duration (min)': '',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Touchpoint ID': 'TP-TEST-005',
    'Contact ID': 'TEST0102001',
    Date: '2025-12-15',
    Type: 'Call',
    Notes: 'Left voicemail about upcoming town hall event',
    'Follow-up Needed': 'Yes',
    'Follow-up Date': '2025-12-29',
    Outcome: 'Left Message',
    'Duration (min)': '',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Touchpoint ID': 'TP-TEST-006',
    'Contact ID': 'TEST0102002',
    Date: '2025-12-10',
    Type: 'Event',
    Notes: 'Met at community fundraiser. Introduced to several potential donors.',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: 'Successful',
    'Duration (min)': '120',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestTouchpoint = (touchpoint) => touchpoint && touchpoint[TEST_DATA_MARKER] === true;

// Test relationships data
// These connect the test contacts in a network:
//   - TEST0102001 (Adam A. A.) and TEST0102002 (Sarah B Johnson) are colleagues
//   - TEST0102002 (Sarah) and TEST0102003 (Delilah Davis) are friends
//   - TEST0102001 (Adam) and TEST0102005 (Fred F.) are manager/employee
const testRelationships = [
  {
    'Relationship ID': 'REL-TEST-001',
    'Source Contact ID': 'TEST0102001',
    'Target Contact ID': 'TEST0102002',
    'Relationship Type': 'Professional',
    'Relationship Subtype': 'Colleague',
    'Is Directional': 'FALSE',
    Strength: 'Strong',
    Notes: 'Work together on community outreach programs',
    'Date Established': '2020-03-15',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-01',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Relationship ID': 'REL-TEST-002',
    'Source Contact ID': 'TEST0102002',
    'Target Contact ID': 'TEST0102003',
    'Relationship Type': 'Social',
    'Relationship Subtype': 'Friend',
    'Is Directional': 'FALSE',
    Strength: 'Good',
    Notes: 'Met through volunteer activities, now close friends',
    'Date Established': '2021-06-10',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-01',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Relationship ID': 'REL-TEST-003',
    'Source Contact ID': 'TEST0102001',
    'Target Contact ID': 'TEST0102005',
    'Relationship Type': 'Professional',
    'Relationship Subtype': 'Manager',
    'Is Directional': 'TRUE',
    Strength: 'Strong',
    Notes: 'Direct report relationship',
    'Date Established': '2019-01-15',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-01',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Relationship ID': 'REL-TEST-004',
    'Source Contact ID': 'TEST0102003',
    'Target Contact ID': 'TEST0102004',
    'Relationship Type': 'Familial',
    'Relationship Subtype': 'Sibling',
    'Is Directional': 'FALSE',
    Strength: 'Strong',
    Notes: 'Sisters',
    'Date Established': '',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-01',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Relationship ID': 'REL-TEST-005',
    'Source Contact ID': 'TEST0102001',
    'Target Contact ID': 'TEST0102006',
    'Relationship Type': 'Professional',
    'Relationship Subtype': 'Client',
    'Is Directional': 'TRUE',
    Strength: 'Developing',
    Notes: 'New business relationship',
    'Date Established': '2025-11-01',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-01',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
];

// eslint-disable-next-line no-unused-vars
const isTestRelationship = (relationship) =>
  relationship && relationship[TEST_DATA_MARKER] === true;

// Test organizations data
const testOrganizations = [
  {
    'Organization ID': 'ORG-TEST-001',
    'Date Added': '2025-01-15',
    'Last Contact Date': '2025-12-20',
    Name: 'Detroit Community Foundation',
    Type: 'Non-Profit',
    Website: 'https://detroitfoundation.org',
    Phone: '313-555-0100',
    Email: 'info@detroitfoundation.org',
    Address: '123 Main Street\nDetroit, MI 48201',
    Industry: 'Philanthropy',
    Size: '51-200',
    Notes: 'Major community partner for outreach programs',
    Tags: 'partner, non-profit, community',
    Priority: 'High',
    Status: 'Active',
    'Founded Date': '1985-03-12',
    'Created By': 'test@example.com',
    'Last Updated': '2025-12-20',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Organization ID': 'ORG-TEST-002',
    'Date Added': '2024-06-10',
    'Last Contact Date': '2025-11-15',
    Name: 'Tech for Good Corp',
    Type: 'Corporate',
    Website: 'https://techforgood.com',
    Phone: '313-555-0200',
    Email: 'contact@techforgood.com',
    Address: '456 Innovation Drive\nDetroit, MI 48202',
    Industry: 'Technology',
    Size: '201-500',
    Notes: 'Technology partner providing pro-bono services',
    Tags: 'technology, partner, corporate',
    Priority: 'Medium',
    Status: 'Active',
    'Founded Date': '2015-08-20',
    'Created By': 'test@example.com',
    'Last Updated': '2025-11-15',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Organization ID': 'ORG-TEST-003',
    'Date Added': '2023-03-05',
    'Last Contact Date': '2025-10-01',
    Name: 'Wayne County Government',
    Type: 'Government',
    Website: 'https://waynecounty.gov',
    Phone: '313-555-0300',
    Email: 'info@waynecounty.gov',
    Address: '500 Griswold Street\nDetroit, MI 48226',
    Industry: 'Government',
    Size: '1000+',
    Notes: 'Local government agency, important stakeholder',
    Tags: 'government, stakeholder',
    Priority: 'Urgent',
    Status: 'Active',
    'Founded Date': '',
    'Created By': 'test@example.com',
    'Last Updated': '2025-10-01',
    [TEST_DATA_MARKER]: true,
  },
];

// eslint-disable-next-line no-unused-vars
const isTestOrganization = (org) => org && org[TEST_DATA_MARKER] === true;

// Test locations data
const testLocations = [
  {
    'Location ID': 'LOC-TEST-001',
    'Date Added': '2025-01-10',
    'Last Contact Date': '2025-12-28',
    Name: 'Downtown Community Center',
    Address: '789 Community Way\nDetroit, MI 48201',
    Phone: '313-555-0400',
    Type: 'Community Center',
    Website: 'https://downtowncc.org',
    'Business Hours': 'Mon-Fri: 8am-8pm\nSat: 9am-5pm\nSun: Closed',
    Notes: 'Main venue for town halls and community meetings',
    Tags: 'venue, community, meetings',
    Priority: 'High',
    Status: 'Active',
    'Accessibility Notes': 'Wheelchair accessible, elevator available, parking lot',
    Capacity: '200 people',
    'Created By': 'test@example.com',
    'Last Updated': '2025-12-28',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Location ID': 'LOC-TEST-002',
    'Date Added': '2024-08-15',
    'Last Contact Date': '2025-12-15',
    Name: 'Riverside Park',
    Address: '1200 Riverside Drive\nDetroit, MI 48207',
    Phone: '',
    Type: 'Public Space',
    Website: '',
    'Business Hours': 'Open 24 hours',
    Notes: 'Popular spot for outdoor workspace events and canvassing',
    Tags: 'outdoor, public, events',
    Priority: 'Medium',
    Status: 'Active',
    'Accessibility Notes': 'Paved paths, accessible restrooms',
    Capacity: '500+ people',
    'Created By': 'test@example.com',
    'Last Updated': '2025-12-15',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Location ID': 'LOC-TEST-003',
    'Date Added': '2025-03-20',
    'Last Contact Date': '2025-12-01',
    Name: "Joe's Coffee Shop",
    Address: '321 Main Street\nDetroit, MI 48201',
    Phone: '313-555-0500',
    Type: 'Restaurant',
    Website: 'https://joescoffee.com',
    'Business Hours': 'Mon-Sat: 6am-6pm\nSun: 7am-4pm',
    Notes: 'Great wifi, quiet atmosphere, good for one-on-one meetings',
    Tags: 'coffee, meetings, wifi',
    Priority: 'Low',
    Status: 'Active',
    'Accessibility Notes': 'Ground level entrance, accessible bathroom',
    Capacity: '40 people',
    'Created By': 'test@example.com',
    'Last Updated': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
];

// eslint-disable-next-line no-unused-vars
const isTestLocation = (location) => location && location[TEST_DATA_MARKER] === true;

// Test location visits data
const testLocationVisits = [
  {
    'Visit ID': 'VIS-TEST-001',
    'Location ID': 'LOC-TEST-001',
    'Location Name': 'Downtown Community Center',
    'Contact ID': 'TEST0102001',
    Date: '2025-12-28',
    Purpose: 'Meeting',
    Notes: 'Town hall planning session with Adam',
    Duration: '90',
    'Follow-up Needed': 'Yes',
    'Follow-up Date': '2026-01-05',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-28',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Visit ID': 'VIS-TEST-002',
    'Location ID': 'LOC-TEST-003',
    'Location Name': "Joe's Coffee Shop",
    'Contact ID': 'TEST0102002',
    Date: '2025-12-25',
    Purpose: 'Social',
    Notes: 'Coffee meeting with Sarah to discuss volunteer coordination',
    Duration: '45',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    'Created By': 'test@example.com',
    'Created Date': '2025-12-25',
    [TEST_DATA_MARKER]: true,
  },
];

// eslint-disable-next-line no-unused-vars
const isTestVisit = (visit) => visit && visit[TEST_DATA_MARKER] === true;

// Test events data
// Attendees reference test contacts:
//   - TEST0102001: Adam A. A. (Priority: Urgent)
//   - TEST0102002: Sarah B Johnson (Priority: High, Role: Volunteer Coordinator)
const testEvents = [
  {
    'Event ID': 'E-TEST-001',
    'Event Name': 'New Year Town Hall Meeting',
    'Event Date': '2026-01-02',
    'Event Location': 'Community Center, Main Hall',
    Description:
      'Kickoff town hall to discuss 2026 legislative priorities and community feedback. Adam will present budget overview.',
    Attendees: 'TEST0102001,TEST0102002',
    'Event Created Date': '2025-12-15',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-002',
    'Event Name': 'Volunteer Phone Banking Training',
    'Event Date': '2026-01-05',
    'Event Location': 'Workspace Office, Training Room',
    Description:
      'Hands-on training session for new volunteers. Sarah will lead the session covering scripts, best practices, and handling objections.',
    Attendees: 'TEST0102002',
    'Event Created Date': '2025-12-20',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-003',
    'Event Name': 'Annual Fundraising Gala',
    'Event Date': '2026-01-10',
    'Event Location': 'Grand Hotel Ballroom, Downtown',
    Description:
      'Formal fundraising dinner with keynote speaker and silent auction. Both Adam and Sarah attending as VIP supporters.',
    Attendees: 'TEST0102001,TEST0102002',
    'Event Created Date': '2025-11-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-004',
    'Event Name': 'One-on-One: Coffee with Adam',
    'Event Date': '2026-01-15',
    'Event Location': 'Local Coffee Shop, Downtown Branch',
    Description:
      'Informal 1:1 meeting with Adam to discuss his priorities, concerns, and how we can better serve the community.',
    Attendees: 'TEST0102001',
    'Event Created Date': '2025-12-28',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-005',
    'Event Name': 'Q1 Workspace Strategy Planning',
    'Event Date': '2026-01-20',
    'Event Location': 'Workspace Office, Board Room',
    Description:
      'Leadership planning meeting for Q1 strategy, including both core team and key community supporters like Adam and Sarah.',
    Attendees: 'TEST0102001,TEST0102002',
    'Event Created Date': '2025-12-10',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-006',
    'Event Name': 'Community Service Day - Park Cleanup',
    'Event Date': '2026-02-01',
    'Event Location': 'City Park, East Entrance',
    Description:
      'Volunteer-led community cleanup event. Sarah coordinating volunteers. Perfect opportunity for community engagement.',
    Attendees: 'TEST0102002',
    'Event Created Date': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-007',
    'Event Name': 'Holiday Celebration Party',
    'Event Date': '2025-12-20',
    'Event Location': 'Workspace Office, Main Hall',
    Description:
      'Year-end celebration with volunteers and community supporters. Great networking opportunity.',
    Attendees: 'TEST0102001,TEST0102002',
    'Event Created Date': '2025-11-15',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-008',
    'Event Name': 'Thanksgiving Food Drive Collection',
    'Event Date': '2025-11-25',
    'Event Location': 'Community Center, Warehouse',
    Description:
      'Annual food drive collection and distribution event. Community came together to collect over 500 lbs of food.',
    Attendees: 'TEST0102001',
    'Event Created Date': '2025-10-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-009',
    'Event Name': 'Follow-up: Sarah Post-Event Check-in',
    'Event Date': '2025-12-22',
    'Event Location': 'Phone Call',
    Description:
      'Check-in call with Sarah to get feedback on holiday party and discuss volunteer opportunities for January.',
    Attendees: 'TEST0102002',
    'Event Created Date': '2025-12-21',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Event ID': 'E-TEST-010',
    'Event Name': 'District Meeting - Local Issues Discussion',
    'Event Date': '2025-12-18',
    'Event Location': 'District Office, Meeting Room',
    Description:
      'Discussion with Adam about district-specific concerns and initiatives. Covered education funding and infrastructure.',
    Attendees: 'TEST0102001',
    'Event Created Date': '2025-12-15',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestEvent = (event) => event && event[TEST_DATA_MARKER] === true;

// Test lists data
const testLists = [
  {
    'List ID': 'LIST-TEST-001',
    'List Name': 'VIP Supporters',
    Description: 'High-priority contacts and major donors',
    'List Created Date': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'List ID': 'LIST-TEST-002',
    'List Name': 'Active Volunteers',
    Description: 'Contacts actively volunteering for workspaces and events',
    'List Created Date': '2025-12-05',
    [TEST_DATA_MARKER]: true,
  },
  {
    'List ID': 'LIST-TEST-003',
    'List Name': 'Q1 Workspace Focus',
    Description: 'Contacts involved in Q1 2026 workspace initiative',
    'List Created Date': '2025-12-10',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestList = (list) => list && list[TEST_DATA_MARKER] === true;

// Test contact-lists mapping (many-to-many relationships)
// Maps contact IDs to list IDs
const testContactLists = [
  {
    'Contact ID': 'TEST0102001',
    'List ID': 'LIST-TEST-001',
    'Added To List Date': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102001',
    'List ID': 'LIST-TEST-003',
    'Added To List Date': '2025-12-10',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102002',
    'List ID': 'LIST-TEST-002',
    'Added To List Date': '2025-12-05',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102002',
    'List ID': 'LIST-TEST-001',
    'Added To List Date': '2025-12-01',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102002',
    'List ID': 'LIST-TEST-003',
    'Added To List Date': '2025-12-10',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestContactList = (cl) => cl && cl[TEST_DATA_MARKER] === true;

// Test notes data
const testNotes = [
  {
    'Note ID': 'N-TEST-001',
    'Created Date': '2025-12-28',
    'Created By': 'user@test.com',
    Content:
      'Met interesting person at coffee shop - works in tech policy. Forgot to get contact info!',
    'Note Type': 'Idea',
    Status: 'Unprocessed',
    'Event ID': '',
    Visibility: 'Private',
    'Shared With': '',
    Tags: '',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-002',
    'Created Date': '2025-12-27',
    'Created By': 'user@test.com',
    Content:
      'Follow up with Sarah about volunteer training materials - she mentioned wanting to create a handbook',
    'Note Type': 'Follow-up',
    Status: 'Processed',
    'Event ID': '',
    Visibility: 'Shared',
    'Shared With': 'colleague@test.com,manager@test.com',
    Tags: '',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-003',
    'Created Date': '2025-12-26',
    'Created By': 'user@test.com',
    Content:
      'Great idea from town hall: monthly community Q&A sessions. Need to explore logistics.',
    'Note Type': 'Event Note',
    Status: 'Unprocessed',
    'Event ID': 'E-TEST-001',
    Visibility: 'Workspace-Wide',
    'Shared With': '',
    Tags: 'event,town-hall',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-004',
    'Created Date': '2025-12-25',
    'Created By': 'user@test.com',
    Content: 'Adam mentioned interest in education policy reform. Schedule deeper conversation.',
    'Note Type': 'Meeting Note',
    Status: 'Processed',
    'Event ID': '',
    Visibility: 'Workspace-Wide',
    'Shared With': '',
    Tags: '',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-005',
    'Created Date': '2025-12-24',
    'Created By': 'other@test.com',
    Content:
      'Potential donor lead: Jane Smith, owns local bookstore, passionate about literacy programs',
    'Note Type': 'General',
    Status: 'Unprocessed',
    'Event ID': '',
    Visibility: 'Workspace-Wide',
    'Shared With': '',
    Tags: 'donor',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-006',
    'Created Date': '2025-12-23',
    'Created By': 'user@test.com',
    Content:
      'Phone call with Adam and Sarah about Q1 workspace strategy. Both excited about volunteer recruitment push.',
    'Note Type': 'Phone Call',
    Status: 'Processed',
    'Event ID': '',
    Visibility: 'Workspace-Wide',
    'Shared With': '',
    Tags: 'strategy',
    'Touchpoint ID': null,
    [TEST_DATA_MARKER]: true,
  },
];

const isTestNote = (note) => note && note[TEST_DATA_MARKER] === true;

// Test contact-notes mapping (many-to-many relationships)
const testContactNotes = [
  {
    'Note ID': 'N-TEST-002',
    'Contact ID': 'TEST0102002',
    'Linked Date': '2025-12-27',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-004',
    'Contact ID': 'TEST0102001',
    'Linked Date': '2025-12-25',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-006',
    'Contact ID': 'TEST0102001',
    'Linked Date': '2025-12-23',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Note ID': 'N-TEST-006',
    'Contact ID': 'TEST0102002',
    'Linked Date': '2025-12-23',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestContactNote = (cn) => cn && cn[TEST_DATA_MARKER] === true;

// Test workspaces data (hierarchy example)
const testWorkspaces = [
  {
    id: 'CAMP-TEST-001',
    name: 'Smith for Senate 2026',
    description: 'Main workspace headquarters',
    type: 'canvassing',
    owner_email: 'user@test.com',
    sheet_id: 'TEST-SHEET-001',
    status: 'active',
    default_role: 'member',
    invitation_expiry_days: 30,
    parent_workspace_id: null,
    path: '/CAMP-TEST-001',
    depth: 0,
    created_at: '2025-12-01T00:00:00Z',
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'CAMP-TEST-002',
    name: 'Door Knocking Initiative',
    description: 'Focus on door-to-door outreach',
    type: 'canvassing',
    owner_email: 'user@test.com',
    sheet_id: 'TEST-SHEET-002',
    status: 'active',
    default_role: 'member',
    invitation_expiry_days: 30,
    parent_workspace_id: 'CAMP-TEST-001',
    path: '/CAMP-TEST-001/CAMP-TEST-002',
    depth: 1,
    created_at: '2025-12-05T00:00:00Z',
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'CAMP-TEST-003',
    name: 'District 1 Canvassing',
    description: 'Door knocking in District 1',
    type: 'canvassing',
    owner_email: 'user@test.com',
    sheet_id: 'TEST-SHEET-003',
    status: 'active',
    default_role: 'member',
    invitation_expiry_days: 30,
    parent_workspace_id: 'CAMP-TEST-002',
    path: '/CAMP-TEST-001/CAMP-TEST-002/CAMP-TEST-003',
    depth: 2,
    created_at: '2025-12-10T00:00:00Z',
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'CAMP-TEST-004',
    name: 'Phone Banking Operations',
    description: 'Coordinated phone outreach',
    type: 'phone-banking',
    owner_email: 'user@test.com',
    sheet_id: 'TEST-SHEET-004',
    status: 'active',
    default_role: 'member',
    invitation_expiry_days: 30,
    parent_workspace_id: 'CAMP-TEST-001',
    path: '/CAMP-TEST-001/CAMP-TEST-004',
    depth: 1,
    created_at: '2025-12-07T00:00:00Z',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestWorkspace = (workspace) => workspace && workspace[TEST_DATA_MARKER] === true;

// Test contact links (sync relationships)
const testContactLinks = [
  {
    id: 'LINK-TEST-001',
    source_workspace: {
      type: 'personal',
      id: 'user@test.com',
      sheet_id: 'PERSONAL-SHEET',
      contact_id: 'TEST0102001',
    },
    target_workspace: {
      type: 'workspace',
      id: 'CAMP-TEST-001',
      sheet_id: 'TEST-SHEET-001',
      contact_id: 'CAMP-CONTACT-001',
    },
    sync_strategy: 'core_fields_only',
    custom_fields: [],
    status: 'active',
    created_by: 'user@test.com',
    created_at: '2025-12-15T00:00:00Z',
    last_synced_at: '2025-12-28T10:30:00Z',
    has_conflicts: true,
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'LINK-TEST-002',
    source_workspace: {
      type: 'personal',
      id: 'user@test.com',
      sheet_id: 'PERSONAL-SHEET',
      contact_id: 'TEST0102002',
    },
    target_workspace: {
      type: 'workspace',
      id: 'CAMP-TEST-002',
      sheet_id: 'TEST-SHEET-002',
      contact_id: 'CAMP-CONTACT-002',
    },
    sync_strategy: 'all_fields',
    custom_fields: [],
    status: 'active',
    created_by: 'user@test.com',
    created_at: '2025-12-16T00:00:00Z',
    last_synced_at: '2025-12-28T11:00:00Z',
    has_conflicts: false,
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'LINK-TEST-003',
    source_workspace: {
      type: 'workspace',
      id: 'CAMP-TEST-001',
      sheet_id: 'TEST-SHEET-001',
      contact_id: 'CAMP-CONTACT-001',
    },
    target_workspace: {
      type: 'workspace',
      id: 'CAMP-TEST-002',
      sheet_id: 'TEST-SHEET-002',
      contact_id: 'CAMP-CONTACT-003',
    },
    sync_strategy: 'custom',
    custom_fields: ['Name', 'Phone', 'Email', 'Status'],
    status: 'active',
    created_by: 'user@test.com',
    created_at: '2025-12-18T00:00:00Z',
    last_synced_at: '2025-12-28T12:00:00Z',
    has_conflicts: false,
    [TEST_DATA_MARKER]: true,
  },
];

const isTestContactLink = (link) => link && link[TEST_DATA_MARKER] === true;

// Test sync conflicts
const testSyncConflicts = [
  {
    id: 'CONFLICT-TEST-001',
    link_id: 'LINK-TEST-001',
    field_name: 'Phone',
    source_value: '(555) 123-4567',
    target_value: '(555) 123-4568',
    source_modified_at: '2025-12-28T09:00:00Z',
    target_modified_at: '2025-12-28T10:00:00Z',
    status: 'pending',
    resolved_by: null,
    resolved_at: null,
    resolution: null,
    custom_value: null,
    created_at: '2025-12-28T10:30:00Z',
    [TEST_DATA_MARKER]: true,
  },
  {
    id: 'CONFLICT-TEST-002',
    link_id: 'LINK-TEST-001',
    field_name: 'Email',
    source_value: 'adam.original@example.com',
    target_value: 'adam.updated@example.com',
    source_modified_at: '2025-12-27T14:00:00Z',
    target_modified_at: '2025-12-27T16:00:00Z',
    status: 'pending',
    resolved_by: null,
    resolved_at: null,
    resolution: null,
    custom_value: null,
    created_at: '2025-12-28T10:30:00Z',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestSyncConflict = (conflict) => conflict && conflict[TEST_DATA_MARKER] === true;

// Test tasks data
// Tasks can be linked to contacts, workspaces, or be standalone
const testTasks = [
  {
    'Task ID': 'TASK-TEST-001',
    Title: 'Follow up with Adam about volunteer role',
    Description: 'Discuss potential leadership position in door knocking workspace',
    Status: 'pending',
    Priority: 'High',
    'Due Date': '2026-01-25',
    'Contact ID': 'TEST0102001',
    'Workspace ID': 'CAMP-TEST-002',
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-28',
    'Completed Date': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Task ID': 'TASK-TEST-002',
    Title: 'Send training materials to Sarah',
    Description: 'Email volunteer handbook and phone banking scripts',
    Status: 'in_progress',
    Priority: 'Medium',
    'Due Date': '2026-01-20',
    'Contact ID': 'TEST0102002',
    'Workspace ID': 'CAMP-TEST-004',
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-27',
    'Completed Date': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Task ID': 'TASK-TEST-003',
    Title: 'Prepare fundraiser invitation list',
    Description: 'Compile list of VIP contacts for annual gala',
    Status: 'completed',
    Priority: 'High',
    'Due Date': '2026-01-05',
    'Contact ID': null,
    'Workspace ID': 'CAMP-TEST-001',
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-20',
    'Completed Date': '2025-12-28',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Task ID': 'TASK-TEST-004',
    Title: 'Schedule coffee meeting with Adam',
    Description: 'One-on-one to discuss education policy priorities',
    Status: 'pending',
    Priority: 'Urgent',
    'Due Date': '2026-01-15',
    'Contact ID': 'TEST0102001',
    'Workspace ID': null,
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-26',
    'Completed Date': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Task ID': 'TASK-TEST-005',
    Title: 'Review District 1 canvassing routes',
    Description: 'Optimize walking routes for door knocking efficiency',
    Status: 'pending',
    Priority: 'Low',
    'Due Date': '2026-02-01',
    'Contact ID': null,
    'Workspace ID': 'CAMP-TEST-003',
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-25',
    'Completed Date': null,
    [TEST_DATA_MARKER]: true,
  },
  {
    'Task ID': 'TASK-TEST-006',
    Title: 'Thank Sarah for holiday party help',
    Description: 'Send thank you card and small gift',
    Status: 'completed',
    Priority: 'Medium',
    'Due Date': '2025-12-30',
    'Contact ID': 'TEST0102002',
    'Workspace ID': null,
    'Assigned To': 'user@test.com',
    'Created By': 'user@test.com',
    'Task Created Date': '2025-12-22',
    'Completed Date': '2025-12-29',
    [TEST_DATA_MARKER]: true,
  },
];

const isTestTask = (task) => task && task[TEST_DATA_MARKER] === true;

/**
 * Check if test data has already been seeded
 * @returns {boolean} True if test data is already in localStorage
 */
export function isTestDataSeeded() {
  return localStorage.getItem(STORAGE_KEY_SEEDED) === 'true';
}

/**
 * Get all contacts from localStorage (dev mode only)
 * @returns {Array} Array of contact objects
 */
export function getLocalContacts() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contacts to localStorage (dev mode only)
 * @param {Array} contacts - Array of contact objects
 */
export function saveLocalContacts(contacts) {
  localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
}

/**
 * Get all touchpoints from localStorage (dev mode only)
 * @returns {Array} Array of touchpoint objects
 */
export function getLocalTouchpoints() {
  const stored = localStorage.getItem(STORAGE_KEY_TOUCHPOINTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save touchpoints to localStorage (dev mode only)
 * @param {Array} touchpoints - Array of touchpoint objects
 */
export function saveLocalTouchpoints(touchpoints) {
  localStorage.setItem(STORAGE_KEY_TOUCHPOINTS, JSON.stringify(touchpoints));
}

/**
 * Get all events from localStorage (dev mode only)
 * @returns {Array} Array of event objects
 */
export function getLocalEvents() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save events to localStorage (dev mode only)
 * @param {Array} events - Array of event objects
 */
export function saveLocalEvents(events) {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

/**
 * Get all calendar events from localStorage (dev mode only)
 * These simulate Google Calendar events for calendar sync testing
 * @returns {Array} Array of Google Calendar-style event objects
 */
export function getLocalCalendarEvents() {
  const stored = localStorage.getItem(STORAGE_KEY_CALENDAR_EVENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save calendar events to localStorage (dev mode only)
 * @param {Array} events - Array of Google Calendar-style event objects
 */
export function saveLocalCalendarEvents(events) {
  localStorage.setItem(STORAGE_KEY_CALENDAR_EVENTS, JSON.stringify(events));
}

/**
 * Get all activities from localStorage (dev mode only)
 * @returns {Array} Array of activity objects
 */
export function getLocalActivities() {
  const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save activities to localStorage (dev mode only)
 * @param {Array} activities - Array of activity objects
 */
export function saveLocalActivities(activities) {
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
}

/**
 * Get activities for a specific contact
 * @param {string} contactId - The contact ID
 * @returns {Array} Array of activity objects for that contact
 */
export function getLocalContactActivities(contactId) {
  const activities = getLocalActivities();
  return activities.filter((a) => a['Contact ID'] === contactId);
}

/**
 * Get all lists from localStorage (dev mode only)
 * @returns {Array} Array of list objects
 */
export function getLocalLists() {
  const stored = localStorage.getItem(STORAGE_KEY_LISTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save lists to localStorage (dev mode only)
 * @param {Array} lists - Array of list objects
 */
export function saveLocalLists(lists) {
  localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
}

/**
 * Get all contact-list mappings from localStorage (dev mode only)
 * @returns {Array} Array of contact-list mapping objects
 */
export function getLocalContactLists() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_LISTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact-list mappings to localStorage (dev mode only)
 * @param {Array} mappings - Array of contact-list mapping objects
 */
export function saveLocalContactLists(mappings) {
  localStorage.setItem(STORAGE_KEY_CONTACT_LISTS, JSON.stringify(mappings));
}

/**
 * Get all notes from localStorage (dev mode only)
 * @returns {Array} Array of note objects
 */
export function getLocalNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save notes to localStorage (dev mode only)
 * @param {Array} notes - Array of note objects
 */
export function saveLocalNotes(notes) {
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
}

/**
 * Get all contact-notes mappings from localStorage (dev mode only)
 * @returns {Array} Array of contact-notes mapping objects
 */
export function getLocalContactNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact-notes mappings to localStorage (dev mode only)
 * @param {Array} mappings - Array of contact-notes mapping objects
 */
export function saveLocalContactNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_CONTACT_NOTES, JSON.stringify(mappings));
}

/**
 * Get all event-notes mappings from localStorage (dev mode only)
 * @returns {Array} Array of event-notes mapping objects
 */
export function getLocalEventNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save event-notes mappings to localStorage (dev mode only)
 * @param {Array} mappings - Array of event-notes mapping objects
 */
export function saveLocalEventNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_EVENT_NOTES, JSON.stringify(mappings));
}

/**
 * Get all list-notes mappings from localStorage (dev mode only)
 * @returns {Array} Array of list-notes mapping objects
 */
export function getLocalListNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_LIST_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save list-notes mappings to localStorage (dev mode only)
 * @param {Array} mappings - Array of list-notes mapping objects
 */
export function saveLocalListNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_LIST_NOTES, JSON.stringify(mappings));
}

/**
 * Get all task-notes mappings from localStorage (dev mode only)
 * @returns {Array} Array of task-notes mapping objects
 */
export function getLocalTaskNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save task-notes mappings to localStorage (dev mode only)
 * @param {Array} mappings - Array of task-notes mapping objects
 */
export function saveLocalTaskNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_TASK_NOTES, JSON.stringify(mappings));
}

/**
 * Get notes for a specific contact
 * @param {string} contactId - The contact ID
 * @returns {Array} Array of note objects linked to that contact
 */
export function getNotesForContact(contactId) {
  const notes = getLocalNotes();
  const contactNotes = getLocalContactNotes();

  const noteIds = contactNotes
    .filter((cn) => cn['Contact ID'] === contactId)
    .map((cn) => cn['Note ID']);

  return notes.filter((n) => noteIds.includes(n['Note ID']));
}

/**
 * Get all workspaces from localStorage (dev mode only)
 * @returns {Array} Array of workspace objects
 */
export function getLocalWorkspaces() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save workspaces to localStorage (dev mode only)
 * @param {Array} workspaces - Array of workspace objects
 */
export function saveLocalWorkspaces(workspaces) {
  localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
}

/**
 * Get all workspace members from localStorage (dev mode only)
 * @returns {Array} Array of workspace member objects
 */
export function getLocalWorkspaceMembers() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE_MEMBERS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save workspace members to localStorage (dev mode only)
 * @param {Array} members - Array of workspace member objects
 */
export function saveLocalWorkspaceMembers(members) {
  localStorage.setItem(STORAGE_KEY_WORKSPACE_MEMBERS, JSON.stringify(members));
}

/**
 * Get all workspace invitations from localStorage (dev mode only)
 * @returns {Array} Array of workspace invitation objects
 */
export function getLocalWorkspaceInvitations() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE_INVITATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save workspace invitations to localStorage (dev mode only)
 * @param {Array} invitations - Array of workspace invitation objects
 */
export function saveLocalWorkspaceInvitations(invitations) {
  localStorage.setItem(STORAGE_KEY_WORKSPACE_INVITATIONS, JSON.stringify(invitations));
}

/**
 * Get all contact links from localStorage (dev mode only)
 * @returns {Array} Array of contact link objects
 */
export function getLocalContactLinks() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_LINKS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact links to localStorage (dev mode only)
 * @param {Array} links - Array of contact link objects
 */
export function saveLocalContactLinks(links) {
  localStorage.setItem(STORAGE_KEY_CONTACT_LINKS, JSON.stringify(links));
}

/**
 * Get all sync conflicts from localStorage (dev mode only)
 * @returns {Array} Array of sync conflict objects
 */
export function getLocalSyncConflicts() {
  const stored = localStorage.getItem(STORAGE_KEY_SYNC_CONFLICTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save sync conflicts to localStorage (dev mode only)
 * @param {Array} conflicts - Array of sync conflict objects
 */
export function saveLocalSyncConflicts(conflicts) {
  localStorage.setItem(STORAGE_KEY_SYNC_CONFLICTS, JSON.stringify(conflicts));
}

/**
 * Get all tasks from localStorage (dev mode only)
 * @returns {Array} Array of task objects
 */
export function getLocalTasks() {
  const stored = localStorage.getItem(STORAGE_KEY_TASKS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save tasks to localStorage (dev mode only)
 * @param {Array} tasks - Array of task objects
 */
export function saveLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}

/**
 * Get tasks for a specific contact
 * @param {string} contactId - The contact ID
 * @returns {Array} Array of task objects linked to that contact
 */
export function getTasksForContact(contactId) {
  const tasks = getLocalTasks();
  return tasks.filter((t) => t['Contact ID'] === contactId);
}

/**
 * Get tasks for a specific workspace
 * @param {string} workspaceId - The workspace ID
 * @returns {Array} Array of task objects linked to that workspace
 */
export function getTasksForWorkspace(workspaceId) {
  const tasks = getLocalTasks();
  return tasks.filter((t) => t['Workspace ID'] === workspaceId);
}

/**
 * Get all relationships from localStorage (dev mode only)
 * @returns {Array} Array of relationship objects
 */
export function getLocalRelationships() {
  const stored = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save relationships to localStorage (dev mode only)
 * @param {Array} relationships - Array of relationship objects
 */
export function saveLocalRelationships(relationships) {
  localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(relationships));
}

/**
 * Get relationships for a specific contact
 * @param {string} contactId - The contact ID
 * @returns {Array} Array of relationship objects where contact is source or target
 */
export function getRelationshipsForContact(contactId) {
  const relationships = getLocalRelationships();
  return relationships.filter(
    (r) => r['Source Contact ID'] === contactId || r['Target Contact ID'] === contactId
  );
}

/**
 * Get all organizations from localStorage (dev mode only)
 * @returns {Array} Array of organization objects
 */
export function getLocalOrganizations() {
  const stored = localStorage.getItem(STORAGE_KEY_ORGANIZATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save organizations to localStorage (dev mode only)
 * @param {Array} organizations - Array of organization objects
 */
export function saveLocalOrganizations(organizations) {
  localStorage.setItem(STORAGE_KEY_ORGANIZATIONS, JSON.stringify(organizations));
}

/**
 * Get all locations from localStorage (dev mode only)
 * @returns {Array} Array of location objects
 */
export function getLocalLocations() {
  const stored = localStorage.getItem(STORAGE_KEY_LOCATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save locations to localStorage (dev mode only)
 * @param {Array} locations - Array of location objects
 */
export function saveLocalLocations(locations) {
  localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
}

/**
 * Get all location visits from localStorage (dev mode only)
 * @returns {Array} Array of location visit objects
 */
export function getLocalLocationVisits() {
  const stored = localStorage.getItem(STORAGE_KEY_LOCATION_VISITS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save location visits to localStorage (dev mode only)
 * @param {Array} visits - Array of location visit objects
 */
export function saveLocalLocationVisits(visits) {
  localStorage.setItem(STORAGE_KEY_LOCATION_VISITS, JSON.stringify(visits));
}

/**
 * Get location visits for a specific location
 * @param {string} locationId - The location ID
 * @returns {Array} Array of visit objects for this location
 */
export function getVisitsForLocation(locationId) {
  const visits = getLocalLocationVisits();
  return visits.filter((v) => v['Location ID'] === locationId);
}

// ============================================================================
// CONTACT JUNCTION TABS (Phase A)
// ============================================================================

/**
 * Get contact socials from localStorage (dev mode only)
 * @returns {Array} Array of social profile objects
 */
export function getLocalContactSocials() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_SOCIALS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact socials to localStorage (dev mode only)
 * @param {Array} socials - Array of social profile objects
 */
export function saveLocalContactSocials(socials) {
  localStorage.setItem(STORAGE_KEY_CONTACT_SOCIALS, JSON.stringify(socials));
}

/**
 * Get contact education from localStorage (dev mode only)
 * @returns {Array} Array of education objects
 */
export function getLocalContactEducation() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_EDUCATION);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact education to localStorage (dev mode only)
 * @param {Array} education - Array of education objects
 */
export function saveLocalContactEducation(education) {
  localStorage.setItem(STORAGE_KEY_CONTACT_EDUCATION, JSON.stringify(education));
}

/**
 * Get contact employment from localStorage (dev mode only)
 * @returns {Array} Array of employment objects
 */
export function getLocalContactEmployment() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_EMPLOYMENT);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact employment to localStorage (dev mode only)
 * @param {Array} employment - Array of employment objects
 */
export function saveLocalContactEmployment(employment) {
  localStorage.setItem(STORAGE_KEY_CONTACT_EMPLOYMENT, JSON.stringify(employment));
}

/**
 * Get contact districts from localStorage (dev mode only)
 * @returns {Array} Array of district objects
 */
export function getLocalContactDistricts() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_DISTRICTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact districts to localStorage (dev mode only)
 * @param {Array} districts - Array of district objects
 */
export function saveLocalContactDistricts(districts) {
  localStorage.setItem(STORAGE_KEY_CONTACT_DISTRICTS, JSON.stringify(districts));
}

/**
 * Get contact methods from localStorage (dev mode only)
 * @returns {Array} Array of contact method objects
 */
export function getLocalContactMethods() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_METHODS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact methods to localStorage (dev mode only)
 * @param {Array} methods - Array of contact method objects
 */
export function saveLocalContactMethods(methods) {
  localStorage.setItem(STORAGE_KEY_CONTACT_METHODS, JSON.stringify(methods));
}

/**
 * Get contact attributes from localStorage (dev mode only)
 * @returns {Array} Array of contact attribute objects
 */
export function getLocalContactAttributes() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_ATTRIBUTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save contact attributes to localStorage (dev mode only)
 * @param {Array} attributes - Array of contact attribute objects
 */
export function saveLocalContactAttributes(attributes) {
  localStorage.setItem(STORAGE_KEY_CONTACT_ATTRIBUTES, JSON.stringify(attributes));
}

/**
 * Get event attendees from localStorage (dev mode only)
 * @returns {Array} Array of attendee objects
 */
export function getLocalEventAttendees() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_ATTENDEES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save event attendees to localStorage (dev mode only)
 * @param {Array} attendees - Array of attendee objects
 */
export function saveLocalEventAttendees(attendees) {
  localStorage.setItem(STORAGE_KEY_EVENT_ATTENDEES, JSON.stringify(attendees));
}

/**
 * Get event resources from localStorage (dev mode only)
 * @returns {Array} Array of resource objects
 */
export function getLocalEventResources() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_RESOURCES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save event resources to localStorage (dev mode only)
 * @param {Array} resources - Array of resource objects
 */
export function saveLocalEventResources(resources) {
  localStorage.setItem(STORAGE_KEY_EVENT_RESOURCES, JSON.stringify(resources));
}

/**
 * Get event agenda items from localStorage (dev mode only)
 * @returns {Array} Array of agenda item objects
 */
export function getLocalEventAgenda() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_AGENDA);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save event agenda items to localStorage (dev mode only)
 * @param {Array} agendaItems - Array of agenda item objects
 */
export function saveLocalEventAgenda(agendaItems) {
  localStorage.setItem(STORAGE_KEY_EVENT_AGENDA, JSON.stringify(agendaItems));
}

/**
 * Get organization contacts from localStorage (dev mode only)
 * @returns {Array} Array of organization contact objects
 */
export function getLocalOrgContacts() {
  const stored = localStorage.getItem(STORAGE_KEY_ORG_CONTACTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save organization contacts to localStorage (dev mode only)
 * @param {Array} orgContacts - Array of organization contact objects
 */
export function saveLocalOrgContacts(orgContacts) {
  localStorage.setItem(STORAGE_KEY_ORG_CONTACTS, JSON.stringify(orgContacts));
}

/**
 * Get organization departments from localStorage (dev mode only)
 * @returns {Array} Array of department objects
 */
export function getLocalOrgDepartments() {
  const stored = localStorage.getItem(STORAGE_KEY_ORG_DEPARTMENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save organization departments to localStorage (dev mode only)
 * @param {Array} departments - Array of department objects
 */
export function saveLocalOrgDepartments(departments) {
  localStorage.setItem(STORAGE_KEY_ORG_DEPARTMENTS, JSON.stringify(departments));
}

/**
 * Get task checklist items from localStorage (dev mode only)
 * @returns {Array} Array of checklist item objects
 */
export function getLocalTaskChecklist() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_CHECKLIST);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save task checklist items to localStorage (dev mode only)
 * @param {Array} items - Array of checklist item objects
 */
export function saveLocalTaskChecklist(items) {
  localStorage.setItem(STORAGE_KEY_TASK_CHECKLIST, JSON.stringify(items));
}

/**
 * Get task time entries from localStorage (dev mode only)
 * @returns {Array} Array of time entry objects
 */
export function getLocalTaskTimeEntries() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_TIME_ENTRIES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save task time entries to localStorage (dev mode only)
 * @param {Array} entries - Array of time entry objects
 */
export function saveLocalTaskTimeEntries(entries) {
  localStorage.setItem(STORAGE_KEY_TASK_TIME_ENTRIES, JSON.stringify(entries));
}

/**
 * Seed test contacts and touchpoints into localStorage
 * This function is idempotent - it won't duplicate data if called multiple times
 */
export function seedTestData() {
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    warn('[DEV MODE] seedTestData called but dev mode is not enabled');
    return;
  }

  // Seed each data type independently (allows adding new test data types without re-seeding all)
  let anythingSeeded = false;

  // Get existing contacts (if any)
  const existingContacts = getLocalContacts();

  // Add test contacts that don't already exist
  const existingIds = new Set(existingContacts.map((c) => c['Contact ID']));
  const newTestContacts = testContacts.filter((tc) => !existingIds.has(tc['Contact ID']));

  if (newTestContacts.length > 0) {
    const allContacts = [...existingContacts, ...newTestContacts];
    saveLocalContacts(allContacts);
    log(`[DEV MODE] Seeded ${newTestContacts.length} test contacts`);
    anythingSeeded = true;
  }

  // Get existing touchpoints (if any)
  const existingTouchpoints = getLocalTouchpoints();

  // Add test touchpoints that don't already exist
  const existingTouchpointIds = new Set(existingTouchpoints.map((t) => t['Touchpoint ID']));
  const newTestTouchpoints = testTouchpoints.filter(
    (tp) => !existingTouchpointIds.has(tp['Touchpoint ID'])
  );

  if (newTestTouchpoints.length > 0) {
    const allTouchpoints = [...existingTouchpoints, ...newTestTouchpoints];
    saveLocalTouchpoints(allTouchpoints);
    log(`[DEV MODE] Seeded ${newTestTouchpoints.length} test touchpoints`);
    anythingSeeded = true;
  }

  // Get existing events (if any)
  const existingEvents = getLocalEvents();

  // Add test events that don't already exist
  const existingEventIds = new Set(existingEvents.map((e) => e['Event ID']));
  const newTestEvents = testEvents.filter((e) => !existingEventIds.has(e['Event ID']));

  if (newTestEvents.length > 0) {
    const allEvents = [...existingEvents, ...newTestEvents];
    saveLocalEvents(allEvents);
    log(`[DEV MODE] Seeded ${newTestEvents.length} test events`);
    anythingSeeded = true;
  }

  // Get existing lists (if any)
  const existingLists = getLocalLists();

  // Add test lists that don't already exist
  const existingListIds = new Set(existingLists.map((l) => l['List ID']));
  const newTestLists = testLists.filter((l) => !existingListIds.has(l['List ID']));

  if (newTestLists.length > 0) {
    const allLists = [...existingLists, ...newTestLists];
    saveLocalLists(allLists);
    log(`[DEV MODE] Seeded ${newTestLists.length} test lists`);
    anythingSeeded = true;
  }

  // Get existing contact-list mappings (if any)
  const existingContactLists = getLocalContactLists();

  // Add test contact-list mappings that don't already exist
  const existingMappingIds = new Set(
    existingContactLists.map((cl) => `${cl['Contact ID']}-${cl['List ID']}`)
  );
  const newTestContactLists = testContactLists.filter(
    (cl) => !existingMappingIds.has(`${cl['Contact ID']}-${cl['List ID']}`)
  );

  if (newTestContactLists.length > 0) {
    const allContactLists = [...existingContactLists, ...newTestContactLists];
    saveLocalContactLists(allContactLists);
    log(`[DEV MODE] Seeded ${newTestContactLists.length} test contact-list mappings`);
    anythingSeeded = true;
  }

  // Get existing notes (if any)
  const existingNotes = getLocalNotes();

  // Add test notes that don't already exist
  const existingNoteIds = new Set(existingNotes.map((n) => n['Note ID']));
  const newTestNotes = testNotes.filter((n) => !existingNoteIds.has(n['Note ID']));

  if (newTestNotes.length > 0) {
    const allNotes = [...existingNotes, ...newTestNotes];
    saveLocalNotes(allNotes);
    log(`[DEV MODE] Seeded ${newTestNotes.length} test notes`);
    anythingSeeded = true;
  }

  // Get existing contact-notes mappings (if any)
  const existingContactNotes = getLocalContactNotes();

  // Add test contact-notes mappings that don't already exist
  const existingNoteMappingIds = new Set(
    existingContactNotes.map((cn) => `${cn['Note ID']}-${cn['Contact ID']}`)
  );
  const newTestContactNotes = testContactNotes.filter(
    (cn) => !existingNoteMappingIds.has(`${cn['Note ID']}-${cn['Contact ID']}`)
  );

  if (newTestContactNotes.length > 0) {
    const allContactNotes = [...existingContactNotes, ...newTestContactNotes];
    saveLocalContactNotes(allContactNotes);
    log(`[DEV MODE] Seeded ${newTestContactNotes.length} test contact-notes mappings`);
    anythingSeeded = true;
  }

  // Get existing workspaces (if any)
  const existingWorkspaces = getLocalWorkspaces();

  // Add test workspaces that don't already exist
  const existingWorkspaceIds = new Set(existingWorkspaces.map((c) => c.id));
  const newTestWorkspaces = testWorkspaces.filter((c) => !existingWorkspaceIds.has(c.id));

  if (newTestWorkspaces.length > 0) {
    const allWorkspaces = [...existingWorkspaces, ...newTestWorkspaces];
    saveLocalWorkspaces(allWorkspaces);
    log(`[DEV MODE] Seeded ${newTestWorkspaces.length} test workspaces`);
    anythingSeeded = true;
  }

  // Get existing contact links (if any)
  const existingContactLinks = getLocalContactLinks();

  // Add test contact links that don't already exist
  const existingLinkIds = new Set(existingContactLinks.map((l) => l.id));
  const newTestContactLinks = testContactLinks.filter((l) => !existingLinkIds.has(l.id));

  if (newTestContactLinks.length > 0) {
    const allContactLinks = [...existingContactLinks, ...newTestContactLinks];
    saveLocalContactLinks(allContactLinks);
    log(`[DEV MODE] Seeded ${newTestContactLinks.length} test contact links`);
    anythingSeeded = true;
  }

  // Get existing sync conflicts (if any)
  const existingSyncConflicts = getLocalSyncConflicts();

  // Add test sync conflicts that don't already exist
  const existingConflictIds = new Set(existingSyncConflicts.map((c) => c.id));
  const newTestSyncConflicts = testSyncConflicts.filter((c) => !existingConflictIds.has(c.id));

  if (newTestSyncConflicts.length > 0) {
    const allSyncConflicts = [...existingSyncConflicts, ...newTestSyncConflicts];
    saveLocalSyncConflicts(allSyncConflicts);
    log(`[DEV MODE] Seeded ${newTestSyncConflicts.length} test sync conflicts`);
    anythingSeeded = true;
  }

  // Get existing tasks (if any)
  const existingTasks = getLocalTasks();

  // Add test tasks that don't already exist
  const existingTaskIds = new Set(existingTasks.map((t) => t['Task ID']));
  const newTestTasks = testTasks.filter((t) => !existingTaskIds.has(t['Task ID']));

  if (newTestTasks.length > 0) {
    const allTasks = [...existingTasks, ...newTestTasks];
    saveLocalTasks(allTasks);
    log(`[DEV MODE] Seeded ${newTestTasks.length} test tasks`);
    anythingSeeded = true;
  }

  // Get existing relationships (if any)
  const existingRelationships = getLocalRelationships();

  // Add test relationships that don't already exist
  const existingRelationshipIds = new Set(existingRelationships.map((r) => r['Relationship ID']));
  const newTestRelationships = testRelationships.filter(
    (r) => !existingRelationshipIds.has(r['Relationship ID'])
  );

  if (newTestRelationships.length > 0) {
    const allRelationships = [...existingRelationships, ...newTestRelationships];
    saveLocalRelationships(allRelationships);
    log(`[DEV MODE] Seeded ${newTestRelationships.length} test relationships`);
    anythingSeeded = true;
  }

  // Get existing organizations (if any)
  const existingOrganizations = getLocalOrganizations();

  // Add test organizations that don't already exist
  const existingOrgIds = new Set(existingOrganizations.map((o) => o['Organization ID']));
  const newTestOrganizations = testOrganizations.filter(
    (o) => !existingOrgIds.has(o['Organization ID'])
  );

  if (newTestOrganizations.length > 0) {
    const allOrganizations = [...existingOrganizations, ...newTestOrganizations];
    saveLocalOrganizations(allOrganizations);
    log(`[DEV MODE] Seeded ${newTestOrganizations.length} test organizations`);
    anythingSeeded = true;
  }

  // Get existing locations (if any)
  const existingLocations = getLocalLocations();

  // Add test locations that don't already exist
  const existingLocIds = new Set(existingLocations.map((l) => l['Location ID']));
  const newTestLocations = testLocations.filter((l) => !existingLocIds.has(l['Location ID']));

  if (newTestLocations.length > 0) {
    const allLocations = [...existingLocations, ...newTestLocations];
    saveLocalLocations(allLocations);
    log(`[DEV MODE] Seeded ${newTestLocations.length} test locations`);
    anythingSeeded = true;
  }

  // Get existing location visits (if any)
  const existingVisits = getLocalLocationVisits();

  // Add test location visits that don't already exist
  const existingVisitIds = new Set(existingVisits.map((v) => v['Visit ID']));
  const newTestVisits = testLocationVisits.filter((v) => !existingVisitIds.has(v['Visit ID']));

  if (newTestVisits.length > 0) {
    const allVisits = [...existingVisits, ...newTestVisits];
    saveLocalLocationVisits(allVisits);
    log(`[DEV MODE] Seeded ${newTestVisits.length} test location visits`);
    anythingSeeded = true;
  }

  // Mark as seeded (even if no new data was added, we checked)
  if (!isTestDataSeeded() || anythingSeeded) {
    localStorage.setItem(STORAGE_KEY_SEEDED, 'true');
    if (anythingSeeded) {
      log('[DEV MODE] Test data seeding complete');
    }
  }
}

/**
 * Clear all test data from localStorage
 * Removes only contacts, touchpoints, events, collections, and contact-collections marked with TEST_DATA_MARKER
 */
export function clearTestData() {
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    warn('[DEV MODE] clearTestData called but dev mode is not enabled');
    return;
  }

  // Remove test contacts
  const allContacts = getLocalContacts();
  const nonTestContacts = allContacts.filter((c) => !isTestContact(c));
  saveLocalContacts(nonTestContacts);
  const removedContactsCount = allContacts.length - nonTestContacts.length;

  // Remove test touchpoints
  const allTouchpoints = getLocalTouchpoints();
  const nonTestTouchpoints = allTouchpoints.filter((t) => !isTestTouchpoint(t));
  saveLocalTouchpoints(nonTestTouchpoints);
  const removedTouchpointsCount = allTouchpoints.length - nonTestTouchpoints.length;

  // Remove test events
  const allEvents = getLocalEvents();
  const nonTestEvents = allEvents.filter((e) => !isTestEvent(e));
  saveLocalEvents(nonTestEvents);
  const removedEventsCount = allEvents.length - nonTestEvents.length;

  // Remove test lists
  const allLists = getLocalLists();
  const nonTestLists = allLists.filter((l) => !isTestList(l));
  saveLocalLists(nonTestLists);
  const removedListsCount = allLists.length - nonTestLists.length;

  // Remove test contact-list mappings
  const allContactLists = getLocalContactLists();
  const nonTestContactLists = allContactLists.filter((cl) => !isTestContactList(cl));
  saveLocalContactLists(nonTestContactLists);
  const removedContactListsCount = allContactLists.length - nonTestContactLists.length;

  // Remove test notes
  const allNotes = getLocalNotes();
  const nonTestNotes = allNotes.filter((n) => !isTestNote(n));
  saveLocalNotes(nonTestNotes);
  const removedNotesCount = allNotes.length - nonTestNotes.length;

  // Remove test contact-notes mappings
  const allContactNotes = getLocalContactNotes();
  const nonTestContactNotes = allContactNotes.filter((cn) => !isTestContactNote(cn));
  saveLocalContactNotes(nonTestContactNotes);
  const removedContactNotesCount = allContactNotes.length - nonTestContactNotes.length;

  // Remove test workspaces
  const allWorkspaces = getLocalWorkspaces();
  const nonTestWorkspaces = allWorkspaces.filter((c) => !isTestWorkspace(c));
  saveLocalWorkspaces(nonTestWorkspaces);
  const removedWorkspacesCount = allWorkspaces.length - nonTestWorkspaces.length;

  // Remove test contact links
  const allContactLinks = getLocalContactLinks();
  const nonTestContactLinks = allContactLinks.filter((l) => !isTestContactLink(l));
  saveLocalContactLinks(nonTestContactLinks);
  const removedContactLinksCount = allContactLinks.length - nonTestContactLinks.length;

  // Remove test sync conflicts
  const allSyncConflicts = getLocalSyncConflicts();
  const nonTestSyncConflicts = allSyncConflicts.filter((c) => !isTestSyncConflict(c));
  saveLocalSyncConflicts(nonTestSyncConflicts);
  const removedSyncConflictsCount = allSyncConflicts.length - nonTestSyncConflicts.length;

  // Remove test tasks
  const allTasks = getLocalTasks();
  const nonTestTasks = allTasks.filter((t) => !isTestTask(t));
  saveLocalTasks(nonTestTasks);
  const removedTasksCount = allTasks.length - nonTestTasks.length;

  // Clear seeded flag
  localStorage.removeItem(STORAGE_KEY_SEEDED);

  return {
    contacts: removedContactsCount,
    touchpoints: removedTouchpointsCount,
    events: removedEventsCount,
    lists: removedListsCount,
    contactLists: removedContactListsCount,
    notes: removedNotesCount,
    contactNotes: removedContactNotesCount,
    workspaces: removedWorkspacesCount,
    contactLinks: removedContactLinksCount,
    syncConflicts: removedSyncConflictsCount,
    tasks: removedTasksCount,
  };
}

/**
 * Reload test data (clear and re-seed)
 */
export function reloadTestData() {
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    warn('[DEV MODE] reloadTestData called but dev mode is not enabled');
    return;
  }

  clearTestData();
  seedTestData();
  log('[DEV MODE] Test data reloaded');
}

/**
 * Clear ALL dev data (including non-test contacts, touchpoints, activities, collections, contact-collections, notes, contact-notes, workspaces, contact links, and sync conflicts)
 * Use with caution!
 */
export function clearAllDevData() {
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    warn('[DEV MODE] clearAllDevData called but dev mode is not enabled');
    return;
  }

  localStorage.removeItem(STORAGE_KEY_CONTACTS);
  localStorage.removeItem(STORAGE_KEY_TOUCHPOINTS);
  localStorage.removeItem(STORAGE_KEY_NOTES);
  localStorage.removeItem(STORAGE_KEY_CONTACT_NOTES);
  localStorage.removeItem(STORAGE_KEY_EVENTS);
  localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
  localStorage.removeItem(STORAGE_KEY_LISTS);
  localStorage.removeItem(STORAGE_KEY_CONTACT_LISTS);
  localStorage.removeItem(STORAGE_KEY_WORKSPACES);
  localStorage.removeItem(STORAGE_KEY_WORKSPACE_MEMBERS);
  localStorage.removeItem(STORAGE_KEY_WORKSPACE_INVITATIONS);
  localStorage.removeItem(STORAGE_KEY_CONTACT_LINKS);
  localStorage.removeItem(STORAGE_KEY_SYNC_CONFLICTS);
  localStorage.removeItem(STORAGE_KEY_TASKS);
  localStorage.removeItem(STORAGE_KEY_RELATIONSHIPS);
  localStorage.removeItem(STORAGE_KEY_ORGANIZATIONS);
  localStorage.removeItem(STORAGE_KEY_LOCATIONS);
  localStorage.removeItem(STORAGE_KEY_LOCATION_VISITS);
  localStorage.removeItem(STORAGE_KEY_CONTACT_SOCIALS);
  localStorage.removeItem(STORAGE_KEY_CONTACT_EDUCATION);
  localStorage.removeItem(STORAGE_KEY_CONTACT_EMPLOYMENT);
  localStorage.removeItem(STORAGE_KEY_CONTACT_DISTRICTS);
  localStorage.removeItem(STORAGE_KEY_EVENT_ATTENDEES);
  localStorage.removeItem(STORAGE_KEY_EVENT_RESOURCES);
  localStorage.removeItem(STORAGE_KEY_EVENT_AGENDA);
  localStorage.removeItem(STORAGE_KEY_ORG_CONTACTS);
  localStorage.removeItem(STORAGE_KEY_ORG_DEPARTMENTS);
  localStorage.removeItem(STORAGE_KEY_TASK_CHECKLIST);
  localStorage.removeItem(STORAGE_KEY_TASK_TIME_ENTRIES);
  localStorage.removeItem(STORAGE_KEY_SEEDED);
  log('[DEV MODE] Cleared all dev data');
}

/**
 * Get statistics about current dev data
 * @returns {Object} Stats object with counts
 */
export function getDevDataStats() {
  const contacts = getLocalContacts();
  const touchpoints = getLocalTouchpoints();
  const testContactCount = contacts.filter(isTestContact).length;
  const realContactCount = contacts.length - testContactCount;

  return {
    totalContacts: contacts.length,
    testContacts: testContactCount,
    realContacts: realContactCount,
    touchpoints: touchpoints.length,
    isSeeded: isTestDataSeeded(),
  };
}

/**
 * Expand dev mode data to match current schema
 * Called automatically when old data is detected
 */
export const migrateDevModeData = () => {
  if (!isDevMode()) {
    return; // Only run in dev mode
  }

  const currentVersion = parseInt(localStorage.getItem(SCHEMA_STORAGE_KEY) || '0', 10);

  if (currentVersion >= SCHEMA_VERSION) {
    return; // Already migrated
  }

  log(`[DEV MODE MIGRATION] Upgrading from v${currentVersion} to v${SCHEMA_VERSION}`);

  // Migrate contacts
  const contacts = getLocalContacts();
  if (contacts.length > 0) {
    const migratedContacts = contacts.map((c) => {
      const newContact = { ...c };
      // Add all missing fields with empty defaults
      const expectedFields = SHEET_HEADERS[SHEET_NAMES.CONTACTS];
      if (expectedFields) {
        expectedFields.forEach((field) => {
          if (!(field in newContact)) {
            newContact[field] = '';
          }
        });
      }
      return newContact;
    });
    saveLocalContacts(migratedContacts);
  }

  // Migrate events
  const events = getLocalEvents();
  if (events.length > 0) {
    const migratedEvents = events.map((e) => {
      const newEvent = { ...e };
      const expectedFields = SHEET_HEADERS[SHEET_NAMES.EVENTS];
      if (expectedFields) {
        expectedFields.forEach((field) => {
          if (!(field in newEvent)) {
            newEvent[field] = '';
          }
        });
      }
      return newEvent;
    });
    saveLocalEvents(migratedEvents);
  }

  // Migrate organizations
  const orgs = getLocalOrganizations();
  if (orgs.length > 0) {
    const migratedOrgs = orgs.map((o) => {
      const newOrg = { ...o };
      const expectedFields = SHEET_HEADERS[SHEET_NAMES.ORGANIZATIONS];
      if (expectedFields) {
        expectedFields.forEach((field) => {
          if (!(field in newOrg)) {
            newOrg[field] = '';
          }
        });
      }
      return newOrg;
    });
    saveLocalOrganizations(migratedOrgs);
  }

  // Migrate tasks
  const tasks = getLocalTasks();
  if (tasks.length > 0) {
    const migratedTasks = tasks.map((t) => {
      const newTask = { ...t };
      const expectedFields = SHEET_HEADERS[SHEET_NAMES.TASKS];
      if (expectedFields) {
        expectedFields.forEach((field) => {
          if (!(field in newTask)) {
            newTask[field] = '';
          }
        });
      }
      return newTask;
    });
    saveLocalTasks(migratedTasks);
  }

  localStorage.setItem(SCHEMA_STORAGE_KEY, SCHEMA_VERSION.toString());
  log('[DEV MODE MIGRATION] Complete!');
};

// Auto-run migration on module load in dev mode
if (import.meta.env.VITE_DEV_MODE === 'true') {
  migrateDevModeData();
}
