import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import { syncEvents } from '../utils/syncEngine';
import EventCard from '../components/events/EventCard';
import CalendarView from '../components/events/CalendarView';
import TimelineView from '../components/events/TimelineView';
import ImportEventModal from '../components/events/ImportEventModal';
import SyncConflictModal from '../components/events/SyncConflictModal';
import { ListPageSkeleton } from '../components/SkeletonLoader';
import { useNotification } from '../contexts/NotificationContext';

function EventsList({ onNavigate }) {
  const { accessToken, refreshAccessToken, hasCalendarAccess } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'timeline'
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    lastSyncedAt: null,
    lastPushed: 0,
    lastPulled: 0,
  });

  // Load sync status from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('touchpoint_calendar_sync_status');
    if (stored) {
      try {
        setSyncStatus(JSON.parse(stored));
      } catch {
        // Invalid stored status, use defaults
      }
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!sheetId || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setNeedsReauth(false);

      const [eventsResult, contactsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.EVENTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS, refreshAccessToken),
      ]);

      setEvents(eventsResult.data || []);
      setContacts(contactsResult.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to load events. Make sure you have access to the Google Sheet.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, sheetId, refreshAccessToken]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Check if calendar sync is enabled
  useEffect(() => {
    const checkCalendarSync = async () => {
      const settings = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
      const hasAccess = await hasCalendarAccess();
      setCalendarSyncEnabled(settings.enabled === true && hasAccess);
    };
    checkCalendarSync();
  }, [hasCalendarAccess]);

  // Handle importing a Google Calendar event
  const handleImportEvent = useCallback((googleEvent) => {
    setSelectedGoogleEvent(googleEvent);
    setImportModalOpen(true);
  }, []);

  const handleImportModalClose = useCallback(() => {
    setImportModalOpen(false);
    setSelectedGoogleEvent(null);
  }, []);

  const handleImported = useCallback(() => {
    // Reload events after import
    loadEvents();
  }, [loadEvents]);

  const handleConflictResolved = useCallback(() => {
    // Move to next conflict or close if done
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      setConflicts([]);
      setCurrentConflictIndex(0);
    }
    // Reload events after resolution
    loadEvents();
  }, [currentConflictIndex, conflicts.length, loadEvents]);

  const handleConflictModalClose = useCallback(() => {
    setConflicts([]);
    setCurrentConflictIndex(0);
  }, []);

  // Sync with Google Calendar
  const handleSync = useCallback(async () => {
    if (!accessToken || !sheetId || !calendarSyncEnabled) return;

    setSyncing(true);
    try {
      const result = await syncEvents(accessToken, sheetId);

      // Update personal events for display
      setPersonalEvents(result.personalEvents || []);

      // Reload CRM events to get synced data
      const eventsResult = await readSheetData(
        accessToken,
        sheetId,
        SHEETS.EVENTS,
        refreshAccessToken
      );
      setEvents(eventsResult.data || []);

      // Notify user of sync results
      const messages = [];
      if (result.pushed.length > 0) {
        messages.push(`Pushed ${result.pushed.length} event(s) to Calendar`);
      }
      if (result.pulled.length > 0) {
        messages.push(`Updated ${result.pulled.length} event(s) from Calendar`);
      }
      if (result.conflicts.length > 0) {
        messages.push(`${result.conflicts.length} conflict(s) detected`);
      }
      if (result.errors.length > 0) {
        messages.push(`${result.errors.length} error(s)`);
      }

      if (messages.length === 0) {
        notify('Calendar synced - no changes', 'success');
      } else {
        notify(messages.join(', '), result.errors.length > 0 ? 'warning' : 'success');
      }

      // Handle conflicts - show SyncConflictModal for each conflict
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setCurrentConflictIndex(0);
      }

      // Update sync status
      const newStatus = {
        lastSyncedAt: new Date().toISOString(),
        lastPushed: result.pushed.length,
        lastPulled: result.pulled.length,
      };
      setSyncStatus(newStatus);
      localStorage.setItem('touchpoint_calendar_sync_status', JSON.stringify(newStatus));
    } catch (error) {
      notify('Calendar sync failed: ' + error.message, 'error');
    } finally {
      setSyncing(false);
    }
  }, [accessToken, sheetId, calendarSyncEnabled, refreshAccessToken, notify]);

  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

  // Time-based event grouping
  const groupedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = events.filter((event) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        (event['Event Name'] || '').toLowerCase().includes(searchLower) ||
        (event['Event Location'] || '').toLowerCase().includes(searchLower) ||
        (event['Description'] || '').toLowerCase().includes(searchLower)
      );
    });

    const todayEvents = [];
    const thisWeekEvents = [];
    const thisMonthEvents = [];
    const upcomingEvents = [];
    const pastEvents = [];

    const oneDay = 1000 * 60 * 60 * 24;
    const oneWeek = oneDay * 7;

    filtered.forEach((event) => {
      const eventDate = new Date(event['Event Date']);
      eventDate.setHours(0, 0, 0, 0);
      const diffTime = eventDate - today;
      const diffDays = Math.floor(diffTime / oneDay);

      if (diffTime < 0) {
        pastEvents.push(event);
      } else if (diffDays === 0) {
        todayEvents.push(event);
      } else if (diffTime < oneWeek) {
        thisWeekEvents.push(event);
      } else if (
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      ) {
        thisMonthEvents.push(event);
      } else {
        upcomingEvents.push(event);
      }
    });

    // Sort upcoming events chronologically
    const sortAsc = (a, b) => new Date(a['Event Date']) - new Date(b['Event Date']);
    todayEvents.sort(sortAsc);
    thisWeekEvents.sort(sortAsc);
    thisMonthEvents.sort(sortAsc);
    upcomingEvents.sort(sortAsc);

    // Sort past events reverse chronologically
    pastEvents.sort((a, b) => new Date(b['Event Date']) - new Date(a['Event Date']));

    return {
      today: todayEvents,
      thisWeek: thisWeekEvents,
      thisMonth: thisMonthEvents,
      upcoming: upcomingEvents,
      past: pastEvents,
    };
  }, [events, searchQuery]);

  if (loading) {
    return <ListPageSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <svg
          className="empty-state-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="empty-state-title">Error Loading Events</h3>
        <p>{error}</p>
        {needsReauth ? (
          <button className="btn btn-primary mt-md" onClick={handleReauth}>
            Sign In Again
          </button>
        ) : (
          <button className="btn btn-primary mt-md" onClick={loadEvents}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  const totalUpcoming =
    groupedEvents.today.length +
    groupedEvents.thisWeek.length +
    groupedEvents.thisMonth.length +
    groupedEvents.upcoming.length;

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Events</h1>
          <p className="text-muted">Manage your personal events and meetings</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('add-event')}>
          + Create Event
        </button>
      </div>

      {/* View Switcher */}
      <div
        style={{
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div className="view-switcher" style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
          <button
            className={`btn ${viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </button>
        </div>

        {/* Calendar Sync Section */}
        {calendarSyncEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            {/* Sync Status Indicator */}
            {syncStatus.lastSyncedAt && (
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                }}
              >
                <span>
                  Synced {(() => {
                    const now = new Date();
                    const lastSync = new Date(syncStatus.lastSyncedAt);
                    const diffMinutes = Math.floor((now - lastSync) / 60000);
                    if (diffMinutes < 1) return 'just now';
                    if (diffMinutes < 60) return `${diffMinutes} min ago`;
                    const diffHours = Math.floor(diffMinutes / 60);
                    if (diffHours < 24) return `${diffHours}h ago`;
                    return lastSync.toLocaleDateString();
                  })()}
                </span>
                {(syncStatus.lastPushed > 0 || syncStatus.lastPulled > 0) && (
                  <span style={{ fontSize: 'var(--font-size-xs)' }}>
                    {syncStatus.lastPushed > 0 && `↑${syncStatus.lastPushed}`}
                    {syncStatus.lastPushed > 0 && syncStatus.lastPulled > 0 && ' '}
                    {syncStatus.lastPulled > 0 && `↓${syncStatus.lastPulled}`}
                  </span>
                )}
              </div>
            )}

            {/* Sync Button */}
            <button
              className="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
            >
              <RefreshCw size={16} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ flex: '1 1 250px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h3 className="empty-state-title">No Events Yet</h3>
          <p>Create an event to get started</p>
          <button className="btn btn-primary mt-md" onClick={() => onNavigate('add-event')}>
            + Create Event
          </button>
        </div>
      ) : totalUpcoming === 0 && groupedEvents.past.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <h3 className="empty-state-title">No Matching Events</h3>
          <p>Try adjusting your search to see more results</p>
          <button className="btn btn-primary mt-md" onClick={() => setSearchQuery('')}>
            Clear Search
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          events={events.filter((event) => {
            if (!searchQuery) return true;
            const searchLower = searchQuery.toLowerCase();
            return (
              (event['Event Name'] || '').toLowerCase().includes(searchLower) ||
              (event['Event Location'] || '').toLowerCase().includes(searchLower) ||
              (event['Description'] || '').toLowerCase().includes(searchLower)
            );
          })}
          googleCalendarEvents={personalEvents}
          onEventClick={(eventId) => onNavigate('event-details', eventId)}
          onImportEvent={handleImportEvent}
        />
      ) : viewMode === 'timeline' ? (
        <TimelineView
          events={events.filter((event) => {
            if (!searchQuery) return true;
            const searchLower = searchQuery.toLowerCase();
            return (
              (event['Event Name'] || '').toLowerCase().includes(searchLower) ||
              (event['Event Location'] || '').toLowerCase().includes(searchLower) ||
              (event['Description'] || '').toLowerCase().includes(searchLower)
            );
          })}
          contacts={contacts}
          onEventClick={(eventId) => onNavigate('event-details', eventId)}
        />
      ) : (
        <div>
          {/* Today Section */}
          {groupedEvents.today.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div
                className="card-header section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3 style={{ margin: 0 }}>Today</h3>
                <span className="badge badge-priority-high">{groupedEvents.today.length}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {groupedEvents.today.map((event) => (
                    <EventCard
                      key={event['Event ID']}
                      event={event}
                      contacts={contacts}
                      onClick={() => onNavigate('event-details', event['Event ID'])}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* This Week Section */}
          {groupedEvents.thisWeek.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div
                className="card-header section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3 style={{ margin: 0 }}>This Week</h3>
                <span className="badge badge-priority-medium">{groupedEvents.thisWeek.length}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {groupedEvents.thisWeek.map((event) => (
                    <EventCard
                      key={event['Event ID']}
                      event={event}
                      contacts={contacts}
                      onClick={() => onNavigate('event-details', event['Event ID'])}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* This Month Section */}
          {groupedEvents.thisMonth.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div
                className="card-header section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3 style={{ margin: 0 }}>This Month</h3>
                <span className="badge">{groupedEvents.thisMonth.length}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {groupedEvents.thisMonth.map((event) => (
                    <EventCard
                      key={event['Event ID']}
                      event={event}
                      contacts={contacts}
                      onClick={() => onNavigate('event-details', event['Event ID'])}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {groupedEvents.upcoming.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div
                className="card-header section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3 style={{ margin: 0 }}>Upcoming</h3>
                <span className="badge">{groupedEvents.upcoming.length}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {groupedEvents.upcoming.map((event) => (
                    <EventCard
                      key={event['Event ID']}
                      event={event}
                      contacts={contacts}
                      onClick={() => onNavigate('event-details', event['Event ID'])}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Past Events Section (Collapsible) */}
          {groupedEvents.past.length > 0 && (
            <div className="card">
              <div
                className="card-header section-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setShowPastEvents(!showPastEvents)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <h3 style={{ margin: 0 }}>Past Events</h3>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: showPastEvents ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <span className="badge">{groupedEvents.past.length}</span>
              </div>
              {showPastEvents && (
                <div className="card-body">
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}
                  >
                    {groupedEvents.past.map((event) => (
                      <EventCard
                        key={event['Event ID']}
                        event={event}
                        contacts={contacts}
                        onClick={() => onNavigate('event-details', event['Event ID'])}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Event Modal */}
      <ImportEventModal
        isOpen={importModalOpen}
        onClose={handleImportModalClose}
        googleEvent={selectedGoogleEvent}
        onImported={handleImported}
        contacts={contacts}
      />

      {/* Sync Conflict Modal */}
      <SyncConflictModal
        isOpen={conflicts.length > 0}
        onClose={handleConflictModalClose}
        conflict={conflicts[currentConflictIndex]}
        onResolved={handleConflictResolved}
        contacts={contacts}
      />
    </div>
  );
}

export default EventsList;
