import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Building2, MapPin, Folder, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import HeroWelcome from '../components/dashboard/HeroWelcome';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import LogTouchpointQuickModal from '../components/LogTouchpointQuickModal';

function Dashboard({ onNavigate }) {
  const { accessToken, refreshAccessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { userWorkspaces, switchToWorkspace } = useWorkspace();
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
  const [expandedSection, setExpandedSection] = useState(null);

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
    } catch {
      // Error handled
      if (error.response?.status === 401 || error.response?.status === 403) {
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

  // Build contact lookup map for efficiency
  const contactMap = {};
  contacts.forEach((contact) => {
    contactMap[contact['Contact ID']] = contact;
  });

  // Get today's date for comparisons
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter overdue follow-ups
  const overdueFollowups = touchpoints
    .filter((tp) => {
      const followUpNeeded = tp['Follow-up Needed'];
      const followUpDate = tp['Follow-up Date'];
      if (followUpNeeded !== 'Yes' || !followUpDate) return false;

      const fpDate = new Date(followUpDate);
      fpDate.setHours(0, 0, 0, 0);
      return fpDate < today;
    })
    .map((tp) => {
      const contact = contactMap[tp['Contact ID']];
      if (!contact) return null;

      // Get all touchpoints for this contact to find the most recent one
      const contactTouchpoints = touchpoints
        .filter((t) => t['Contact ID'] === tp['Contact ID'])
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

      return {
        contact,
        lastTouchpoint: contactTouchpoints[0] || tp,
        urgentDetail: `Follow-up overdue: ${new Date(tp['Follow-up Date']).toLocaleDateString()}`,
      };
    })
    .filter((item) => item !== null)
    .sort(
      (a, b) =>
        new Date(a.lastTouchpoint['Follow-up Date']) - new Date(b.lastTouchpoint['Follow-up Date'])
    );

  // Filter due today follow-ups
  const dueTodayFollowups = touchpoints
    .filter((tp) => {
      const followUpNeeded = tp['Follow-up Needed'];
      const followUpDate = tp['Follow-up Date'];
      if (followUpNeeded !== 'Yes' || !followUpDate) return false;

      const fpDate = new Date(followUpDate);
      fpDate.setHours(0, 0, 0, 0);
      return fpDate.getTime() === today.getTime();
    })
    .map((tp) => {
      const contact = contactMap[tp['Contact ID']];
      if (!contact) return null;

      const contactTouchpoints = touchpoints
        .filter((t) => t['Contact ID'] === tp['Contact ID'])
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

      return {
        contact,
        lastTouchpoint: contactTouchpoints[0] || tp,
        urgentDetail: 'Follow-up due today',
      };
    })
    .filter((item) => item !== null);

  // Filter high priority contacts
  const highPriorityContacts = contacts
    .filter((contact) => {
      const priority = contact['Priority'];
      const status = contact['Status'];
      return (priority === 'Urgent' || priority === 'High') && status === 'Active';
    })
    .map((contact) => {
      const contactTouchpoints = touchpoints
        .filter((t) => t['Contact ID'] === contact['Contact ID'])
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

      return {
        contact,
        lastTouchpoint: contactTouchpoints[0] || null,
        urgentDetail: `Priority: ${contact['Priority']}`,
      };
    });

  // Filter contacts needing follow-up (unified)
  const contactsNeedingFollowUp = contacts
    .filter((contact) => {
      const followUpDate = contact['Follow-up Date'];
      const lastContact = contact['Last Contact Date'];

      // Include if contact-level follow-up date is set and due
      if (followUpDate) {
        const fpDate = new Date(followUpDate);
        fpDate.setHours(0, 0, 0, 0);
        if (fpDate <= today) return true;
      }

      // Include if never contacted
      if (!lastContact) return true;

      // Include if not contacted in 30+ days
      const daysSince = Math.floor((today - new Date(lastContact)) / (1000 * 60 * 60 * 24));
      return daysSince > 30;
    })
    .map((contact) => {
      const contactTouchpoints = touchpoints
        .filter((t) => t['Contact ID'] === contact['Contact ID'])
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

      // Determine reason for follow-up
      let reason = '';
      const followUpDate = contact['Follow-up Date'];
      const lastContact = contact['Last Contact Date'];

      if (followUpDate) {
        const fpDate = new Date(followUpDate);
        fpDate.setHours(0, 0, 0, 0);
        if (fpDate <= today) {
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
        lastTouchpoint: contactTouchpoints[0] || null,
        urgentDetail: reason,
      };
    });

  // Keep stale contacts for backward compatibility
  const _staleContacts = contactsNeedingFollowUp;

  // Filter review queue (contacts flagged for review)
  const _reviewQueueContacts = contacts
    .filter((contact) => {
      const flags = (contact.QuickFlags || '').toLowerCase();
      return flags.includes('review') || flags.includes('cleanup') || flags.includes('merge');
    })
    .map((contact) => {
      const contactTouchpoints = touchpoints
        .filter((t) => t['Contact ID'] === contact['Contact ID'])
        .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

      return {
        contact,
        lastTouchpoint: contactTouchpoints[0] || null,
        urgentDetail: contact.QuickFlags || 'Flagged for review',
      };
    });

  // Build recent activity feed
  const _recentActivity = touchpoints
    .sort((a, b) => new Date(b['Date']) - new Date(a['Date']))
    .slice(0, 7)
    .map((tp) => {
      const contact = contactMap[tp['Contact ID']];
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
  const _incompleteTouchpoints = touchpoints
    .filter((tp) => tp['Status'] === 'incomplete')
    .sort((a, b) => new Date(b['Date']) - new Date(a['Date']));

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
    } catch {
      // Error handled
      throw error;
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

  // Get upcoming events
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event['Event Date']);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a['Event Date']) - new Date(b['Event Date']))
    .slice(0, 5);

  // Filter pinned contacts
  const _pinnedContacts = contacts.filter((c) => c.Pinned === 'Yes' || c.Pinned === true);

  // Calculate dashboard stats
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const _touchpointsThisWeek = touchpoints.filter((tp) => new Date(tp['Date']) >= weekAgo).length;
  const _upcomingEventsCount = events.filter((e) => new Date(e['Event Date']) >= today).length;

  // Check if all urgent sections are empty
  const _allEmpty =
    overdueFollowups.length === 0 &&
    dueTodayFollowups.length === 0 &&
    highPriorityContacts.length === 0;

  // Profile Completion Tracking - identify contacts with missing key fields
  const incompleteProfiles = contacts
    .filter((contact) => {
      const hasPhone = contact['Phone'];
      const hasEmail = contact['Email'];
      const hasAddress = contact['Address'];
      const hasRelationship = contact['Relationship Type'];
      const hasOrg = contact['Organization'];

      // Missing 2+ key fields = incomplete profile
      const missingFields = [hasPhone, hasEmail, hasAddress, hasRelationship, hasOrg].filter(
        (field) => !field
      ).length;

      return missingFields >= 2;
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
  const quickActions = [
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

  const handleToggleSection = (sectionId) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  // Filter active entities
  const activeContacts = contacts.filter((c) => c.Status === 'Active').length;
  const activeOrganizations = organizations.filter((o) => o.Status === 'Active').length;
  const activeLocations = locations.filter((l) => l.Status === 'Active').length;

  // Get recent organizations (last 5 created)
  const recentOrganizations = organizations
    .filter((o) => o.Status === 'Active')
    .sort((a, b) => new Date(b['Created Date']) - new Date(a['Created Date']))
    .slice(0, 5);

  // Get recent locations (last 5 created)
  const recentLocations = locations
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

  return (
    <div className="dashboard-container dashboard-redesigned">
      <HeroWelcome
        onNavigate={onNavigate}
        onLogTouchpoint={() => setShowLogTouchpoint(true)}
        // Widget data props
        todoItems={[...overdueFollowups, ...dueTodayFollowups]}
        upcomingEvents={upcomingEvents}
        incompleteProfiles={incompleteProfiles}
        setupIssues={setupIssues}
        quickActions={quickActions}
        events={events}
        contacts={contacts}
        expandedSection={expandedSection}
        onToggleSection={handleToggleSection}
      />

      <hr className="dashboard-divider" />

      {/* Entity Stats Section */}
      <div className="dashboard-stats">
        <div
          className="stat-card"
          onClick={() => onNavigate('contacts')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-label">
            <User size={16} /> Active Contacts
          </div>
          <div className="stat-value" style={{ color: 'var(--color-accent-primary)' }}>
            {activeContacts}
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => onNavigate('organizations')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-label">
            <Building2 size={16} /> Active Organizations
          </div>
          <div className="stat-value" style={{ color: 'var(--color-accent-secondary)' }}>
            {activeOrganizations}
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => onNavigate('locations')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-label">
            <MapPin size={16} /> Active Locations
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {activeLocations}
          </div>
        </div>
      </div>

      {/* Recent Organizations Section */}
      {recentOrganizations.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <h2
              style={{
                color: 'var(--color-accent-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <Building2 size={16} /> Recent Organizations
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('organizations')}
            >
              View All
            </button>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {recentOrganizations.map((org) => (
              <div
                key={org['Organization ID']}
                className="stat-card"
                onClick={() => onNavigate('organization-profile', { id: org['Organization ID'] })}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)', color: 'var(--color-accent-secondary)' }}>
                      {org.Name}
                    </h3>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {org.Type && <span>{org.Type}</span>}
                      {org.Type && org.Industry && <span> • </span>}
                      {org.Industry && <span>{org.Industry}</span>}
                    </div>
                    {org.Description && (
                      <p
                        style={{
                          margin: 'var(--spacing-xs) 0 0 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {org.Description.substring(0, 100)}
                        {org.Description.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  {org.Priority && (
                    <span
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        backgroundColor:
                          org.Priority === 'Urgent'
                            ? 'rgba(220, 38, 38, 0.1)'
                            : org.Priority === 'High'
                              ? 'rgba(194, 112, 62, 0.1)'
                              : 'var(--color-bg-secondary)',
                        color:
                          org.Priority === 'Urgent'
                            ? 'var(--color-danger)'
                            : org.Priority === 'High'
                              ? 'var(--color-accent-hover)'
                              : 'var(--color-text-secondary)',
                      }}
                    >
                      {org.Priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Locations Section */}
      {recentLocations.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <h2
              style={{
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <MapPin size={16} /> Recent Locations
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('locations')}>
              View All
            </button>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {recentLocations.map((loc) => (
              <div
                key={loc['Location ID']}
                className="stat-card"
                onClick={() => onNavigate('location-profile', { id: loc['Location ID'] })}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)', color: 'var(--color-success)' }}>
                      {loc.Name}
                    </h3>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {loc.Type && <span>{loc.Type}</span>}
                      {loc.Type && loc.City && <span> • </span>}
                      {loc.City && <span>{loc.City}</span>}
                    </div>
                    {loc.Address && (
                      <p
                        style={{
                          margin: 'var(--spacing-xs) 0 0 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {loc.Address}
                      </p>
                    )}
                  </div>
                  {loc.Priority && (
                    <span
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        backgroundColor:
                          loc.Priority === 'Urgent'
                            ? 'rgba(220, 38, 38, 0.1)'
                            : loc.Priority === 'High'
                              ? 'rgba(194, 112, 62, 0.1)'
                              : 'var(--color-bg-secondary)',
                        color:
                          loc.Priority === 'Urgent'
                            ? 'var(--color-danger)'
                            : loc.Priority === 'High'
                              ? 'var(--color-accent-hover)'
                              : 'var(--color-text-secondary)',
                      }}
                    >
                      {loc.Priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <h2
              style={{
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M9 11h6M9 15h3" />
              </svg>
              Overdue Tasks
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('tasks')}>
              View All Tasks
            </button>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {overdueTasks.map((task) => (
              <div
                key={task['Task ID']}
                className="stat-card"
                onClick={() => onNavigate('task-profile', task['Task ID'])}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)', color: 'var(--color-danger)' }}>
                      {task.Title}
                    </h3>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {task['Due Date'] && (
                        <span>
                          Due: {new Date(task['Due Date']).toLocaleDateString()} (
                          {Math.floor((today - new Date(task['Due Date'])) / (1000 * 60 * 60 * 24))} days
                          ago)
                        </span>
                      )}
                      {task['Assigned To Name'] && (
                        <>
                          <span> • </span>
                          <span>Assigned to: {task['Assigned To Name']}</span>
                        </>
                      )}
                    </div>
                    {task.Description && (
                      <p
                        style={{
                          margin: 'var(--spacing-xs) 0 0 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {task.Description.substring(0, 100)}
                        {task.Description.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  {task.Priority && (
                    <span
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        backgroundColor:
                          task.Priority === 'Urgent'
                            ? 'rgba(220, 38, 38, 0.1)'
                            : task.Priority === 'High'
                              ? 'rgba(194, 112, 62, 0.1)'
                              : 'var(--color-bg-secondary)',
                        color:
                          task.Priority === 'Urgent'
                            ? 'var(--color-danger)'
                            : task.Priority === 'High'
                              ? 'var(--color-accent-hover)'
                              : 'var(--color-text-secondary)',
                      }}
                    >
                      {task.Priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="dashboard-divider" />

      {/* Workspaces Section */}
      <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          <h2
            style={{
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
            }}
          >
            <Folder size={16} /> My Workspaces
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('workspaces/create')}
            >
              <Plus size={16} /> New Workspace
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('workspaces')}>
              Manage All
            </button>
          </div>
        </div>

        {userWorkspaces.length === 0 ? (
          <div
            className="stat-card"
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-xl)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Folder size={32} style={{ margin: '0 auto var(--spacing-md) auto', opacity: 0.5 }} />
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No Workspaces Yet</h3>
            <p style={{ marginBottom: 'var(--spacing-md)' }}>
              Create a workspace to collaborate with your team on contact management.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('/workspaces/create')}>
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {userWorkspaces.slice(0, 5).map((workspace) => (
              <div
                key={workspace.id || workspace['Workspace ID']}
                className="stat-card"
                onClick={() => {
                  switchToWorkspace(workspace);
                  onNavigate('contacts');
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>
                      <Folder
                        size={16}
                        style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }}
                      />
                      {workspace.name || workspace['Workspace Name']}
                    </h3>
                    {workspace.description && (
                      <p
                        style={{
                          margin: 'var(--spacing-xs) 0 0 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {workspace.description.substring(0, 100)}
                        {workspace.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                    <div
                      style={{
                        marginTop: 'var(--spacing-xs)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {workspace.type && <span>{workspace.type}</span>}
                      {workspace.type && workspace.owner_email && <span> • </span>}
                      {workspace.owner_email && <span>Owner: {workspace.owner_email}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {userWorkspaces.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--spacing-sm)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('workspaces')}>
                  View all {userWorkspaces.length} workspaces →
                </button>
              </div>
            )}
          </div>
        )}
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
