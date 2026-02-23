/**
 * Test Contact Data for Development
 *
 * This module provides pre-defined test contacts for development mode.
 * All test contacts are marked with __TEST_DATA__ flag for easy identification and removal.
 *
 * Field names match production Google Sheets schema (Title Case with spaces).
 *
 * IMPORTANT: This data only loads when VITE_DEV_MODE=true in .env
 */

export const TEST_DATA_MARKER = '__TEST_DATA__';

export const testContacts = [
  {
    'Contact ID': 'TEST0102001',
    Name: 'Adam A. A.',
    Phone: '313-757-1611',
    Email: 'almaleky@umich.edu',
    Organization: '',
    Role: 'Role Test',
    Bio: 'Bio Test',
    Tags: 'Tags Test',
    Priority: 'Urgent',
    Status: 'Neutral',
    District: 'District Test',
    'Date Added': '2024-01-01',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'Email',
    MailingAddress: '123 Test Street\nAnn Arbor, MI 48104',
    ReferredBy: 'Sarah B Johnson',
    NetworkNotes: 'Connected through university alumni network',
    Twitter: 'https://twitter.com/adamtest',
    LinkedIn: 'https://linkedin.com/in/adamtest',
    Facebook: '',
    Instagram: '',
    Birthday: '1985-03-15',
    QuickFlags: 'Review Later',
    RelationshipStrength: 'Good',
    PersonalityNotes: 'Prefers email communication, detail-oriented',
    FirstMet: 'University alumni event 2020',
    ProjectTags: 'Q1 Campaign, Network Building',
    Pinned: 'Yes',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102002',
    Name: 'Sarah B Johnson',
    Phone: '555-123-4567',
    Email: 'sarah.johnson@test.local',
    Organization: 'Community Outreach',
    Role: 'Volunteer Coordinator',
    Bio: 'Passionate about community engagement and local politics',
    Tags: 'Volunteer, Coordinator, Active',
    Priority: 'High',
    Status: 'Support',
    District: 'District 5',
    'Date Added': '2024-01-02',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'Phone',
    MailingAddress: '456 Oak Avenue\nDetroit, MI 48201',
    ReferredBy: '',
    NetworkNotes: 'Key connector in the volunteer community. Knows everyone!',
    Twitter: '',
    LinkedIn: 'https://linkedin.com/in/sarahjohnson',
    Facebook: 'https://facebook.com/sarahbjohnson',
    Instagram: 'https://instagram.com/sarahj_community',
    Birthday: '1978-07-22',
    QuickFlags: 'Merge Candidate, Needs Cleanup',
    RelationshipStrength: 'Strong',
    PersonalityNotes: 'Highly energetic, great networker, values personal connections',
    FirstMet: 'Community volunteer orientation 2019',
    ProjectTags: 'Volunteer Coordinator, Board Member',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102003',
    Name: 'Michael Chen',
    Phone: '555-987-6543',
    Email: 'mchen@test.local',
    Organization: 'Tech For Good',
    Role: 'Tech Advisor',
    Bio: 'Software engineer interested in civic tech',
    Tags: 'Tech, Advisor, Developer',
    Priority: 'Medium',
    Status: 'Undecided',
    District: 'District 2',
    'Date Added': '2024-01-03',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'Email',
    MailingAddress: '',
    ReferredBy: 'Emily Grace Rodriguez',
    NetworkNotes: 'Met at civic tech hackathon. Great technical skills.',
    Twitter: 'https://twitter.com/mchen_tech',
    LinkedIn: 'https://linkedin.com/in/michaelchen',
    Facebook: '',
    Instagram: '',
    Birthday: '',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102004',
    Name: 'Emily Grace Rodriguez',
    Phone: '555-456-7890',
    Email: 'emily.r@test.local',
    Organization: 'Youth Engagement Network',
    Role: 'Youth Organizer',
    Bio: 'Focused on mobilizing young voters',
    Tags: 'Youth, Organizer, Social Media',
    Priority: 'High',
    Status: 'Support',
    District: 'District 8',
    'Date Added': '2024-01-04',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'Text',
    MailingAddress: '789 Campus Drive\nAnn Arbor, MI 48109',
    ReferredBy: 'Sarah B Johnson',
    NetworkNotes: 'Very active on social media. Strong influence with 18-25 demographic.',
    Twitter: 'https://twitter.com/emily_organizes',
    LinkedIn: '',
    Facebook: '',
    Instagram: 'https://instagram.com/emily.votes',
    Birthday: '1999-11-08',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102005',
    Name: 'James P Williams',
    Phone: '555-321-0987',
    Email: 'jwilliams@test.local',
    Organization: '',
    Role: 'Donor',
    Bio: 'Small business owner and supporter',
    Tags: 'Donor, Business Owner',
    Priority: 'Medium',
    Status: 'Support',
    District: 'District 3',
    'Date Added': '2024-01-05',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'In Person',
    MailingAddress: '321 Business Park Lane\nSouthfield, MI 48034',
    ReferredBy: '',
    NetworkNotes: 'Owns local hardware store. Active in Chamber of Commerce.',
    Twitter: '',
    LinkedIn: 'https://linkedin.com/in/jameswilliams',
    Facebook: '',
    Instagram: '',
    Birthday: '1965-02-28',
    [TEST_DATA_MARKER]: true,
  },
  {
    'Contact ID': 'TEST0102006',
    Name: 'Patricia Martinez',
    Phone: '555-654-3210',
    Email: 'pmartinez@test.local',
    Organization: 'Environmental Action Group',
    Role: 'Environmental Advocate',
    Bio: 'Climate activist and community organizer',
    Tags: 'Environment, Activist, Climate',
    Priority: 'Low',
    Status: 'Neutral',
    District: 'District 7',
    'Date Added': '2024-01-06',
    'Last Contact Date': '',
    // New fields (pendingBackend)
    PreferredContactMethod: 'Email',
    MailingAddress: '',
    ReferredBy: 'Michael Chen',
    NetworkNotes: 'Strong environmental policy background. Good speaker.',
    Twitter: 'https://twitter.com/patmartinez_green',
    LinkedIn: '',
    Facebook: 'https://facebook.com/patriciamartinez',
    Instagram: 'https://instagram.com/patricia_green',
    Birthday: '1982-09-14',
    [TEST_DATA_MARKER]: true,
  },
];

/**
 * Mock metadata for dev mode (matches production Google Sheets structure)
 *
 * PENDING BACKEND: Columns N-Y need to be added to Google Sheets for production.
 * These work in dev mode (localStorage) but won't persist to production until added.
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
    // PENDING BACKEND: New columns (N-Y) - need to add to Google Sheets
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

/**
 * Check if a contact is test data
 * @param {Object} contact - Contact object
 * @returns {boolean} True if contact is test data
 */
export function isTestContact(contact) {
  return contact && contact[TEST_DATA_MARKER] === true;
}

/**
 * Get all test contact IDs
 * @returns {string[]} Array of test contact IDs
 */
export function getTestContactIds() {
  return testContacts.map((c) => c['Contact ID']);
}
