import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  Edit,
  Trash2,
  Check,
  Calendar as CalendarIcon,
  RefreshCw,
  Clock,
  Link as LinkIcon,
  Target,
  UserPlus,
  Users,
  Search,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  readSheetData,
  addNote,
  getEventNotes,
  updateEvent,
  deleteEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  SHEETS,
} from '../utils/devModeWrapper';
import { useActiveSheetId } from '../utils/sheetResolver';
import { crmEventToGoogleEvent } from '../utils/eventTransformers';
import ContactCard from '../components/ContactCard';
import NotesDisplaySection from '../components/notes/NotesDisplaySection';
import ConfirmDialog from '../components/ConfirmDialog';

function EventDetails({ onNavigate }) {
  const { id } = useParams();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { canWrite } = usePermissions();
  const [event, setEvent] = useState(null);
  const [attendeeContacts, setAttendeeContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [linkedOrganizations, setLinkedOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showBulkTouchpointModal, setShowBulkTouchpointModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    Content: '',
    'Note Type': 'Event Note',
    Visibility: 'Workspace-Wide',
    'Shared With': '',
  });
  const [bulkTouchpointData, setBulkTouchpointData] = useState({
    notes: '',
    type: 'Meeting',
    outcome: '',
    selectedAttendees: new Set(),
  });
  const [savingBulkTouchpoints, setSavingBulkTouchpoints] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [unresolvedAttendees, setUnresolvedAttendees] = useState([]);
  const [newUnresolvedInput, setNewUnresolvedInput] = useState('');

  const loadEventDetails = useCallback(async () => {
    if (!accessToken || !sheetId) {
      setError('Please sign in to access your data.');
      setNeedsReauth(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [eventsResult, contactsResult, orgsResult, eventNotesData] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.EVENTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.ORGANIZATIONS, refreshAccessToken),
        getEventNotes(accessToken, sheetId, id, user?.email),
      ]);

      const foundEvent = eventsResult.data.find((e) => e['Event ID'] === id);

      if (!foundEvent) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent(foundEvent);
      setAllContacts(contactsResult.data || []);

      if (foundEvent['Attendees']) {
        const attendeeIds = foundEvent['Attendees'].split(',').map((id) => id.trim());
        const attendees = contactsResult.data.filter((contact) =>
          attendeeIds.includes(contact['Contact ID'])
        );
        setAttendeeContacts(attendees);
      }

      try {
        const raw = foundEvent['Unresolved Attendees'] || '[]';
        setUnresolvedAttendees(JSON.parse(raw));
      } catch {
        setUnresolvedAttendees([]);
      }

      const orgIds = (foundEvent['Organization'] || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const orgs = orgsResult.data.filter(
        (org) => orgIds.includes(org['Organization ID']) || orgIds.includes(org.Name)
      );
      setLinkedOrganizations(orgs);

      setNotes(eventNotesData || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to load event details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, sheetId, refreshAccessToken, user?.email]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

  const handleSaveBulkTouchpoints = async () => {
    if (bulkTouchpointData.selectedAttendees.size === 0) {
      notify.warning('Please select at least one attendee');
      return;
    }
    if (!bulkTouchpointData.notes.trim()) {
      notify.warning('Please add notes for the touchpoints');
      return;
    }

    setSavingBulkTouchpoints(true);
    try {
      const { addTouchpoint } = await import('../utils/devModeWrapper');

      for (const attendeeId of bulkTouchpointData.selectedAttendees) {
        const touchpointData = {
          'Contact ID': attendeeId,
          Date: event['Event Date'],
          Type: bulkTouchpointData.type,
          Notes: bulkTouchpointData.notes,
          Outcome: bulkTouchpointData.outcome || '',
          'Follow-up Needed': 'No',
          'Follow-up Date': '',
          'Event ID': event['Event ID'],
        };
        await addTouchpoint(accessToken, sheetId, touchpointData, refreshAccessToken);
      }

      setShowBulkTouchpointModal(false);
      setBulkTouchpointData({
        notes: '',
        type: 'Meeting',
        outcome: '',
        selectedAttendees: new Set(),
      });
      notify.success(
        `Successfully logged ${bulkTouchpointData.selectedAttendees.size} touchpoint(s)!`
      );
    } catch {
      notify.error('Failed to save touchpoints. Please try again.');
    } finally {
      setSavingBulkTouchpoints(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.Content.trim()) {
      notify.warning('Please enter note content');
      return;
    }

    try {
      await addNote(
        accessToken,
        sheetId,
        {
          Content: noteForm.Content,
          'Note Type': noteForm['Note Type'],
          'Event ID': id,
          Visibility: noteForm.Visibility,
          'Shared With': noteForm['Shared With'],
          Status: 'Unprocessed',
        },
        user?.email
      );

      notify.success('Note created successfully!');
      setShowNoteModal(false);
      setNoteForm({
        Content: '',
        'Note Type': 'Event Note',
        Visibility: 'Workspace-Wide',
        'Shared With': '',
      });
      loadEventDetails();
    } catch {
      notify.error('Failed to create note. Please try again.');
    }
  };

  const handleStartEdit = () => {
    setEditData({
      'Event Name': event['Event Name'] || '',
      'Event Date': event['Event Date'] || '',
      'Start Time': event['Start Time'] || '',
      'End Time': event['End Time'] || '',
      'Event Location': event['Event Location'] || '',
      'Event Type': event['Event Type'] || '',
      Status: event['Status'] || '',
      Description: event['Description'] || '',
      'Virtual Meeting Link': event['Virtual Meeting Link'] || '',
      'Goals/Objectives': event['Goals/Objectives'] || '',
    });
    setIsEditing(true);
  };

  const handleAddAttendee = async (contactId) => {
    try {
      const currentAttendees = event['Attendees'] || '';
      const ids = currentAttendees
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);
      if (ids.includes(contactId)) {
        notify.warning('This contact is already an attendee');
        return;
      }
      ids.push(contactId);
      await updateEvent(accessToken, sheetId, id, { Attendees: ids.join(', ') });
      notify.success('Attendee added!');
      setShowAddAttendeeModal(false);
      setAttendeeSearchQuery('');
      loadEventDetails();
    } catch {
      notify.error('Failed to add attendee');
    }
  };

  const saveUnresolved = async (names) => {
    await updateEvent(accessToken, sheetId, id, {
      'Unresolved Attendees': JSON.stringify(names),
    });
  };

  const handleAddUnresolved = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || unresolvedAttendees.includes(trimmed)) return;
    const next = [...unresolvedAttendees, trimmed];
    setUnresolvedAttendees(next);
    setNewUnresolvedInput('');
    await saveUnresolved(next);
  };

  const handleRemoveUnresolved = async (name) => {
    const next = unresolvedAttendees.filter((n) => n !== name);
    setUnresolvedAttendees(next);
    await saveUnresolved(next);
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'ed-status-badge ed-status-badge--confirmed';
    if (s === 'completed') return 'ed-status-badge ed-status-badge--completed';
    if (s === 'cancelled') return 'ed-status-badge ed-status-badge--cancelled';
    return 'ed-status-badge ed-status-badge--planned';
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const updated = await updateEvent(accessToken, sheetId, id, editData);

      if (event['Google Calendar ID'] && event['Sync Source'] === 'CRM') {
        try {
          const updatedEventData = { ...event, ...updated };
          const googleEvent = crmEventToGoogleEvent(updatedEventData, allContacts);
          await updateCalendarEvent(accessToken, event['Google Calendar ID'], googleEvent);
          await updateEvent(accessToken, sheetId, id, {
            'Last Synced At': new Date().toISOString(),
          });
        } catch {
          notify.warning('Event updated in CRM, but failed to sync to Google Calendar');
        }
      }

      setEvent({ ...event, ...updated });
      setIsEditing(false);
      notify.success('Event updated successfully!');
    } catch {
      notify.error('Failed to update event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      setSaving(true);

      if (event['Google Calendar ID'] && event['Sync Source'] === 'CRM') {
        try {
          await deleteCalendarEvent(accessToken, event['Google Calendar ID']);
        } catch {
          notify.warning('Failed to delete from Google Calendar, but removing from CRM');
        }
      }

      await deleteEvent(accessToken, sheetId, id);
      notify.success('Event deleted successfully!');
      onNavigate('events');
    } catch {
      notify.error('Failed to delete event. Please try again.');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    let relativeText = '';
    if (diffDays === 0) relativeText = 'Today';
    else if (diffDays === 1) relativeText = 'Tomorrow';
    else if (diffDays === -1) relativeText = 'Yesterday';
    else if (diffDays > 0 && diffDays <= 7) relativeText = `In ${diffDays} days`;
    else if (diffDays < 0 && diffDays >= -7) relativeText = `${Math.abs(diffDays)} days ago`;

    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return relativeText ? `${fullDate} (${relativeText})` : fullDate;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading event details...</p>
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
        <h3 className="empty-state-title">Error Loading Event</h3>
        <p>{error}</p>
        {needsReauth ? (
          <button className="btn btn-primary mt-md" onClick={handleReauth}>
            Sign In Again
          </button>
        ) : (
          <div className="ed-error-actions">
            <button className="btn btn-secondary mt-md" onClick={() => onNavigate('events')}>
              Back to Events
            </button>
            <button className="btn btn-primary mt-md" onClick={loadEventDetails}>
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const isPastEvent = new Date(event['Event Date']) < new Date();

  return (
    <div>
      <div className="dashboard-header">
        <div className="ed-header-left">
          <button className="btn btn-ghost ed-back-btn" onClick={() => onNavigate('events')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="ed-title-row">
              <h1>{event['Event Name']}</h1>
              {event['Google Calendar ID'] && (
                <span
                  className="ed-sync-badge"
                  title={`Synced with Google Calendar${event['Last Synced At'] ? ` (${new Date(event['Last Synced At']).toLocaleString()})` : ''}`}
                >
                  {event['Sync Source'] === 'Imported' ? (
                    <>
                      <CalendarIcon size={12} /> Imported
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} /> Synced
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-muted">{formatEventDate(event['Event Date'])}</p>
          </div>
        </div>
        <div className="ed-header-actions">
          {canWrite('events') &&
            (isEditing ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  title="Save changes"
                >
                  <Check size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  title="Cancel editing"
                >
                  <X size={16} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleStartEdit}
                  title="Edit event"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn btn-ghost btn-sm ed-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete event"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ))}
        </div>
      </div>

      <div className="ed-content-grid">
        {/* Event Details Card */}
        <div className="card">
          <div className="card-header">
            <h3>Event Details</h3>
          </div>
          <div className="card-body">
            <div className="ed-field-stack">
              {isEditing && (
                <div>
                  <strong>Event Name</strong>
                  <input
                    type="text"
                    className="form-input ed-field-input"
                    value={editData['Event Name']}
                    onChange={(e) => setEditData({ ...editData, 'Event Name': e.target.value })}
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <div className="ed-field-label">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <strong>Date</strong>
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    className="form-input ed-field-indented"
                    value={editData['Event Date']}
                    onChange={(e) => setEditData({ ...editData, 'Event Date': e.target.value })}
                  />
                ) : (
                  <p className="text-muted ed-field-indented">
                    {formatEventDate(event['Event Date'])}
                  </p>
                )}
              </div>

              {/* Start / End Time */}
              {(isEditing || event['Start Time'] || event['End Time']) && (
                <div>
                  <div className="ed-field-label">
                    <Clock size={18} />
                    <strong>Time</strong>
                  </div>
                  {isEditing ? (
                    <div className="ed-time-row ed-field-indented">
                      <input
                        type="time"
                        className="form-input"
                        value={editData['Start Time']}
                        onChange={(e) => setEditData({ ...editData, 'Start Time': e.target.value })}
                      />
                      <span className="ed-time-separator">to</span>
                      <input
                        type="time"
                        className="form-input"
                        value={editData['End Time']}
                        onChange={(e) => setEditData({ ...editData, 'End Time': e.target.value })}
                      />
                    </div>
                  ) : (
                    <p className="text-muted ed-field-indented">
                      {event['Start Time']}
                      {event['End Time'] ? ` \u2013 ${event['End Time']}` : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Event Type */}
              {isEditing ? (
                <div>
                  <strong>Event Type</strong>
                  <select
                    className="form-select ed-field-input"
                    value={editData['Event Type']}
                    onChange={(e) => setEditData({ ...editData, 'Event Type': e.target.value })}
                  >
                    <option value="">Select type...</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Networking">Networking</option>
                    <option value="Fundraiser">Fundraiser</option>
                    <option value="Training">Training</option>
                    <option value="Social">Social</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              ) : (
                event['Event Type'] && (
                  <div>
                    <strong>Type</strong>
                    <p className="text-muted ed-field-indented">{event['Event Type']}</p>
                  </div>
                )
              )}

              {/* Location */}
              {(isEditing || event['Event Location']) && (
                <div>
                  <div className="ed-field-label">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <strong>Location</strong>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-input ed-field-indented"
                      value={editData['Event Location']}
                      onChange={(e) =>
                        setEditData({ ...editData, 'Event Location': e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-muted ed-field-indented">{event['Event Location']}</p>
                  )}
                </div>
              )}

              {/* Description */}
              {(isEditing || event['Description']) && (
                <div>
                  <div className="ed-field-label">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <strong>Description</strong>
                  </div>
                  {isEditing ? (
                    <textarea
                      className="form-textarea ed-field-indented"
                      value={editData['Description']}
                      onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted ed-field-indented ed-pre-wrap">
                      {event['Description']}
                    </p>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                {isEditing ? (
                  <>
                    <strong>Status</strong>
                    <select
                      className="form-select ed-field-input"
                      value={editData['Status']}
                      onChange={(e) => setEditData({ ...editData, Status: e.target.value })}
                    >
                      <option value="">Auto (based on date)</option>
                      <option value="Planned">Planned</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </>
                ) : (
                  <span className={getStatusBadgeClass(event['Status'])}>
                    {event['Status'] || (isPastEvent ? 'Past Event' : 'Upcoming Event')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendees Card */}
        <div className="card">
          <div className="card-header">
            <h3>Attendees</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span className="badge badge-priority-medium">{attendeeContacts.length}</span>
              <button
                className="btn btn-ghost btn-sm ed-add-attendee-btn"
                onClick={() => setShowAddAttendeeModal(true)}
                title="Add attendee"
              >
                <UserPlus size={16} />
              </button>
            </div>
          </div>
          <div className="card-body">
            {attendeeContacts.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title="No attendees yet"
                description="Use the button above to add attendees."
              />
            ) : (
              <>
                <div className="ed-attendee-list">
                  {attendeeContacts.map((contact) => (
                    <ContactCard
                      key={contact['Contact ID']}
                      contact={contact}
                      compact
                      onClick={() => onNavigate('contact-profile', contact['Contact ID'])}
                    />
                  ))}
                </div>
                {isPastEvent && (
                  <button
                    className="btn btn-primary ed-log-all-btn"
                    onClick={() => {
                      setBulkTouchpointData((prev) => ({
                        ...prev,
                        selectedAttendees: new Set(attendeeContacts.map((c) => c['Contact ID'])),
                      }));
                      setShowBulkTouchpointModal(true);
                    }}
                  >
                    Log Touchpoints for All
                  </button>
                )}
              </>
            )}

            {/* Unresolved attendees */}
            {(unresolvedAttendees.length > 0 || canWrite('events')) && (
              <div className="ed-unresolved-section">
                {unresolvedAttendees.length > 0 && (
                  <>
                    <p className="ed-unresolved-label">Not in contacts yet</p>
                    <div className="tags-input-wrap">
                      {unresolvedAttendees.map((name) => (
                        <span key={name} className="tags-input-chip">
                          {name}
                          {canWrite('events') && (
                            <button
                              type="button"
                              className="tags-input-chip-remove"
                              onClick={() => handleRemoveUnresolved(name)}
                              aria-label={`Remove ${name}`}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {canWrite('events') && (
                  <input
                    type="text"
                    className="ed-unresolved-input"
                    placeholder="Add name, press Enter..."
                    value={newUnresolvedInput}
                    onChange={(e) => setNewUnresolvedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddUnresolved(newUnresolvedInput);
                      }
                    }}
                    onBlur={() => {
                      if (newUnresolvedInput.trim()) handleAddUnresolved(newUnresolvedInput);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Organizations Card */}
        {linkedOrganizations.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>Organizations</h3>
              <span className="badge badge-priority-medium">{linkedOrganizations.length}</span>
            </div>
            <div className="card-body">
              <div className="ed-attendee-list">
                {linkedOrganizations.map((org) => (
                  <div
                    key={org['Organization ID']}
                    className="card cp-linked-card"
                    onClick={() => onNavigate('organization-profile', org['Organization ID'])}
                  >
                    <div className="cp-linked-card-inner">
                      <div>
                        <strong>{org['Display Name'] || org.Name}</strong>
                        {org.Type && <div className="cp-linked-card-meta">{org.Type}</div>}
                      </div>
                      <span className="badge badge-status-inactive cp-linked-card-id">
                        {org['Organization ID']}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes Card */}
        <div className="card">
          <div className="card-body ed-notes-body">
            <NotesDisplaySection
              notes={notes}
              entityType="event"
              entityId={id}
              onAddNote={() => setShowNoteModal(true)}
              canEdit={true}
              showAddButton={true}
              showLinkedEntities={true}
            />
          </div>
        </div>

        {/* Meeting Prep Card */}
        {(isEditing || event['Virtual Meeting Link'] || event['Goals/Objectives']) && (
          <div className="card ed-prep-card">
            <div className="card-header">
              <h3>Meeting Prep</h3>
            </div>
            <div className="card-body">
              <div className="ed-field-stack">
                {/* Agenda / Meeting Link */}
                {(isEditing || event['Virtual Meeting Link']) && (
                  <div>
                    <div className="ed-field-label">
                      <LinkIcon size={18} />
                      <strong>Meeting Link / Agenda</strong>
                    </div>
                    {isEditing ? (
                      <input
                        type="url"
                        className="form-input ed-field-indented"
                        placeholder="https://docs.google.com/... or Zoom link"
                        value={editData['Virtual Meeting Link']}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            'Virtual Meeting Link': e.target.value,
                          })
                        }
                      />
                    ) : (
                      <a
                        href={event['Virtual Meeting Link']}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ed-prep-link ed-field-indented"
                      >
                        {event['Virtual Meeting Link']}
                      </a>
                    )}
                  </div>
                )}

                {/* Goals / Objectives */}
                {(isEditing || event['Goals/Objectives']) && (
                  <div>
                    <div className="ed-field-label">
                      <Target size={18} />
                      <strong>Goals / Objectives</strong>
                    </div>
                    {isEditing ? (
                      <textarea
                        className="form-textarea ed-field-indented"
                        value={editData['Goals/Objectives']}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            'Goals/Objectives': e.target.value,
                          })
                        }
                        rows={4}
                        placeholder="What should be accomplished at this event?"
                      />
                    ) : (
                      <p className="ed-prep-objectives ed-field-indented">
                        {event['Goals/Objectives']}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="ed-modal-overlay">
          <div className="card ed-modal-card">
            <div className="card-header">
              <h3>Add Event Note</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <div className="ed-modal-field">
                <label className="form-label">Note Type</label>
                <select
                  className="form-input"
                  value={noteForm['Note Type']}
                  onChange={(e) => setNoteForm({ ...noteForm, 'Note Type': e.target.value })}
                >
                  <option value="Event Note">Event Note</option>
                  <option value="Meeting Note">Meeting Note</option>
                  <option value="General">General</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Action Item">Action Item</option>
                </select>
              </div>

              <div className="ed-modal-field">
                <label className="form-label">Content *</label>
                <textarea
                  className="form-input"
                  value={noteForm.Content}
                  onChange={(e) => setNoteForm({ ...noteForm, Content: e.target.value })}
                  placeholder="Write your note here..."
                  rows={6}
                  autoFocus
                />
              </div>

              <div className="ed-modal-field">
                <label className="form-label">Visibility</label>
                <select
                  className="form-input"
                  value={noteForm.Visibility}
                  onChange={(e) => setNoteForm({ ...noteForm, Visibility: e.target.value })}
                >
                  <option value="Workspace-Wide">Workspace-Wide</option>
                  <option value="Shared">Shared with specific users</option>
                  <option value="Private">Private (only me)</option>
                </select>
              </div>

              {noteForm.Visibility === 'Shared' && (
                <div className="ed-modal-field">
                  <label className="form-label">Share with (comma-separated emails)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={noteForm['Shared With']}
                    onChange={(e) => setNoteForm({ ...noteForm, 'Shared With': e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              )}
            </div>
            <div className="card-footer ed-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddNote}
                disabled={!noteForm.Content.trim()}
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Touchpoint Modal */}
      {showBulkTouchpointModal && (
        <div className="ed-modal-overlay">
          <div className="card ed-modal-card">
            <div className="card-header">
              <h3>Log Touchpoints</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowBulkTouchpointModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <div className="ed-modal-field">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={bulkTouchpointData.type}
                  onChange={(e) =>
                    setBulkTouchpointData((prev) => ({ ...prev, type: e.target.value }))
                  }
                  disabled={savingBulkTouchpoints}
                >
                  <option value="Call">Call</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Email">Email</option>
                  <option value="Text">Text</option>
                  <option value="Note">Note</option>
                </select>
              </div>

              <div className="ed-modal-field">
                <label className="form-label">Outcome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Committed, Interested, Follow-up needed"
                  value={bulkTouchpointData.outcome}
                  onChange={(e) =>
                    setBulkTouchpointData((prev) => ({ ...prev, outcome: e.target.value }))
                  }
                  disabled={savingBulkTouchpoints}
                />
              </div>

              <div className="ed-modal-field">
                <label className="form-label">Notes *</label>
                <textarea
                  className="form-textarea"
                  placeholder="What was discussed? Any action items?"
                  value={bulkTouchpointData.notes}
                  onChange={(e) =>
                    setBulkTouchpointData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                  disabled={savingBulkTouchpoints}
                  required
                />
              </div>

              <div className="ed-attendee-select">
                <label className="form-label">Attendees</label>
                <div className="ed-attendee-check-list">
                  {attendeeContacts.map((contact) => (
                    <label key={contact['Contact ID']} className="ed-attendee-check-item">
                      <input
                        type="checkbox"
                        checked={bulkTouchpointData.selectedAttendees.has(contact['Contact ID'])}
                        onChange={(e) => {
                          const newSelected = new Set(bulkTouchpointData.selectedAttendees);
                          if (e.target.checked) {
                            newSelected.add(contact['Contact ID']);
                          } else {
                            newSelected.delete(contact['Contact ID']);
                          }
                          setBulkTouchpointData((prev) => ({
                            ...prev,
                            selectedAttendees: newSelected,
                          }));
                        }}
                        disabled={savingBulkTouchpoints}
                      />
                      <span>
                        {contact['First Name']} {contact['Last Name']}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="ed-modal-footer-row">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBulkTouchpointModal(false)}
                  disabled={savingBulkTouchpoints}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveBulkTouchpoints}
                  disabled={
                    savingBulkTouchpoints || bulkTouchpointData.selectedAttendees.size === 0
                  }
                >
                  {savingBulkTouchpoints
                    ? 'Saving...'
                    : `Save (${bulkTouchpointData.selectedAttendees.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendee Modal */}
      {showAddAttendeeModal && (
        <div className="ed-modal-overlay">
          <div className="card ed-modal-card">
            <div className="card-header">
              <h3>Add Attendee</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowAddAttendeeModal(false);
                  setAttendeeSearchQuery('');
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <div className="ed-attendee-search">
                <div style={{ position: 'relative' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    className="ed-attendee-search-input"
                    style={{ paddingLeft: '36px' }}
                    placeholder="Search contacts..."
                    value={attendeeSearchQuery}
                    onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="ed-attendee-search-results">
                {allContacts
                  .filter((c) => {
                    const name = `${c['First Name'] || ''} ${c['Last Name'] || ''}`.toLowerCase();
                    const alreadyAttending = attendeeContacts.some(
                      (a) => a['Contact ID'] === c['Contact ID']
                    );
                    return !alreadyAttending && name.includes(attendeeSearchQuery.toLowerCase());
                  })
                  .slice(0, 20)
                  .map((contact) => (
                    <div
                      key={contact['Contact ID']}
                      className="ed-attendee-search-item"
                      onClick={() => handleAddAttendee(contact['Contact ID'])}
                    >
                      <span>
                        {contact['First Name']} {contact['Last Name']}
                      </span>
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {contact['Organization'] || ''}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteEvent}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Event"
        message={`Are you sure you want to delete "${event['Event Name']}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default EventDetails;
