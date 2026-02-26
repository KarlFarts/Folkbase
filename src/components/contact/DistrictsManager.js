import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
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
function DistrictsManager({ contactId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, [contactId]);

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
    }
  };

  const handleDelete = async (districtId) => {
    if (!confirm('Delete this district record?')) return;

    try {
      await deleteContactDistrict(accessToken, activeSheetId, districtId);
      showNotification('District deleted', 'success');
      loadDistricts();
    } catch (error) {
      showNotification('Failed to delete district', 'error');
      console.error('Error deleting district:', error);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading districts...</p>;
  }

  return (
    <div>
      <div className="dis-header">
        <h3>Electoral Districts</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add District
        </button>
      </div>

      {districts.length === 0 ? (
        <p className="text-muted">No districts yet. Click "Add District" to get started.</p>
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
                  <div className="dis-actions">
                    <button
                      onClick={() => openEditModal(district)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(district['District ID'])}
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
          title={editingId ? 'Edit District' : 'Add District'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
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
      )}
    </div>
  );
}

export default DistrictsManager;
