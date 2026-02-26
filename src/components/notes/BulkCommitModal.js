import { error as logError } from '../../utils/logger';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { updateNote, batchLinkNoteToEntities, readSheetData } from '../../utils/devModeWrapper';
import { SHEET_NAMES } from '../../config/constants';
import WindowTemplate from '../WindowTemplate';

/**
 * BulkCommitModal Component
 *
 * Modal for committing multiple notes at once with shared settings.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Array} props.notes - Array of note objects to commit
 * @param {Function} props.onCommit - Callback with { noteIds: [], tags: '', visibility: '', sharedWith: '' }
 */
export default function BulkCommitModal({ isOpen, onClose, notes = [], onCommit }) {
  const { accessToken } = useAuth();
  const { getCurrentSheetId } = useWorkspace();

  // Form state
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('Workspace-Wide');
  const [sharedWith, setSharedWith] = useState('');
  const [linkToSameEntity, setLinkToSameEntity] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  // Entity options
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState('');

  // Load entities if linking option is enabled
  useEffect(() => {
    if (isOpen && linkToSameEntity) {
      loadEntities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, linkToSameEntity]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTags('');
      setVisibility('Workspace-Wide');
      setSharedWith('');
      setLinkToSameEntity(false);
      setSelectedEntityType('');
      setSelectedEntityId('');
      setProgress(0);
      setProcessedCount(0);
      setError('');
    }
  }, [isOpen]);

  const loadEntities = async () => {
    try {
      const sheetId = getCurrentSheetId();

      const [contactsResult, eventsResult, listsResult, tasksResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.EVENTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.LISTS),
        readSheetData(accessToken, sheetId, SHEET_NAMES.TASKS),
      ]);

      setContacts(contactsResult.data || []);
      setEvents(eventsResult.data || []);
      setLists(listsResult.data || []);
      setTasks(tasksResult.data || []);
    } catch (err) {
      logError('Error loading entities:', err);
      setError('Failed to load entities for linking');
    }
  };

  const validateForm = () => {
    if (visibility === 'Shared' && !sharedWith.trim()) {
      setError('Please enter email addresses for sharing');
      return false;
    }

    if (linkToSameEntity && !selectedEntityId) {
      setError('Please select an entity to link all notes to');
      return false;
    }

    setError('');
    return true;
  };

  const handleCommit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setError('');

    try {
      const sheetId = getCurrentSheetId();
      const totalNotes = notes.length;
      const noteIds = [];

      // Process each note
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];

        try {
          // Update note with new settings
          const noteUpdates = {
            Status: 'Processed',
            Visibility: visibility,
            'Shared With': visibility === 'Shared' ? sharedWith : '',
          };

          // Add tags if provided
          if (tags.trim()) {
            noteUpdates.Tags = tags;
          }

          await updateNote(accessToken, sheetId, note['Note ID'], noteUpdates);

          // Link to entity if option is enabled
          if (linkToSameEntity && selectedEntityId) {
            const entityLinks = {};

            if (selectedEntityType === 'contact') {
              entityLinks.contactIds = [selectedEntityId];
            } else if (selectedEntityType === 'event') {
              entityLinks.eventIds = [selectedEntityId];
            } else if (selectedEntityType === 'list') {
              entityLinks.listIds = [selectedEntityId];
            } else if (selectedEntityType === 'task') {
              entityLinks.taskIds = [selectedEntityId];
            }

            await batchLinkNoteToEntities(accessToken, sheetId, note['Note ID'], entityLinks);
          }

          noteIds.push(note['Note ID']);
          setProcessedCount(i + 1);
          setProgress(((i + 1) / totalNotes) * 100);
        } catch (err) {
          logError(`Error processing note ${note['Note ID']}:`, err);
          // Continue with other notes
        }
      }

      // Call parent callback
      await onCommit({
        noteIds,
        tags,
        visibility,
        sharedWith: visibility === 'Shared' ? sharedWith : '',
      });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      logError('Error during bulk commit:', err);
      setError(err.message || 'Failed to commit notes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getEntityOptions = () => {
    if (selectedEntityType === 'contact') {
      return contacts.map((c) => ({
        id: c['Contact ID'],
        label: c.Name || c['Contact ID'],
      }));
    } else if (selectedEntityType === 'event') {
      return events.map((e) => ({
        id: e['Event ID'],
        label: e['Event Name'] || e['Event ID'],
      }));
    } else if (selectedEntityType === 'list') {
      return lists.map((l) => ({
        id: l['List ID'],
        label: l['List Name'] || l['List ID'],
      }));
    } else if (selectedEntityType === 'task') {
      return tasks.map((t) => ({
        id: t['Task ID'],
        label: t.Title || t['Task ID'],
      }));
    }
    return [];
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={isProcessing ? undefined : onClose}
      title="Bulk Commit Notes"
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCommit} disabled={isProcessing}>
            {isProcessing ? `Processing (${processedCount}/${notes.length})...` : 'Commit All'}
          </button>
        </>
      }
    >
      {/* Notes Count */}
      <div className="bcm-info-box">
        <p className="bcm-info-text">
          Committing <strong>{notes.length}</strong> note{notes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tags Input */}
      <div className="form-group">
        <label className="form-label">Tags (applies to all notes)</label>
        <input
          type="text"
          className="form-input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={isProcessing}
          placeholder="e.g. important, urgent, follow-up"
        />
      </div>

      {/* Visibility Selector */}
      <div className="form-group">
        <label className="form-label">Visibility</label>
        <select
          className="form-select"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={isProcessing}
        >
          <option value="Private">Private</option>
          <option value="Shared">Shared</option>
          <option value="Workspace-Wide">Workspace-Wide</option>
        </select>
      </div>

      {/* Shared With Input */}
      {visibility === 'Shared' && (
        <div className="form-group">
          <label className="form-label">Shared With (email addresses) *</label>
          <input
            type="text"
            className="form-input"
            value={sharedWith}
            onChange={(e) => setSharedWith(e.target.value)}
            disabled={isProcessing}
            placeholder="e.g. user1@example.com, user2@example.com"
          />
          <div className="bcm-hint-text">
            Separate multiple email addresses with commas
          </div>
        </div>
      )}

      {/* Link to Same Entity Option */}
      <div className="bcm-link-entity-box">
        <label
          style={{
            marginBottom: linkToSameEntity ? 'var(--spacing-sm)' : '0',
          }}
          className="bcm-link-entity-label"
        >
          <input
            type="checkbox"
            checked={linkToSameEntity}
            onChange={(e) => setLinkToSameEntity(e.target.checked)}
            disabled={isProcessing}
          />
          <span className="bcm-link-entity-span">
            Link all notes to the same entity
          </span>
        </label>

        {linkToSameEntity && (
          <>
            <div className="form-group">
              <select
                className="form-select"
                value={selectedEntityType}
                onChange={(e) => {
                  setSelectedEntityType(e.target.value);
                  setSelectedEntityId('');
                }}
                disabled={isProcessing}
              >
                <option value="">Select entity type...</option>
                <option value="contact">Contact</option>
                <option value="event">Event</option>
                <option value="list">List</option>
                <option value="task">Task</option>
              </select>
            </div>

            {selectedEntityType && (
              <div className="form-group">
                <select
                  className="form-select"
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">Select {selectedEntityType}...</option>
                  {getEntityOptions().map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="bcm-progress-wrapper">
          <div className="bcm-progress-header">
            <span>Processing...</span>
            <span>
              {processedCount} / {notes.length}
            </span>
          </div>
          <div className="bcm-progress-track">
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--color-accent-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <div className="alert alert-danger">{error}</div>}
    </WindowTemplate>
  );
}
