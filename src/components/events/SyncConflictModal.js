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
      <div
        style={{
          padding: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
        }}
      >
        {/* Alert Banner */}
        <div
          style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid rgba(217, 119, 6, 0.3)',
            display: 'flex',
            gap: 'var(--spacing-sm)',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color="var(--color-warning)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <h4
              style={{
                margin: '0 0 var(--spacing-xs) 0',
                color: 'var(--color-warning)',
                fontSize: 'var(--font-size-md)',
              }}
            >
              This event was modified in both places
            </h4>
            <p style={{ margin: 0, color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>
              The event &quot;{crmEvent['Event Name']}&quot; has conflicting changes. Choose which
              version to keep.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 1fr 1fr',
            gap: '1px',
            backgroundColor: 'var(--color-border-default)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {/* Header Row */}
          <div
            style={{
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--color-bg-secondary)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Field
          </div>
          <div
            style={{
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--color-bg-secondary)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
            }}
          >
            <Database size={16} />
            CRM Version
          </div>
          <div
            style={{
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--color-bg-secondary)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
            }}
          >
            <Calendar size={16} />
            Calendar Version
          </div>

          {/* Data Rows */}
          {fields.map((field, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  padding: 'var(--spacing-sm)',
                  backgroundColor: field.isDifferent ? 'rgba(217, 119, 6, 0.1)' : 'var(--color-bg-primary)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: field.isDifferent ? 600 : 400,
                  color: field.isDifferent ? 'var(--color-warning)' : 'var(--color-text-primary)',
                }}
              >
                {field.label}
              </div>
              <div
                style={{
                  padding: 'var(--spacing-sm)',
                  backgroundColor: field.isDifferent ? 'rgba(220, 38, 38, 0.1)' : 'var(--color-bg-primary)',
                  fontSize: 'var(--font-size-sm)',
                  wordBreak: 'break-word',
                }}
              >
                {field.crmValue || (
                  <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Empty
                  </span>
                )}
              </div>
              <div
                style={{
                  padding: 'var(--spacing-sm)',
                  backgroundColor: field.isDifferent ? 'rgba(124, 104, 83, 0.1)' : 'var(--color-bg-primary)',
                  fontSize: 'var(--font-size-sm)',
                  wordBreak: 'break-word',
                }}
              >
                {field.calendarValue || (
                  <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Empty
                  </span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Summary */}
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {differentFields.length} field{differentFields.length !== 1 ? 's' : ''} differ between
          versions: {differentFields.map((f) => f.label).join(', ')}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleResolve('crm')}
            disabled={resolving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              justifyContent: 'center',
            }}
          >
            <Database size={18} />
            Keep CRM Version
          </button>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              margin: '-var(--spacing-xs) 0 0 var(--spacing-lg)',
            }}
          >
            Overwrite Google Calendar with the CRM data
          </p>

          <button
            className="btn btn-primary"
            onClick={() => handleResolve('calendar')}
            disabled={resolving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              justifyContent: 'center',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            <Calendar size={18} />
            Keep Calendar Version
          </button>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              margin: '-var(--spacing-xs) 0 0 var(--spacing-lg)',
            }}
          >
            Overwrite CRM with the Google Calendar data
          </p>

          <button
            className="btn btn-secondary"
            onClick={() => handleResolve('latest')}
            disabled={resolving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              justifyContent: 'center',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            Keep Most Recent Edit
          </button>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              margin: '-var(--spacing-xs) 0 0 var(--spacing-lg)',
            }}
          >
            Use whichever version was edited last
          </p>
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}
        >
          <button className="btn btn-secondary" onClick={onClose} disabled={resolving}>
            Cancel
          </button>
        </div>
      </div>
    </WindowTemplate>
  );
}

export default SyncConflictModal;
