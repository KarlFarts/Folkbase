/**
 * Calendar Sync Engine
 *
 * Orchestrates two-way sync between CRM Events (Google Sheets) and Google Calendar.
 *
 * Sync Flow:
 * 1. Fetch all CRM events and Google Calendar events
 * 2. Categorize events (synced, needs push, needs pull, conflicts)
 * 3. Push unsynced CRM events to Calendar
 * 4. Pull Calendar updates to CRM events
 * 5. Detect and return conflicts for user resolution
 */

import { readSheetData } from './devModeWrapper';
import { updateEvent } from './devModeWrapper';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './devModeWrapper';
import { crmEventToGoogleEvent, googleEventToCRMEvent } from './eventTransformers';
import { SHEET_NAMES } from '../config/constants';

/**
 * Main sync function - orchestrates two-way sync
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {object} options - Sync options
 * @param {string} options.timeMin - ISO 8601 start of sync range (default: 30 days ago)
 * @param {string} options.timeMax - ISO 8601 end of sync range (default: 1 year from now)
 * @returns {Promise<object>} Sync result with pushed, pulled, conflicts, personalEvents
 */
export async function syncEvents(accessToken, sheetId, options = {}) {
  const now = new Date();
  const defaultTimeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
  const defaultTimeMax = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate()
  ).toISOString(); // 1 year from now

  const timeMin = options.timeMin || defaultTimeMin;
  const timeMax = options.timeMax || defaultTimeMax;

  // 1. Fetch CRM events and contacts from Google Sheets
  const [{ data: crmEvents }, { data: contacts }] = await Promise.all([
    readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS),
    readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS),
  ]);

  // 2. Fetch Google Calendar events
  const gcalEvents = await fetchCalendarEvents(accessToken, timeMin, timeMax);

  // 3. Categorize events
  const categorized = categorizeEvents(crmEvents, gcalEvents);

  const result = {
    pushed: [],
    pulled: [],
    conflicts: [],
    personalEvents: categorized.personalEvents,
    errors: [],
  };

  // 4. Push CRM events to Calendar (CRM events without Google Calendar ID)
  for (const crmEvent of categorized.needsPush) {
    try {
      const gcalEventData = crmEventToGoogleEvent(crmEvent, contacts);
      const createdGcalEvent = await createCalendarEvent(
        accessToken,
        gcalEventData,
        crmEvent['Event ID']
      );

      // Update CRM event with Google Calendar ID and sync metadata
      await updateEvent(accessToken, sheetId, crmEvent['Event ID'], {
        'Google Calendar ID': createdGcalEvent.id,
        'Last Synced At': new Date().toISOString(),
        'Sync Source': crmEvent['Sync Source'] || 'CRM',
      });

      result.pushed.push({
        eventId: crmEvent['Event ID'],
        eventName: crmEvent['Event Name'],
        gcalId: createdGcalEvent.id,
      });
    } catch (error) {
      result.errors.push({
        eventId: crmEvent['Event ID'],
        eventName: crmEvent['Event Name'],
        operation: 'push',
        error: error.message,
      });
    }
  }

  // 5. Pull Calendar updates to CRM (Calendar events that are Folkbase-managed)
  for (const gcalEvent of categorized.needsPull) {
    try {
      const crmEventId = gcalEvent.extendedProperties?.private?.eventId;
      if (!crmEventId) continue;

      const crmEventData = googleEventToCRMEvent(gcalEvent, contacts);

      await updateEvent(accessToken, sheetId, crmEventId, {
        ...crmEventData,
        'Last Synced At': new Date().toISOString(),
      });

      result.pulled.push({
        eventId: crmEventId,
        eventName: gcalEvent.summary,
        gcalId: gcalEvent.id,
      });
    } catch (error) {
      result.errors.push({
        eventId: gcalEvent.extendedProperties?.private?.eventId,
        eventName: gcalEvent.summary,
        operation: 'pull',
        error: error.message,
      });
    }
  }

  // 6. Detect conflicts (both CRM and Calendar modified since last sync)
  for (const conflict of categorized.conflicts) {
    result.conflicts.push({
      eventId: conflict.crmEvent['Event ID'],
      eventName: conflict.crmEvent['Event Name'],
      crmEvent: conflict.crmEvent,
      gcalEvent: conflict.gcalEvent,
      crmLastModified: conflict.crmEvent['Last Updated'],
      gcalLastModified: conflict.gcalEvent.updated,
      lastSyncedAt: conflict.crmEvent['Last Synced At'],
    });
  }

  return result;
}

/**
 * Categorize events into sync actions needed
 * @param {Array} crmEvents - CRM events from Google Sheets
 * @param {Array} gcalEvents - Google Calendar events
 * @returns {object} Categorized events
 */
