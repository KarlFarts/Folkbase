import { memo } from 'react';
import { Phone, Globe, MapPin } from 'lucide-react';

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

// Quick actions component - call, website, maps buttons
const QuickActions = ({ location }) => {
  const handleCall = (e) => {
    e.stopPropagation();
    const phone = location['Phone'];
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleWebsite = (e) => {
    e.stopPropagation();
    const website = location['Website'];
    if (website) window.open(website, '_blank', 'noopener,noreferrer');
  };

  const handleMaps = (e) => {
    e.stopPropagation();
    const address = location['Address'];
    if (address) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasPhone = !!location['Phone'];
  const hasWebsite = !!location['Website'];
  const hasAddress = !!location['Address'];

  return (
    <div className="quick-actions">
      {hasPhone && (
        <button
          className="quick-action-btn"
          onClick={handleCall}
          title="Call"
          aria-label={`Call ${location['Name']}`}
        >
          <Phone />
        </button>
      )}
      {hasWebsite && (
        <button
          className="quick-action-btn"
          onClick={handleWebsite}
          title="Visit Website"
          aria-label={`Visit ${location['Name']} website`}
        >
          <Globe />
        </button>
      )}
      {hasAddress && (
        <button
          className="quick-action-btn"
          onClick={handleMaps}
          title="Open in Maps"
          aria-label={`View ${location['Name']} on map`}
        >
          <MapPin />
        </button>
      )}
    </div>
  );
};

// Location icon component (replaces Avatar for locations)
const LocationIcon = ({ type, size = 'md' }) => {
  return (
    <div
      className={`icon-avatar icon-avatar--${size} icon-avatar--location`}
      title={type || 'Location'}
    >
      <MapPin size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} color="white" />
    </div>
  );
};

const LocationCard = memo(function LocationCard({ location, compact, onClick }) {
  const name = location['Name'] || 'Unknown';
  const type = location['Type'] || '';
  const address = location['Address'] || '';
  const priority = location['Priority'] || '';
  const status = location['Status'] || '';
  const tags = location['Tags'] || '';
  const lastContact = location['Last Contact Date'] || '';

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
    if (lower === 'temporarily closed') return 'badge-status-dnc';
    return 'badge-status-inactive';
  };

  const formatLastContact = (date) => {
    if (!date) return 'Never visited';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Truncate address for display
  const truncateAddress = (addr) => {
    if (!addr) return '';
    const lines = addr.split('\n');
    return lines[0].length > 40 ? lines[0].substring(0, 40) + '...' : lines[0];
  };

  if (compact) {
    return (
      <div className="contact-card contact-card--compact" onClick={onClick}>
        <div className="card-row">
          <div className="card-row-body">
            <LocationIcon type={type} size="sm" />
            <div>
              <div className="contact-name">{name}</div>
              {(type || address) && (
                <div className="contact-org">
                  {type}
                  {type && address && ' · '}
                  {truncateAddress(address)}
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
        <LocationIcon type={type} size="md" />
        <div className="card-col">
          <div className="card-col-header">
            {/* Name and Type/Address */}
            <div className="card-col">
              <div className="contact-name">{name}</div>
              {type && <div className="contact-org">{type}</div>}
              {address && (
                <div className="contact-org card-text-sm">
                  <MapPin size={12} className="lc-mappin-icon" />
                  {truncateAddress(address)}
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
        <QuickActions location={location} />
        <div className="contact-last-contact">Last visit: {formatLastContact(lastContact)}</div>
      </div>
    </div>
  );
});

export default LocationCard;
