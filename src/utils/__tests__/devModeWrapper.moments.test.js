import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must set dev mode before importing the module
vi.stubEnv('VITE_DEV_MODE', 'true');

// Mock the seedTestData module
const mockMoments = [];
vi.mock('../../__tests__/fixtures/seedTestData', () => ({
  getLocalContacts: () => [],
  saveLocalContacts: vi.fn(),
  getLocalTouchpoints: () => [],
  saveLocalTouchpoints: vi.fn(),
  getLocalEvents: () => [],
  saveLocalEvents: vi.fn(),
  getLocalActivities: () => [],
  saveLocalActivities: vi.fn(),
  getLocalContactActivities: () => [],
  getLocalLists: () => [],
  saveLocalLists: vi.fn(),
  getLocalContactLists: () => [],
  saveLocalContactLists: vi.fn(),
  getLocalNotes: () => [],
  saveLocalNotes: vi.fn(),
  getLocalContactNotes: () => [],
  saveLocalContactNotes: vi.fn(),
  getLocalEventNotes: () => [],
  saveLocalEventNotes: vi.fn(),
  getLocalListNotes: () => [],
  saveLocalListNotes: vi.fn(),
  getLocalTaskNotes: () => [],
  saveLocalTaskNotes: vi.fn(),
  getNotesForContact: () => [],
  getLocalRelationships: () => [],
  getLocalOrganizations: () => [],
  saveLocalOrganizations: vi.fn(),
  getLocalLocations: () => [],
  saveLocalLocations: vi.fn(),
  getLocalLocationVisits: () => [],
  saveLocalLocationVisits: vi.fn(),
  getLocalWorkspaces: () => [],
  saveLocalWorkspaces: vi.fn(),
  getLocalWorkspaceMembers: () => [],
  saveLocalWorkspaceMembers: vi.fn(),
  getLocalWorkspaceInvitations: () => [],
  saveLocalWorkspaceInvitations: vi.fn(),
  getLocalEventAttendees: () => [],
  saveLocalEventAttendees: vi.fn(),
  getLocalEventResources: () => [],
  saveLocalEventResources: vi.fn(),
  getLocalEventAgenda: () => [],
  saveLocalEventAgenda: vi.fn(),
  getLocalOrgContacts: () => [],
  saveLocalOrgContacts: vi.fn(),
  getLocalOrgDepartments: () => [],
  saveLocalOrgDepartments: vi.fn(),
  getLocalTaskChecklist: () => [],
  saveLocalTaskChecklist: vi.fn(),
  getLocalTaskTimeEntries: () => [],
  saveLocalTaskTimeEntries: vi.fn(),
  getLocalCalendarEvents: () => [],
  saveLocalCalendarEvents: vi.fn(),
  getLocalMoments: () => [...mockMoments],
  saveLocalMoments: vi.fn((moments) => {
    mockMoments.length = 0;
    mockMoments.push(...moments);
  }),
  mockMetadata: null,
}));

vi.mock('../sheets', () => ({
  SHEETS: {},
  readSheetData: vi.fn(),
  readSheetMetadata: vi.fn(),
  generateContactID: vi.fn(),
  generateTouchpointID: vi.fn(),
  generateEventID: vi.fn(),
  addContact: vi.fn(),
  updateContact: vi.fn(),
  appendRow: vi.fn(),
  addTouchpoint: vi.fn(),
  updateTouchpoint: vi.fn(),
  getContactTouchpoints: vi.fn(),
  detectDuplicates: vi.fn(),
  addEvent: vi.fn(),
  copyContactToWorkspace: vi.fn(),
  copyMultipleContacts: vi.fn(),
  linkNoteToContact: vi.fn(),
  unlinkNoteFromContact: vi.fn(),
  linkNoteToEvent: vi.fn(),
  unlinkNoteFromEvent: vi.fn(),
  getEventNotes: vi.fn(),
  linkNoteToList: vi.fn(),
  unlinkNoteFromList: vi.fn(),
  getListNotes: vi.fn(),
  linkNoteToTask: vi.fn(),
  unlinkNoteFromTask: vi.fn(),
  getTaskNotes: vi.fn(),
  getNoteWithEntities: vi.fn(),
  batchLinkNoteToEntities: vi.fn(),
  shareContactNotes: vi.fn(),
  getContactNotes: vi.fn(),
  addNoteWithLink: vi.fn(),
  updateRow: vi.fn(),
  getSheetIdByName: vi.fn(),
  logAuditEntry: vi.fn(),
  AUTO_FIELDS: {},
}));
vi.mock('../indexedDbCache', () => ({
  getCachedData: vi.fn(() => null),
  setCachedData: vi.fn(),
  invalidateCache: vi.fn(),
  appendToCachedData: vi.fn(),
  updateCachedRow: vi.fn(),
  deleteCachedRow: vi.fn(),
}));
vi.mock('../activities', () => ({
  createActivity: vi.fn(),
  ACTIVITY_TYPES: {},
  sortActivitiesByDate: vi.fn((a) => a),
}));
vi.mock('../logger', () => ({ log: vi.fn() }));
vi.mock('../retryQueue', () => ({ queueFailedWrite: vi.fn() }));
vi.mock('../../hooks/useRetryQueue', () => ({ registerRetryHandler: vi.fn() }));
vi.mock('../../services/cacheMonitoringService', () => ({
  default: { recordApiCall: vi.fn() },
}));

const { getMomentsForContact, addMoment, updateMoment, deleteMoment } = await import(
  '../devModeWrapper'
);

describe('Moments CRUD (dev mode)', () => {
  beforeEach(() => {
    mockMoments.length = 0;
  });

  it('addMoment creates a moment with a MOM- id', async () => {
    const result = await addMoment('token', 'sheet1', {
      Title: 'Beach trip',
      Type: 'Vacation',
      'Start Date': '2025-06-01',
      'End Date': '2025-06-07',
      Location: 'Florida',
      Notes: 'Great time',
      'Contact IDs': 'CON001,CON002',
    });
    expect(result['Moment ID']).toMatch(/^MOM-/);
    expect(result.Title).toBe('Beach trip');
  });

  it('getMomentsForContact returns only moments containing that contactId', async () => {
    await addMoment('token', 'sheet1', {
      Title: 'Trip A',
      'Contact IDs': 'CON001,CON002',
    });
    await addMoment('token', 'sheet1', {
      Title: 'Trip B',
      'Contact IDs': 'CON003',
    });

    const moments = await getMomentsForContact('token', 'sheet1', 'CON001');
    expect(moments).toHaveLength(1);
    expect(moments[0].Title).toBe('Trip A');
  });

  it('updateMoment modifies the existing moment', async () => {
    const created = await addMoment('token', 'sheet1', {
      Title: 'Old title',
      'Contact IDs': 'CON001',
    });
    const updated = await updateMoment('token', 'sheet1', created['Moment ID'], {
      Title: 'New title',
    });
    expect(updated.Title).toBe('New title');
    expect(updated['Moment ID']).toBe(created['Moment ID']);
  });

  it('deleteMoment removes the moment', async () => {
    const created = await addMoment('token', 'sheet1', {
      Title: 'To delete',
      'Contact IDs': 'CON001',
    });
    await deleteMoment('token', 'sheet1', created['Moment ID']);
    const remaining = await getMomentsForContact('token', 'sheet1', 'CON001');
    expect(remaining).toHaveLength(0);
  });
});
