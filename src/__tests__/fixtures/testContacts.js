/**
 * Dev Mode Metadata
 *
 * Provides mock metadata for dev mode (matches production Google Sheets schema).
 * Used by devModeWrapper.js to understand the sheet structure when running locally.
 */

/**
 * Mock metadata for dev mode (matches production Google Sheets structure)
 */
export const mockMetadata = {
  headers: [
    // Existing columns (A-M) - currently in Google Sheets
    { name: 'Contact ID', index: 0, letter: 'A' },
    { name: 'Name', index: 1, letter: 'B' },
    { name: 'Phone', index: 2, letter: 'C' },
    { name: 'Email', index: 3, letter: 'D' },
    { name: 'Organization', index: 4, letter: 'E' },
    { name: 'Role', index: 5, letter: 'F' },
    { name: 'Bio', index: 6, letter: 'G' },
    { name: 'Tags', index: 7, letter: 'H' },
    { name: 'Priority', index: 8, letter: 'I' },
    { name: 'Status', index: 9, letter: 'J' },
    { name: 'District', index: 10, letter: 'K' },
    { name: 'Date Added', index: 11, letter: 'L' },
    { name: 'Last Contact Date', index: 12, letter: 'M' },
    { name: 'PreferredContactMethod', index: 13, letter: 'N', pendingBackend: true },
    { name: 'MailingAddress', index: 14, letter: 'O', pendingBackend: true },
    { name: 'ReferredBy', index: 15, letter: 'P', pendingBackend: true },
    { name: 'NetworkNotes', index: 16, letter: 'Q', pendingBackend: true },
    { name: 'Twitter', index: 17, letter: 'R', pendingBackend: true },
    { name: 'LinkedIn', index: 18, letter: 'S', pendingBackend: true },
    { name: 'Facebook', index: 19, letter: 'T', pendingBackend: true },
    { name: 'Instagram', index: 20, letter: 'U', pendingBackend: true },
    { name: 'Birthday', index: 21, letter: 'V', pendingBackend: true },
    { name: 'QuickFlags', index: 22, letter: 'W', pendingBackend: true },
    { name: 'RelationshipStrength', index: 23, letter: 'X', pendingBackend: true },
    { name: 'PersonalityNotes', index: 24, letter: 'Y', pendingBackend: true },
    { name: 'FirstMet', index: 25, letter: 'Z', pendingBackend: true },
    { name: 'ProjectTags', index: 26, letter: 'AA', pendingBackend: true },
    { name: 'Pinned', index: 27, letter: 'AB', pendingBackend: true },
  ],
  validationRules: {
    Priority: ['Low', 'Medium', 'High', 'Urgent'],
    Status: ['Active', 'Inactive', 'Neutral', 'Support', 'Undecided', 'Do Not Contact'],
    PreferredContactMethod: ['Phone', 'Email', 'Text', 'In Person'],
  },
  sheetName: 'Contacts',
};

/**
 * Get headers that need to be added to Google Sheets for production
 */
export function getPendingBackendHeaders() {
  return mockMetadata.headers.filter((h) => h.pendingBackend);
}
