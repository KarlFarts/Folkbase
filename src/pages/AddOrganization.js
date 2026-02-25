import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, addOrganization } from '../utils/devModeWrapper';
import { detectDuplicateOrganizations } from '../services/organizationService';
import { sanitizeFormData, SCHEMAS, INPUT_LIMITS } from '../utils/inputSanitizer';

function AddOrganization({ onNavigate }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    Name: '',
    Type: 'Corporate',
    Website: '',
    Phone: '',
    Email: '',
    Address: '',
    Industry: '',
    Size: '1-10',
    Notes: '',
    Tags: '',
    Priority: 'Medium',
    Status: 'Active',
    'Founded Date': '',
  });

  // Duplicate detection
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const checkDuplicates = async () => {
    if (!formData.Name) {
      return false;
    }

    try {
      const { data: existingOrgs } = await readSheetData(accessToken, sheetId, 'Organizations');
      const dups = detectDuplicateOrganizations(existingOrgs, formData);

      if (dups.length > 0) {
        setDuplicates(dups);
        setShowDuplicateWarning(true);
        return true;
      }
    } catch {
      // Error handled
      // Ignore errors in duplicate detection
    }
    return false;
  };

  const handleSubmit = async (forceSave = false) => {
    if (!formData.Name.trim()) {
      notify.warning('Organization name is required');
      return;
    }

    // Check for duplicates unless forcing save
    if (!forceSave) {
      const hasDuplicates = await checkDuplicates();
      if (hasDuplicates) return;
    }

    try {
      setSaving(true);
      setError('');

      // Sanitize input to prevent XSS and formula injection
      const sanitizedData = sanitizeFormData(formData, SCHEMAS.organization);

      const result = await addOrganization(accessToken, sheetId, sanitizedData, user.email);

      notify.success('Organization added successfully');

      // Navigate to the new organization
      onNavigate('organization-profile', result.organizationId);
    } catch {
      // Error handled
      setError('Failed to add organization. Please try again.');
      notify.error('Failed to add organization');
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    'Corporate',
    'Non-Profit',
    'Government',
    'Educational',
    'Small Business',
    'Union',
    'Association',
    'Other',
  ];
  const sizeOptions = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Unknown'];
  const priorityOptions = ['Urgent', 'High', 'Medium', 'Low', 'No Urgency'];
  const statusOptions = ['Active', 'Inactive', 'Do Not Contact'];

  return (
    <div>
      <div className="add-form-header">
        <button
          className="btn btn-ghost btn-sm add-form-back"
          onClick={() => onNavigate('organizations')}
        >
          ← Back to Organizations
        </button>
        <h1>Add Organization</h1>
        <p className="text-muted">Add a new organization to your CRM</p>
      </div>

      {error && (
        <div className="add-form-error">
          {error}
        </div>
      )}

      <div className="card add-form-card">
        <div className="card-body">
          {/* Identity Section */}
          <div className="form-group">
            <label className="form-label">Organization Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.Name}
              onChange={(e) => handleChange('Name', e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={formData.Type}
                onChange={(e) => handleChange('Type', e.target.value)}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Size</label>
              <select
                className="form-select"
                value={formData.Size}
                onChange={(e) => handleChange('Size', e.target.value)}
              >
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Information */}
          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.Phone}
                onChange={(e) => handleChange('Phone', e.target.value)}
                placeholder="313-555-0100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.Email}
                onChange={(e) => handleChange('Email', e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              className="form-input"
              value={formData.Website}
              onChange={(e) => handleChange('Website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-textarea"
              value={formData.Address}
              onChange={(e) => handleChange('Address', e.target.value)}
              placeholder="123 Main Street&#10;City, State ZIP"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Industry</label>
            <input
              type="text"
              className="form-input"
              value={formData.Industry}
              onChange={(e) => handleChange('Industry', e.target.value)}
              placeholder="Technology, Healthcare, Education, etc."
            />
          </div>

          {/* Priority and Status */}
          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={formData.Priority}
                onChange={(e) => handleChange('Priority', e.target.value)}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.Status}
                onChange={(e) => handleChange('Status', e.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Founded Date</label>
            <input
              type="date"
              className="form-input"
              value={formData['Founded Date']}
              onChange={(e) => handleChange('Founded Date', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            <input
              type="text"
              className="form-input"
              value={formData.Tags}
              onChange={(e) => handleChange('Tags', e.target.value)}
              placeholder="partner, non-profit, community"
            />
            <small className="text-muted">Separate tags with commas</small>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={formData.Notes}
              onChange={(e) => handleChange('Notes', e.target.value)}
              placeholder="Additional notes about this organization..."
              rows={4}
            />
          </div>

          <div className="add-form-actions add-form-actions--left">
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit(false)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Add Organization'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onNavigate('organizations')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="tl-modal-overlay">
          <div className="card tl-modal-card tl-modal-card--sm">
            <div className="card-header">
              <h3>Potential Duplicate Detected</h3>
            </div>
            <div className="card-body">
              <p>This organization might already exist:</p>
              {duplicates.map((dup, index) => (
                <div key={index} className="add-form-dup-item">
                  <div className="add-form-dup-name">{dup.organization.Name}</div>
                  <div className="text-muted add-form-dup-sub">
                    {dup.organization.Address}
                  </div>
                  <div className="text-muted add-form-dup-reasons">
                    Match reasons: {dup.reasons.join(', ')}
                  </div>
                  <button
                    className="btn btn-sm btn-ghost add-form-dup-link"
                    onClick={() =>
                      onNavigate('organization-profile', dup.organization['Organization ID'])
                    }
                  >
                    View existing organization
                  </button>
                </div>
              ))}
            </div>
            <div className="card-footer tl-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDuplicateWarning(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleSubmit(true)}>
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddOrganization;
