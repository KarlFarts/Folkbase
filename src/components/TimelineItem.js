import React, { useState, memo } from 'react';
import { Phone, Mail, MessageSquare, Calendar, Zap, FileText } from 'lucide-react';

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

const TimelineItem = memo(function TimelineItem({ touchpoint, isClickable, onClick }) {
  const [_hovering, _setHovering] = useState(false);

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

  return (
    <div
      className={`timeline-item ${isClickable ? 'timeline-item-interactive' : ''}`}
      onClick={isClickable && onClick ? onClick : undefined}
      onMouseEnter={() => _setHovering(true)}
      onMouseLeave={() => _setHovering(false)}
      style={{ cursor: isClickable && onClick ? 'pointer' : 'default' }}
    >
      {/* Timeline Marker: Dot and connecting line */}
      <div className="timeline-marker">
        <div
          className={`timeline-dot ${typeConfig.color} ${outcome ? `outcome-${outcome.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
        >
          <TypeIcon size={6} style={{ color: 'white', flexShrink: 0 }} />
        </div>
        <div className="timeline-line" />
      </div>

      {/* Timeline Content */}
      <div className="timeline-content">
        {/* Header: Type, Date, and Status Badges */}
        <div className="timeline-header">
          <span className="timeline-type">{type}</span>
          <span className="timeline-date">{date}</span>

          {outcome && <span className={`timeline-outcome ${outcomeClass || ''}`}>{outcome}</span>}

          {hasFollowUp && <span className="timeline-followup">Follow-up Needed</span>}
        </div>

        {/* Notes - Displayed inline with moderate detail */}
        {notes && <div className="timeline-notes">{notes}</div>}

        {/* Duration indicator if present */}
        {duration && <div className="timeline-duration">Duration: {duration} min</div>}
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
