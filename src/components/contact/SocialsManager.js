import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Share2 } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import {
  getContactSocials,
  addContactSocial,
  updateContactSocial,
  deleteContactSocial,
} from '../../utils/devModeWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeUrl } from '../../utils/sanitize';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { sanitizeFormData, SCHEMAS } from '../../utils/inputSanitizer';

const PLATFORMS = ['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Other'];

/**
 * SocialsManager - Manage contact's social media profiles (junction table)
 * Establishes the pattern for all junction table managers
 */
function SocialsManager({ contactId, readOnly = false }) {
  const { accessToken } = useAuth();
  const { showNotification } = useNotification();
  const activeSheetId = useActiveSheetId();

  const [socials, setSocials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Platform: '',
    Handle: '',
    URL: '',
    'Is Primary': false,
    Notes: '',
  });

  useEffect(() => {
    loadSocials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, accessToken, activeSheetId]);

  const loadSocials = async () => {
    if (!accessToken || !activeSheetId || !contactId) return;

    try {
      setLoading(true);
      const data = await getContactSocials(accessToken, activeSheetId, contactId);
      setSocials(data);
    } catch (error) {
      showNotification('Failed to load social profiles', 'error');
      console.error('Error loading socials:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      Platform: '',
      Handle: '',
      URL: '',
      'Is Primary': false,
      Notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (social) => {
    setEditingId(social['Social ID']);
    setFormData({
      Platform: social.Platform || '',
      Handle: social.Handle || '',
      URL: social.URL || '',
      'Is Primary': social['Is Primary'] === 'TRUE' || social['Is Primary'] === true,
      Notes: social.Notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.Platform) {
      showNotification('Platform is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const saveData = sanitizeFormData({
        'Contact ID': contactId,
        Platform: formData.Platform,
        Handle: formData.Handle,
        URL: formData.URL,
        Notes: formData.Notes,
      }, SCHEMAS.social);
      saveData['Is Primary'] = formData['Is Primary'] ? 'TRUE' : 'FALSE';

      if (editingId) {
        await updateContactSocial(accessToken, activeSheetId, editingId, saveData);
        showNotification('Social profile updated', 'success');
      } else {
        await addContactSocial(accessToken, activeSheetId, saveData);
        showNotification('Social profile added', 'success');
      }

      setIsModalOpen(false);
      loadSocials();
    } catch (error) {
      showNotification('Failed to save social profile', 'error');
      console.error('Error saving social:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (socialId) => {
    setConfirmDeleteId(socialId);
  };

  const handleConfirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setSaving(true);
    try {
      await deleteContactSocial(accessToken, activeSheetId, id);
      showNotification('Social profile deleted', 'success');
      loadSocials();
    } catch (error) {
      showNotification('Failed to delete social profile', 'error');
      console.error('Error deleting social:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner loading-spinner-sm"></div></div>;
  }

  return (
    <div>
      <div className="soc-header">
        <h3>Social Media Profiles</h3>
        {!readOnly && (
          <button onClick={openAddModal} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Profile
          </button>
        )}
      </div>

      {socials.length === 0 ? (
        <EmptyState compact icon={Share2} title="No social profiles yet" />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Handle</th>
              <th>URL</th>
              <th>Primary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {socials.map((social) => (
              <tr key={social['Social ID']}>
                <td>{social.Platform}</td>
                <td>{social.Handle}</td>
                <td>
                  {social.URL && sanitizeUrl(social.URL) ? (
                    <a
                      href={sanitizeUrl(social.URL)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="soc-url-link"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {social['Is Primary'] === 'TRUE' || social['Is Primary'] === true ? '✓' : ''}
                </td>
                <td>
                  {!readOnly && (
                    <div className="soc-actions">
                      <button
                        onClick={() => openEditModal(social)}
                        className="btn btn-ghost btn-sm"
                        title="Edit"
                        disabled={saving}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(social['Social ID'])}
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
        title={editingId ? 'Edit Social Profile' : 'Add Social Profile'}
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
          <div className="soc-form">
            <div>
              <label className="form-label">
                Platform <span className="soc-required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.Platform}
                onChange={(e) => setFormData({ ...formData, Platform: e.target.value })}
              >
                <option value="">Select platform...</option>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Handle</label>
              <input
                type="text"
                className="form-input"
                value={formData.Handle}
                onChange={(e) => setFormData({ ...formData, Handle: e.target.value })}
                placeholder="@username"
              />
            </div>

            <div>
              <label className="form-label">URL</label>
              <input
                type="url"
                className="form-input"
                value={formData.URL}
                onChange={(e) => setFormData({ ...formData, URL: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="soc-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData['Is Primary']}
                  onChange={(e) => setFormData({ ...formData, 'Is Primary': e.target.checked })}
                />
                <span>Primary profile</span>
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
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete Social Profile"
        message="Are you sure you want to delete this social profile?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default SocialsManager;
