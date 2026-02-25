import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { addNote, linkNoteToContact, readSheetData, SHEETS } from '../utils/devModeWrapper';
import { useEntityDetection } from '../hooks/useEntityDetection';
import {
  saveDraft,
  getMostRecentDraft,
  deleteDraft,
  recordContactLink,
  recordDisambiguation,
  ignoreEntity,
} from '../services/braindumpPreferences';
import { getHighConfidenceEntities } from '../services/entityDetector';
import EntitySuggestionsPanel from '../components/braindump/EntitySuggestionsPanel';
import './BraindumpPage.css';

function BraindumpPage() {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedEntities, setLinkedEntities] = useState({
    contacts: [],
    events: [],
    locations: [],
    tasks: [],
  });

  // Auto-save draft
  const [draftKey, setDraftKey] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Entity detection
  const { isDetecting, detectedEntities, hasEntities } = useEntityDetection(content, {
    contacts,
    events,
  });

  // Load contacts and events
  useEffect(() => {
    loadData();
  }, [accessToken, sheetId]);

  // Load draft on mount
  useEffect(() => {
    const recentDraft = getMostRecentDraft();
    if (recentDraft && recentDraft.content) {
      setPendingDraft(recentDraft);
      setShowRestoreConfirm(true);
    }
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!content || content.trim().length === 0) return;

    const interval = setInterval(() => {
      const key = saveDraft(content);
      if (key) setDraftKey(key);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [content]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [contactsResult, eventsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS),
      ]);

      setContacts(
        contactsResult?.data && Array.isArray(contactsResult.data) ? contactsResult.data : []
      );
      setEvents(eventsResult?.data && Array.isArray(eventsResult.data) ? eventsResult.data : []);
    } catch {
      notify.error('Failed to load contacts and events');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEntity = async (entity, type) => {
    // Add to linked entities
    setLinkedEntities((prev) => ({
      ...prev,
      [type + 's']: [...prev[type + 's'], entity],
    }));

    // Record preference for contacts
    if (type === 'contact' && entity.contactId) {
      recordContactLink(entity.contactId);
    }

    notify.success(`${type.charAt(0).toUpperCase() + type.slice(1)} marked for linking`);
  };

  const handleIgnoreEntity = (entity, type) => {
    ignoreEntity(entity.text, type);
    notify.info(`"${entity.text}" will be ignored in future detections`);
  };

  const handleDisambiguate = async (entity, selectedContact) => {
    // Record the user's choice
    recordDisambiguation(entity.text, selectedContact['Contact ID']);

    // Create updated entity with selected contact
    const updatedEntity = {
      ...entity,
      contactId: selectedContact['Contact ID'],
      contact: selectedContact,
      selectedContactId: selectedContact['Contact ID'],
    };

    // Link the entity
    await handleLinkEntity(updatedEntity, 'contact');
  };

  const handleAcceptAllHighConfidence = () => {
    if (!detectedEntities) return;

    const highConfidence = getHighConfidenceEntities(detectedEntities);

    // Add all high-confidence entities to linked
    setLinkedEntities((prev) => ({
      contacts: [...prev.contacts, ...highConfidence.contacts],
      events: [...prev.events, ...highConfidence.events],
      locations: [...prev.locations, ...highConfidence.locations],
      tasks: [...prev.tasks, ...highConfidence.tasks],
    }));

    // Record contact preferences
    highConfidence.contacts.forEach((contact) => {
      if (contact.contactId) {
        recordContactLink(contact.contactId);
      }
    });

    const total =
      highConfidence.contacts.length +
      highConfidence.events.length +
      highConfidence.locations.length +
      highConfidence.tasks.length;

    notify.success(`${total} high-confidence entities marked for linking`);
  };

  const handleSave = async () => {
    if (!content || content.trim().length === 0) {
      notify.warning('Please enter some content');
      return;
    }

    try {
      setSaving(true);

      // Create note with Braindump type
      const noteData = {
        Content: content.trim(),
        'Note Type': 'Braindump',
        Status: 'Unprocessed',
        Visibility: 'Workspace-Wide',
        'Created By': user?.email || '',
      };

      const result = await addNote(accessToken, sheetId, noteData);
      const noteId = result?.['Note ID'];

      // Link contacts
      let linkErrors = [];
      if (linkedEntities.contacts.length > 0 && noteId) {
        for (const contact of linkedEntities.contacts) {
          try {
            await linkNoteToContact(accessToken, sheetId, noteId, contact.contactId);
          } catch {
            linkErrors.push(contact.name || contact.contactId);
            // Continue linking other contacts
          }
        }
      }

      // Notify user if some links failed
      if (linkErrors.length > 0) {
        notify.warning(
          `Note created, but failed to link ${linkErrors.length} contact(s): ${linkErrors.join(', ')}`
        );
      }

      const linkedCount =
        linkedEntities.contacts.length +
        linkedEntities.events.length +
        linkedEntities.locations.length +
        linkedEntities.tasks.length;

      if (linkedCount > 0) {
        notify.success(
          `Braindump saved with ${linkedCount} linked ${
            linkedCount === 1 ? 'entity' : 'entities'
          }! Review in Notes Inbox.`
        );
      } else {
        notify.success('Braindump saved! Review in Notes Inbox.');
      }

      // Clear editor and draft
      setContent('');
      setLinkedEntities({
        contacts: [],
        events: [],
        locations: [],
        tasks: [],
      });

      if (draftKey) {
        deleteDraft(draftKey);
        setDraftKey(null);
      }
    } catch {
      notify.error('Failed to save braindump');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const handleClear = () => {
    if (content && content.trim().length > 0) {
      setShowClearConfirm(true);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  const linkedCount =
    linkedEntities.contacts.length +
    linkedEntities.events.length +
    linkedEntities.locations.length +
    linkedEntities.tasks.length;

  return (
    <div className="page-container braindump-page">
      <div className="page-header">
        <h1>Braindump</h1>
        <p className="page-subtitle">
          Quick capture for thoughts, ideas, and notes. Type freely and we'll help you organize
          later.
        </p>
      </div>

      <div className="braindump-container">
        <div className="braindump-editor-section">
          <div className="editor-header">
            <div className="character-count">
              {content.length} characters
              {linkedCount > 0 && <span className="linked-count"> • {linkedCount} linked</span>}
            </div>
          </div>

          <textarea
            className="braindump-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start typing... anything that comes to mind. We'll detect people, places, and tasks automatically."
            autoFocus
          />

          <div className="editor-footer">
            <div className="editor-tips">Tip: Press ⌘+Enter (or Ctrl+Enter) to save</div>

            <div className="editor-actions">
              <button
                className="btn btn-secondary"
                onClick={handleClear}
                disabled={!content || content.trim().length === 0}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !content || content.trim().length === 0}
              >
                {saving ? 'Saving...' : 'Save Braindump'}
              </button>
            </div>
          </div>
        </div>

        <div className="braindump-suggestions-section">
          {!content || content.trim().length === 0 ? (
            <div className="empty-state">
              <p>Start typing to see detected contacts, places, events, and tasks.</p>
            </div>
          ) : !hasEntities && !isDetecting ? (
            <div className="empty-state">
              <p>No entities detected yet. Keep typing!</p>
            </div>
          ) : (
            <EntitySuggestionsPanel
              detectedEntities={detectedEntities}
              linkedEntities={linkedEntities}
              isDetecting={isDetecting}
              onLinkEntity={handleLinkEntity}
              onIgnoreEntity={handleIgnoreEntity}
              onDisambiguate={handleDisambiguate}
              onAcceptAllHighConfidence={handleAcceptAllHighConfidence}
            />
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onConfirm={() => {
          if (pendingDraft) {
            setContent(pendingDraft.content);
            setDraftKey(pendingDraft.key);
          }
          setShowRestoreConfirm(false);
          setPendingDraft(null);
        }}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setPendingDraft(null);
        }}
        title="Restore Draft"
        message="You have an unsaved draft. Would you like to restore it?"
        confirmLabel="Restore"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={() => {
          setContent('');
          setLinkedEntities({
            contacts: [],
            events: [],
            locations: [],
            tasks: [],
          });
          if (draftKey) {
            deleteDraft(draftKey);
            setDraftKey(null);
          }
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear All"
        message="Clear all content? This cannot be undone."
        confirmLabel="Clear"
        variant="danger"
      />
    </div>
  );
}

export default BraindumpPage;
