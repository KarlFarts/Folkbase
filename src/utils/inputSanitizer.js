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
    'Follow Up Notes': { maxLength: INPUT_LIMITS.longText },
  },
};
