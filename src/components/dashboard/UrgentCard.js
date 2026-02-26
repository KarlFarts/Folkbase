import Avatar from '../Avatar';

function UrgentCard({
  contact,
  urgentType,
  onNavigate,
  lastTouchpoint,
  urgentDetail,
  onMarkDone,
  isMarking,
}) {
  const name = contact['Name'] || 'Unknown';
  const org = contact['Organization'] || '';
  const contactId = contact['Contact ID'];

  const formatRelativeDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getLastTouchpointSummary = () => {
    if (!lastTouchpoint) return 'No recent touchpoints';
    const type = lastTouchpoint['Type'] || 'Contact';
    const date = lastTouchpoint['Date'];
    const notes = lastTouchpoint['Notes'] || '';

    const relativeDate = formatRelativeDate(date);
    const notesPreview = notes.length > 50 ? notes.substring(0, 50) + '...' : notes;

    return `${type} ${relativeDate}${notesPreview ? ' - ' + notesPreview : ''}`;
  };

  const getUrgentBadgeClass = () => {
    if (urgentType === 'overdue') return 'badge badge-priority-urgent';
    if (urgentType === 'dueToday') return 'badge-priority-high';
    return 'badge-priority-high';
  };

  const getCardClass = () => {
    return `urgent-card urgent-card-${urgentType}`;
  };

  const getActionButton = () => {
    if (urgentType === 'followup' && onMarkDone) {
      return {
        label: 'Mark Done',
        action: (e) => {
          e.stopPropagation();
          onMarkDone(contactId);
        },
        secondary: true,
      };
    }
    if (urgentType === 'overdue' || urgentType === 'dueToday') {
      return {
        label: 'Log Follow-up',
        action: () => onNavigate('touchpoints'),
      };
    }
    return {
      label: 'View Profile',
      action: () => onNavigate('contact-profile', contactId),
    };
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking the button
    if (e.target.closest('button')) return;
    onNavigate('contact-profile', contactId);
  };

  const actionButton = getActionButton();

  return (
    <div className={getCardClass()} onClick={handleCardClick}>
      <div className="urgent-card-left">
        <div className="uc-avatar-row">
          <Avatar
            name={name}
            size="sm"
            customColor={contact['Avatar Color']}
            customIcon={contact['Avatar Icon']}
          />
          <div className="uc-name-block">
            <div className="uc-name">{name}</div>
            {org && <div className="uc-org">{org}</div>}
          </div>
        </div>

        <div className="uc-summary">{getLastTouchpointSummary()}</div>

        <div className="uc-badge-row">
          <span className={getUrgentBadgeClass()}>{urgentDetail}</span>
        </div>
      </div>

      <div className="urgent-card-right">
        <button
          className={`btn ${actionButton.secondary ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={actionButton.action}
          disabled={isMarking}
        >
          {isMarking ? 'Saving...' : actionButton.label}
        </button>
      </div>
    </div>
  );
}

export default UrgentCard;
