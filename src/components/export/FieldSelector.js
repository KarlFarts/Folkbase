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
      <div className="fs-header">
        <div>
          <label htmlFor="preset-select" className="form-label">
            Field Preset
          </label>
          <select
            id="preset-select"
            className="form-select"
            value={currentPreset}
            onChange={handlePresetChange}
            className="fs-preset-select"
          >
            <option value="basic">Basic Info</option>
            <option value="full">Full Contact</option>
            <option value="organizer">Outreach Export</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="fs-btn-row">
          <button type="button" className="btn btn-text" onClick={handleSelectAll}>
            Select All
          </button>
          <button type="button" className="btn btn-text" onClick={handleSelectNone}>
            Select None
          </button>
        </div>
      </div>

      <div className="field-checkboxes fs-checkboxes">
        {availableFields.map((field) => (
          <label
            key={field}
            className="checkbox-label fs-field-label"
          >
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              onChange={() => handleFieldToggle(field)}
              className="fs-field-checkbox"
            />
            <span>{field}</span>
          </label>
        ))}
      </div>

      <p className="text-muted fs-count">
        {selectedFields.length} of {availableFields.length} fields selected
      </p>
    </div>
  );
}

export default FieldSelector;
