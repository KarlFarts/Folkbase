/**
 * Development Mode Automatic Wrapper
 *
 * This module automatically wraps ALL sheets.js functions to work in dev mode.
 * Future agents don't need to remember patterns - just import from this wrapper
 * instead of directly from sheets.js
 *
 * Everything just works transparently:
 * - Dev mode: Uses localStorage, no Google Sheets API calls
 * - Production: Uses actual Google Sheets API
 *
 * USAGE:
 * Instead of: import { readSheetData } from '../utils/sheets';
 * Use: import { readSheetData } from '../utils/devModeWrapper';
 *
 * No other changes needed - works exactly the same!
 */

import * as sheetsModule from './sheets';
import { getCachedData, setCachedData, invalidateCache } from './indexedDbCache';
import { SHEET_NAMES } from '../config/constants';
import monitoringService from '../services/cacheMonitoringService';
// Dev mode data layer — dynamically imported to keep test fixtures out of production bundles.
// Vite replaces import.meta.env at build time, so in production the condition is false
// and esbuild eliminates the dynamic import entirely.
const _devSeed =
  import.meta.env.VITE_DEV_MODE === 'true'
    ? await import('../__tests__/fixtures/seedTestData')
    : {};
const _devContacts =
  import.meta.env.VITE_DEV_MODE === 'true'
    ? await import('../__tests__/fixtures/testContacts')
    : {};

const {
  getLocalContacts = () => [],
  saveLocalContacts = () => {},
  getLocalTouchpoints = () => [],
  saveLocalTouchpoints = () => {},
  getLocalEvents = () => [],
  saveLocalEvents = () => {},
  getLocalActivities = () => [],
  saveLocalActivities = () => {},
  getLocalContactActivities = () => [],
  getLocalLists = () => [],
  saveLocalLists = () => {},
  getLocalContactLists = () => [],
  saveLocalContactLists = () => {},
  getLocalNotes = () => [],
  saveLocalNotes = () => {},
  getLocalContactNotes = () => [],
  saveLocalContactNotes = () => {},
  getLocalEventNotes = () => [],
  saveLocalEventNotes = () => {},
  getLocalListNotes = () => [],
  saveLocalListNotes = () => {},
  getLocalTaskNotes = () => [],
  saveLocalTaskNotes = () => {},
  getNotesForContact = () => [],
  getLocalRelationships = () => [],
  getLocalOrganizations = () => [],
  saveLocalOrganizations = () => {},
  getLocalLocations = () => [],
  saveLocalLocations = () => {},
  getLocalLocationVisits = () => [],
  saveLocalLocationVisits = () => {},
  getLocalWorkspaces = () => [],
  saveLocalWorkspaces = () => {},
  getLocalWorkspaceMembers = () => [],
  saveLocalWorkspaceMembers = () => {},
  getLocalWorkspaceInvitations = () => [],
  saveLocalWorkspaceInvitations = () => {},
  getLocalEventAttendees = () => [],
  saveLocalEventAttendees = () => {},
  getLocalEventResources = () => [],
  saveLocalEventResources = () => {},
  getLocalEventAgenda = () => [],
  saveLocalEventAgenda = () => {},
  getLocalOrgContacts = () => [],
  saveLocalOrgContacts = () => {},
  getLocalOrgDepartments = () => [],
  saveLocalOrgDepartments = () => {},
  getLocalTaskChecklist = () => [],
  saveLocalTaskChecklist = () => {},
  getLocalTaskTimeEntries = () => [],
  saveLocalTaskTimeEntries = () => {},
  getLocalCalendarEvents = () => [],
  saveLocalCalendarEvents = () => {},
} = _devSeed;
const { mockMetadata = null } = _devContacts;
import { createActivity, ACTIVITY_TYPES, sortActivitiesByDate } from './activities';
import { log } from './logger';

export { ACTIVITY_TYPES };

export const isDevMode = () => import.meta.env.VITE_DEV_MODE === 'true';

/**
 * Generic helper: Generate ID for production mode
 * Finds the highest existing ID and increments it
 */
function generateID(data, idField, prefix) {
  if (data.length === 0) return `${prefix}001`;
  const maxId = Math.max(
    ...data.map((item) => {
      const id = item[idField] || '';
      const numPart = id.replace(prefix, '');
      return parseInt(numPart, 10) || 0;
    })
  );
  return `${prefix}${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * Generic helper: Append data to sheet in production mode
 */
async function appendSheetData(accessToken, sheetId, sheetName, data) {
  return await sheetsModule.appendData(accessToken, sheetId, sheetName, data);
}

/**
 * Generic helper: Update sheet row in production mode
 */
async function updateSheetRow(accessToken, sheetId, sheetName, idField, idValue, updatedData) {
  const allData = await sheetsModule.readSheetData(accessToken, sheetId, sheetName);
  const rowIndex = allData.data.findIndex((row) => row[idField] === idValue);
  if (rowIndex === -1) {
    throw new Error(`${sheetName} row with ${idField}=${idValue} not found`);
  }
  const sheetRowIndex = allData.data[rowIndex]._rowIndex;
  return await sheetsModule.updateData(accessToken, sheetId, sheetName, sheetRowIndex, updatedData);
}

/**
 * Generic helper: Delete sheet row in production mode
 */
async function deleteSheetRow(accessToken, sheetId, sheetName, idField, idValue) {
  const allData = await sheetsModule.readSheetData(accessToken, sheetId, sheetName);
  const rowIndex = allData.data.findIndex((row) => row[idField] === idValue);
  if (rowIndex === -1) {
    throw new Error(`${sheetName} row with ${idField}=${idValue} not found`);
  }
  const sheetRowIndex = allData.data[rowIndex]._rowIndex;
  return await sheetsModule.deleteData(accessToken, sheetId, sheetName, sheetRowIndex);
}

/**
 * WRAPPER: readSheetMetadata
 * Returns mock metadata in dev mode, real metadata in production
 */
export const readSheetMetadata = (function () {
  const originalFn = sheetsModule.readSheetMetadata;
  return async function readSheetMetadata(
    accessToken,
    sheetId,
    sheetName,
    refreshTokenCallback = null
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Using mock metadata for sheet:', sheetName);
      return mockMetadata;
    }
    return originalFn(accessToken, sheetId, sheetName, refreshTokenCallback);
  };
})();

/**
 * WRAPPER: readSheetData
 * Reads from localStorage in dev mode, IndexedDB cache → Google Sheets in production
 */
export const readSheetData = (function () {
  const originalFn = sheetsModule.readSheetData;
  return async function readSheetData(
    accessToken,
    sheetId,
    sheetName,
    refreshTokenCallback = null
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Reading from localStorage:', sheetName);

      let data;
      const { SHEETS } = sheetsModule;

      if (sheetName === SHEETS.CONTACTS || sheetName === 'Contacts') {
        data = getLocalContacts();
      } else if (sheetName === SHEETS.TOUCHPOINTS || sheetName === 'Touchpoints') {
        data = getLocalTouchpoints();
      } else if (sheetName === SHEETS.EVENTS || sheetName === 'Events') {
        data = getLocalEvents();
      } else if (sheetName === SHEETS.LISTS || sheetName === 'Lists') {
        data = getLocalLists();
      } else if (sheetName === SHEETS.CONTACT_LISTS || sheetName === 'Contact Lists') {
        data = getLocalContactLists();
      } else if (sheetName === SHEETS.NOTES || sheetName === 'Notes') {
        data = getLocalNotes();
      } else if (sheetName === SHEETS.CONTACT_NOTES || sheetName === 'Contact Notes') {
        data = getLocalContactNotes();
      } else if (sheetName === SHEETS.EVENT_NOTES || sheetName === 'Event Notes') {
        data = getLocalEventNotes();
      } else if (sheetName === SHEETS.LIST_NOTES || sheetName === 'List Notes') {
        data = getLocalListNotes();
      } else if (sheetName === SHEETS.TASK_NOTES || sheetName === 'Task Notes') {
        data = getLocalTaskNotes();
      } else if (sheetName === 'Contact Relationships') {
        data = getLocalRelationships();
      } else if (sheetName === 'Organizations') {
        data = getLocalOrganizations();
      } else if (sheetName === 'Locations') {
        data = getLocalLocations();
      } else if (sheetName === 'Location Visits') {
        data = getLocalLocationVisits();
      } else {
        data = [];
      }

      const headers =
        data.length > 0
          ? Object.keys(data[0]).filter((key) => key !== '__TEST_DATA__' && key !== '_rowIndex')
          : mockMetadata.headers.map((h) => h.name);

      return { headers, data };
    }

    // PRODUCTION MODE with IndexedDB cache

    // Step 1: Check cache
    const cached = await getCachedData(sheetName);
    if (cached) {
      return cached;
    }

    // Step 2: Cache miss - fetch from API
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, sheetName, refreshTokenCallback);
    const duration = Date.now() - startTime;

    // Record API call for monitoring
    monitoringService.recordApiCall('read', sheetName, duration);

    // Step 3: Update cache
    await setCachedData(sheetName, result);

    return result;
  };
})();

/**
 * WRAPPER: generateContactID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export const generateContactID = (function () {
  const originalFn = sheetsModule.generateContactID;
  return async function generateContactID(accessToken, sheetId) {
    if (isDevMode()) {
      log('[DEV MODE] Generating contact ID from localStorage');
      const contacts = getLocalContacts();
      if (contacts.length === 0) return 'C001';

      const ids = contacts
        .map((row) => row['Contact ID'])
        .filter((id) => id && id.startsWith('C'))
        .map((id) => parseInt(id.substring(1), 10))
        .filter((num) => !isNaN(num));

      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      return `C${String(maxId + 1).padStart(3, '0')}`;
    }
    return originalFn(accessToken, sheetId);
  };
})();

/**
 * WRAPPER: generateTouchpointID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export const generateTouchpointID = (function () {
  const originalFn = sheetsModule.generateTouchpointID;
  return async function generateTouchpointID(accessToken, sheetId) {
    if (isDevMode()) {
      log('[DEV MODE] Generating touchpoint ID from localStorage');
      const touchpoints = getLocalTouchpoints();
      if (touchpoints.length === 0) return 'T001';

      const ids = touchpoints
        .map((row) => row['Touchpoint ID'])
        .filter((id) => id && id.startsWith('T'))
        .map((id) => parseInt(id.substring(1), 10))
        .filter((num) => !isNaN(num));

      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      return `T${String(maxId + 1).padStart(3, '0')}`;
    }
    return originalFn(accessToken, sheetId);
  };
})();

/**
 * WRAPPER: addContact
 * Adds to localStorage in dev mode, Google Sheets in production
 */
export const addContact = (function () {
  const originalFn = sheetsModule.addContact;
  return async function addContact(accessToken, sheetId, contactData, userEmail) {
    if (isDevMode()) {
      log('[DEV MODE] Adding contact to localStorage:', contactData);

      const contacts = getLocalContacts();
      const contactId = await generateContactID(accessToken, sheetId);
      const dateAdded = new Date().toISOString().split('T')[0];

      const newContact = {
        'Contact ID': contactId,
        'Date Added': dateAdded,
        'Last Contact Date': '',
        ...contactData,
      };

      contacts.push(newContact);
      saveLocalContacts(contacts);
      return { contactId, ...newContact };
    }

    // Production mode: Call API then invalidate cache
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, contactData, userEmail);
    const duration = Date.now() - startTime;

    // Record API call for monitoring
    monitoringService.recordApiCall('write', SHEET_NAMES.CONTACTS, duration);

    await invalidateCache(SHEET_NAMES.CONTACTS);
    return result;
  };
})();

/**
 * WRAPPER: updateContact
 * Updates localStorage in dev mode, Google Sheets in production
 */
export const updateContact = (function () {
  const originalFn = sheetsModule.updateContact;
  return async function updateContact(
    accessToken,
    sheetId,
    contactId,
    oldData,
    newData,
    userEmail
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Updating contact in localStorage:', contactId);

      const contacts = getLocalContacts();
      const index = contacts.findIndex((c) => c['Contact ID'] === contactId);

      if (index === -1) {
        throw new Error('Contact not found');
      }

      contacts[index] = {
        ...contacts[index],
        ...newData,
        'Contact ID': contactId,
        'Date Added': contacts[index]['Date Added'],
      };

      saveLocalContacts(contacts);
      return { contactId, ...contacts[index] };
    }

    // Production mode: Call API then invalidate cache
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, contactId, oldData, newData, userEmail);
    const duration = Date.now() - startTime;

    // Record API call for monitoring
    monitoringService.recordApiCall('write', SHEET_NAMES.CONTACTS, duration);

    await invalidateCache(SHEET_NAMES.CONTACTS);
    return result;
  };
})();

/**
 * WRAPPER: generateOrganizationID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export const generateOrganizationID = async function generateOrganizationID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating organization ID from localStorage');
    const organizations = getLocalOrganizations();
    if (organizations.length === 0) return 'ORG001';

    const ids = organizations
      .map((row) => row['Organization ID'])
      .filter((id) => id && id.startsWith('ORG'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `ORG${String(maxId + 1).padStart(3, '0')}`;
  }
  // In production, this would call the sheets API
  const { generateOrganizationID } = await import('../services/organizationService');
  return generateOrganizationID(accessToken, sheetId);
};

/**
 * WRAPPER: addOrganization
 * Adds to localStorage in dev mode, Google Sheets in production
 */
export const addOrganization = async function addOrganization(
  accessToken,
  sheetId,
  organizationData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Adding organization to localStorage:', organizationData);

    const organizations = getLocalOrganizations();
    const organizationId = await generateOrganizationID(accessToken, sheetId);
    const dateAdded = new Date().toISOString().split('T')[0];

    const newOrganization = {
      'Organization ID': organizationId,
      'Date Added': dateAdded,
      'Last Contact Date': '',
      'Created By': userEmail,
      'Last Updated': dateAdded,
      ...organizationData,
    };

    organizations.push(newOrganization);
    saveLocalOrganizations(organizations);
    return { organizationId, ...newOrganization };
  }
  // In production, call the real service and invalidate cache
  const { createOrganization } = await import('../services/organizationService');
  const startTime = Date.now();
  const result = await createOrganization(accessToken, sheetId, organizationData, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.ORGANIZATIONS, duration);
  await invalidateCache(SHEET_NAMES.ORGANIZATIONS);
  return result;
};

/**
 * WRAPPER: updateOrganization
 * Updates localStorage in dev mode, Google Sheets in production
 */
export const updateOrganization = async function updateOrganization(
  accessToken,
  sheetId,
  orgId,
  oldData,
  newData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Updating organization in localStorage:', orgId);

    const organizations = getLocalOrganizations();
    const index = organizations.findIndex((o) => o['Organization ID'] === orgId);

    if (index === -1) {
      throw new Error('Organization not found');
    }

    const lastUpdated = new Date().toISOString().split('T')[0];

    organizations[index] = {
      ...organizations[index],
      ...newData,
      'Organization ID': orgId,
      'Date Added': organizations[index]['Date Added'],
      'Last Updated': lastUpdated,
    };

    saveLocalOrganizations(organizations);
    return { organizationId: orgId, ...organizations[index] };
  }
  // In production, call the real service and invalidate cache
  const { updateOrganization } = await import('../services/organizationService');
  const startTime = Date.now();
  const result = await updateOrganization(accessToken, sheetId, orgId, oldData, newData, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.ORGANIZATIONS, duration);
  await invalidateCache(SHEET_NAMES.ORGANIZATIONS);
  return result;
};

/**
 * WRAPPER: deleteOrganization
 * Deletes from localStorage in dev mode, Google Sheets in production
 */
export const deleteOrganization = async function deleteOrganization(
  accessToken,
  sheetId,
  orgId,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting organization from localStorage:', orgId);

    const organizations = getLocalOrganizations();
    const filtered = organizations.filter((o) => o['Organization ID'] !== orgId);

    if (filtered.length === organizations.length) {
      throw new Error('Organization not found');
    }

    saveLocalOrganizations(filtered);
    return { success: true, organizationId: orgId };
  }
  // In production, call the real service and invalidate cache
  const { deleteOrganization } = await import('../services/organizationService');
  const startTime = Date.now();
  const result = await deleteOrganization(accessToken, sheetId, orgId, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.ORGANIZATIONS, duration);
  await invalidateCache(SHEET_NAMES.ORGANIZATIONS);
  return result;
};

/**
 * WRAPPER: generateLocationID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export const generateLocationID = async function generateLocationID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating location ID from localStorage');
    const locations = getLocalLocations();
    if (locations.length === 0) return 'LOC001';

    const ids = locations
      .map((row) => row['Location ID'])
      .filter((id) => id && id.startsWith('LOC'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `LOC${String(maxId + 1).padStart(3, '0')}`;
  }
  const { generateLocationID } = await import('../services/locationService');
  return generateLocationID(accessToken, sheetId);
};

/**
 * WRAPPER: addLocation
 * Adds to localStorage in dev mode, Google Sheets in production
 */
export const addLocation = async function addLocation(
  accessToken,
  sheetId,
  locationData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Adding location to localStorage:', locationData);

    const locations = getLocalLocations();
    const locationId = await generateLocationID(accessToken, sheetId);
    const dateAdded = new Date().toISOString().split('T')[0];

    const newLocation = {
      'Location ID': locationId,
      'Date Added': dateAdded,
      'Last Contact Date': '',
      'Created By': userEmail,
      'Last Updated': dateAdded,
      ...locationData,
    };

    locations.push(newLocation);
    saveLocalLocations(locations);
    return { locationId, ...newLocation };
  }
  const { createLocation } = await import('../services/locationService');
  const startTime = Date.now();
  const result = await createLocation(accessToken, sheetId, locationData, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.LOCATIONS, duration);
  await invalidateCache(SHEET_NAMES.LOCATIONS);
  return result;
};

/**
 * WRAPPER: updateLocation
 * Updates localStorage in dev mode, Google Sheets in production
 */
export const updateLocation = async function updateLocation(
  accessToken,
  sheetId,
  locId,
  oldData,
  newData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Updating location in localStorage:', locId);

    const locations = getLocalLocations();
    const index = locations.findIndex((l) => l['Location ID'] === locId);

    if (index === -1) {
      throw new Error('Location not found');
    }

    const lastUpdated = new Date().toISOString().split('T')[0];

    locations[index] = {
      ...locations[index],
      ...newData,
      'Location ID': locId,
      'Date Added': locations[index]['Date Added'],
      'Last Updated': lastUpdated,
    };

    saveLocalLocations(locations);
    return { locationId: locId, ...locations[index] };
  }
  const { updateLocation } = await import('../services/locationService');
  const startTime = Date.now();
  const result = await updateLocation(accessToken, sheetId, locId, oldData, newData, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.LOCATIONS, duration);
  await invalidateCache(SHEET_NAMES.LOCATIONS);
  return result;
};

/**
 * WRAPPER: deleteLocation
 * Deletes from localStorage in dev mode, Google Sheets in production
 */
export const deleteLocation = async function deleteLocation(
  accessToken,
  sheetId,
  locId,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting location from localStorage:', locId);

    const locations = getLocalLocations();
    const filtered = locations.filter((l) => l['Location ID'] !== locId);

    if (filtered.length === locations.length) {
      throw new Error('Location not found');
    }

    saveLocalLocations(filtered);
    return { success: true, locationId: locId };
  }
  const { deleteLocation } = await import('../services/locationService');
  const startTime = Date.now();
  const result = await deleteLocation(accessToken, sheetId, locId, userEmail);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.LOCATIONS, duration);
  await invalidateCache(SHEET_NAMES.LOCATIONS);
  return result;
};

/**
 * WRAPPER: logLocationVisit
 * Logs visit to localStorage in dev mode, Google Sheets in production
 */
export const logLocationVisit = async function logLocationVisit(
  accessToken,
  sheetId,
  visitData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Logging location visit to localStorage:', visitData);

    const visits = getLocalLocationVisits();
    const maxId = visits.reduce((max, v) => {
      const num = parseInt((v['Visit ID'] || '').replace('VIS', ''), 10) || 0;
      return Math.max(max, num);
    }, 0);
    const visitId = `VIS${String(maxId + 1).padStart(3, '0')}`;
    const createdDate = new Date().toISOString().split('T')[0];

    const newVisit = {
      'Visit ID': visitId,
      'Created By': userEmail,
      'Created Date': createdDate,
      ...visitData,
    };

    visits.push(newVisit);
    saveLocalLocationVisits(visits);
    return { visitId, ...newVisit };
  }
  const { logLocationVisit } = await import('../services/locationVisitService');
  return logLocationVisit(accessToken, sheetId, visitData, userEmail);
};

/**
 * WRAPPER: getLocationVisits
 * Gets visits from localStorage in dev mode, Google Sheets in production
 */
export const getLocationVisits = async function getLocationVisits(
  accessToken,
  sheetId,
  locationId
) {
  if (isDevMode()) {
    log('[DEV MODE] Getting location visits from localStorage:', locationId);
    const visits = getLocalLocationVisits();
    return visits
      .filter((v) => v['Location ID'] === locationId)
      .sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''));
  }
  const { getLocationVisits } = await import('../services/locationVisitService');
  return getLocationVisits(accessToken, sheetId, locationId);
};

/**
 * WRAPPER: appendRow
 * Appends to localStorage in dev mode, Google Sheets in production
 */
export const appendRow = (function () {
  const originalFn = sheetsModule.appendRow;
  return async function appendRow(accessToken, sheetId, sheetName, values) {
    if (isDevMode()) {
      log('[DEV MODE] Appending row to localStorage:', sheetName);

      const { SHEETS } = sheetsModule;

      if (sheetName === SHEETS.CONTACTS || sheetName === 'Contacts') {
        const contacts = getLocalContacts();
        const headers = mockMetadata.headers.map((h) => h.name);
        const newContact = {};

        headers.forEach((header, index) => {
          newContact[header] = values[index] || '';
        });

        contacts.push(newContact);
        saveLocalContacts(contacts);
      } else if (sheetName === SHEETS.TOUCHPOINTS || sheetName === 'Touchpoints') {
        const touchpoints = getLocalTouchpoints();
        const headers = mockMetadata.headers.map((h) => h.name);
        const newTouchpoint = {};

        headers.forEach((header, index) => {
          newTouchpoint[header] = values[index] || '';
        });

        touchpoints.push(newTouchpoint);
        saveLocalTouchpoints(touchpoints);
      }

      return { success: true };
    }
    return originalFn(accessToken, sheetId, sheetName, values);
  };
})();

/**
 * WRAPPER: addTouchpoint
 * Adds to localStorage in dev mode, Google Sheets in production
 */
export const addTouchpoint = (function () {
  const originalFn = sheetsModule.addTouchpoint;
  return async function addTouchpoint(accessToken, sheetId, touchpointData, userEmail) {
    if (isDevMode()) {
      log('[DEV MODE] Adding touchpoint to localStorage');

      const touchpoints = getLocalTouchpoints();
      const touchpointId = await generateTouchpointID(accessToken, sheetId);

      const newTouchpoint = {
        'Touchpoint ID': touchpointId,
        ...touchpointData,
        Date: touchpointData['Date'] || new Date().toISOString().split('T')[0],
      };

      touchpoints.push(newTouchpoint);
      saveLocalTouchpoints(touchpoints);

      // Update contact's Last Contact Date
      const contactId = touchpointData['Contact ID'];
      if (contactId) {
        const contacts = getLocalContacts();
        const contact = contacts.find((c) => c['Contact ID'] === contactId);
        if (contact) {
          contact['Last Contact Date'] = newTouchpoint['Date'];
          saveLocalContacts(contacts);
        }
      }

      return { touchpointId, ...newTouchpoint };
    }

    // Production mode: Call API then invalidate cache
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, touchpointData, userEmail);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.TOUCHPOINTS, duration);
    await invalidateCache(SHEET_NAMES.TOUCHPOINTS);
    await invalidateCache(SHEET_NAMES.CONTACTS); // Also invalidate contacts (Last Contact Date may change)
    return result;
  };
})();

/**
 * WRAPPER: updateTouchpoint
 * Updates localStorage in dev mode, Google Sheets in production
 */
export const updateTouchpoint = (function () {
  const originalFn = sheetsModule.updateTouchpoint;
  return async function updateTouchpoint(
    accessToken,
    sheetId,
    touchpointId,
    oldData,
    newData,
    userEmail
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Updating touchpoint in localStorage:', touchpointId);

      const touchpoints = getLocalTouchpoints();
      const index = touchpoints.findIndex((t) => t['Touchpoint ID'] === touchpointId);

      if (index === -1) {
        throw new Error('Touchpoint not found');
      }

      touchpoints[index] = {
        ...touchpoints[index],
        ...newData,
        'Touchpoint ID': touchpointId,
      };

      saveLocalTouchpoints(touchpoints);
      return { touchpointId, ...touchpoints[index] };
    }

    // Production mode: Call API then invalidate cache
    const startTime = Date.now();
    const result = await originalFn(
      accessToken,
      sheetId,
      touchpointId,
      oldData,
      newData,
      userEmail
    );
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.TOUCHPOINTS, duration);
    await invalidateCache(SHEET_NAMES.TOUCHPOINTS);
    await invalidateCache(SHEET_NAMES.CONTACTS); // Also invalidate contacts (Last Contact Date may change)
    return result;
  };
})();

/**
 * WRAPPER: deleteTouchpoint
 * Deletes a touchpoint from localStorage in dev mode, Google Sheets in production
 */
export async function deleteTouchpoint(accessToken, sheetId, touchpointId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting touchpoint:', touchpointId);

    const touchpoints = getLocalTouchpoints();
    const filtered = touchpoints.filter((t) => t['Touchpoint ID'] !== touchpointId);

    saveLocalTouchpoints(filtered);
    return { success: true, touchpointId };
  }

  // Production mode: Delete from Google Sheets
  const startTime = Date.now();
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.TOUCHPOINTS);

  const touchpoint = data.find((t) => t['Touchpoint ID'] === touchpointId);
  if (!touchpoint) throw new Error(`Touchpoint ${touchpointId} not found`);

  const rowIndex = touchpoint._rowIndex;

  const internalSheetId = await sheetsModule.getSheetIdByName(accessToken, sheetId, SHEET_NAMES.TOUCHPOINTS);

  const axios = (await import('axios')).default;
  const { API_CONFIG } = await import('../config/constants');

  await axios.post(
    `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: internalSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.TOUCHPOINTS, duration);
  await invalidateCache(SHEET_NAMES.TOUCHPOINTS);
  return { success: true, touchpointId };
}

