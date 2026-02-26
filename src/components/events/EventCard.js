import { memo } from 'react';

const EventCard = memo(function EventCard({ event, onClick, viewMode = 'full', contacts = [] }) {
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getDateUrgency = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'urgent'; // Today
    if (diffDays > 0 && diffDays <= 7) return 'soon'; // Within a week
    return 'upcoming'; // Future
  };

  const getAttendeeNames = () => {
    if (!event['Attendees']) return [];
    const attendeeIds = event['Attendees'].split(',').map((id) => id.trim());
    return attendeeIds.map((id) => {
      const contact = contacts.find((c) => c['Contact ID'] === id);
      if (contact) {
        return `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim() || 'Unknown';
      }
      return id; // Fallback to ID if contact not found
    });
  };

  const urgency = getDateUrgency(event['Event Date']);
  const attendeeCount = event['Attendees'] ? event['Attendees'].split(',').length : 0;
  const attendeeNames = getAttendeeNames();

  if (viewMode === 'compact') {
    return (
      <div className="event-card-compact hoverable" onClick={onClick}>
        <div className="card-row">
          <div className="card-col">
            <h4 className="ec-compact-title">
              {event['Event Name']}
            </h4>
            <p className="ec-compact-date">
              {formatEventDate(event['Event Date'])}
            </p>
          </div>
          {attendeeCount > 0 && (
            <span className="badge ec-compact-badge">
              {attendeeCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card event-card-full ec-full-card" onClick={onClick}>
      <div className="card-body">
        <div className="card-row ec-full-row">
          <div className="card-col">
            <h3 className="ec-full-title">{event['Event Name']}</h3>
            <div className="ec-meta-row">
              {event['Event Type'] && (
                <span className="badge badge-status-info ec-type-badge">
                  {event['Event Type']}
                </span>
              )}
              <div className="ec-icon-row">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className={`event-date--${urgency}`}>
                  {formatEventDate(event['Event Date'])}
                </span>
              </div>
              {event['Event Location'] && (
                <div className="ec-icon-row">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{event['Event Location']}</span>
                </div>
              )}
            </div>
            {event['Description'] && (
              <p className="text-muted ec-description">
                {event['Description']}
              </p>
            )}
            {attendeeCount > 0 && (
              <div className="ec-attendees-section">
                <div className="ec-attendees-badge-row">
                  <span className="badge badge-status-active">
                    {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="ec-attendees-names">
                  {attendeeNames.map((name, idx) => (
                    <span key={idx} className="event-attendee-chip">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default EventCard;
