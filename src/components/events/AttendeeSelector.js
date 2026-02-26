import { useState } from 'react';

function AttendeeSelector({ contacts, selectedIds, onChange }) {
  const [search, setSearch] = useState('');

  const filtered = contacts.filter(
    (c) =>
      c.Name.toLowerCase().includes(search.toLowerCase()) ||
      (c.Organization && c.Organization.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleContact = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="attendee-selector ats-wrapper">
      <label
        htmlFor="attendee-search"
        className="ats-label"
      >
        Attendees
      </label>
      <input
        id="attendee-search"
        type="text"
        className="form-input ats-search-input"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div
        className="attendee-list ats-list"
      >
        {filtered.length === 0 ? (
          <div className="ats-empty">
            No contacts found
          </div>
        ) : (
          filtered.slice(0, 20).map((c) => (
            <label
              key={c['Contact ID']}
              className="ats-contact-row"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c['Contact ID'])}
                onChange={() => toggleContact(c['Contact ID'])}
                className="ats-checkbox"
              />
              <div className="ats-contact-info">
                <div className="ats-contact-name">
                  {c.Name}
                </div>
                {c.Organization && (
                  <div className="ats-contact-org">
                    {c.Organization}
                  </div>
                )}
              </div>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <div className="ats-selected-count">
          {selectedIds.length} attendee{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

export default AttendeeSelector;
