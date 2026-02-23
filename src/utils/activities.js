/**
 * Activity Feed System
 *
 * Tracks and retrieves activities for contacts. Activities include:
 * - Touchpoints logged
 * - Added to workspaces
 * - Removed from workspaces
 * - Attended events
 * - Contact created/updated
 *
 * PENDING BACKEND: This works in dev mode (localStorage) but needs
 * an Activities sheet added to Google Sheets for production.
 */

import { generateActivityId as generateSecureActivityId } from './secureId';

// Activity types
export const ACTIVITY_TYPES = {
  TOUCHPOINT_LOGGED: 'touchpoint_logged',
  ADDED_TO_WORKSPACE: 'added_to_workspace',
  REMOVED_FROM_WORKSPACE: 'removed_from_workspace',
  ATTENDED_EVENT: 'attended_event',
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated'
};

// Human-readable labels for activity types
export const ACTIVITY_LABELS = {
  [ACTIVITY_TYPES.TOUCHPOINT_LOGGED]: 'Logged touchpoint',
  [ACTIVITY_TYPES.ADDED_TO_WORKSPACE]: 'Added to workspace',
  [ACTIVITY_TYPES.REMOVED_FROM_WORKSPACE]: 'Removed from workspace',
  [ACTIVITY_TYPES.ATTENDED_EVENT]: 'Attended event',
  [ACTIVITY_TYPES.CONTACT_CREATED]: 'Contact created',
  [ACTIVITY_TYPES.CONTACT_UPDATED]: 'Contact updated'
};

// Icons for activity types (using simple text for now)
export const ACTIVITY_ICONS = {
  [ACTIVITY_TYPES.TOUCHPOINT_LOGGED]: 'Phone',
  [ACTIVITY_TYPES.ADDED_TO_WORKSPACE]: 'UserPlus',
  [ACTIVITY_TYPES.REMOVED_FROM_WORKSPACE]: 'UserMinus',
  [ACTIVITY_TYPES.ATTENDED_EVENT]: 'Calendar',
  [ACTIVITY_TYPES.CONTACT_CREATED]: 'UserRoundPlus',
  [ACTIVITY_TYPES.CONTACT_UPDATED]: 'Pencil'
};

/**
 * Generate a unique activity ID
 * Uses cryptographically secure random values
 */
export function generateActivityId() {
  return generateSecureActivityId();
}

/**
 * Create an activity object
 * @param {string} contactId - The contact this activity is for
 * @param {string} activityType - One of ACTIVITY_TYPES
 * @param {string} description - Human-readable description
 * @param {Object} metadata - Additional data (touchpoint type, workspace name, etc.)
 */
export function createActivity(contactId, activityType, description, metadata = {}) {
  return {
    'Activity ID': generateActivityId(),
    'Contact ID': contactId,
    'Activity Type': activityType,
    'Description': description,
    'Date': new Date().toISOString(),
    'Related ID': metadata.relatedId || '',
    'Related Type': metadata.relatedType || '',
    'Metadata': JSON.stringify(metadata)
  };
}

/**
 * Format an activity for display
 * @param {Object} activity - Activity object
 */
export function formatActivity(activity) {
  const type = activity['Activity Type'];
  const date = new Date(activity['Date']);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  let timeAgo;
  if (diffMins < 1) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    timeAgo = `${diffDays}d ago`;
  } else {
    timeAgo = date.toLocaleDateString();
  }

  return {
    id: activity['Activity ID'],
    icon: ACTIVITY_ICONS[type] || 'Pin',
    label: ACTIVITY_LABELS[type] || 'Activity',
    description: activity['Description'],
    timeAgo,
    date: date.toLocaleDateString(),
    fullDate: date.toLocaleString(),
    type
  };
}

/**
 * Sort activities by date (newest first)
 * @param {Array} activities - Array of activity objects
 */
export function sortActivitiesByDate(activities) {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a['Date']);
    const dateB = new Date(b['Date']);
    return dateB - dateA;
  });
}
