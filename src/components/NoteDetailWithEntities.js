import { error as logError } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import IconMap from './IconMap';
import { useEntityDetection } from '../hooks/useEntityDetection';
import { getHighConfidenceEntities } from '../services/entityDetector';
import EntitySuggestionCard from './braindump/EntitySuggestionCard';
import {
  recordContactLink,
  recordDisambiguation,
  ignoreEntity,
} from '../services/braindumpPreferences';
import LinkedEntitiesDisplay from './notes/LinkedEntitiesDisplay';
import LinkEntitiesModal from './notes/LinkEntitiesModal';
import {
  getNoteWithEntities,
  unlinkNoteFromContact,
  unlinkNoteFromEvent,
  unlinkNoteFromList,
  unlinkNoteFromTask,
  batchLinkNoteToEntities,
} from '../utils/devModeWrapper';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotification } from '../contexts/NotificationContext';
import './NoteDetailWithEntities.css';

/**
 * NoteDetailWithEntities Component
 * Enhanced note detail view with entity detection for braindump notes
 * Shows detected entities and provides "Process & Link" workflow
 */
function NoteDetailWithEntities({
  note,
  contacts,
  events,
  onLinkContact,
  onMarkProcessed,
  onEdit,
  onDelete,
  canEdit,
}) {
  const { accessToken } = useAuth();
  const { getCurrentSheetId } = useWorkspace();
  const { notify } = useNotification();

  const [linkedEntities, setLinkedEntities] = useState({
    contacts: [],
    events: [],
    locations: [],
    tasks: [],
  });
  const [processing, setProcessing] = useState(false);
  const [fullNote, setFullNote] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);

  // Only run entity detection for braindump notes
  const shouldDetect = note?.['Note Type'] === 'Braindump' && note?.Status === 'Unprocessed';

  const { isDetecting, detectedEntities, hasEntities } = useEntityDetection(
    shouldDetect ? note?.Content || '' : '',
    { contacts, events }
  );

  // Load note with all linked entities
  useEffect(() => {
    const loadNoteWithEntities = async () => {
      if (!note?.['Note ID'] || !accessToken) {
        setLoadingEntities(false);
        return;
      }

      setLoadingEntities(true);
      try {
        const sheetId = getCurrentSheetId();
        const noteWithEntities = await getNoteWithEntities(accessToken, sheetId, note['Note ID']);

        if (noteWithEntities) {
          setFullNote(noteWithEntities);
        }
      } catch (error) {
        logError('Error loading note entities:', error);
      } finally {
        setLoadingEntities(false);
      }
    };

    loadNoteWithEntities();

    // Reset local linked entities for braindump detection
    setLinkedEntities({
      contacts: [],
      events: [],
      locations: [],
      tasks: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.['Note ID'], accessToken, getCurrentSheetId]);

  const handleLinkEntity = async (entity, type) => {
    setLinkedEntities((prev) => ({
      ...prev,
      [type + 's']: [...prev[type + 's'], entity],
    }));

    if (type === 'contact' && entity.contactId) {
      recordContactLink(entity.contactId);
    }
  };

  const handleIgnoreEntity = (entity, type) => {
    ignoreEntity(entity.text, type);
  };

  const handleDisambiguate = async (entity, selectedContact) => {
    recordDisambiguation(entity.text, selectedContact['Contact ID']);

    const updatedEntity = {
      ...entity,
      contactId: selectedContact['Contact ID'],
      contact: selectedContact,
      selectedContactId: selectedContact['Contact ID'],
    };

    await handleLinkEntity(updatedEntity, 'contact');
  };

  const handleProcessAndLink = async () => {
    if (!detectedEntities) return;

    setProcessing(true);
    try {
      // Get all high-confidence entities
      const highConfidence = getHighConfidenceEntities(detectedEntities);

      // Link all high-confidence contacts
      for (const contact of highConfidence.contacts) {
        if (contact.contactId) {
          await onLinkContact(contact.contactId);
          recordContactLink(contact.contactId);
        }
      }

      // Mark as processed
      await onMarkProcessed(note['Note ID']);

      const total =
        highConfidence.contacts.length +
        highConfidence.events.length +
        highConfidence.locations.length +
        highConfidence.tasks.length;

      return total;
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptAllHighConfidence = () => {
    if (!detectedEntities) return;

    const highConfidence = getHighConfidenceEntities(detectedEntities);

    setLinkedEntities((prev) => ({
      contacts: [...prev.contacts, ...highConfidence.contacts],
      events: [...prev.events, ...highConfidence.events],
      locations: [...prev.locations, ...highConfidence.locations],
      tasks: [...prev.tasks, ...highConfidence.tasks],
    }));

    highConfidence.contacts.forEach((contact) => {
      if (contact.contactId) {
        recordContactLink(contact.contactId);
      }
    });
  };

  const isEntityLinked = (entity, type) => {
    switch (type) {
      case 'contact':
        return linkedEntities.contacts.some((c) => c.contactId === entity.contactId);
      case 'location':
        return linkedEntities.locations.some((l) => l.text === entity.text);
      case 'event':
        return linkedEntities.events.some((e) => e.eventId === entity.eventId);
      case 'task':
        return linkedEntities.tasks.some((t) => t.text === entity.text);
      default:
        return false;
    }
  };

  const hasHighConfidence = detectedEntities && detectedEntities.summary.highConfidence > 0;
  const hasLinkedEntities =
    linkedEntities.contacts.length > 0 ||
    linkedEntities.events.length > 0 ||
    linkedEntities.locations.length > 0 ||
    linkedEntities.tasks.length > 0;

  // Handle unlinking entities
  const handleUnlinkEntity = async (entityType, entityId) => {
    if (!accessToken || !note?.['Note ID']) return;

    try {
      const sheetId = getCurrentSheetId();
      const noteId = note['Note ID'];

      switch (entityType) {
        case 'contact':
          await unlinkNoteFromContact(accessToken, sheetId, noteId, entityId);
          break;
        case 'event':
          await unlinkNoteFromEvent(accessToken, sheetId, noteId, entityId);
          break;
        case 'list':
          await unlinkNoteFromList(accessToken, sheetId, noteId, entityId);
          break;
        case 'task':
          await unlinkNoteFromTask(accessToken, sheetId, noteId, entityId);
          break;
        default:
          return;
      }

      // Reload note with entities
      const noteWithEntities = await getNoteWithEntities(accessToken, sheetId, noteId);
      if (noteWithEntities) {
        setFullNote(noteWithEntities);
      }
    } catch (error) {
      logError('Error unlinking entity:', error);
      notify.error('Failed to unlink entity. Please try again.');
    }
  };

  // Handle saving new entity links
  const handleSaveEntityLinks = async (entityLinks) => {
    if (!accessToken || !note?.['Note ID']) return;

    try {
      const sheetId = getCurrentSheetId();
      const noteId = note['Note ID'];

      // Batch link entities
      await batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks);

      // Reload note with entities
      const noteWithEntities = await getNoteWithEntities(accessToken, sheetId, noteId);
      if (noteWithEntities) {
        setFullNote(noteWithEntities);
      }

      setShowLinkModal(false);
    } catch (error) {
      logError('Error linking entities:', error);
      notify.error('Failed to link entities. Please try again.');
    }
  };

  // Get existing link IDs for the modal
  const existingLinks = fullNote
    ? {
        contacts: (fullNote.linkedContacts || []).map((c) => c['Contact ID']),
        events: (fullNote.linkedEvents || []).map((e) => e['Event ID']),
        lists: (fullNote.linkedLists || []).map((l) => l['List ID']),
        tasks: (fullNote.linkedTasks || []).map((t) => t['Task ID']),
      }
    : { contacts: [], events: [], lists: [], tasks: [] };

  return (
    <div className="note-detail-with-entities">
      {/* Note Content */}
      <div className="note-content">
        <div className="note-meta">
          <span className="note-type-badge">{note?.['Note Type']}</span>
          <span
            className={`note-status-badge ${note?.Status === 'Unprocessed' ? 'unprocessed' : 'processed'}`}
          >
            {note?.Status}
          </span>
          {note?.['Created Date'] && <span className="note-date">{note['Created Date']}</span>}
        </div>

        <div className="note-text">{note?.Content}</div>

        {/* Actions */}
        <div className="note-actions">
          {canEdit && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(note)}>
                Edit
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => onDelete(note['Note ID'])}>
                Delete
              </button>
            </>
          )}
          {note?.Status === 'Unprocessed' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onMarkProcessed(note['Note ID'])}
            >
              Mark Processed
            </button>
          )}
        </div>
      </div>

      {/* Linked Entities Display */}
      {!loadingEntities && fullNote && (
        <div className="linked-entities-section">
          <div className="linked-entities-header">
            <h4>Linked Entities</h4>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowLinkModal(true)}>
                Link Entities
              </button>
            )}
          </div>
          <LinkedEntitiesDisplay
            note={fullNote}
            onUnlink={handleUnlinkEntity}
            onLinkMore={() => setShowLinkModal(true)}
            canEdit={canEdit}
            showActions={true}
          />
        </div>
      )}

      {/* Entity Detection Section (only for unprocessed braindumps) */}
      {shouldDetect && (
        <div className="entity-detection-section">
          <div className="entity-header">
            <h4>Detected Entities</h4>
            {isDetecting && <span className="detecting-badge">Analyzing...</span>}
          </div>

          {!hasEntities ? (
            <div className="empty-entities">
              <p>No entities detected in this braindump.</p>
            </div>
          ) : (
            <>
              {/* Summary and Actions */}
              <div className="entity-summary">
                <div className="summary-text">
                  Found {detectedEntities.summary.total} entities
                  {hasHighConfidence && (
                    <span className="high-confidence-count">
                      {' '}
                      ({detectedEntities.summary.highConfidence} high-confidence)
                    </span>
                  )}
                </div>

                <div className="entity-actions">
                  {hasHighConfidence && !hasLinkedEntities && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleAcceptAllHighConfidence}
                    >
                      Accept All High-Confidence
                    </button>
                  )}
                  {(hasHighConfidence || hasLinkedEntities) && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleProcessAndLink}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Process & Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* Entity Groups */}
              <div className="entity-groups">
                {detectedEntities.contacts.length > 0 && (
                  <div className="entity-group">
                    <h5>
                      <IconMap name="User" size={16} /> Contacts ({detectedEntities.contacts.length}
                      )
                    </h5>
                    {detectedEntities.contacts.map((contact, idx) => (
                      <EntitySuggestionCard
                        key={`contact-${idx}`}
                        entity={contact}
                        type="contact"
                        isLinked={isEntityLinked(contact, 'contact')}
                        onLink={handleLinkEntity}
                        onIgnore={handleIgnoreEntity}
                        onDisambiguate={handleDisambiguate}
                      />
                    ))}
                  </div>
                )}

                {detectedEntities.locations.length > 0 && (
                  <div className="entity-group">
                    <h5>
                      <IconMap name="MapPin" size={16} /> Locations (
                      {detectedEntities.locations.length})
                    </h5>
                    {detectedEntities.locations.map((location, idx) => (
                      <EntitySuggestionCard
                        key={`location-${idx}`}
                        entity={location}
                        type="location"
                        isLinked={isEntityLinked(location, 'location')}
                        onLink={handleLinkEntity}
                        onIgnore={handleIgnoreEntity}
                        onDisambiguate={handleDisambiguate}
                      />
                    ))}
                  </div>
                )}

                {detectedEntities.events.length > 0 && (
                  <div className="entity-group">
                    <h5>
                      <IconMap name="Calendar" size={16} /> Events ({detectedEntities.events.length}
                      )
                    </h5>
                    {detectedEntities.events.map((event, idx) => (
                      <EntitySuggestionCard
                        key={`event-${idx}`}
                        entity={event}
                        type="event"
                        isLinked={isEntityLinked(event, 'event')}
                        onLink={handleLinkEntity}
                        onIgnore={handleIgnoreEntity}
                        onDisambiguate={handleDisambiguate}
                      />
                    ))}
                  </div>
                )}

                {detectedEntities.tasks.length > 0 && (
                  <div className="entity-group">
                    <h5>
                      <Check size={16} /> Tasks ({detectedEntities.tasks.length})
                    </h5>
                    {detectedEntities.tasks.map((task, idx) => (
                      <EntitySuggestionCard
                        key={`task-${idx}`}
                        entity={task}
                        type="task"
                        isLinked={isEntityLinked(task, 'task')}
                        onLink={handleLinkEntity}
                        onIgnore={handleIgnoreEntity}
                        onDisambiguate={handleDisambiguate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Link Entities Modal */}
      {showLinkModal && (
        <LinkEntitiesModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          note={note}
          onSave={handleSaveEntityLinks}
          existingLinks={existingLinks}
        />
      )}
    </div>
  );
}

export default NoteDetailWithEntities;
