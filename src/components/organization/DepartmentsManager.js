import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getOrgDepartments,
  addOrgDepartment,
  updateOrgDepartment,
  deleteOrgDepartment,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const DEPARTMENT_TYPES = [
  'Sales',
  'Marketing',
  'Human Resources',
  'Operations',
  'Finance',
  'IT',
  'Legal',
  'Executive',
  'Research & Development',
  'Customer Service',
  'Other',
];

/**
 * DepartmentsManager - Manage organization's departments/divisions (junction table)
 */
function DepartmentsManager({ organizationId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [departments, setDepartments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Department Name': '',
    'Department Type': '',
    Phone: '',
    Email: '',
    'Head Contact ID': '',
    'Head Contact Name': '',
    Size: '',
    Notes: '',
  });

  useEffect(() => {
    loadDepartments();
    loadContacts();
  }, [organizationId]);

  const loadDepartments = async () => {
    if (!accessToken || !activeSheetId || !organizationId) return;

    try {
      setLoading(true);
      const data = await getOrgDepartments(accessToken, activeSheetId, organizationId);
      setDepartments(data);
    } catch (error) {
      showNotification('Failed to load departments', 'error');
      console.error('Error loading departments:', error);
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
      'Department Name': '',
      'Department Type': '',
      Phone: '',
      Email: '',
      'Head Contact ID': '',
      'Head Contact Name': '',
      Size: '',
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (department) => {
    setEditingId(department['Department ID']);
    setFormData({
      'Department Name': department['Department Name'] || '',
      'Department Type': department['Department Type'] || '',
      Phone: department.Phone || '',
      Email: department.Email || '',
      'Head Contact ID': department['Head Contact ID'] || '',
      'Head Contact Name': department['Head Contact Name'] || '',
      Size: department.Size || '',
      Notes: department.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData['Department Name']) {
      showNotification('Department Name is required', 'error');
      return;
    }

    try {
      const saveData = {
        'Organization ID': organizationId,
        'Department Name': formData['Department Name'],
        'Department Type': formData['Department Type'],
        Phone: formData.Phone,
        Email: formData.Email,
        'Head Contact ID': formData['Head Contact ID'],
        'Head Contact Name': formData['Head Contact Name'],
        Size: formData.Size,
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateOrgDepartment(accessToken, activeSheetId, editingId, saveData);
        showNotification('Department updated', 'success');
      } else {
        await addOrgDepartment(accessToken, activeSheetId, saveData);
        showNotification('Department added', 'success');
      }

      setIsModalOpen(false);
      loadDepartments();
    } catch (error) {
      showNotification('Failed to save department', 'error');
      console.error('Error saving department:', error);
    }
  };

  const handleDelete = async (departmentId) => {
    if (!confirm('Delete this department?')) return;

    try {
      await deleteOrgDepartment(accessToken, activeSheetId, departmentId);
      showNotification('Department deleted', 'success');
      loadDepartments();
    } catch (error) {
      showNotification('Failed to delete department', 'error');
      console.error('Error deleting department:', error);
    }
  };

  const handleHeadContactSelect = (e) => {
    const contactId = e.target.value;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    setFormData({
      ...formData,
      'Head Contact ID': contactId,
      'Head Contact Name': contact ? contact['Display Name'] || contact.Name || '' : '',
    });
  };

  if (loading) {
    return <p className="text-muted">Loading departments...</p>;
  }

  return (
    <div>
      <div className="dm-header">
        <h3>Departments</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <p className="text-muted">No departments yet. Click "Add Department" to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Head</th>
              <th>Size</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department['Department ID']}>
                <td>{department['Department Name']}</td>
                <td>{department['Department Type'] || <span className="text-muted">—</span>}</td>
                <td>{department['Head Contact Name'] || <span className="text-muted">—</span>}</td>
                <td>{department.Size || <span className="text-muted">—</span>}</td>
                <td>
                  {department.Phone || department.Email ? (
                    <div className="dm-contact-info">
                      {department.Phone && <div>{department.Phone}</div>}
                      {department.Email && <div>{department.Email}</div>}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="dm-action-btns">
                    <button
                      onClick={() => openEditModal(department)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(department['Department ID'])}
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
          title={editingId ? 'Edit Department' : 'Add Department'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div className="dm-form-stack">
            <div>
              <label className="form-label">
                Department Name <span className="form-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData['Department Name']}
                onChange={(e) => setFormData({ ...formData, 'Department Name': e.target.value })}
                placeholder="Sales, Marketing, HR, etc."
              />
            </div>

            <div>
              <label className="form-label">Department Type</label>
              <select
                className="form-select"
                value={formData['Department Type']}
                onChange={(e) => setFormData({ ...formData, 'Department Type': e.target.value })}
              >
                <option value="">Select type...</option>
                {DEPARTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Department Head (from database)</label>
              <select
                className="form-select"
                value={formData['Head Contact ID']}
                onChange={handleHeadContactSelect}
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
              <label className="form-label">Department Head Name</label>
              <input
                type="text"
                className="form-input"
                value={formData['Head Contact Name']}
                onChange={(e) => setFormData({ ...formData, 'Head Contact Name': e.target.value })}
                placeholder="Head contact name"
              />
              <small className="text-muted">
                Use the dropdown above to link to a contact, or enter manually here
              </small>
            </div>

            <div className="dm-two-col">
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.Phone}
                  onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                  placeholder="Department phone"
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="department@example.com"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Size (# of employees)</label>
              <input
                type="number"
                className="form-input"
                value={formData.Size}
                onChange={(e) => setFormData({ ...formData, Size: e.target.value })}
                placeholder="25"
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

export default DepartmentsManager;
