import { useState } from 'react';
import { Phone, MessageSquare, Mail, Copy, Check } from 'lucide-react';
import Avatar from '../Avatar';
import AvatarPicker from '../AvatarPicker';

/**
 * ProfileHeader - Displays contact identity with avatar, name, organization, and quick contact actions
 */
function ProfileHeader({
  contact,
  isEditing,
  editData,
  onChange,
  getPriorityClass,
  getStatusClass,
}) {
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Get primary phone and email from typed fields (with fallback to legacy fields)
  const primaryPhone =
    contact['Phone Mobile'] ||
    contact['Phone Home'] ||
    contact['Phone Work'] ||
    (contact.Phone ? contact.Phone.split(',')[0].trim() : null);
  const primaryEmail =
    contact['Email Personal'] ||
    contact['Email Work'] ||
    (contact.Email ? contact.Email.split(',')[0].trim() : null);

  // Use Display Name (with fallback to legacy Name field)
  const displayName = contact['Display Name'] || contact.Name || 'Unnamed Contact';

  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // Clipboard API may fail silently in some browsers
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="ph-layout">
          {/* Left Column: Avatar + Identity Info */}
          <div className="ph-identity-row">
            {/* Avatar */}
            <div className="ph-avatar-col">
              <Avatar
                name={isEditing ? editData['Display Name'] || editData.Name : displayName}
                size="xl"
                customColor={isEditing ? editData['Avatar Color'] : contact['Avatar Color']}
                customIcon={isEditing ? editData['Avatar Icon'] : contact['Avatar Icon']}
              />
              {isEditing && (
                <AvatarPicker
                  name={editData['Display Name'] || editData.Name}
                  currentColor={editData['Avatar Color'] || null}
                  currentIcon={editData['Avatar Icon'] || null}
                  onColorChange={(color) => onChange({ ...editData, 'Avatar Color': color || '' }, 'Avatar Color')}
                  onIconChange={(icon) => onChange({ ...editData, 'Avatar Icon': icon || '' }, 'Avatar Icon')}
                />
              )}
            </div>

            {/* Identity Info */}
            <div className="ph-identity-info">
              {isEditing ? (
                <div className="ph-edit-fields">
                  <input
                    type="text"
                    className="form-input ph-name-input"
                    value={editData.Name || ''}
                    onChange={(e) => onChange({ ...editData, Name: e.target.value }, 'Name')}
                    placeholder="Full name"
                  />
                  <div className="ph-org-role-grid">
                    <input
                      type="text"
                      className="form-input"
                      value={editData.Organization || ''}
                      onChange={(e) => onChange({ ...editData, Organization: e.target.value }, 'Organization')}
                      placeholder="Organization"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editData.Role || ''}
                      onChange={(e) => onChange({ ...editData, Role: e.target.value }, 'Role')}
                      placeholder="Role"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="ph-display-name">{displayName}</h2>
                  {(contact.Organization || contact.Role) && (
                    <p className="text-muted ph-org-role-text">
                      {contact.Organization}
                      {contact.Organization && contact.Role && ' · '}
                      {contact.Role}
                    </p>
                  )}
                </>
              )}

              {/* Badges */}
              <div className="ph-badges-row">
                {isEditing ? (
                  <>
                    <select
                      className="form-select ph-select-auto"
                      value={editData.Priority || ''}
                      onChange={(e) => onChange({ ...editData, Priority: e.target.value }, 'Priority')}
                    >
                      <option value="">Priority...</option>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="No Urgency">No Urgency</option>
                    </select>
                    <select
                      className="form-select ph-select-auto"
                      value={editData.Status || ''}
                      onChange={(e) => onChange({ ...editData, Status: e.target.value }, 'Status')}
                    >
                      <option value="">Status...</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Do Not Contact">Do Not Contact</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span className={`badge ${getPriorityClass(contact.Priority)}`}>
                      {contact.Priority || 'No Priority'}
                    </span>
                    <span className={`badge ${getStatusClass(contact.Status)}`}>
                      {contact.Status || 'No Status'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Contact Actions */}
          {!isEditing && (primaryPhone || primaryEmail) && (
            <div className="ph-contact-actions">
              {primaryPhone && (
                <div className="ph-phone-section">
                  <span className="text-muted ph-contact-label">
                    {primaryPhone}
                  </span>
                  <div className="ph-action-btns">
                    <a
                      href={`tel:${primaryPhone}`}
                      className="btn btn-primary btn-sm profile-prominent-btn ph-action-btn-inner"
                    >
                      <Phone size={14} /> Call
                    </a>
                    <a
                      href={`sms:${primaryPhone}`}
                      className="btn btn-secondary btn-sm profile-prominent-btn ph-action-btn-inner"
                    >
                      <MessageSquare size={14} /> Text
                    </a>
                  </div>
                </div>
              )}
              {primaryEmail && (
                <div className="ph-phone-section">
                  <span className="text-muted ph-contact-label">
                    {primaryEmail}
                  </span>
                  <div className="ph-action-btns">
                    <a
                      href={`mailto:${primaryEmail}`}
                      className="btn btn-secondary btn-sm profile-prominent-btn ph-action-btn-inner"
                    >
                      <Mail size={14} /> Email
                    </a>
                    <button
                      onClick={() => handleCopyEmail(primaryEmail)}
                      className="btn btn-secondary btn-sm profile-prominent-btn ph-action-btn-inner"
                    >
                      {copiedEmail === primaryEmail ? (
                        <>
                          <Check size={14} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
