import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'tok' }),
}));
vi.mock('../../../utils/sheetResolver', () => ({
  useActiveSheetId: () => 'sheet1',
}));
vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }),
}));
vi.mock('../../../utils/devModeWrapper', () => ({
  fetchCalendarEvents: vi.fn().mockResolvedValue([
    {
      id: 'gcal-past-1',
      summary: 'Past Meeting',
      status: 'confirmed',
      start: { dateTime: '2026-03-01T10:00:00' },
      end: { dateTime: '2026-03-01T11:00:00' },
      attendees: [],
      extendedProperties: { private: {} },
    },
  ]),
  generateEventID: vi.fn().mockResolvedValue('EVT999'),
  addEvent: vi.fn().mockResolvedValue({}),
}));

import SyncPastMeetingsModal from '../SyncPastMeetingsModal';

describe('SyncPastMeetingsModal', () => {
  it('loads and shows past calendar events not in folkbase', async () => {
    render(
      <SyncPastMeetingsModal
        isOpen={true}
        onClose={vi.fn()}
        onImported={vi.fn()}
        existingCalendarIds={new Set()}
        contacts={[]}
      />
    );
    expect(await screen.findByText('Past Meeting')).toBeInTheDocument();
  });

  it('shows empty state when all past events are already in Folkbase', async () => {
    render(
      <SyncPastMeetingsModal
        isOpen={true}
        onClose={vi.fn()}
        onImported={vi.fn()}
        existingCalendarIds={new Set(['gcal-past-1'])}
        contacts={[]}
      />
    );
    expect(await screen.findByText(/all recent meetings/i)).toBeInTheDocument();
  });
});
