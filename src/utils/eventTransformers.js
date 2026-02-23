/**
 * Event Transformers
 *
 * Bidirectional field mapping between CRM Events (Google Sheets rows)
 * and Google Calendar event resources.
 *
 * CRM fields reference: SHEET_HEADERS.Events in src/config/constants.js
 * Google Calendar Event resource: https://developers.google.com/calendar/api/v3/reference/events
 */

/**
 * Convert a CRM event (Sheets row) to a Google Calendar event resource
 * @param {object} crmEvent - CRM event object with sheet column keys
 * @param {Array} contacts - Optional array of contact objects to look up attendee emails
 * @returns {object} Google Calendar event resource
 */
export function crmEventToGoogleEvent(crmEvent, contacts = []) {
  const gcalEvent = {
    summary: crmEvent['Event Name'] || '',
    description: crmEvent['Description'] || '',
    status: mapCrmStatusToGcal(crmEvent['Status']),
  };

  // Add attendees from CRM contacts
  if (crmEvent['Attendees'] && contacts.length > 0) {
    const attendeeIds = crmEvent['Attendees']
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const attendeeEmails = attendeeIds
      .map((contactId) => {
        const contact = contacts.find((c) => c['Contact ID'] === contactId);
        return contact?.Email;
      })
      .filter(Boolean);

    if (attendeeEmails.length > 0) {
      gcalEvent.attendees = attendeeEmails.map((email) => ({ email }));
    }
  }

  // Location: combine Venue Name and Address
  const locationParts = [crmEvent['Venue Name'], crmEvent['Address']].filter(Boolean);
  if (locationParts.length > 0) {
    gcalEvent.location = locationParts.join(', ');
  }

  // Virtual meeting link in description
  if (crmEvent['Virtual Meeting Link']) {
    const link = crmEvent['Virtual Meeting Link'];
    gcalEvent.description = gcalEvent.description
      ? `${gcalEvent.description}\n\nMeeting Link: ${link}`
      : `Meeting Link: ${link}`;
  }

  // Date/time handling
  const timeZone = crmEvent['Time Zone'] || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isAllDay = crmEvent['Is All Day Event'] === 'TRUE' || crmEvent['Is All Day Event'] === true;

  if (isAllDay) {
    // All-day events use date (not dateTime)
    gcalEvent.start = { date: crmEvent['Event Date'] };
    // Google Calendar all-day end date is exclusive (next day)
    const endDate = getNextDay(crmEvent['Event Date']);
    gcalEvent.end = { date: endDate };
  } else {
    const eventDate = crmEvent['Event Date'];
    const startTime = crmEvent['Start Time'] || '09:00';
    const endTime = crmEvent['End Time'] || '10:00';

    gcalEvent.start = {
      dateTime: buildDateTime(eventDate, startTime, timeZone),
      timeZone,
    };
    gcalEvent.end = {
      dateTime: buildDateTime(eventDate, endTime, timeZone),
      timeZone,
    };
  }

  return gcalEvent;
}

/**
 * Convert a Google Calendar event resource to CRM event fields
 * @param {object} gcalEvent - Google Calendar event resource
 * @param {Array} contacts - Optional array of contact objects to match attendee emails
 * @returns {object} CRM event fields (partial, does not include Event ID or system fields)
 */
export function googleEventToCRMEvent(gcalEvent, contacts = []) {
  const crmEvent = {
    'Event Name': gcalEvent.summary || '',
    Description: cleanDescription(gcalEvent.description),
    Status: mapGcalStatusToCrm(gcalEvent.status),
  };

  // Match Google Calendar attendees to CRM contacts by email
  if (gcalEvent.attendees && gcalEvent.attendees.length > 0 && contacts.length > 0) {
    const matchedContactIds = gcalEvent.attendees
      .map((attendee) => {
        const contact = contacts.find(
          (c) => c.Email && c.Email.toLowerCase() === attendee.email.toLowerCase()
        );
        return contact?.['Contact ID'];
      })
      .filter(Boolean);

    if (matchedContactIds.length > 0) {
      crmEvent.Attendees = matchedContactIds.join(',');
    }
  }

  // Location parsing
  if (gcalEvent.location) {
    crmEvent['Venue Name'] = gcalEvent.location;
  }

  // Extract meeting link from description or conferenceData
  const meetingLink = extractMeetingLink(gcalEvent);
  if (meetingLink) {
    crmEvent['Virtual Meeting Link'] = meetingLink;
  }

  // Date/time handling
  const isAllDay = !!(gcalEvent.start?.date && !gcalEvent.start?.dateTime);
  crmEvent['Is All Day Event'] = isAllDay ? 'TRUE' : 'FALSE';

  if (isAllDay) {
    crmEvent['Event Date'] = gcalEvent.start.date;
  } else {
    const startDt = new Date(gcalEvent.start.dateTime);
    const endDt = new Date(gcalEvent.end.dateTime);

    crmEvent['Event Date'] = formatDate(startDt);
    crmEvent['Start Time'] = formatTime(startDt);
    crmEvent['End Time'] = formatTime(endDt);
    crmEvent['Time Zone'] = gcalEvent.start.timeZone || '';

    // Calculate duration
    const durationMs = endDt - startDt;
    crmEvent['Duration (Minutes)'] = String(Math.round(durationMs / 60000));
  }

  return crmEvent;
}

// --- Helper functions ---

function mapCrmStatusToGcal(crmStatus) {
  const map = {
    Confirmed: 'confirmed',
    Tentative: 'tentative',
    Cancelled: 'cancelled',
    Completed: 'confirmed',
    Planned: 'tentative',
  };
  return map[crmStatus] || 'confirmed';
}

function mapGcalStatusToCrm(gcalStatus) {
  const map = {
    confirmed: 'Confirmed',
    tentative: 'Tentative',
    cancelled: 'Cancelled',
  };
  return map[gcalStatus] || 'Confirmed';
}

/**
 * Build an ISO 8601 dateTime string from date and time components
 */
function buildDateTime(dateStr, timeStr, _timeZone) {
  // dateStr: "2026-02-13", timeStr: "14:30" or "2:30 PM"
  const normalizedTime = normalizeTime(timeStr);
  const isoString = `${dateStr}T${normalizedTime}:00`;

  // If we have a timezone, return with it for proper parsing
  // The timeZone field on the start/end object handles timezone
  return isoString;
}

/**
 * Normalize time string to HH:MM 24-hour format
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '00:00';

  // Already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;

  // Handle "2:30 PM" style
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return timeStr;
}

/**
 * Get the next day in YYYY-MM-DD format (for all-day event end dates)
 */
function getNextDay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

/**
 * Format a Date object as YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object as HH:MM
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Remove meeting link appended by crmEventToGoogleEvent from description
 */
function cleanDescription(description) {
  if (!description) return '';
  return description.replace(/\n\nMeeting Link: .+$/, '');
}

/**
 * Extract meeting link from Google Calendar event
 */
function extractMeetingLink(gcalEvent) {
  // Check conferenceData first (Google Meet, Zoom, etc.)
  if (gcalEvent.conferenceData?.entryPoints) {
    const videoEntry = gcalEvent.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video'
    );
    if (videoEntry) return videoEntry.uri;
  }

  // Check description for appended link
  if (gcalEvent.description) {
    const match = gcalEvent.description.match(/Meeting Link: (.+)$/m);
    if (match) return match[1].trim();
  }

  return null;
}
