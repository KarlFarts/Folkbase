import { useState, useEffect, useCallback } from 'react';
import { Search, User, Calendar, Building2, CheckSquare, X } from 'lucide-react';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import './UniversalSearch.css';

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
    <div className="us-overlay" onClick={onClose}>
      <div className="card us-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header us-header">
          <div className="us-header-row">
            <Search size={20} />
            <input
              type="text"
              className="form-input us-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, events, organizations, tasks..."
              autoFocus
            />
            {onClose && (
              <button onClick={onClose} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            )}
          </div>
          {query && (
            <p className="text-muted us-result-count">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        <div className="card-body">
          {!query && (
            <div className="us-empty-state">
              <Search size={48} className="us-empty-icon" />
              <p>Search by name, ID, email, tag, or any other field</p>
              <p className="us-empty-hint">
                Examples: "John Smith", "CON001", "Labor", "Meeting"
              </p>
            </div>
          )}

          {query && totalResults === 0 && !loading && (
            <div className="us-no-results">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {/* Contacts Results */}
          {results.contacts.length > 0 && (
            <div className="us-section">
              <h4 className="us-section-heading">
                <User size={18} /> Contacts ({results.contacts.length})
              </h4>
              {results.contacts.map((contact) => (
                <div
                  key={contact['Contact ID']}
                  onClick={() => handleResultClick('contact', contact['Contact ID'])}
                  className="card us-result-item"
                >
                  <div className="us-result-inner">
                    <div>
                      <strong>{contact['Display Name'] || contact.Name}</strong>
                      <div className="text-muted us-result-sub">
                        {contact.Organization && <span>{contact.Organization}</span>}
                        {contact.Organization && contact.Role && <span> · </span>}
                        {contact.Role && <span>{contact.Role}</span>}
                      </div>
                    </div>
                    <span className="badge badge-status-inactive us-result-id">
                      {contact['Contact ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events Results */}
          {results.events.length > 0 && (
            <div className="us-section">
              <h4 className="us-section-heading">
                <Calendar size={18} /> Events ({results.events.length})
              </h4>
              {results.events.map((event) => (
                <div
                  key={event['Event ID']}
                  onClick={() => handleResultClick('event', event['Event ID'])}
                  className="card us-result-item"
                >
                  <div className="us-result-inner">
                    <div>
                      <strong>{event['Event Name']}</strong>
                      <div className="text-muted us-result-sub">
                        {event['Event Date'] && <span>{event['Event Date']}</span>}
                        {event['Event Date'] && event['Event Type'] && <span> · </span>}
                        {event['Event Type'] && <span>{event['Event Type']}</span>}
                      </div>
                    </div>
                    <span className="badge badge-status-inactive us-result-id">
                      {event['Event ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Organizations Results */}
          {results.organizations.length > 0 && (
            <div className="us-section">
              <h4 className="us-section-heading">
                <Building2 size={18} /> Organizations ({results.organizations.length})
              </h4>
              {results.organizations.map((org) => (
                <div
                  key={org['Organization ID']}
                  onClick={() => handleResultClick('organization', org['Organization ID'])}
                  className="card us-result-item"
                >
                  <div className="us-result-inner">
                    <div>
                      <strong>{org['Display Name'] || org.Name}</strong>
                      <div className="text-muted us-result-sub">
                        {org.Type && <span>{org.Type}</span>}
                        {org.Type && org.Industry && <span> · </span>}
                        {org.Industry && <span>{org.Industry}</span>}
                      </div>
                    </div>
                    <span className="badge badge-status-inactive us-result-id">
                      {org['Organization ID']}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div className="us-section">
              <h4 className="us-section-heading">
                <CheckSquare size={18} /> Tasks ({results.tasks.length})
              </h4>
              {results.tasks.map((task) => (
                <div
                  key={task['Task ID']}
                  onClick={() => handleResultClick('task', task['Task ID'])}
                  className="card us-result-item"
                >
                  <div className="us-result-inner">
                    <div>
                      <strong>{task.Title}</strong>
                      <div className="text-muted us-result-sub">
                        {task.Status && (
                          <span className="badge badge-status-inactive us-task-status">
                            {task.Status}
                          </span>
                        )}
                        {task['Due Date'] && <span>Due: {task['Due Date']}</span>}
                      </div>
                    </div>
                    <span className="badge badge-status-inactive us-result-id">
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
