import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Phone, Mail, MapPin } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import {
  getContactMethods,
  addContactMethod,
  updateContactMethod,
  deleteContactMethod,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';

const METHOD_TYPES = ['Phone', 'Email', 'Address', 'Fax', 'Other'];

const TYPE_ICONS = {
  Phone: Phone,
  Email: Mail,
  Address: MapPin,
};

/**
 * ContactMethodsManager - Manage contact's phone numbers, emails, addresses, etc.
 * Junction table manager following the SocialsManager pattern.
 */
function ContactMethodsManager({ contactId }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Type: 'Phone',
    Label: '',
    Value: '',
    'Is Primary': false,
    Notes: '',
  });

  useEffect(() => {
    loadMethods();
  }, [contactId]);

  const loadMethods = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactMethods(accessToken, activeSheetId, contactId);
      setMethods(data);
    } catch (error) {
      showNotification('Failed to load contact methods', 'error');
      console.error('Error loading contact methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      Type: 'Phone',
      Label: '',
      Value: '',
      'Is Primary': false,
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (method) => {
    setEditingId(method['Contact Method ID']);
    setFormData({
      Type: method.Type || 'Phone',
      Label: method.Label || '',
      Value: method.Value || '',
      'Is Primary': method['Is Primary'] === 'TRUE' || method['Is Primary'] === true,
      Notes: method.Notes || '',
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
        Type: formData.Type,
        Label: formData.Label,
        Value: formData.Value,
        'Is Primary': formData['Is Primary'] ? 'TRUE' : 'FALSE',
        Notes: formData.Notes,
      };

      if (editingId) {
        await updateContactMethod(accessToken, activeSheetId, editingId, saveData);
        showNotification('Contact method updated', 'success');
      } else {
        await addContactMethod(accessToken, activeSheetId, saveData);
        showNotification('Contact method added', 'success');
      }

      setIsModalOpen(false);
      loadMethods();
    } catch (error) {
      showNotification('Failed to save contact method', 'error');
      console.error('Error saving contact method:', error);
    }
  };

  const handleDelete = async (methodId) => {
    if (!confirm('Delete this contact method?')) return;

    try {
      await deleteContactMethod(accessToken, activeSheetId, methodId);
      showNotification('Contact method deleted', 'success');
      loadMethods();
    } catch (error) {
      showNotification('Failed to delete contact method', 'error');
      console.error('Error deleting contact method:', error);
    }
  };

  const getLabelPlaceholder = (type) => {
    const placeholders = {
      Phone: 'e.g. Mobile, Home, Work',
      Email: 'e.g. Personal, Work',
      Address: 'e.g. Home, Mailing, Work',
      Fax: 'e.g. Office',
      Other: 'Label',
    };
    return placeholders[type] || 'Label';
  };

  const getValuePlaceholder = (type) => {
    const placeholders = {
      Phone: '+1 (555) 000-0000',
      Email: 'email@example.com',
      Address: '123 Main St, City, State 00000',
      Fax: '+1 (555) 000-0000',
      Other: 'Value',
    };
    return placeholders[type] || 'Value';
  };

  const getValueHref = (method) => {
    switch (method.Type) {
      case 'Phone':
      case 'Fax':
        return `tel:${method.Value}`;
      case 'Email':
        return `mailto:${method.Value}`;
      default:
        return null;
    }
  };

  if (loading) {
    return <p className="text-muted">Loading contact methods...</p>;
  }

  // Group by type for display
  const grouped = METHOD_TYPES.reduce((acc, type) => {
    const items = methods.filter((m) => m.Type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

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
        <h3>Contact Methods</h3>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Add Method
        </button>
      </div>

      {methods.length === 0 ? (
        <p className="text-muted">No contact methods yet. Click "Add Method" to get started.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type];
            return (
              <div key={type}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {Icon && <Icon size={14} />}
                  {type}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  {items.map((method) => {
                    const href = getValueHref(method);
                    return (
                      <div
                        key={method['Contact Method ID']}
                        className="card"
                        style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            {href ? (
                              <a
                                href={href}
                                style={{ color: 'var(--color-primary)', fontWeight: '500' }}
                              >
                                {method.Value}
                              </a>
                            ) : (
                              <span style={{ fontWeight: '500' }}>{method.Value}</span>
                            )}
                            {method.Label && (
                              <span
                                className="text-muted"
                                style={{ marginLeft: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}
                              >
                                {method.Label}
                              </span>
                            )}
                            {(method['Is Primary'] === 'TRUE' || method['Is Primary'] === true) && (
                              <span
                                className="badge badge-success"
                                style={{ marginLeft: 'var(--spacing-sm)' }}
                              >
                                Primary
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <button
                              onClick={() => openEditModal(method)}
                              className="btn btn-ghost btn-sm"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(method['Contact Method ID'])}
                              className="btn btn-ghost btn-sm"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {method.Notes && (
                          <p
                            className="text-muted"
                            style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}
                          >
                            {method.Notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <WindowTemplate
          title={editingId ? 'Edit Contact Method' : 'Add Contact Method'}
          onClose={() => setIsModalOpen(false)}
          actions={[
            { label: 'Cancel', onClick: () => setIsModalOpen(false) },
            { label: 'Save', onClick: handleSave, variant: 'primary' },
          ]}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={formData.Type}
                onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
              >
                {METHOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Value <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.Value}
                onChange={(e) => setFormData({ ...formData, Value: e.target.value })}
                placeholder={getValuePlaceholder(formData.Type)}
              />
            </div>

            <div>
              <label className="form-label">Label</label>
              <input
                type="text"
                className="form-input"
                value={formData.Label}
                onChange={(e) => setFormData({ ...formData, Label: e.target.value })}
                placeholder={getLabelPlaceholder(formData.Type)}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData['Is Primary']}
                  onChange={(e) => setFormData({ ...formData, 'Is Primary': e.target.checked })}
                />
                <span>Primary method for this type</span>
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

export default ContactMethodsManager;
