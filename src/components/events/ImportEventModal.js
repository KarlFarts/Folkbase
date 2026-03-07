import { useState } from 'react';
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

      notify.success(`Imported "${googleEvent.summary}" as CRM Event`);
      if (onImported) onImported();
      onClose();
    } catch {
      notify.error('Failed to import event. Please try again.');
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

      notify.success(`Logged "${googleEvent.summary}" as Touchpoint`);
      if (onImported) onImported();
      onClose();
    } catch {
      notify.error('Failed to log touchpoint. Please try again.');
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
      <div className="iem-body">
        <div className="iem-event-preview">
          <h3 className="iem-event-title">
            {googleEvent.summary || 'Untitled Event'}
          </h3>
          <p className="iem-event-date">
            {formattedDate}
          </p>
          {googleEvent.location && (
            <p className="iem-event-location">
              📍 {googleEvent.location}
            </p>
          )}
          {googleEvent.description && (
            <p className="iem-event-description">
              {googleEvent.description}
            </p>
          )}
        </div>

        <p className="iem-prompt">
          How would you like to import this event from Google Calendar?
        </p>

        <div className="iem-import-options">
          <button
            className="btn btn-primary iem-option-btn"
            onClick={handleImportAsEvent}
            disabled={importing}
          >
            <Calendar size={18} />
            Import as CRM Event
          </button>
          <p className="iem-option-hint">
            Creates a full event with all details, location, and attendees
          </p>

          <button
            className="btn btn-secondary iem-option-btn iem-option-btn--mt"
            onClick={handleImportAsTouchpoint}
            disabled={importing}
          >
            <FileText size={18} />
            Log as Touchpoint
          </button>
          <p className="iem-option-hint">
            Quick log as a meeting touchpoint with notes
          </p>
        </div>

        <div className="iem-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
        </div>
      </div>
    </WindowTemplate>
  );
}

export default ImportEventModal;
