import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Clock } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getTaskTimeEntries,
  addTaskTimeEntry,
  updateTaskTimeEntry,
  deleteTaskTimeEntry,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

/**
 * TimeEntryManager - Manage task time tracking entries (junction table)
 */
function TimeEntryManager({ taskId }) {
  const { accessToken, user } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [timeEntries, setTimeEntries] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Contact ID': '',
    'Contact Name': '',
    'Start Time': '',
    'End Time': '',
    'Duration (Hours)': '',
    Date: new Date().toISOString().split('T')[0],
    Notes: '',
  });

  useEffect(() => {
    loadTimeEntries();
    loadContacts();
  }, [taskId]);

  const loadTimeEntries = async () => {
    if (!accessToken || !activeSheetId || !taskId) return;

    try {
      setLoading(true);
      const data = await getTaskTimeEntries(accessToken, activeSheetId, taskId);
      // Sort by date (newest first)
      const sorted = data.sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));
      setTimeEntries(sorted);
    } catch (error) {
      showNotification('Failed to load time entries', 'error');
      console.error('Error loading time entries:', error);
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
      'Contact Name': user?.name || '',
      'Start Time': '',
      'End Time': '',
      'Duration (Hours)': '',
      Date: new Date().toISOString().split('T')[0],
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingId(entry['Time Entry ID']);
    setFormData({
      'Contact ID': entry['Contact ID'] || '',
      'Contact Name': entry['Contact Name'] || '',
      'Start Time': entry['Start Time'] || '',
      'End Time': entry['End Time'] || '',
      'Duration (Hours)': entry['Duration (Hours)'] || '',
      Date: entry.Date || '',
      Notes: entry.Notes || '',
    });
    setIsModalOpen(true);
  };

  const calculateDuration = () => {
    if (!formData['Start Time'] || !formData['End Time']) return '';
    const start = new Date(`1970-01-01T${formData['Start Time']}`);
    const end = new Date(`1970-01-01T${formData['End Time']}`);
    const diff = (end - start) / 1000 / 60 / 60; // hours
    return diff > 0 ? diff.toFixed(2) : '';
  };

  const handleSave = async () => {
    if (!formData.Date) {
      showNotification('Date is required', 'error');
      return;
    }

    try {
      const duration = formData['Duration (Hours)'] || calculateDuration();

      const saveData = {
        'Task ID': taskId,
        'Contact ID': formData['Contact ID'],
        'Contact Name': formData['Contact Name'],
        'Start Time': formData['Start Time'],
        'End Time': formData['End Time'],
        'Duration (Hours)': duration,
        Date: formData.Date,
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateTaskTimeEntry(accessToken, activeSheetId, editingId, saveData);
        showNotification('Time entry updated', 'success');
      } else {
        await addTaskTimeEntry(accessToken, activeSheetId, saveData);
        showNotification('Time entry added', 'success');
      }

      setIsModalOpen(false);
      loadTimeEntries();
    } catch (error) {
      showNotification('Failed to save time entry', 'error');
      console.error('Error saving time entry:', error);
    }
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this time entry?')) return;

    try {
      await deleteTaskTimeEntry(accessToken, activeSheetId, entryId);
      showNotification('Time entry deleted', 'success');
      loadTimeEntries();
    } catch (error) {
      showNotification('Failed to delete time entry', 'error');
      console.error('Error deleting time entry:', error);
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

  if (loading) {
    return <p className="text-muted">Loading time entries...</p>;
  }

  const totalHours = timeEntries.reduce((sum, entry) => {
    const hours = parseFloat(entry['Duration (Hours)']) || 0;
    return sum + hours;
  }, 0);

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
        <div>
          <h3>Time Tracking</h3>
          {totalHours > 0 && (
            <p className="text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
              Total: {totalHours.toFixed(2)} hours
            </p>
          )}
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Log Time
        </button>
      </div>

      {timeEntries.length === 0 ? (
        <p className="text-muted">No time entries yet. Click "Log Time" to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Person</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((entry) => (
              <tr key={entry['Time Entry ID']}>
                <td>{entry.Date}</td>
                <td>{entry['Contact Name'] || <span className="text-muted">—</span>}</td>
                <td>{entry['Start Time'] || <span className="text-muted">—</span>}</td>
                <td>{entry['End Time'] || <span className="text-muted">—</span>}</td>
                <td>
                  {entry['Duration (Hours)'] ? (
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                      <Clock size={14} />
                      {entry['Duration (Hours)']} hrs
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.Notes || <span className="text-muted">—</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <button
                      onClick={() => openEditModal(entry)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry['Time Entry ID'])}
                      className="btn btn-ghost btn-sm"
                      title="Delete"
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
          title={editingId ? 'Edit Time Entry' : 'Log Time'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="form-label">
                Date <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={formData.Date}
                onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Person (from database)</label>
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
              <label className="form-label">Person Name</label>
              <input
                type="text"
                className="form-input"
                value={formData['Contact Name']}
                onChange={(e) => setFormData({ ...formData, 'Contact Name': e.target.value })}
                placeholder="Who logged this time"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-md)',
              }}
            >
              <div>
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData['Start Time']}
                  onChange={(e) => setFormData({ ...formData, 'Start Time': e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData['End Time']}
                  onChange={(e) => setFormData({ ...formData, 'End Time': e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Duration (hours)</label>
              <input
                type="number"
                step="0.25"
                className="form-input"
                value={formData['Duration (Hours)']}
                onChange={(e) => setFormData({ ...formData, 'Duration (Hours)': e.target.value })}
                placeholder={calculateDuration() || 'Auto-calculated from start/end time'}
              />
              {calculateDuration() && (
                <small className="text-muted">Calculated: {calculateDuration()} hours</small>
              )}
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={formData.Notes}
                onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                rows={3}
                placeholder="What did you work on?"
              />
            </div>
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default TimeEntryManager;
