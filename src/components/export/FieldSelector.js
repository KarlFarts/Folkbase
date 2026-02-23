import React from 'react';
import { FIELD_PRESETS } from '../../services/exportService';

function FieldSelector({
  availableFields,
  selectedFields,
  onFieldsChange,
  currentPreset,
  onPresetChange,
}) {
  const handlePresetChange = (e) => {
    const presetName = e.target.value;
    onPresetChange(presetName);

    if (presetName && FIELD_PRESETS[presetName]) {
      onFieldsChange(FIELD_PRESETS[presetName]);
    }
  };

  const handleFieldToggle = (field) => {
    const newFields = selectedFields.includes(field)
      ? selectedFields.filter((f) => f !== field)
      : [...selectedFields, field];

    onFieldsChange(newFields);

    // Check if selection matches a preset
    const matchingPreset = Object.keys(FIELD_PRESETS).find((presetKey) => {
      const preset = FIELD_PRESETS[presetKey];
      return preset.length === newFields.length && preset.every((f) => newFields.includes(f));
    });

    onPresetChange(matchingPreset || 'custom');
  };

  const handleSelectAll = () => {
    onFieldsChange(availableFields);
    onPresetChange('custom');
  };

  const handleSelectNone = () => {
    onFieldsChange([]);
    onPresetChange('custom');
  };

  return (
    <div className="field-selector">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <div>
          <label htmlFor="preset-select" className="form-label">
            Field Preset
          </label>
          <select
            id="preset-select"
            className="form-select"
            value={currentPreset}
            onChange={handlePresetChange}
            style={{ width: '200px' }}
          >
            <option value="basic">Basic Info</option>
            <option value="full">Full Contact</option>
            <option value="organizer">Outreach Export</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button type="button" className="btn btn-text" onClick={handleSelectAll}>
            Select All
          </button>
          <button type="button" className="btn btn-text" onClick={handleSelectNone}>
            Select None
          </button>
        </div>
      </div>

      <div
        className="field-checkboxes"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-md)',
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {availableFields.map((field) => (
          <label
            key={field}
            className="checkbox-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              borderRadius: 'var(--border-radius)',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-background-hover)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              onChange={() => handleFieldToggle(field)}
              style={{ cursor: 'pointer' }}
            />
            <span>{field}</span>
          </label>
        ))}
      </div>

      <p className="text-muted" style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.9em' }}>
        {selectedFields.length} of {availableFields.length} fields selected
      </p>
    </div>
  );
}

export default FieldSelector;
