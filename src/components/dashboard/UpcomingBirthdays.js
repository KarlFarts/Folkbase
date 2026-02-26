import { Cake } from 'lucide-react';

function UpcomingBirthdays({ contacts, onNavigate }) {
  // Filter and calculate upcoming birthdays
  const upcomingBirthdays = contacts
    .filter(contact => {
      if (!contact.Birthday) return false;
      const birthday = new Date(contact.Birthday);
      const today = new Date();
      // Set birthday to this year
      birthday.setFullYear(today.getFullYear());
      // If birthday already passed this year, check next year
      if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.floor((birthday - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 30 && daysUntil >= 0;
    })
    .map(contact => {
      const birthday = new Date(contact.Birthday);
      const today = new Date();
      birthday.setFullYear(today.getFullYear());
      if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.floor((birthday - today) / (1000 * 60 * 60 * 24));
      return { contact, birthday, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const formatBirthdayDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!upcomingBirthdays || upcomingBirthdays.length === 0) {
    return (
      <div className="sidebar-section">
        <h3 className="ub-heading">Upcoming Birthdays</h3>
        <div className="ub-empty">No upcoming birthdays</div>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <h3 className="ub-heading">
        <span className="ub-heading-inner"><Cake size={16} /> Upcoming Birthdays</span>
      </h3>

      <div className="upcoming-birthdays-list">
        {upcomingBirthdays.map((item, index) => {
          const contact = item.contact;
          const daysUntil = item.daysUntil;
          const daysLabel = daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

          return (
            <div
              key={contact['Contact ID'] || index}
              className="upcoming-birthday-item"
              onClick={() => onNavigate(`contact/${contact['Contact ID']}`)}
            >
              <div className="ub-item-name">{contact.Name}</div>
              <div className="ub-item-date">
                <span className={daysUntil <= 3 ? 'text-warning' : ''}>
                  {formatBirthdayDate(item.birthday)} • {daysLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UpcomingBirthdays;
