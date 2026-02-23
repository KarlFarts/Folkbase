import React, { memo } from 'react';
import { Phone, Mail, Globe, Building2 } from 'lucide-react';

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

// Quick actions component - call, email, website buttons
const QuickActions = ({ organization }) => {
  const handleCall = (e) => {
    e.stopPropagation();
    const phone = organization['Phone'];
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleEmail = (e) => {
    e.stopPropagation();
    const email = organization['Email'];
    if (email) window.location.href = `mailto:${email}`;
  };

  const handleWebsite = (e) => {
    e.stopPropagation();
    const website = organization['Website'];
    if (website) window.open(website, '_blank', 'noopener,noreferrer');
  };

  const hasPhone = !!organization['Phone'];
  const hasEmail = !!organization['Email'];
  const hasWebsite = !!organization['Website'];

  return (
    <div className="quick-actions">
      {hasPhone && (
        <button
          className="quick-action-btn"
          onClick={handleCall}
          title="Call"
          aria-label={`Call ${organization['Name']}`}
        >
          <Phone />
        </button>
      )}
      {hasEmail && (
        <button
          className="quick-action-btn"
          onClick={handleEmail}
          title="Email"
          aria-label={`Email ${organization['Name']}`}
        >
          <Mail />
        </button>
      )}
      {hasWebsite && (
        <button
          className="quick-action-btn"
          onClick={handleWebsite}
          title="Visit Website"
          aria-label={`Visit ${organization['Name']} website`}
        >
          <Globe />
        </button>
      )}
    </div>
  );
};

// Organization icon component (replaces Avatar for organizations)
const OrganizationIcon = ({ type, size = 'md' }) => {
  return (
    <div
      className={`icon-avatar icon-avatar--${size} icon-avatar--organization`}
      title={type || 'Organization'}
    >
      <Building2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} color="white" />
    </div>
  );
};

const OrganizationCard = memo(function OrganizationCard({ organization, compact, onClick }) {
  const name = organization['Name'] || 'Unknown';
  const type = organization['Type'] || '';
  const industry = organization['Industry'] || '';
  const size = organization['Size'] || '';
  const priority = organization['Priority'] || '';
  const status = organization['Status'] || '';
  const tags = organization['Tags'] || '';
  const lastContact = organization['Last Contact Date'] || '';

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
            <OrganizationIcon type={type} size="sm" />
            <div>
              <div className="contact-name">{name}</div>
              {(type || industry) && (
                <div className="contact-org card-text-sm">
                  {type}
                  {type && industry && ' · '}
                  {industry}
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
      {/* Header: Icon + Name/Type + Badges */}
      <div className="card-row-start">
        <OrganizationIcon type={type} size="md" />
        <div className="card-col">
          <div className="card-col-header">
            {/* Name and Type/Industry */}
            <div className="card-col">
              <div className="contact-name">{name}</div>
              {(type || industry) && (
                <div className="contact-org">
                  {type}
                  {type && industry && ' · '}
                  {industry}
                </div>
              )}
              {size && <div className="contact-org card-text-sm">{size} employees</div>}
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
        <QuickActions organization={organization} />
        <div className="contact-last-contact">Last contact: {formatLastContact(lastContact)}</div>
      </div>
    </div>
  );
});

export default OrganizationCard;
