import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Briefcase } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import {
  getContactEmployment,
  addContactEmployment,
  updateContactEmployment,
  deleteContactEmployment,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { sanitizeFormData, SCHEMAS, validateDateRange } from '../../utils/inputSanitizer';

/**
 * EmploymentManager - Manage contact's employment history (junction table)
 */
function EmploymentManager({ contactId, readOnly = false }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [employment, setEmployment] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Organization ID': '',
    Organization: '',
    Role: '',
    Department: '',
    'Start Date': '',
    'End Date': '',
    'Is Current': false,
  });

  useEffect(() => {
    loadEmployment();
    loadOrganizations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, accessToken, activeSheetId]);

  const loadEmployment = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactEmployment(accessToken, activeSheetId, contactId);
      setEmployment(data);
    } catch (error) {
      showNotification('Failed to load employment records', 'error');
      console.error('Error loading employment:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    if (!accessToken || !activeSheetId) return;

    try {
      const data = await readSheetData(accessToken, activeSheetId, SHEET_NAMES.ORGANIZATIONS);
      setOrganizations(data);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      'Organization ID': '',
      Organization: '',
      Role: '',
      Department: '',
      'Start Date': '',
      'End Date': '',
      'Is Current': false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingId(emp['Employment ID']);
    setFormData({
      'Organization ID': emp['Organization ID'] || '',
      Organization: emp.Organization || '',
      Role: emp.Role || '',
      Department: emp.Department || '',
      'Start Date': emp['Start Date'] || '',
      'End Date': emp['End Date'] || '',
      'Is Current': emp['Is Current'] === 'TRUE' || emp['Is Current'] === true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.Organization && !formData['Organization ID']) {
      showNotification('Organization is required', 'error');
      return;
    }

    if (!formData['Is Current']) {
      const dateErr = validateDateRange(formData['Start Date'], formData['End Date']);
      if (dateErr) {
        showNotification(dateErr, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const saveData = sanitizeFormData({
        'Contact ID': contactId,
        'Organization ID': formData['Organization ID'],
        Organization: formData.Organization,
        Role: formData.Role,
        Department: formData.Department,
        'Start Date': formData['Start Date'],
        'End Date': formData['End Date'],
      }, SCHEMAS.employment);
      saveData['Is Current'] = formData['Is Current'] ? 'TRUE' : 'FALSE';

      if (editingId) {
        await updateContactEmployment(accessToken, activeSheetId, editingId, saveData);
        showNotification('Employment record updated', 'success');
      } else {
        await addContactEmployment(accessToken, activeSheetId, saveData);
        showNotification('Employment record added', 'success');
      }

      setIsModalOpen(false);
      loadEmployment();
    } catch (error) {
      showNotification('Failed to save employment record', 'error');
      console.error('Error saving employment:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (employmentId) => {
    setConfirmDeleteId(employmentId);
  };

  const handleConfirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setSaving(true);
    try {
      await deleteContactEmployment(accessToken, activeSheetId, id);
      showNotification('Employment record deleted', 'success');
      loadEmployment();
    } catch (error) {
      showNotification('Failed to delete employment record', 'error');
      console.error('Error deleting employment:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOrgSelect = (e) => {
    const orgId = e.target.value;
    const org = organizations.find((o) => o['Organization ID'] === orgId);
    setFormData({
      ...formData,
      'Organization ID': orgId,
      Organization: org ? org.Name : '',
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner loading-spinner-sm"></div></div>;
  }

  return (
    <div>
      <div className="emp-header">
        <h3>Employment History</h3>
        {!readOnly && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Employment
          </button>
        )}
      </div>

      {employment.length === 0 ? (
        <EmptyState compact icon={Briefcase} title="No employment records yet" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Role</th>
              <th>Department</th>
              <th>Period</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employment.map((emp) => {
              const period = [
                emp['Start Date'],
                emp['Is Current'] === 'TRUE' || emp['Is Current'] === true
                  ? 'Present'
                  : emp['End Date'],
              ]
                .filter(Boolean)
                .join(' - ');

              return (
                <tr key={emp['Employment ID']}>
                  <td>{emp.Organization || <span className="text-muted">—</span>}</td>
                  <td>{emp.Role || <span className="text-muted">—</span>}</td>
                  <td>{emp.Department || <span className="text-muted">—</span>}</td>
                  <td>{period || <span className="text-muted">—</span>}</td>
                  <td>
                    {!readOnly && (
                      <div className="emp-actions">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="btn btn-ghost btn-sm"
                          title="Edit"
                          disabled={saving}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp['Employment ID'])}
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
        title={editingId ? 'Edit Employment' : 'Add Employment'}
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
          <div className="emp-form">
            <div>
              <label className="form-label">Organization (from database)</label>
              <select
                className="form-select"
                value={formData['Organization ID']}
                onChange={handleOrgSelect}
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org['Organization ID']} value={org['Organization ID']}>
                    {org.Name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Organization (manual entry) <span className="emp-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.Organization}
                onChange={(e) => setFormData({ ...formData, Organization: e.target.value })}
                placeholder="Organization name"
              />
              <small className="text-muted">
                Use the dropdown above to link to an existing organization, or enter manually here
              </small>
            </div>

            <div>
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                value={formData.Role}
                onChange={(e) => setFormData({ ...formData, Role: e.target.value })}
                placeholder="Job title"
              />
            </div>

            <div>
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                value={formData.Department}
                onChange={(e) => setFormData({ ...formData, Department: e.target.value })}
                placeholder="Department or division"
              />
            </div>

            <div className="emp-two-col">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData['Start Date']}
                  onChange={(e) => setFormData({ ...formData, 'Start Date': e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData['End Date']}
                  onChange={(e) => setFormData({ ...formData, 'End Date': e.target.value })}
                  disabled={formData['Is Current']}
                />
              </div>
            </div>

            <div>
              <label className="emp-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData['Is Current']}
                  onChange={(e) => setFormData({ ...formData, 'Is Current': e.target.checked })}
                />
                <span>Current position</span>
              </label>
            </div>
          </div>
      </WindowTemplate>
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete Employment Record"
        message="Are you sure you want to delete this employment record?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default EmploymentManager;
