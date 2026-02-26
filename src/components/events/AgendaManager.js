import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getEventAgendaItems,
  addEventAgendaItem,
  updateEventAgendaItem,
  deleteEventAgendaItem,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

/**
 * AgendaManager - Manage event agenda items (junction table)
 */
function AgendaManager({ eventId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [agendaItems, setAgendaItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Start Time': '',
    'End Time': '',
    'Duration (Minutes)': '',
    Title: '',
    Description: '',
    'Speaker Contact ID': '',
    'Speaker Name': '',
    'Location/Room': '',
    Notes: '',
  });

  useEffect(() => {
    loadAgendaItems();
    loadContacts();
  }, [eventId]);

  const loadAgendaItems = async () => {
    if (!accessToken || !activeSheetId || !eventId) return;

    try {
      setLoading(true);
      const data = await getEventAgendaItems(accessToken, activeSheetId, eventId);
      // Sort by start time
      const sorted = data.sort((a, b) =>
        (a['Start Time'] || '').localeCompare(b['Start Time'] || '')
      );
      setAgendaItems(sorted);
    } catch (error) {
      showNotification('Failed to load agenda', 'error');
      console.error('Error loading agenda:', error);
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
      'Start Time': '',
      'End Time': '',
      'Duration (Minutes)': '',
      Title: '',
      Description: '',
      'Speaker Contact ID': '',
      'Speaker Name': '',
      'Location/Room': '',
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item['Agenda Item ID']);
    setFormData({
      'Start Time': item['Start Time'] || '',
      'End Time': item['End Time'] || '',
      'Duration (Minutes)': item['Duration (Minutes)'] || '',
      Title: item.Title || '',
      Description: item.Description || '',
      'Speaker Contact ID': item['Speaker Contact ID'] || '',
      'Speaker Name': item['Speaker Name'] || '',
      'Location/Room': item['Location/Room'] || '',
      Notes: item.Notes || '',
    });
    setIsModalOpen(true);
  };

  const calculateDuration = () => {
    if (!formData['Start Time'] || !formData['End Time']) return '';
    const start = new Date(`1970-01-01T${formData['Start Time']}`);
    const end = new Date(`1970-01-01T${formData['End Time']}`);
    const diff = (end - start) / 1000 / 60; // minutes
    return diff > 0 ? Math.round(diff).toString() : '';
  };

  const handleSave = async () => {
    if (!formData.Title) {
      showNotification('Title is required', 'error');
      return;
    }

    try {
      const duration = formData['Duration (Minutes)'] || calculateDuration();

      const saveData = {
        'Event ID': eventId,
        'Start Time': formData['Start Time'],
        'End Time': formData['End Time'],
        'Duration (Minutes)': duration,
        Title: formData.Title,
        Description: formData.Description,
        'Speaker Contact ID': formData['Speaker Contact ID'],
        'Speaker Name': formData['Speaker Name'],
        'Location/Room': formData['Location/Room'],
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateEventAgendaItem(accessToken, activeSheetId, editingId, saveData);
        showNotification('Agenda item updated', 'success');
      } else {
        await addEventAgendaItem(accessToken, activeSheetId, saveData);
        showNotification('Agenda item added', 'success');
      }

      setIsModalOpen(false);
      loadAgendaItems();
    } catch (error) {
      showNotification('Failed to save agenda item', 'error');
      console.error('Error saving agenda item:', error);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this agenda item?')) return;

    try {
      await deleteEventAgendaItem(accessToken, activeSheetId, itemId);
      showNotification('Agenda item deleted', 'success');
      loadAgendaItems();
    } catch (error) {
      showNotification('Failed to delete agenda item', 'error');
      console.error('Error deleting agenda item:', error);
    }
  };

  const handleSpeakerSelect = (e) => {
    const contactId = e.target.value;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    setFormData({
      ...formData,
      'Speaker Contact ID': contactId,
      'Speaker Name': contact ? contact['Display Name'] || contact.Name || '' : '',
    });
  };

  if (loading) {
    return <p className="text-muted">Loading agenda...</p>;
  }

  return (
    <div>
      <div className="agm-header">
        <h3>Agenda</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Agenda Item
        </button>
      </div>

      {agendaItems.length === 0 ? (
        <p className="text-muted">No agenda items yet. Click "Add Agenda Item" to get started.</p>
      ) : (
        <div className="agm-items-list">
          {agendaItems.map((item) => (
            <div
              key={item['Agenda Item ID']}
              className="card agm-item-card"
            >
              <div className="agm-item-row">
                <div className="agm-item-body">
                  <div className="agm-item-meta">
                    <span className="text-muted agm-time-label">
                      {item['Start Time']} - {item['End Time']}
                      {item['Duration (Minutes)'] && ` (${item['Duration (Minutes)']} min)`}
                    </span>
                    {item['Location/Room'] && (
                      <span className="badge badge-status-inactive agm-location-badge">
                        {item['Location/Room']}
                      </span>
                    )}
                  </div>
                  <h4 className="agm-item-title">{item.Title}</h4>
                  {item.Description && (
                    <p className="text-muted agm-item-description">
                      {item.Description}
                    </p>
                  )}
                  {item['Speaker Name'] && (
                    <p className="agm-speaker">
                      Speaker: {item['Speaker Name']}
                    </p>
                  )}
                </div>
                <div className="agm-item-actions">
                  <button
                    onClick={() => openEditModal(item)}
                    className="btn btn-ghost btn-sm"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item['Agenda Item ID'])}
                    className="btn btn-ghost btn-sm"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Agenda Item' : 'Add Agenda Item'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div className="agm-form">
            <div>
              <label className="form-label">
                Title <span className="agm-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.Title}
                onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                placeholder="Opening remarks, Keynote, Q&A, etc."
              />
            </div>

            <div className="agm-time-grid">
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

              <div>
                <label className="form-label">Duration (min)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData['Duration (Minutes)']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Duration (Minutes)': e.target.value })
                  }
                  placeholder={calculateDuration() || 'Auto'}
                />
                {calculateDuration() && (
                  <small className="text-muted">Calculated: {calculateDuration()} min</small>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.Description}
                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                rows={2}
                placeholder="Brief description of this agenda item"
              />
            </div>

            <div>
              <label className="form-label">Speaker (from database)</label>
              <select
                className="form-select"
                value={formData['Speaker Contact ID']}
                onChange={handleSpeakerSelect}
              >
                <option value="">Select speaker...</option>
                {contacts.map((contact) => (
                  <option key={contact['Contact ID']} value={contact['Contact ID']}>
                    {contact['Display Name'] || contact.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Speaker Name</label>
              <input
                type="text"
                className="form-input"
                value={formData['Speaker Name']}
                onChange={(e) => setFormData({ ...formData, 'Speaker Name': e.target.value })}
                placeholder="Speaker or facilitator name"
              />
              <small className="text-muted">
                Use the dropdown above to link to a contact, or enter manually here
              </small>
            </div>

            <div>
              <label className="form-label">Location/Room</label>
              <input
                type="text"
                className="form-input"
                value={formData['Location/Room']}
                onChange={(e) => setFormData({ ...formData, 'Location/Room': e.target.value })}
                placeholder="Main Hall, Conference Room A, etc."
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

export default AgendaManager;
