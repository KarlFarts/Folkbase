import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, addLocation } from '../utils/devModeWrapper';
import { detectDuplicateLocations } from '../services/locationService';
import { sanitizeFormData, SCHEMAS } from '../utils/inputSanitizer';

function AddLocation({ onNavigate }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    Name: '',
    Address: '',
    Phone: '',
    Type: 'Office',
    Website: '',
    'Business Hours': '',
    Notes: '',
    Tags: '',
    Priority: 'Medium',
    Status: 'Active',
    'Accessibility Notes': '',
    Capacity: '',
  });

  // Duplicate detection
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const checkDuplicates = async () => {
    if (!formData.Name || !formData.Address) {
      return false;
    }

    try {
      const { data: existingLocs } = await readSheetData(accessToken, sheetId, 'Locations');
      const dups = detectDuplicateLocations(existingLocs, formData);

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
      notify.warning('Location name is required');
      return;
    }

    if (!formData.Address.trim()) {
      notify.warning('Location address is required');
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
      const sanitizedData = sanitizeFormData(formData, SCHEMAS.location);

      const result = await addLocation(accessToken, sheetId, sanitizedData, user.email);

      notify.success('Location added successfully');

      // Navigate to the new location
      onNavigate('location-profile', result.locationId);
    } catch {
      // Error handled
      setError('Failed to add location. Please try again.');
      notify.error('Failed to add location');
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    'Office',
    'Store',
    'Restaurant',
    'Venue',
    'Public Space',
    'Warehouse',
    'Factory',
    'School',
    'Hospital',
    'Park',
    'Other',
  ];
  const priorityOptions = ['Urgent', 'High', 'Medium', 'Low', 'No Urgency'];
  const statusOptions = ['Active', 'Inactive', 'Temporarily Closed'];

  return (
    <div>
      <div className="add-form-header">
        <button
          className="btn btn-ghost btn-sm add-form-back"
          onClick={() => onNavigate('locations')}
        >
          ← Back to Locations
        </button>
        <h1>Add Location</h1>
        <p className="text-muted">Add a new location to your CRM</p>
      </div>

      {error && <div className="add-form-error">{error}</div>}

      <div className="card add-form-card">
        <div className="card-body">
          {/* Identity Section */}
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.Name}
              onChange={(e) => handleChange('Name', e.target.value)}
              placeholder="Enter location name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              className="form-textarea"
              value={formData.Address}
              onChange={(e) => handleChange('Address', e.target.value)}
              placeholder="123 Main Street&#10;City, State ZIP"
              rows={3}
            />
          </div>

          <div className="add-form-row">
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
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.Phone}
                onChange={(e) => handleChange('Phone', e.target.value)}
                placeholder="313-555-0100"
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
            <label className="form-label">Business Hours</label>
            <textarea
              className="form-textarea"
              value={formData['Business Hours']}
              onChange={(e) => handleChange('Business Hours', e.target.value)}
              placeholder="Mon-Fri: 9am-5pm&#10;Sat: 10am-2pm&#10;Sun: Closed"
              rows={4}
            />
            <small className="text-muted">Enter hours in any format that works for you</small>
          </div>

          <div className="add-form-row">
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input
                type="text"
                className="form-input"
                value={formData.Capacity}
                onChange={(e) => handleChange('Capacity', e.target.value)}
                placeholder="e.g., 50 people, 100 seats"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Accessibility Notes</label>
              <input
                type="text"
                className="form-input"
                value={formData['Accessibility Notes']}
                onChange={(e) => handleChange('Accessibility Notes', e.target.value)}
                placeholder="Wheelchair accessible, elevator"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="add-form-row">
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
            <label className="form-label">Tags</label>
            <input
              type="text"
              className="form-input"
              value={formData.Tags}
              onChange={(e) => handleChange('Tags', e.target.value)}
              placeholder="event-space, accessible, downtown"
            />
            <small className="text-muted">Separate tags with commas</small>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={formData.Notes}
              onChange={(e) => handleChange('Notes', e.target.value)}
              placeholder="Additional notes about this location..."
              rows={4}
            />
          </div>

          <div className="add-form-actions add-form-actions--left">
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit(false)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Add Location'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onNavigate('locations')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="add-form-modal-overlay">
          <div className="card add-form-modal-card">
            <div className="card-header">
              <h3>Potential Duplicate Detected</h3>
            </div>
            <div className="card-body">
              <p className="add-form-dup-msg">This location might already exist:</p>
              {duplicates.map((dup, index) => (
                <div key={index} className="add-form-dup-item">
                  <div className="add-form-dup-name">{dup.location.Name}</div>
                  <div className="text-muted add-form-dup-sub">{dup.location.Address}</div>
                  <div className="text-muted add-form-dup-reasons">
                    Match reasons: {dup.reasons.join(', ')}
                  </div>
                  <button
                    className="btn btn-sm btn-ghost add-form-dup-link"
                    onClick={() => onNavigate('location-profile', dup.location['Location ID'])}
                  >
                    View existing location
                  </button>
                </div>
              ))}
            </div>
            <div className="card-footer add-form-modal-footer">
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

export default AddLocation;
