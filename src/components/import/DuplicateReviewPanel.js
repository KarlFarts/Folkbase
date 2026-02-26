import { useState, useMemo } from 'react';
import { CONFIDENCE, formatMatchDetails } from '../../services/duplicateDetector';
import '../../styles/DuplicateReviewPanel.css';

/**
 * DuplicateReviewPanel Component
 * Displays side-by-side comparison of duplicate contacts
 * Allows user to choose action: Skip, Merge, or Add Anyway
 */
function DuplicateReviewPanel({ duplicates, onDuplicatesResolved }) {
  const [duplicateActions, setDuplicateActions] = useState(() => {
    // Initialize with default actions
    const actions = {};
    duplicates.forEach((dup, index) => {
      actions[index] = dup.action || 'skip';
    });
    return actions;
  });

  const [confidenceFilter, setConfidenceFilter] = useState('all');

  // Filter duplicates based on confidence level
  const filteredDuplicates = useMemo(() => {
    if (confidenceFilter === 'all') {
      return duplicates;
    }
    return duplicates.filter((dup) => dup.confidence === confidenceFilter);
  }, [duplicates, confidenceFilter]);

  const handleActionChange = (index, action) => {
    setDuplicateActions((prev) => ({
      ...prev,
      [index]: action,
    }));
  };

  const handleBatchAction = (action, filter = 'all') => {
    const newActions = { ...duplicateActions };

    duplicates.forEach((dup, index) => {
      // Apply batch action based on filter
      if (filter === 'all' || dup.confidence === filter) {
        newActions[index] = action;
      }
    });

    setDuplicateActions(newActions);
  };

  const handleContinue = () => {
    // Update duplicates with selected actions
    const updatedDuplicates = duplicates.map((dup, index) => ({
      ...dup,
      action: duplicateActions[index],
    }));

    onDuplicatesResolved(updatedDuplicates);
  };

  // Count actions for summary
  const actionCounts = useMemo(() => {
    const counts = { skip: 0, merge: 0, add: 0 };
    Object.values(duplicateActions).forEach((action) => {
      counts[action] = (counts[action] || 0) + 1;
    });
    return counts;
  }, [duplicateActions]);

  const highConfidenceCount = duplicates.filter((d) => d.confidence === CONFIDENCE.HIGH).length;
  const mediumConfidenceCount = duplicates.filter((d) => d.confidence === CONFIDENCE.MEDIUM).length;

  return (
    <div className="duplicate-review-panel">
      <div className="duplicate-review-header">
        <h2>Potential Duplicates Found</h2>
        <p>
          Found {duplicates.length} potential duplicate(s). Review each match and choose an action.
        </p>
      </div>

      <div className="duplicate-filters">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${confidenceFilter === 'all' ? 'active' : ''}`}
            onClick={() => setConfidenceFilter('all')}
          >
            All ({duplicates.length})
          </button>
          <button
            className={`filter-btn ${confidenceFilter === CONFIDENCE.HIGH ? 'active' : ''}`}
            onClick={() => setConfidenceFilter(CONFIDENCE.HIGH)}
          >
            High Confidence ({highConfidenceCount})
          </button>
          <button
            className={`filter-btn ${confidenceFilter === CONFIDENCE.MEDIUM ? 'active' : ''}`}
            onClick={() => setConfidenceFilter(CONFIDENCE.MEDIUM)}
          >
            Medium Confidence ({mediumConfidenceCount})
          </button>
        </div>

        <div className="batch-actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleBatchAction('skip', CONFIDENCE.HIGH)}
            title="Skip all high confidence duplicates"
          >
            Skip All High Confidence
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleBatchAction('merge', confidenceFilter)}
            title="Merge all visible duplicates"
          >
            Merge All Visible
          </button>
        </div>
      </div>

      <div className="duplicates-list">
        {filteredDuplicates.length === 0 ? (
          <div className="no-duplicates-message">No duplicates match the selected filter.</div>
        ) : (
          filteredDuplicates.map((duplicate) => {
            // Find the actual index in the full duplicates array
            const actualIndex = duplicates.indexOf(duplicate);
            const action = duplicateActions[actualIndex];

            return (
              <DuplicateComparisonCard
                key={actualIndex}
                duplicate={duplicate}
                action={action}
                onActionChange={(newAction) => handleActionChange(actualIndex, newAction)}
              />
            );
          })
        )}
      </div>

      <div className="duplicate-review-footer">
        <div className="action-summary">
          <span className="summary-item">
            <strong>{actionCounts.skip}</strong> to skip
          </span>
          <span className="summary-item">
            <strong>{actionCounts.merge}</strong> to merge
          </span>
          <span className="summary-item">
            <strong>{actionCounts.add}</strong> to add anyway
          </span>
        </div>

        <button className="btn btn-primary" onClick={handleContinue}>
          Continue with Import
        </button>
      </div>
    </div>
  );
}

/**
 * DuplicateComparisonCard Component
 * Shows side-by-side comparison of a single duplicate pair
 */
function DuplicateComparisonCard({ duplicate, action, onActionChange }) {
  const { incomingContact, existingContact, confidence, matchDetails } = duplicate;

  const getConfidenceClass = () => {
    return confidence === CONFIDENCE.HIGH ? 'confidence-high' : 'confidence-medium';
  };

  const getFieldDifference = (field) => {
    const incomingValue = incomingContact[field] || '';
    const existingValue = existingContact[field] || '';

    if (incomingValue === existingValue) {
      return 'same';
    } else if (!existingValue && incomingValue) {
      return 'new';
    } else if (existingValue && !incomingValue) {
      return 'missing';
    } else {
      return 'different';
    }
  };

  const renderField = (fieldName, contact, diffType) => {
    const value = contact[fieldName] || '(empty)';
    const isEmpty = !contact[fieldName];

    return <div className={`field-value ${diffType} ${isEmpty ? 'empty' : ''}`}>{value}</div>;
  };

  const fields = ['Name', 'Phone', 'Email', 'Organization', 'Role', 'Tags'];

  return (
    <div className="duplicate-comparison-card">
      <div className="duplicate-header">
        <span className={`confidence-badge ${getConfidenceClass()}`}>{confidence} CONFIDENCE</span>
        <span className="match-details">Match: {formatMatchDetails(matchDetails)}</span>
      </div>

      <div className="duplicate-comparison">
        <div className="comparison-column">
          <h4>Incoming Contact</h4>
          {fields.map((field) => (
            <div key={field} className="field-row">
              <span className="field-label">{field}</span>
              {renderField(field, incomingContact, getFieldDifference(field))}
            </div>
          ))}
        </div>

        <div className="comparison-divider">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="comparison-column">
          <h4>Existing Contact</h4>
          {fields.map((field) => (
            <div key={field} className="field-row">
              <span className="field-label">{field}</span>
              {renderField(field, existingContact, getFieldDifference(field))}
            </div>
          ))}
          {existingContact['Contact ID'] && (
            <div className="contact-id-info">ID: {existingContact['Contact ID']}</div>
          )}
        </div>
      </div>

      <div className="duplicate-actions">
        <label>
          <input
            type="radio"
            name={`action-${duplicate.incomingIndex}`}
            value="skip"
            checked={action === 'skip'}
            onChange={() => onActionChange('skip')}
          />
          <span className="action-label">
            <strong>Skip</strong> - Don't import this contact
          </span>
        </label>

        <label>
          <input
            type="radio"
            name={`action-${duplicate.incomingIndex}`}
            value="merge"
            checked={action === 'merge'}
            onChange={() => onActionChange('merge')}
          />
          <span className="action-label">
            <strong>Merge</strong> - Update existing with new data
          </span>
        </label>

        <label>
          <input
            type="radio"
            name={`action-${duplicate.incomingIndex}`}
            value="add"
            checked={action === 'add'}
            onChange={() => onActionChange('add')}
          />
          <span className="action-label">
            <strong>Add Anyway</strong> - Import as a new contact
          </span>
        </label>
      </div>
    </div>
  );
}

export default DuplicateReviewPanel;