/**
 * WRAPPER: getContactTouchpoints
 * Reads from localStorage in dev mode, Google Sheets in production
 */
export const getContactTouchpoints = (function () {
  const originalFn = sheetsModule.getContactTouchpoints;
  return async function getContactTouchpoints(accessToken, sheetId, contactId) {
    if (isDevMode()) {
      log('[DEV MODE] Getting touchpoints for contact:', contactId);
      const touchpoints = getLocalTouchpoints();
      return touchpoints.filter((t) => t['Contact ID'] === contactId);
    }
    return originalFn(accessToken, sheetId, contactId);
  };
})();

/**
 * WRAPPER: detectDuplicates
 * Searches localStorage in dev mode, Google Sheets in production
 */
export const detectDuplicates = (function () {
  const originalFn = sheetsModule.detectDuplicates;
  return async function detectDuplicates(accessToken, sheetId, contactData) {
    if (isDevMode()) {
      log('[DEV MODE] Detecting duplicates in localStorage');
      const contacts = getLocalContacts();
      const duplicates = [];

      const newName = (contactData['Name'] || '').toLowerCase().trim();
      const newPhones = (contactData['Phone'] || '')
        .split(',')
        .map((p) => p.trim().replace(/\D/g, ''))
        .filter(Boolean);
      const newEmails = (contactData['Email'] || '')
        .split(',')
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean);

      for (const existing of contacts) {
        const matchReasons = [];

        const existingName = (existing['Name'] || '').toLowerCase().trim();
        if (newName && existingName === newName) {
          matchReasons.push('name');
        }

        const existingPhones = (existing['Phone'] || '')
          .split(',')
          .map((p) => p.trim().replace(/\D/g, ''))
          .filter(Boolean);
        for (const phone of newPhones) {
          if (existingPhones.includes(phone)) {
            matchReasons.push('phone');
            break;
          }
        }

        const existingEmails = (existing['Email'] || '')
          .split(',')
          .map((e) => e.toLowerCase().trim())
          .filter(Boolean);
        for (const email of newEmails) {
          if (existingEmails.includes(email)) {
            matchReasons.push('email');
            break;
          }
        }

        if (matchReasons.length > 0) {
          duplicates.push({
            existing,
            matchReasons,
          });
        }
      }

      return duplicates;
    }
    return originalFn(accessToken, sheetId, contactData);
  };
})();

/**
 * WRAPPER: generateEventID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export const generateEventID = (function () {
  const originalFn = sheetsModule.generateEventID;
  return async function generateEventID(accessToken, sheetId) {
    if (isDevMode()) {
      log('[DEV MODE] Generating event ID from localStorage');
      const events = getLocalEvents();

      if (events.length === 0) return 'EVT001';

      const ids = events
        .map((e) => e['Event ID'])
        .filter((id) => id && id.match(/^EVT\d+$/))
        .map((id) => parseInt(id.substring(3)));

      const maxId = Math.max(...ids, 0);
      return `EVT${String(maxId + 1).padStart(3, '0')}`;
    }
    return originalFn(accessToken, sheetId);
  };
})();

/**
 * WRAPPER: generateNoteID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export async function generateNoteID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating note ID from localStorage');
    const notes = getLocalNotes();

    if (notes.length === 0) return 'N001';

    const ids = notes
      .map((n) => n['Note ID'])
      .filter((id) => id && id.match(/^N\d+$/))
      .map((id) => parseInt(id.substring(1)));

    const maxId = Math.max(...ids, 0);
    return `N${String(maxId + 1).padStart(3, '0')}`;
  }

  // Production mode: Generate from Google Sheets
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.NOTES);

  if (data.length === 0) return 'N001';

  const ids = data
    .map((n) => n['Note ID'])
    .filter((id) => id && id.match(/^N\d+$/))
    .map((id) => parseInt(id.substring(1)));

  const maxId = Math.max(...ids, 0);
  return `N${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * WRAPPER: addEvent
 * Adds to localStorage in dev mode, Google Sheets in production
 */
export const addEvent = (function () {
  const originalFn = sheetsModule.addEvent;
  return async function addEvent(accessToken, sheetId, eventData, refreshTokenCallback = null) {
    if (isDevMode()) {
      log('[DEV MODE] Adding event to localStorage:', eventData);

      const events = getLocalEvents();
      const eventId = await generateEventID(accessToken, sheetId);
      const eventCreatedDate = new Date().toISOString().split('T')[0];

      const newEvent = {
        'Event ID': eventId,
        'Event Created Date': eventCreatedDate,
        ...eventData,
      };

      events.push(newEvent);
      saveLocalEvents(events);
      return { eventId, ...newEvent };
    }

    // Production mode: Call API then invalidate cache
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, eventData, refreshTokenCallback);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.EVENTS, duration);
    await invalidateCache(SHEET_NAMES.EVENTS);
    return result;
  };
})();

/**
 * WRAPPER: updateEvent
 * Updates an event in localStorage in dev mode, Google Sheets in production
 */
export async function updateEvent(accessToken, sheetId, eventId, eventData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating event:', eventId, eventData);

    const events = getLocalEvents();
    const index = events.findIndex((e) => e['Event ID'] === eventId);

    if (index === -1) {
      throw new Error(`Event ${eventId} not found`);
    }

    events[index] = {
      ...events[index],
      ...eventData,
      'Event ID': eventId,
      'Event Created Date': events[index]['Event Created Date'],
    };

    saveLocalEvents(events);
    return events[index];
  }

  // Production mode: Update in Google Sheets
  const { headers } = await sheetsModule.readSheetMetadata(accessToken, sheetId, SHEET_NAMES.EVENTS);
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS);

  const event = data.find((e) => e['Event ID'] === eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  const rowIndex = event._rowIndex;

  const updatedEvent = {
    ...event,
    ...eventData,
    'Event ID': eventId,
    'Event Created Date': event['Event Created Date'],
  };

  const values = headers.map((h) => {
    const fieldName = h.name;
    return updatedEvent[fieldName] || '';
  });

  const startTime = Date.now();
  await sheetsModule.updateRow(accessToken, sheetId, 'Events', rowIndex, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.EVENTS, duration);
  await invalidateCache(SHEET_NAMES.EVENTS);
  return updatedEvent;
}

/**
 * WRAPPER: deleteEvent
 * Deletes an event from localStorage in dev mode, Google Sheets in production
 */
