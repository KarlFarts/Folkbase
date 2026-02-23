import React, { useState } from 'react';
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
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
        const newEditData = { ...editData };
        delete newEditData[fieldKey];
        setEditData(newEditData);
      } else {
        next.add(fieldKey);
        setEditData((prev) => ({ ...prev, [fieldKey]: '' }));
      }
      return next;
    });
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
      <div
        style={{
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        Select fields to update:
      </div>

      {editableFields.map((field) => (
        <div
          key={field.key}
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: selectedFields.has(field.key)
              ? 'rgba(var(--color-accent-primary-rgb), 0.05)'
              : 'transparent',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              marginBottom: 'var(--spacing-xs)',
              gap: 'var(--spacing-xs)',
            }}
          >
            <input
              type="checkbox"
              checked={selectedFields.has(field.key)}
              onChange={() => handleToggleField(field.key)}
              disabled={isLoading}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500, fontSize: '14px' }}>{field.label}</span>
          </label>

          {selectedFields.has(field.key) && (
            <div style={{ marginTop: 'var(--spacing-xs)' }}>{renderFieldInput(field)}</div>
          )}
        </div>
      ))}
    </WindowTemplate>
  );
}

export default BatchEditModal;
