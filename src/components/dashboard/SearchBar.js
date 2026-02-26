import { useState, useRef, useEffect } from 'react';

function SearchBar({ contacts, onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const filterContacts = () => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    const filtered = contacts.filter(contact => {
      const name = (contact['Name'] || '').toLowerCase();
      const org = (contact['Organization'] || '').toLowerCase();
      const role = (contact['Role'] || '').toLowerCase();
      const phone = (contact['Phone'] || '').toLowerCase();
      const email = (contact['Email'] || '').toLowerCase();

      return name.includes(term) || org.includes(term) || role.includes(term) || phone.includes(term) || email.includes(term);
    });

    return filtered.slice(0, 5);
  };

  const getMatchedField = (contact, term) => {
    const searchLower = term.toLowerCase();
    const phone = (contact['Phone'] || '').toLowerCase();
    const email = (contact['Email'] || '').toLowerCase();

    if (phone.includes(searchLower)) return contact['Phone'];
    if (email.includes(searchLower)) return contact['Email'];
    return contact['Organization'] || contact['Role'] || '';
  };

  const results = filterContacts();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (contactId) => {
    setSearchTerm('');
    setShowResults(false);
    onNavigate('contact-profile', contactId);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowResults(true);
  };

  return (
    <div className="sidebar-search" ref={searchRef}>
      <input
        type="text"
        className="search-input"
        placeholder="Search contacts..."
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setShowResults(true)}
      />

      {showResults && searchTerm.trim() && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              {results.map(contact => (
                <div
                  key={contact['Contact ID']}
                  className="search-result-item"
                  onClick={() => handleResultClick(contact['Contact ID'])}
                >
                  <div className="sb-result-name">{contact['Name']}</div>
                  {getMatchedField(contact, searchTerm) && (
                    <div className="sb-result-detail">{getMatchedField(contact, searchTerm)}</div>
                  )}
                </div>
              ))}
              {contacts.filter(c => {
                const term = searchTerm.toLowerCase();
                const name = (c['Name'] || '').toLowerCase();
                const org = (c['Organization'] || '').toLowerCase();
                const role = (c['Role'] || '').toLowerCase();
                const phone = (c['Phone'] || '').toLowerCase();
                const email = (c['Email'] || '').toLowerCase();
                return name.includes(term) || org.includes(term) || role.includes(term) || phone.includes(term) || email.includes(term);
              }).length > 5 && (
                <div className="search-result-item sb-result-overflow">
                  See all {contacts.filter(c => {
                    const term = searchTerm.toLowerCase();
                    const name = (c['Name'] || '').toLowerCase();
                    const org = (c['Organization'] || '').toLowerCase();
                    const role = (c['Role'] || '').toLowerCase();
                    const phone = (c['Phone'] || '').toLowerCase();
                    const email = (c['Email'] || '').toLowerCase();
                    return name.includes(term) || org.includes(term) || role.includes(term) || phone.includes(term) || email.includes(term);
                  }).length} results
                </div>
              )}
            </>
          ) : (
            <div className="search-result-item sb-result-overflow">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
