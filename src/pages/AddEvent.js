import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { sanitizeFormData, SCHEMAS } from '../utils/inputSanitizer';
import { usePermissions } from '../hooks/usePermissions';
import {
  readSheetData,
  SHEETS,
  generateEventID,
} from '../utils/devModeWrapper';
import AttendeeSelector from '../components/events/AttendeeSelector';
import TagsInput from '../components/TagsInput';

function AddEvent({ onNavigate }) {
  const { accessToken, refreshAccessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { canWrite } = usePermissions();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    'Event Name': '',
    'Event Date': '',
    'Event Location': '',
    'Event Type': 'Meeting',
    Description: '',
    Attendees: [], // Array of Contact IDs
    'Unresolved Attendees': '',
  });

  const loadContacts = useCallback(async () => {
    if (!accessToken || !sheetId) {
      setLoadingContacts(false);
      return;
    }

    try {
      const result = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS, refreshAccessToken);
      setContacts(result.data || []);
    } catch {
      // Silently fail - contacts are optional
    } finally {
      setLoadingContacts(false);
    }
  }, [accessToken, sheetId, refreshAccessToken]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const _handleAttendeeToggle = (contactId) => {
    setFormData((prev) => ({
      ...prev,
      Attendees: prev['Attendees'].includes(contactId)
        ? prev['Attendees'].filter((id) => id !== contactId)
        : [...prev['Attendees'], contactId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData['Event Name'].trim()) {
      setError('Event name is required');
      return;
    }
    if (!formData['Event Date']) {
      setError('Event date is required');
      return;
    }

    setLoading(true);

    try {
      // Import the addEvent function dynamically
      const { addEvent } = await import('../utils/devModeWrapper');

      // Generate Event ID
      const eventId = await generateEventID(accessToken, sheetId);

      // Convert attendee IDs to comma-separated string
      const eventData = {
        'Event ID': eventId,
        ...formData,
        Attendees: formData['Attendees'].join(','),
      };

      // Sanitize input to prevent XSS and formula injection
      const sanitizedEventData = sanitizeFormData(eventData, SCHEMAS.event);

      await addEvent(accessToken, sheetId, sanitizedEventData, refreshAccessToken);

      setSuccess(true);

      // Navigate back to events list after a short delay
      setTimeout(() => {
        onNavigate('events');
      }, 1500);
    } catch {
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onNavigate('events');
  };

  if (!canWrite('events')) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '480px', margin: '4rem auto' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Permission Required</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
              You don&apos;t have permission to do this. Ask the workspace owner for access.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('events')}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Create Event</h1>
          <p className="text-muted">Schedule a new event and invite contacts</p>
        </div>
      </div>

      <div className="card add-form-card add-form-card--lg">
        <div className="card-body">
          {success && (
            <div className="form-success-message">Event created successfully! Redirecting...</div>
          )}

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Event Name */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="event-name">
                Event Name *
              </label>
              <input
                id="event-name"
                type="text"
                className="form-input"
                value={formData['Event Name']}
                onChange={(e) => handleInputChange('Event Name', e.target.value)}
                placeholder="e.g., Team Lunch, Coffee with John"
                disabled={loading}
                aria-required="true"
                required
              />
            </div>

            {/* Event Date */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="event-date">
                Event Date *
              </label>
              <input
                id="event-date"
                type="date"
                className="form-input"
                value={formData['Event Date']}
                onChange={(e) => handleInputChange('Event Date', e.target.value)}
                disabled={loading}
                aria-required="true"
                required
              />
            </div>

            {/* Event Type */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="event-type">
                Event Type
              </label>
              <select
                id="event-type"
                className="form-input"
                value={formData['Event Type']}
                onChange={(e) => handleInputChange('Event Type', e.target.value)}
                disabled={loading}
              >
                <option value="Meeting">Meeting</option>
                <option value="Workshop">Workshop</option>
                <option value="Workspace Event">Workspace Event</option>
                <option value="Social">Social</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Event Location */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="event-location">
                Location
              </label>
              <input
                id="event-location"
                type="text"
                className="form-input"
                value={formData['Event Location']}
                onChange={(e) => handleInputChange('Event Location', e.target.value)}
                placeholder="e.g., Coffee Shop, Zoom, Office"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="event-description">
                Description
              </label>
              <textarea
                id="event-description"
                className="form-textarea"
                value={formData['Description']}
                onChange={(e) => handleInputChange('Description', e.target.value)}
                placeholder="Add notes or agenda for this event..."
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Attendees */}
            {loadingContacts ? (
              <p className="text-muted">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <p className="text-muted">
                No contacts available. Add contacts first to invite them to events.
              </p>
            ) : (
              <AttendeeSelector
                contacts={contacts}
                selectedIds={formData['Attendees']}
                onChange={(ids) => handleInputChange('Attendees', ids)}
              />
            )}

            {/* Unresolved / freeform attendees */}
            <div className="add-form-field">
              <label className="form-label" htmlFor="unresolved-attendees">
                Other attendees (not in contacts)
              </label>
              <TagsInput
                id="unresolved-attendees"
                value={formData['Unresolved Attendees']}
                onChange={(val) => handleInputChange('Unresolved Attendees', val)}
                placeholder="Type a name and press Enter..."
              />
              <p className="form-hint">
                Names you can resolve to contacts later in your review queue.
              </p>
            </div>

            {/* Actions */}
            <div className="add-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEvent;
