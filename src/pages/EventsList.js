import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import EventCard from '../components/events/EventCard';
import CalendarView from '../components/events/CalendarView';
import TimelineView from '../components/events/TimelineView';
import ImportEventModal from '../components/events/ImportEventModal';
import { ListPageSkeleton } from '../components/SkeletonLoader';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';

function EventsList({ onNavigate }) {
  const { accessToken, refreshAccessToken, hasCalendarAccess } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { canWrite } = usePermissions();
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState(null);

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

  useEffect(() => {
    const checkCalendarSync = async () => {
      const settings = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
      const hasAccess = await hasCalendarAccess();
      setCalendarSyncEnabled(settings.enabled === true && hasAccess);
    };
    checkCalendarSync();
  }, [hasCalendarAccess]);

  const handleImportEvent = useCallback((googleEvent) => {
    setSelectedGoogleEvent(googleEvent);
    setImportModalOpen(true);
  }, []);

  const handleImportModalClose = useCallback(() => {
    setImportModalOpen(false);
    setSelectedGoogleEvent(null);
  }, []);

  const handleImported = useCallback(() => {
    loadEvents();
  }, [loadEvents]);


  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

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

    const sortAsc = (a, b) => new Date(a['Event Date']) - new Date(b['Event Date']);
    todayEvents.sort(sortAsc);
    thisWeekEvents.sort(sortAsc);
    thisMonthEvents.sort(sortAsc);
    upcomingEvents.sort(sortAsc);
    pastEvents.sort((a, b) => new Date(b['Event Date']) - new Date(a['Event Date']));

    return { today: todayEvents, thisWeek: thisWeekEvents, thisMonth: thisMonthEvents, upcoming: upcomingEvents, past: pastEvents };
  }, [events, searchQuery]);

  if (loading) {
    return <ListPageSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="empty-state-title">Error Loading Events</h3>
        <p>{error}</p>
        {needsReauth ? (
          <button className="btn btn-primary mt-md" onClick={handleReauth}>Sign In Again</button>
        ) : (
          <button className="btn btn-primary mt-md" onClick={loadEvents}>Try Again</button>
        )}
      </div>
    );
  }

  const totalUpcoming =
    groupedEvents.today.length +
    groupedEvents.thisWeek.length +
    groupedEvents.thisMonth.length +
    groupedEvents.upcoming.length;

  const filteredForViews = events.filter((event) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (event['Event Name'] || '').toLowerCase().includes(searchLower) ||
      (event['Event Location'] || '').toLowerCase().includes(searchLower) ||
      (event['Description'] || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Events</h1>
          <p className="text-muted">Manage your personal events and meetings</p>
        </div>
        {canWrite('events') && (
          <button className="btn btn-primary" onClick={() => onNavigate('add-event')}>
            + Create Event
          </button>
        )}
      </div>

      {/* View Switcher + Sync + Search */}
      <div className="el-controls-row">
        <div className="el-view-switcher">
          <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}>
            List View
          </button>
          <button className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('calendar')}>
            Calendar
          </button>
          <button className={`btn ${viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('timeline')}>
            Timeline
          </button>
        </div>


        <div className="el-search">
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
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          events={filteredForViews}
          googleCalendarEvents={personalEvents}
          onEventClick={(eventId) => onNavigate('event-details', eventId)}
          onImportEvent={handleImportEvent}
        />
      ) : viewMode === 'timeline' ? (
        <TimelineView
          events={filteredForViews}
          contacts={contacts}
          onEventClick={(eventId) => onNavigate('event-details', eventId)}
        />
      ) : (
        <div>
          {groupedEvents.today.length > 0 && (
            <div className="card el-section-card">
              <div className="card-header section-header el-section-header">
                <h3>Today</h3>
                <span className="badge badge-priority-high">{groupedEvents.today.length}</span>
              </div>
              <div className="card-body">
                <div className="el-event-list">
                  {groupedEvents.today.map((event) => (
                    <EventCard key={event['Event ID']} event={event} contacts={contacts} onClick={() => onNavigate('event-details', event['Event ID'])} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {groupedEvents.thisWeek.length > 0 && (
            <div className="card el-section-card">
              <div className="card-header section-header el-section-header">
                <h3>This Week</h3>
                <span className="badge badge-priority-medium">{groupedEvents.thisWeek.length}</span>
              </div>
              <div className="card-body">
                <div className="el-event-list">
                  {groupedEvents.thisWeek.map((event) => (
                    <EventCard key={event['Event ID']} event={event} contacts={contacts} onClick={() => onNavigate('event-details', event['Event ID'])} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {groupedEvents.thisMonth.length > 0 && (
            <div className="card el-section-card">
              <div className="card-header section-header el-section-header">
                <h3>This Month</h3>
                <span className="badge">{groupedEvents.thisMonth.length}</span>
              </div>
              <div className="card-body">
                <div className="el-event-list">
                  {groupedEvents.thisMonth.map((event) => (
                    <EventCard key={event['Event ID']} event={event} contacts={contacts} onClick={() => onNavigate('event-details', event['Event ID'])} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {groupedEvents.upcoming.length > 0 && (
            <div className="card el-section-card">
              <div className="card-header section-header el-section-header">
                <h3>Upcoming</h3>
                <span className="badge">{groupedEvents.upcoming.length}</span>
              </div>
              <div className="card-body">
                <div className="el-event-list">
                  {groupedEvents.upcoming.map((event) => (
                    <EventCard key={event['Event ID']} event={event} contacts={contacts} onClick={() => onNavigate('event-details', event['Event ID'])} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {groupedEvents.past.length > 0 && (
            <div className="card">
              <div
                className="card-header section-header el-section-header el-past-header"
                onClick={() => setShowPastEvents(!showPastEvents)}
              >
                <div className="el-past-title">
                  <h3>Past Events</h3>
                  <svg
                    className={`el-chevron${showPastEvents ? ' el-chevron--open' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <span className="badge">{groupedEvents.past.length}</span>
              </div>
              {showPastEvents && (
                <div className="card-body">
                  <div className="el-event-list">
                    {groupedEvents.past.map((event) => (
                      <EventCard key={event['Event ID']} event={event} contacts={contacts} onClick={() => onNavigate('event-details', event['Event ID'])} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ImportEventModal
        isOpen={importModalOpen}
        onClose={handleImportModalClose}
        googleEvent={selectedGoogleEvent}
        onImported={handleImported}
        contacts={contacts}
      />

    </div>
  );
}

export default EventsList;
