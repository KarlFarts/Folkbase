/**
 * Import Validator Service
 * Provides data quality validation for bulk imports
 */

import stringSimilarity from 'string-similarity';

/**
 * Validates an email address
 * @param {string|null|undefined} email - The email to validate
 * @returns {{isValid: boolean, value?: string, error?: string}}
 */
export function validateEmail(email) {
  // Handle optional fields
  if (email === null || email === undefined) {
    return { isValid: true, value: undefined };
  }

  // Trim whitespace
  const trimmedEmail = String(email).trim();

  // Check if empty after trimming
  if (trimmedEmail === '') {
    return { isValid: false, error: 'Email is required' };
  }

  // Basic email validation regex
  // Matches: local@domain.tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, value: trimmedEmail };
}

/**
 * Formats a phone number to a consistent format
 * @param {string|null|undefined} phone - The phone number to format
 * @returns {{isValid: boolean, value?: string, error?: string}}
 */
export function formatPhone(phone) {
  // Handle optional fields
  if (phone === null || phone === undefined) {
    return { isValid: true, value: undefined };
  }

  // Trim whitespace
  const trimmedPhone = String(phone).trim();

  // Check if empty after trimming
  if (trimmedPhone === '') {
    return { isValid: true, value: undefined };
  }

  // Extract only digits from the phone number
  let digitsOnly = trimmedPhone.replace(/\D/g, '');

  // Remove leading 1 (country code) if present
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    digitsOnly = digitsOnly.slice(1);
  }

  // Validate that we have exactly 10 digits
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Phone must be 10 digits' };
  }

  // Format as XXX-XXX-XXXX
  const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;

  return { isValid: true, value: formatted };
}

/**
 * Validates a dropdown value against allowed values
 * @param {string} value - The value to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{isValid: boolean, value?: string, error?: string, suggestion?: string}}
 */
export function validateDropdownValue(value, allowedValues, fieldName) {
  // Handle optional fields
  if (value === null || value === undefined) {
    return { isValid: true, value: undefined };
  }

  // Trim whitespace
  const trimmedValue = String(value).trim();

  // Track if we modified the value (for suggestion)
  const wasModified = trimmedValue !== String(value);

  // Check if empty after trimming
  if (trimmedValue === '') {
    return { isValid: true, value: undefined };
  }

  // Check for exact match (case-sensitive)
  if (allowedValues.includes(trimmedValue)) {
    // Return with suggestion if value was modified
    if (wasModified) {
      return { isValid: true, value: trimmedValue, suggestion: trimmedValue };
    }
    return { isValid: true, value: trimmedValue };
  }

  // Check for case-insensitive match
  const lowerValue = trimmedValue.toLowerCase();
  const caseMatch = allowedValues.find(allowed => allowed.toLowerCase() === lowerValue);
  if (caseMatch) {
    return { isValid: true, value: caseMatch, suggestion: caseMatch };
  }

  // Try fuzzy matching using string similarity
  const matches = stringSimilarity.findBestMatch(trimmedValue, allowedValues);
  const bestMatch = matches.bestMatch;

  // Accept matches with similarity >= 0.7 (70% similar)
  // This prevents false positives like "VeryHigh" matching "High"
  if (bestMatch.rating >= 0.7) {
    return {
      isValid: true,
      value: bestMatch.target,
      suggestion: bestMatch.target
    };
  }

  // No match found
  return {
    isValid: false,
    error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
  };
}

/**
 * Validates that required fields are present
 * @param {Object} contact - The contact object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateRequiredFields(contact, requiredFields) {
  const errors = [];

  for (const fieldName of requiredFields) {
    const value = contact[fieldName];

    // Check if field is missing, null, undefined, empty, or only whitespace
    if (value === null || value === undefined) {
      errors.push(`${fieldName} is required`);
      continue;
    }

    const trimmedValue = String(value).trim();
    if (trimmedValue === '') {
      errors.push(`${fieldName} is required`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete contact object
 * @param {Object} contact - The contact to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.requiredFields - Array of required field names
 * @param {Object} options.dropdownFields - Object mapping field names to allowed values
 * @returns {{isValid: boolean, issues: Array, correctedContact: Object}}
 */
export function validateContact(contact, options = {}) {
  const {
    requiredFields = [],
    dropdownFields = {}
  } = options;

  const issues = [];
  const correctedContact = { ...contact };

  // 1. Validate required fields
  const requiredValidation = validateRequiredFields(contact, requiredFields);
  if (!requiredValidation.isValid) {
    for (const error of requiredValidation.errors) {
      const fieldName = error.replace(' is required', '');
      issues.push({
        field: fieldName,
        type: 'error',
        message: error,
        originalValue: contact[fieldName]
      });
    }
  }

  // 2. Validate and format Email
  if (contact.Email !== undefined && contact.Email !== null && contact.Email !== '') {
    const emailValidation = validateEmail(contact.Email);
    if (!emailValidation.isValid) {
      issues.push({
        field: 'Email',
        type: 'error',
        message: emailValidation.error,
        originalValue: contact.Email
      });
    } else if (emailValidation.value !== undefined) {
      correctedContact.Email = emailValidation.value;
    }
  }

  // 3. Validate and format Phone
  if (contact.Phone !== undefined && contact.Phone !== null && contact.Phone !== '') {
    const phoneValidation = formatPhone(contact.Phone);
    if (!phoneValidation.isValid) {
      issues.push({
        field: 'Phone',
        type: 'error',
        message: phoneValidation.error,
        originalValue: contact.Phone
      });
    } else if (phoneValidation.value !== undefined) {
      correctedContact.Phone = phoneValidation.value;
    }
  }

  // 4. Validate dropdown fields
  for (const [fieldName, allowedValues] of Object.entries(dropdownFields)) {
    const fieldValue = contact[fieldName];
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      const dropdownValidation = validateDropdownValue(fieldValue, allowedValues, fieldName);
      if (!dropdownValidation.isValid) {
        issues.push({
          field: fieldName,
          type: 'error',
          message: dropdownValidation.error,
          originalValue: fieldValue
        });
      } else if (dropdownValidation.value !== undefined) {
        correctedContact[fieldName] = dropdownValidation.value;
        if (dropdownValidation.suggestion) {
          issues.push({
            field: fieldName,
            type: 'suggestion',
            message: `Changed "${fieldValue}" to "${dropdownValidation.suggestion}"`,
            originalValue: fieldValue,
            suggestedValue: dropdownValidation.suggestion
          });
        }
      }
    }
  }

  return {
    isValid: issues.filter(issue => issue.type === 'error').length === 0,
    issues,
    correctedContact
  };
}
