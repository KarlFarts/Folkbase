import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Check, Square } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getTaskChecklistItems,
  addTaskChecklistItem,
  updateTaskChecklistItem,
  deleteTaskChecklistItem,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

/**
 * ChecklistManager - Manage task checklist items (junction table)
 */
function ChecklistManager({ taskId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [checklistItems, setChecklistItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Item Text': '',
    'Is Completed': false,
    'Completed Date': '',
    'Assigned To': '',
    'Assigned To Name': '',
    'Display Order': '',
    Notes: '',
  });

  useEffect(() => {
    loadChecklistItems();
    loadContacts();
  }, [taskId]);

  const loadChecklistItems = async () => {
    if (!accessToken || !activeSheetId || !taskId) return;

    try {
      setLoading(true);
      const data = await getTaskChecklistItems(accessToken, activeSheetId, taskId);
      // Sort by display order
      const sorted = data.sort((a, b) => {
        const orderA = parseInt(a['Display Order']) || 0;
        const orderB = parseInt(b['Display Order']) || 0;
        return orderA - orderB;
      });
      setChecklistItems(sorted);
    } catch (error) {
      showNotification('Failed to load checklist', 'error');
      console.error('Error loading checklist:', error);
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
    const nextOrder = checklistItems.length + 1;
    setFormData({
      'Item Text': '',
      'Is Completed': false,
      'Completed Date': '',
      'Assigned To': '',
      'Assigned To Name': '',
      'Display Order': nextOrder.toString(),
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item['Checklist Item ID']);
    setFormData({
      'Item Text': item['Item Text'] || '',
      'Is Completed': item['Is Completed'] === 'TRUE' || item['Is Completed'] === true,
      'Completed Date': item['Completed Date'] || '',
      'Assigned To': item['Assigned To'] || '',
      'Assigned To Name': item['Assigned To Name'] || '',
      'Display Order': item['Display Order'] || '',
      Notes: item.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData['Item Text']) {
      showNotification('Item text is required', 'error');
      return;
    }

    try {
      const saveData = {
        'Task ID': taskId,
        'Item Text': formData['Item Text'],
        'Is Completed': formData['Is Completed'] ? 'TRUE' : 'FALSE',
        'Completed Date': formData['Completed Date'],
        'Assigned To': formData['Assigned To'],
        'Assigned To Name': formData['Assigned To Name'],
        'Display Order': formData['Display Order'],
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateTaskChecklistItem(accessToken, activeSheetId, editingId, saveData);
        showNotification('Checklist item updated', 'success');
      } else {
        await addTaskChecklistItem(accessToken, activeSheetId, saveData);
        showNotification('Checklist item added', 'success');
      }

      setIsModalOpen(false);
      loadChecklistItems();
    } catch (error) {
      showNotification('Failed to save checklist item', 'error');
      console.error('Error saving checklist item:', error);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this checklist item?')) return;

    try {
      await deleteTaskChecklistItem(accessToken, activeSheetId, itemId);
      showNotification('Checklist item deleted', 'success');
      loadChecklistItems();
    } catch (error) {
      showNotification('Failed to delete checklist item', 'error');
      console.error('Error deleting checklist item:', error);
    }
  };

  const handleToggleComplete = async (item) => {
    try {
      const isCompleted = item['Is Completed'] === 'TRUE' || item['Is Completed'] === true;
      const updatedData = {
        ...item,
        'Is Completed': !isCompleted ? 'TRUE' : 'FALSE',
        'Completed Date': !isCompleted ? new Date().toISOString().split('T')[0] : '',
      };
      await updateTaskChecklistItem(
        accessToken,
        activeSheetId,
        item['Checklist Item ID'],
        updatedData
      );
      loadChecklistItems();
    } catch (error) {
      showNotification('Failed to update item', 'error');
      console.error('Error toggling complete:', error);
    }
  };

  const handleAssigneeSelect = (e) => {
    const contactId = e.target.value;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    setFormData({
      ...formData,
      'Assigned To': contactId,
      'Assigned To Name': contact ? contact['Display Name'] || contact.Name || '' : '',
    });
  };

  if (loading) {
    return <p className="text-muted">Loading checklist...</p>;
  }

  const completedCount = checklistItems.filter(
    (item) => item['Is Completed'] === 'TRUE' || item['Is Completed'] === true
  ).length;

  return (
    <div>
      <div className="cm-header">
        <div>
          <h3>Checklist</h3>
          {checklistItems.length > 0 && (
            <p className="text-muted cm-progress">
              {completedCount} of {checklistItems.length} completed
            </p>
          )}
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {checklistItems.length === 0 ? (
        <p className="text-muted">No checklist items yet. Click "Add Item" to get started.</p>
      ) : (
        <div className="cm-list">
          {checklistItems.map((item) => {
            const isCompleted = item['Is Completed'] === 'TRUE' || item['Is Completed'] === true;
            return (
              <div
                key={item['Checklist Item ID']}
                className="card cm-item"
                style={{ opacity: isCompleted ? 0.6 : 1 }}
              >
                <div className="cm-item-left">
                  <button
                    onClick={() => handleToggleComplete(item)}
                    className="btn btn-ghost btn-sm cm-toggle-btn"
                  >
                    {isCompleted ? (
                      <Check size={20} color="var(--color-success)" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <div className="cm-item-content">
                    <p
                      style={{
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        marginBottom: item['Assigned To Name'] ? 'var(--spacing-xs)' : 0,
                      }}
                    >
                      {item['Item Text']}
                    </p>
                    {item['Assigned To Name'] && (
                      <p className="text-muted cm-assignee">
                        Assigned to: {item['Assigned To Name']}
                      </p>
                    )}
                  </div>
                </div>
                <div className="cm-item-actions">
                  <button
                    onClick={() => openEditModal(item)}
                    className="btn btn-ghost btn-sm"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item['Checklist Item ID'])}
                    className="btn btn-ghost btn-sm"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Checklist Item' : 'Add Checklist Item'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div className="cm-form">
            <div>
              <label className="form-label">
                Item Text <span className="cm-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData['Item Text']}
                onChange={(e) => setFormData({ ...formData, 'Item Text': e.target.value })}
                placeholder="Item description"
              />
            </div>

            <div>
              <label className="form-label">Assigned To (from database)</label>
              <select
                className="form-select"
                value={formData['Assigned To']}
                onChange={handleAssigneeSelect}
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
              <label className="form-label">Assigned To Name</label>
              <input
                type="text"
                className="form-input"
                value={formData['Assigned To Name']}
                onChange={(e) => setFormData({ ...formData, 'Assigned To Name': e.target.value })}
                placeholder="Assignee name"
              />
            </div>

            <div className="cm-two-col">
              <div>
                <label className="form-label">Display Order</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData['Display Order']}
                  onChange={(e) => setFormData({ ...formData, 'Display Order': e.target.value })}
                  placeholder="1"
                />
              </div>

              <div>
                <label className="form-label">Completed Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData['Completed Date']}
                  onChange={(e) => setFormData({ ...formData, 'Completed Date': e.target.value })}
                  disabled={!formData['Is Completed']}
                />
              </div>
            </div>

            <div>
              <label className="cm-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData['Is Completed']}
                  onChange={(e) => setFormData({ ...formData, 'Is Completed': e.target.checked })}
                />
                <span>Mark as completed</span>
              </label>
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

export default ChecklistManager;
