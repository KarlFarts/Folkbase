import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { X, Edit, Trash2, Check, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
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
import { crmEventToGoogleEvent } from '../utils/eventTransformers';
import ContactCard from '../components/ContactCard';
import NotesDisplaySection from '../components/notes/NotesDisplaySection';
import ConfirmDialog from '../components/ConfirmDialog';

function EventDetails({ onNavigate }) {
  const { id } = useParams();
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();
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

  const loadEventDetails = useCallback(async () => {
    if (!accessToken || !config.personalSheetId) {
      setError('Please sign in to access your data.');
      setNeedsReauth(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Load events, contacts, organizations, and event notes in parallel
      const [eventsResult, contactsResult, orgsResult, eventNotesData] = await Promise.all([
        readSheetData(accessToken, config.personalSheetId, SHEETS.EVENTS, refreshAccessToken),
        readSheetData(accessToken, config.personalSheetId, SHEETS.CONTACTS, refreshAccessToken),
        readSheetData(
          accessToken,
          config.personalSheetId,
          SHEETS.ORGANIZATIONS,
          refreshAccessToken
        ),
        getEventNotes(accessToken, config.personalSheetId, id, user?.email),
      ]);

      const foundEvent = eventsResult.data.find((e) => e['Event ID'] === id);

      if (!foundEvent) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent(foundEvent);

      // Store all contacts for transformer
      setAllContacts(contactsResult.data || []);

      // Get attendee contacts
      if (foundEvent['Attendees']) {
        const attendeeIds = foundEvent['Attendees'].split(',').map((id) => id.trim());
        const attendees = contactsResult.data.filter((contact) =>
          attendeeIds.includes(contact['Contact ID'])
        );
        setAttendeeContacts(attendees);
      }

      // Get linked organizations (from Organization field or related data)
      const orgIds = (foundEvent['Organization'] || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const orgs = orgsResult.data.filter(
        (org) => orgIds.includes(org['Organization ID']) || orgIds.includes(org.Name)
      );
      setLinkedOrganizations(orgs);

      // Notes are already filtered by getEventNotes with visibility rules
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
  }, [id, accessToken, config.personalSheetId, refreshAccessToken, user?.email]);

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

        await addTouchpoint(
          accessToken,
          config.personalSheetId,
          touchpointData,
          refreshAccessToken
        );
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
        config.personalSheetId,
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
      loadEventDetails(); // Refresh to get new note
    } catch {
      notify.error('Failed to create note. Please try again.');
    }
  };

  const handleStartEdit = () => {
    setEditData({
      'Event Name': event['Event Name'] || '',
      'Event Date': event['Event Date'] || '',
      'Event Location': event['Event Location'] || '',
      'Event Type': event['Event Type'] || '',
      Description: event['Description'] || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      const updated = await updateEvent(accessToken, config.personalSheetId, id, editData);

      // Sync to Google Calendar if this event is synced
      if (event['Google Calendar ID'] && event['Sync Source'] === 'CRM') {
        try {
          const updatedEventData = { ...event, ...updated };
          const googleEvent = crmEventToGoogleEvent(updatedEventData, allContacts);
          await updateCalendarEvent(accessToken, event['Google Calendar ID'], googleEvent);

          // Update Last Synced At timestamp
          await updateEvent(accessToken, config.personalSheetId, id, {
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

      // Delete from Google Calendar if this event is synced
      if (event['Google Calendar ID'] && event['Sync Source'] === 'CRM') {
        try {
          await deleteCalendarEvent(accessToken, event['Google Calendar ID']);
        } catch {
          // Continue with CRM deletion even if calendar deletion fails
          notify.warning('Failed to delete from Google Calendar, but removing from CRM');
        }
      }

      await deleteEvent(accessToken, config.personalSheetId, id);
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
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => onNavigate('events')}
            style={{ padding: 'var(--spacing-sm)' }}
          >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <h1>{event['Event Name']}</h1>
              {/* Sync Status Badge */}
              {event['Google Calendar ID'] && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    color: 'var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                  }}
                  title={`Synced with Google Calendar${event['Last Synced At'] ? ` (${new Date(event['Last Synced At']).toLocaleString()})` : ''}`}
                >
                  {event['Sync Source'] === 'Imported' ? (
                    <>
                      <CalendarIcon size={12} />
                      Imported
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Synced
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="text-muted">{formatEventDate(event['Event Date'])}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {isEditing ? (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveEdit}
                disabled={saving}
                title="Save changes"
              >
                <Check size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                title="Cancel editing"
              >
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleStartEdit} title="Edit event">
                <Edit size={16} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete event"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Event Details Card */}
        <div className="card">
          <div className="card-header">
            <h3>Event Details</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {/* Event Name (only shown when editing, since title is in header) */}
              {isEditing && (
                <div>
                  <strong>Event Name</strong>
                  <input
                    type="text"
                    className="form-input"
                    value={editData['Event Name']}
                    onChange={(e) => setEditData({ ...editData, 'Event Name': e.target.value })}
                    style={{ marginTop: 'var(--spacing-xs)' }}
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    marginBottom: 'var(--spacing-xs)',
                  }}
                >
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
                    className="form-input"
                    value={editData['Event Date']}
                    onChange={(e) => setEditData({ ...editData, 'Event Date': e.target.value })}
                    style={{ marginLeft: 'var(--spacing-lg)' }}
                  />
                ) : (
                  <p className="text-muted" style={{ marginLeft: 'var(--spacing-lg)' }}>
                    {formatEventDate(event['Event Date'])}
                  </p>
                )}
              </div>

              {/* Event Type */}
              {isEditing ? (
                <div>
                  <strong>Event Type</strong>
                  <select
                    className="form-select"
                    value={editData['Event Type']}
                    onChange={(e) => setEditData({ ...editData, 'Event Type': e.target.value })}
                    style={{ marginTop: 'var(--spacing-xs)' }}
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
                    <p className="text-muted" style={{ marginLeft: 'var(--spacing-lg)' }}>
                      {event['Event Type']}
                    </p>
                  </div>
                )
              )}

              {/* Location */}
              {(isEditing || event['Event Location']) && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginBottom: 'var(--spacing-xs)',
                    }}
                  >
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
                      className="form-input"
                      value={editData['Event Location']}
                      onChange={(e) =>
                        setEditData({ ...editData, 'Event Location': e.target.value })
                      }
                      style={{ marginLeft: 'var(--spacing-lg)' }}
                    />
                  ) : (
                    <p className="text-muted" style={{ marginLeft: 'var(--spacing-lg)' }}>
                      {event['Event Location']}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              {(isEditing || event['Description']) && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginBottom: 'var(--spacing-xs)',
                    }}
                  >
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
                      className="form-textarea"
                      value={editData['Description']}
                      onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
                      rows={4}
                      style={{ marginLeft: 'var(--spacing-lg)' }}
                    />
                  ) : (
                    <p
                      className="text-muted"
                      style={{ marginLeft: 'var(--spacing-lg)', whiteSpace: 'pre-wrap' }}
                    >
                      {event['Description']}
                    </p>
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div>
                <span
                  className={`badge ${isPastEvent ? 'badge-status-inactive' : 'badge-status-active'}`}
                >
                  {isPastEvent ? 'Past Event' : 'Upcoming Event'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendees Card */}
        <div className="card">
          <div className="card-header">
            <h3>Attendees</h3>
            <span className="badge badge-priority-medium">{attendeeContacts.length}</span>
          </div>
          <div className="card-body">
            {attendeeContacts.length === 0 ? (
              <p className="text-muted text-center">No attendees for this event</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
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
                    className="btn btn-primary"
                    onClick={() => {
                      setBulkTouchpointData((prev) => ({
                        ...prev,
                        selectedAttendees: new Set(attendeeContacts.map((c) => c['Contact ID'])),
                      }));
                      setShowBulkTouchpointModal(true);
                    }}
                    style={{ marginTop: 'var(--spacing-md)', width: '100%' }}
                  >
                    Log Touchpoints for All
                  </button>
                )}
              </>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {linkedOrganizations.map((org) => (
                  <div
                    key={org['Organization ID']}
                    className="card"
                    style={{
                      padding: 'var(--spacing-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => onNavigate('organization-profile', org['Organization ID'])}
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
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{org['Display Name'] || org.Name}</strong>
                        {org.Type && (
                          <div
                            className="text-muted"
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              marginTop: 'var(--spacing-xs)',
                            }}
                          >
                            {org.Type}
                          </div>
                        )}
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
            </div>
          </div>
        )}

        {/* Notes Card */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
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
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)',
          }}
        >
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-header">
              <h3>Add Event Note</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNoteModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
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
            <div className="card-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-md)',
          }}
        >
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
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
              {/* Type */}
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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

              {/* Outcome */}
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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

              {/* Notes */}
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
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

              {/* Attendee Selection */}
              <div
                style={{ marginBottom: 'var(--spacing-md)', maxHeight: '300px', overflowY: 'auto' }}
              >
                <label className="form-label">Attendees</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {attendeeContacts.map((contact) => (
                    <label
                      key={contact['Contact ID']}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        cursor: 'pointer',
                        padding: 'var(--spacing-xs)',
                      }}
                    >
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

              {/* Actions */}
              <div
                style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}
              >
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
