/**
 * Google OAuth Configuration
 *
 * Lightweight Google authentication configuration using @react-oauth/google.
 */

// Google OAuth Client ID from environment
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Scopes needed for Google Sheets access and Drive file management
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
].join(' ');

// Calendar scope for incremental consent (requested separately in setup wizard)
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
