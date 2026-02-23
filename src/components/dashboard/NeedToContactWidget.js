import React from 'react';
import CollapsibleWidget from './CollapsibleWidget';

function NeedToContactWidget({ items, onNavigate, onViewAll, onMarkDone, markingDone }) {
  if (!items || items.length === 0) return null;

  const formatLastContact = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const displayItems = items.slice(0, 4);

  return (
    <CollapsibleWidget title="Need to Contact" count={items.length} defaultExpanded={false} onViewAll={onViewAll}>
      <div className="need-contact-widget-list">
        {displayItems.map((item, index) => {
          const contact = item.contact;
          const isMarking = markingDone === contact['Contact ID'];

          return (
            <div
              key={contact['Contact ID'] || index}
              className="need-contact-item"
              onClick={() => onNavigate('contact-profile', contact['Contact ID'])}
            >
              <div className="need-contact-left">
                <div className="avatar-sm">{contact['Name']?.charAt(0) || '?'}</div>
                <div className="need-contact-info">
                  <div className="need-contact-name">{contact['Name']}</div>
                  <div className="need-contact-detail">
                    Last: {formatLastContact(contact['Last Contact Date'])}
                  </div>
                </div>
              </div>
              <div className="need-contact-right">
                <span className="need-contact-reason">{item.urgentDetail}</span>
                {onMarkDone && (
                  <button
                    className="btn btn-sm"
                    onClick={(e) => { e.stopPropagation(); onMarkDone(contact['Contact ID']); }}
                    disabled={isMarking}
                  >
                    {isMarking ? '...' : 'Done'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 4 && <div className="need-contact-more">+{items.length - 4} more</div>}
    </CollapsibleWidget>
  );
}

export default NeedToContactWidget;
