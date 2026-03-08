import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { success: vi.fn(), error: vi.fn() } }),
}));

import CalendarEventPopover from '../CalendarEventPopover';

const mockGcalEvent = {
  id: 'gcal-123',
  summary: 'Team Standup',
  start: { dateTime: '2026-03-08T09:00:00' },
  end: { dateTime: '2026-03-08T09:30:00' },
  attendees: [{ email: 'alice@example.com', displayName: 'Alice' }],
  description: 'Daily sync',
  hangoutLink: 'https://meet.google.com/abc',
};

describe('CalendarEventPopover', () => {
  it('renders event title and time', () => {
    render(
      <CalendarEventPopover
        gcalEvent={mockGcalEvent}
        onClose={vi.fn()}
        onAddToFolkbase={vi.fn()}
      />
    );
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
  });

  it('calls onAddToFolkbase when button clicked', () => {
    const onAdd = vi.fn();
    render(
      <CalendarEventPopover
        gcalEvent={mockGcalEvent}
        onClose={vi.fn()}
        onAddToFolkbase={onAdd}
      />
    );
    fireEvent.click(screen.getByText('Add to Folkbase'));
    expect(onAdd).toHaveBeenCalledWith(mockGcalEvent);
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(
      <CalendarEventPopover
        gcalEvent={mockGcalEvent}
        onClose={onClose}
        onAddToFolkbase={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
