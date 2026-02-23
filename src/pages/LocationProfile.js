import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import {
  readSheetData,
  updateLocation,
  deleteLocation,
  getLocationVisits,
} from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { MapPin, Phone, Globe, Edit, Trash2, X, Check, Calendar } from 'lucide-react';
import { ProfileSkeleton } from '../components/SkeletonLoader';
import ConfirmDialog from '../components/ConfirmDialog';

function LocationProfile({ onNavigate }) {
  const { id: locationId } = useParams();
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [location, setLocation] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadLocation();
    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, accessToken, sheetId]);

  const loadLocation = async () => {
    if (!accessToken || !locationId || !sheetId) {
      setError('Required information is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
      const found = data.find((loc) => loc['Location ID'] === locationId);

      if (!found) {
        setError('Location not found');
        return;
      }

      setLocation(found);
      setEditData(found);
    } catch {
      // Error handled
      setError('Failed to load location');
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async () => {
    if (!accessToken || !locationId || !sheetId) return;

    try {
      const locationVisits = await getLocationVisits(accessToken, sheetId, locationId);
      setVisits(locationVisits);
    } catch (err) {
      // Error handled
      console.error('Failed to load visits:', err);
    }
  };

  const handleEdit = () => {
    setEditData({ ...location });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData(location);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await updateLocation(accessToken, sheetId, locationId, location, editData, user.email);
      setLocation(editData);
      setIsEditing(false);
      notify.success('Location updated successfully');
    } catch {
      // Error handled
      notify.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLocation(accessToken, sheetId, locationId, user.email);
      notify.success('Location deleted successfully');
      onNavigate('locations');
    } catch {
      notify.error('Failed to delete location');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleQuickAction = (type) => {
    if (type === 'call' && location['Phone']) {
      window.location.href = `tel:${location['Phone']}`;
    } else if (type === 'website' && location['Website']) {
      window.open(location['Website'], '_blank', 'noopener,noreferrer');
    } else if (type === 'map' && location['Address']) {
      const address = encodeURIComponent(location['Address']);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${address}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleVisitLogged = () => {
    setShowLogVisitModal(false);
    loadVisits();
    notify.success('Visit logged successfully');
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary mt-md" onClick={() => onNavigate('locations')}>
          Back to Locations
        </button>
      </div>
    );
  }

  const displayData = isEditing ? editData : location;

  const getPriorityClass = (priority) => {
    const lower = (priority || '').toLowerCase();
    if (lower === 'urgent') return 'badge-priority-urgent';
    if (lower === 'high') return 'badge-priority-high';
    if (lower === 'medium') return 'badge-priority-medium';
    if (lower === 'low') return 'badge-priority-low';
    return 'badge-priority-none';
  };

  const getStatusClass = (status) => {
    const lower = (status || '').toLowerCase();
    if (lower === 'active') return 'badge-status-active';
    if (lower === 'inactive') return 'badge-status-inactive';
    if (lower === 'closed') return 'badge-status-dnc';
    return 'badge-status-inactive';
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onNavigate('locations')}
        style={{ marginBottom: 'var(--spacing-md)' }}
      >
        ← Back to Locations
      </button>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'flex-start' }}>
            {/* Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(5, 150, 105, 0.1)',
                border: '3px solid var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={40} color="var(--color-success)" />
            </div>

            {/* Name and Info */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>{displayData['Name']}</h1>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--spacing-md)',
                      flexWrap: 'wrap',
                      marginBottom: 'var(--spacing-sm)',
                    }}
                  >
                    <span className="text-muted">{displayData['Type']}</span>
                    {displayData['Capacity'] && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-muted">Capacity: {displayData['Capacity']}</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {displayData['Priority'] && (
                      <span className={`badge ${getPriorityClass(displayData['Priority'])}`}>
                        {displayData['Priority']}
                      </span>
                    )}
                    {displayData['Status'] && (
                      <span className={`badge ${getStatusClass(displayData['Status'])}`}>
                        {displayData['Status']}
                      </span>
                    )}
                    {displayData['Tags'] &&
                      displayData['Tags'].split(',').map((tag, i) => (
                        <span key={i} className="tag">
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  {!isEditing ? (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleEdit}
                        title="Edit location"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete location"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        title="Save changes"
                      >
                        <Check size={16} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        title="Cancel editing"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-md)',
                }}
              >
                {displayData['Phone'] && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickAction('call')}
                  >
                    <Phone size={16} /> Call
                  </button>
                )}
                {displayData['Website'] && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickAction('website')}
                  >
                    <Globe size={16} /> Website
                  </button>
                )}
                {displayData['Address'] && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickAction('map')}
                  >
                    <MapPin size={16} /> View on Map
                  </button>
                )}
                {!isEditing && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowLogVisitModal(true)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Calendar size={16} /> Log Visit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            borderBottom: '1px solid var(--border-color-default)',
          }}
        >
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'details' ? '2px solid var(--color-success)' : 'none',
            }}
          >
            Details
          </button>
          <button
            className={`tab-button ${activeTab === 'visits' ? 'active' : ''}`}
            onClick={() => setActiveTab('visits')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'visits' ? '2px solid var(--color-success)' : 'none',
            }}
          >
            Visit History ({visits.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Location Details</h3>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}
            >
              {/* Contact Information */}
              <div>
                <h4
                  style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)' }}
                >
                  Contact Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label className="form-label">Address</label>
                    {isEditing ? (
                      <textarea
                        className="form-textarea"
                        value={editData['Address'] || ''}
                        onChange={(e) => handleChange('Address', e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                        {displayData['Address'] || 'Not provided'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        className="form-input"
                        value={editData['Phone'] || ''}
                        onChange={(e) => handleChange('Phone', e.target.value)}
                      />
                    ) : (
                      <p className="text-muted">{displayData['Phone'] || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Website</label>
                    {isEditing ? (
                      <input
                        type="url"
                        className="form-input"
                        value={editData['Website'] || ''}
                        onChange={(e) => handleChange('Website', e.target.value)}
                      />
                    ) : (
                      <p className="text-muted">
                        {displayData['Website'] ? (
                          <a
                            href={displayData['Website']}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {displayData['Website']}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Details */}
              <div>
                <h4
                  style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)' }}
                >
                  Details
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label className="form-label">Type</label>
                    {isEditing ? (
                      <select
                        className="form-select"
                        value={editData['Type'] || ''}
                        onChange={(e) => handleChange('Type', e.target.value)}
                      >
                        <option value="Office">Office</option>
                        <option value="Store">Store</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Venue">Venue</option>
                        <option value="Public Space">Public Space</option>
                        <option value="Park">Park</option>
                        <option value="Community Center">Community Center</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Type'] || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Priority</label>
                    {isEditing ? (
                      <select
                        className="form-select"
                        value={editData['Priority'] || ''}
                        onChange={(e) => handleChange('Priority', e.target.value)}
                      >
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="No Urgency">No Urgency</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Priority'] || 'Medium'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    {isEditing ? (
                      <select
                        className="form-select"
                        value={editData['Status'] || ''}
                        onChange={(e) => handleChange('Status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Status'] || 'Active'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Capacity</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={editData['Capacity'] || ''}
                        onChange={(e) => handleChange('Capacity', e.target.value)}
                        placeholder="Max occupancy (e.g., 100 people)"
                      />
                    ) : (
                      <p className="text-muted">{displayData['Capacity'] || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Operations */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)' }}>
                Operations
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--spacing-lg)',
                }}
              >
                <div>
                  <label className="form-label">Business Hours</label>
                  {isEditing ? (
                    <textarea
                      className="form-textarea"
                      value={editData['Business Hours'] || ''}
                      onChange={(e) => handleChange('Business Hours', e.target.value)}
                      rows={4}
                      placeholder="Mon-Fri: 9am-5pm&#10;Sat: 10am-2pm&#10;Sun: Closed"
                    />
                  ) : (
                    <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {displayData['Business Hours'] || 'Not specified'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">Accessibility Notes</label>
                  {isEditing ? (
                    <textarea
                      className="form-textarea"
                      value={editData['Accessibility Notes'] || ''}
                      onChange={(e) => handleChange('Accessibility Notes', e.target.value)}
                      rows={4}
                      placeholder="Wheelchair accessible, elevator available, etc."
                    />
                  ) : (
                    <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {displayData['Accessibility Notes'] || 'Not specified'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes and Tags */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-base)' }}>
                Additional Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div>
                  <label className="form-label">Tags</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editData['Tags'] || ''}
                      onChange={(e) => handleChange('Tags', e.target.value)}
                      placeholder="downtown, accessible, parking"
                    />
                  ) : (
                    <p className="text-muted">{displayData['Tags'] || 'No tags'}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  {isEditing ? (
                    <textarea
                      className="form-textarea"
                      value={editData['Notes'] || ''}
                      onChange={(e) => handleChange('Notes', e.target.value)}
                      rows={6}
                    />
                  ) : (
                    <p className="text-muted" style={{ whiteSpace: 'pre-line' }}>
                      {displayData['Notes'] || 'No notes'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="card">
          <div className="card-body">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              <h3>Visit History</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLogVisitModal(true)}>
                <Calendar size={16} /> Log Visit
              </button>
            </div>

            {visits.length === 0 ? (
              <p className="text-muted">No visits logged yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {visits.map((visit, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--border-color-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      <strong>{visit['Purpose'] || 'Visit'}</strong>
                      <span className="text-muted">{visit['Date']}</span>
                    </div>
                    {visit['Duration'] && (
                      <p className="text-muted" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Duration: {visit['Duration']}
                      </p>
                    )}
                    {visit['Contact ID'] && (
                      <p className="text-muted" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Contact: {visit['Contact ID']}
                      </p>
                    )}
                    {visit['Notes'] && (
                      <p style={{ marginTop: 'var(--spacing-xs)' }}>{visit['Notes']}</p>
                    )}
                    {visit['Follow-up Needed'] === 'Yes' && (
                      <div
                        style={{
                          marginTop: 'var(--spacing-xs)',
                          padding: 'var(--spacing-xs)',
                          background: 'rgba(217, 119, 6, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <strong>Follow-up needed</strong>
                        {visit['Follow-up Date'] && ` by ${visit['Follow-up Date']}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showLogVisitModal && (
        <LogVisitModal
          isOpen={showLogVisitModal}
          onClose={() => setShowLogVisitModal(false)}
          locationId={locationId}
          locationName={location['Name']}
          onVisitLogged={handleVisitLogged}
        />
      )}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Location"
        message={`Are you sure you want to delete ${location?.['Name'] || 'this location'}?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

// Inline LogVisitModal component for now
function LogVisitModal({ isOpen, onClose, locationId, locationName, onVisitLogged }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [formData, setFormData] = useState({
    'Location ID': locationId,
    'Location Name': locationName,
    Date: new Date().toISOString().split('T')[0],
    Purpose: 'Meeting',
    'Contact ID': '',
    Notes: '',
    Duration: '',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const { logLocationVisit } = await import('../utils/devModeWrapper');
      await logLocationVisit(accessToken, sheetId, locationId, locationName, formData, user.email);
      onVisitLogged();
    } catch (error) {
      notify.error('Failed to log visit');
      console.error('Error logging visit:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <h3>Log Visit to {locationName}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData['Date']}
                  onChange={(e) => handleChange('Date', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Purpose</label>
                <select
                  className="form-select"
                  value={formData['Purpose']}
                  onChange={(e) => handleChange('Purpose', e.target.value)}
                  required
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Event">Event</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label">Duration (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData['Duration']}
                  onChange={(e) => handleChange('Duration', e.target.value)}
                  placeholder="e.g., 2 hours, 30 minutes"
                />
              </div>

              <div>
                <label className="form-label">Contact ID (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData['Contact ID']}
                  onChange={(e) => handleChange('Contact ID', e.target.value)}
                  placeholder="CON001"
                />
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={formData['Notes']}
                  onChange={(e) => handleChange('Notes', e.target.value)}
                  rows={4}
                  placeholder="What happened during this visit?"
                />
              </div>

              <div>
                <label className="form-label">Follow-up Needed?</label>
                <select
                  className="form-select"
                  value={formData['Follow-up Needed']}
                  onChange={(e) => handleChange('Follow-up Needed', e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {formData['Follow-up Needed'] === 'Yes' && (
                <div>
                  <label className="form-label">Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData['Follow-up Date']}
                    onChange={(e) => handleChange('Follow-up Date', e.target.value)}
                  />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  justifyContent: 'flex-end',
                  marginTop: 'var(--spacing-md)',
                }}
              >
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Log Visit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LocationProfile;
