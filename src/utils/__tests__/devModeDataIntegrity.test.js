import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock VITE_DEV_MODE
vi.stubEnv('VITE_DEV_MODE', 'true');

// Mock monitoring service
vi.mock('../../services/monitoringService', () => ({
  default: {
    recordApiCall: vi.fn(),
  },
}));

// Mock sheets module - must include ALL functions referenced by IIFEs at module load
vi.mock('../sheets', () => ({
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
}));

// Storage keys matching seedTestData.js
const STORAGE_KEY_EVENTS = 'dev_events';
const STORAGE_KEY_TASKS = 'dev_tasks';
const _STORAGE_KEY_EVENT_NOTES = 'dev_event_notes';

describe('Dev Mode Data Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Event ID Format (via stored data verification)', () => {
    it('generateEventID should produce EVT-uuid format', async () => {
      const { generateEventID } = await import('../devModeWrapper');
      const id = await generateEventID('fake-token', 'fake-sheet');
      expect(id).toMatch(/^EVT-[0-9a-f]{16}$/);
    });

    it('generateEventID should produce a unique ID each call', async () => {
      const { generateEventID } = await import('../devModeWrapper');
      const id1 = await generateEventID('fake-token', 'fake-sheet');
      const id2 = await generateEventID('fake-token', 'fake-sheet');
      expect(id1).not.toBe(id2);
    });

    it('generateEventID should NOT produce old E001 format', async () => {
      const { generateEventID } = await import('../devModeWrapper');
      const id = await generateEventID('fake-token', 'fake-sheet');
      expect(id).not.toMatch(/^E\d+$/);
      expect(id).not.toMatch(/^EVT\d{3}$/);
    });

    it('addEvent should store events with EVT-uuid format IDs', async () => {
      const { addEvent } = await import('../devModeWrapper');
      await addEvent('fake-token', 'fake-sheet', {
        'Event Name': 'Test Event',
        'Event Date': '2025-01-15',
        'Event Type': 'Meeting',
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS));
      expect(stored).toHaveLength(1);
      expect(stored[0]['Event ID']).toMatch(/^EVT-[0-9a-f]{16}$/);
      expect(stored[0]['Event Name']).toBe('Test Event');
    });
  });

  describe('Task ID Format', () => {
    it('should generate TSK-uuid format for the first task ID', async () => {
      const { generateTaskID } = await import('../devModeWrapper');
      const id = await generateTaskID('fake-token', 'fake-sheet');
      expect(id).toMatch(/^TSK-[0-9a-f]{16}$/);
    });

    it('should generate unique TSK IDs on successive calls', async () => {
      const { generateTaskID } = await import('../devModeWrapper');
      const id1 = await generateTaskID('fake-token', 'fake-sheet');
      const id2 = await generateTaskID('fake-token', 'fake-sheet');
      expect(id1).not.toBe(id2);
    });

    it('should NOT generate old TASK001 or TSK001 sequential format', async () => {
      const { generateTaskID } = await import('../devModeWrapper');
      const id = await generateTaskID('fake-token', 'fake-sheet');
      expect(id).not.toMatch(/^TASK\d+$/i);
      expect(id).not.toMatch(/^TSK\d{3}$/);
      expect(id).toMatch(/^TSK-[0-9a-f]{16}$/);
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', async () => {
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify([
          {
            'Event ID': 'EVT001',
            'Event Created Date': '2025-01-01',
            'Event Name': 'Original Name',
            'Event Type': 'Meeting',
          },
        ])
      );

      const { updateEvent } = await import('../devModeWrapper');
      const result = await updateEvent('fake-token', 'fake-sheet', 'EVT001', {
        'Event Name': 'Updated Name',
      });

      expect(result['Event Name']).toBe('Updated Name');
      expect(result['Event ID']).toBe('EVT001');
      expect(result['Event Created Date']).toBe('2025-01-01');
    });

    it('should preserve Event ID and Created Date even if overwrite attempted', async () => {
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify([
          {
            'Event ID': 'EVT001',
            'Event Created Date': '2025-01-01',
            'Event Name': 'Test',
          },
        ])
      );

      const { updateEvent } = await import('../devModeWrapper');
      const result = await updateEvent('fake-token', 'fake-sheet', 'EVT001', {
        'Event ID': 'EVT999',
        'Event Created Date': '2099-01-01',
        'Event Name': 'New Name',
      });

      expect(result['Event ID']).toBe('EVT001');
      expect(result['Event Created Date']).toBe('2025-01-01');
      expect(result['Event Name']).toBe('New Name');
    });

    it('should throw when event not found', async () => {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify([]));

      const { updateEvent } = await import('../devModeWrapper');
      await expect(
        updateEvent('fake-token', 'fake-sheet', 'EVT999', { 'Event Name': 'x' })
      ).rejects.toThrow('Event EVT999 not found');
    });

    it('should persist updated event to localStorage', async () => {
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify([
          {
            'Event ID': 'EVT001',
            'Event Created Date': '2025-01-01',
            'Event Name': 'Before',
          },
        ])
      );

      const { updateEvent } = await import('../devModeWrapper');
      await updateEvent('fake-token', 'fake-sheet', 'EVT001', {
        'Event Name': 'After',
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS));
      expect(stored).toHaveLength(1);
      expect(stored[0]['Event Name']).toBe('After');
    });
  });

  describe('deleteEvent', () => {
    it('should delete an existing event', async () => {
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify([
          { 'Event ID': 'EVT001', 'Event Name': 'Event 1' },
          { 'Event ID': 'EVT002', 'Event Name': 'Event 2' },
        ])
      );

      const { deleteEvent } = await import('../devModeWrapper');
      const result = await deleteEvent('fake-token', 'fake-sheet', 'EVT001');

      expect(result).toEqual({ success: true, eventId: 'EVT001' });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS));
      expect(stored).toHaveLength(1);
      expect(stored[0]['Event ID']).toBe('EVT002');
    });

    it('should handle deleting the last event', async () => {
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify([{ 'Event ID': 'EVT001', 'Event Name': 'Only Event' }])
      );

      const { deleteEvent } = await import('../devModeWrapper');
      await deleteEvent('fake-token', 'fake-sheet', 'EVT001');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS));
      expect(stored).toHaveLength(0);
    });
  });

  describe('Data Relationship Integrity', () => {
    it('addEvent should store with EVT-uuid format and Event Created Date', async () => {
      const { addEvent } = await import('../devModeWrapper');
      await addEvent('fake-token', 'fake-sheet', {
        'Event Name': 'Team Meeting',
        'Event Date': '2025-03-15',
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS));
      expect(stored[0]['Event ID']).toMatch(/^EVT-[0-9a-f]{16}$/);
      expect(stored[0]['Event Created Date']).toBeTruthy();
    });

    it('addTask should store with TSK-uuid format', async () => {
      const { addTask } = await import('../devModeWrapper');
      const task = await addTask('fake-token', 'fake-sheet', {
        Title: 'Follow up call',
        'Due Date': '2025-03-20',
        Status: 'pending',
      });

      expect(task['Task ID']).toMatch(/^TSK-[0-9a-f]{16}$/);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS));
      expect(stored[0]['Task ID']).toMatch(/^TSK-[0-9a-f]{16}$/);
    });
  });

});
