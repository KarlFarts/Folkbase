import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'EVT001' }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'tok',
    user: { email: 'a@b.com' },
    refreshAccessToken: vi.fn(),
  }),
}));
vi.mock('../../utils/sheetResolver', () => ({ useActiveSheetId: () => 'sheet1' }));
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ canWrite: () => true, guardWrite: () => true }),
}));
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: null, workspaceMode: 'personal' }),
}));
vi.mock('../../components/notes/NotesDisplaySection', () => ({
  default: () => null,
}));
vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockImplementation((_a, _b, sheet) => {
    if (sheet === 'Events') {
      return Promise.resolve({
        data: [
          {
            'Event ID': 'EVT001',
            'Event Name': 'Staff Meeting',
            'Event Date': '2025-01-01',
            Attendees: '',
            'Unresolved Attendees': '["John ????","Sarah from marketing"]',
          },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  }),
  getEventNotes: vi.fn().mockResolvedValue([]),
  updateEvent: vi.fn().mockResolvedValue({}),
  addNote: vi.fn(),
  deleteEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  SHEETS: { EVENTS: 'Events', CONTACTS: 'Contacts', ORGANIZATIONS: 'Organizations' },
}));

import EventDetails from '../EventDetails';

describe('EventDetails unresolved attendees', () => {
  it('renders unresolved attendee chips', async () => {
    render(<EventDetails onNavigate={vi.fn()} />);
    expect(await screen.findByText('John ????')).toBeInTheDocument();
    expect(screen.getByText('Sarah from marketing')).toBeInTheDocument();
  });

  it('renders the add-name input for writers', async () => {
    render(<EventDetails onNavigate={vi.fn()} />);
    expect(await screen.findByPlaceholderText('Add name, press Enter...')).toBeInTheDocument();
  });
});
