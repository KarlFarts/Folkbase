import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getContactAttributes,
  addContactAttribute,
  updateContactAttribute,
  deleteContactAttribute,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const ATTRIBUTE_CATEGORIES = [
  'Skill',
  'Interest',
  'Language',
  'Certification',
  'Award',
  'Affiliation',
  'Volunteer Role',
  'Other',
];

/**
 * ContactAttributesManager - Manage contact's multi-value attributes (skills, interests, etc.)
 * Grouped pill display by Category. Junction table manager following the SocialsManager pattern.
 */
function ContactAttributesManager({ contactId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Category: 'Skill',
    Value: '',
    Notes: '',
    'Date Added': '',
  });

  useEffect(() => {
    loadAttributes();
  }, [contactId, accessToken, activeSheetId]);

  const loadAttributes = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactAttributes(accessToken, activeSheetId, contactId);
      setAttributes(data);
    } catch (error) {
      showNotification('Failed to load attributes', 'error');
      console.error('Error loading attributes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      Category: 'Skill',
      Value: '',
      Notes: '',
      'Date Added': new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (attr) => {
    setEditingId(attr['Attribute ID']);
    setFormData({
      Category: attr.Category || 'Skill',
      Value: attr.Value || '',
      Notes: attr.Notes || '',
      'Date Added': attr['Date Added'] || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.Value) {
      showNotification('Value is required', 'error');
      return;
    }

    try {
      const saveData = {
        'Contact ID': contactId,
        Category: formData.Category,
        Value: formData.Value,
        Notes: formData.Notes,
        'Date Added': formData['Date Added'],
      };

      if (editingId) {
        await updateContactAttribute(accessToken, activeSheetId, editingId, saveData);
        showNotification('Attribute updated', 'success');
      } else {
        await addContactAttribute(accessToken, activeSheetId, saveData);
        showNotification('Attribute added', 'success');
      }

      setIsModalOpen(false);
      loadAttributes();
    } catch (error) {
      showNotification('Failed to save attribute', 'error');
      console.error('Error saving attribute:', error);
    }
  };

  const handleDelete = async (attrId) => {
    if (!confirm('Delete this attribute?')) return;

    try {
      await deleteContactAttribute(accessToken, activeSheetId, attrId);
      showNotification('Attribute deleted', 'success');
      loadAttributes();
    } catch (error) {
      showNotification('Failed to delete attribute', 'error');
      console.error('Error deleting attribute:', error);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading attributes...</p>;
  }

  // Group by category for pill display
  const grouped = {};
  attributes.forEach((attr) => {
    const cat = attr.Category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(attr);
  });

  return (
    <div>
      <div className="cam-header">
        <h3>Attributes</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Attribute
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="text-muted">No attributes yet. Click "Add Attribute" to get started.</p>
      ) : (
        <div className="cam-grouped-list">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="cam-category-label">
                {category}
              </div>
              <div className="cam-pills-row">
                {items.map((attr) => (
                  <div
                    key={attr['Attribute ID']}
                    className="tag-removable cam-pill-item"
                    title={attr.Notes || undefined}
                  >
                    {attr.Value}
                    <div className="cam-pill-actions">
                      <button
                        onClick={() => openEditModal(attr)}
                        className="tag-remove-btn cam-edit-btn"
                        title="Edit"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => handleDelete(attr['Attribute ID'])}
                        className="tag-remove-btn"
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Attribute' : 'Add Attribute'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div className="cam-form">
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.Category}
                onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
              >
                {ATTRIBUTE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Value <span className="cam-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.Value}
                onChange={(e) => setFormData({ ...formData, Value: e.target.value })}
                placeholder="e.g. Python, Spanish, CPR Certified"
              />
            </div>

            <div>
              <label className="form-label">Date Added</label>
              <input
                type="date"
                className="form-input"
                value={formData['Date Added']}
                onChange={(e) => setFormData({ ...formData, 'Date Added': e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={formData.Notes}
                onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                rows={2}
                placeholder="Additional context..."
              />
            </div>
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default ContactAttributesManager;
