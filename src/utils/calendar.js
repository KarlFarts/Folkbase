/**
 * Google Calendar API utilities for Folkbase
 * Provides functions to interact with Google Calendar API for event integration
 */

export const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Fetch list of calendars accessible to the user
 * @param {string} accessToken - Google OAuth access token with calendar scope
 * @returns {Promise<Array>} - Array of calendar objects
 */
export const fetchCalendarList = async (accessToken) => {
  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/users/me/calendarList?minAccessRole=writer`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    throw new Error(`Calendar fetch error: ${error.message}`);
  }
};

/**
 * Check if the access token has calendar scope
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} - True if calendar scope is granted
 */
export const checkCalendarScope = async (accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const scopes = data.scope ? data.scope.split(' ') : [];

    return scopes.some(
      (scope) =>
        scope === 'https://www.googleapis.com/auth/calendar' ||
        scope === 'https://www.googleapis.com/auth/calendar.events'
    );
  } catch {
    return false;
  }
};
