import { error as logError } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { readSheetData } from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import WindowTemplate from '../WindowTemplate';

/**
 * LinkEntitiesModal Component
 *
 * Modal that allows users to link notes to multiple entities (contacts, events, lists, tasks)
 * with a tabbed interface for easy selection.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.note - The note being linked
 * @param {Function} props.onSave - Callback with { contactIds: [], eventIds: [], listIds: [], taskIds: [] }
 * @param {Object} props.existingLinks - Pre-selected entities { contacts: [], events: [], lists: [], tasks: [] }
 */
export default function LinkEntitiesModal({ isOpen, onClose, note, onSave, existingLinks = {} }) {
  const { accessToken } = useAuth();
  const { getCurrentSheetId } = useWorkspace();

  // Tab state
  const [activeTab, setActiveTab] = useState('contacts');

  // Entity data
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Selection state
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize selections from existing links
  useEffect(() => {
    if (isOpen && existingLinks) {
      setSelectedContactIds(existingLinks.contacts || []);
      setSelectedEventIds(existingLinks.events || []);
      setSelectedListIds(existingLinks.lists || []);
      setSelectedTaskIds(existingLinks.tasks || []);
    }
  }, [isOpen, existingLinks]);

  // Load entity data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEntities();
      setSearchQuery('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken]);

  const loadEntities = async () => {
    setIsLoading(true);
    setError('');

    try {
      const sheetId = getCurrentSheetId();

      // Load all entity types in parallel
      const [contactsResult, eventsResult, listsResult, tasksResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.LISTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS),
      ]);

      setContacts(contactsResult.data || []);
      setEvents(eventsResult.data || []);
      setLists(listsResult.data || []);
      setTasks(tasksResult.data || []);
    } catch (err) {
      logError('Error loading entities:', err);
      setError('Failed to load entities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter entities based on search query
  const getFilteredContacts = () => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.Name && c.Name.toLowerCase().includes(query)) ||
        (c.Email && c.Email.toLowerCase().includes(query)) ||
        (c.Phone && c.Phone.toLowerCase().includes(query))
    );
  };

  const getFilteredEvents = () => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        (e['Event Name'] && e['Event Name'].toLowerCase().includes(query)) ||
        (e.Description && e.Description.toLowerCase().includes(query))
    );
  };

  const getFilteredLists = () => {
    if (!searchQuery) return lists;
    const query = searchQuery.toLowerCase();
    return lists.filter(
      (l) =>
        (l['List Name'] && l['List Name'].toLowerCase().includes(query)) ||
        (l.Description && l.Description.toLowerCase().includes(query))
    );
  };

  const getFilteredTasks = () => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        (t.Title && t.Title.toLowerCase().includes(query)) ||
        (t.Description && t.Description.toLowerCase().includes(query))
    );
  };

  // Toggle selection handlers
  const toggleContact = (contactId) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleEvent = (eventId) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const toggleList = (listId) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const toggleTask = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Select/Deselect all handlers
  const selectAll = () => {
    if (activeTab === 'contacts') {
      setSelectedContactIds(getFilteredContacts().map((c) => c['Contact ID']));
    } else if (activeTab === 'events') {
      setSelectedEventIds(getFilteredEvents().map((e) => e['Event ID']));
    } else if (activeTab === 'lists') {
      setSelectedListIds(getFilteredLists().map((l) => l['List ID']));
    } else if (activeTab === 'tasks') {
      setSelectedTaskIds(getFilteredTasks().map((t) => t['Task ID']));
    }
  };

  const deselectAll = () => {
    if (activeTab === 'contacts') setSelectedContactIds([]);
    else if (activeTab === 'events') setSelectedEventIds([]);
    else if (activeTab === 'lists') setSelectedListIds([]);
    else if (activeTab === 'tasks') setSelectedTaskIds([]);
  };

  // Save handler
  const handleSave = async () => {
    try {
      const entityLinks = {
        contactIds: selectedContactIds,
        eventIds: selectedEventIds,
        listIds: selectedListIds,
        taskIds: selectedTaskIds,
      };

      await onSave(entityLinks);
      onClose();
    } catch (err) {
      logError('Error saving entity links:', err);
      setError('Failed to save entity links. Please try again.');
    }
  };

  // Helper to check if entity is already linked
  const isContactLinked = (contactId) => {
    return existingLinks.contacts && existingLinks.contacts.includes(contactId);
  };

  const isEventLinked = (eventId) => {
    return existingLinks.events && existingLinks.events.includes(eventId);
  };

  const isListLinked = (listId) => {
    return existingLinks.lists && existingLinks.lists.includes(listId);
  };

  const isTaskLinked = (taskId) => {
    return existingLinks.tasks && existingLinks.tasks.includes(taskId);
  };

  const totalSelected =
    selectedContactIds.length +
    selectedEventIds.length +
    selectedListIds.length +
    selectedTaskIds.length;

  const tabs = [
    { key: 'contacts', label: 'Contacts', count: selectedContactIds.length },
    { key: 'events', label: 'Events', count: selectedEventIds.length },
    { key: 'lists', label: 'Lists', count: selectedListIds.length },
    { key: 'tasks', label: 'Tasks', count: selectedTaskIds.length },
  ];

  const renderEntityList = () => {
    let items = [];
    let selectedIds = [];
    let toggleFn = () => {};
    let isLinkedFn = () => false;
    let idKey = '';
    let nameKey = '';
    let subtitleKey = '';

    if (activeTab === 'contacts') {
      items = getFilteredContacts();
      selectedIds = selectedContactIds;
      toggleFn = toggleContact;
      isLinkedFn = isContactLinked;
      idKey = 'Contact ID';
      nameKey = 'Name';
      subtitleKey = 'Email';
    } else if (activeTab === 'events') {
      items = getFilteredEvents();
      selectedIds = selectedEventIds;
      toggleFn = toggleEvent;
      isLinkedFn = isEventLinked;
      idKey = 'Event ID';
      nameKey = 'Event Name';
      subtitleKey = 'Event Date';
    } else if (activeTab === 'lists') {
      items = getFilteredLists();
      selectedIds = selectedListIds;
      toggleFn = toggleList;
      isLinkedFn = isListLinked;
      idKey = 'List ID';
      nameKey = 'List Name';
      subtitleKey = 'Description';
    } else if (activeTab === 'tasks') {
      items = getFilteredTasks();
      selectedIds = selectedTaskIds;
      toggleFn = toggleTask;
      isLinkedFn = isTaskLinked;
      idKey = 'Task ID';
      nameKey = 'Title';
      subtitleKey = 'Status';
    }

    if (items.length === 0) {
      return (
        <div
          style={{
            padding: 'var(--spacing-lg)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          No {activeTab} found
        </div>
      );
    }

    return items.map((item) => (
      <div
        key={item[idKey]}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--spacing-sm)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-xs)',
          background: selectedIds.includes(item[idKey])
            ? 'var(--color-accent-secondary, #f0f8ff)'
            : 'var(--color-bg-primary)',
          cursor: 'pointer',
        }}
        onClick={() => toggleFn(item[idKey])}
      >
        <input
          type="checkbox"
          checked={selectedIds.includes(item[idKey])}
          onChange={() => toggleFn(item[idKey])}
          style={{ marginRight: 'var(--spacing-sm)' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', fontSize: '14px' }}>
            {item[nameKey] || `Unnamed ${activeTab.slice(0, -1)}`}
          </div>
          {item[subtitleKey] && (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                marginTop: '2px',
              }}
            >
              {subtitleKey === 'Status' ? `Status: ${item[subtitleKey]}` : item[subtitleKey]}
            </div>
          )}
        </div>
        {isLinkedFn(item[idKey]) && <span className="badge badge-success">Linked</span>}
      </div>
    ));
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title="Link Entities"
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
            Save ({totalSelected} selected)
          </button>
        </>
      }
    >
      {note && (
        <div
          style={{
            marginBottom: 'var(--spacing-lg)',
            padding: 'var(--spacing-sm)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Linking note: <strong>{note['Note ID']}</strong>
          </p>
          {note.Content && (
            <p
              style={{
                margin: 'var(--spacing-xs) 0 0 0',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
              }}
            >
              {note.Content.substring(0, 100)}
              {note.Content.length > 100 ? '...' : ''}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`btn btn-ghost btn-sm ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderBottom:
                activeTab === tab.key
                  ? '2px solid var(--color-accent-primary)'
                  : '2px solid transparent',
              borderRadius: 0,
              fontWeight: activeTab === tab.key ? '600' : '400',
              color:
                activeTab === tab.key
                  ? 'var(--color-accent-primary)'
                  : 'var(--color-text-secondary)',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="form-group">
        <input
          type="text"
          className="form-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Select All / Deselect All Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <button className="btn btn-ghost btn-sm" onClick={selectAll} disabled={isLoading}>
          Select All
        </button>
        <button className="btn btn-ghost btn-sm" onClick={deselectAll} disabled={isLoading}>
          Deselect All
        </button>
      </div>

      {/* Entity List */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-xs)',
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            Loading entities...
          </div>
        ) : (
          renderEntityList()
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 'var(--spacing-md)' }}>
          {error}
        </div>
      )}
    </WindowTemplate>
  );
}
