import React from 'react';
import CollapsibleWidget from './CollapsibleWidget';

const ProfileCompletionWidget = ({ items, onNavigate }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <CollapsibleWidget
      title="Profile Completion"
      labelText="Incomplete"
      count={items.length}
      onViewAll={() => onNavigate('contacts')}
      defaultExpanded={true}
    >
      <div style={{ padding: '8px' }}>
        {items.slice(0, 5).map((item) => (
          <div
            key={item.contact['Contact ID'] || item.contact.Name}
            className="profile-completion-item"
            onClick={() => {
              const contactId = item.contact['Contact ID'];
              if (contactId) {
                onNavigate(`contact-profile?id=${contactId}`);
              }
            }}
          >
            <div className="profile-completion-name">{item.contact.Name}</div>
            <div className="profile-completion-missing">
              Missing: {item.missingFields.map((field) => (
                <span key={field} className="profile-completion-badge">
                  {field}
                </span>
              ))}
            </div>
          </div>
        ))}
        {items.length > 5 && (
          <div style={{
            padding: '8px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--font-size-xs)'
          }}>
            +{items.length - 5} more
          </div>
        )}
      </div>
    </CollapsibleWidget>
  );
};

export default ProfileCompletionWidget;
