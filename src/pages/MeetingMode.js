import { useState, useCallback, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import {
  addTouchpoint,
  logActivity,
  ACTIVITY_TYPES,
  readSheetData,
  SHEETS,
} from '../utils/devModeWrapper';
import Timer from '../components/Timer';

export default function MeetingMode({ onNavigate }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [notes, setNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [closing, setClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
        setContacts(data || []);
      } catch {
        // Silent failure expected
      } finally {
        setLoading(false);
      }
    };
    loadContacts();
  }, [accessToken, sheetId]);

  const filteredContacts = contacts.filter(
    (c) => c.Name && c.Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAttendee = useCallback((contactId) => {
    setSelectedAttendees((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  }, []);

  const handleEndMeeting = useCallback(async () => {
    if (selectedAttendees.length === 0) {
      notify.warning('Please select at least one attendee');
      return;
    }

    setClosing(true);

    try {
      // Create touchpoint for each attendee
      const attendeeNames = selectedAttendees
        .map((id) => contacts.find((c) => c['Contact ID'] === id)?.Name)
        .filter(Boolean);

      for (const contactId of selectedAttendees) {
        const touchpointData = {
          'Contact ID': contactId,
          'Contact Name': contacts.find((c) => c['Contact ID'] === contactId)?.Name || '',
          Date: new Date().toISOString().split('T')[0],
          Type: 'Meeting',
          'Duration (min)': Math.round(elapsedSeconds / 60),
          Notes: notes
            ? `[${attendeeNames.join(', ')}] ${notes}`
            : `Meeting with ${attendeeNames.join(', ')}`,
          'Follow-up Needed': 'No',
          Outcome: 'Successful',
        };

        await addTouchpoint(accessToken, sheetId, touchpointData, user.email);
      }

      // Log activity
      await logActivity(
        selectedAttendees[0],
        ACTIVITY_TYPES.TOUCHPOINT_LOGGED,
        `Meeting with ${attendeeNames.join(', ')}: ${Math.round(elapsedSeconds / 60)} minutes`,
        { relatedId: 'meeting-mode-auto' }
      );

      // Brief success feedback
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1000);
    } catch (error) {
      // Silent failure expected
      notify.error(`Failed to save meeting: ${error.message}`);
      setClosing(false);
    }
  }, [
    selectedAttendees,
    contacts,
    elapsedSeconds,
    notes,
    accessToken,
    sheetId,
    user.email,
    onNavigate,
    notify,
  ]);

  if (loading) {
    return <div style={{ padding: 'var(--spacing-lg)' }}>Loading contacts...</div>;
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />{' '}
            Meeting Mode
          </h1>
          <small style={{ color: 'var(--color-text-secondary)' }}>
            {selectedAttendees.length} attendee{selectedAttendees.length !== 1 ? 's' : ''} selected
          </small>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onNavigate('dashboard')}
          disabled={closing}
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--spacing-lg)',
          gap: 'var(--spacing-lg)',
          overflow: 'auto',
        }}
      >
        {/* Timer */}
        <div>
          <Timer onTimeUpdate={setElapsedSeconds} />
        </div>

        {/* Attendees Section */}
        <div className="form-group">
          <label className="form-label">Attendees</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {filteredContacts.map((contact) => (
              <label
                key={contact['Contact ID']}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--spacing-md)',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: selectedAttendees.includes(contact['Contact ID'])
                    ? 'var(--color-bg-secondary)'
                    : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAttendees.includes(contact['Contact ID'])}
                  onChange={() => toggleAttendee(contact['Contact ID'])}
                  style={{ marginRight: 'var(--spacing-md)' }}
                />
                <div>
                  <strong>{contact.Name}</strong>
                  <small style={{ display: 'block', color: 'var(--color-text-secondary)' }}>
                    {contact.Organization}
                  </small>
                </div>
              </label>
            ))}
          </div>
          <small className="text-muted">Select contacts to create touchpoints for</small>
        </div>

        {/* Notes Section */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            placeholder="Meeting notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: '150px' }}
          />
          <small className="text-muted">
            Optional - will be saved with each attendee's touchpoint
          </small>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          gap: 'var(--spacing-md)',
          justifyContent: 'flex-end',
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('dashboard')}
          disabled={closing}
        >
          Discard & Close
        </button>
        <button
          className="btn btn-primary"
          onClick={handleEndMeeting}
          disabled={closing || selectedAttendees.length === 0}
        >
          {closing ? 'Saving...' : 'End Meeting'}
        </button>
      </div>
    </div>
  );
}
