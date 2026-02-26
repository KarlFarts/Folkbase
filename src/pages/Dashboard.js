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
  const { userWorkspaces, switchToWorkspace: _switchToWorkspace } = useWorkspace();
  const [contacts, setContacts] = useState([]);
  const [touchpoints, setTouchpoints] = useState([]);
  const [events, setEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [_searchQuery, _setSearchQuery] = useState('');
  const [_markingDone, setMarkingDone] = useState(null);
  const [showLogTouchpoint, setShowLogTouchpoint] = useState(false);
  const [savingTouchpoint, setSavingTouchpoint] = useState(false);
  const [_expandedSection, _setExpandedSection] = useState(null);

  const isMountedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!isMountedRef.current || isLoadingRef.current) {
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sheetId, refreshAccessToken]);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      // Error handled
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

  const _handleMarkDone = async (contactId) => {
    try {
      setMarkingDone(contactId);
      const { updateContact } = await import('../utils/devModeWrapper');

      // Find the contact
      const contact = contacts.find((c) => c['Contact ID'] === contactId);
      if (!contact) {
        notify.warning('Contact not found');
        return;
      }

      // Clear the follow-up date
      const updatedData = {
        ...contact,
        'Follow-up Date': '',
      };

      // Update the contact
      await updateContact(accessToken, sheetId, contactId, contact, updatedData, 'system');

      // Reload data
      await loadData();
      notify.success('Follow-up marked as done!');
    } catch {
      // Error handled
      notify.error('Failed to mark follow-up as done. Please try again.');
    } finally {
      setMarkingDone(null);
    }
  };

  // Memoize all expensive derived data so it only recomputes when data changes
  const {
    contactMap,
    today,
    overdueFollowups,
    dueTodayFollowups,
    _highPriorityContacts,
    contactsNeedingFollowUp,
    _staleContacts,
    _reviewQueueContacts,
    _recentActivity,
    _incompleteTouchpoints,
  } = useMemo(() => {
    // Build contact lookup map for efficiency
    const cMap = {};
    contacts.forEach((contact) => {
      cMap[contact['Contact ID']] = contact;
    });

    // Get today's date for comparisons
    const td = new Date();
    td.setHours(0, 0, 0, 0);

    // Helper: get most recent touchpoint for a contact
    const getLatestTouchpoint = (contactId) => {
      return touchpoints
        .filter((t) => t['Contact ID'] === contactId)
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']))[0] || null;
    };

    // Filter overdue follow-ups
    const overdue = touchpoints
      .filter((tp) => {
        const followUpNeeded = tp['Follow-up Needed'];
        const followUpDate = tp['Follow-up Date'];
        if (followUpNeeded !== 'Yes' || !followUpDate) return false;

        const fpDate = new Date(followUpDate);
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
      .filter((item) => item !== null)
      .sort(
        (a, b) =>
          new Date(a.lastTouchpoint['Follow-up Date']) -
          new Date(b.lastTouchpoint['Follow-up Date'])
      );

    // Filter due today follow-ups
    const dueToday = touchpoints
      .filter((tp) => {
        const followUpNeeded = tp['Follow-up Needed'];
        const followUpDate = tp['Follow-up Date'];
        if (followUpNeeded !== 'Yes' || !followUpDate) return false;

        const fpDate = new Date(followUpDate);
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
      .filter((item) => item !== null);

    // Filter high priority contacts
    const highPriority = contacts
      .filter((contact) => {
        const priority = contact['Priority'];
        const status = contact['Status'];
        return (priority === 'Urgent' || priority === 'High') && status === 'Active';
      })
      .map((contact) => ({
        contact,
        lastTouchpoint: getLatestTouchpoint(contact['Contact ID']),
        urgentDetail: `Priority: ${contact['Priority']}`,
      }));

    // Filter contacts needing follow-up (unified)
    const needingFollowUp = contacts
      .filter((contact) => {
        const followUpDate = contact['Follow-up Date'];
        const lastContact = contact['Last Contact Date'];

        if (followUpDate) {
          const fpDate = new Date(followUpDate);
          fpDate.setHours(0, 0, 0, 0);
          if (fpDate <= td) return true;
        }

        if (!lastContact) return true;

        const daysSince = Math.floor((td - new Date(lastContact)) / (1000 * 60 * 60 * 24));
        return daysSince > 30;
      })
      .map((contact) => {
        let reason = '';
        const followUpDate = contact['Follow-up Date'];
        const lastContact = contact['Last Contact Date'];

        if (followUpDate) {
          const fpDate = new Date(followUpDate);
          fpDate.setHours(0, 0, 0, 0);
          if (fpDate <= td) {
            reason = `Follow-up reminder set for ${fpDate.toLocaleDateString()}`;
          }
        }

        if (!reason && !lastContact) {
          reason = 'Never contacted';
        }

        if (!reason && lastContact) {
          reason = `Last contact: ${new Date(lastContact).toLocaleDateString()}`;
        }

        return {
          contact,
          lastTouchpoint: getLatestTouchpoint(contact['Contact ID']),
          urgentDetail: reason,
        };
      });

    // Filter review queue (contacts flagged for review)
    const reviewQueue = contacts
      .filter((contact) => {
        const flags = (contact.QuickFlags || '').toLowerCase();
        return flags.includes('review') || flags.includes('cleanup') || flags.includes('merge');
      })
      .map((contact) => ({
        contact,
        lastTouchpoint: getLatestTouchpoint(contact['Contact ID']),
        urgentDetail: contact.QuickFlags || 'Flagged for review',
      }));

    // Build recent activity feed
    const recentActivity = [...touchpoints]
      .sort((a, b) => new Date(b['Date']) - new Date(a['Date']))
      .slice(0, 7)
      .map((tp) => {
        const contact = cMap[tp['Contact ID']];
        const contactName = contact ? contact['Name'] : 'Unknown Contact';
        const type = tp['Type'] || 'Contact';
        const notes = tp['Notes']
          ? ` - ${tp['Notes'].substring(0, 30)}${tp['Notes'].length > 30 ? '...' : ''}`
          : '';

        return {
          description: `${type} with ${contactName}${notes}`,
          date: tp['Date'],
        };
      });

    // Filter incomplete touchpoints (no contact connected)
    const incomplete = touchpoints
      .filter((tp) => tp['Status'] === 'incomplete')
      .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

    return {
      contactMap: cMap,
      today: td,
      overdueFollowups: overdue,
      dueTodayFollowups: dueToday,
      _highPriorityContacts: highPriority,
      contactsNeedingFollowUp: needingFollowUp,
      _staleContacts: needingFollowUp,
      _reviewQueueContacts: reviewQueue,
      _recentActivity: recentActivity,
      _incompleteTouchpoints: incomplete,
    };
  }, [contacts, touchpoints]);

  // Handler to complete a touchpoint by adding contact
  const _handleCompleteTouchpoint = async (touchpointId, updatedData) => {
    try {
      const { updateTouchpoint } = await import('../utils/devModeWrapper');

      const touchpoint = touchpoints.find((tp) => tp['Touchpoint ID'] === touchpointId);
      if (!touchpoint) {
        throw new Error('Touchpoint not found');
      }

      await updateTouchpoint(accessToken, sheetId, touchpointId, touchpoint, updatedData, '');

      // Reload data to reflect changes
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  // Handler to save new touchpoint from quick modal
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
      await loadData(); // Reload to show new touchpoint
    } catch {
      notify.error('Failed to log touchpoint. Please try again.');
    } finally {
      setSavingTouchpoint(false);
    }
  };

  // Memoize secondary derived data
  const {
    upcomingEvents,
    _pinnedContacts,
    _touchpointsThisWeek,
    _upcomingEventsCount,
    _allEmpty,
    _incompleteProfiles,
  } = useMemo(() => {
    const upcoming = events
      .filter((event) => {
        const eventDate = new Date(event['Event Date']);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a['Event Date']) - new Date(b['Event Date']))
      .slice(0, 5);

    const pinned = contacts.filter((c) => c.Pinned === 'Yes' || c.Pinned === true);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const tpThisWeek = touchpoints.filter((tp) => new Date(tp['Date']) >= weekAgo).length;
    const upcomingCount = events.filter((e) => new Date(e['Event Date']) >= today).length;

    const allEmpty =
      overdueFollowups.length === 0 &&
      dueTodayFollowups.length === 0 &&
      _highPriorityContacts.length === 0;

    const incomplete = contacts
      .filter((contact) => {
        const hasPhone = contact['Phone'];
        const hasEmail = contact['Email'];
        const hasAddress = contact['Address'];
        const hasRelationship = contact['Relationship Type'];
        const hasOrg = contact['Organization'];

        const missingCount = [hasPhone, hasEmail, hasAddress, hasRelationship, hasOrg].filter(
          (field) => !field
        ).length;

        return missingCount >= 2;
      })
      .map((contact) => {
        const missing = [];
        if (!contact['Phone']) missing.push('Phone');
        if (!contact['Email']) missing.push('Email');
        if (!contact['Address']) missing.push('Address');
        if (!contact['Relationship Type']) missing.push('Relationship');
        if (!contact['Organization']) missing.push('Organization');

        return {
          contact,
          missingFields: missing,
          missingCount: missing.length,
        };
      })
      .sort((a, b) => b.missingCount - a.missingCount)
      .slice(0, 10);

    return {
      upcomingEvents: upcoming,
      _pinnedContacts: pinned,
      _touchpointsThisWeek: tpThisWeek,
      _upcomingEventsCount: upcomingCount,
      _allEmpty: allEmpty,
      _incompleteProfiles: incomplete,
    };
  }, [contacts, touchpoints, events, today, overdueFollowups, dueTodayFollowups, _highPriorityContacts]);

  // Setup Issues Detection
  const setupIssues = [];

  if (!sheetId || sheetId === 'YOUR_SHEET_ID_HERE') {
    setupIssues.push({
      type: 'critical',
      message: 'Google Sheets not configured',
      action: () => onNavigate('settings'),
      actionLabel: 'Configure Now',
    });
  }

  const contactsWithoutIds = contacts.filter((c) => !c['Contact ID']).length;
  if (contactsWithoutIds > 0) {
    setupIssues.push({
      type: 'warning',
      message: `${contactsWithoutIds} contacts missing IDs`,
      action: () => onNavigate('contacts'),
      actionLabel: 'Review',
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
      actionLabel: 'Review',
    });
  }

  // Quick Actions Data
  const _quickActions = [
    { id: 'add-contact', label: 'Add Contact', action: () => onNavigate('contacts') },
    { id: 'log-touchpoint', label: 'Log Touchpoint', action: () => setShowLogTouchpoint(true) },
    { id: 'import', label: 'Import', action: () => onNavigate('import') },
    { id: 'view-all', label: 'All Contacts', action: () => onNavigate('contacts') },
  ];

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

  // Filter active entities
  const activeContacts = contacts.filter((c) => c.Status === 'Active').length;
  const activeOrganizations = organizations.filter((o) => o.Status === 'Active').length;
  const activeLocations = locations.filter((l) => l.Status === 'Active').length;

  // Get recent organizations (last 5 created)
  const _recentOrganizations = organizations
    .filter((o) => o.Status === 'Active')
    .sort((a, b) => new Date(b['Created Date']) - new Date(a['Created Date']))
    .slice(0, 5);

  // Get recent locations (last 5 created)
  const _recentLocations = locations
    .filter((l) => l.Status === 'Active')
    .sort((a, b) => new Date(b['Created Date']) - new Date(a['Created Date']))
    .slice(0, 5);

  // Get overdue tasks
  const overdueTasks = tasks
    .filter((task) => {
      if (task.Status === 'Completed' || task.Status === 'Cancelled') return false;
      if (!task['Due Date']) return false;
      const dueDate = new Date(task['Due Date']);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .sort((a, b) => {
      // Sort by priority (Urgent > High > Medium > Low), then by due date
      const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3, 'No Urgency': 4 };
      const priorityA = priorityOrder[a.Priority] ?? 5;
      const priorityB = priorityOrder[b.Priority] ?? 5;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a['Due Date']) - new Date(b['Due Date']);
    })
    .slice(0, 5);

  const followUpsDue = [...overdueFollowups, ...dueTodayFollowups];

  return (
    <div className="dashboard-container dashboard-redesigned">
      <HeroWelcome onNavigate={onNavigate} />


      <div className="dashboard-card-grid">
        {/* Contacts */}
        <div
          className="scard scard-contacts scard-clickable"
          role="button"
          onClick={() => onNavigate('contacts')}
        >
          <span className="scard-hero">{activeContacts}</span>
          <span className="scard-label">Active Contacts</span>
          <span className="scard-action">View all →</span>
        </div>

        {/* Events */}
        <div
          className="scard scard-events scard-clickable"
          role="button"
          onClick={() => onNavigate('events')}
        >
          <span className="scard-hero">{upcomingEvents.length}</span>
          <span className="scard-label">Upcoming Events</span>
          {upcomingEvents.length > 0 && (
            <span className="scard-sub">{upcomingEvents[0]['Event Name']}</span>
          )}
          <span className="scard-action">View all →</span>
        </div>

        {/* Tasks */}
        <div
          className="scard scard-tasks scard-clickable"
          role="button"
          onClick={() => onNavigate('tasks')}
        >
          <span className="scard-hero">{overdueTasks.length}</span>
          <span className="scard-label">Overdue Tasks</span>
          {overdueTasks.length > 0 && (
            <span className="scard-sub">{overdueTasks[0].Title}</span>
          )}
          <span className="scard-action">View all →</span>
        </div>

        {/* Organizations */}
        <div
          className="scard scard-organizations scard-clickable"
          role="button"
          onClick={() => onNavigate('organizations')}
        >
          <span className="scard-hero">{activeOrganizations}</span>
          <span className="scard-label">Organizations</span>
          <span className="scard-action">View all →</span>
        </div>

        {/* Locations */}
        <div
          className="scard scard-locations scard-clickable"
          role="button"
          onClick={() => onNavigate('locations')}
        >
          <span className="scard-hero">{activeLocations}</span>
          <span className="scard-label">Locations</span>
          <span className="scard-action">View all →</span>
        </div>

        {/* Celebrations */}
        <div className="scard scard-celebrations">
          <span className="scard-label">Upcoming Celebrations</span>
          <CelebrationsWidget contacts={contacts} onNavigate={onNavigate} bare={true} />
        </div>

        {/* Follow-ups (wide) */}
        {followUpsDue.length > 0 && (
          <div className="scard scard-contacts scard-wide">
            <span className="scard-hero">{followUpsDue.length}</span>
            <span className="scard-label">Follow-ups Due</span>
            <ul className="scard-list">
              {followUpsDue.slice(0, 4).map((item, i) => (
                <li
                  key={i}
                  className="scard-list-item"
                  onClick={() => onNavigate('contact-profile', item.contact['Contact ID'])}
                >
                  {item.contact.Name} — {item.urgentDetail}
                </li>
              ))}
            </ul>
            <span className="scard-action">View contacts →</span>
          </div>
        )}

        {/* Setup Issues */}
        {setupIssues.length > 0 && (
          <div className="scard scard-settings">
            <AlertTriangle className="scard-hero-icon" />
            <span className="scard-label">{setupIssues.length} Setup Issue{setupIssues.length !== 1 ? 's' : ''}</span>
            <ul className="scard-list">
              {setupIssues.map((issue, i) => (
                <li key={i} className="scard-list-item" onClick={issue.action}>
                  {issue.message}
                </li>
              ))}
            </ul>
            <span className="scard-action">Go to settings →</span>
          </div>
        )}

        {/* Workspaces */}
        <div
          className="scard scard-workspaces scard-clickable"
          role="button"
          onClick={() => onNavigate('workspaces')}
        >
          <span className="scard-hero">{userWorkspaces.length}</span>
          <span className="scard-label">Workspaces</span>
          <span className="scard-action">Manage →</span>
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
