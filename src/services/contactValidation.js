import { validateContact } from './importValidator';

/**
 * processValidation - Processes validation for an array of contacts
 *
 * Runs validation on each contact and separates valid contacts from those with issues.
 * Uses corrected values from the validator for all contacts.
 *
 * @param {Array} contacts - Array of contact objects to validate
 * @param {Object} validationOptions - Options for validation
 * @param {string[]} validationOptions.requiredFields - Array of required field names
 * @param {Object} validationOptions.dropdownFields - Object mapping field names to allowed values
 * @returns {Object} { validatedContacts, contactsWithIssues }
 *   - validatedContacts: Array of all contacts with corrected values applied
 *   - contactsWithIssues: Array of { rowIndex, contact, issues } for contacts with errors
 */
export function processValidation(contacts, validationOptions) {
  const validatedContacts = [];
  const contactsWithIssues = [];

  contacts.forEach((contact, index) => {
    const validation = validateContact(contact, validationOptions);

    // Store the corrected contact
    validatedContacts.push(validation.correctedContact);

    // If there are error-level issues, add to issues list
    const errors = validation.issues.filter(issue => issue.type === 'error');
    if (errors.length > 0) {
      contactsWithIssues.push({
        rowIndex: index,
        contact: validation.correctedContact,
        issues: validation.issues
      });
    }
  });

  return { validatedContacts, contactsWithIssues };
}
