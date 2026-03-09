/**
 * Input Sanitization Utilities
 *
 * Prevents XSS, formula injection, and data integrity issues by sanitizing
 * user input before storage in Google Sheets.
 */

/**
 * Maximum input lengths for different field types
 */
export const INPUT_LIMITS = {
  shortText: 255, // Name, email, phone
  mediumText: 1000, // Bio, role, organization
  longText: 5000, // Notes, descriptions
  veryLongText: 10000, // Rich text content
};

/**
 * Sanitize string input to prevent XSS and formula injection
 *
 * @param {string} value - Input value to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized value
 */
export function sanitizeStringInput(value, maxLength = INPUT_LIMITS.mediumText) {
  if (!value || typeof value !== 'string') return value;

  return (
    value
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets (XSS prevention)
      .replace(/^[=+\-@]/, '') // Formula injection protection
      .slice(0, maxLength)
  ); // Length limit
}

/**
 * Sanitize form data object based on schema
 *
 * @param {Object} formData - Form data to sanitize
 * @param {Object} schema - Field schema with maxLength definitions
 * @returns {Object} Sanitized form data
 */
export function sanitizeFormData(formData, schema = {}) {
  const sanitized = {};

  for (const [key, value] of Object.entries(formData)) {
    const fieldLimit = schema[key]?.maxLength || INPUT_LIMITS.mediumText;

    if (typeof value === 'string') {
      sanitized[key] = sanitizeStringInput(value, fieldLimit);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeStringInput(item, fieldLimit) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address string.
 * Returns null if valid (or empty), or an error message string if invalid.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function validateEmail(value) {
  if (!value || !value.trim()) return null; // empty is allowed (field is optional unless caller checks required)
  if (!EMAIL_REGEX.test(value.trim())) return 'Enter a valid email address';
  return null;
}

/**
 * Validate that a date string is a real calendar date.
 * Returns null if valid (or empty), or an error message string.
 *
 * @param {string} value - ISO date string (YYYY-MM-DD)
 * @returns {string|null}
 */
export function validateDate(value) {
  if (!value || !value.trim()) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Enter a valid date';
  return null;
}

/**
 * Validate that endDate is not before startDate.
 * Returns null if valid (or either is empty), or an error message string.
 *
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {string|null}
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  if (new Date(endDate) < new Date(startDate)) return 'End date cannot be before start date';
  return null;
}

/**
 * Field schemas for different entities
 */
export const SCHEMAS = {
  contact: {
    'First Name': { maxLength: INPUT_LIMITS.shortText },
    'Last Name': { maxLength: INPUT_LIMITS.shortText },
    'Display Name': { maxLength: INPUT_LIMITS.shortText },
    Email: { maxLength: INPUT_LIMITS.shortText },
    Phone: { maxLength: INPUT_LIMITS.shortText },
    Organization: { maxLength: INPUT_LIMITS.mediumText },
    Role: { maxLength: INPUT_LIMITS.mediumText },
    Bio: { maxLength: INPUT_LIMITS.longText },
    Notes: { maxLength: INPUT_LIMITS.veryLongText },
    Address: { maxLength: INPUT_LIMITS.mediumText },
    City: { maxLength: INPUT_LIMITS.shortText },
    State: { maxLength: INPUT_LIMITS.shortText },
    Zip: { maxLength: INPUT_LIMITS.shortText },
    Country: { maxLength: INPUT_LIMITS.shortText },
    LinkedIn: { maxLength: INPUT_LIMITS.mediumText },
    Twitter: { maxLength: INPUT_LIMITS.mediumText },
    Website: { maxLength: INPUT_LIMITS.mediumText },
  },
  organization: {
    Name: { maxLength: INPUT_LIMITS.mediumText },
    Website: { maxLength: INPUT_LIMITS.mediumText },
    Industry: { maxLength: INPUT_LIMITS.mediumText },
    Description: { maxLength: INPUT_LIMITS.longText },
    Notes: { maxLength: INPUT_LIMITS.veryLongText },
    Address: { maxLength: INPUT_LIMITS.mediumText },
    City: { maxLength: INPUT_LIMITS.shortText },
    State: { maxLength: INPUT_LIMITS.shortText },
    Country: { maxLength: INPUT_LIMITS.shortText },
  },
  event: {
    'Event Name': { maxLength: INPUT_LIMITS.mediumText },
    Description: { maxLength: INPUT_LIMITS.longText },
    Location: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.veryLongText },
  },
  location: {
    Name: { maxLength: INPUT_LIMITS.mediumText },
    Address: { maxLength: INPUT_LIMITS.mediumText },
    City: { maxLength: INPUT_LIMITS.shortText },
    State: { maxLength: INPUT_LIMITS.shortText },
    Zip: { maxLength: INPUT_LIMITS.shortText },
    Country: { maxLength: INPUT_LIMITS.shortText },
    Notes: { maxLength: INPUT_LIMITS.veryLongText },
  },
  note: {
    Title: { maxLength: INPUT_LIMITS.mediumText },
    Content: { maxLength: INPUT_LIMITS.veryLongText },
  },
  touchpoint: {
    'Touchpoint Type': { maxLength: INPUT_LIMITS.shortText },
    Notes: { maxLength: INPUT_LIMITS.veryLongText },
    Outcome: { maxLength: INPUT_LIMITS.shortText },
    Attendees: { maxLength: INPUT_LIMITS.mediumText },
    Location: { maxLength: INPUT_LIMITS.mediumText },
    'Follow Up Notes': { maxLength: INPUT_LIMITS.longText },
  },
  task: {
    Title: { maxLength: INPUT_LIMITS.mediumText },
    Description: { maxLength: INPUT_LIMITS.longText },
  },
  workspace: {
    name: { maxLength: INPUT_LIMITS.mediumText },
    description: { maxLength: INPUT_LIMITS.longText },
  },
  relationship: {
    Notes: { maxLength: INPUT_LIMITS.longText },
  },
  social: {
    Handle: { maxLength: INPUT_LIMITS.shortText },
    URL: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  contactMethod: {
    Value: { maxLength: INPUT_LIMITS.shortText },
    Label: { maxLength: INPUT_LIMITS.shortText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  education: {
    Institution: { maxLength: INPUT_LIMITS.mediumText },
    Degree: { maxLength: INPUT_LIMITS.mediumText },
    'Field of Study': { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  employment: {
    Organization: { maxLength: INPUT_LIMITS.mediumText },
    Role: { maxLength: INPUT_LIMITS.mediumText },
    Department: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  district: {
    'District Name': { maxLength: INPUT_LIMITS.mediumText },
    Representative: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  attribute: {
    Value: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.mediumText },
  },
  moment: {
    Title: { maxLength: INPUT_LIMITS.mediumText },
    Location: { maxLength: INPUT_LIMITS.mediumText },
    Notes: { maxLength: INPUT_LIMITS.longText },
  },
};
