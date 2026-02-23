import { processValidation } from '../services/contactValidation';

/**
 * ImportPage Validation Integration Tests
 *
 * These tests verify the validation logic that will be integrated into ImportPage.
 * We test the validation processing function separately from the UI components.
 */

describe('ImportPage - Validation Processing Logic', () => {
  const mockContacts = [
    { Name: 'John Smith', Email: 'john@example.com', Phone: '5551234567' },
    { Name: '', Email: 'invalid-email', Phone: '123' },
    { Name: 'Jane Doe', Email: 'jane@example.com', Phone: '(555) 123-4567' }
  ];

  const mockValidationOptions = {
    requiredFields: ['Name'],
    dropdownFields: {
      Priority: ['High', 'Medium', 'Low']
    }
  };

  test('processValidation validates all contacts and separates valid from invalid', () => {
    // This tests the function that ImportPage will use to process validation
    // The function doesn't exist yet - this is the failing test (RED)

    const result = processValidation(mockContacts, mockValidationOptions);

    // Should return validated contacts and issues
    expect(result.validatedContacts).toHaveLength(3);
    expect(result.contactsWithIssues).toHaveLength(1); // Only contact with Name=''

    // Should use corrected values from validator
    expect(result.validatedContacts[2].Phone).toBe('555-123-4567'); // Formatted

    // Should collect issues from all contacts
    expect(result.contactsWithIssues[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'Name', type: 'error' }),
        expect.objectContaining({ field: 'Email', type: 'error' }),
        expect.objectContaining({ field: 'Phone', type: 'error' })
      ])
    );
  });

  test('processValidation returns empty issues array when all contacts valid', () => {
    const validContacts = [mockContacts[0]]; // Only the valid contact

    const result = processValidation(validContacts, mockValidationOptions);

    expect(result.validatedContacts).toHaveLength(1);
    expect(result.contactsWithIssues).toHaveLength(0);
  });

  test('processValidation includes row index in issue data', () => {
    const result = processValidation(mockContacts, mockValidationOptions);

    // Contact with issues should have rowIndex=1 (second contact)
    expect(result.contactsWithIssues[0].rowIndex).toBe(1);
    expect(result.contactsWithIssues[0].contact).toEqual(mockContacts[1]);
  });
});
