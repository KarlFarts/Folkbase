import React from 'react';
import { getFieldsByGroup, FIELD_GROUPS } from '../../utils/fieldDefinitions';
import { sanitizeUrl, buildTelUrl, buildSmsUrl, buildMailtoUrl } from '../../utils/sanitize';

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

/**
 * ProfileTabs - Tab content for contact profile sections
 */
function ProfileTabs({ activeTab, contact, isEditing, editData, onChange }) {
  // Map tab ID to field group (new 7-tab structure)
  const tabToGroup = {
    names: FIELD_GROUPS.NAMES,
    contact: FIELD_GROUPS.CONTACT,
    professional: FIELD_GROUPS.PROFESSIONAL,
    online: FIELD_GROUPS.ONLINE,
    relationships: FIELD_GROUPS.RELATIONSHIPS,
    mailing: FIELD_GROUPS.MAILING,
    assets: FIELD_GROUPS.ASSETS,
    demographics: FIELD_GROUPS.DEMOGRAPHICS,
    contact_prefs: FIELD_GROUPS.CONTACT_PREFS,
    community: FIELD_GROUPS.COMMUNITY,
    donor: FIELD_GROUPS.DONOR,
    privacy: FIELD_GROUPS.PRIVACY,
  };

  const group = tabToGroup[activeTab];
  // In dev mode, include pendingBackend fields; in production, only existing fields
  const fields = getFieldsByGroup(group, false, isDevMode);

  if (fields.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <p className="text-muted">No fields available for this tab yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={contact[field.key]}
          isEditing={isEditing}
          editValue={editData[field.key]}
          onChange={(value) => onChange({ ...editData, [field.key]: value }, field.key)}
        />
      ))}
    </div>
  );
}

/**
 * FieldRenderer - Renders a single field with label and value/input
 */
function FieldRenderer({ field, value, isEditing, editValue, onChange }) {
  return (
    <div>
      <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)' }}>
        {field.label}
      </label>
      {isEditing ? (
        <EditableField field={field} value={editValue} onChange={onChange} />
      ) : (
        <DisplayField field={field} value={value} />
      )}
    </div>
  );
}

/**
 * EditableField - Form input for editing field values
 */
function EditableField({ field, value, onChange }) {
  switch (field.type) {
    case 'text':
    case 'multi-text':
      return (
        <input
          type="text"
          className="form-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );

    case 'textarea':
      return (
        <textarea
          className="form-textarea"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      );

    case 'select':
      return (
        <select
          className="form-select"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'combobox': {
      const inputId = `combobox-${field.key.replace(/[^a-zA-Z0-9]/g, '-')}`;
      return (
        <div>
          <input
            type="text"
            className="form-input"
            list={inputId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          <datalist id={inputId}>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    case 'tags': {
      // Extract all tags from all contacts for autocomplete
      const allTags = (() => {
        try {
          const tagSet = new Set();
          // Try to get all contacts from contacts data
          const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
          contacts.forEach((contact) => {
            if (contact.Tags) {
              contact.Tags.split(',').forEach((tag) => {
                tagSet.add(tag.trim());
              });
            }
          });
          return Array.from(tagSet).sort();
        } catch {
          return [];
        }
      })();

      return (
        <div>
          <input
            type="text"
            className="form-input"
            list="tag-suggestions"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          <datalist id="tag-suggestions">
            {allTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>
      );
    }

    case 'date':
      return (
        <input
          type="date"
          className="form-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'url':
      return (
        <input
          type="url"
          className="form-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );

    default:
      return (
        <input
          type="text"
          className="form-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }
}

/**
 * DisplayField - Read-only display of field value
 */
function DisplayField({ field, value }) {
  const parseMultiple = (val) => {
    if (!val) return [];
    return val
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  if (!value) {
    return <p className="text-muted">Not set</p>;
  }

  switch (field.type) {
    case 'multi-text': {
      const items = parseMultiple(value);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
            >
              <span>{item}</span>
              {field.actionable && field.actions?.includes('call') && (
                <a href={buildTelUrl(item)} className="btn btn-ghost btn-sm">
                  Call
                </a>
              )}
              {field.actionable && field.actions?.includes('text') && (
                <a href={buildSmsUrl(item)} className="btn btn-ghost btn-sm">
                  Text
                </a>
              )}
              {field.actionable && field.actions?.includes('email') && (
                <a href={buildMailtoUrl(item)} className="btn btn-ghost btn-sm">
                  Email
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    case 'textarea':
      return <p style={{ whiteSpace: 'pre-wrap' }}>{value}</p>;

    case 'tags': {
      const tags = parseMultiple(value);
      return (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {tags.map((tag, i) => (
            <span key={i} className="tag">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    case 'url': {
      const safeUrl = sanitizeUrl(value);
      return safeUrl ? (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-primary)' }}
        >
          {value}
        </a>
      ) : (
        <p className="text-muted">Invalid URL</p>
      );
    }

    default:
      return <p>{value}</p>;
  }
}

export default ProfileTabs;
