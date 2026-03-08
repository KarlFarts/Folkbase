/**
 * Dev Mode localStorage Data Layer
 *
 * Provides localStorage-based get/save functions for all entity types.
 * When VITE_DEV_MODE is enabled, devModeWrapper.js uses these functions
 * instead of Google Sheets API calls.
 */

import { log } from '../../utils/logger';
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
const STORAGE_KEY_MOMENTS = 'dev_moments';

// ============================================================================
// CONTACTS
// ============================================================================

export function getLocalContacts() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContacts(contacts) {
  localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
}

// ============================================================================
// TOUCHPOINTS
// ============================================================================

export function getLocalTouchpoints() {
  const stored = localStorage.getItem(STORAGE_KEY_TOUCHPOINTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTouchpoints(touchpoints) {
  localStorage.setItem(STORAGE_KEY_TOUCHPOINTS, JSON.stringify(touchpoints));
}

// ============================================================================
// EVENTS
// ============================================================================

export function getLocalEvents() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalEvents(events) {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

export function getLocalCalendarEvents() {
  const stored = localStorage.getItem(STORAGE_KEY_CALENDAR_EVENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalCalendarEvents(events) {
  localStorage.setItem(STORAGE_KEY_CALENDAR_EVENTS, JSON.stringify(events));
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export function getLocalActivities() {
  const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalActivities(activities) {
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
}

export function getLocalContactActivities(contactId) {
  const activities = getLocalActivities();
  return activities.filter((a) => a['Contact ID'] === contactId);
}

// ============================================================================
// LISTS
// ============================================================================

export function getLocalLists() {
  const stored = localStorage.getItem(STORAGE_KEY_LISTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalLists(lists) {
  localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
}

// ============================================================================
// CONTACT-LIST MAPPINGS
// ============================================================================

export function getLocalContactLists() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_LISTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactLists(mappings) {
  localStorage.setItem(STORAGE_KEY_CONTACT_LISTS, JSON.stringify(mappings));
}

// ============================================================================
// NOTES
// ============================================================================

export function getLocalNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalNotes(notes) {
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
}

export function getLocalContactNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_CONTACT_NOTES, JSON.stringify(mappings));
}

export function getLocalEventNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalEventNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_EVENT_NOTES, JSON.stringify(mappings));
}

export function getLocalListNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_LIST_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalListNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_LIST_NOTES, JSON.stringify(mappings));
}

export function getLocalTaskNotes() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_NOTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTaskNotes(mappings) {
  localStorage.setItem(STORAGE_KEY_TASK_NOTES, JSON.stringify(mappings));
}

export function getNotesForContact(contactId) {
  const notes = getLocalNotes();
  const contactNotes = getLocalContactNotes();

  const noteIds = contactNotes
    .filter((cn) => cn['Contact ID'] === contactId)
    .map((cn) => cn['Note ID']);

  return notes.filter((n) => noteIds.includes(n['Note ID']));
}

// ============================================================================
// WORKSPACES
// ============================================================================

export function getLocalWorkspaces() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalWorkspaces(workspaces) {
  localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
}

export function getLocalWorkspaceMembers() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE_MEMBERS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalWorkspaceMembers(members) {
  localStorage.setItem(STORAGE_KEY_WORKSPACE_MEMBERS, JSON.stringify(members));
}

export function getLocalWorkspaceInvitations() {
  const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE_INVITATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalWorkspaceInvitations(invitations) {
  localStorage.setItem(STORAGE_KEY_WORKSPACE_INVITATIONS, JSON.stringify(invitations));
}

// ============================================================================
// CONTACT LINKS & SYNC CONFLICTS
// ============================================================================

export function getLocalContactLinks() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_LINKS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactLinks(links) {
  localStorage.setItem(STORAGE_KEY_CONTACT_LINKS, JSON.stringify(links));
}

export function getLocalSyncConflicts() {
  const stored = localStorage.getItem(STORAGE_KEY_SYNC_CONFLICTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalSyncConflicts(conflicts) {
  localStorage.setItem(STORAGE_KEY_SYNC_CONFLICTS, JSON.stringify(conflicts));
}

// ============================================================================
// TASKS
// ============================================================================

export function getLocalTasks() {
  const stored = localStorage.getItem(STORAGE_KEY_TASKS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}

export function getTasksForContact(contactId) {
  const tasks = getLocalTasks();
  return tasks.filter((t) => t['Contact ID'] === contactId);
}

export function getTasksForWorkspace(workspaceId) {
  const tasks = getLocalTasks();
  return tasks.filter((t) => t['Workspace ID'] === workspaceId);
}

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export function getLocalRelationships() {
  const stored = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalRelationships(relationships) {
  localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(relationships));
}

export function getRelationshipsForContact(contactId) {
  const relationships = getLocalRelationships();
  return relationships.filter(
    (r) => r['Source Contact ID'] === contactId || r['Target Contact ID'] === contactId
  );
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export function getLocalOrganizations() {
  const stored = localStorage.getItem(STORAGE_KEY_ORGANIZATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalOrganizations(organizations) {
  localStorage.setItem(STORAGE_KEY_ORGANIZATIONS, JSON.stringify(organizations));
}

// ============================================================================
// LOCATIONS
// ============================================================================

export function getLocalLocations() {
  const stored = localStorage.getItem(STORAGE_KEY_LOCATIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalLocations(locations) {
  localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
}

export function getLocalLocationVisits() {
  const stored = localStorage.getItem(STORAGE_KEY_LOCATION_VISITS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalLocationVisits(visits) {
  localStorage.setItem(STORAGE_KEY_LOCATION_VISITS, JSON.stringify(visits));
}

export function getVisitsForLocation(locationId) {
  const visits = getLocalLocationVisits();
  return visits.filter((v) => v['Location ID'] === locationId);
}

// ============================================================================
// CONTACT JUNCTION TABS (Phase A)
// ============================================================================

export function getLocalContactSocials() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_SOCIALS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactSocials(socials) {
  localStorage.setItem(STORAGE_KEY_CONTACT_SOCIALS, JSON.stringify(socials));
}

export function getLocalContactEducation() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_EDUCATION);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactEducation(education) {
  localStorage.setItem(STORAGE_KEY_CONTACT_EDUCATION, JSON.stringify(education));
}

export function getLocalContactEmployment() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_EMPLOYMENT);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactEmployment(employment) {
  localStorage.setItem(STORAGE_KEY_CONTACT_EMPLOYMENT, JSON.stringify(employment));
}

export function getLocalContactDistricts() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_DISTRICTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactDistricts(districts) {
  localStorage.setItem(STORAGE_KEY_CONTACT_DISTRICTS, JSON.stringify(districts));
}

export function getLocalContactMethods() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_METHODS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactMethods(methods) {
  localStorage.setItem(STORAGE_KEY_CONTACT_METHODS, JSON.stringify(methods));
}

export function getLocalContactAttributes() {
  const stored = localStorage.getItem(STORAGE_KEY_CONTACT_ATTRIBUTES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalContactAttributes(attributes) {
  localStorage.setItem(STORAGE_KEY_CONTACT_ATTRIBUTES, JSON.stringify(attributes));
}

// ============================================================================
// EVENT JUNCTION TABS
// ============================================================================

export function getLocalEventAttendees() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_ATTENDEES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalEventAttendees(attendees) {
  localStorage.setItem(STORAGE_KEY_EVENT_ATTENDEES, JSON.stringify(attendees));
}

export function getLocalEventResources() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_RESOURCES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalEventResources(resources) {
  localStorage.setItem(STORAGE_KEY_EVENT_RESOURCES, JSON.stringify(resources));
}

export function getLocalEventAgenda() {
  const stored = localStorage.getItem(STORAGE_KEY_EVENT_AGENDA);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalEventAgenda(agendaItems) {
  localStorage.setItem(STORAGE_KEY_EVENT_AGENDA, JSON.stringify(agendaItems));
}

// ============================================================================
// ORGANIZATION JUNCTION TABS
// ============================================================================

export function getLocalOrgContacts() {
  const stored = localStorage.getItem(STORAGE_KEY_ORG_CONTACTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalOrgContacts(orgContacts) {
  localStorage.setItem(STORAGE_KEY_ORG_CONTACTS, JSON.stringify(orgContacts));
}

export function getLocalOrgDepartments() {
  const stored = localStorage.getItem(STORAGE_KEY_ORG_DEPARTMENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalOrgDepartments(departments) {
  localStorage.setItem(STORAGE_KEY_ORG_DEPARTMENTS, JSON.stringify(departments));
}

// ============================================================================
// TASK JUNCTION TABS
// ============================================================================

export function getLocalTaskChecklist() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_CHECKLIST);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTaskChecklist(items) {
  localStorage.setItem(STORAGE_KEY_TASK_CHECKLIST, JSON.stringify(items));
}

export function getLocalTaskTimeEntries() {
  const stored = localStorage.getItem(STORAGE_KEY_TASK_TIME_ENTRIES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTaskTimeEntries(entries) {
  localStorage.setItem(STORAGE_KEY_TASK_TIME_ENTRIES, JSON.stringify(entries));
}

// ============================================================================
// MOMENTS
// ============================================================================

export function getLocalMoments() {
  const stored = localStorage.getItem(STORAGE_KEY_MOMENTS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalMoments(moments) {
  localStorage.setItem(STORAGE_KEY_MOMENTS, JSON.stringify(moments));
}

// ============================================================================
// SCHEMA MIGRATION
// ============================================================================

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
