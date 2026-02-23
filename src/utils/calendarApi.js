/**
 * Google Calendar API Utilities
 *
 * REST client for Google Calendar v3 API.
 * Uses the same axios + interceptor pattern as sheets.js.
 *
 * IMPORTANT FOR DEV MODE:
 * Import from 'devModeWrapper.js' instead of this file.
 * The wrapper automatically routes to localStorage in dev mode.
 */

import axios from 'axios';
import { logApiCall } from './apiUsageLogger.js';
import { canMakeRequest } from '../services/apiUsageStats.js';
import { warn } from './logger.js';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Create axios instance for Google Calendar API
 */
function createCalendarClient(accessToken) {
  const client = axios.create({
    baseURL: CALENDAR_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: Date.now() };

      const rateLimitCheck = canMakeRequest('google-calendar', 1);
      if (!rateLimitCheck.allowed) {
        warn('Calendar API rate limit check failed:', rateLimitCheck.reason);
        logApiCall('google-calendar', 'rate-limit-blocked', {
          success: false,
          statusCode: 429,
          duration: 0,
          error: rateLimitCheck.reason,
          isRateLimit: true,
        });
        const error = new Error(`Rate limit would be exceeded: ${rateLimitCheck.reason}`);
        error.rateLimitInfo = rateLimitCheck;
        return Promise.reject(error);
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => {
      const duration = Date.now() - response.config.metadata.startTime;
      logApiCall('google-calendar', response.config.method, {
        success: true,
        statusCode: response.status,
        duration,
      });
      return response;
    },
    (error) => {
      const startTime = error.config?.metadata?.startTime || Date.now();
      const duration = Date.now() - startTime;
      logApiCall('google-calendar', error.config?.method || 'unknown', {
        success: false,
        statusCode: error.response?.status || null,
        duration,
        error: error.message,
        isRateLimit: error.response?.status === 429,
      });
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Fetch list of user's Google Calendars
 * @param {string} accessToken - Google OAuth access token with calendar scope
 * @returns {Promise<Array>} Array of calendar objects with id, summary, primary, backgroundColor
 */
export async function fetchCalendarList(accessToken) {
  const response = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.items || [];
}

/**
 * Fetch events from the user's primary Google Calendar
 * @param {string} accessToken - Google OAuth access token with calendar.events scope
 * @param {string} timeMin - ISO 8601 start of range (e.g. '2026-01-01T00:00:00Z')
 * @param {string} timeMax - ISO 8601 end of range
 * @returns {Promise<Array>} Array of Google Calendar event objects
 */
export async function fetchCalendarEvents(accessToken, timeMin, timeMax) {
  const client = createCalendarClient(accessToken);
  const events = [];
  let pageToken = null;

  do {
    const params = {
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await client.get('', { params });
    const items = response.data.items || [];
    events.push(...items);
    pageToken = response.data.nextPageToken || null;
  } while (pageToken);

  return events;
}

/**
 * Create a new event on the user's primary Google Calendar
 * Tags it with extended properties so Folkbase can identify its own events.
 * @param {string} accessToken - Google OAuth access token
 * @param {object} eventData - Google Calendar event resource object
 * @param {string} crmEventId - CRM Event ID (e.g. 'EVT001') for tagging
 * @returns {Promise<object>} Created Google Calendar event
 */
export async function createCalendarEvent(accessToken, eventData, crmEventId) {
  const client = createCalendarClient(accessToken);

  const payload = {
    ...eventData,
    extendedProperties: {
      private: {
        touchpointManaged: 'true',
        eventId: crmEventId,
      },
    },
  };

  const response = await client.post('', payload);
  return response.data;
}

/**
 * Update an existing event on the user's primary Google Calendar
 * @param {string} accessToken - Google OAuth access token
 * @param {string} gcalEventId - Google Calendar event ID
 * @param {object} eventData - Updated Google Calendar event resource
 * @returns {Promise<object>} Updated Google Calendar event
 */
export async function updateCalendarEvent(accessToken, gcalEventId, eventData) {
  const client = createCalendarClient(accessToken);

  const payload = {
    ...eventData,
    extendedProperties: {
      private: {
        touchpointManaged: 'true',
        ...(eventData.extendedProperties?.private || {}),
      },
    },
  };

  const response = await client.put(`/${gcalEventId}`, payload);
  return response.data;
}

/**
 * Delete an event from the user's primary Google Calendar
 * @param {string} accessToken - Google OAuth access token
 * @param {string} gcalEventId - Google Calendar event ID
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(accessToken, gcalEventId) {
  const client = createCalendarClient(accessToken);
  await client.delete(`/${gcalEventId}`);
}
