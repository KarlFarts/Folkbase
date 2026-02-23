import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Star } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getOrgContacts,
  addOrgContact,
  updateOrgContact,
  deleteOrgContact,
  readSheetData,
} from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

/**
 * OrgContactsManager - Manage organization's key contacts (junction table)
 */
function OrgContactsManager({ organizationId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [orgContacts, setOrgContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    'Contact ID': '',
    'Contact Name': '',
    'Role/Title': '',
    Department: '',
    'Start Date': '',
    'End Date': '',
    'Is Current': true,
    'Is Primary Contact': false,
    Notes: '',
  });

  useEffect(() => {
    loadOrgContacts();
    loadContacts();
  }, [organizationId]);

  const loadOrgContacts = async () => {
    if (!accessToken || !activeSheetId || !organizationId) return;

    try {
      setLoading(true);
      const data = await getOrgContacts(accessToken, activeSheetId, organizationId);
      setOrgContacts(data);
    } catch (error) {
      showNotification('Failed to load organization contacts', 'error');
      console.error('Error loading org contacts:', error);
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
      'Role/Title': '',
      Department: '',
      'Start Date': '',
      'End Date': '',
      'Is Current': true,
      'Is Primary Contact': false,
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (orgContact) => {
    setEditingId(orgContact['Org Contact ID']);
    setFormData({
      'Contact ID': orgContact['Contact ID'] || '',
      'Contact Name': orgContact['Contact Name'] || '',
      'Role/Title': orgContact['Role/Title'] || '',
      Department: orgContact.Department || '',
      'Start Date': orgContact['Start Date'] || '',
      'End Date': orgContact['End Date'] || '',
      'Is Current': orgContact['Is Current'] === 'TRUE' || orgContact['Is Current'] === true,
      'Is Primary Contact':
        orgContact['Is Primary Contact'] === 'TRUE' || orgContact['Is Primary Contact'] === true,
      Notes: orgContact.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData['Contact Name'] && !formData['Contact ID']) {
      showNotification('Contact is required', 'error');
      return;
    }

    try {
      const saveData = {
        'Organization ID': organizationId,
        'Contact ID': formData['Contact ID'],
        'Contact Name': formData['Contact Name'],
        'Role/Title': formData['Role/Title'],
        Department: formData.Department,
        'Start Date': formData['Start Date'],
        'End Date': formData['End Date'],
        'Is Current': formData['Is Current'] ? 'TRUE' : 'FALSE',
        'Is Primary Contact': formData['Is Primary Contact'] ? 'TRUE' : 'FALSE',
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateOrgContact(accessToken, activeSheetId, editingId, saveData);
        showNotification('Contact updated', 'success');
      } else {
        await addOrgContact(accessToken, activeSheetId, saveData);
        showNotification('Contact added', 'success');
      }

      setIsModalOpen(false);
      loadOrgContacts();
    } catch (error) {
      showNotification('Failed to save contact', 'error');
      console.error('Error saving org contact:', error);
    }
  };

  const handleDelete = async (orgContactId) => {
    if (!confirm('Remove this contact from the organization?')) return;

    try {
      await deleteOrgContact(accessToken, activeSheetId, orgContactId);
      showNotification('Contact removed', 'success');
      loadOrgContacts();
    } catch (error) {
      showNotification('Failed to remove contact', 'error');
      console.error('Error deleting org contact:', error);
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
    return <p className="text-muted">Loading organization contacts...</p>;
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
        <h3>Key Contacts</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {orgContacts.length === 0 ? (
        <p className="text-muted">No contacts yet. Click "Add Contact" to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role/Title</th>
              <th>Department</th>
              <th>Period</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgContacts.map((orgContact) => {
              const period = [
                orgContact['Start Date'],
                orgContact['Is Current'] === 'TRUE' || orgContact['Is Current'] === true
                  ? 'Present'
                  : orgContact['End Date'],
              ]
                .filter(Boolean)
                .join(' - ');

              return (
                <tr key={orgContact['Org Contact ID']}>
                  <td>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                      {(orgContact['Is Primary Contact'] === 'TRUE' ||
                        orgContact['Is Primary Contact'] === true) && (
                        <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />
                      )}
                      {orgContact['Contact Name']}
                    </div>
                  </td>
                  <td>{orgContact['Role/Title'] || <span className="text-muted">—</span>}</td>
                  <td>{orgContact.Department || <span className="text-muted">—</span>}</td>
                  <td>{period || <span className="text-muted">—</span>}</td>
                  <td>
                    {orgContact['Is Current'] === 'TRUE' || orgContact['Is Current'] === true ? (
                      <span className="badge badge-status-active">Current</span>
                    ) : (
                      <span className="badge badge-status-inactive">Past</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button
                        onClick={() => openEditModal(orgContact)}
                        className="btn btn-ghost btn-sm"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(orgContact['Org Contact ID'])}
                        className="btn btn-ghost btn-sm"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Contact' : 'Add Contact'}
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
              <label className="form-label">Role/Title</label>
              <input
                type="text"
                className="form-input"
                value={formData['Role/Title']}
                onChange={(e) => setFormData({ ...formData, 'Role/Title': e.target.value })}
                placeholder="Executive Director, Board Member, etc."
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-md)',
              }}
            >
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <input
                  type="checkbox"
                  checked={formData['Is Current']}
                  onChange={(e) => setFormData({ ...formData, 'Is Current': e.target.checked })}
                />
                <span>Currently in this role</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <input
                  type="checkbox"
                  checked={formData['Is Primary Contact']}
                  onChange={(e) =>
                    setFormData({ ...formData, 'Is Primary Contact': e.target.checked })
                  }
                />
                <span>Primary contact for this organization</span>
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

export default OrgContactsManager;
