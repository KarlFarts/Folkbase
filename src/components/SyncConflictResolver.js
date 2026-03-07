import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getConflictsForLink, resolveConflict } from '../services/contactLinkService';
import WindowTemplate from './WindowTemplate';
import './SyncConflictResolver.css';

/**
 * SyncConflictResolver Component
 *
 * Modal for resolving sync conflicts between linked contacts.
 * Shows side-by-side comparison and allows user to choose resolution.
 *
 * Props:
 * - linkId: Contact link ID with conflicts
 * - sheetId: Google Sheet ID for the current workspace
 * - isOpen: Boolean to control modal visibility
 * - onClose: Callback when modal closes
 * - onResolved: Callback when all conflicts resolved
 */

const SyncConflictResolver = ({ linkId, sheetId, isOpen, onClose, onResolved }) => {
  const { accessToken, user } = useAuth();
  const { notify } = useNotification();
  const [conflicts, setConflicts] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [customValues, setCustomValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isOpen && linkId && sheetId) {
      loadConflicts();
    }
  }, [isOpen, linkId, sheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConflicts = async () => {
    if (!accessToken || !sheetId) {
      notify.error('Unable to load conflicts. Please refresh and try again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const conflictList = await getConflictsForLink(accessToken, sheetId, linkId);
      setConflicts(conflictList);

      // Initialize resolutions to null (user must choose)
      const initialResolutions = {};
      conflictList.forEach((conflict) => {
        initialResolutions[conflict.id] = null;
      });
      setResolutions(initialResolutions);
    } catch {
      notify.error('Failed to load conflicts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionChange = (conflictId, resolution) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictId]: resolution,
    }));
  };

  const handleCustomValueChange = (conflictId, value) => {
    setCustomValues((prev) => ({
      ...prev,
      [conflictId]: value,
    }));
  };

  const handleResolveAll = async () => {
    // Validate all conflicts have a resolution selected
    const unresolved = conflicts.filter((c) => !resolutions[c.id]);
    if (unresolved.length > 0) {
      notify.warning('Please select a resolution for all conflicts.');
      return;
    }

    // Validate custom values if needed
    const needsCustom = Object.entries(resolutions).filter(
      ([_, resolution]) => resolution === 'use_custom'
    );
    const missingCustom = needsCustom.filter(([conflictId]) => !customValues[conflictId]?.trim());
    if (missingCustom.length > 0) {
      notify.warning('Please provide custom values for selected fields.');
      return;
    }

    setResolving(true);
    try {
      // Resolve each conflict
      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.id];
        const customValue = customValues[conflict.id] || null;

        await resolveConflict(
          accessToken,
          sheetId,
          conflict.id,
          resolution,
          customValue,
          user.email
        );
      }

      notify.success('All conflicts resolved successfully.');
      if (onResolved) {
        onResolved();
      }
      onClose();
    } catch {
      notify.error('Failed to resolve some conflicts. Check your connection and try again.');
    } finally {
      setResolving(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || timestamp;
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const allResolved = conflicts.every((c) => resolutions[c.id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div
          className="loading-state"
          style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}
        >
          <div className="loading-spinner"></div>
          <p>Loading conflicts...</p>
        </div>
      );
    }

    if (conflicts.length === 0) {
      return (
        <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <Check size={48} className="success-icon" />
          <h3>No Conflicts</h3>
          <p>All fields are in sync!</p>
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      );
    }

    return (
      <>
        <p className="conflict-description">
          The same fields were edited in both workspaces. Choose which value to keep for each field.
        </p>

        <div className="conflicts-list">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="conflict-item">
              <div className="conflict-field-name">
                <strong>{conflict.field_name}</strong>
              </div>

              <div className="conflict-values">
                <div className="value-option">
                  <label className="value-option-label">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="use_source"
                      checked={resolutions[conflict.id] === 'use_source'}
                      onChange={() => handleResolutionChange(conflict.id, 'use_source')}
                    />
                    <div className="value-content">
                      <div className="value-header">
                        <span className="value-source">Personal / Source</span>
                        <span className="value-timestamp">
                          {formatTimestamp(conflict.source_modified_at)}
                        </span>
                      </div>
                      <div className="value-text">
                        {conflict.source_value || <em className="empty-value">(empty)</em>}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="value-option">
                  <label className="value-option-label">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="use_target"
                      checked={resolutions[conflict.id] === 'use_target'}
                      onChange={() => handleResolutionChange(conflict.id, 'use_target')}
                    />
                    <div className="value-content">
                      <div className="value-header">
                        <span className="value-source">Workspace / Target</span>
                        <span className="value-timestamp">
                          {formatTimestamp(conflict.target_modified_at)}
                        </span>
                      </div>
                      <div className="value-text">
                        {conflict.target_value || <em className="empty-value">(empty)</em>}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="value-option custom-option">
                  <label className="value-option-label">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="use_custom"
                      checked={resolutions[conflict.id] === 'use_custom'}
                      onChange={() => handleResolutionChange(conflict.id, 'use_custom')}
                    />
                    <div className="value-content">
                      <div className="value-header">
                        <span className="value-source">Use Custom Value</span>
                      </div>
                      <input
                        type="text"
                        className="custom-value-input"
                        placeholder="Enter custom value"
                        value={customValues[conflict.id] || ''}
                        onChange={(e) => handleCustomValueChange(conflict.id, e.target.value)}
                        disabled={resolutions[conflict.id] !== 'use_custom'}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <AlertTriangle size={20} className="warning-icon" />
          Resolve Sync Conflicts
        </span>
      }
      size="lg"
      className="sync-conflict-modal"
      footer={
        conflicts.length > 0 ? (
          <>
            <button onClick={onClose} className="btn btn-secondary" disabled={resolving}>
              Cancel
            </button>
            <button
              onClick={handleResolveAll}
              className="btn btn-primary"
              disabled={!allResolved || resolving}
            >
              {resolving
                ? 'Resolving...'
                : `Resolve ${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`}
            </button>
          </>
        ) : null
      }
    >
      {renderContent()}
    </WindowTemplate>
  );
};

export default SyncConflictResolver;
