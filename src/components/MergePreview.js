import React, { useState, useMemo } from 'react';
import { FIELD_DEFINITIONS } from '../utils/fieldDefinitions';
import { formatMatchDetails } from '../services/duplicateDetector';
import WindowTemplate from './WindowTemplate';

/**
 * MergePreview Component
 * Shows side-by-side comparison of two duplicate contacts
 * Allows user to select which values to keep for each field
 */
function MergePreview({ contact1, contact2, matchDetails, onConfirm, onCancel }) {
  const [selectedValues, setSelectedValues] = useState({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Get all fields that have values in either contact
  const relevantFields = useMemo(() => {
    const fieldsSet = new Set();

    FIELD_DEFINITIONS.forEach((field) => {
      if (field.hidden) return; // Skip hidden fields
      const val1 = contact1[field.key];
      const val2 = contact2[field.key];

      if (val1 || val2) {
        fieldsSet.add(field.key);
      }
    });

    return Array.from(fieldsSet)
      .map((key) => FIELD_DEFINITIONS.find((f) => f.key === key))
      .filter(Boolean);
  }, [contact1, contact2]);

  // Initialize selectedValues with preference for non-empty values
  const initializeSelection = () => {
    const initial = {};
    relevantFields.forEach((field) => {
      const val1 = contact1[field.key];
      const val2 = contact2[field.key];

      // If one is empty, auto-select the other
      if (!val1 && val2) {
        initial[field.key] = 'contact2';
      } else if (val1 && !val2) {
        initial[field.key] = 'contact1';
      } else if (val1 && val2) {
        // If both have values, default to contact1
        initial[field.key] = 'contact1';
      }
    });
    setSelectedValues(initial);
  };

  React.useEffect(() => {
    initializeSelection();
  }, [contact1, contact2, relevantFields]);

  const formatFieldValue = (value) => {
    if (!value) return '(empty)';
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm(selectedValues);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onCancel}
      title="Review Duplicate Merge"
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? 'Linking...' : 'Link as Duplicates'}
          </button>
        </>
      }
    >
      {/* Match confidence indicator */}
      <div className="merge-confidence">
        <h3>Match Details</h3>
        <p className="text-sm">
          {matchDetails.nameMatch ? (
            <span className="badge badge-success">Exact name match</span>
          ) : matchDetails.fuzzyNameMatch ? (
            <span className="badge badge-info">
              Similar name ({Math.round(matchDetails.nameSimilarity * 100)}%)
            </span>
          ) : null}
          {matchDetails.phoneMatch && <span className="badge badge-success">Phone match</span>}
          {matchDetails.emailMatch && <span className="badge badge-success">Email match</span>}
        </p>
        <p className="text-sm text-muted">
          These contacts appear to be duplicates based on: {formatMatchDetails(matchDetails)}
        </p>
      </div>

      {/* Contact headers */}
      <div className="merge-contact-headers">
        <div className="contact-header contact-1">
          <h4>{contact1.Name}</h4>
          <p className="text-sm text-muted">{contact1.Organization || 'No organization'}</p>
        </div>
        <div className="merge-spacer" />
        <div className="contact-header contact-2">
          <h4>{contact2.Name}</h4>
          <p className="text-sm text-muted">{contact2.Organization || 'No organization'}</p>
        </div>
      </div>

      {/* Field comparison */}
      <div className="merge-fields">
        {relevantFields.length === 0 ? (
          <p className="text-muted">No fields to compare</p>
        ) : (
          relevantFields.map((field) => {
            const val1 = contact1[field.key];
            const val2 = contact2[field.key];
            const hasConflict = val1 && val2 && val1 !== val2;
            const selected = selectedValues[field.key];

            return (
              <div key={field.key} className={`merge-field ${hasConflict ? 'has-conflict' : ''}`}>
                <div className="merge-field-label">
                  <label>{field.label}</label>
                  {hasConflict && <span className="conflict-badge">Conflicting values</span>}
                </div>

                <div className="merge-field-values">
                  <div className="field-option">
                    <input
                      type="radio"
                      id={`${field.key}-1`}
                      name={field.key}
                      value="contact1"
                      checked={selected === 'contact1'}
                      onChange={(e) =>
                        setSelectedValues({
                          ...selectedValues,
                          [field.key]: e.target.value,
                        })
                      }
                      disabled={!val1}
                    />
                    <label htmlFor={`${field.key}-1`}>
                      <span className="field-value">{formatFieldValue(val1)}</span>
                    </label>
                  </div>

                  <div className="field-option">
                    <input
                      type="radio"
                      id={`${field.key}-2`}
                      name={field.key}
                      value="contact2"
                      checked={selected === 'contact2'}
                      onChange={(e) =>
                        setSelectedValues({
                          ...selectedValues,
                          [field.key]: e.target.value,
                        })
                      }
                      disabled={!val2}
                    />
                    <label htmlFor={`${field.key}-2`}>
                      <span className="field-value">{formatFieldValue(val2)}</span>
                    </label>
                  </div>

                  <div className="field-option field-skip">
                    <input
                      type="radio"
                      id={`${field.key}-skip`}
                      name={field.key}
                      value="skip"
                      checked={selected === 'skip'}
                      onChange={(e) =>
                        setSelectedValues({
                          ...selectedValues,
                          [field.key]: e.target.value,
                        })
                      }
                    />
                    <label htmlFor={`${field.key}-skip`}>
                      <span className="field-value">Skip this field</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="merge-info-box">
        <p className="text-sm">
          <strong>Note:</strong> Both contacts will be kept in the system and linked as duplicates.
          You can separate them later if needed.
        </p>
      </div>
    </WindowTemplate>
  );
}

export default MergePreview;
