import React, { useState } from 'react';

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
    <div className="attendee-selector" style={{ marginBottom: '12px' }}>
      <label
        htmlFor="attendee-search"
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '8px',
          color: 'var(--color-text-primary)',
        }}
      >
        Attendees
      </label>
      <input
        id="attendee-search"
        type="text"
        className="form-input"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '8px' }}
      />
      <div
        className="attendee-list"
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid var(--border-color-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px',
          background: 'var(--color-bg-secondary)',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '8px',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            No contacts found
          </div>
        ) : (
          filtered.slice(0, 20).map((c) => (
            <label
              key={c['Contact ID']}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-xs)',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c['Contact ID'])}
                onChange={() => toggleContact(c['Contact ID'])}
                style={{ marginRight: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {c.Name}
                </div>
                {c.Organization && (
                  <div
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}
                  >
                    {c.Organization}
                  </div>
                )}
              </div>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          {selectedIds.length} attendee{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

export default AttendeeSelector;
