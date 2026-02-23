import React from 'react';
import CollapsibleWidget from './CollapsibleWidget';

function UpcomingEventsWidget({ events, contacts, onNavigate, isSidebar = false }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Categorize events
  const todayEvents = [];
  const upcomingEvents = [];
  const celebrations = [];

  (events || []).forEach(event => {
    const eventDate = new Date(event['Event Date']);
    eventDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
    const eventType = (event['Event Type'] || '').toLowerCase();

    if (diffDays < 0) return; // Skip past events
    if (diffDays === 0) todayEvents.push(event);
    else if (eventType.includes('birthday') || eventType.includes('celebration')) celebrations.push(event);
    else if (diffDays <= 7) upcomingEvents.push(event);
  });

  // Add birthdays from contacts (next 30 days)
  (contacts || []).filter(c => c.Birthday).forEach(contact => {
    const birthday = new Date(contact.Birthday);
    birthday.setFullYear(today.getFullYear());
    if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
    const daysUntil = Math.floor((birthday - today) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 30) {
      celebrations.push({
        id: `bday-${contact['Contact ID']}`,
        name: `${contact['Name']}'s Birthday`,
        date: birthday,
        isBirthday: true,
        contactId: contact['Contact ID']
      });
    }
  });

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderSection = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="upcoming-events-section">
        <div className="upcoming-events-section-header">
          <span className="section-title">{title}</span>
        </div>
        {items.slice(0, 4).map((item, i) => (
          <div
            key={item['Event ID'] || item.id || i}
            className="upcoming-event-row"
            onClick={() => {
              if (item.isBirthday) onNavigate('contact-profile', item.contactId);
              else onNavigate('event-details', item['Event ID']);
            }}
          >
            <span className="upcoming-event-name">{item['Event Name'] || item.name}</span>
            <span className="upcoming-event-date">{formatEventDate(item['Event Date'] || item.date)}</span>
          </div>
        ))}
      </div>
    );
  };

  const totalCount = todayEvents.length + upcomingEvents.length + celebrations.length;
  if (totalCount === 0) return null;

  return (
    <CollapsibleWidget
      title="Upcoming"
      count={totalCount}
      defaultExpanded={!isSidebar}
      onViewAll={() => onNavigate('events')}
      viewAllLabel="See all"
    >
      <div className={`upcoming-events-content ${isSidebar ? 'sidebar-mode' : ''}`}>
        {renderSection('Today', todayEvents)}
        {renderSection('Upcoming', upcomingEvents)}
        {renderSection('Celebrations', celebrations)}
      </div>
    </CollapsibleWidget>
  );
}

export default UpcomingEventsWidget;
