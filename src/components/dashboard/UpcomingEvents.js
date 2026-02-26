function UpcomingEvents({ events, onNavigate }) {
  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) return 'Today';
    if (eventDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

    const diffMs = eventDate - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;

    return eventDate.toLocaleDateString();
  };

  const getDateUrgency = (dateStr) => {
    if (!dateStr) return '';
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const diffMs = eventDate - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'urgent';
    if (diffDays === 1) return 'soon';
    if (diffDays < 7) return 'upcoming';
    return 'future';
  };

  if (!events || events.length === 0) {
    return (
      <div className="sidebar-section">
        <h3 className="ue-heading">Upcoming Events</h3>
        <div className="ue-empty">No upcoming events</div>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <h3 className="ue-heading">Upcoming Events</h3>

      <div className="upcoming-events-list">
        {events.map((event, index) => {
          const urgency = getDateUrgency(event['Event Date']);
          const attendeeCount = event['Attendees'] ? event['Attendees'].split(',').length : 0;

          return (
            <div
              key={event['Event ID'] || index}
              className="upcoming-event-item"
              onClick={() => onNavigate('event-details', event['Event ID'])}
            >
              <div className="ue-item-name">{event['Event Name'] || 'Untitled Event'}</div>
              <div className="ue-item-date">
                <span className={urgency === 'urgent' || urgency === 'soon' ? 'text-warning' : ''}>
                  {formatEventDate(event['Event Date'])}
                </span>
                {attendeeCount > 0 && ` • ${attendeeCount} attendee${attendeeCount > 1 ? 's' : ''}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UpcomingEvents;
