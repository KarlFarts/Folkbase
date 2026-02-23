import React, { useState } from 'react';
import { Lock, Users, Globe, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { filterNotesByVisibility, canUserEditNote } from '../../utils/devModeWrapper';
import './NotesDisplaySection.css';

/**
 * NotesDisplaySection - Reusable component for displaying notes on any entity page
 * Handles visibility filtering based on workspace context
 *
 * @param {Array} notes - Array of note objects to display
 * @param {String} entityType - Type of entity ('contact', 'event', 'list', 'task')
 * @param {String} entityId - ID of the entity
 * @param {Function} onAddNote - Callback when user wants to add a note
 * @param {Boolean} canEdit - Whether user can edit/delete notes
 * @param {Boolean} showAddButton - Whether to show "Add Note" button (default: true)
 * @param {Boolean} showLinkedEntities - Whether to show chips for other linked entities (default: true)
 */
function NotesDisplaySection({
  notes = [],
  _entityType,
  _entityId,
  onAddNote,
  canEdit = true,
  showAddButton = true,
  showLinkedEntities = true,
}) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  // Apply visibility filtering based on workspace context
  const visibleNotes = user?.email
    ? filterNotesByVisibility(notes, user.email, activeWorkspace?.['Workspace ID'])
    : notes;

  // Sort by created date (newest first), prioritize unprocessed
  const sortedNotes = [...visibleNotes].sort((a, b) => {
    // Unprocessed notes first
    if (a.Status === 'Unprocessed' && b.Status === 'Processed') return -1;
    if (a.Status === 'Processed' && b.Status === 'Unprocessed') return 1;

    // Then by date (newest first)
    const dateA = a['Created Date'] ? new Date(a['Created Date']) : new Date(0);
    const dateB = b['Created Date'] ? new Date(b['Created Date']) : new Date(0);
    return dateB - dateA;
  });

  const toggleExpand = (noteId) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'Private':
        return <Lock size={14} />;
      case 'Shared':
        return <Users size={14} />;
      case 'Workspace-Wide':
      case 'Campaign-Wide':
        return <Globe size={14} />;
      default:
        return <Globe size={14} />;
    }
  };

  const handleNavigateToEntity = (type, id) => {
    switch (type) {
      case 'contact':
        navigate(`/contacts/${id}`);
        break;
      case 'event':
        navigate(`/events/${id}`);
        break;
      case 'list':
        navigate(`/lists/${id}`);
        break;
      case 'task':
        navigate(`/tasks/${id}`);
        break;
      default:
        break;
    }
  };

  if (sortedNotes.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className="notes-display-section">
      <div className="notes-display-header">
        <h3>Notes {sortedNotes.length > 0 && `(${sortedNotes.length})`}</h3>
        {showAddButton && onAddNote && (
          <button className="btn btn-sm btn-primary" onClick={onAddNote}>
            + Add Note
          </button>
        )}
      </div>

      {sortedNotes.length === 0 ? (
        <div className="notes-empty-state">
          <p>No notes yet. {canEdit && onAddNote && 'Click "Add Note" to create one.'}</p>
        </div>
      ) : (
        <div className="notes-list-compact">
          {sortedNotes.map((note) => {
            const isExpanded = expandedNoteId === note['Note ID'];
            const isBraindump = note['Note Type'] === 'Braindump';
            const canUserEdit = canUserEditNote(note, user?.email);

            return (
              <div
                key={note['Note ID']}
                className={`note-item-compact ${note.Status === 'Unprocessed' ? 'unprocessed' : ''} ${isBraindump ? 'braindump' : ''}`}
              >
                <div className="note-item-header" onClick={() => toggleExpand(note['Note ID'])}>
                  <div className="note-item-meta">
                    <span className={`note-type-tag ${isBraindump ? 'braindump' : ''}`}>
                      {isBraindump && <><Zap size={14} />{' '}</>}
                      {note['Note Type']}
                    </span>
                    <span
                      className={`note-status-tag ${note.Status === 'Unprocessed' ? 'unprocessed' : 'processed'}`}
                    >
                      {note.Status}
                    </span>
                    <span
                      className="note-visibility-icon"
                      title={note.Visibility || 'Workspace-Wide'}
                    >
                      {getVisibilityIcon(note.Visibility)}
                    </span>
                  </div>
                  <button className="note-expand-btn">{isExpanded ? '▼' : '▶'}</button>
                </div>

                {isExpanded && (
                  <div className="note-item-body">
                    <div className="note-content">
                      <p>{note.Content}</p>
                    </div>

                    <div className="note-metadata">
                      <span className="note-date">
                        {new Date(note['Created Date']).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {note['Created By'] && (
                        <span className="note-author">by {note['Created By']}</span>
                      )}
                    </div>

                    {/* Tags */}
                    {note.Tags && (
                      <div className="note-tags">
                        {note.Tags.split(',')
                          .map((tag) => tag.trim())
                          .filter((tag) => tag)
                          .map((tag, index) => (
                            <span key={index} className="note-tag">
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Linked Entities */}
                    {showLinkedEntities && note.linkedEntities && (
                      <div className="note-linked-entities">
                        {note.linkedEntities.contacts?.length > 0 && (
                          <div className="linked-entity-group">
                            <span className="entity-group-label">Contacts:</span>
                            {note.linkedEntities.contacts.map((contact) => (
                              <span
                                key={contact['Contact ID']}
                                className="entity-chip contact-chip"
                                onClick={() =>
                                  handleNavigateToEntity('contact', contact['Contact ID'])
                                }
                              >
                                {contact.Name}
                              </span>
                            ))}
                          </div>
                        )}
                        {note.linkedEntities.events?.length > 0 && (
                          <div className="linked-entity-group">
                            <span className="entity-group-label">Events:</span>
                            {note.linkedEntities.events.map((event) => (
                              <span
                                key={event['Event ID']}
                                className="entity-chip event-chip"
                                onClick={() => handleNavigateToEntity('event', event['Event ID'])}
                              >
                                {event['Event Name']}
                              </span>
                            ))}
                          </div>
                        )}
                        {note.linkedEntities.lists?.length > 0 && (
                          <div className="linked-entity-group">
                            <span className="entity-group-label">Lists:</span>
                            {note.linkedEntities.lists.map((list) => (
                              <span
                                key={list['List ID']}
                                className="entity-chip list-chip"
                                onClick={() => handleNavigateToEntity('list', list['List ID'])}
                              >
                                {list['List Name']}
                              </span>
                            ))}
                          </div>
                        )}
                        {note.linkedEntities.tasks?.length > 0 && (
                          <div className="linked-entity-group">
                            <span className="entity-group-label">Tasks:</span>
                            {note.linkedEntities.tasks.map((task) => (
                              <span
                                key={task['Task ID']}
                                className="entity-chip task-chip"
                                onClick={() => handleNavigateToEntity('task', task['Task ID'])}
                              >
                                {task.Title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {canUserEdit && (
                      <div className="note-item-actions">
                        <button
                          className="btn-link"
                          onClick={() => navigate(`/notes/${note['Note ID']}`)}
                        >
                          View Full Note
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotesDisplaySection;
