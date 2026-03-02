import { X } from 'lucide-react';
import { getFieldsByGroup, FIELD_GROUPS } from '../../utils/fieldDefinitions';
import { sanitizeUrl, buildTelUrl, buildSmsUrl, buildMailtoUrl } from '../../utils/sanitize';

// Check if we're in dev mode
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

/**
 * ProfileTabs - Tab content for contact profile sections.
 * Can be driven by `group` directly (new collapsible layout)
 * or by legacy `activeTab` prop (backward compat).
 */
function ProfileTabs({ activeTab, group: groupProp, contact, isEditing, editData, onChange }) {
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

  const group = groupProp || tabToGroup[activeTab];
  // In dev mode, include pendingBackend fields; in production, only existing fields
  const fields = getFieldsByGroup(group, false, isDevMode);

  // In view mode, filter out fields with no value
  const visibleFields = isEditing
    ? fields
    : fields.filter((field) => {
        const val = contact[field.key];
        return val !== undefined && val !== null && val !== '';
      });

  if (fields.length === 0) {
    return (
      <div className="empty-state pt-empty-state">
        <p className="text-muted">No fields available for this tab yet</p>
      </div>
    );
  }

  if (!isEditing && visibleFields.length === 0) {
    return (
      <div className="pt-empty-state">
        <p className="text-muted">No information added yet</p>
      </div>
    );
  }

  return (
    <div className="pt-fields-list">
      {visibleFields.map((field) => (
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
      <label className="form-label pt-field-label">
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
        <div className="field-with-clear">
          <input
            type="text"
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="field-with-clear">
          <textarea
            className="form-textarea"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="field-with-clear">
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
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );

    case 'combobox': {
      const inputId = `combobox-${field.key.replace(/[^a-zA-Z0-9]/g, '-')}`;
      return (
        <div className="field-with-clear">
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
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );
    }

    case 'tags': {
      const tagArray = value
        ? value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const removeTag = (indexToRemove) => {
        const newTags = tagArray.filter((_, i) => i !== indexToRemove);
        onChange(newTags.join(', '));
      };

      const addTag = (newTag) => {
        const trimmed = newTag.trim();
        if (trimmed && !tagArray.includes(trimmed)) {
          onChange([...tagArray, trimmed].join(', '));
        }
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTag(e.target.value);
          e.target.value = '';
        }
      };

      const allTags = (() => {
        try {
          const tagSet = new Set();
          const contacts = JSON.parse(localStorage.getItem('dev_contacts') || '[]');
          contacts.forEach((c) => {
            if (c.Tags) {
              c.Tags.split(',').forEach((tag) => tagSet.add(tag.trim()));
            }
          });
          return Array.from(tagSet).sort();
        } catch {
          return [];
        }
      })();

      const inputId = `tag-suggestions-${field.key.replace(/[^a-zA-Z0-9]/g, '-')}`;

      return (
        <div>
          <div className="tags-edit-container">
            {tagArray.map((tag, i) => (
              <span key={`${tag}-${i}`} className="tag-removable">
                {tag}
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={() => removeTag(i)}
                  title={`Remove ${tag}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              type="text"
              className="form-input"
              list={inputId}
              placeholder={tagArray.length === 0 ? field.placeholder : 'Add tag...'}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  addTag(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <datalist id={inputId}>
            {allTags
              .filter((t) => !tagArray.includes(t))
              .map((tag) => (
                <option key={tag} value={tag} />
              ))}
          </datalist>
        </div>
      );
    }

    case 'date':
      return (
        <div className="field-with-clear">
          <input
            type="date"
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );

    case 'url':
      return (
        <div className="field-with-clear">
          <input
            type="url"
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {value && (
            <button
              type="button"
              className="field-clear-btn"
              onClick={() => onChange('')}
              title="Clear field"
            >
              <X size={12} />
            </button>
          )}
        </div>
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
    return null;
  }

  switch (field.type) {
    case 'multi-text': {
      const items = parseMultiple(value);
      return (
        <div className="pt-multi-text-list">
          {items.map((item, i) => (
            <div key={i} className="pt-multi-text-item">
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
      return <p className="pt-textarea-display">{value}</p>;

    case 'tags': {
      const tags = parseMultiple(value);
      return (
        <div className="pt-tags-display">
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
          className="pt-url-link"
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
