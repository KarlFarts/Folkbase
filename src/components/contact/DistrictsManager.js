import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, MapPin } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import {
  getContactDistricts,
  addContactDistrict,
  updateContactDistrict,
  deleteContactDistrict,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const DISTRICT_TYPES = [
  'Congressional',
  'State Senate',
  'State House',
  'County',
  'City Council',
  'School Board',
  'Other',
];

/**
 * DistrictsManager - Manage contact's electoral districts (junction table)
 */
function DistrictsManager({ contactId, readOnly = false }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'District Type': '',
    'District Name': '',
    Representative: '',
    Notes: '',
  });

  useEffect(() => {
    loadDistricts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, accessToken, activeSheetId]);

  const loadDistricts = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactDistricts(accessToken, activeSheetId, contactId);
      setDistricts(data);
    } catch (error) {
      showNotification('Failed to load districts', 'error');
      console.error('Error loading districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      'District Type': '',
      'District Name': '',
      Representative: '',
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (district) => {
    setEditingId(district['District ID']);
    setFormData({
      'District Type': district['District Type'] || '',
      'District Name': district['District Name'] || '',
      Representative: district.Representative || '',
      Notes: district.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData['District Type']) {
      showNotification('District Type is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        'Contact ID': contactId,
        'District Type': formData['District Type'],
        'District Name': formData['District Name'],
        Representative: formData.Representative,
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateContactDistrict(accessToken, activeSheetId, editingId, saveData);
        showNotification('District updated', 'success');
      } else {
        await addContactDistrict(accessToken, activeSheetId, saveData);
        showNotification('District added', 'success');
      }

      setIsModalOpen(false);
      loadDistricts();
    } catch (error) {
      showNotification('Failed to save district', 'error');
      console.error('Error saving district:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (districtId) => {
    setConfirmDeleteId(districtId);
  };

  const handleConfirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setSaving(true);
    try {
      await deleteContactDistrict(accessToken, activeSheetId, id);
      showNotification('District deleted', 'success');
      loadDistricts();
    } catch (error) {
      showNotification('Failed to delete district', 'error');
      console.error('Error deleting district:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner loading-spinner-sm"></div></div>;
  }

  return (
    <div>
      <div className="dis-header">
        <h3>Electoral Districts</h3>
        {!readOnly && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add District
          </button>
        )}
      </div>

      {districts.length === 0 ? (
        <EmptyState compact icon={MapPin} title="No districts yet" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>District</th>
              <th>Representative</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((district) => (
              <tr key={district['District ID']}>
                <td>{district['District Type']}</td>
                <td>{district['District Name'] || <span className="text-muted">—</span>}</td>
                <td>{district.Representative || <span className="text-muted">—</span>}</td>
                <td>
                  {!readOnly && (
                    <div className="dis-actions">
                      <button
                        onClick={() => openEditModal(district)}
                        className="btn btn-ghost btn-sm"
                        title="Edit"
                        disabled={saving}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(district['District ID'])}
                        className="btn btn-ghost btn-sm"
                        title="Delete"
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <WindowTemplate
        isOpen={isModalOpen}
        title={editingId ? 'Edit District' : 'Add District'}
        onClose={() => { if (!saving) setIsModalOpen(false); }}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
          <div className="dis-form">
            <div>
              <label className="form-label">
                District Type <span className="dis-required">*</span>
              </label>
              <select
                className="form-select"
                value={formData['District Type']}
                onChange={(e) => setFormData({ ...formData, 'District Type': e.target.value })}
              >
                <option value="">Select type...</option>
                {DISTRICT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">District Name/Number</label>
              <input
                type="text"
                className="form-input"
                value={formData['District Name']}
                onChange={(e) => setFormData({ ...formData, 'District Name': e.target.value })}
                placeholder="e.g., 12th District, Ward 3"
              />
            </div>

            <div>
              <label className="form-label">Representative</label>
              <input
                type="text"
                className="form-input"
                value={formData.Representative}
                onChange={(e) => setFormData({ ...formData, Representative: e.target.value })}
                placeholder="Current elected representative"
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
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete District"
        message="Are you sure you want to delete this district?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default DistrictsManager;
