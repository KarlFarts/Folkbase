import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'tok', user: { email: 'a@b.com' } }),
}));
vi.mock('../../utils/sheetResolver', () => ({ useActiveSheetId: () => 'sheet1' }));
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ guardWrite: () => true }),
}));
vi.mock('../../hooks/useEntityDetection', () => ({
  useEntityDetection: () => ({ detectedEntities: null, isDetecting: false }),
}));
vi.mock('../../components/braindump/EntitySuggestionsPanel', () => ({
  default: () => null,
}));
vi.mock('../../components/Avatar', () => ({
  default: ({ name }) => <div data-testid="avatar">{name}</div>,
}));
vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockImplementation((_a, _b, sheet) => {
    if (sheet === 'Contacts') return Promise.resolve({ data: [] });
    if (sheet === 'Events')
      return Promise.resolve({
        data: [
          {
            'Event ID': 'EVT001',
            'Event Name': 'Board Meeting',
            'Unresolved Attendees': '["Mystery Person"]',
          },
        ],
      });
    return Promise.resolve({ data: [] });
  }),
  addNote: vi.fn(),
  linkNoteToContact: vi.fn(),
  SHEETS: { CONTACTS: 'Contacts', EVENTS: 'Events' },
}));

import ContactReviewPage from '../ContactReviewPage';

describe('ContactReviewPage unresolved attendees', () => {
  it('shows unresolved attendee in queue', async () => {
    render(<ContactReviewPage onNavigate={vi.fn()} />);
    expect(await screen.findByText('Mystery Person')).toBeInTheDocument();
  });

  it('shows unresolved attendee badge', async () => {
    render(<ContactReviewPage onNavigate={vi.fn()} />);
    expect(await screen.findByText(/unresolved attendee/i)).toBeInTheDocument();
  });
});
