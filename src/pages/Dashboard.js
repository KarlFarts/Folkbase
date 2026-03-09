import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import HeroWelcome from '../components/dashboard/HeroWelcome';
import CelebrationsWidget from '../components/dashboard/CelebrationsWidget';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import LogTouchpointQuickModal from '../components/LogTouchpointQuickModal';

function Dashboard({ onNavigate }) {
  const { accessToken, refreshAccessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { userWorkspaces } = useWorkspace();
  const [contacts, setContacts] = useState([]);
  const [touchpoints, setTouchpoints] = useState([]);
  const [events, setEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showLogTouchpoint, setShowLogTouchpoint] = useState(false);
  const [savingTouchpoint, setSavingTouchpoint] = useState(false);

  const isMountedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!isMountedRef.current || isLoadingRef.current) return;

    if (!sheetId) {
      setError('Google Sheet ID is not configured.');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Please sign in to access your data.');
      setNeedsReauth(true);
      setLoading(false);
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');
      setNeedsReauth(false);

      const [
        contactsResult,
        touchpointsResult,
        eventsResult,
        organizationsResult,
        locationsResult,
        tasksResult,
      ] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.TOUCHPOINTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.ORGANIZATIONS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.LOCATIONS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.TASKS, refreshAccessToken),
      ]);

      setContacts(contactsResult.data);
      setTouchpoints(touchpointsResult.data);
      setEvents(eventsResult.data);
      setOrganizations(organizationsResult.data);
      setLocations(locationsResult.data);
      setTasks(tasksResult.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to load data. Make sure you have access to the Google Sheet.');
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [accessToken, sheetId, refreshAccessToken]);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // Auto-refresh every 60 seconds so dashboard stats stay current
    const intervalId = setInterval(loadData, 60_000);
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [loadData]);

  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

  // Derived data
  const { today, overdueFollowups, dueTodayFollowups } = useMemo(() => {
    const cMap = {};
    contacts.forEach((c) => {
      cMap[c['Contact ID']] = c;
    });

    const td = new Date();
    td.setHours(0, 0, 0, 0);

    const getLatestTouchpoint = (contactId) => {
      return (
        touchpoints
          .filter((t) => t['Contact ID'] === contactId)
          .sort((a, b) => new Date(b['Date']) - new Date(a['Date']))[0] || null
      );
    };

    const overdue = touchpoints
      .filter((tp) => {
        if (tp['Follow-up Needed'] !== 'Yes' || !tp['Follow-up Date']) return false;
        const fpDate = new Date(tp['Follow-up Date']);
        fpDate.setHours(0, 0, 0, 0);
        return fpDate < td;
      })
      .map((tp) => {
        const contact = cMap[tp['Contact ID']];
        if (!contact) return null;
        return {
          contact,
          lastTouchpoint: getLatestTouchpoint(tp['Contact ID']) || tp,
          urgentDetail: `Follow-up overdue: ${new Date(tp['Follow-up Date']).toLocaleDateString()}`,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(a.lastTouchpoint['Follow-up Date']) -
          new Date(b.lastTouchpoint['Follow-up Date'])
      );

    const dueToday = touchpoints
      .filter((tp) => {
        if (tp['Follow-up Needed'] !== 'Yes' || !tp['Follow-up Date']) return false;
        const fpDate = new Date(tp['Follow-up Date']);
        fpDate.setHours(0, 0, 0, 0);
        return fpDate.getTime() === td.getTime();
      })
      .map((tp) => {
        const contact = cMap[tp['Contact ID']];
        if (!contact) return null;
        return {
          contact,
          lastTouchpoint: getLatestTouchpoint(tp['Contact ID']) || tp,
          urgentDetail: 'Follow-up due today',
        };
      })
      .filter(Boolean);

    return {
      today: td,
      overdueFollowups: overdue,
      dueTodayFollowups: dueToday,
    };
  }, [contacts, touchpoints]);

  const { upcomingEvents, touchpointsThisWeek } = useMemo(() => {
    const upcoming = events
      .filter((event) => {
        const eventDate = new Date(event['Event Date']);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a['Event Date']) - new Date(b['Event Date']))
      .slice(0, 5);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const tpThisWeek = touchpoints.filter((tp) => new Date(tp['Date']) >= weekAgo).length;

    return {
      upcomingEvents: upcoming,
      touchpointsThisWeek: tpThisWeek,
    };
  }, [events, touchpoints, today]);

  const handleSaveTouchpoint = async (contactId, contactName, touchpointData) => {
    if (!accessToken || !sheetId) {
      notify.error('Unable to save touchpoint');
      return;
    }

    setSavingTouchpoint(true);
    try {
      const { createTouchpoint } = await import('../utils/devModeWrapper');
      await createTouchpoint(accessToken, sheetId, contactId, touchpointData, 'system');
      notify.success(`Touchpoint logged for ${contactName}`);
      setShowLogTouchpoint(false);
      await loadData();
    } catch {
      notify.error('Failed to log touchpoint. Please try again.');
    } finally {
      setSavingTouchpoint(false);
    }
  };

  // Setup issues
  const setupIssues = [];
  if (!sheetId || sheetId === 'YOUR_SHEET_ID_HERE') {
    setupIssues.push({
      type: 'critical',
      message: 'Google Sheets not configured',
      action: () => onNavigate('settings'),
    });
  }
  const contactsWithoutIds = contacts.filter((c) => !c['Contact ID']).length;
  if (contactsWithoutIds > 0) {
    setupIssues.push({
      type: 'warning',
      message: `${contactsWithoutIds} contacts missing IDs`,
      action: () => onNavigate('contacts'),
    });
  }
  const nameCount = {};
  contacts.forEach((c) => {
    if (c.Name) nameCount[c.Name] = (nameCount[c.Name] || 0) + 1;
  });
  const duplicates = Object.entries(nameCount).filter(([_, count]) => count > 1).length;
  if (duplicates > 0) {
    setupIssues.push({
      type: 'warning',
      message: `${duplicates} potential duplicate names`,
      action: () => onNavigate('contacts'),
    });
  }

  if (loading) {
    return (
      <div className="dashboard-container dashboard-redesigned">
        <DashboardSkeleton />
      </div>
    );
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
        <h3 className="empty-state-title">Error Loading Data</h3>
        <p>{error}</p>
        {needsReauth ? (
          <button className="btn btn-primary mt-md" onClick={handleReauth}>
            Sign In Again
          </button>
        ) : (
          <button className="btn btn-primary mt-md" onClick={loadData}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  const activeContacts = contacts.filter((c) => c.Status === 'Active').length;
  const activeOrganizations = organizations.filter((o) => o.Status === 'Active').length;
  const activeLocations = locations.filter((l) => l.Status === 'Active').length;

  const overdueTasks = tasks
    .filter((task) => {
      if (task.Status === 'Completed' || task.Status === 'Cancelled') return false;
      if (!task['Due Date']) return false;
      const dueDate = new Date(task['Due Date']);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .sort((a, b) => {
      const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3, 'No Urgency': 4 };
      const pA = priorityOrder[a.Priority] ?? 5;
      const pB = priorityOrder[b.Priority] ?? 5;
      if (pA !== pB) return pA - pB;
      return new Date(a['Due Date']) - new Date(b['Due Date']);
    })
    .slice(0, 5);

  const followUpsDue = [...overdueFollowups, ...dueTodayFollowups];

  return (
    <div className="dashboard-container dashboard-redesigned">
      <HeroWelcome onNavigate={onNavigate} />

      <div className="dash-grid">
        {/* ---- Column 1: Contacts ---- */}
        <div className="dash-col">
          <h3 className="dash-col-label">Contacts</h3>

          <div
            className="scard scard-contacts scard-clickable"
            role="button"
            onClick={() => onNavigate('contacts')}
          >
            <span className="scard-hero">{activeContacts}</span>
            <span className="scard-label">Active Contacts</span>
            <span className="scard-action">View all</span>
          </div>

          {followUpsDue.length > 0 && (
            <div className="scard scard-contacts">
              <span className="scard-hero">{followUpsDue.length}</span>
              <span className="scard-label">Follow-ups Due</span>
              <ul className="scard-list">
                {followUpsDue.slice(0, 4).map((item, i) => (
                  <li
                    key={i}
                    className="scard-list-item"
                    onClick={() => onNavigate('contact-profile', item.contact['Contact ID'])}
                  >
                    {item.contact.Name} -- {item.urgentDetail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ---- Column 2: Activity ---- */}
        <div className="dash-col">
          <h3 className="dash-col-label">Activity</h3>

          <div
            className="scard scard-events scard-clickable"
            role="button"
            onClick={() => onNavigate('touchpoints')}
          >
            <span className="scard-hero">{touchpointsThisWeek}</span>
            <span className="scard-label">Touchpoints This Week</span>
            <span className="scard-action">View all</span>
          </div>

          {upcomingEvents.length > 0 && (
            <div
              className="scard scard-events scard-clickable"
              role="button"
              onClick={() => onNavigate('events')}
            >
              <span className="scard-hero">{upcomingEvents.length}</span>
              <span className="scard-label">Upcoming Events</span>
              <span className="scard-sub">{upcomingEvents[0]['Event Name']}</span>
              <span className="scard-action">View all</span>
            </div>
          )}

          {overdueTasks.length > 0 && (
            <div
              className="scard scard-tasks scard-clickable"
              role="button"
              onClick={() => onNavigate('tasks')}
            >
              <span className="scard-hero">{overdueTasks.length}</span>
              <span className="scard-label">Overdue Tasks</span>
              <span className="scard-sub">{overdueTasks[0].Title}</span>
              <span className="scard-action">View all</span>
            </div>
          )}
        </div>

        {/* ---- Column 3: Network (hidden if empty) ---- */}
        {(activeOrganizations > 0 || activeLocations > 0 || userWorkspaces.length > 0) && (
          <div className="dash-col">
            <h3 className="dash-col-label">Network</h3>

            {activeOrganizations > 0 && (
              <div
                className="scard scard-organizations scard-clickable"
                role="button"
                onClick={() => onNavigate('organizations')}
              >
                <span className="scard-hero">{activeOrganizations}</span>
                <span className="scard-label">Organizations</span>
                <span className="scard-action">View all</span>
              </div>
            )}

            {activeLocations > 0 && (
              <div
                className="scard scard-locations scard-clickable"
                role="button"
                onClick={() => onNavigate('locations')}
              >
                <span className="scard-hero">{activeLocations}</span>
                <span className="scard-label">Locations</span>
                <span className="scard-action">View all</span>
              </div>
            )}

            {userWorkspaces.length > 0 && (
              <div
                className="scard scard-workspaces scard-clickable"
                role="button"
                onClick={() => onNavigate('workspaces')}
              >
                <span className="scard-hero">{userWorkspaces.length}</span>
                <span className="scard-label">Workspaces</span>
                <span className="scard-action">Manage</span>
              </div>
            )}
          </div>
        )}

        {/* ---- Column 4: Insights ---- */}
        <div className="dash-col">
          <h3 className="dash-col-label">Insights</h3>

          <div className="scard scard-celebrations">
            <span className="scard-label">Upcoming Celebrations</span>
            <CelebrationsWidget contacts={contacts} onNavigate={onNavigate} bare={true} />
          </div>

          {setupIssues.length > 0 && (
            <div className="scard scard-settings">
              <AlertTriangle className="scard-hero-icon" />
              <span className="scard-label">
                {setupIssues.length} Setup Issue{setupIssues.length !== 1 ? 's' : ''}
              </span>
              <ul className="scard-list">
                {setupIssues.map((issue, i) => (
                  <li key={i} className="scard-list-item" onClick={issue.action}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showLogTouchpoint && (
        <LogTouchpointQuickModal
          contacts={contacts}
          onClose={() => setShowLogTouchpoint(false)}
          onSave={handleSaveTouchpoint}
          saving={savingTouchpoint}
        />
      )}
    </div>
  );
}

export default Dashboard;
