import { error as logError } from '../utils/logger';
import { useState, useEffect } from 'react';
import IconMap from './IconMap';
import WindowTemplate from './WindowTemplate';
import {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_SUBTYPES,
  RELATIONSHIP_STRENGTH,
} from '../utils/devModeWrapper';
import {
  ENTITY_TYPES,
  ENTITY_CONFIG,
  RELATIONSHIP_TYPES as ENTITY_RELATIONSHIP_TYPES,
  getValidRelationshipTypes,
} from '../utils/entityTypes';

/**
 * AddRelationshipModal Component
 *
 * Modal form for creating a new relationship between entities.
 * Supports multi-entity relationships (contacts, organizations, locations).
 *
 * @param {Object} props
 * @param {string} props.sourceEntityType - Type of source entity (Contact, Organization, Location)
 * @param {string} props.sourceEntityId - ID of the source entity
 * @param {string} props.sourceEntityName - Name of the source entity (for display)
 * @param {string} props.sourceContactId - (Legacy) ID of the source contact
 * @param {string} props.sourceContactName - (Legacy) Name of the source contact
 * @param {Array} props.contacts - Array of all contacts
 * @param {Array} props.organizations - Array of all organizations (for multi-entity mode)
 * @param {Array} props.locations - Array of all locations (for multi-entity mode)
 * @param {Function} props.onSave - Callback when relationship is saved
 * @param {Function} props.onClose - Callback to close the modal
 * @param {boolean} props.isMultiEntity - True if multi-entity mode (default: false)
 */
