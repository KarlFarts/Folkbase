import React, { useState } from 'react';
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 'var(--spacing-lg)',
            alignItems: 'flex-start',
          }}
        >
          {/* Left Column: Avatar + Identity Info */}
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
                alignItems: 'center',
              }}
            >
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
                  onColorChange={(color) => onChange({ ...editData, 'Avatar Color': color || '' })}
                  onIconChange={(icon) => onChange({ ...editData, 'Avatar Icon': icon || '' })}
                />
              )}
            </div>

            {/* Identity Info */}
            <div style={{ flex: 1 }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={editData.Name || ''}
                    onChange={(e) => onChange({ ...editData, Name: e.target.value })}
                    placeholder="Full name"
                    style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600' }}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      value={editData.Organization || ''}
                      onChange={(e) => onChange({ ...editData, Organization: e.target.value })}
                      placeholder="Organization"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editData.Role || ''}
                      onChange={(e) => onChange({ ...editData, Role: e.target.value })}
                      placeholder="Role"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>{displayName}</h2>
                  {(contact.Organization || contact.Role) && (
                    <p
                      className="text-muted"
                      style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}
                    >
                      {contact.Organization}
                      {contact.Organization && contact.Role && ' · '}
                      {contact.Role}
                    </p>
                  )}
                </>
              )}

              {/* Badges */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-sm)',
                }}
              >
                {isEditing ? (
                  <>
                    <select
                      className="form-select"
                      value={editData.Priority || ''}
                      onChange={(e) => onChange({ ...editData, Priority: e.target.value })}
                      style={{ width: 'auto' }}
                    >
                      <option value="">Priority...</option>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="No Urgency">No Urgency</option>
                    </select>
                    <select
                      className="form-select"
                      value={editData.Status || ''}
                      onChange={(e) => onChange({ ...editData, Status: e.target.value })}
                      style={{ width: 'auto' }}
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)',
                minWidth: '200px',
                borderLeft: '1px solid var(--color-bg-tertiary)',
                paddingLeft: 'var(--spacing-lg)',
              }}
            >
              {primaryPhone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <span
                    className="text-muted"
                    style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500' }}
                  >
                    {primaryPhone}
                  </span>
                  <div
                    style={{ display: 'flex', gap: 'var(--spacing-xs)', flexDirection: 'column' }}
                  >
                    <a
                      href={`tel:${primaryPhone}`}
                      className="btn btn-primary btn-sm profile-prominent-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <Phone size={14} /> Call
                    </a>
                    <a
                      href={`sms:${primaryPhone}`}
                      className="btn btn-secondary btn-sm profile-prominent-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <MessageSquare size={14} /> Text
                    </a>
                  </div>
                </div>
              )}
              {primaryEmail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <span
                    className="text-muted"
                    style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500' }}
                  >
                    {primaryEmail}
                  </span>
                  <div
                    style={{ display: 'flex', gap: 'var(--spacing-xs)', flexDirection: 'column' }}
                  >
                    <a
                      href={`mailto:${primaryEmail}`}
                      className="btn btn-secondary btn-sm profile-prominent-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <Mail size={14} /> Email
                    </a>
                    <button
                      onClick={() => handleCopyEmail(primaryEmail)}
                      className="btn btn-secondary btn-sm profile-prominent-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
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
