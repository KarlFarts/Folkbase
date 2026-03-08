import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../CalendarEventPopover', () => ({
  default: ({ gcalEvent, onAddToFolkbase }) => (
    <div data-testid="popover">
      <button onClick={() => onAddToFolkbase(gcalEvent)}>Add to Folkbase</button>
    </div>
  ),
}));

import CalendarView from '../CalendarView';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const folkbaseEvent = {
  'Event ID': 'EVT001',
  'Event Name': 'Team Meeting',
  'Event Date': todayStr,
  'Google Calendar ID': 'gcal-111',
};

const folkbaseOnlyEvent = {
  'Event ID': 'EVT002',
  'Event Name': 'Internal Review',
  'Event Date': todayStr,
};

const gcalEvent = {
  id: 'gcal-999',
  summary: 'Doctor Appointment',
  start: { dateTime: `${todayStr}T10:00:00` },
  end: { dateTime: `${todayStr}T10:30:00` },
};

describe('CalendarView', () => {
  it('shows google calendar events as chips', () => {
    render(
      <CalendarView
        events={[]}
        googleCalendarEvents={[gcalEvent]}
        onEventClick={vi.fn()}
        onAddToFolkbase={vi.fn()}
        syncedCalendarIds={new Set()}
        hideFolkbaseOnly={false}
      />
    );
    expect(screen.getByTitle('Doctor Appointment (Google Calendar)')).toBeInTheDocument();
  });

  it('opens popover when clicking a calendar-only event', () => {
    render(
      <CalendarView
        events={[]}
        googleCalendarEvents={[gcalEvent]}
        onEventClick={vi.fn()}
        onAddToFolkbase={vi.fn()}
        syncedCalendarIds={new Set()}
        hideFolkbaseOnly={false}
      />
    );
    fireEvent.click(screen.getByTitle('Doctor Appointment (Google Calendar)'));
    expect(screen.getByTestId('popover')).toBeInTheDocument();
  });

  it('hides folkbase-only events when hideFolkbaseOnly is true', () => {
    render(
      <CalendarView
        events={[folkbaseOnlyEvent]}
        googleCalendarEvents={[]}
        onEventClick={vi.fn()}
        onAddToFolkbase={vi.fn()}
        syncedCalendarIds={new Set(['gcal-111'])}
        hideFolkbaseOnly={true}
      />
    );
    expect(screen.queryByText('Internal Review')).not.toBeInTheDocument();
  });

  it('shows synced folkbase events with a badge indicator', () => {
    render(
      <CalendarView
        events={[folkbaseEvent]}
        googleCalendarEvents={[]}
        onEventClick={vi.fn()}
        onAddToFolkbase={vi.fn()}
        syncedCalendarIds={new Set(['gcal-111'])}
        hideFolkbaseOnly={false}
      />
    );
    expect(screen.getByTitle('Team Meeting')).toBeInTheDocument();
    expect(screen.getByTitle('Team Meeting').closest('.cv-crm-event-indicator')).toHaveClass(
      'cv-crm-event-indicator--synced'
    );
  });
});
