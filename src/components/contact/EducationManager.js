import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, GraduationCap } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import EmptyState from '../EmptyState';
import {
  getContactEducation,
  addContactEducation,
  updateContactEducation,
  deleteContactEducation,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

/**
 * EducationManager - Manage contact's educational background (junction table)
 */
function EducationManager({ contactId, readOnly = false }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Institution: '',
    Degree: '',
    'Field of Study': '',
    'Start Year': '',
    'End Year': '',
    'Is Current': false,
  });

  useEffect(() => {
    loadEducation();
  }, [contactId, accessToken, activeSheetId]);

  const loadEducation = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactEducation(accessToken, activeSheetId, contactId);
      setEducation(data);
    } catch (error) {
      showNotification('Failed to load education records', 'error');
      console.error('Error loading education:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      Institution: '',
      Degree: '',
      'Field of Study': '',
      'Start Year': '',
      'End Year': '',
      'Is Current': false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (edu) => {
    setEditingId(edu['Education ID']);
    setFormData({
      Institution: edu.Institution || '',
      Degree: edu.Degree || '',
      'Field of Study': edu['Field of Study'] || '',
      'Start Year': edu['Start Year'] || '',
      'End Year': edu['End Year'] || '',
      'Is Current': edu['Is Current'] === 'TRUE' || edu['Is Current'] === true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.Institution) {
      showNotification('Institution is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        'Contact ID': contactId,
        Institution: formData.Institution,
        Degree: formData.Degree,
        'Field of Study': formData['Field of Study'],
        'Start Year': formData['Start Year'],
        'End Year': formData['End Year'],
        'Is Current': formData['Is Current'] ? 'TRUE' : 'FALSE',
      };

      if (editingId) {
        await updateContactEducation(accessToken, activeSheetId, editingId, saveData);
        showNotification('Education record updated', 'success');
      } else {
        await addContactEducation(accessToken, activeSheetId, saveData);
        showNotification('Education record added', 'success');
      }

      setIsModalOpen(false);
      loadEducation();
    } catch (error) {
      showNotification('Failed to save education record', 'error');
      console.error('Error saving education:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (educationId) => {
    if (!confirm('Delete this education record?')) return;

    setSaving(true);
    try {
      await deleteContactEducation(accessToken, activeSheetId, educationId);
      showNotification('Education record deleted', 'success');
      loadEducation();
    } catch (error) {
      showNotification('Failed to delete education record', 'error');
      console.error('Error deleting education:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner loading-spinner-sm"></div></div>;
  }

  return (
    <div>
      <div className="edu-header">
        <h3>Education</h3>
        {!readOnly && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Education
          </button>
        )}
      </div>

      {education.length === 0 ? (
        <EmptyState compact icon={GraduationCap} title="No education records yet" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Institution</th>
              <th>Degree</th>
              <th>Field of Study</th>
              <th>Years</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {education.map((edu) => {
              const years = [
                edu['Start Year'],
                edu['Is Current'] === 'TRUE' || edu['Is Current'] === true
                  ? 'Present'
                  : edu['End Year'],
              ]
                .filter(Boolean)
                .join(' - ');

              return (
                <tr key={edu['Education ID']}>
                  <td>{edu.Institution}</td>
                  <td>{edu.Degree || <span className="text-muted">—</span>}</td>
                  <td>{edu['Field of Study'] || <span className="text-muted">—</span>}</td>
                  <td>{years || <span className="text-muted">—</span>}</td>
                  <td>
                    {!readOnly && (
                      <div className="edu-actions">
                        <button
                          onClick={() => openEditModal(edu)}
                          className="btn btn-ghost btn-sm"
                          title="Edit"
                          disabled={saving}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(edu['Education ID'])}
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
              );
            })}
          </tbody>
        </table>
      )}

      <WindowTemplate
        isOpen={isModalOpen}
        title={editingId ? 'Edit Education' : 'Add Education'}
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
          <div className="edu-form">
            <div>
              <label className="form-label">
                Institution <span className="edu-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.Institution}
                onChange={(e) => setFormData({ ...formData, Institution: e.target.value })}
                placeholder="University or school name"
              />
            </div>

            <div>
              <label className="form-label">Degree</label>
              <input
                type="text"
                className="form-input"
                value={formData.Degree}
                onChange={(e) => setFormData({ ...formData, Degree: e.target.value })}
                placeholder="Bachelor of Arts, Master of Science, etc."
              />
            </div>

            <div>
              <label className="form-label">Field of Study</label>
              <input
                type="text"
                className="form-input"
                value={formData['Field of Study']}
                onChange={(e) => setFormData({ ...formData, 'Field of Study': e.target.value })}
                placeholder="Major or concentration"
              />
            </div>

            <div className="edu-two-col">
              <div>
                <label className="form-label">Start Year</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData['Start Year']}
                  onChange={(e) => setFormData({ ...formData, 'Start Year': e.target.value })}
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="form-label">End Year</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData['End Year']}
                  onChange={(e) => setFormData({ ...formData, 'End Year': e.target.value })}
                  placeholder="2024"
                  disabled={formData['Is Current']}
                />
              </div>
            </div>

            <div>
              <label className="edu-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData['Is Current']}
                  onChange={(e) => setFormData({ ...formData, 'Is Current': e.target.checked })}
                />
                <span>Currently enrolled</span>
              </label>
            </div>
          </div>
      </WindowTemplate>
    </div>
  );
}

export default EducationManager;