function categorizeEvents(crmEvents, gcalEvents) {
  const result = {
    needsPush: [], // CRM events without Google Calendar ID
    needsPull: [], // Calendar events modified after last sync
    conflicts: [], // Modified in both places since last sync
    synced: [], // Already synced and up-to-date
    personalEvents: [], // User's personal calendar events (not Folkbase-managed)
  };

  // Build lookup maps
  const crmEventsByGcalId = {};
  const gcalEventsById = {};

  crmEvents.forEach((event) => {
    if (event['Google Calendar ID']) {
      crmEventsByGcalId[event['Google Calendar ID']] = event;
    }
  });

  gcalEvents.forEach((event) => {
    gcalEventsById[event.id] = event;
  });

  // Categorize CRM events
  crmEvents.forEach((crmEvent) => {
    const gcalId = crmEvent['Google Calendar ID'];

    if (!gcalId) {
      // No Google Calendar ID = needs push
      result.needsPush.push(crmEvent);
      return;
    }

    const gcalEvent = gcalEventsById[gcalId];
    if (!gcalEvent) {
      // Calendar event was deleted, handle gracefully
      // For now, we'll just mark it as needing re-push
      result.needsPush.push(crmEvent);
      return;
    }

    // Check for conflicts
    const lastSynced = crmEvent['Last Synced At'];
    if (lastSynced) {
      const crmModified = new Date(crmEvent['Last Updated'] || 0);
      const gcalModified = new Date(gcalEvent.updated || 0);
      const syncTime = new Date(lastSynced);

      const crmChangedSinceSync = crmModified > syncTime;
      const gcalChangedSinceSync = gcalModified > syncTime;

      if (crmChangedSinceSync && gcalChangedSinceSync) {
        result.conflicts.push({ crmEvent, gcalEvent });
        return;
      }

      if (gcalChangedSinceSync) {
        result.needsPull.push(gcalEvent);
        return;
      }
    }

    result.synced.push({ crmEvent, gcalEvent });
  });

  // Categorize Calendar events (find personal events)
  gcalEvents.forEach((gcalEvent) => {
    const isTouchpointManaged = gcalEvent.extendedProperties?.private?.touchpointManaged === 'true';

    if (!isTouchpointManaged) {
      result.personalEvents.push(gcalEvent);
    }
  });

  return result;
}

/**
 * Resolve a sync conflict by applying user's choice
 * @param {object} conflict - Conflict object from syncEvents result
 * @param {string} resolution - User's choice: 'crm', 'calendar', or 'latest'
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Array} contacts - Optional array of contact objects for attendee matching
 * @returns {Promise<void>}
 */
export async function resolveConflict(conflict, resolution, accessToken, sheetId, contacts = []) {
  const { crmEvent, gcalEvent } = conflict;

  if (resolution === 'crm') {
    // Keep CRM version, overwrite Calendar
    const gcalEventData = crmEventToGoogleEvent(crmEvent, contacts);
    await updateCalendarEvent(accessToken, gcalEvent.id, gcalEventData);

    await updateEvent(accessToken, sheetId, crmEvent['Event ID'], {
      'Last Synced At': new Date().toISOString(),
    });
  } else if (resolution === 'calendar') {
    // Keep Calendar version, overwrite CRM
    const crmEventData = googleEventToCRMEvent(gcalEvent, contacts);
    await updateEvent(accessToken, sheetId, crmEvent['Event ID'], {
      ...crmEventData,
      'Last Synced At': new Date().toISOString(),
    });
  } else if (resolution === 'latest') {
    // Keep whichever was edited most recently
    const crmModified = new Date(crmEvent['Last Updated'] || 0);
    const gcalModified = new Date(gcalEvent.updated || 0);

    if (gcalModified > crmModified) {
      // Calendar is newer
      const crmEventData = googleEventToCRMEvent(gcalEvent, contacts);
      await updateEvent(accessToken, sheetId, crmEvent['Event ID'], {
        ...crmEventData,
        'Last Synced At': new Date().toISOString(),
      });
    } else {
      // CRM is newer
      const gcalEventData = crmEventToGoogleEvent(crmEvent, contacts);
      await updateCalendarEvent(accessToken, gcalEvent.id, gcalEventData);

      await updateEvent(accessToken, sheetId, crmEvent['Event ID'], {
        'Last Synced At': new Date().toISOString(),
      });
    }
  }
}

/**
 * Delete a synced event from both CRM and Calendar
 * @param {string} eventId - CRM Event ID
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<void>}
 */
export async function deleteSyncedEvent(eventId, accessToken, sheetId) {
  // Get the CRM event to find its Google Calendar ID
  const { data: crmEvents } = await readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS);
  const crmEvent = crmEvents.find((e) => e['Event ID'] === eventId);

  if (!crmEvent) {
    throw new Error(`Event ${eventId} not found`);
  }

  // Delete from Calendar if synced
  if (crmEvent['Google Calendar ID'] && crmEvent['Sync Source'] === 'CRM') {
    try {
      await deleteCalendarEvent(accessToken, crmEvent['Google Calendar ID']);
    } catch (error) {
      // Calendar event might already be deleted, continue
      console.warn('Failed to delete calendar event:', error.message);
    }
  }

  // Delete from CRM
  const { deleteEvent } = await import('./devModeWrapper');
  await deleteEvent(accessToken, sheetId, eventId);
}