export async function deleteEvent(accessToken, sheetId, eventId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting event:', eventId);

    const events = getLocalEvents();
    const filtered = events.filter((e) => e['Event ID'] !== eventId);

    saveLocalEvents(filtered);
    return { success: true, eventId };
  }

  // Production mode: Delete from Google Sheets
  const startTime = Date.now();
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS);

  const event = data.find((e) => e['Event ID'] === eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  const rowIndex = event._rowIndex;

  const internalSheetId = await sheetsModule.getSheetIdByName(accessToken, sheetId, SHEET_NAMES.EVENTS);

  const axios = (await import('axios')).default;
  const { API_CONFIG } = await import('../config/constants');

  await axios.post(
    `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: internalSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.EVENTS, duration);
  await invalidateCache(SHEET_NAMES.EVENTS);
  return { success: true, eventId };
}

/**
 * WRAPPER: copyContactToWorkspace
 * Copy a contact from one sheet to another with sync link support
 * @param {string} accessToken - Google access token
 * @param {string} sourceSheetId - Source Google Sheet ID
 * @param {string} sourceContactId - Contact ID in source sheet
 * @param {string} targetSheetId - Target Google Sheet ID
 * @param {string} userEmail - Email of user copying contact
 * @param {object} linkConfig - Optional: { createLink: bool, syncStrategy: string, customFields: array, sourceWorkspace: {}, targetWorkspace: {} }
 * @returns {Promise<object>} Copied contact with new ID
 */
export const copyContactToWorkspace = (function () {
  const originalFn = sheetsModule.copyContactToWorkspace;
  return async function copyContactToWorkspace(
    accessToken,
    sourceSheetId,
    sourceContactId,
    targetSheetId,
    userEmail,
    linkConfig = null
  ) {
    if (isDevMode()) {
      log(
        '[DEV MODE] Copying contact',
        sourceContactId,
        'from',
        sourceSheetId,
        'to',
        targetSheetId
      );

      const { getLocalContacts, saveLocalContacts } =
        await import('../__tests__/fixtures/seedTestData');

      // In dev mode, both sheets use the same localStorage
      const allContacts = getLocalContacts();
      const sourceContact = allContacts.find((c) => c['Contact ID'] === sourceContactId);

      if (!sourceContact) {
        throw new Error(`Contact ${sourceContactId} not found in source sheet`);
      }

      // Generate new contact ID for the copy using max-ID pattern
      const existingContacts = getLocalContacts();
      const maxId = existingContacts.reduce((max, c) => {
        const num = parseInt((c['Contact ID'] || '').replace('C', ''), 10) || 0;
        return Math.max(max, num);
      }, 0);
      const newContactId = `C${String(maxId + 1).padStart(3, '0')}`;
      const dateAdded = new Date().toISOString().split('T')[0];

      // Determine which fields to copy based on sync strategy
      let fieldsToInclude = Object.keys(sourceContact);
      if (linkConfig && linkConfig.syncStrategy) {
        const CORE_FIELDS = ['Name', 'Phone', 'Email'];
        if (linkConfig.syncStrategy === 'core_fields_only') {
          fieldsToInclude = ['Contact ID', 'Date Added', 'Last Contact Date', ...CORE_FIELDS];
        } else if (linkConfig.syncStrategy === 'custom') {
          fieldsToInclude = [
            'Contact ID',
            'Date Added',
            'Last Contact Date',
            ...(linkConfig.customFields || []),
          ];
        }
        // 'all_fields' uses all keys by default
      }

      const copiedContact = {};
      fieldsToInclude.forEach((field) => {
        if (field in sourceContact) {
          copiedContact[field] = sourceContact[field];
        }
      });

      // Override system fields
      copiedContact['Contact ID'] = newContactId;
      copiedContact['Date Added'] = dateAdded;
      copiedContact['Last Contact Date'] = '';

      allContacts.push(copiedContact);
      saveLocalContacts(allContacts);

      // Create sync link if requested
      if (linkConfig && linkConfig.createLink) {
        const { createContactLink } = await import('../services/contactLinkService');
        await createContactLink(
          {
            type: linkConfig.sourceWorkspace.type,
            id: linkConfig.sourceWorkspace.id,
            sheetId: sourceSheetId,
            contactId: sourceContactId,
          },
          {
            type: linkConfig.targetWorkspace.type,
            id: linkConfig.targetWorkspace.id,
            sheetId: targetSheetId,
            contactId: newContactId,
          },
          linkConfig.syncStrategy || 'core_fields_only',
          linkConfig.customFields || [],
          userEmail
        );
      }

      return { contactId: newContactId, ...copiedContact };
    }
    return originalFn(
      accessToken,
      sourceSheetId,
      sourceContactId,
      targetSheetId,
      userEmail,
      linkConfig
    );
  };
})();

/**
 * WRAPPER: copyMultipleContacts
 * Copy multiple contacts from one sheet to another (batch operation)
 */
export const copyMultipleContacts = (function () {
  const originalFn = sheetsModule.copyMultipleContacts;
  return async function copyMultipleContacts(
    accessToken,
    sourceSheetId,
    contactIds,
    targetSheetId,
    userEmail
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Copying', contactIds.length, 'contacts');
      const results = [];

      for (const contactId of contactIds) {
        try {
          const result = await copyContactToWorkspace(
            accessToken,
            sourceSheetId,
            contactId,
            targetSheetId,
            userEmail
          );
          results.push({ success: true, contactId, result });
        } catch (error) {
          results.push({ success: false, contactId, error: error.message });
        }
      }

      return results;
    }
    return originalFn(accessToken, sourceSheetId, contactIds, targetSheetId, userEmail);
  };
})();

/**
 * WRAPPER: logActivity
 * Logs an activity for a contact
 * In production mode, activity logging is optional - if Activities sheet doesn't exist, this silently succeeds
 */
export async function logActivity(contactId, activityType, description, metadata = {}) {
  if (isDevMode()) {
    log('[DEV MODE] Logging activity for contact:', contactId, activityType);

    const activity = createActivity(contactId, activityType, description, metadata);
    const activities = getLocalActivities();
    activities.push(activity);
    saveLocalActivities(activities);

    return activity;
  }

  // Production mode: Activity logging is optional
  // If Activities sheet doesn't exist or we can't access it, we just skip it
  log('[PRODUCTION] Activity logging is dev-mode only feature - skipped in production');
  return null;
}

/**
 * WRAPPER: getContactActivities
 * Gets all activities for a specific contact
 * In production mode, returns empty array (activities are dev-mode only)
 */
export async function getContactActivities(contactId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting activities for contact:', contactId);
    const activities = getLocalContactActivities(contactId);
    return sortActivitiesByDate(activities);
  }

  // Production mode: Activities are dev-mode only feature
  log('[PRODUCTION] Activity retrieval is dev-mode only feature - returning empty array');
  return [];
}

/**
 * WRAPPER: batchUpdateContacts
 * Updates multiple contacts with the same field values
 */
export async function batchUpdateContacts(accessToken, sheetId, contactIds, updateData) {
  if (isDevMode()) {
    log('[DEV MODE] Batch updating', contactIds.length, 'contacts:', updateData);

    const contacts = getLocalContacts();
    let updatedCount = 0;

    contactIds.forEach((contactId) => {
      const index = contacts.findIndex((c) => c['Contact ID'] === contactId);
      if (index !== -1) {
        contacts[index] = {
          ...contacts[index],
          ...updateData,
          'Contact ID': contactId,
          'Date Added': contacts[index]['Date Added'],
        };
        updatedCount++;
      }
    });

    saveLocalContacts(contacts);
    return {
      success: true,
      updatedCount,
      totalCount: contactIds.length,
    };
  }

  // In production, would use Google Sheets API batch update
  log('[PRODUCTION] Batch update not yet implemented for production');
  throw new Error('Batch update not yet implemented for production');
}

/**
 * WRAPPER: addList
 * Adds a new list to the Lists sheet
 */
export async function addList(accessToken, sheetId, listData) {
  if (isDevMode()) {
    log('[DEV MODE] Adding list to localStorage:', listData);

    const lists = getLocalLists();
    // Generate LST-prefixed ID
    const existingIds = lists
      .map((l) => l['List ID'])
      .filter((id) => id && id.match(/^LST\d+$/))
      .map((id) => parseInt(id.substring(3)));
    const maxId = Math.max(...existingIds, 0);
    const listId = `LST${String(maxId + 1).padStart(3, '0')}`;
    const createdDate = new Date().toISOString().split('T')[0];

    const newList = {
      'List ID': listId,
      'List Created Date': createdDate,
      ...listData,
    };

    lists.push(newList);
    saveLocalLists(lists);
    return { listId, ...newList };
  }

  // Production mode: Add to Google Sheets
  const startTime = Date.now();
  const result = await sheetsModule.addList(accessToken, sheetId, listData);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.LISTS, duration);
  await invalidateCache(SHEET_NAMES.LISTS);
  return result;
}

/**
 * WRAPPER: updateList
 * Updates an existing list
 */
export async function updateList(accessToken, sheetId, listId, listData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating list:', listId, listData);

    const lists = getLocalLists();
    const index = lists.findIndex((l) => l['List ID'] === listId);

    if (index === -1) {
      throw new Error(`List ${listId} not found`);
    }

    lists[index] = {
      ...lists[index],
      ...listData,
      'List ID': listId,
      'List Created Date': lists[index]['List Created Date'],
    };

    saveLocalLists(lists);
    return lists[index];
  }

  // Production mode: Update in Google Sheets
  const startTime = Date.now();
  const result = await sheetsModule.updateList(accessToken, sheetId, listId, listData);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.LISTS, duration);
  await invalidateCache(SHEET_NAMES.LISTS);
  return result;
}

/**
 * WRAPPER: deleteList
 * Deletes a list and all associated contact-list mappings
 */
export async function deleteList(accessToken, sheetId, listId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting list:', listId);

    const lists = getLocalLists();
    const contactLists = getLocalContactLists();

    const filteredLists = lists.filter((l) => l['List ID'] !== listId);
    const filteredMappings = contactLists.filter((cl) => cl['List ID'] !== listId);

    saveLocalLists(filteredLists);
    saveLocalContactLists(filteredMappings);

    return { success: true, listId };
  }

  // Production mode: Delete from Google Sheets (cascade)
  const startTime = Date.now();
  const result = await sheetsModule.deleteList(accessToken, sheetId, listId);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.LISTS, duration);
  await invalidateCache(SHEET_NAMES.LISTS);
  await invalidateCache(SHEET_NAMES.CONTACT_LISTS);
  await invalidateCache(SHEET_NAMES.LIST_NOTES);
  return result;
}

/**
 * WRAPPER: addContactToList
 * Adds a contact to a list (creates a mapping)
 */
export async function addContactToList(accessToken, sheetId, contactId, listId) {
  if (isDevMode()) {
    log('[DEV MODE] Adding contact', contactId, 'to list', listId);

    const contactLists = getLocalContactLists();
    const addedDate = new Date().toISOString().split('T')[0];

    // Check if mapping already exists
    const exists = contactLists.some(
      (cl) => cl['Contact ID'] === contactId && cl['List ID'] === listId
    );

    if (exists) {
      log('[DEV MODE] Mapping already exists, skipping');
      return { success: true, alreadyExists: true };
    }

    const newMapping = {
      'Contact ID': contactId,
      'List ID': listId,
      'Added To List Date': addedDate,
    };

    contactLists.push(newMapping);
    saveLocalContactLists(contactLists);
    return { success: true, mapping: newMapping };
  }

  // Production mode: Add to Google Sheets
  const startTime = Date.now();
  const result = await sheetsModule.addContactToList(accessToken, sheetId, contactId, listId);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.CONTACT_LISTS, duration);
  await invalidateCache(SHEET_NAMES.CONTACT_LISTS);
  return result;
}

/**
 * WRAPPER: removeContactFromList
 * Removes a contact from a list (deletes the mapping)
 */
export async function removeContactFromList(accessToken, sheetId, contactId, listId) {
  if (isDevMode()) {
    log('[DEV MODE] Removing contact', contactId, 'from list', listId);

    const contactLists = getLocalContactLists();
    const filtered = contactLists.filter(
      (cl) => !(cl['Contact ID'] === contactId && cl['List ID'] === listId)
    );

    saveLocalContactLists(filtered);
    return { success: true, contactId, listId };
  }

  // Production mode: Delete from Google Sheets
  const startTime = Date.now();
  const result = await sheetsModule.removeContactFromList(accessToken, sheetId, contactId, listId);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.CONTACT_LISTS, duration);
  await invalidateCache(SHEET_NAMES.CONTACT_LISTS);
  return result;
}

/**
 * WRAPPER: getContactLists
 * Gets all lists a contact belongs to
 */
export async function getContactLists(accessToken, sheetId, contactId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting lists for contact:', contactId);

    const lists = getLocalLists();
    const contactLists = getLocalContactLists();

    const contactListIds = contactLists
      .filter((cl) => cl['Contact ID'] === contactId)
      .map((cl) => cl['List ID']);

    return lists.filter((l) => contactListIds.includes(l['List ID']));
  }

  // Production mode: Read from Google Sheets
  const result = await sheetsModule.getContactLists(accessToken, sheetId, contactId);
  return result;
}

/**
 * WRAPPER: getListContacts
 * Gets all contacts in a list
 */
export async function getListContacts(accessToken, sheetId, listId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting contacts for list:', listId);

    const contacts = getLocalContacts();
    const contactLists = getLocalContactLists();

    const listContactIds = contactLists
      .filter((cl) => cl['List ID'] === listId)
      .map((cl) => cl['Contact ID']);

    return contacts.filter((c) => listContactIds.includes(c['Contact ID']));
  }

  // Production mode: Read from Google Sheets
  const result = await sheetsModule.getListContacts(accessToken, sheetId, listId);
  return result;
}

// Legacy aliases for backward compatibility
export const addCollection = addList;
export const updateCollection = updateList;
export const deleteCollection = deleteList;
export const addContactToCollection = addContactToList;
export const removeContactFromCollection = removeContactFromList;
export const getContactCollections = (contactId) => {
  // Legacy: no accessToken/sheetId params
  if (isDevMode()) {
    const lists = getLocalLists();
    const contactLists = getLocalContactLists();
    const contactListIds = contactLists
      .filter((cl) => cl['Contact ID'] === contactId)
      .map((cl) => cl['List ID']);
    return Promise.resolve(lists.filter((l) => contactListIds.includes(l['List ID'])));
  }
  return Promise.resolve([]);
};
export const getCollectionContacts = (listId) => {
  if (isDevMode()) {
    const contacts = getLocalContacts();
    const contactLists = getLocalContactLists();
    const listContactIds = contactLists
      .filter((cl) => cl['List ID'] === listId)
      .map((cl) => cl['Contact ID']);
    return Promise.resolve(contacts.filter((c) => listContactIds.includes(c['Contact ID'])));
  }
  return Promise.resolve([]);
};

/**
 * WRAPPER: addNote
 * Adds a new note to localStorage in dev mode, Google Sheets in production
 */
export async function addNote(accessToken, sheetId, noteData, userEmail = null) {
  if (isDevMode()) {
    log('[DEV MODE] Adding note to localStorage:', noteData);

    const notes = getLocalNotes();
    const noteId = await generateNoteID(accessToken, sheetId);
    const createdDate = new Date().toISOString().split('T')[0];

    const newNote = {
      'Note ID': noteId,
      'Created Date': createdDate,
      'Created By': userEmail || '',
      ...noteData,
      // Set default visibility if not provided
      Visibility: noteData.Visibility || 'Workspace-Wide',
    };

    notes.push(newNote);
    saveLocalNotes(notes);
    return { noteId, ...newNote };
  }

  // Production mode: Add to Google Sheets
  const { headers } = await sheetsModule.readSheetMetadata(accessToken, sheetId, SHEET_NAMES.NOTES);
  const noteId = await generateNoteID(accessToken, sheetId);
  const createdDate = new Date().toISOString().split('T')[0];

  const newNote = {
    'Note ID': noteId,
    'Created Date': createdDate,
    'Created By': userEmail || '',
    ...noteData,
    // Set default visibility if not provided
    Visibility: noteData.Visibility || 'Workspace-Wide',
  };

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    return newNote[fieldName] || '';
  });

  const startTime = Date.now();
  await sheetsModule.appendRow(accessToken, sheetId, SHEET_NAMES.NOTES, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.NOTES, duration);
  await invalidateCache(SHEET_NAMES.NOTES);
  return { noteId, ...newNote };
}

/**
 * WRAPPER: updateNote
 * Updates an existing note in localStorage in dev mode
 */
export async function updateNote(accessToken, sheetId, noteId, noteData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating note:', noteId, noteData);

    const notes = getLocalNotes();
    const index = notes.findIndex((n) => n['Note ID'] === noteId);

    if (index === -1) {
      throw new Error(`Note ${noteId} not found`);
    }

    notes[index] = {
      ...notes[index],
      ...noteData,
      'Note ID': noteId,
      'Created Date': notes[index]['Created Date'],
    };

    saveLocalNotes(notes);
    return notes[index];
  }

  // Production mode: Update in Google Sheets
  const { headers } = await sheetsModule.readSheetMetadata(accessToken, sheetId, SHEET_NAMES.NOTES);
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.NOTES);

  // Find the note
  const note = data.find((n) => n['Note ID'] === noteId);
  if (!note) throw new Error(`Note ${noteId} not found`);

  const rowIndex = note._rowIndex;

  // Build updated row
  const updatedNote = {
    ...note,
    ...noteData,
    'Note ID': noteId,
    'Created Date': note['Created Date'],
  };

  const values = headers.map((h) => {
    const fieldName = h.name;
    return updatedNote[fieldName] || '';
  });

  const startTime = Date.now();
  await sheetsModule.updateRow(accessToken, sheetId, 'Notes', rowIndex, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.NOTES, duration);
  await invalidateCache(SHEET_NAMES.NOTES);
  return updatedNote;
}

/**
 * WRAPPER: deleteNote
 * Deletes a note and all associated contact-note mappings
 */
export async function deleteNote(accessToken, sheetId, noteId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting note:', noteId);

    const notes = getLocalNotes();
    const contactNotes = getLocalContactNotes();
    const eventNotes = getLocalEventNotes();
    const listNotes = getLocalListNotes();
    const taskNotes = getLocalTaskNotes();

    const filteredNotes = notes.filter((n) => n['Note ID'] !== noteId);
    const filteredContactNotes = contactNotes.filter((cn) => cn['Note ID'] !== noteId);
    const filteredEventNotes = eventNotes.filter((en) => en['Note ID'] !== noteId);
    const filteredListNotes = listNotes.filter((ln) => ln['Note ID'] !== noteId);
    const filteredTaskNotes = taskNotes.filter((tn) => tn['Note ID'] !== noteId);

    saveLocalNotes(filteredNotes);
    saveLocalContactNotes(filteredContactNotes);
    saveLocalEventNotes(filteredEventNotes);
    saveLocalListNotes(filteredListNotes);
    saveLocalTaskNotes(filteredTaskNotes);

    return { success: true, noteId };
  }

  // Production mode: Delete from Google Sheets
  const startTime = Date.now();
  const [
    { data: notes },
    { data: contactNotes },
    { data: eventNotes },
    { data: listNotes },
    { data: taskNotes },
  ] = await Promise.all([
    sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.NOTES),
    sheetsModule.readSheetData(accessToken, sheetId, 'Contact Notes'),
    sheetsModule.readSheetData(accessToken, sheetId, 'Event Notes'),
    sheetsModule.readSheetData(accessToken, sheetId, 'List Notes'),
    sheetsModule.readSheetData(accessToken, sheetId, 'Task Notes'),
  ]);

  // Find the note
  const note = notes.find((n) => n['Note ID'] === noteId);
  if (!note) throw new Error(`Note ${noteId} not found`);

  const rowIndex = note._rowIndex;

  // Get internal sheet IDs dynamically
  const [notesInternalId, contactNotesInternalId, eventNotesInternalId, listNotesInternalId, taskNotesInternalId] =
    await Promise.all([
      sheetsModule.getSheetIdByName(accessToken, sheetId, SHEET_NAMES.NOTES),
      sheetsModule.getSheetIdByName(accessToken, sheetId, 'Contact Notes'),
      sheetsModule.getSheetIdByName(accessToken, sheetId, 'Event Notes'),
      sheetsModule.getSheetIdByName(accessToken, sheetId, 'List Notes'),
      sheetsModule.getSheetIdByName(accessToken, sheetId, 'Task Notes'),
    ]);

  const axios = (await import('axios')).default;
  const { API_CONFIG } = await import('../config/constants');

  // Delete the note row
  await axios.post(
    `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: notesInternalId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Delete associated mappings from all junction tables
  const junctionTables = [
    { data: contactNotes, internalId: contactNotesInternalId, cacheName: SHEET_NAMES.CONTACT_NOTES },
    { data: eventNotes, internalId: eventNotesInternalId, cacheName: SHEET_NAMES.EVENT_NOTES },
    { data: listNotes, internalId: listNotesInternalId, cacheName: SHEET_NAMES.LIST_NOTES },
    { data: taskNotes, internalId: taskNotesInternalId, cacheName: SHEET_NAMES.TASK_NOTES },
  ];

  for (const table of junctionTables) {
    const mappingsToDelete = table.data.filter((row) => row['Note ID'] === noteId);
    if (mappingsToDelete.length > 0) {
      // Sort by row index descending to delete from bottom up (prevents index shifting issues)
      const sortedMappings = mappingsToDelete.sort((a, b) => b._rowIndex - a._rowIndex);
      const deleteRequests = sortedMappings.map((mapping) => ({
        deleteDimension: {
          range: {
            sheetId: table.internalId,
            dimension: 'ROWS',
            startIndex: mapping._rowIndex - 1,
            endIndex: mapping._rowIndex,
          },
        },
      }));

      await axios.post(
        `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
        { requests: deleteRequests },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      await invalidateCache(table.cacheName);
    }
  }

  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.NOTES, duration);
  await invalidateCache(SHEET_NAMES.NOTES);
  return { success: true, noteId };
}

/**
 * WRAPPER: linkNoteToContact
 * Links a note to a contact (creates a mapping)
 */
export const linkNoteToContact = (function () {
  const originalFn = sheetsModule.linkNoteToContact;
  return async function linkNoteToContact(accessToken, sheetId, noteId, contactId) {
    if (isDevMode()) {
      log('[DEV MODE] Linking note', noteId, 'to contact', contactId);

      const contactNotes = getLocalContactNotes();
      const linkedDate = new Date().toISOString().split('T')[0];

      const exists = contactNotes.some(
        (cn) => cn['Note ID'] === noteId && cn['Contact ID'] === contactId
      );

      if (exists) {
        log('[DEV MODE] Mapping already exists, skipping');
        return { success: true, alreadyExists: true };
      }

      const newMapping = {
        'Note ID': noteId,
        'Contact ID': contactId,
        'Linked Date': linkedDate,
      };

      contactNotes.push(newMapping);
      saveLocalContactNotes(contactNotes);
      return { success: true, mapping: newMapping };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, contactId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.CONTACT_NOTES, duration);
    await invalidateCache(SHEET_NAMES.CONTACT_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: unlinkNoteFromContact
 * Unlinks a note from a contact (deletes the mapping)
 */
export const unlinkNoteFromContact = (function () {
  const originalFn = sheetsModule.unlinkNoteFromContact;
  return async function unlinkNoteFromContact(accessToken, sheetId, noteId, contactId) {
    if (isDevMode()) {
      log('[DEV MODE] Unlinking note', noteId, 'from contact', contactId);

      const contactNotes = getLocalContactNotes();
      const filtered = contactNotes.filter(
        (cn) => !(cn['Note ID'] === noteId && cn['Contact ID'] === contactId)
      );

      saveLocalContactNotes(filtered);
      return { success: true, noteId, contactId };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, contactId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('delete', SHEET_NAMES.CONTACT_NOTES, duration);
    await invalidateCache(SHEET_NAMES.CONTACT_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: linkNoteToEvent
 * Links a note to an event (creates a mapping)
 */
export const linkNoteToEvent = (function () {
  const originalFn = sheetsModule.linkNoteToEvent;
  return async function linkNoteToEvent(accessToken, sheetId, noteId, eventId) {
    if (isDevMode()) {
      log('[DEV MODE] Linking note', noteId, 'to event', eventId);

      const eventNotes = getLocalEventNotes();
      const linkedDate = new Date().toISOString().split('T')[0];

      const exists = eventNotes.some(
        (en) => en['Note ID'] === noteId && en['Event ID'] === eventId
      );

      if (exists) {
        log('[DEV MODE] Mapping already exists, skipping');
        return { success: true, alreadyExists: true };
      }

      const newMapping = {
        'Note ID': noteId,
        'Event ID': eventId,
        'Linked Date': linkedDate,
      };

      eventNotes.push(newMapping);
      saveLocalEventNotes(eventNotes);
      return { success: true, mapping: newMapping };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, eventId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.EVENT_NOTES, duration);
    await invalidateCache(SHEET_NAMES.EVENT_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: unlinkNoteFromEvent
 * Unlinks a note from an event (deletes the mapping)
 */
export const unlinkNoteFromEvent = (function () {
  const originalFn = sheetsModule.unlinkNoteFromEvent;
  return async function unlinkNoteFromEvent(accessToken, sheetId, noteId, eventId) {
    if (isDevMode()) {
      log('[DEV MODE] Unlinking note', noteId, 'from event', eventId);

      const eventNotes = getLocalEventNotes();
      const filtered = eventNotes.filter(
        (en) => !(en['Note ID'] === noteId && en['Event ID'] === eventId)
      );

      saveLocalEventNotes(filtered);
      return { success: true, noteId, eventId };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, eventId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('delete', SHEET_NAMES.EVENT_NOTES, duration);
    await invalidateCache(SHEET_NAMES.EVENT_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: getEventNotes
 * Gets all notes linked to a specific event (with privacy filtering)
 */
export const getEventNotes = (function () {
  const originalFn = sheetsModule.getEventNotes;
  return async function getEventNotes(accessToken, sheetId, eventId, userEmail = null) {
    if (isDevMode()) {
      log('[DEV MODE] Getting notes for event:', eventId);

      const allNotes = getLocalNotes();
      const eventNotes = getLocalEventNotes();

      const linkedNoteIds = eventNotes
        .filter((en) => en['Event ID'] === eventId)
        .map((en) => en['Note ID']);

      const notes = allNotes.filter((n) => linkedNoteIds.includes(n['Note ID']));

      // Apply privacy filtering if userEmail is provided
      if (userEmail) {
        return filterNotesByVisibility(notes, userEmail);
      }
      return notes;
    }
    const notes = await originalFn(accessToken, sheetId, eventId);
    // Apply privacy filtering if userEmail is provided
    if (userEmail) {
      return filterNotesByVisibility(notes, userEmail);
    }
    return notes;
  };
})();

/**
 * WRAPPER: linkNoteToList
 * Links a note to a list (creates a mapping)
 */
export const linkNoteToList = (function () {
  const originalFn = sheetsModule.linkNoteToList;
  return async function linkNoteToList(accessToken, sheetId, noteId, listId) {
    if (isDevMode()) {
      log('[DEV MODE] Linking note', noteId, 'to list', listId);

      const listNotes = getLocalListNotes();
      const linkedDate = new Date().toISOString().split('T')[0];

      const exists = listNotes.some((ln) => ln['Note ID'] === noteId && ln['List ID'] === listId);

      if (exists) {
        log('[DEV MODE] Mapping already exists, skipping');
        return { success: true, alreadyExists: true };
      }

      const newMapping = {
        'Note ID': noteId,
        'List ID': listId,
        'Linked Date': linkedDate,
      };

      listNotes.push(newMapping);
      saveLocalListNotes(listNotes);
      return { success: true, mapping: newMapping };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, listId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.LIST_NOTES, duration);
    await invalidateCache(SHEET_NAMES.LIST_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: unlinkNoteFromList
 * Unlinks a note from a list (deletes the mapping)
 */
export const unlinkNoteFromList = (function () {
  const originalFn = sheetsModule.unlinkNoteFromList;
  return async function unlinkNoteFromList(accessToken, sheetId, noteId, listId) {
    if (isDevMode()) {
      log('[DEV MODE] Unlinking note', noteId, 'from list', listId);

      const listNotes = getLocalListNotes();
      const filtered = listNotes.filter(
        (ln) => !(ln['Note ID'] === noteId && ln['List ID'] === listId)
      );

      saveLocalListNotes(filtered);
      return { success: true, noteId, listId };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, listId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('delete', SHEET_NAMES.LIST_NOTES, duration);
    await invalidateCache(SHEET_NAMES.LIST_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: getListNotes
 * Gets all notes linked to a specific list (with privacy filtering)
 */
export const getListNotes = (function () {
  const originalFn = sheetsModule.getListNotes;
  return async function getListNotes(accessToken, sheetId, listId, userEmail = null) {
    if (isDevMode()) {
      log('[DEV MODE] Getting notes for list:', listId);

      const allNotes = getLocalNotes();
      const listNotes = getLocalListNotes();

      const linkedNoteIds = listNotes
        .filter((ln) => ln['List ID'] === listId)
        .map((ln) => ln['Note ID']);

      const notes = allNotes.filter((n) => linkedNoteIds.includes(n['Note ID']));

      // Apply privacy filtering if userEmail is provided
      if (userEmail) {
        return filterNotesByVisibility(notes, userEmail);
      }
      return notes;
    }
    const notes = await originalFn(accessToken, sheetId, listId);
    // Apply privacy filtering if userEmail is provided
    if (userEmail) {
      return filterNotesByVisibility(notes, userEmail);
    }
    return notes;
  };
})();

/**
 * WRAPPER: linkNoteToTask
 * Links a note to a task (creates a mapping)
 */
export const linkNoteToTask = (function () {
  const originalFn = sheetsModule.linkNoteToTask;
  return async function linkNoteToTask(accessToken, sheetId, noteId, taskId) {
    if (isDevMode()) {
      log('[DEV MODE] Linking note', noteId, 'to task', taskId);

      const taskNotes = getLocalTaskNotes();
      const linkedDate = new Date().toISOString().split('T')[0];

      const exists = taskNotes.some((tn) => tn['Note ID'] === noteId && tn['Task ID'] === taskId);

      if (exists) {
        log('[DEV MODE] Mapping already exists, skipping');
        return { success: true, alreadyExists: true };
      }

      const newMapping = {
        'Note ID': noteId,
        'Task ID': taskId,
        'Linked Date': linkedDate,
      };

      taskNotes.push(newMapping);
      saveLocalTaskNotes(taskNotes);
      return { success: true, mapping: newMapping };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, taskId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('write', SHEET_NAMES.TASK_NOTES, duration);
    await invalidateCache(SHEET_NAMES.TASK_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: unlinkNoteFromTask
 * Unlinks a note from a task (deletes the mapping)
 */
export const unlinkNoteFromTask = (function () {
  const originalFn = sheetsModule.unlinkNoteFromTask;
  return async function unlinkNoteFromTask(accessToken, sheetId, noteId, taskId) {
    if (isDevMode()) {
      log('[DEV MODE] Unlinking note', noteId, 'from task', taskId);

      const taskNotes = getLocalTaskNotes();
      const filtered = taskNotes.filter(
        (tn) => !(tn['Note ID'] === noteId && tn['Task ID'] === taskId)
      );

      saveLocalTaskNotes(filtered);
      return { success: true, noteId, taskId };
    }
    const startTime = Date.now();
    const result = await originalFn(accessToken, sheetId, noteId, taskId);
    const duration = Date.now() - startTime;
    monitoringService.recordApiCall('delete', SHEET_NAMES.TASK_NOTES, duration);
    await invalidateCache(SHEET_NAMES.TASK_NOTES);
    return result;
  };
})();

/**
 * WRAPPER: getTaskNotes
 * Gets all notes linked to a specific task (with privacy filtering)
 */
export const getTaskNotes = (function () {
  const originalFn = sheetsModule.getTaskNotes;
  return async function getTaskNotes(accessToken, sheetId, taskId, userEmail = null) {
    if (isDevMode()) {
      log('[DEV MODE] Getting notes for task:', taskId);

      const allNotes = getLocalNotes();
      const taskNotes = getLocalTaskNotes();

      const linkedNoteIds = taskNotes
        .filter((tn) => tn['Task ID'] === taskId)
        .map((tn) => tn['Note ID']);

      const notes = allNotes.filter((n) => linkedNoteIds.includes(n['Note ID']));

      // Apply privacy filtering if userEmail is provided
      if (userEmail) {
        return filterNotesByVisibility(notes, userEmail);
      }
      return notes;
    }
    const notes = await originalFn(accessToken, sheetId, taskId);
    // Apply privacy filtering if userEmail is provided
    if (userEmail) {
      return filterNotesByVisibility(notes, userEmail);
    }
    return notes;
  };
})();

/**
 * WRAPPER: getNoteWithEntities
 * Gets a note with all linked entities (contacts, events, lists, tasks)
 */
export const getNoteWithEntities = (function () {
  const originalFn = sheetsModule.getNoteWithEntities;
  return async function getNoteWithEntities(accessToken, sheetId, noteId, userEmail = null) {
    if (isDevMode()) {
      log('[DEV MODE] Getting note with entities:', noteId);

      const allNotes = getLocalNotes();
      const note = allNotes.find((n) => n['Note ID'] === noteId);

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // Check visibility permissions
      if (userEmail && !canUserViewNote(note, userEmail)) {
        throw new Error('You do not have permission to view this note');
      }

      // Get all linked entities
      const contactNotes = getLocalContactNotes();
      const eventNotes = getLocalEventNotes();
      const listNotes = getLocalListNotes();
      const taskNotes = getLocalTaskNotes();

      const linkedContacts = contactNotes
        .filter((cn) => cn['Note ID'] === noteId)
        .map((cn) => cn['Contact ID']);

      const linkedEvents = eventNotes
        .filter((en) => en['Note ID'] === noteId)
        .map((en) => en['Event ID']);

      const linkedLists = listNotes
        .filter((ln) => ln['Note ID'] === noteId)
        .map((ln) => ln['List ID']);

      const linkedTasks = taskNotes
        .filter((tn) => tn['Note ID'] === noteId)
        .map((tn) => tn['Task ID']);

      return {
        ...note,
        linkedContacts,
        linkedEvents,
        linkedLists,
        linkedTasks,
      };
    }
    return originalFn(accessToken, sheetId, noteId, userEmail);
  };
})();

/**
 * WRAPPER: batchLinkNoteToEntities
 * Links a note to multiple entities (contacts, events, lists, tasks) in a batch operation
 */
export const batchLinkNoteToEntities = (function () {
  const originalFn = sheetsModule.batchLinkNoteToEntities;
  return async function batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks) {
    if (isDevMode()) {
      log('[DEV MODE] Batch linking note', noteId, 'to entities:', entityLinks);

      const { contactIds = [], eventIds = [], listIds = [], taskIds = [] } = entityLinks;

      const results = {
        contacts: [],
        events: [],
        lists: [],
        tasks: [],
      };

      // Link to contacts
      for (const contactId of contactIds) {
        try {
          const result = await linkNoteToContact(accessToken, sheetId, noteId, contactId);
          results.contacts.push({ success: true, contactId, result });
        } catch (error) {
          results.contacts.push({ success: false, contactId, error: error.message });
        }
      }

      // Link to events
      for (const eventId of eventIds) {
        try {
          const result = await linkNoteToEvent(accessToken, sheetId, noteId, eventId);
          results.events.push({ success: true, eventId, result });
        } catch (error) {
          results.events.push({ success: false, eventId, error: error.message });
        }
      }

      // Link to lists
      for (const listId of listIds) {
        try {
          const result = await linkNoteToList(accessToken, sheetId, noteId, listId);
          results.lists.push({ success: true, listId, result });
        } catch (error) {
          results.lists.push({ success: false, listId, error: error.message });
        }
      }

      // Link to tasks
      for (const taskId of taskIds) {
        try {
          const result = await linkNoteToTask(accessToken, sheetId, noteId, taskId);
          results.tasks.push({ success: true, taskId, result });
        } catch (error) {
          results.tasks.push({ success: false, taskId, error: error.message });
        }
      }

      return results;
    }
    return originalFn(accessToken, sheetId, noteId, entityLinks);
  };
})();

/**
 * WRAPPER: shareContactNotes
 * Updates visibility settings for all notes linked to specified contacts
 */
export const shareContactNotes = (function () {
  const originalFn = sheetsModule.shareContactNotes;
  return async function shareContactNotes(
    accessToken,
    sheetId,
    contactIds,
    shareStrategy,
    specificEmails = [],
    userEmail = null
  ) {
    if (isDevMode()) {
      log(
        '[DEV MODE] Sharing notes for contacts:',
        contactIds,
        'strategy:',
        shareStrategy,
        'emails:',
        specificEmails
      );

      const allNotes = getLocalNotes();
      const contactNotes = getLocalContactNotes();

      const results = {
        sharedCount: 0,
        updatedNotes: [],
        errors: [],
      };

      // Get all note IDs linked to the specified contacts
      const noteIds = contactNotes
        .filter((cn) => contactIds.includes(cn['Contact ID']))
        .map((cn) => cn['Note ID']);

      const uniqueNoteIds = [...new Set(noteIds)];

      // Update each note's visibility
      for (const noteId of uniqueNoteIds) {
        try {
          const noteIndex = allNotes.findIndex((n) => n['Note ID'] === noteId);
          if (noteIndex === -1) continue;

          const note = allNotes[noteIndex];

          // Only the creator can share their notes
          if (userEmail && note['Created By'] !== userEmail) {
            results.errors.push({
              noteId,
              error: 'Only the note creator can change sharing settings',
            });
            continue;
          }

          // Update visibility based on share strategy
          if (shareStrategy === 'workspace_wide') {
            note['Visibility'] = 'Workspace-Wide';
            note['Shared With'] = '';
          } else if (shareStrategy === 'specific') {
            note['Visibility'] = 'Shared';
            note['Shared With'] = specificEmails.join(', ');
          } else if (shareStrategy === 'private') {
            note['Visibility'] = 'Private';
            note['Shared With'] = '';
          }

          allNotes[noteIndex] = note;
          results.sharedCount++;
          results.updatedNotes.push(noteId);
        } catch (error) {
          results.errors.push({ noteId, error: error.message });
        }
      }

      saveLocalNotes(allNotes);
      return results;
    }
    return originalFn(accessToken, sheetId, contactIds, shareStrategy, specificEmails, userEmail);
  };
})();

/**
 * Filter notes by visibility permissions for the current user
 * @param {Array} notes - Array of note objects
 * @param {string} userEmail - Email of the current user
 * @returns {Array} - Filtered array of notes the user can see
 */
export function filterNotesByVisibility(notes, userEmail) {
  if (!userEmail) {
    return notes;
  }

  return notes.filter((note) => {
    const createdBy = note['Created By'];
    const visibility = note['Visibility'] || 'Workspace-Wide';

    if (visibility === 'Private') {
      return createdBy === userEmail;
    } else if (visibility === 'Shared') {
      const sharedWith = (note['Shared With'] || '')
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);
      return createdBy === userEmail || sharedWith.includes(userEmail);
    } else {
      // Workspace-Wide or empty/null visibility
      return true;
    }
  });
}

/**
 * Check if a user can view a specific note
 * @param {Object} note - Note object
 * @param {string} userEmail - Email of the current user
 * @returns {boolean} - True if user can view the note
 */
export function canUserViewNote(note, userEmail) {
  if (!note || !userEmail) {
    return false;
  }

  const createdBy = note['Created By'];
  const visibility = note['Visibility'] || 'Workspace-Wide';

  if (visibility === 'Private') {
    return createdBy === userEmail;
  } else if (visibility === 'Shared') {
    const sharedWith = (note['Shared With'] || '')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);
    return createdBy === userEmail || sharedWith.includes(userEmail);
  } else {
    return true;
  }
}

/**
 * Check if a user can edit a specific note
 * @param {Object} note - Note object
 * @param {string} userEmail - Email of the current user
 * @returns {boolean} - True if user can edit the note
 */
export function canUserEditNote(note, userEmail) {
  if (!note || !userEmail) {
    return false;
  }

  return note['Created By'] === userEmail;
}

/**
 * WRAPPER: getNotes
 * Gets all notes (or filtered by status)
 */
export async function getNotes(accessToken, sheetId, status = null) {
  if (isDevMode()) {
    log('[DEV MODE] Getting notes', status ? `with status: ${status}` : '');

    let notes = getLocalNotes();

    if (status) {
      notes = notes.filter((n) => n['Status'] === status);
    }

    return notes;
  }

  // Production mode: Read from Google Sheets
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.NOTES);
  let notes = data;

  if (status) {
    notes = notes.filter((n) => n['Status'] === status);
  }

  return notes;
}

/**
 * WRAPPER: getContactNotes
 * Gets all notes linked to a specific contact (with privacy filtering)
 */
export const getContactNotes = (function () {
  const originalFn = sheetsModule.getContactNotes;
  return async function getContactNotes(accessToken, sheetId, contactId, userEmail = null) {
    if (isDevMode()) {
      log('[DEV MODE] Getting notes for contact:', contactId);
      const notes = getNotesForContact(contactId);
      // Apply privacy filtering if userEmail is provided
      if (userEmail) {
        return filterNotesByVisibility(notes, userEmail);
      }
      return notes;
    }
    const notes = await originalFn(accessToken, sheetId, contactId);
    // Apply privacy filtering if userEmail is provided
    if (userEmail) {
      return filterNotesByVisibility(notes, userEmail);
    }
    return notes;
  };
})();

/**
 * WRAPPER: addNoteWithLink
 * Creates a note and links it to a contact in a single batch operation
 */
export const addNoteWithLink = (function () {
  const originalFn = sheetsModule.addNoteWithLink;
  return async function addNoteWithLink(
    accessToken,
    sheetId,
    noteData,
    contactId = null,
    userEmail = null
  ) {
    if (isDevMode()) {
      log('[DEV MODE] Adding note with link to localStorage:', noteData, contactId);

      // In dev mode, just use the existing addNote + linkNoteToContact pattern
      const newNote = await addNote(accessToken, sheetId, noteData, userEmail);

      if (contactId && newNote) {
        await linkNoteToContact(accessToken, sheetId, newNote.noteId, contactId);
        return { ...newNote, linked: true };
      }

      return { ...newNote, linked: false };
    }
    return originalFn(accessToken, sheetId, noteData, contactId, userEmail);
  };
})();

/**
 * WRAPPER: generateTaskID
 * Generates from localStorage in dev mode
 */
export async function generateTaskID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating task ID from localStorage');
    const { getLocalTasks } = await import('../__tests__/fixtures/seedTestData');
    const tasks = getLocalTasks();

    if (tasks.length === 0) return 'TSK001';

    const ids = tasks
      .map((t) => t['Task ID'])
      .filter((id) => id && id.match(/^TSK\d+$/))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `TSK${String(maxId + 1).padStart(3, '0')}`;
  }

  // Production mode: Generate from Google Sheets
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS);

  if (data.length === 0) return 'TSK001';

  const ids = data
    .map((t) => t['Task ID'])
    .filter((id) => id && id.match(/^TSK\d+$/))
    .map((id) => parseInt(id.substring(3), 10))
    .filter((num) => !isNaN(num));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `TSK${String(maxId + 1).padStart(3, '0')}`;
}

/**
 * WRAPPER: getTasks
 * Gets all tasks (optionally filtered by status, contact, or workspace)
 */
export async function getTasks(accessToken, sheetId, filters = {}) {
  if (isDevMode()) {
    log('[DEV MODE] Getting tasks', filters);
    const { getLocalTasks } = await import('../__tests__/fixtures/seedTestData');
    let tasks = getLocalTasks();

    if (filters.status) {
      tasks = tasks.filter((t) => t['Status'] === filters.status);
    }
    if (filters.contactId) {
      tasks = tasks.filter((t) => t['Contact ID'] === filters.contactId);
    }
    if (filters.workspaceId) {
      tasks = tasks.filter((t) => t['Workspace ID'] === filters.workspaceId);
    }
    if (filters.assignedTo) {
      tasks = tasks.filter((t) => t['Assigned To'] === filters.assignedTo);
    }

    return tasks;
  }

  // Production mode: Read from Google Sheets
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS);
  let tasks = data;

  // Apply filters
  if (filters.status) {
    tasks = tasks.filter((t) => t['Status'] === filters.status);
  }
  if (filters.contactId) {
    tasks = tasks.filter((t) => t['Contact ID'] === filters.contactId);
  }
  if (filters.workspaceId) {
    tasks = tasks.filter((t) => t['Workspace ID'] === filters.workspaceId);
  }
  if (filters.assignedTo) {
    tasks = tasks.filter((t) => t['Assigned To'] === filters.assignedTo);
  }

  return tasks;
}

/**
 * WRAPPER: addTask
 * Adds a new task to localStorage in dev mode
 */
export async function addTask(accessToken, sheetId, taskData) {
  if (isDevMode()) {
    log('[DEV MODE] Adding task to localStorage:', taskData);
    const { getLocalTasks, saveLocalTasks } = await import('../__tests__/fixtures/seedTestData');

    const tasks = getLocalTasks();
    const taskId = await generateTaskID(accessToken, sheetId);
    const createdDate = new Date().toISOString().split('T')[0];

    const newTask = {
      'Task ID': taskId,
      'Task Created Date': createdDate,
      Status: 'pending',
      'Completed Date': null,
      ...taskData,
    };

    tasks.push(newTask);
    saveLocalTasks(tasks);
    return { taskId, ...newTask };
  }

  // Production mode: Add to Google Sheets
  const { headers } = await sheetsModule.readSheetMetadata(accessToken, sheetId, SHEET_NAMES.TASKS);
  const taskId = await generateTaskID(accessToken, sheetId);
  const createdDate = new Date().toISOString().split('T')[0];

  const newTask = {
    'Task ID': taskId,
    'Task Created Date': createdDate,
    Status: taskData['Status'] || 'pending',
    'Completed Date': null,
    ...taskData,
  };

  // Build row in correct column order
  const values = headers.map((h) => {
    const fieldName = h.name;
    return newTask[fieldName] || '';
  });

  const startTime = Date.now();
  await sheetsModule.appendRow(accessToken, sheetId, SHEET_NAMES.TASKS, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.TASKS, duration);
  await invalidateCache(SHEET_NAMES.TASKS);
  return { taskId, ...newTask };
}

/**
 * WRAPPER: updateTask
 * Updates an existing task in localStorage in dev mode
 */
export async function updateTask(accessToken, sheetId, taskId, taskData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating task:', taskId, taskData);
    const { getLocalTasks, saveLocalTasks } = await import('../__tests__/fixtures/seedTestData');

    const tasks = getLocalTasks();
    const index = tasks.findIndex((t) => t['Task ID'] === taskId);

    if (index === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    // If marking as completed, set completion date
    if (taskData['Status'] === 'completed' && tasks[index]['Status'] !== 'completed') {
      taskData['Completed Date'] = new Date().toISOString().split('T')[0];
    }

    tasks[index] = {
      ...tasks[index],
      ...taskData,
      'Task ID': taskId,
      'Task Created Date': tasks[index]['Task Created Date'],
    };

    saveLocalTasks(tasks);
    return tasks[index];
  }

  // Production mode: Update in Google Sheets
  const { headers } = await sheetsModule.readSheetMetadata(accessToken, sheetId, SHEET_NAMES.TASKS);
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS);

  // Find the task
  const task = data.find((t) => t['Task ID'] === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const rowIndex = task._rowIndex;

  // If marking as completed, set completion date
  const updatedTaskData = { ...taskData };
  if (updatedTaskData['Status'] === 'completed' && task['Status'] !== 'completed') {
    updatedTaskData['Completed Date'] = new Date().toISOString().split('T')[0];
  }

  // Build updated row
  const updatedTask = {
    ...task,
    ...updatedTaskData,
    'Task ID': taskId,
    'Task Created Date': task['Task Created Date'],
  };

  const values = headers.map((h) => {
    const fieldName = h.name;
    return updatedTask[fieldName] || '';
  });

  const startTime = Date.now();
  await sheetsModule.updateRow(accessToken, sheetId, 'Tasks', rowIndex, values);
  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('write', SHEET_NAMES.TASKS, duration);
  await invalidateCache(SHEET_NAMES.TASKS);
  return updatedTask;
}

/**
 * WRAPPER: deleteTask
 * Deletes a task from localStorage in dev mode, Google Sheets in production
 */
export async function deleteTask(accessToken, sheetId, taskId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting task:', taskId);
    const { getLocalTasks, saveLocalTasks } = await import('../__tests__/fixtures/seedTestData');

    const tasks = getLocalTasks();
    const filtered = tasks.filter((t) => t['Task ID'] !== taskId);

    saveLocalTasks(filtered);
    return { success: true, taskId };
  }

  // Production mode: Delete from Google Sheets
  const startTime = Date.now();
  const { data } = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS);

  // Find the task
  const task = data.find((t) => t['Task ID'] === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const rowIndex = task._rowIndex;

  // Get the internal sheet ID for the Tasks tab
  const internalSheetId = await sheetsModule.getSheetIdByName(accessToken, sheetId, SHEET_NAMES.TASKS);

  // Delete the row using Sheets API batchUpdate
  const axios = (await import('axios')).default;
  const { API_CONFIG } = await import('../config/constants');

  await axios.post(
    `${API_CONFIG.SHEETS_API_BASE}/${sheetId}:batchUpdate`,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: internalSheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const duration = Date.now() - startTime;
  monitoringService.recordApiCall('delete', SHEET_NAMES.TASKS, duration);
  await invalidateCache(SHEET_NAMES.TASKS);
  return { success: true, taskId };
}

/**
 * WRAPPER: getTasksForContact
 * Gets all tasks linked to a specific contact
 */
export async function getTasksForContact(contactId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting tasks for contact:', contactId);
    const { getTasksForContact: getLocalTasksForContact } =
      await import('../__tests__/fixtures/seedTestData');
    return getLocalTasksForContact(contactId);
  }
  log('[PRODUCTION] getTasksForContact not yet implemented for production');
  return [];
}

/**
 * WRAPPER: getTasksForWorkspace
 * Gets all tasks linked to a specific workspace
 */
export async function getTasksForWorkspace(workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting tasks for workspace:', workspaceId);
    const { getTasksForWorkspace: getLocalTasksForWorkspace } =
      await import('../__tests__/fixtures/seedTestData');
    return getLocalTasksForWorkspace(workspaceId);
  }
  log('[PRODUCTION] getTasksForWorkspace not yet implemented for production');
  return [];
}

/**
 * ============================================================================
 * WORKSPACE HIERARCHY SERVICE
 * ============================================================================
 * Wrappers for workspace management using Google Sheets
 */

/**
 * WRAPPER: generateWorkspaceID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export async function generateWorkspaceID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating workspace ID from localStorage');
    const workspaces = getLocalWorkspaces();
    if (workspaces.length === 0) return 'WS001';

    const ids = workspaces
      .map((row) => row['Workspace ID'])
      .filter((id) => id && id.startsWith('WS'))
      .map((id) => parseInt(id.substring(2), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `WS${String(maxId + 1).padStart(3, '0')}`;
  }
  const { generateWorkspaceID } = await import('../services/workspaceHierarchyServiceSheets');
  return generateWorkspaceID(accessToken, sheetId);
}

/**
 * WRAPPER: generateMemberID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export async function generateMemberID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating member ID from localStorage');
    const members = getLocalWorkspaceMembers();
    if (members.length === 0) return 'MEM001';

    const ids = members
      .map((row) => row['Member ID'])
      .filter((id) => id && id.startsWith('MEM'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `MEM${String(maxId + 1).padStart(3, '0')}`;
  }
  const { generateMemberID } = await import('../services/workspaceHierarchyServiceSheets');
  return generateMemberID(accessToken, sheetId);
}

/**
 * WRAPPER: generateInvitationID
 * Generates from localStorage in dev mode, Google Sheets in production
 */
export async function generateInvitationID(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Generating invitation ID from localStorage');
    const invitations = getLocalWorkspaceInvitations();
    if (!invitations || invitations.length === 0) return 'INV001';

    const ids = invitations
      .map((row) => row['Invitation ID'])
      .filter((id) => id && id.startsWith('INV'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `INV${String(maxId + 1).padStart(3, '0')}`;
  }
  const { generateInvitationID } = await import('../services/workspaceHierarchyServiceSheets');
  return generateInvitationID(accessToken, sheetId);
}

/**
 * WRAPPER: getWorkspaceById
 * Gets workspace from localStorage in dev mode, Google Sheets in production
 */
export async function getWorkspaceById(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting workspace by ID:', workspaceId);
    const workspaces = getLocalWorkspaces();
    return workspaces.find((c) => c['Workspace ID'] === workspaceId) || null;
  }
  const { getWorkspaceById } = await import('../services/workspaceHierarchyServiceSheets');
  return getWorkspaceById(accessToken, sheetId, workspaceId);
}

/**
 * WRAPPER: createRootWorkspace
 * Creates root workspace in localStorage in dev mode, Google Sheets in production
 */
export async function createRootWorkspace(accessToken, sheetId, workspaceData, userEmail) {
  if (isDevMode()) {
    log('[DEV MODE] Creating root workspace:', workspaceData);
    const workspaces = getLocalWorkspaces();
    const workspaceId = await generateWorkspaceID(accessToken, sheetId);
    const createdDate = new Date().toISOString();
    const path = `/${workspaceId}`;

    const newWorkspace = {
      'Workspace ID': workspaceId,
      'Workspace Name': workspaceData.name,
      'Parent Workspace ID': '',
      Path: path,
      'Sheet ID': workspaceData.sheetId || '',
      'Created Date': createdDate,
      'Created By': userEmail,
      Status: workspaceData.status || 'active',
      Description: workspaceData.description || '',
    };

    workspaces.push(newWorkspace);
    saveLocalWorkspaces(workspaces);

    return {
      id: workspaceId,
      name: workspaceData.name,
      parent_workspace_id: null,
      path: path,
      depth: 0,
      sheet_id: workspaceData.sheetId || '',
      created_at: createdDate,
      created_by: userEmail,
      status: workspaceData.status || 'active',
      description: workspaceData.description || '',
    };
  }
  const { createRootWorkspace } = await import('../services/workspaceHierarchyServiceSheets');
  return createRootWorkspace(accessToken, sheetId, workspaceData, userEmail);
}

/**
 * WRAPPER: createSubWorkspace
 * Creates sub-workspace in localStorage in dev mode, Google Sheets in production
 */
export async function createSubWorkspace(
  accessToken,
  sheetId,
  parentWorkspaceId,
  workspaceData,
  userEmail
) {
  if (isDevMode()) {
    log('[DEV MODE] Creating sub-workspace under:', parentWorkspaceId);
    const workspaces = getLocalWorkspaces();
    const parent = workspaces.find((c) => c['Workspace ID'] === parentWorkspaceId);

    if (!parent) {
      throw new Error('Parent workspace not found');
    }

    const workspaceId = await generateWorkspaceID(accessToken, sheetId);
    const parentPath = parent['Path'] || `/${parentWorkspaceId}`;
    const newPath = `${parentPath}/${workspaceId}`;
    const newDepth = (parent['Depth'] || 0) + 1;
    const createdDate = new Date().toISOString();

    const newWorkspace = {
      'Workspace ID': workspaceId,
      'Workspace Name': workspaceData.name,
      'Parent Workspace ID': parentWorkspaceId,
      Path: newPath,
      'Sheet ID': workspaceData.sheetId || '',
      'Created Date': createdDate,
      'Created By': userEmail,
      Status: workspaceData.status || 'active',
      Description: workspaceData.description || '',
      Depth: newDepth,
    };

    workspaces.push(newWorkspace);
    saveLocalWorkspaces(workspaces);

    return {
      id: workspaceId,
      name: workspaceData.name,
      parent_workspace_id: parentWorkspaceId,
      path: newPath,
      depth: newDepth,
      sheet_id: workspaceData.sheetId || '',
      created_at: createdDate,
      created_by: userEmail,
      status: workspaceData.status || 'active',
      description: workspaceData.description || '',
    };
  }
  const { createSubWorkspace } = await import('../services/workspaceHierarchyServiceSheets');
  return createSubWorkspace(accessToken, sheetId, parentWorkspaceId, workspaceData, userEmail);
}

/**
 * WRAPPER: getWorkspaceChildren
 * Gets direct children of a workspace
 */
export async function getWorkspaceChildren(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting children of workspace:', workspaceId);
    const workspaces = getLocalWorkspaces();
    return workspaces.filter((c) => c['Parent Workspace ID'] === workspaceId);
  }
  const { getWorkspaceChildren } = await import('../services/workspaceHierarchyServiceSheets');
  return getWorkspaceChildren(accessToken, sheetId, workspaceId);
}

/**
 * WRAPPER: getWorkspacePath
 * Gets breadcrumb path from root to workspace
 */
export async function getWorkspacePath(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting workspace path:', workspaceId);
    const workspaces = getLocalWorkspaces();
    const workspace = workspaces.find((c) => c['Workspace ID'] === workspaceId);
    if (!workspace) return [];

    const breadcrumb = [workspace];
    let currentId = workspace['Parent Workspace ID'];
    while (currentId) {
      const parent = workspaces.find((c) => c['Workspace ID'] === currentId);
      if (!parent) break;
      breadcrumb.unshift(parent);
      currentId = parent['Parent Workspace ID'];
    }
    return breadcrumb;
  }
  const { getWorkspacePath } = await import('../services/workspaceHierarchyServiceSheets');
  return getWorkspacePath(accessToken, sheetId, workspaceId);
}

/**
 * WRAPPER: hasChildren
 * Checks if workspace has any children
 */
export async function hasChildren(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Checking hasChildren:', workspaceId);
    const workspaces = getLocalWorkspaces();
    return workspaces.some((c) => c['Parent Workspace ID'] === workspaceId);
  }
  const { hasChildren } = await import('../services/workspaceHierarchyServiceSheets');
  return hasChildren(accessToken, sheetId, workspaceId);
}

/**
 * WRAPPER: getRootWorkspaces
 * Gets all root workspaces (no parent)
 */
export async function getRootWorkspaces(accessToken, sheetId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting root workspaces');
    const workspaces = getLocalWorkspaces();
    return workspaces.filter((c) => !c['Parent Workspace ID']);
  }
  const { getRootWorkspaces } = await import('../services/workspaceHierarchyServiceSheets');
  return getRootWorkspaces(accessToken, sheetId);
}

/**
 * WRAPPER: addWorkspaceMember
 * Adds member to workspace
 */
export async function addWorkspaceMember(
  accessToken,
  sheetId,
  workspaceId,
  memberEmail,
  role,
  userEmail,
  overrides = ''
) {
  if (isDevMode()) {
    log('[DEV MODE] Adding workspace member:', memberEmail, 'to', workspaceId);
    const members = getLocalWorkspaceMembers();
    const memberId = await generateMemberID(accessToken, sheetId);
    const addedDate = new Date().toISOString();

    const newMember = {
      'Member ID': memberId,
      'Workspace ID': workspaceId,
      'Member Email': memberEmail,
      Role: role,
      'Added Date': addedDate,
      'Added By': userEmail,
      Overrides: overrides,
    };

    members.push(newMember);
    saveLocalWorkspaceMembers(members);

    return {
      id: memberId,
      workspace_id: workspaceId,
      member_email: memberEmail,
      role: role,
      added_date: addedDate,
      added_by: userEmail,
      overrides,
    };
  }
  const { addWorkspaceMember } = await import('../services/workspaceHierarchyServiceSheets');
  return addWorkspaceMember(accessToken, sheetId, workspaceId, memberEmail, role, userEmail, overrides);
}

/**
 * WRAPPER: getWorkspaceMembers
 * Gets all members of a workspace
 */
export async function getWorkspaceMembers(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting members of workspace:', workspaceId);
    const members = getLocalWorkspaceMembers();
    return members.filter((m) => m['Workspace ID'] === workspaceId);
  }
  const { getWorkspaceMembers } = await import('../services/workspaceHierarchyServiceSheets');
  return getWorkspaceMembers(accessToken, sheetId, workspaceId);
}

/**
 * WRAPPER: getUserWorkspaces
 * Gets all workspaces a user is a member of
 */
export async function getUserWorkspaces(accessToken, sheetId, userEmail) {
  if (isDevMode()) {
    log('[DEV MODE] Getting workspaces for user:', userEmail);
    const members = getLocalWorkspaceMembers();
    const userMemberships = members.filter((m) => m['Member Email'] === userEmail);
    const workspaces = getLocalWorkspaces();

    return userMemberships.map((membership) => {
      const workspace = workspaces.find((c) => c['Workspace ID'] === membership['Workspace ID']);
      return {
        ...workspace,
        memberRole: membership['Role'],
        memberOverrides: membership['Overrides'] || '',
      };
    });
  }
  const { getUserWorkspaces } = await import('../services/workspaceHierarchyServiceSheets');
  return getUserWorkspaces(accessToken, sheetId, userEmail);
}

/**
 * WRAPPER: createWorkspaceInvitation
 * Creates workspace invitation
 */
export async function createWorkspaceInvitation(
  accessToken,
  sheetId,
  workspaceId,
  options = {},
  createdBy
) {
  if (isDevMode()) {
    log('[DEV MODE] Creating workspace invitation for:', workspaceId);
    const invitations = getLocalWorkspaceInvitations();
    const invitationId = await generateInvitationID(accessToken, sheetId);

    // Generate token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const createdDate = new Date().toISOString();
    const expiresInDays = options.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const newInvitation = {
      'Invitation ID': invitationId,
      'Workspace ID': workspaceId,
      Token: token,
      'Created By': createdBy,
      'Created Date': createdDate,
      'Expires At': expiresAt.toISOString(),
      'Max Uses': options.maxUses || '',
      'Current Uses': '0',
      Role: options.role || 'editor',
      'Is Active': 'TRUE',
      'Default Overrides': options.defaultOverrides || '',
    };

    invitations.push(newInvitation);
    saveLocalWorkspaceInvitations(invitations);

    return {
      id: invitationId,
      workspace_id: workspaceId,
      token,
      created_by: createdBy,
      created_at: createdDate,
      expires_at: expiresAt.toISOString(),
      max_uses: options.maxUses || null,
      current_uses: 0,
      role: options.role || 'editor',
      is_active: true,
      default_overrides: options.defaultOverrides || '',
    };
  }
  const { createWorkspaceInvitation } = await import('../services/workspaceHierarchyServiceSheets');
  return createWorkspaceInvitation(accessToken, sheetId, workspaceId, options, createdBy);
}

/**
 * WRAPPER: updateWorkspaceMember
 * Updates a workspace member's role and/or overrides
 */
export async function updateWorkspaceMember(accessToken, sheetId, memberId, updates) {
  if (isDevMode()) {
    log('[DEV MODE] Updating workspace member:', memberId, updates);
    const members = getLocalWorkspaceMembers();
    const idx = members.findIndex((m) => m['Member ID'] === memberId);
    if (idx === -1) throw new Error(`Member ${memberId} not found`);
    if (updates.role !== undefined) members[idx]['Role'] = updates.role;
    if (updates.overrides !== undefined) members[idx]['Overrides'] = updates.overrides;
    saveLocalWorkspaceMembers(members);
    return { ...members[idx] };
  }
  const { updateWorkspaceMember } = await import('../services/workspaceHierarchyServiceSheets');
  return updateWorkspaceMember(accessToken, sheetId, memberId, updates);
}

/**
 * WRAPPER: removeWorkspaceMember
 * Removes a member from a workspace
 */
export async function removeWorkspaceMember(accessToken, sheetId, memberId) {
  if (isDevMode()) {
    log('[DEV MODE] Removing workspace member:', memberId);
    const members = getLocalWorkspaceMembers();
    const filtered = members.filter((m) => m['Member ID'] !== memberId);
    saveLocalWorkspaceMembers(filtered);
    return { success: true };
  }
  const { removeWorkspaceMember } = await import('../services/workspaceHierarchyServiceSheets');
  return removeWorkspaceMember(accessToken, sheetId, memberId);
}

/**
 * WRAPPER: getWorkspaceInvitations
 * Gets all invitations for a workspace
 */
export async function getWorkspaceInvitations(accessToken, sheetId, workspaceId) {
  if (isDevMode()) {
    log('[DEV MODE] Getting invitations for workspace:', workspaceId);
    const invitations = getLocalWorkspaceInvitations();
    return invitations
      .filter((inv) => inv['Workspace ID'] === workspaceId)
      .map((row) => ({
        id: row['Invitation ID'],
        workspace_id: row['Workspace ID'],
        token: row['Token'],
        created_by: row['Created By'],
        created_at: row['Created Date'],
        expires_at: row['Expires At'],
        max_uses: row['Max Uses'] ? parseInt(row['Max Uses'], 10) : null,
        current_uses: parseInt(row['Current Uses'] || '0', 10),
        role: row['Role'],
        is_active: row['Is Active'] === 'TRUE',
      }));
  }
  const { getWorkspaceInvitations } = await import('../services/workspaceHierarchyServiceSheets');
  return getWorkspaceInvitations(accessToken, sheetId, workspaceId);
}

/**
 * ============================================================================
 * CONTACT RELATIONSHIP SERVICE
 * ============================================================================
 * Re-export all relationship service functions
 * These handle relationship network (family, professional, social connections)
 */
export {
  createRelationship,
  updateRelationship,
  deleteRelationship,
  getContactRelationships,
  getAllRelationships,
  getRelationshipNetwork,
  findPath,
  expandBidirectionalRelationships,
  convertToGraphData,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_SUBTYPES,
  RELATIONSHIP_STRENGTH,
} from '../services/contactRelationshipService';

// Import junction tab localStorage helpers
import {
  getLocalContactSocials,
  saveLocalContactSocials,
  getLocalContactEducation,
  saveLocalContactEducation,
  getLocalContactEmployment,
  saveLocalContactEmployment,
  getLocalContactDistricts,
  saveLocalContactDistricts,
  getLocalContactMethods,
  saveLocalContactMethods,
  getLocalContactAttributes,
  saveLocalContactAttributes,
} from '../__tests__/fixtures/seedTestData';

// ============================================================================
// CONTACT SOCIALS JUNCTION TAB (Phase A)
// ============================================================================

export const generateSocialID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const socials = getLocalContactSocials();
    if (socials.length === 0) return 'SOC001';
    const ids = socials
      .map((s) => s['Social ID'])
      .filter((id) => id && id.match(/^SOC\d+$/))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `SOC${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(accessToken, sheetId, SHEET_NAMES.CONTACT_SOCIALS, 'Social ID', 'SOC');
};

export const addContactSocial = async (accessToken, sheetId, socialData) => {
  if (isDevMode()) {
    const socials = getLocalContactSocials();
    const socialId = await generateSocialID(accessToken, sheetId);
    const newSocial = { 'Social ID': socialId, ...socialData };
    socials.push(newSocial);
    saveLocalContactSocials(socials);
    return newSocial;
  }
  const socialId = await generateSocialID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_SOCIALS, {
    'Social ID': socialId,
    ...socialData,
  });
};

export const updateContactSocial = async (accessToken, sheetId, socialId, updatedData) => {
  if (isDevMode()) {
    const socials = getLocalContactSocials();
    const index = socials.findIndex((s) => s['Social ID'] === socialId);
    if (index === -1) throw new Error('Social not found');
    socials[index] = { ...socials[index], ...updatedData, 'Social ID': socialId };
    saveLocalContactSocials(socials);
    return socials[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_SOCIALS,
    'Social ID',
    socialId,
    updatedData
  );
};

export const deleteContactSocial = async (accessToken, sheetId, socialId) => {
  if (isDevMode()) {
    const socials = getLocalContactSocials();
    const filtered = socials.filter((s) => s['Social ID'] !== socialId);
    saveLocalContactSocials(filtered);
    return { success: true };
  }
  return deleteSheetRow(accessToken, sheetId, SHEET_NAMES.CONTACT_SOCIALS, 'Social ID', socialId);
};

export const getContactSocials = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const socials = getLocalContactSocials();
    return socials.filter((s) => s['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_SOCIALS);
  return data.filter((s) => s['Contact ID'] === contactId);
};

// ============================================================================
// CONTACT EDUCATION JUNCTION TAB (Phase A)
// ============================================================================

export const generateEducationID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const education = getLocalContactEducation();
    if (education.length === 0) return 'EDU001';
    const ids = education
      .map((e) => e['Education ID'])
      .filter((id) => id && id.match(/^EDU\d+$/))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `EDU${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(accessToken, sheetId, SHEET_NAMES.CONTACT_EDUCATION, 'Education ID', 'EDU');
};

export const addContactEducation = async (accessToken, sheetId, educationData) => {
  if (isDevMode()) {
    const education = getLocalContactEducation();
    const educationId = await generateEducationID(accessToken, sheetId);
    const newEducation = { 'Education ID': educationId, ...educationData };
    education.push(newEducation);
    saveLocalContactEducation(education);
    return newEducation;
  }
  const educationId = await generateEducationID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_EDUCATION, {
    'Education ID': educationId,
    ...educationData,
  });
};

export const updateContactEducation = async (accessToken, sheetId, educationId, updatedData) => {
  if (isDevMode()) {
    const education = getLocalContactEducation();
    const index = education.findIndex((e) => e['Education ID'] === educationId);
    if (index === -1) throw new Error('Education not found');
    education[index] = { ...education[index], ...updatedData, 'Education ID': educationId };
    saveLocalContactEducation(education);
    return education[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_EDUCATION,
    'Education ID',
    educationId,
    updatedData
  );
};

export const deleteContactEducation = async (accessToken, sheetId, educationId) => {
  if (isDevMode()) {
    const education = getLocalContactEducation();
    const filtered = education.filter((e) => e['Education ID'] !== educationId);
    saveLocalContactEducation(filtered);
    return { success: true };
  }
  return deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_EDUCATION,
    'Education ID',
    educationId
  );
};

export const getContactEducation = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const education = getLocalContactEducation();
    return education.filter((e) => e['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_EDUCATION);
  return data.filter((e) => e['Contact ID'] === contactId);
};

// ============================================================================
// CONTACT EMPLOYMENT JUNCTION TAB (Phase A)
// ============================================================================

export const generateEmploymentID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const employment = getLocalContactEmployment();
    if (employment.length === 0) return 'EMP001';
    const ids = employment
      .map((e) => e['Employment ID'])
      .filter((id) => id && id.match(/^EMP\d+$/))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `EMP${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(accessToken, sheetId, SHEET_NAMES.CONTACT_EMPLOYMENT, 'Employment ID', 'EMP');
};

export const addContactEmployment = async (accessToken, sheetId, employmentData) => {
  if (isDevMode()) {
    const employment = getLocalContactEmployment();
    const employmentId = await generateEmploymentID(accessToken, sheetId);
    const newEmployment = { 'Employment ID': employmentId, ...employmentData };
    employment.push(newEmployment);
    saveLocalContactEmployment(employment);
    return newEmployment;
  }
  const employmentId = await generateEmploymentID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_EMPLOYMENT, {
    'Employment ID': employmentId,
    ...employmentData,
  });
};

export const updateContactEmployment = async (accessToken, sheetId, employmentId, updatedData) => {
  if (isDevMode()) {
    const employment = getLocalContactEmployment();
    const index = employment.findIndex((e) => e['Employment ID'] === employmentId);
    if (index === -1) throw new Error('Employment not found');
    employment[index] = { ...employment[index], ...updatedData, 'Employment ID': employmentId };
    saveLocalContactEmployment(employment);
    return employment[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_EMPLOYMENT,
    'Employment ID',
    employmentId,
    updatedData
  );
};

export const deleteContactEmployment = async (accessToken, sheetId, employmentId) => {
  if (isDevMode()) {
    const employment = getLocalContactEmployment();
    const filtered = employment.filter((e) => e['Employment ID'] !== employmentId);
    saveLocalContactEmployment(filtered);
    return { success: true };
  }
  return deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_EMPLOYMENT,
    'Employment ID',
    employmentId
  );
};

export const getContactEmployment = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const employment = getLocalContactEmployment();
    return employment.filter((e) => e['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_EMPLOYMENT);
  return data.filter((e) => e['Contact ID'] === contactId);
};

// ============================================================================
// CONTACT DISTRICTS JUNCTION TAB (Phase A)
// ============================================================================

export const generateDistrictID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const districts = getLocalContactDistricts();
    if (districts.length === 0) return 'DST001';
    const ids = districts
      .map((d) => d['District ID'])
      .filter((id) => id && id.match(/^DST\d+$/))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `DST${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(accessToken, sheetId, SHEET_NAMES.CONTACT_DISTRICTS, 'District ID', 'DST');
};

export const addContactDistrict = async (accessToken, sheetId, districtData) => {
  if (isDevMode()) {
    const districts = getLocalContactDistricts();
    const districtId = await generateDistrictID(accessToken, sheetId);
    const newDistrict = { 'District ID': districtId, ...districtData };
    districts.push(newDistrict);
    saveLocalContactDistricts(districts);
    return newDistrict;
  }
  const districtId = await generateDistrictID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_DISTRICTS, {
    'District ID': districtId,
    ...districtData,
  });
};

export const updateContactDistrict = async (accessToken, sheetId, districtId, updatedData) => {
  if (isDevMode()) {
    const districts = getLocalContactDistricts();
    const index = districts.findIndex((d) => d['District ID'] === districtId);
    if (index === -1) throw new Error('District not found');
    districts[index] = { ...districts[index], ...updatedData, 'District ID': districtId };
    saveLocalContactDistricts(districts);
    return districts[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_DISTRICTS,
    'District ID',
    districtId,
    updatedData
  );
};

export const deleteContactDistrict = async (accessToken, sheetId, districtId) => {
  if (isDevMode()) {
    const districts = getLocalContactDistricts();
    const filtered = districts.filter((d) => d['District ID'] !== districtId);
    saveLocalContactDistricts(filtered);
    return { success: true };
  }
  return deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_DISTRICTS,
    'District ID',
    districtId
  );
};

export const getContactDistricts = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const districts = getLocalContactDistricts();
    return districts.filter((d) => d['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_DISTRICTS);
  return data.filter((d) => d['Contact ID'] === contactId);
};

// ============================================================================
// CONTACT METHODS JUNCTION TAB
// ============================================================================

export const generateContactMethodID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const methods = getLocalContactMethods();
    if (methods.length === 0) return 'CM001';
    const ids = methods
      .map((m) => m['Contact Method ID'])
      .filter((id) => id && id.match(/^CM\d+$/))
      .map((id) => parseInt(id.substring(2), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `CM${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(accessToken, sheetId, SHEET_NAMES.CONTACT_METHODS, 'Contact Method ID', 'CM');
};

export const addContactMethod = async (accessToken, sheetId, methodData) => {
  if (isDevMode()) {
    const methods = getLocalContactMethods();
    const methodId = await generateContactMethodID(accessToken, sheetId);
    const newMethod = { 'Contact Method ID': methodId, ...methodData };
    methods.push(newMethod);
    saveLocalContactMethods(methods);
    return newMethod;
  }
  const methodId = await generateContactMethodID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_METHODS, {
    'Contact Method ID': methodId,
    ...methodData,
  });
};

export const updateContactMethod = async (accessToken, sheetId, methodId, updatedData) => {
  if (isDevMode()) {
    const methods = getLocalContactMethods();
    const index = methods.findIndex((m) => m['Contact Method ID'] === methodId);
    if (index === -1) throw new Error('Contact method not found');
    methods[index] = { ...methods[index], ...updatedData, 'Contact Method ID': methodId };
    saveLocalContactMethods(methods);
    return methods[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_METHODS,
    'Contact Method ID',
    methodId,
    updatedData
  );
};

export const deleteContactMethod = async (accessToken, sheetId, methodId) => {
  if (isDevMode()) {
    const methods = getLocalContactMethods();
    const filtered = methods.filter((m) => m['Contact Method ID'] !== methodId);
    saveLocalContactMethods(filtered);
    return { success: true };
  }
  return deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_METHODS,
    'Contact Method ID',
    methodId
  );
};

export const getContactMethods = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const methods = getLocalContactMethods();
    return methods.filter((m) => m['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_METHODS);
  return data.filter((m) => m['Contact ID'] === contactId);
};

// ============================================================================
// CONTACT ATTRIBUTES JUNCTION TAB
// ============================================================================

export const generateAttributeID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const attrs = getLocalContactAttributes();
    if (attrs.length === 0) return 'ATTR001';
    const ids = attrs
      .map((a) => a['Attribute ID'])
      .filter((id) => id && id.match(/^ATTR\d+$/))
      .map((id) => parseInt(id.substring(4), 10))
      .filter((num) => !isNaN(num));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `ATTR${String(maxId + 1).padStart(3, '0')}`;
  }
  return generateID(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_ATTRIBUTES,
    'Attribute ID',
    'ATTR'
  );
};

export const addContactAttribute = async (accessToken, sheetId, attributeData) => {
  if (isDevMode()) {
    const attrs = getLocalContactAttributes();
    const attrId = await generateAttributeID(accessToken, sheetId);
    const newAttr = { 'Attribute ID': attrId, ...attributeData };
    attrs.push(newAttr);
    saveLocalContactAttributes(attrs);
    return newAttr;
  }
  const attrId = await generateAttributeID(accessToken, sheetId);
  return appendSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_ATTRIBUTES, {
    'Attribute ID': attrId,
    ...attributeData,
  });
};

export const updateContactAttribute = async (accessToken, sheetId, attrId, updatedData) => {
  if (isDevMode()) {
    const attrs = getLocalContactAttributes();
    const index = attrs.findIndex((a) => a['Attribute ID'] === attrId);
    if (index === -1) throw new Error('Contact attribute not found');
    attrs[index] = { ...attrs[index], ...updatedData, 'Attribute ID': attrId };
    saveLocalContactAttributes(attrs);
    return attrs[index];
  }
  return updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_ATTRIBUTES,
    'Attribute ID',
    attrId,
    updatedData
  );
};

export const deleteContactAttribute = async (accessToken, sheetId, attrId) => {
  if (isDevMode()) {
    const attrs = getLocalContactAttributes();
    const filtered = attrs.filter((a) => a['Attribute ID'] !== attrId);
    saveLocalContactAttributes(filtered);
    return { success: true };
  }
  return deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.CONTACT_ATTRIBUTES,
    'Attribute ID',
    attrId
  );
};

export const getContactAttributes = async (accessToken, sheetId, contactId) => {
  if (isDevMode()) {
    const attrs = getLocalContactAttributes();
    return attrs.filter((a) => a['Contact ID'] === contactId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACT_ATTRIBUTES);
  return data.filter((a) => a['Contact ID'] === contactId);
};

// ============================================================================
// EVENT JUNCTION TABLES (Event Attendees, Event Resources, Event Agenda)
// ============================================================================

/**
 * Event Attendees CRUD
 */
export const generateAttendeeID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const attendees = getLocalEventAttendees();
    const maxId = attendees.reduce((max, a) => {
      const num = parseInt(a['Attendee ID']?.replace('ATT', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `ATT${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_ATTENDEES
  );
  return generateID(allData.data, 'Attendee ID', 'ATT');
};

export const addEventAttendee = async (accessToken, sheetId, attendeeData) => {
  if (isDevMode()) {
    const attendees = getLocalEventAttendees();
    const attendeeId = await generateAttendeeID(accessToken, sheetId);
    const newAttendee = {
      'Attendee ID': attendeeId,
      'Event ID': attendeeData['Event ID'] || '',
      'Contact ID': attendeeData['Contact ID'] || '',
      'Contact Name': attendeeData['Contact Name'] || '',
      'RSVP Status': attendeeData['RSVP Status'] || 'No Response',
      'Check-In Time': attendeeData['Check-In Time'] || '',
      Role: attendeeData.Role || 'Attendee',
      Notes: attendeeData.Notes || '',
    };
    attendees.push(newAttendee);
    saveLocalEventAttendees(attendees);
    return newAttendee;
  }
  const attendeeId = await generateAttendeeID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_ATTENDEES, {
    'Attendee ID': attendeeId,
    ...attendeeData,
  });
};

export const updateEventAttendee = async (accessToken, sheetId, attendeeId, updatedData) => {
  if (isDevMode()) {
    const attendees = getLocalEventAttendees();
    const index = attendees.findIndex((a) => a['Attendee ID'] === attendeeId);
    if (index !== -1) {
      attendees[index] = { ...attendees[index], ...updatedData };
      saveLocalEventAttendees(attendees);
      return attendees[index];
    }
    throw new Error('Attendee not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_ATTENDEES,
    'Attendee ID',
    attendeeId,
    updatedData
  );
};

export const deleteEventAttendee = async (accessToken, sheetId, attendeeId) => {
  if (isDevMode()) {
    const attendees = getLocalEventAttendees();
    const filtered = attendees.filter((a) => a['Attendee ID'] !== attendeeId);
    saveLocalEventAttendees(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_ATTENDEES,
    'Attendee ID',
    attendeeId
  );
};

export const getEventAttendees = async (accessToken, sheetId, eventId) => {
  if (isDevMode()) {
    const attendees = getLocalEventAttendees();
    return attendees.filter((a) => a['Event ID'] === eventId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_ATTENDEES);
  return data.filter((a) => a['Event ID'] === eventId);
};

/**
 * Event Resources CRUD
 */
export const generateResourceID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const resources = getLocalEventResources();
    const maxId = resources.reduce((max, r) => {
      const num = parseInt(r['Resource ID']?.replace('RES', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `RES${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_RESOURCES
  );
  return generateID(allData.data, 'Resource ID', 'RES');
};

export const addEventResource = async (accessToken, sheetId, resourceData) => {
  if (isDevMode()) {
    const resources = getLocalEventResources();
    const resourceId = await generateResourceID(accessToken, sheetId);
    const newResource = {
      'Resource ID': resourceId,
      'Event ID': resourceData['Event ID'] || '',
      'Resource Type': resourceData['Resource Type'] || '',
      'Item Name': resourceData['Item Name'] || '',
      Quantity: resourceData.Quantity || '',
      'Cost Per Unit': resourceData['Cost Per Unit'] || '',
      'Total Cost': resourceData['Total Cost'] || '',
      'Provider/Source': resourceData['Provider/Source'] || '',
      Notes: resourceData.Notes || '',
    };
    resources.push(newResource);
    saveLocalEventResources(resources);
    return newResource;
  }
  const resourceId = await generateResourceID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_RESOURCES, {
    'Resource ID': resourceId,
    ...resourceData,
  });
};

export const updateEventResource = async (accessToken, sheetId, resourceId, updatedData) => {
  if (isDevMode()) {
    const resources = getLocalEventResources();
    const index = resources.findIndex((r) => r['Resource ID'] === resourceId);
    if (index !== -1) {
      resources[index] = { ...resources[index], ...updatedData };
      saveLocalEventResources(resources);
      return resources[index];
    }
    throw new Error('Resource not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_RESOURCES,
    'Resource ID',
    resourceId,
    updatedData
  );
};

export const deleteEventResource = async (accessToken, sheetId, resourceId) => {
  if (isDevMode()) {
    const resources = getLocalEventResources();
    const filtered = resources.filter((r) => r['Resource ID'] !== resourceId);
    saveLocalEventResources(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_RESOURCES,
    'Resource ID',
    resourceId
  );
};

export const getEventResources = async (accessToken, sheetId, eventId) => {
  if (isDevMode()) {
    const resources = getLocalEventResources();
    return resources.filter((r) => r['Event ID'] === eventId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_RESOURCES);
  return data.filter((r) => r['Event ID'] === eventId);
};

/**
 * Event Agenda CRUD
 */
export const generateAgendaItemID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const agendaItems = getLocalEventAgenda();
    const maxId = agendaItems.reduce((max, a) => {
      const num = parseInt(a['Agenda Item ID']?.replace('AGD', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `AGD${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_AGENDA);
  return generateID(allData.data, 'Agenda Item ID', 'AGD');
};

export const addEventAgendaItem = async (accessToken, sheetId, agendaData) => {
  if (isDevMode()) {
    const agendaItems = getLocalEventAgenda();
    const agendaItemId = await generateAgendaItemID(accessToken, sheetId);
    const newItem = {
      'Agenda Item ID': agendaItemId,
      'Event ID': agendaData['Event ID'] || '',
      'Start Time': agendaData['Start Time'] || '',
      'End Time': agendaData['End Time'] || '',
      'Duration (Minutes)': agendaData['Duration (Minutes)'] || '',
      Title: agendaData.Title || '',
      Description: agendaData.Description || '',
      'Speaker Contact ID': agendaData['Speaker Contact ID'] || '',
      'Speaker Name': agendaData['Speaker Name'] || '',
      'Location/Room': agendaData['Location/Room'] || '',
      Notes: agendaData.Notes || '',
    };
    agendaItems.push(newItem);
    saveLocalEventAgenda(agendaItems);
    return newItem;
  }
  const agendaItemId = await generateAgendaItemID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_AGENDA, {
    'Agenda Item ID': agendaItemId,
    ...agendaData,
  });
};

export const updateEventAgendaItem = async (accessToken, sheetId, agendaItemId, updatedData) => {
  if (isDevMode()) {
    const agendaItems = getLocalEventAgenda();
    const index = agendaItems.findIndex((a) => a['Agenda Item ID'] === agendaItemId);
    if (index !== -1) {
      agendaItems[index] = { ...agendaItems[index], ...updatedData };
      saveLocalEventAgenda(agendaItems);
      return agendaItems[index];
    }
    throw new Error('Agenda item not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_AGENDA,
    'Agenda Item ID',
    agendaItemId,
    updatedData
  );
};

export const deleteEventAgendaItem = async (accessToken, sheetId, agendaItemId) => {
  if (isDevMode()) {
    const agendaItems = getLocalEventAgenda();
    const filtered = agendaItems.filter((a) => a['Agenda Item ID'] !== agendaItemId);
    saveLocalEventAgenda(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.EVENT_AGENDA,
    'Agenda Item ID',
    agendaItemId
  );
};

export const getEventAgendaItems = async (accessToken, sheetId, eventId) => {
  if (isDevMode()) {
    const agendaItems = getLocalEventAgenda();
    return agendaItems.filter((a) => a['Event ID'] === eventId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.EVENT_AGENDA);
  return data.filter((a) => a['Event ID'] === eventId);
};

// ============================================================================
// ORGANIZATION JUNCTION TABLES (Org Contacts, Org Departments)
// ============================================================================

/**
 * Organization Contacts CRUD
 */
export const generateOrgContactID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const orgContacts = getLocalOrgContacts();
    const maxId = orgContacts.reduce((max, oc) => {
      const num = parseInt(oc['Org Contact ID']?.replace('OCT', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `OCT${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(accessToken, sheetId, SHEET_NAMES.ORG_CONTACTS);
  return generateID(allData.data, 'Org Contact ID', 'OCT');
};

export const addOrgContact = async (accessToken, sheetId, contactData) => {
  if (isDevMode()) {
    const orgContacts = getLocalOrgContacts();
    const orgContactId = await generateOrgContactID(accessToken, sheetId);
    const newOrgContact = {
      'Org Contact ID': orgContactId,
      'Organization ID': contactData['Organization ID'] || '',
      'Contact ID': contactData['Contact ID'] || '',
      'Contact Name': contactData['Contact Name'] || '',
      'Role/Title': contactData['Role/Title'] || '',
      Department: contactData.Department || '',
      'Start Date': contactData['Start Date'] || '',
      'End Date': contactData['End Date'] || '',
      'Is Current': contactData['Is Current'] || 'FALSE',
      'Is Primary Contact': contactData['Is Primary Contact'] || 'FALSE',
      Notes: contactData.Notes || '',
    };
    orgContacts.push(newOrgContact);
    saveLocalOrgContacts(orgContacts);
    return newOrgContact;
  }
  const orgContactId = await generateOrgContactID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.ORG_CONTACTS, {
    'Org Contact ID': orgContactId,
    ...contactData,
  });
};

export const updateOrgContact = async (accessToken, sheetId, orgContactId, updatedData) => {
  if (isDevMode()) {
    const orgContacts = getLocalOrgContacts();
    const index = orgContacts.findIndex((oc) => oc['Org Contact ID'] === orgContactId);
    if (index !== -1) {
      orgContacts[index] = { ...orgContacts[index], ...updatedData };
      saveLocalOrgContacts(orgContacts);
      return orgContacts[index];
    }
    throw new Error('Organization contact not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.ORG_CONTACTS,
    'Org Contact ID',
    orgContactId,
    updatedData
  );
};

export const deleteOrgContact = async (accessToken, sheetId, orgContactId) => {
  if (isDevMode()) {
    const orgContacts = getLocalOrgContacts();
    const filtered = orgContacts.filter((oc) => oc['Org Contact ID'] !== orgContactId);
    saveLocalOrgContacts(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.ORG_CONTACTS,
    'Org Contact ID',
    orgContactId
  );
};

export const getOrgContacts = async (accessToken, sheetId, organizationId) => {
  if (isDevMode()) {
    const orgContacts = getLocalOrgContacts();
    return orgContacts.filter((oc) => oc['Organization ID'] === organizationId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORG_CONTACTS);
  return data.filter((oc) => oc['Organization ID'] === organizationId);
};

/**
 * Organization Departments CRUD
 */
export const generateDepartmentID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const departments = getLocalOrgDepartments();
    const maxId = departments.reduce((max, d) => {
      const num = parseInt(d['Department ID']?.replace('DPT', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `DPT${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.ORG_DEPARTMENTS
  );
  return generateID(allData.data, 'Department ID', 'DPT');
};

export const addOrgDepartment = async (accessToken, sheetId, departmentData) => {
  if (isDevMode()) {
    const departments = getLocalOrgDepartments();
    const departmentId = await generateDepartmentID(accessToken, sheetId);
    const newDepartment = {
      'Department ID': departmentId,
      'Organization ID': departmentData['Organization ID'] || '',
      'Department Name': departmentData['Department Name'] || '',
      'Department Type': departmentData['Department Type'] || '',
      Phone: departmentData.Phone || '',
      Email: departmentData.Email || '',
      'Head Contact ID': departmentData['Head Contact ID'] || '',
      'Head Contact Name': departmentData['Head Contact Name'] || '',
      Size: departmentData.Size || '',
      Notes: departmentData.Notes || '',
    };
    departments.push(newDepartment);
    saveLocalOrgDepartments(departments);
    return newDepartment;
  }
  const departmentId = await generateDepartmentID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.ORG_DEPARTMENTS, {
    'Department ID': departmentId,
    ...departmentData,
  });
};

export const updateOrgDepartment = async (accessToken, sheetId, departmentId, updatedData) => {
  if (isDevMode()) {
    const departments = getLocalOrgDepartments();
    const index = departments.findIndex((d) => d['Department ID'] === departmentId);
    if (index !== -1) {
      departments[index] = { ...departments[index], ...updatedData };
      saveLocalOrgDepartments(departments);
      return departments[index];
    }
    throw new Error('Department not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.ORG_DEPARTMENTS,
    'Department ID',
    departmentId,
    updatedData
  );
};

export const deleteOrgDepartment = async (accessToken, sheetId, departmentId) => {
  if (isDevMode()) {
    const departments = getLocalOrgDepartments();
    const filtered = departments.filter((d) => d['Department ID'] !== departmentId);
    saveLocalOrgDepartments(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.ORG_DEPARTMENTS,
    'Department ID',
    departmentId
  );
};

export const getOrgDepartments = async (accessToken, sheetId, organizationId) => {
  if (isDevMode()) {
    const departments = getLocalOrgDepartments();
    return departments.filter((d) => d['Organization ID'] === organizationId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORG_DEPARTMENTS);
  return data.filter((d) => d['Organization ID'] === organizationId);
};

// ============================================================================
// TASK JUNCTION TABLES (Task Checklist, Task Time Entries)
// ============================================================================

/**
 * Task Checklist CRUD
 */
export const generateChecklistItemID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const items = getLocalTaskChecklist();
    const maxId = items.reduce((max, item) => {
      const num = parseInt(item['Checklist Item ID']?.replace('CHK', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `CHK${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_CHECKLIST
  );
  return generateID(allData.data, 'Checklist Item ID', 'CHK');
};

export const addTaskChecklistItem = async (accessToken, sheetId, itemData) => {
  if (isDevMode()) {
    const items = getLocalTaskChecklist();
    const itemId = await generateChecklistItemID(accessToken, sheetId);
    const newItem = {
      'Checklist Item ID': itemId,
      'Task ID': itemData['Task ID'] || '',
      'Item Text': itemData['Item Text'] || '',
      'Is Completed': itemData['Is Completed'] || 'FALSE',
      'Completed Date': itemData['Completed Date'] || '',
      'Assigned To': itemData['Assigned To'] || '',
      'Assigned To Name': itemData['Assigned To Name'] || '',
      'Display Order': itemData['Display Order'] || '',
      Notes: itemData.Notes || '',
    };
    items.push(newItem);
    saveLocalTaskChecklist(items);
    return newItem;
  }
  const itemId = await generateChecklistItemID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.TASK_CHECKLIST, {
    'Checklist Item ID': itemId,
    ...itemData,
  });
};

export const updateTaskChecklistItem = async (accessToken, sheetId, itemId, updatedData) => {
  if (isDevMode()) {
    const items = getLocalTaskChecklist();
    const index = items.findIndex((item) => item['Checklist Item ID'] === itemId);
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedData };
      saveLocalTaskChecklist(items);
      return items[index];
    }
    throw new Error('Checklist item not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_CHECKLIST,
    'Checklist Item ID',
    itemId,
    updatedData
  );
};

export const deleteTaskChecklistItem = async (accessToken, sheetId, itemId) => {
  if (isDevMode()) {
    const items = getLocalTaskChecklist();
    const filtered = items.filter((item) => item['Checklist Item ID'] !== itemId);
    saveLocalTaskChecklist(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_CHECKLIST,
    'Checklist Item ID',
    itemId
  );
};

export const getTaskChecklistItems = async (accessToken, sheetId, taskId) => {
  if (isDevMode()) {
    const items = getLocalTaskChecklist();
    return items.filter((item) => item['Task ID'] === taskId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.TASK_CHECKLIST);
  return data.filter((item) => item['Task ID'] === taskId);
};

/**
 * Task Time Entries CRUD
 */
export const generateTimeEntryID = async (accessToken, sheetId) => {
  if (isDevMode()) {
    const entries = getLocalTaskTimeEntries();
    const maxId = entries.reduce((max, entry) => {
      const num = parseInt(entry['Time Entry ID']?.replace('TME', '') || '0', 10);
      return Math.max(max, num);
    }, 0);
    return `TME${String(maxId + 1).padStart(3, '0')}`;
  }
  const allData = await sheetsModule.readSheetData(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_TIME_ENTRIES
  );
  return generateID(allData.data, 'Time Entry ID', 'TME');
};

export const addTaskTimeEntry = async (accessToken, sheetId, entryData) => {
  if (isDevMode()) {
    const entries = getLocalTaskTimeEntries();
    const entryId = await generateTimeEntryID(accessToken, sheetId);
    const newEntry = {
      'Time Entry ID': entryId,
      'Task ID': entryData['Task ID'] || '',
      'Contact ID': entryData['Contact ID'] || '',
      'Contact Name': entryData['Contact Name'] || '',
      'Start Time': entryData['Start Time'] || '',
      'End Time': entryData['End Time'] || '',
      'Duration (Hours)': entryData['Duration (Hours)'] || '',
      Date: entryData.Date || '',
      Notes: entryData.Notes || '',
    };
    entries.push(newEntry);
    saveLocalTaskTimeEntries(entries);
    return newEntry;
  }
  const entryId = await generateTimeEntryID(accessToken, sheetId);
  return await appendSheetData(accessToken, sheetId, SHEET_NAMES.TASK_TIME_ENTRIES, {
    'Time Entry ID': entryId,
    ...entryData,
  });
};

export const updateTaskTimeEntry = async (accessToken, sheetId, entryId, updatedData) => {
  if (isDevMode()) {
    const entries = getLocalTaskTimeEntries();
    const index = entries.findIndex((entry) => entry['Time Entry ID'] === entryId);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updatedData };
      saveLocalTaskTimeEntries(entries);
      return entries[index];
    }
    throw new Error('Time entry not found');
  }
  return await updateSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_TIME_ENTRIES,
    'Time Entry ID',
    entryId,
    updatedData
  );
};

export const deleteTaskTimeEntry = async (accessToken, sheetId, entryId) => {
  if (isDevMode()) {
    const entries = getLocalTaskTimeEntries();
    const filtered = entries.filter((entry) => entry['Time Entry ID'] !== entryId);
    saveLocalTaskTimeEntries(filtered);
    return;
  }
  return await deleteSheetRow(
    accessToken,
    sheetId,
    SHEET_NAMES.TASK_TIME_ENTRIES,
    'Time Entry ID',
    entryId
  );
};

export const getTaskTimeEntries = async (accessToken, sheetId, taskId) => {
  if (isDevMode()) {
    const entries = getLocalTaskTimeEntries();
    return entries.filter((entry) => entry['Task ID'] === taskId);
  }
  const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.TASK_TIME_ENTRIES);
  return data.filter((entry) => entry['Task ID'] === taskId);
};

// ============================================================================
// GOOGLE CALENDAR API WRAPPERS
// ============================================================================

let calendarDevIdCounter = 0;

function generateCalendarDevId() {
  calendarDevIdCounter++;
  return `gcal_dev_${String(calendarDevIdCounter).padStart(3, '0')}`;
}

/**
 * WRAPPER: fetchCalendarList
 * Fetches list of user's Google Calendars
 */
export async function fetchCalendarList(accessToken) {
  if (isDevMode()) {
    log('[DEV MODE] Fetching calendar list (mock data)');
    // Return mock calendar list for dev mode
    return [
      {
        id: 'primary',
        summary: 'Primary Calendar',
        primary: true,
        backgroundColor: '#c2703e',
      },
      {
        id: 'work',
        summary: 'Work Calendar',
        primary: false,
        backgroundColor: '#059669',
      },
    ];
  }
  const { fetchCalendarList } = await import('./calendarApi');
  return fetchCalendarList(accessToken);
}

/**
 * WRAPPER: fetchCalendarEvents
 * Fetches events from Google Calendar (or localStorage in dev mode)
 */
export async function fetchCalendarEvents(accessToken, timeMin, timeMax) {
  if (isDevMode()) {
    log('[DEV MODE] Fetching calendar events:', { timeMin, timeMax });
    const events = getLocalCalendarEvents();
    // Filter by time range if provided
    if (timeMin || timeMax) {
      const min = timeMin ? new Date(timeMin).getTime() : 0;
      const max = timeMax ? new Date(timeMax).getTime() : Infinity;
      return events.filter((e) => {
        const eventTime = new Date(e.start?.dateTime || e.start?.date || 0).getTime();
        return eventTime >= min && eventTime <= max;
      });
    }
    return events;
  }
  const { fetchCalendarEvents } = await import('./calendarApi');
  return fetchCalendarEvents(accessToken, timeMin, timeMax);
}

/**
 * WRAPPER: createCalendarEvent
 * Creates a Google Calendar event (or stores in localStorage in dev mode)
 */
export async function createCalendarEvent(accessToken, eventData, crmEventId) {
  if (isDevMode()) {
    log('[DEV MODE] Creating calendar event:', eventData.summary);
    const events = getLocalCalendarEvents();
    const gcalId = generateCalendarDevId();
    const now = new Date().toISOString();
    const newEvent = {
      id: gcalId,
      ...eventData,
      created: now,
      updated: now,
      extendedProperties: {
        private: {
          touchpointManaged: 'true',
          eventId: crmEventId,
        },
      },
    };
    events.push(newEvent);
    saveLocalCalendarEvents(events);
    return newEvent;
  }
  const { createCalendarEvent } = await import('./calendarApi');
  return createCalendarEvent(accessToken, eventData, crmEventId);
}

/**
 * WRAPPER: updateCalendarEvent
 * Updates a Google Calendar event (or updates localStorage in dev mode)
 */
export async function updateCalendarEvent(accessToken, gcalEventId, eventData) {
  if (isDevMode()) {
    log('[DEV MODE] Updating calendar event:', gcalEventId);
    const events = getLocalCalendarEvents();
    const index = events.findIndex((e) => e.id === gcalEventId);
    if (index === -1) {
      throw new Error(`Calendar event ${gcalEventId} not found`);
    }
    events[index] = {
      ...events[index],
      ...eventData,
      id: gcalEventId,
      updated: new Date().toISOString(),
      extendedProperties: {
        private: {
          touchpointManaged: 'true',
          ...(events[index].extendedProperties?.private || {}),
          ...(eventData.extendedProperties?.private || {}),
        },
      },
    };
    saveLocalCalendarEvents(events);
    return events[index];
  }
  const { updateCalendarEvent } = await import('./calendarApi');
  return updateCalendarEvent(accessToken, gcalEventId, eventData);
}

/**
 * WRAPPER: deleteCalendarEvent
 * Deletes a Google Calendar event (or removes from localStorage in dev mode)
 */
export async function deleteCalendarEvent(accessToken, gcalEventId) {
  if (isDevMode()) {
    log('[DEV MODE] Deleting calendar event:', gcalEventId);
    const events = getLocalCalendarEvents();
    const filtered = events.filter((e) => e.id !== gcalEventId);
    saveLocalCalendarEvents(filtered);
    return;
  }
  const { deleteCalendarEvent } = await import('./calendarApi');
  return deleteCalendarEvent(accessToken, gcalEventId);
}

/**
 * WRAPPER: updateRow
 * Updates an entire row in a sheet (passes through to sheets.js in production)
 */
export const updateRow = (function () {
  const originalFn = sheetsModule.updateRow;
  return async function updateRow(accessToken, sheetId, sheetName, rowIndex, values) {
    if (isDevMode()) {
      log('[DEV MODE] updateRow not needed - use updateContact/updateEvent/etc instead');
      throw new Error('updateRow should not be called directly in dev mode');
    }
    return originalFn(accessToken, sheetId, sheetName, rowIndex, values);
  };
})();

/**
 * WRAPPER: logAuditEntry
 * Logs audit entry (localStorage in dev mode, Audit Log sheet in production)
 */
export const logAuditEntry = (function () {
  const originalFn = sheetsModule.logAuditEntry;
  return async function logAuditEntry(accessToken, sheetId, entry) {
    if (isDevMode()) {
      log('[DEV MODE] Audit entry:', entry);
      // In dev mode, just log to console - no localStorage tracking for audit
      return { success: true };
    }
    return originalFn(accessToken, sheetId, entry);
  };
})();

/**
 * WRAPPER: getSheetIdByName
 * Gets the internal numeric sheet ID for a tab name (dummy in dev, real in production)
 */
export const getSheetIdByName = (function () {
  const originalFn = sheetsModule.getSheetIdByName;
  return async function getSheetIdByName(accessToken, spreadsheetId, sheetName) {
    if (isDevMode()) {
      log('[DEV MODE] getSheetIdByName:', sheetName);
      // Return dummy ID for dev mode
      return 0;
    }
    return originalFn(accessToken, spreadsheetId, sheetName);
  };
})();

/**
 * WRAPPER: createWorkspaceSheetWrapped
 * Creates a new Google Sheet for a workspace (dev mode: uses localStorage namespace)
 */
export async function createWorkspaceSheetWrapped(accessToken, workspaceName) {
  if (isDevMode()) {
    const fakeSheetId = `dev_ws_sheet_${Date.now()}`;
    // Initialize empty data stores for this workspace
    localStorage.setItem(`${fakeSheetId}_Contacts`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Touchpoints`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Events`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Tasks`, JSON.stringify([]));
    localStorage.setItem(`${fakeSheetId}_Notes`, JSON.stringify([]));
    return { sheetId: fakeSheetId, title: `${workspaceName} - Folkbase` };
  }

  const { createWorkspaceSheet } = await import('./driveFolder.js');
  return createWorkspaceSheet(accessToken, workspaceName);
}

/**
 * Re-export everything else from sheets.js as-is
 */
export { SHEETS, AUTO_FIELDS } from './sheets';

// Activity types are already exported at the top

export { getLocalLists, getLocalContactLists };
