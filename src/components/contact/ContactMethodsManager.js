import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Phone, Mail, MapPin } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import EmptyState from '../EmptyState';
import ConfirmDialog from '../ConfirmDialog';
import {
  getContactMethods,
  addContactMethod,
  updateContactMethod,
  deleteContactMethod,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { sanitizeFormData, SCHEMAS, validateEmail } from '../../utils/inputSanitizer';

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
function ContactMethodsManager({ contactId, readOnly = false }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    Type: 'Phone',
    Label: '',
    Value: '',
    'Is Primary': false,
    Notes: '',
  });

  useEffect(() => {
    loadMethods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, accessToken, activeSheetId]);

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

    if (formData.Type === 'Email') {
      const emailErr = validateEmail(formData.Value);
      if (emailErr) {
        showNotification(emailErr, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const saveData = sanitizeFormData({
        'Contact ID': contactId,
        Type: formData.Type,
        Label: formData.Label,
        Value: formData.Value,
        Notes: formData.Notes,
      }, SCHEMAS.contactMethod);
      saveData['Is Primary'] = formData['Is Primary'] ? 'TRUE' : 'FALSE';

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
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await deleteContactMethod(accessToken, activeSheetId, confirmDeleteId);
      showNotification('Contact method deleted', 'success');
      loadMethods();
    } catch (error) {
      showNotification('Failed to delete contact method', 'error');
      console.error('Error deleting contact method:', error);
    } finally {
      setSaving(false);
      setConfirmDeleteId(null);
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
    return <div className="loading-container"><div className="loading-spinner loading-spinner-sm"></div></div>;
  }

  // Group by type for display
  const grouped = METHOD_TYPES.reduce((acc, type) => {
    const items = methods.filter((m) => m.Type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  return (
    <div>
      <div className="cmm-header">
        <h3>Contact Methods</h3>
        {!readOnly && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Method
          </button>
        )}
      </div>

      {methods.length === 0 ? (
        <EmptyState compact icon={Phone} title="No contact methods yet" />
      ) : (
        <div className="cmm-grouped-list">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type];
            return (
              <div key={type}>
                <div className="cmm-type-label">
                  {Icon && <Icon size={14} />}
                  {type}
                </div>
                <div className="cmm-items-list">
                  {items.map((method) => {
                    const href = getValueHref(method);
                    return (
                      <div
                        key={method['Contact Method ID']}
                        className="card cmm-method-card"
                      >
                        <div className="cmm-method-row">
                          <div>
                            {href ? (
                              <a href={href} className="cmm-value-link">
                                {method.Value}
                              </a>
                            ) : (
                              <span className="cmm-value-text">{method.Value}</span>
                            )}
                            {method.Label && (
                              <span className="text-muted cmm-label-text">
                                {method.Label}
                              </span>
                            )}
                            {(method['Is Primary'] === 'TRUE' || method['Is Primary'] === true) && (
                              <span className="badge badge-success cmm-primary-badge">
                                Primary
                              </span>
                            )}
                          </div>
                          {!readOnly && (
                            <div className="cmm-actions">
                              <button
                                onClick={() => openEditModal(method)}
                                className="btn btn-ghost btn-sm"
                                title="Edit"
                                disabled={saving}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(method['Contact Method ID'])}
                                className="btn btn-ghost btn-sm"
                                title="Delete"
                                disabled={saving}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        {method.Notes && (
                          <p className="text-muted cmm-notes-text">
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

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete Contact Method"
        message="Delete this contact method? This cannot be undone."
        confirmLabel="Delete"
      />

      <WindowTemplate
        isOpen={isModalOpen}
        title={editingId ? 'Edit Contact Method' : 'Add Contact Method'}
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
          <div className="cmm-form">
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
                Value <span className="cmm-required">*</span>
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
              <label className="cmm-checkbox-label">
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
    </div>
  );
}

export default ContactMethodsManager;
