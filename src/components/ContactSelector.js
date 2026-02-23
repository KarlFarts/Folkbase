import React, { useState, useRef, useEffect } from 'react';

/**
 * ContactSelector Component
 *
 * A searchable dropdown component for selecting contacts
 * Shows contact name and organization in a filterable list
 *
 * @param {Array} contacts - Array of contact objects
 * @param {string} value - Selected contact ID
 * @param {Function} onChange - Callback when contact is selected (receives contact ID)
 * @param {string} placeholder - Placeholder text for search input
 */
function ContactSelector({ contacts, value, onChange, placeholder = "Search contacts..." }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get the selected contact's name for display
  const selectedContact = contacts.find(c => c['Contact ID'] === value);
  const displayValue = selectedContact
    ? `${selectedContact['First Name'] || ''} ${selectedContact['Last Name'] || ''}`.trim()
    : '';

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => {
    if (!search && !isOpen) return false;

    const fullName = `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim().toLowerCase();
    const org = (contact['Organization'] || '').toLowerCase();
    const searchLower = search.toLowerCase();

    return fullName.includes(searchLower) || org.includes(searchLower);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (contact) => {
    onChange(contact['Contact ID']);
    setSearch(`${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim());
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setIsOpen(true);

    // If clearing the input, also clear the selection
    if (e.target.value === '') {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // If there's a selected contact, show its name in search when opening
    if (selectedContact && !search) {
      setSearch(displayValue);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-input"
        value={search || displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%',
          paddingRight: 'var(--spacing-xl)'
        }}
      />

      {/* Dropdown arrow icon */}
      <div style={{
        position: 'absolute',
        right: 'var(--spacing-sm)',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)'
      }}>
        ▼
      </div>

      {/* Dropdown list */}
      {isOpen && filteredContacts.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1001
        }}>
          {filteredContacts.map(contact => {
            const fullName = `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim();
            const org = contact['Organization'];

            return (
              <div
                key={contact['Contact ID']}
                onClick={() => handleSelect(contact)}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border-default)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: org ? '2px' : 0
                }}>
                  {fullName || 'Unknown Contact'}
                </div>
                {org && (
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {org}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {isOpen && search && filteredContacts.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-md)',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          zIndex: 1001
        }}>
          No contacts found
        </div>
      )}
    </div>
  );
}

export default ContactSelector;