export default function AddRelationshipModal({
  sourceEntityType,
  sourceEntityId,
  sourceEntityName,
  sourceContactId,
  sourceContactName,
  contacts,
  organizations = [],
  locations = [],
  onSave,
  onClose,
  isMultiEntity = false,
}) {
  // Determine actual source values (support both legacy and new props)
  const actualSourceType = sourceEntityType || ENTITY_TYPES.CONTACT;
  const actualSourceId = sourceEntityId || sourceContactId;
  const actualSourceName = sourceEntityName || sourceContactName;

  const [formData, setFormData] = useState({
    'Target Entity Type': ENTITY_TYPES.CONTACT,
    'Target Entity ID': '',
    'Relationship Type': RELATIONSHIP_TYPES.PROFESSIONAL,
    'Relationship Subtype': '',
    'Is Directional': false,
    Strength: RELATIONSHIP_STRENGTH.GOOD,
    Notes: '',
    'Date Established': '',
  });

  const [availableSubtypes, setAvailableSubtypes] = useState([]);
  const [validRelationshipTypes, setValidRelationshipTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available target entities based on selected type
  const getAvailableTargets = () => {
    const targetType = formData['Target Entity Type'];

    if (targetType === ENTITY_TYPES.CONTACT) {
      return contacts
        .filter(
          (c) => !(actualSourceType === ENTITY_TYPES.CONTACT && c['Contact ID'] === actualSourceId)
        )
        .map((c) => ({
          id: c['Contact ID'],
          name: c.Name,
          subtitle: c.Organization || '',
          icon: ENTITY_CONFIG.Contact.icon,
        }));
    } else if (targetType === ENTITY_TYPES.ORGANIZATION) {
      return organizations
        .filter(
          (o) =>
            !(
              actualSourceType === ENTITY_TYPES.ORGANIZATION &&
              o['Organization ID'] === actualSourceId
            )
        )
        .map((o) => ({
          id: o['Organization ID'],
          name: o.Name,
          subtitle: o.Type || '',
          icon: ENTITY_CONFIG.Organization.icon,
        }));
    } else if (targetType === ENTITY_TYPES.LOCATION) {
      return locations
        .filter(
          (l) =>
            !(actualSourceType === ENTITY_TYPES.LOCATION && l['Location ID'] === actualSourceId)
        )
        .map((l) => ({
          id: l['Location ID'],
          name: l.Name,
          subtitle: l.Type || '',
          icon: ENTITY_CONFIG.Location.icon,
        }));
    }

    return [];
  };

  // Update valid relationship types when entity types change
  useEffect(() => {
    if (isMultiEntity) {
      const targetType = formData['Target Entity Type'];
      const validTypes = getValidRelationshipTypes(actualSourceType, targetType);
      setValidRelationshipTypes(validTypes);

      // Reset relationship type if not valid
      if (!validTypes.includes(formData['Relationship Type'])) {
        setFormData((prev) => ({
          ...prev,
          'Relationship Type': validTypes[0] || RELATIONSHIP_TYPES.CUSTOM,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualSourceType, isMultiEntity]);

  // Update subtypes when relationship type changes
  useEffect(() => {
    const type = formData['Relationship Type'];

    if (isMultiEntity) {
      // Use entity relationship types
      const typeConfig = ENTITY_RELATIONSHIP_TYPES[type];
      const newSubtypes = typeConfig?.subtypes || [];
      setAvailableSubtypes(newSubtypes);
    } else {
      // Legacy mode: use contact relationship subtypes
      const newSubtypes = RELATIONSHIP_SUBTYPES[type] || [];
      setAvailableSubtypes(newSubtypes);
    }

    // Reset subtype if it's not in the new list
    if (
      formData['Relationship Subtype'] &&
      !availableSubtypes.includes(formData['Relationship Subtype'])
    ) {
      setFormData((prev) => ({ ...prev, 'Relationship Subtype': '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiEntity]);

  // Reset target entity when type changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, 'Target Entity ID': '' }));
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData['Target Entity ID']) {
      newErrors['Target Entity ID'] =
        `Please select a ${formData['Target Entity Type'].toLowerCase()}`;
    }

    if (!formData['Relationship Type']) {
      newErrors['Relationship Type'] = 'Please select a relationship type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let relationshipData;

      if (isMultiEntity) {
        // Multi-entity mode: include entity types
        relationshipData = {
          'Source Entity Type': actualSourceType,
          'Source Entity ID': actualSourceId,
          'Target Entity Type': formData['Target Entity Type'],
          'Target Entity ID': formData['Target Entity ID'],
          'Relationship Type': formData['Relationship Type'],
          'Relationship Subtype': formData['Relationship Subtype'],
          'Is Directional': formData['Is Directional'],
          Strength: formData.Strength,
          Notes: formData.Notes,
          'Date Established': formData['Date Established'],
        };
      } else {
        // Legacy mode: contact-only
        relationshipData = {
          'Source Contact ID': actualSourceId,
          'Target Contact ID': formData['Target Entity ID'],
          'Relationship Type': formData['Relationship Type'],
          'Relationship Subtype': formData['Relationship Subtype'],
          'Is Directional': formData['Is Directional'],
          Strength: formData.Strength,
          Notes: formData.Notes,
          'Date Established': formData['Date Established'],
        };
      }

      await onSave(relationshipData);
      onClose();
    } catch (error) {
      logError('Error creating relationship:', error);
      setErrors({ submit: error.message || 'Failed to create relationship' });
      setIsSubmitting(false);
    }
  };

  const availableTargets = getAvailableTargets();
  const sourceConfig = ENTITY_CONFIG[actualSourceType];

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title="Add Relationship"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Adding...' : 'Add Relationship'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Source Entity (read-only) */}
        <div className="arm-field-group">
          <label className="arm-label">From</label>
          <div
            className="arm-source-entity"
            style={{
              border: `2px solid ${sourceConfig?.color || 'var(--border-color-default)'}`,
              background: `${sourceConfig?.color || 'var(--border-color-default)'}11`,
            }}
          >
            <IconMap name={sourceConfig?.icon} size={20} />
            <div>
              <div className="arm-entity-name">{actualSourceName}</div>
              <div className="arm-entity-type">{actualSourceType}</div>
            </div>
          </div>
        </div>

        {/* Target Entity Type Selector (multi-entity mode only) */}
        {isMultiEntity && (
          <div className="arm-field-group">
            <label className="arm-label">Connect to Entity Type</label>
            <div className="arm-entity-type-row">
              {Object.entries(ENTITY_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('Target Entity Type', type)}
                  className={`arm-entity-type-btn ${formData['Target Entity Type'] === type ? 'arm-entity-type-btn--active' : ''}`}
                  style={
                    formData['Target Entity Type'] === type
                      ? { border: `2px solid ${config.color}`, background: `${config.color}11` }
                      : undefined
                  }
                >
                  <IconMap name={config.icon} size={24} />
                  <span className="arm-entity-type-label">{type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Target Entity Selector */}
        <div className="arm-field-group">
          <label className="arm-label">
            To <span className="arm-required">*</span>
          </label>
          <select
            value={formData['Target Entity ID']}
            onChange={(e) => handleChange('Target Entity ID', e.target.value)}
            className={`arm-select${errors['Target Entity ID'] ? ' arm-select--error' : ''}`}
          >
            <option value="">
              Select{' '}
              {isMultiEntity ? `a ${formData['Target Entity Type'].toLowerCase()}` : 'a contact'}
              ...
            </option>
            {availableTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} {target.subtitle && `(${target.subtitle})`}
              </option>
            ))}
          </select>
          {errors['Target Entity ID'] && (
            <div className="arm-error-msg">{errors['Target Entity ID']}</div>
          )}
        </div>

        {/* Relationship Type */}
        <div className="arm-field-group">
          <label className="arm-label">
            Relationship Type <span className="arm-required">*</span>
          </label>
          <select
            value={formData['Relationship Type']}
            onChange={(e) => handleChange('Relationship Type', e.target.value)}
            className="arm-select"
          >
            {isMultiEntity ? (
              validRelationshipTypes.map((type) => (
                <option key={type} value={type}>
                  {ENTITY_RELATIONSHIP_TYPES[type]?.label || type}
                </option>
              ))
            ) : (
              <>
                <option value={RELATIONSHIP_TYPES.FAMILIAL}>Familial</option>
                <option value={RELATIONSHIP_TYPES.PROFESSIONAL}>Professional</option>
                <option value={RELATIONSHIP_TYPES.SOCIAL}>Social</option>
                <option value={RELATIONSHIP_TYPES.CUSTOM}>Custom</option>
              </>
            )}
          </select>
        </div>

        {/* Relationship Subtype */}
        <div className="arm-field-group">
          <label className="arm-label">Specific Relationship</label>
          {availableSubtypes.length > 0 ? (
            <select
              value={formData['Relationship Subtype']}
              onChange={(e) => handleChange('Relationship Subtype', e.target.value)}
              className="arm-select"
            >
              <option value="">Select...</option>
              {availableSubtypes.map((subtype) => (
                <option key={subtype} value={subtype}>
                  {subtype}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData['Relationship Subtype']}
              onChange={(e) => handleChange('Relationship Subtype', e.target.value)}
              placeholder="Enter custom relationship type"
              className="arm-input"
            />
          )}
        </div>

        {/* Bidirectional Checkbox */}
        <div className="arm-field-group">
          <label className="arm-checkbox-label">
            <input
              type="checkbox"
              checked={!formData['Is Directional']}
              onChange={(e) => handleChange('Is Directional', !e.target.checked)}
              className="arm-checkbox"
            />
            <span className="arm-checkbox-text">Bidirectional relationship</span>
          </label>
          <div className="arm-hint">
            {formData['Is Directional']
              ? 'One-way relationship (e.g., employee → organization)'
              : 'Two-way relationship (e.g., partner ↔ partner)'}
          </div>
        </div>

        {/* Relationship Strength */}
        <div className="arm-field-group">
          <label className="arm-label">Relationship Strength</label>
          <select
            value={formData.Strength}
            onChange={(e) => handleChange('Strength', e.target.value)}
            className="arm-select"
          >
            <option value={RELATIONSHIP_STRENGTH.STRONG}>Strong</option>
            <option value={RELATIONSHIP_STRENGTH.GOOD}>Good</option>
            <option value={RELATIONSHIP_STRENGTH.DEVELOPING}>Developing</option>
            <option value={RELATIONSHIP_STRENGTH.NEW}>New</option>
            <option value={RELATIONSHIP_STRENGTH.WEAK}>Weak</option>
          </select>
        </div>

        {/* Notes */}
        <div className="arm-field-group">
          <label className="arm-label">Notes</label>
          <textarea
            value={formData.Notes}
            onChange={(e) => handleChange('Notes', e.target.value)}
            placeholder="Add context about this relationship..."
            rows={3}
            className="arm-textarea"
          />
        </div>

        {/* Date Established */}
        <div className="arm-field-group arm-field-group--last">
          <label className="arm-label">Date Established</label>
          <input
            type="date"
            value={formData['Date Established']}
            onChange={(e) => handleChange('Date Established', e.target.value)}
            className="arm-input"
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="alert alert-danger arm-submit-error">{errors.submit}</div>
        )}
      </form>
    </WindowTemplate>
  );
}
