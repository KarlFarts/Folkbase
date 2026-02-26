import React, { useState } from 'react';
import { AlertTriangle, Calendar, Database } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { resolveConflict } from '../../utils/syncEngine';
import { useNotification } from '../../contexts/NotificationContext';

function SyncConflictModal({ isOpen, onClose, conflict, onResolved, contacts = [] }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (resolution) => {
    setResolving(true);
    try {
      await resolveConflict(conflict, resolution, accessToken, sheetId, contacts);
      notify(
        `Conflict resolved: kept ${resolution === 'crm' ? 'CRM' : resolution === 'calendar' ? 'Calendar' : 'latest'} version`,
        'success'
      );
      if (onResolved) onResolved();
      onClose();
    } catch (error) {
      notify('Failed to resolve conflict: ' + error.message, 'error');
    } finally {
      setResolving(false);
    }
  };

  if (!conflict) return null;

  const { crmEvent, calendarEvent } = conflict;

  // Helper to format date/time
  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (timeStr) {
      return `${formattedDate} at ${timeStr}`;
    }
    return formattedDate;
  };

  // Compare fields and highlight differences
  const compareField = (label, crmValue, calendarValue) => {
    const isDifferent = crmValue !== calendarValue;
    return { label, crmValue, calendarValue, isDifferent };
  };

  const fields = [
    compareField('Event Name', crmEvent['Event Name'], calendarEvent.summary),
    compareField('Description', crmEvent['Description'] || '', calendarEvent.description || ''),
    compareField('Location', crmEvent['Event Location'] || '', calendarEvent.location || ''),
    compareField(
      'Date/Time',
      formatDateTime(crmEvent['Event Date'], crmEvent['Event Start Time']),
      formatDateTime(calendarEvent.start?.dateTime || calendarEvent.start?.date)
    ),
    compareField(
      'Status',
      crmEvent['Event Status'] || 'Active',
      calendarEvent.status || 'confirmed'
    ),
  ];

  const differentFields = fields.filter((f) => f.isDifferent);

  return (
    <WindowTemplate isOpen={isOpen} onClose={onClose} title="Sync Conflict Detected" width="700px">
      <div className="scm-body">
        {/* Alert Banner */}
        <div className="scm-alert-banner">
          <AlertTriangle size={20} color="var(--color-warning)" className="scm-alert-icon" />
          <div>
            <h4 className="scm-alert-title">
              This event was modified in both places
            </h4>
            <p className="scm-alert-message">
              The event &quot;{crmEvent['Event Name']}&quot; has conflicting changes. Choose which
              version to keep.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="scm-comparison-grid">
          {/* Header Row */}
          <div className="scm-grid-header">
            Field
          </div>
          <div className="scm-grid-header scm-grid-header--icon">
            <Database size={16} />
            CRM Version
          </div>
          <div className="scm-grid-header scm-grid-header--icon">
            <Calendar size={16} />
            Calendar Version
          </div>

          {/* Data Rows */}
          {fields.map((field, idx) => (
            <React.Fragment key={idx}>
              <div
                className="scm-grid-cell scm-grid-label"
                style={{
                  backgroundColor: field.isDifferent ? 'rgba(217, 119, 6, 0.1)' : 'var(--color-bg-primary)',
                  fontWeight: field.isDifferent ? 600 : 400,
                  color: field.isDifferent ? 'var(--color-warning)' : 'var(--color-text-primary)',
                }}
              >
                {field.label}
              </div>
              <div
                className="scm-grid-cell scm-grid-value"
                style={{
                  backgroundColor: field.isDifferent ? 'rgba(220, 38, 38, 0.1)' : 'var(--color-bg-primary)',
                }}
              >
                {field.crmValue || (
                  <span className="scm-empty-value">
                    Empty
                  </span>
                )}
              </div>
              <div
                className="scm-grid-cell scm-grid-value"
                style={{
                  backgroundColor: field.isDifferent ? 'rgba(124, 104, 83, 0.1)' : 'var(--color-bg-primary)',
                }}
              >
                {field.calendarValue || (
                  <span className="scm-empty-value">
                    Empty
                  </span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Summary */}
        <p className="scm-summary">
          {differentFields.length} field{differentFields.length !== 1 ? 's' : ''} differ between
          versions: {differentFields.map((f) => f.label).join(', ')}
        </p>

        {/* Action Buttons */}
        <div className="scm-actions">
          <button
            className="btn btn-primary scm-action-btn"
            onClick={() => handleResolve('crm')}
            disabled={resolving}
          >
            <Database size={18} />
            Keep CRM Version
          </button>
          <p className="scm-action-hint">
            Overwrite Google Calendar with the CRM data
          </p>

          <button
            className="btn btn-primary scm-action-btn scm-action-btn--mt"
            onClick={() => handleResolve('calendar')}
            disabled={resolving}
          >
            <Calendar size={18} />
            Keep Calendar Version
          </button>
          <p className="scm-action-hint">
            Overwrite CRM with the Google Calendar data
          </p>

          <button
            className="btn btn-secondary scm-action-btn scm-action-btn--mt"
            onClick={() => handleResolve('latest')}
            disabled={resolving}
          >
            Keep Most Recent Edit
          </button>
          <p className="scm-action-hint">
            Use whichever version was edited last
          </p>
        </div>

        <div className="scm-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={resolving}>
            Cancel
          </button>
        </div>
      </div>
    </WindowTemplate>
  );
}

export default SyncConflictModal;
