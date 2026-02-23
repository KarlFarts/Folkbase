import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Check } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getEventAttendees,
  addEventAttendee,
  updateEventAttendee,
  deleteEventAttendee,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const RSVP_STATUSES = ['Going', 'Maybe', 'Not Going', 'No Response'];
const ROLES = ['Organizer', 'Speaker', 'Volunteer', 'Attendee'];

/**
 * AttendeesManager - Manage event attendees (junction table)
 */
function AttendeesManager({ eventId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [attendees, setAttendees] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Contact ID': '',
    'Contact Name': '',
    'RSVP Status': 'No Response',
    'Check-In Time': '',
    Role: 'Attendee',
    Notes: '',
  });

  useEffect(() => {
    loadAttendees();
    loadContacts();
  }, [eventId]);

  const loadAttendees = async () => {
    if (!accessToken || !activeSheetId || !eventId) return;

    try {
      setLoading(true);
      const data = await getEventAttendees(accessToken, activeSheetId, eventId);
      setAttendees(data);
    } catch (error) {
      showNotification('Failed to load attendees', 'error');
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!accessToken || !activeSheetId) return;

    try {
      const data = await readSheetData(accessToken, activeSheetId, SHEET_NAMES.CONTACTS);
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      'Contact ID': '',
      'Contact Name': '',
      'RSVP Status': 'No Response',
      'Check-In Time': '',
      Role: 'Attendee',
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (attendee) => {
    setEditingId(attendee['Attendee ID']);
    setFormData({
      'Contact ID': attendee['Contact ID'] || '',
      'Contact Name': attendee['Contact Name'] || '',
      'RSVP Status': attendee['RSVP Status'] || 'No Response',
      'Check-In Time': attendee['Check-In Time'] || '',
      Role: attendee.Role || 'Attendee',
      Notes: attendee.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData['Contact ID'] && !formData['Contact Name']) {
      showNotification('Contact is required', 'error');
      return;
    }

    try {
      const saveData = {
        'Event ID': eventId,
        'Contact ID': formData['Contact ID'],
        'Contact Name': formData['Contact Name'],
        'RSVP Status': formData['RSVP Status'],
        'Check-In Time': formData['Check-In Time'],
        Role: formData.Role,
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateEventAttendee(accessToken, activeSheetId, editingId, saveData);
        showNotification('Attendee updated', 'success');
      } else {
        await addEventAttendee(accessToken, activeSheetId, saveData);
        showNotification('Attendee added', 'success');
      }

      setIsModalOpen(false);
      loadAttendees();
    } catch (error) {
      showNotification('Failed to save attendee', 'error');
      console.error('Error saving attendee:', error);
    }
  };

  const handleDelete = async (attendeeId) => {
    if (!confirm('Remove this attendee?')) return;

    try {
      await deleteEventAttendee(accessToken, activeSheetId, attendeeId);
      showNotification('Attendee removed', 'success');
      loadAttendees();
    } catch (error) {
      showNotification('Failed to remove attendee', 'error');
      console.error('Error deleting attendee:', error);
    }
  };

  const handleContactSelect = (e) => {
    const contactId = e.target.value;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    setFormData({
      ...formData,
      'Contact ID': contactId,
      'Contact Name': contact ? contact['Display Name'] || contact.Name || '' : '',
    });
  };

  const handleCheckIn = async (attendee) => {
    try {
      const now = new Date().toISOString();
      await updateEventAttendee(accessToken, activeSheetId, attendee['Attendee ID'], {
        ...attendee,
        'Check-In Time': now,
      });
      showNotification('Checked in', 'success');
      loadAttendees();
    } catch (error) {
      showNotification('Failed to check in', 'error');
      console.error('Error checking in:', error);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading attendees...</p>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <h3>Attendees</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Attendee
        </button>
      </div>

      {attendees.length === 0 ? (
        <p className="text-muted">No attendees yet. Click "Add Attendee" to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>RSVP</th>
              <th>Role</th>
              <th>Checked In</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => (
              <tr key={attendee['Attendee ID']}>
                <td>{attendee['Contact Name'] || <span className="text-muted">—</span>}</td>
                <td>
                  <span
                    className={`badge ${
                      attendee['RSVP Status'] === 'Going'
                        ? 'badge-status-active'
                        : attendee['RSVP Status'] === 'Not Going'
                          ? 'badge-status-dnc'
                          : 'badge-status-inactive'
                    }`}
                  >
                    {attendee['RSVP Status']}
                  </span>
                </td>
                <td>{attendee.Role}</td>
                <td>
                  {attendee['Check-In Time'] ? (
                    <span style={{ color: 'var(--color-success)' }}>
                      <Check size={16} />
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(attendee)}
                      className="btn btn-ghost btn-sm"
                      title="Check in"
                    >
                      Check In
                    </button>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <button
                      onClick={() => openEditModal(attendee)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(attendee['Attendee ID'])}
                      className="btn btn-ghost btn-sm"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Attendee' : 'Add Attendee'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="form-label">Contact (from database)</label>
              <select
                className="form-select"
                value={formData['Contact ID']}
                onChange={handleContactSelect}
              >
                <option value="">Select contact...</option>
                {contacts.map((contact) => (
                  <option key={contact['Contact ID']} value={contact['Contact ID']}>
                    {contact['Display Name'] || contact.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Contact Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData['Contact Name']}
                onChange={(e) => setFormData({ ...formData, 'Contact Name': e.target.value })}
                placeholder="Contact name"
              />
              <small className="text-muted">
                Use the dropdown above to link to a contact, or enter manually here
              </small>
            </div>

            <div>
              <label className="form-label">RSVP Status</label>
              <select
                className="form-select"
                value={formData['RSVP Status']}
                onChange={(e) => setFormData({ ...formData, 'RSVP Status': e.target.value })}
              >
                {RSVP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.Role}
                onChange={(e) => setFormData({ ...formData, Role: e.target.value })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Check-In Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData['Check-In Time']}
                onChange={(e) => setFormData({ ...formData, 'Check-In Time': e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={formData.Notes}
                onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default AttendeesManager;
