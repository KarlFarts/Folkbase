import { useEffect, useRef } from 'react';
import { X, ExternalLink, Users } from 'lucide-react';

function CalendarEventPopover({ gcalEvent, onClose, onAddToFolkbase }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.focus();
    }
  }, []);

  if (!gcalEvent) return null;

  const startDateStr = gcalEvent.start?.dateTime || gcalEvent.start?.date;
  const endDateStr = gcalEvent.end?.dateTime || gcalEvent.end?.date;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (gcalEvent.start?.date && !gcalEvent.start?.dateTime) {
      // All-day event
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const meetingLink =
    gcalEvent.hangoutLink ||
    gcalEvent.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;

  return (
    <div className="cep-overlay" onClick={onClose}>
      <div
        className="cep-card"
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="cep-header">
          <h4 className="cep-title">{gcalEvent.summary || 'Untitled Event'}</h4>
          <button className="btn btn-ghost btn-sm cep-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>

        <div className="cep-body">
          {/* Time */}
          <p className="cep-time">
            {formatTime(startDateStr)}
            {endDateStr && startDateStr !== endDateStr && ` \u2013 ${formatTime(endDateStr)}`}
          </p>

          {/* Description */}
          {gcalEvent.description && (
            <p className="cep-description">
              {gcalEvent.description.replace(/\n\nMeeting Link: .+$/, '')}
            </p>
          )}

          {/* Attendees */}
          {gcalEvent.attendees && gcalEvent.attendees.length > 0 && (
            <div className="cep-attendees">
              <Users size={12} className="cep-attendees-icon" />
              <span className="cep-attendees-text">
                {gcalEvent.attendees
                  .slice(0, 3)
                  .map((a) => a.displayName || a.email)
                  .join(', ')}
                {gcalEvent.attendees.length > 3 && ` +${gcalEvent.attendees.length - 3} more`}
              </span>
            </div>
          )}

          {/* Meeting link */}
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="cep-meeting-link"
            >
              <ExternalLink size={12} /> Join meeting
            </a>
          )}
        </div>

        <div className="cep-footer">
          <button className="btn btn-primary btn-sm" onClick={() => onAddToFolkbase(gcalEvent)}>
            Add to Folkbase
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarEventPopover;
