import React, { useState } from 'react';
import { Calendar, FileText } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import {
  generateEventID,
  addEvent,
  addTouchpoint,
  generateTouchpointID,
} from '../../utils/devModeWrapper';
import { googleEventToCRMEvent } from '../../utils/eventTransformers';
import { useNotification } from '../../contexts/NotificationContext';

function ImportEventModal({ isOpen, onClose, googleEvent, onImported, contacts = [] }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [importing, setImporting] = useState(false);

  const handleImportAsEvent = async () => {
    setImporting(true);
    try {
      const eventId = await generateEventID(accessToken, sheetId);
      const crmEventData = googleEventToCRMEvent(googleEvent, contacts);

      await addEvent(accessToken, sheetId, {
        'Event ID': eventId,
        ...crmEventData,
        'Google Calendar ID': googleEvent.id,
        'Sync Source': 'Imported',
        'Last Synced At': new Date().toISOString(),
      });

      notify(`Imported "${googleEvent.summary}" as CRM Event`, 'success');
      if (onImported) onImported();
      onClose();
    } catch (error) {
      notify('Failed to import event: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleImportAsTouchpoint = async () => {
    setImporting(true);
    try {
      const touchpointId = await generateTouchpointID(accessToken, sheetId);
      const eventDate = googleEvent.start?.dateTime || googleEvent.start?.date;

      await addTouchpoint(accessToken, sheetId, {
        'Touchpoint ID': touchpointId,
        'Touchpoint Type': 'Meeting',
        Subject: googleEvent.summary || 'Imported Meeting',
        Date: eventDate
          ? new Date(eventDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        Notes: googleEvent.description || '',
      });

      notify(`Logged "${googleEvent.summary}" as Touchpoint`, 'success');
      if (onImported) onImported();
      onClose();
    } catch (error) {
      notify('Failed to log touchpoint: ' + error.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!googleEvent) return null;

  const eventDate = googleEvent.start?.dateTime || googleEvent.start?.date;
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: googleEvent.start?.dateTime ? 'numeric' : undefined,
        minute: googleEvent.start?.dateTime ? 'numeric' : undefined,
      })
    : 'Date not available';

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title="Import Google Calendar Event"
      width="500px"
    >
      <div
        style={{
          padding: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
        }}
      >
        <div
          style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--color-success)',
          }}
        >
          <h3 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: 'var(--font-size-lg)' }}>
            {googleEvent.summary || 'Untitled Event'}
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {formattedDate}
          </p>
          {googleEvent.location && (
            <p
              style={{
                margin: 'var(--spacing-xs) 0 0 0',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              📍 {googleEvent.location}
            </p>
          )}
          {googleEvent.description && (
            <p
              style={{
                margin: 'var(--spacing-sm) 0 0 0',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
              }}
            >
              {googleEvent.description}
            </p>
          )}
        </div>

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          How would you like to import this event from Google Calendar?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <button
            className="btn btn-primary"
            onClick={handleImportAsEvent}
            disabled={importing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              justifyContent: 'center',
            }}
          >
            <Calendar size={18} />
            Import as CRM Event
          </button>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              margin: '-var(--spacing-xs) 0 0 var(--spacing-lg)',
            }}
          >
            Creates a full event with all details, location, and attendees
          </p>

          <button
            className="btn btn-secondary"
            onClick={handleImportAsTouchpoint}
            disabled={importing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              justifyContent: 'center',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            <FileText size={18} />
            Log as Touchpoint
          </button>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              margin: '-var(--spacing-xs) 0 0 var(--spacing-lg)',
            }}
          >
            Quick log as a meeting touchpoint with notes
          </p>
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}
        >
          <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
        </div>
      </div>
    </WindowTemplate>
  );
}

export default ImportEventModal;
