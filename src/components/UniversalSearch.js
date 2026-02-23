import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Calendar, Building2, CheckSquare, X } from 'lucide-react';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';

/**
 * UniversalSearch - Global search across all entity types
 * Auto-detects entity type from ID prefix and enables cross-entity navigation
 */
function UniversalSearch({ onNavigate, onClose }) {
  const { accessToken } = useAuth();
  const activeSheetId = useActiveSheetId();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    contacts: [],
    events: [],
    organizations: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState({
    contacts: [],
    events: [],
    organizations: [],
    tasks: [],
  });

  const loadAllData = useCallback(async () => {
    if (!accessToken || !activeSheetId) return;

    try {
      const [contactsData, eventsData, orgsData, tasksData] = await Promise.all([
        readSheetData(accessToken, activeSheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, activeSheetId, SHEETS.EVENTS),
        readSheetData(accessToken, activeSheetId, SHEETS.ORGANIZATIONS),
        readSheetData(accessToken, activeSheetId, SHEETS.TASKS),
      ]);

      setAllData({
        contacts: contactsData,
        events: eventsData,
        organizations: orgsData,
        tasks: tasksData,
      });
    } catch (error) {
      console.error('Error loading data for search:', error);
    }
  }, [accessToken, activeSheetId]);

  const performSearch = useCallback(
    (searchQuery) => {
      setLoading(true);
      const lowerQuery = searchQuery.toLowerCase();

      // Detect if query is an ID (starts with entity prefix)
      const isId = /^(CON|EVT|ORG|TSK)\d+$/i.test(searchQuery.trim());

      // Search contacts
      const contactResults = allData.contacts.filter((contact) => {
        if (isId) return contact['Contact ID']?.toUpperCase() === searchQuery.trim().toUpperCase();
        const searchableText = [
          contact['Display Name'],
          contact.Name,
          contact['First Name'],
          contact['Last Name'],
          contact.Email,
          contact['Email Personal'],
          contact['Email Work'],
          contact.Phone,
          contact['Phone Mobile'],
          contact.Organization,
          contact.Tags,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(lowerQuery);
      });

      // Search events
      const eventResults = allData.events.filter((event) => {
        if (isId) return event['Event ID']?.toUpperCase() === searchQuery.trim().toUpperCase();
        const searchableText = [
          event['Event Name'],
          event['Event Type'],
          event.Location,
          event.Description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(lowerQuery);
      });

      // Search organizations
      const orgResults = allData.organizations.filter((org) => {
        if (isId) return org['Organization ID']?.toUpperCase() === searchQuery.trim().toUpperCase();
        const searchableText = [org.Name, org['Display Name'], org.Type, org.Industry, org.Tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(lowerQuery);
      });

      // Search tasks
      const taskResults = allData.tasks.filter((task) => {
        if (isId) return task['Task ID']?.toUpperCase() === searchQuery.trim().toUpperCase();
        const searchableText = [
          task.Title,
          task.Description,
          task['Task Type'],
          task.Status,
          task.Tags,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(lowerQuery);
      });

      setResults({
        contacts: contactResults.slice(0, 5),
        events: eventResults.slice(0, 5),
        organizations: orgResults.slice(0, 5),
        tasks: taskResults.slice(0, 5),
      });
      setLoading(false);
    },
    [allData]
  );

  useEffect(() => {
    async function fetchData() {
      await loadAllData();
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeSheetId]);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults({ contacts: [], events: [], organizations: [], tasks: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, allData]);

  const handleResultClick = (entityType, entityId) => {
    const routes = {
      contact: 'contact-profile',
      event: 'event-details',
      organization: 'organization-profile',
      task: 'task-profile',
    };

    onNavigate(routes[entityType], entityId);
    if (onClose) onClose();
  };

  const totalResults =
    results.contacts.length +
    results.events.length +
    results.organizations.length +
    results.tasks.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--spacing-xl)',
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '700px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="card-header"
          style={{ position: 'sticky', top: 0, background: 'var(--color-bg-elevated)', zIndex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <Search size={20} />
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, events, organizations, tasks..."
              autoFocus
              style={{ flex: 1, border: 'none', fontSize: 'var(--font-size-lg)' }}
            />
            {onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            )}
          </div>
          {query && (
            <p
              className="text-muted"
              style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}
            >
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        <div className="card-body">
          {!query && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Search size={48} style={{ margin: '0 auto var(--spacing-md) auto', opacity: 0.5 }} />
              <p>Search by name, ID, email, tag, or any other field</p>
              <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-sm)' }}>
                Examples: "John Smith", "CON001", "Labor", "Meeting"
              </p>
            </div>
          )}

          {query && totalResults === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                color: 'var(--color-text-muted)',
              }}
            >
              <p>No results found for "{query}"</p>
            </div>
          )}

          {/* Contacts Results */}
          {results.contacts.length > 0 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h4
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <User size={18} /> Contacts ({results.contacts.length})
              </h4>
              {results.contacts.map((contact) => (
                <div
                  key={contact['Contact ID']}
                  onClick={() => handleResultClick('contact', contact['Contact ID'])}
                  className="card"
                  style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-elevated)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <strong>{contact['Display Name'] || contact.Name}</strong>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {contact.Organization && <span>{contact.Organization}</span>}
                        {contact.Organization && contact.Role && <span> · </span>}
                        {contact.Role && <span>{contact.Role}</span>}
                      </div>
                    </div>
                    <span
                      className="badge badge-status-inactive"
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {contact['Contact ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events Results */}
          {results.events.length > 0 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h4
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <Calendar size={18} /> Events ({results.events.length})
              </h4>
              {results.events.map((event) => (
                <div
                  key={event['Event ID']}
                  onClick={() => handleResultClick('event', event['Event ID'])}
                  className="card"
                  style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-elevated)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <strong>{event['Event Name']}</strong>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {event['Event Date'] && <span>{event['Event Date']}</span>}
                        {event['Event Date'] && event['Event Type'] && <span> · </span>}
                        {event['Event Type'] && <span>{event['Event Type']}</span>}
                      </div>
                    </div>
                    <span
                      className="badge badge-status-inactive"
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {event['Event ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Organizations Results */}
          {results.organizations.length > 0 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h4
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <Building2 size={18} /> Organizations ({results.organizations.length})
              </h4>
              {results.organizations.map((org) => (
                <div
                  key={org['Organization ID']}
                  onClick={() => handleResultClick('organization', org['Organization ID'])}
                  className="card"
                  style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-elevated)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <strong>{org['Display Name'] || org.Name}</strong>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {org.Type && <span>{org.Type}</span>}
                        {org.Type && org.Industry && <span> · </span>}
                        {org.Industry && <span>{org.Industry}</span>}
                      </div>
                    </div>
                    <span
                      className="badge badge-status-inactive"
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {org['Organization ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h4
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <CheckSquare size={18} /> Tasks ({results.tasks.length})
              </h4>
              {results.tasks.map((task) => (
                <div
                  key={task['Task ID']}
                  onClick={() => handleResultClick('task', task['Task ID'])}
                  className="card"
                  style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-bg-elevated)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <strong>{task.Title}</strong>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {task.Status && (
                          <span
                            className="badge badge-status-inactive"
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              marginRight: 'var(--spacing-xs)',
                            }}
                          >
                            {task.Status}
                          </span>
                        )}
                        {task['Due Date'] && <span>Due: {task['Due Date']}</span>}
                      </div>
                    </div>
                    <span
                      className="badge badge-status-inactive"
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {task['Task ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UniversalSearch;
