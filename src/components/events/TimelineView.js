import { useMemo } from 'react';
import EventCard from './EventCard';

function TimelineView({ events, onEventClick, contacts = [] }) {
  const groupedByMonth = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedEvents = [...events].sort((a, b) => {
      return new Date(a['Event Date']) - new Date(b['Event Date']);
    });

    sortedEvents.forEach(event => {
      const eventDate = new Date(event['Event Date']);
      const monthYear = eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const isPast = eventDate < today;

      if (!groups[monthYear]) {
        groups[monthYear] = {
          events: [],
          date: eventDate,
          isPast
        };
      }

      groups[monthYear].events.push(event);
    });

    return Object.entries(groups).map(([key, value]) => ({
      monthYear: key,
      ...value
    }));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3 className="empty-state-title">No Events to Display</h3>
        <p>Events will appear here in timeline format</p>
      </div>
    );
  }

  return (
    <div className="timeline-view tv-container">
      {/* Timeline vertical line */}
      <div className="tv-vertical-line"></div>

      {/* Timeline events */}
      <div className="tv-events-wrapper">
        {groupedByMonth.map((group, groupIndex) => (
          <div key={groupIndex} className="tv-month-group">
            {/* Month header */}
            <div className="tv-month-header">
              <div
                className="tv-month-circle"
                style={{
                  backgroundColor: group.isPast ? 'var(--color-bg-secondary)' : 'var(--color-primary)',
                  border: `2px solid ${group.isPast ? 'var(--color-border-default)' : 'var(--color-primary)'}`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={group.isPast ? 'var(--color-text-secondary)' : 'white'} strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="tv-month-title">
                  {group.monthYear}
                </h3>
                <p className="tv-month-count">
                  {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Events in this month */}
            <div className="tv-events-list">
              {group.events.map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className="timeline-event tv-event-item"
                  style={{
                    borderLeft: `3px solid ${group.isPast ? 'var(--color-border-default)' : 'var(--color-primary-alpha-40)'}`
                  }}
                >
                  <EventCard
                    event={event}
                    contacts={contacts}
                    onClick={() => onEventClick(event['Event ID'])}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimelineView;
