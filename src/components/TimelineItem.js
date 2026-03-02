import { useState, memo } from 'react';
import { Phone, Mail, MessageSquare, Calendar, Zap, FileText, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

/**
 * TimelineItem Component - Phase 3
 *
 * Displays a single touchpoint in a visual timeline with:
 * - Type-specific colored dots
 * - Outcome-based styling
 * - Vertical layout with connecting lines
 * - Expandable notes on hover
 * - Duration and follow-up indicators
 */

// Map touchpoint types to colors and icons
const TOUCHPOINT_TYPES = {
  Call: { color: 'type-call', icon: Phone },
  Email: { color: 'type-email', icon: Mail },
  Text: { color: 'type-text', icon: MessageSquare },
  Meeting: { color: 'type-meeting', icon: Calendar },
  Event: { color: 'type-event', icon: Zap },
  Other: { color: 'type-other', icon: FileText },
};

// Map outcomes to styling classes
const OUTCOME_CLASSES = {
  Successful: 'success',
  'No Answer': 'warning',
  'Left Message': 'warning',
  'Email Bounced': 'error',
  'Wrong Number': 'error',
  'Will Follow Up': 'warning',
  'Not Interested': 'error',
};

const TimelineItem = memo(function TimelineItem({ touchpoint, isClickable, onClick, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const type = touchpoint['Type'] || 'Other';
  const typeConfig = TOUCHPOINT_TYPES[type] || TOUCHPOINT_TYPES['Other'];
  const TypeIcon = typeConfig.icon;

  const date = touchpoint['Date']
    ? new Date(touchpoint['Date']).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  const outcome = touchpoint['Outcome'];
  const outcomeClass = outcome ? OUTCOME_CLASSES[outcome] : null;
  const hasFollowUp = touchpoint['Follow-up Needed'] === 'Yes';
  const duration = touchpoint['Duration (min)'];
  const notes = touchpoint['Notes'];
  const attendees = touchpoint['Attendees'];
  const location = touchpoint['Location'];
  const followUpDate = touchpoint['Follow-up Date'];

  const handleHeaderClick = () => {
    if (isClickable && onClick) {
      onClick();
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div className="timeline-item">
      {/* Timeline Marker: Dot and connecting line */}
      <div className="timeline-marker">
        <div
          className={`timeline-dot ${typeConfig.color} ${outcome ? `outcome-${outcome.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
        >
          <TypeIcon size={6} className="timeline-dot-icon" />
        </div>
        <div className="timeline-line" />
      </div>

      {/* Timeline Content */}
      <div className="timeline-content">
        {/* Header: Type, Date, and Status Badges — click to expand */}
        <div
          className="timeline-header timeline-header-clickable"
          onClick={handleHeaderClick}
          style={{ cursor: 'pointer' }}
        >
          <span className="timeline-type">{type}</span>
          <span className="timeline-date">{date}</span>

          {outcome && <span className={`timeline-outcome ${outcomeClass || ''}`}>{outcome}</span>}

          {hasFollowUp && <span className="timeline-followup">Follow-up</span>}

          <span className="timeline-expand-icon">
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </div>

        {/* Collapsed preview: truncated notes */}
        {!isExpanded && notes && (
          <div className="timeline-notes timeline-notes-preview">{notes}</div>
        )}

        {/* Expanded detail */}
        {isExpanded && (
          <div className="timeline-expanded">
            {notes && (
              <div className="timeline-expanded-row">
                <span className="timeline-expanded-label">Notes</span>
                <p className="timeline-expanded-notes">{notes}</p>
              </div>
            )}
            {duration && (
              <div className="timeline-expanded-row">
                <span className="timeline-expanded-label">Duration</span>
                <span>{duration} min</span>
              </div>
            )}
            {attendees && (
              <div className="timeline-expanded-row">
                <span className="timeline-expanded-label">Attendees</span>
                <span>{attendees}</span>
              </div>
            )}
            {location && (
              <div className="timeline-expanded-row">
                <span className="timeline-expanded-label">Location</span>
                <span>{location}</span>
              </div>
            )}
            {hasFollowUp && (
              <div className="timeline-expanded-row">
                <span className="timeline-expanded-label">Follow-up</span>
                <span className="timeline-followup">
                  {followUpDate ? `by ${followUpDate}` : 'Needed'}
                </span>
              </div>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm timeline-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(touchpoint);
                }}
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * TimelineContainer Component
 *
 * Wraps multiple timeline items in a vertical list with connecting lines
 * Handles empty state and accessibility
 */
export const TimelineContainer = ({ touchpoints, isClickable, onItemClick }) => {
  if (!touchpoints || touchpoints.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No touchpoints yet. Log your first interaction to get started.</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {touchpoints.map((tp, index) => (
        <TimelineItem
          key={tp['Touchpoint ID'] || index}
          touchpoint={tp}
          isClickable={isClickable && !!onItemClick}
          onClick={() => onItemClick && onItemClick(tp)}
        />
      ))}
    </div>
  );
};

export default TimelineItem;
