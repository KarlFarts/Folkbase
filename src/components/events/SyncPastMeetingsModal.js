import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { fetchCalendarEvents, generateEventID, addEvent } from '../../utils/devModeWrapper';
import { googleEventToCRMEvent } from '../../utils/eventTransformers';
import { useNotification } from '../../contexts/NotificationContext';

function SyncPastMeetingsModal({ isOpen, onClose, onImported, existingCalendarIds = new Set(), contacts = [] }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [pastEvents, setPastEvents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !accessToken) return;

    const fetchPast = async () => {
      // Reset state on each re-open so stale data does not flash
      setPastEvents([]);
      setSelectedIds(new Set());
      setLoading(true);
      try {
        const now = new Date();
        const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = now.toISOString();
        const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);

        // Filter out: already in Folkbase, cancelled, and events with no summary
        const importable = events.filter(
          (e) =>
            e.summary &&
            e.status !== 'cancelled' &&
            !existingCalendarIds.has(e.id)
        );

        setPastEvents(importable);
        setSelectedIds(new Set(importable.map((e) => e.id)));
      } catch (error) {
        console.error('Failed to fetch past calendar events:', error);
        notify.error('Failed to load calendar events.');
      } finally {
        setLoading(false);
      }
    };

    fetchPast();
    // Intentionally omit existingCalendarIds/notify: we want to re-fetch only when
    // the modal opens (isOpen) or the token changes, not on every render cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pastEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pastEvents.map((e) => e.id)));
    }
  };

  const handleImport = async () => {
    if (!accessToken) return;
    const toImport = pastEvents.filter((e) => selectedIds.has(e.id));
    if (toImport.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let unresolvedCount = 0;

    for (const gcalEvent of toImport) {
      try {
        const eventId = await generateEventID(accessToken, sheetId);
        const crmData = googleEventToCRMEvent(gcalEvent, contacts);

        if (crmData['Unresolved Attendees']) {
          unresolvedCount += JSON.parse(crmData['Unresolved Attendees']).length;
        }

        await addEvent(accessToken, sheetId, {
          'Event ID': eventId,
          ...crmData,
          'Google Calendar ID': gcalEvent.id,
          'Sync Source': 'Imported',
          'Last Synced At': new Date().toISOString(),
          Status: 'Completed',
        });

        successCount++;
      } catch (error) {
        console.error('Failed to import event:', gcalEvent.summary, error);
      }
    }

    setImporting(false);

    if (successCount > 0) {
      const msg = `Imported ${successCount} meeting${successCount !== 1 ? 's' : ''}${
        unresolvedCount > 0
          ? `. ${unresolvedCount} attendee${unresolvedCount !== 1 ? 's' : ''} need review.`
          : '.'
      }`;
      notify.success(msg);
      if (onImported) onImported();
    }

    if (successCount < toImport.length) {
      notify.warning(`${toImport.length - successCount} meeting(s) failed to import.`);
    }

    onClose();
  };

  const formatDate = (gcalEvent) => {
    const dateStr = gcalEvent.start?.dateTime || gcalEvent.start?.date;
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: gcalEvent.start?.dateTime ? 'numeric' : undefined,
      minute: gcalEvent.start?.dateTime ? '2-digit' : undefined,
    });
  };

  return (
    <WindowTemplate isOpen={isOpen} onClose={onClose} title="Sync Past Meetings" width="520px">
      <div className="spm-body">
        <p className="spm-desc">
          Import meetings from the past 30 days into Folkbase. Attendee emails will be matched to
          your contacts.
        </p>

        {loading ? (
          <div className="spm-loading">Loading calendar events...</div>
        ) : pastEvents.length === 0 ? (
          <div className="spm-empty">
            <Calendar size={32} className="spm-empty-icon" />
            <p>All recent meetings are already in Folkbase.</p>
          </div>
        ) : (
          <>
            <div className="spm-select-all">
              <label className="spm-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pastEvents.length}
                  onChange={toggleAll}
                />
                Select all ({pastEvents.length})
              </label>
            </div>

            <div className="spm-list">
              {pastEvents.map((event) => (
                <label key={event.id} className="spm-item">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.id)}
                    onChange={() => toggleSelect(event.id)}
                  />
                  <div className="spm-item-info">
                    <span className="spm-item-title">{event.summary}</span>
                    <span className="spm-item-date">{formatDate(event)}</span>
                    {event.attendees && event.attendees.length > 0 && (
                      <span className="spm-item-attendees">
                        {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="spm-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing || selectedIds.size === 0}
              >
                {importing
                  ? 'Importing...'
                  : `Import ${selectedIds.size} Meeting${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </WindowTemplate>
  );
}

export default SyncPastMeetingsModal;
