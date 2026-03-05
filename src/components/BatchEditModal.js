import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { FIELD_DEFINITIONS } from '../utils/fieldDefinitions';
import WindowTemplate from './WindowTemplate';

/**
 * BatchEditModal - Modal for editing multiple contacts at once
 *
 * Only allows editing "safe" fields that don't require complex conflict resolution:
 * - QuickFlags (tags)
 * - RelationshipStrength (select)
 * - ProjectTags (tags)
 * - PreferredContactMethod (select)
 */

const BATCH_EDITABLE_FIELDS = [
  'QuickFlags',
  'RelationshipStrength',
  'ProjectTags',
  'PreferredContactMethod',
];

function BatchEditModal({ isOpen, selectedCount, onApply, onCancel, isLoading }) {
  const { notify } = useNotification();
  const [editData, setEditData] = useState({});
  const [selectedFields, setSelectedFields] = useState(new Set());

  // Get only batch-editable fields
  const editableFields = FIELD_DEFINITIONS.filter((field) =>
    BATCH_EDITABLE_FIELDS.includes(field.key)
  );

  const handleToggleField = (fieldKey) => {
    if (selectedFields.has(fieldKey)) {
      setSelectedFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
      setEditData((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    } else {
      setSelectedFields((prev) => new Set([...prev, fieldKey]));
      setEditData((prev) => ({ ...prev, [fieldKey]: '' }));
    }
  };

  const handleFieldChange = (fieldKey, value) => {
    setEditData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleApply = () => {
    const updates = {};
    selectedFields.forEach((fieldKey) => {
      if (editData[fieldKey] !== undefined && editData[fieldKey] !== '') {
        updates[fieldKey] = editData[fieldKey];
      }
    });

    if (Object.keys(updates).length === 0) {
      notify.warning('Please enter values for at least one field');
      return;
    }

    onApply(updates);
    // Reset form
    setEditData({});
    setSelectedFields(new Set());
  };

  const renderFieldInput = (field) => {
    const value = editData[field.key] || '';

    if (!selectedFields.has(field.key)) {
      return null;
    }

    switch (field.type) {
      case 'select':
        return (
          <select
            className="form-select"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'tags':
        return (
          <input
            type="text"
            className="form-input"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            disabled={isLoading}
          />
        );

      default:
        return (
          <input
            type="text"
            className="form-input"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            disabled={isLoading}
          />
        );
    }
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onCancel}
      title="Batch Edit"
      subtitle={`Updating ${selectedCount} contact${selectedCount !== 1 ? 's' : ''}`}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={isLoading || selectedFields.size === 0}
          >
            {isLoading ? 'Applying...' : 'Apply to All'}
          </button>
        </>
      }
    >
      <div className="bem-hint">Select fields to update:</div>

      {editableFields.map((field) => (
        <div
          key={field.key}
          className={`bem-field-wrapper${selectedFields.has(field.key) ? ' bem-field-wrapper--selected' : ''}`}
        >
          <label className="bem-field-label">
            <input
              type="checkbox"
              checked={selectedFields.has(field.key)}
              onChange={() => handleToggleField(field.key)}
              disabled={isLoading}
              className="bem-checkbox"
            />
            <span className="bem-field-name">{field.label}</span>
          </label>

          {selectedFields.has(field.key) && (
            <div className="bem-field-input">{renderFieldInput(field)}</div>
          )}
        </div>
      ))}
    </WindowTemplate>
  );
}

export default BatchEditModal;
