import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetMetadata, addContact, detectDuplicates, SHEETS } from '../utils/devModeWrapper';
import { sanitizeFormData, SCHEMAS, INPUT_LIMITS } from '../utils/inputSanitizer';

function AddContact({ onNavigate }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    'First Name': '',
    'Last Name': '',
    'Display Name': '',
    'Phone Mobile': '',
    'Email Personal': '',
    Organization: '',
    Role: '',
    Bio: '',
    Tags: '',
    Priority: 'Medium',
    Status: 'Active',
    District: '',
    // Legacy fields for backward compatibility
    Name: '',
    Phone: '',
    Email: '',
  });

  // Duplicate detection
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, [accessToken, sheetId]);

  const loadMetadata = async () => {
    if (!accessToken || !sheetId) {
      setError('Access token or Sheet ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const meta = await readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS);
      setMetadata(meta);
    } catch {
      setError('Failed to load form configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const checkDuplicates = async () => {
    if (
      !formData['First Name'] &&
      !formData['Last Name'] &&
      !formData['Phone Mobile'] &&
      !formData['Email Personal']
    ) {
      return false;
    }

    try {
      const dups = await detectDuplicates(accessToken, sheetId, formData);
      if (dups.length > 0) {
        setDuplicates(dups);
        setShowDuplicateWarning(true);
        return true;
      }
    } catch {
      // Silently fail - duplicate check is non-critical
    }
    return false;
  };

  const handleSubmit = async (forceSave = false) => {
    if (!formData['First Name'].trim() && !formData['Last Name'].trim()) {
      notify.warning('First Name or Last Name is required');
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

      // Auto-compute Display Name if not provided
      let displayName = formData['Display Name'];
      if (!displayName) {
        const parts = [formData['First Name'], formData['Last Name']].filter(Boolean);
        displayName = parts.join(' ');
      }

      // Set legacy Name field for backward compatibility
      const legacyName = displayName;

      const saveData = {
        ...formData,
        'Display Name': displayName,
        Name: legacyName, // Legacy field
        Phone: formData['Phone Mobile'], // Legacy field
        Email: formData['Email Personal'], // Legacy field
      };

      // Sanitize input to prevent XSS and formula injection
      const sanitizedData = sanitizeFormData(saveData, SCHEMAS.contact);

      const result = await addContact(accessToken, sheetId, sanitizedData, user.email);

      // Navigate to the new contact
      onNavigate('contact-profile', result.contactId);
    } catch {
      setError('Failed to add contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get dropdown options from metadata
  const priorityOptions = metadata?.validationRules?.['Priority'] || [
    'Urgent',
    'High',
    'Medium',
    'Low',
    'No Urgency',
  ];
  const statusOptions = metadata?.validationRules?.['Status'] || [
    'Active',
    'Inactive',
    'Do Not Contact',
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="add-form-header">
        <button
          className="btn btn-ghost btn-sm add-form-back"
          onClick={() => onNavigate('contacts')}
        >
          ← Back to Contacts
        </button>
        <h1>Add Contact</h1>
        <p className="text-muted">Add a new contact to your CRM</p>
      </div>

      {error && (
        <div className="add-form-error">
          {error}
        </div>
      )}

      <div className="card add-form-card">
        <div className="card-body">
          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="contact-first-name">
                First Name *
              </label>
              <input
                id="contact-first-name"
                type="text"
                className="form-input"
                value={formData['First Name']}
                onChange={(e) => handleChange('First Name', e.target.value)}
                placeholder="John"
                maxLength={INPUT_LIMITS.shortText}
                autoFocus
                aria-required="true"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-last-name">
                Last Name *
              </label>
              <input
                id="contact-last-name"
                type="text"
                className="form-input"
                value={formData['Last Name']}
                onChange={(e) => handleChange('Last Name', e.target.value)}
                placeholder="Smith"
                maxLength={INPUT_LIMITS.shortText}
                aria-required="true"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contact-display-name">
              Display Name <span className="text-muted">(optional)</span>
            </label>
            <input
              id="contact-display-name"
              type="text"
              className="form-input"
              value={formData['Display Name']}
              onChange={(e) => handleChange('Display Name', e.target.value)}
              placeholder="Auto-generated if left blank"
              maxLength={INPUT_LIMITS.shortText}
            />
            <small className="text-muted">Defaults to "First Last" if not specified</small>
          </div>

          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="contact-phone-mobile">
                Phone (Mobile)
              </label>
              <input
                id="contact-phone-mobile"
                type="text"
                className="form-input"
                value={formData['Phone Mobile']}
                onChange={(e) => handleChange('Phone Mobile', e.target.value)}
                placeholder="313-555-0100"
                maxLength={INPUT_LIMITS.shortText}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-email-personal">
                Email (Personal)
              </label>
              <input
                id="contact-email-personal"
                type="email"
                className="form-input"
                value={formData['Email Personal']}
                onChange={(e) => handleChange('Email Personal', e.target.value)}
                placeholder="john@example.com"
                maxLength={INPUT_LIMITS.shortText}
              />
            </div>
          </div>

          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="contact-organization">
                Organization
              </label>
              <input
                id="contact-organization"
                type="text"
                className="form-input"
                value={formData.Organization}
                onChange={(e) => handleChange('Organization', e.target.value)}
                placeholder="UAW Local 600"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-role">
                Role
              </label>
              <input
                id="contact-role"
                type="text"
                className="form-input"
                value={formData.Role}
                onChange={(e) => handleChange('Role', e.target.value)}
                placeholder="e.g. Manager, Director, Volunteer"
              />
            </div>
          </div>

          <div
            className="add-form-row"
          >
            <div className="form-group">
              <label className="form-label" htmlFor="contact-priority">
                Priority
              </label>
              <select
                id="contact-priority"
                className="form-select"
                value={formData.Priority}
                onChange={(e) => handleChange('Priority', e.target.value)}
              >
                {priorityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-status">
                Status
              </label>
              <select
                id="contact-status"
                className="form-select"
                value={formData.Status}
                onChange={(e) => handleChange('Status', e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contact-district">
              District
            </label>
            <input
              id="contact-district"
              type="text"
              className="form-input"
              value={formData.District}
              onChange={(e) => handleChange('District', e.target.value)}
              placeholder="District 5"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contact-tags">
              Tags
            </label>
            <input
              id="contact-tags"
              type="text"
              className="form-input"
              value={formData.Tags}
              onChange={(e) => handleChange('Tags', e.target.value)}
              placeholder="Labor, Endorsement, Volunteer"
            />
            <small className="text-muted">Separate tags with commas</small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contact-bio">
              Bio / Notes
            </label>
            <textarea
              id="contact-bio"
              className="form-textarea"
              value={formData.Bio}
              onChange={(e) => handleChange('Bio', e.target.value)}
              placeholder="Any additional notes about this contact..."
              maxLength={INPUT_LIMITS.longText}
            />
          </div>

          <div className="add-form-actions">
            <button className="btn btn-secondary" onClick={() => onNavigate('contacts')}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit(false)}
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="tl-modal-overlay">
          <div className="card tl-modal-card tl-modal-card--sm">
            <div className="card-header">
              <h3>Possible Duplicates Found</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDuplicateWarning(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <p className="add-form-dup-msg">
                We found {duplicates.length} existing contact(s) that might be duplicates:
              </p>

              {duplicates.map((dup, i) => (
                <div
                  key={i}
                  className="add-form-dup-item"
                >
                  <div className="add-form-dup-name">{dup.existing['Name']}</div>
                  <div className="text-sm text-muted">
                    {dup.existing['Organization']}
                    {dup.existing['Organization'] && ' · '}
                    Matched by: {dup.matchReasons.join(', ')}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm mt-md"
                    onClick={() => {
                      setShowDuplicateWarning(false);
                      onNavigate('contact-profile', dup.existing['Contact ID']);
                    }}
                  >
                    View existing contact →
                  </button>
                </div>
              ))}
            </div>
            <div className="card-footer tl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDuplicateWarning(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  handleSubmit(true);
                }}
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddContact;
