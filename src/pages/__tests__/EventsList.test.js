import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';

const mockHasCalendarAccess = vi.fn().mockResolvedValue(true);
const mockRefreshAccessToken = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'tok',
    refreshAccessToken: mockRefreshAccessToken,
    hasCalendarAccess: mockHasCalendarAccess,
  }),
}));
vi.mock('../../utils/sheetResolver', () => ({ useActiveSheetId: () => 'sheet1' }));
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ canWrite: () => true }),
}));
vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockResolvedValue({ data: [] }),
  fetchCalendarEvents: vi.fn().mockResolvedValue([]),
  SHEETS: { EVENTS: 'Events', CONTACTS: 'Contacts' },
}));

// Mock child components that would otherwise need full context setup
vi.mock('../../components/events/CalendarView', () => ({
  default: (props) => (
    <div data-testid="calendar-view">
      <span data-testid="cv-hide-folkbase">{String(props.hideFolkbaseOnly)}</span>
      <span data-testid="cv-synced-ids">{props.syncedCalendarIds?.size ?? 0}</span>
    </div>
  ),
}));

vi.mock('../../components/events/SyncPastMeetingsModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="sync-past-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

vi.mock('../../components/events/ImportEventModal', () => ({
  default: () => null,
}));

vi.mock('../../components/events/TimelineView', () => ({
  default: () => <div data-testid="timeline-view" />,
}));

vi.mock('../../components/SkeletonLoader', () => ({
  ListPageSkeleton: () => <div data-testid="skeleton" />,
}));

import EventsList from '../EventsList';

describe('EventsList view tabs', () => {
  it('renders "My Calendar" tab label (not "Calendar")', async () => {
    render(<EventsList onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('My Calendar')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Calendar' })).not.toBeInTheDocument();
  });
});

describe('EventsList SyncPastMeetingsModal', () => {
  beforeEach(() => {
    localStorage.setItem(
      'touchpoint_calendar_settings',
      JSON.stringify({ enabled: true })
    );
  });

  afterEach(() => {
    localStorage.removeItem('touchpoint_calendar_settings');
  });

  it('renders SyncPastMeetingsModal when syncPastModalOpen is true', async () => {
    render(<EventsList onNavigate={vi.fn()} />);

    // Wait for loading to complete — My Calendar button is always rendered once loaded
    const myCalButton = await screen.findByText('My Calendar');
    await act(async () => {
      fireEvent.click(myCalButton);
    });

    // The Sync Past Meetings button only shows when calendarSyncEnabled and viewMode='calendar'
    // Give extra time for the hasCalendarAccess async effect to complete
    const syncBtn = await screen.findByText('Sync Past Meetings', {}, { timeout: 3000 });
    await act(async () => {
      fireEvent.click(syncBtn);
    });

    expect(screen.getByTestId('sync-past-modal')).toBeInTheDocument();
  }, 10000);

  it('closes SyncPastMeetingsModal when onClose is called', async () => {
    render(<EventsList onNavigate={vi.fn()} />);

    const myCalButton = await screen.findByText('My Calendar');
    await act(async () => {
      fireEvent.click(myCalButton);
    });

    const syncBtn = await screen.findByText('Sync Past Meetings', {}, { timeout: 3000 });
    await act(async () => {
      fireEvent.click(syncBtn);
    });

    expect(screen.getByTestId('sync-past-modal')).toBeInTheDocument();

    const closeBtn = screen.getByText('Close Modal');
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByTestId('sync-past-modal')).not.toBeInTheDocument();
  }, 10000);
});
