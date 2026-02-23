import React, { memo } from 'react';
import Avatar from './Avatar';
import { Phone, MessageSquare, Mail } from 'lucide-react';

// Tag overflow helper - shows max N tags with "+X more" indicator
const renderTags = (tagsString, maxVisible = 2) => {
  if (!tagsString) return null;

  const tagArray = tagsString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const visibleTags = tagArray.slice(0, maxVisible);
  const hiddenCount = tagArray.length - maxVisible;

  return (
    <div className="tags-container">
      {visibleTags.map((tag, i) => (
        <span key={i} className="tag">
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="tag-overflow" title={tagArray.slice(maxVisible).join(', ')}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
};

// Quick actions component - call, text, email buttons
const QuickActions = ({ contact }) => {
  const handleCall = (e) => {
    e.stopPropagation();
    const phone = contact['Phone'] || contact['Mobile'];
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleText = (e) => {
    e.stopPropagation();
    const mobile = contact['Mobile'] || contact['Phone'];
    if (mobile) window.location.href = `sms:${mobile}`;
  };

  const handleEmail = (e) => {
    e.stopPropagation();
    const email = contact['Email'];
    if (email) window.location.href = `mailto:${email}`;
  };

  const hasPhone = !!(contact['Phone'] || contact['Mobile']);
  const hasEmail = !!contact['Email'];

  return (
    <div className="quick-actions">
      {hasPhone && (
        <button
          className="quick-action-btn"
          onClick={handleCall}
          title="Call"
          aria-label={`Call ${contact['Name']}`}
        >
          <Phone />
        </button>
      )}
      {hasPhone && (
        <button
          className="quick-action-btn"
          onClick={handleText}
          title="Text"
          aria-label={`Text ${contact['Name']}`}
        >
          <MessageSquare />
        </button>
      )}
      {hasEmail && (
        <button
          className="quick-action-btn"
          onClick={handleEmail}
          title="Email"
          aria-label={`Email ${contact['Name']}`}
        >
          <Mail />
        </button>
      )}
    </div>
  );
};

const ContactCard = memo(function ContactCard({ contact, compact, onClick }) {
  const name = contact['Name'] || 'Unknown';
  const org = contact['Organization'] || '';
  const role = contact['Role'] || '';
  const priority = contact['Priority'] || '';
  const status = contact['Status'] || '';
  const tags = contact['Tags'] || '';
  const lastContact = contact['Last Contact Date'] || '';

  const getPriorityClass = (priority) => {
    const lower = (priority || '').toLowerCase();
    if (lower === 'urgent') return 'badge-priority-urgent';
    if (lower === 'high') return 'badge-priority-high';
    if (lower === 'medium') return 'badge-priority-medium';
    if (lower === 'low') return 'badge-priority-low';
    return 'badge-priority-none';
  };

  const getStatusClass = (status) => {
    const lower = (status || '').toLowerCase();
    if (lower === 'active') return 'badge-status-active';
    if (lower === 'inactive') return 'badge-status-inactive';
    if (lower === 'do not contact') return 'badge-status-dnc';
    return 'badge-status-inactive';
  };

  const formatLastContact = (date) => {
    if (!date) return 'Never contacted';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (compact) {
    return (
      <div className="contact-card contact-card--compact" onClick={onClick}>
        <div className="card-row">
          <div className="card-row-body">
            <Avatar
              name={name}
              size="sm"
              customColor={contact['Avatar Color']}
              customIcon={contact['Avatar Icon']}
            />
            <div>
              <div className="contact-name">{name}</div>
              {org && (
                <div className="contact-org">
                  {org}
                  {role && ` · ${role}`}
                </div>
              )}
            </div>
          </div>
          <div className="card-badges">
            {priority && <span className={`badge ${getPriorityClass(priority)}`}>{priority}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-card" onClick={onClick}>
      {/* Header: Avatar + Name/Org + Badges */}
      <div className="card-row-start">
        <Avatar
          name={name}
          size="md"
          customColor={contact['Avatar Color']}
          customIcon={contact['Avatar Icon']}
        />
        <div className="card-col">
          <div className="card-col-header">
            {/* Name and Organization */}
            <div className="card-col">
              <div className="contact-name">{name}</div>
              {(org || role) && (
                <div className="contact-org">
                  {org}
                  {org && role && ' · '}
                  {role}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="card-badges">
              {priority && (
                <span className={`badge ${getPriorityClass(priority)}`}>{priority}</span>
              )}
              {status && <span className={`badge ${getStatusClass(status)}`}>{status}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tags with overflow */}
      {renderTags(tags, 2)}

      {/* Bottom row: Quick actions + Last contact */}
      <div className="card-footer">
        <QuickActions contact={contact} />
        <div className="contact-last-contact">Last contact: {formatLastContact(lastContact)}</div>
      </div>
    </div>
  );
});

export default ContactCard;
