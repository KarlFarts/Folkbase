import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import {
  readSheetData,
  updateOrganization,
  deleteOrganization,
  getOrgContacts,
} from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { Building2, Phone, Mail, Globe, Edit, Trash2, X, Check } from 'lucide-react';
import { ProfileSkeleton } from '../components/SkeletonLoader';
import ConfirmDialog from '../components/ConfirmDialog';

function OrganizationProfile({ onNavigate }) {
  const { id: organizationId } = useParams();
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [keyContacts, setKeyContacts] = useState([]);
  const [linkedEvents, setLinkedEvents] = useState([]);

  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, accessToken, sheetId]);

  const loadOrganization = async () => {
    if (!accessToken || !organizationId || !sheetId) {
      setError('Required information is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [orgsResult, orgContactsResult, contactsResult, eventsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS),
        getOrgContacts(accessToken, sheetId, organizationId),
        readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS),
      ]);

      const found = orgsResult.data.find((org) => org['Organization ID'] === organizationId);

      if (!found) {
        setError('Organization not found');
        return;
      }

      const contactIds = orgContactsResult.map((oc) => oc['Contact ID']).filter(Boolean);
      const contacts = contactsResult.data.filter((contact) =>
        contactIds.includes(contact['Contact ID'])
      );

      const events = eventsResult.data.filter((event) => {
        const orgField = event['Organization'] || '';
        return orgField.includes(organizationId) || orgField.includes(found.Name);
      });

      setOrganization(found);
      setEditData(found);
      setKeyContacts(contacts);
      setLinkedEvents(
        events.sort((a, b) => (b['Event Date'] || '').localeCompare(a['Event Date'] || ''))
      );
    } catch {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditData({ ...organization });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData(organization);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await updateOrganization(
        accessToken,
        sheetId,
        organizationId,
        organization,
        editData,
        user.email
      );
      setOrganization(editData);
      setIsEditing(false);
      notify.success('Organization updated successfully');
    } catch {
      notify.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrganization(accessToken, sheetId, organizationId, user.email);
      notify.success('Organization deleted successfully');
      onNavigate('organizations');
    } catch {
      notify.error('Failed to delete organization');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleQuickAction = (type) => {
    if (type === 'call' && organization['Phone']) {
      window.location.href = `tel:${organization['Phone']}`;
    } else if (type === 'email' && organization['Email']) {
      window.location.href = `mailto:${organization['Email']}`;
    } else if (type === 'website' && organization['Website']) {
      window.open(organization['Website'], '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary mt-md" onClick={() => onNavigate('organizations')}>
          Back to Organizations
        </button>
      </div>
    );
  }

  const displayData = isEditing ? editData : organization;

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
    if (lower === 'do not contact') return 'badge-status-dnc';
    return 'badge-status-inactive';
  };

  const ORG_TABS = [
    { id: 'details', label: 'Details' },
    { id: 'contacts', label: `Key Contacts (${keyContacts.length})` },
    { id: 'events', label: `Events (${linkedEvents.length})` },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="op-page">
      {/* Back button */}
      <button className="btn btn-ghost btn-sm cp-back-btn" onClick={() => onNavigate('organizations')}>
        ← Back to Organizations
      </button>

      {/* Profile Header card */}
      <div className="card op-header-card">
        <div className="card-body">
          <div className="op-header-inner">
            {/* Icon */}
            <div className="op-icon">
              <Building2 size={40} color="var(--color-accent-secondary)" />
            </div>

            {/* Name and Info */}
            <div className="op-header-body">
              <div className="op-header-top">
                <div>
                  <h1 className="op-name">{displayData['Name']}</h1>
                  <div className="op-meta-row">
                    <span className="text-muted">{displayData['Type']}</span>
                    {displayData['Industry'] && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-muted">{displayData['Industry']}</span>
                      </>
                    )}
                    {displayData['Size'] && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-muted">{displayData['Size']} employees</span>
                      </>
                    )}
                  </div>
                  <div className="op-badges">
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

                {/* Edit / Save / Cancel actions */}
                <div className="op-header-actions">
                  {!isEditing ? (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={handleEdit} title="Edit organization">
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm op-delete-btn"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete organization"
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
              <div className="op-quick-actions">
                {displayData['Phone'] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleQuickAction('call')}>
                    <Phone size={16} /> Call
                  </button>
                )}
                {displayData['Email'] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleQuickAction('email')}>
                    <Mail size={16} /> Email
                  </button>
                )}
                {displayData['Website'] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleQuickAction('website')}>
                    <Globe size={16} /> Website
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cp-tab-bar">
        {ORG_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`cp-tab${activeTab === tab.id ? ' cp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="card">
          <div className="card-body">
            <h3 className="op-section-title">Organization Details</h3>

            <div className="op-details-grid">
              {/* Contact Information */}
              <div>
                <h4 className="op-subsection-title">Contact Information</h4>
                <div className="op-field-stack">
                  <div>
                    <label className="form-label">Phone</label>
                    {isEditing ? (
                      <input type="tel" className="form-input" value={editData['Phone'] || ''} onChange={(e) => handleChange('Phone', e.target.value)} />
                    ) : (
                      <p className="text-muted">{displayData['Phone'] || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    {isEditing ? (
                      <input type="email" className="form-input" value={editData['Email'] || ''} onChange={(e) => handleChange('Email', e.target.value)} />
                    ) : (
                      <p className="text-muted">{displayData['Email'] || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Website</label>
                    {isEditing ? (
                      <input type="url" className="form-input" value={editData['Website'] || ''} onChange={(e) => handleChange('Website', e.target.value)} />
                    ) : (
                      <p className="text-muted">
                        {displayData['Website'] ? (
                          <a href={displayData['Website']} target="_blank" rel="noopener noreferrer">
                            {displayData['Website']}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    {isEditing ? (
                      <textarea className="form-textarea" value={editData['Address'] || ''} onChange={(e) => handleChange('Address', e.target.value)} rows={3} />
                    ) : (
                      <p className="text-muted op-pre-line">{displayData['Address'] || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization Details */}
              <div>
                <h4 className="op-subsection-title">Details</h4>
                <div className="op-field-stack">
                  <div>
                    <label className="form-label">Type</label>
                    {isEditing ? (
                      <select className="form-select" value={editData['Type'] || ''} onChange={(e) => handleChange('Type', e.target.value)}>
                        <option value="Corporate">Corporate</option>
                        <option value="Non-Profit">Non-Profit</option>
                        <option value="Government">Government</option>
                        <option value="Educational">Educational</option>
                        <option value="Small Business">Small Business</option>
                        <option value="Union">Union</option>
                        <option value="Association">Association</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Type'] || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Industry</label>
                    {isEditing ? (
                      <input type="text" className="form-input" value={editData['Industry'] || ''} onChange={(e) => handleChange('Industry', e.target.value)} />
                    ) : (
                      <p className="text-muted">{displayData['Industry'] || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Size</label>
                    {isEditing ? (
                      <select className="form-select" value={editData['Size'] || ''} onChange={(e) => handleChange('Size', e.target.value)}>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Size'] || 'Unknown'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Founded Date</label>
                    {isEditing ? (
                      <input type="date" className="form-input" value={editData['Founded Date'] || ''} onChange={(e) => handleChange('Founded Date', e.target.value)} />
                    ) : (
                      <p className="text-muted">{displayData['Founded Date'] || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Priority</label>
                    {isEditing ? (
                      <select className="form-select" value={editData['Priority'] || ''} onChange={(e) => handleChange('Priority', e.target.value)}>
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
                      <select className="form-select" value={editData['Status'] || ''} onChange={(e) => handleChange('Status', e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Do Not Contact">Do Not Contact</option>
                      </select>
                    ) : (
                      <p className="text-muted">{displayData['Status'] || 'Active'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes and Tags */}
            <div className="op-additional-info">
              <h4 className="op-subsection-title">Additional Information</h4>
              <div className="op-field-stack">
                <div>
                  <label className="form-label">Tags</label>
                  {isEditing ? (
                    <input type="text" className="form-input" value={editData['Tags'] || ''} onChange={(e) => handleChange('Tags', e.target.value)} placeholder="partner, non-profit, community" />
                  ) : (
                    <p className="text-muted">{displayData['Tags'] || 'No tags'}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  {isEditing ? (
                    <textarea className="form-textarea" value={editData['Notes'] || ''} onChange={(e) => handleChange('Notes', e.target.value)} rows={6} />
                  ) : (
                    <p className="text-muted op-pre-line">{displayData['Notes'] || 'No notes'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="card">
          <div className="card-body">
            <h3 className="op-section-title">Key Contacts</h3>
            {keyContacts.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="cp-empty-title">No Key Contacts</h3>
                <p>This organization has no key contacts assigned yet.</p>
              </div>
            ) : (
              <div className="cp-card-grid">
                {keyContacts.map((contact) => (
                  <div
                    key={contact['Contact ID']}
                    className="card cp-linked-card"
                    onClick={() => onNavigate('contact-profile', contact['Contact ID'])}
                  >
                    <div className="cp-linked-card-inner">
                      <div>
                        <strong>{contact['Display Name'] || contact.Name}</strong>
                        <div className="cp-linked-card-meta">
                          {contact.Role && <span>{contact.Role}</span>}
                          {contact.Role && contact['Email Personal'] && <span> · </span>}
                          {contact['Email Personal'] && <span>{contact['Email Personal']}</span>}
                        </div>
                      </div>
                      <span className="badge badge-status-inactive cp-linked-card-id">
                        {contact['Contact ID']}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="card">
          <div className="card-body">
            <h3 className="op-section-title">Related Events</h3>
            {linkedEvents.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3 className="cp-empty-title">No Events</h3>
                <p>This organization has no related events.</p>
              </div>
            ) : (
              <div className="cp-card-grid">
                {linkedEvents.map((event) => (
                  <div
                    key={event['Event ID']}
                    className="card cp-linked-card"
                    onClick={() => onNavigate('event-details', { id: event['Event ID'] })}
                  >
                    <div className="cp-linked-card-inner">
                      <div>
                        <strong>{event['Event Name']}</strong>
                        <div className="cp-linked-card-meta">
                          {event['Event Date'] && <span>{event['Event Date']}</span>}
                          {event['Event Date'] && event['Event Type'] && <span> · </span>}
                          {event['Event Type'] && <span>{event['Event Type']}</span>}
                        </div>
                      </div>
                      <span className="badge badge-status-inactive cp-linked-card-id">
                        {event['Event ID']}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card">
          <div className="card-body">
            <div className="cp-empty-state">
              <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h3 className="cp-empty-title">Organization Notes Not Yet Available</h3>
              <p>
                Notes are currently only supported for contacts. Organization notes functionality
                will be added in a future update.
              </p>
              <p className="op-notes-hint">
                For now, you can add notes to individual contacts within this organization.
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Organization"
        message={`Are you sure you want to delete ${organization?.['Name'] || 'this organization'}?`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default OrganizationProfile;
