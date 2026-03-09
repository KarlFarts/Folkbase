import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RefreshCw, Zap, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import ConfirmDialog from '../components/ConfirmDialog';
import WindowTemplate from '../components/WindowTemplate';
import {
  getNotes,
  addNoteWithLink,
  updateNote,
  deleteNote,
  linkNoteToContact,
  readSheetData,
  filterNotesByVisibility,
  canUserEditNote,
  batchLinkNoteToEntities,
  SHEETS,
} from '../utils/devModeWrapper';
import { createAutoRefreshService } from '../services/autoRefreshService';
import NoteDetailWithEntities from '../components/NoteDetailWithEntities';
import CommitNoteModal from '../components/notes/CommitNoteModal';
import QuickCommitButton from '../components/notes/QuickCommitButton';
import BulkCommitModal from '../components/notes/BulkCommitModal';
import { ListPageSkeleton } from '../components/SkeletonLoader';
import './NotesInbox.css';

const NOTE_TYPES = [
  'General',
  'Meeting Note',
  'Phone Call',
  'Idea',
  'Follow-up',
  'Event Note',
  'Research',
  'Action Item',
  'Braindump',
];

function NotesInbox({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { canWrite } = usePermissions();

  const [notes, setNotes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Selected note for detail view
  const [selectedNote, setSelectedNote] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingNoteId, setLinkingNoteId] = useState(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [committingNote, setCommittingNote] = useState(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState(null);
  const [showBulkCommitModal, setShowBulkCommitModal] = useState(false);

  // Bulk selection state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());

  // Mutation loading state
  const [saving, setSaving] = useState(false);

  // Auto-refresh service reference
  const autoRefreshServiceRef = useRef(null);

  // Optimistic UI state
  const [optimisticNotes, setOptimisticNotes] = useState(new Map()); // noteId -> note data

  // Track which notes are being edited locally
  const [editingNoteIds, setEditingNoteIds] = useState(new Set());
  const editingNoteIdsRef = useRef(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    editingNoteIdsRef.current = editingNoteIds;
  }, [editingNoteIds]);

  // Form state
  const [noteForm, setNoteForm] = useState({
    Content: '',
    'Note Type': 'General',
    'Contact ID': '',
    'Event ID': '',
    Visibility: 'Team',
    'Shared With': '',
    Status: 'Unprocessed',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load notes, contacts, and events in parallel
      const [notesData, contactsResult, eventsResult] = await Promise.all([
        getNotes(accessToken, sheetId),
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS),
      ]);

      // Apply privacy filtering to notes
      const allNotes = Array.isArray(notesData) ? notesData : [];
      const visibleNotes = user?.email ? filterNotesByVisibility(allNotes, user.email) : allNotes;

      setNotes(visibleNotes);
      setContacts(
        contactsResult?.data && Array.isArray(contactsResult.data) ? contactsResult.data : []
      );
      setEvents(eventsResult?.data && Array.isArray(eventsResult.data) ? eventsResult.data : []);
    } catch {
      setError('Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, sheetId, user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-fetch when a note is added from another page (e.g. ContactProfile)
  useEffect(() => {
    const onNotesChanged = () => loadData();
    window.addEventListener('folkbase:notes-changed', onNotesChanged);
    return () => window.removeEventListener('folkbase:notes-changed', onNotesChanged);
  }, [loadData]);

  // Auto-refresh service to poll for changes every 60 seconds
  useEffect(() => {
    if (!accessToken || !sheetId) return;

    // Fetch function for auto-refresh
    const fetchData = async () => {
      const [notesData, contactsResult, eventsResult] = await Promise.all([
        getNotes(accessToken, sheetId),
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS),
      ]);

      // Apply privacy filtering
      const allNotes = Array.isArray(notesData) ? notesData : [];
      const visibleNotes = user?.email ? filterNotesByVisibility(allNotes, user.email) : allNotes;

      return {
        notes: visibleNotes,
        contacts:
          contactsResult?.data && Array.isArray(contactsResult.data) ? contactsResult.data : [],
        events: eventsResult?.data && Array.isArray(eventsResult.data) ? eventsResult.data : [],
      };
    };

    // Callback when data changes
    const onDataChanged = (freshData) => {
      // Merge strategy: Keep notes being edited, update others, add new ones
      setNotes((prevNotes) => {
        const freshNotesMap = new Map(freshData.notes.map((n) => [n['Note ID'], n]));

        // Update existing notes (skip ones being edited)
        const updatedNotes = prevNotes.map((note) => {
          // Skip notes being edited locally (use ref to avoid dependency)
          if (editingNoteIdsRef.current.has(note['Note ID'])) {
            return note;
          }

          // Update with fresh data if available
          const freshNote = freshNotesMap.get(note['Note ID']);
          return freshNote || note;
        });

        // Add new notes that don't exist locally
        const prevNoteIds = new Set(prevNotes.map((n) => n['Note ID']));
        const newNotes = freshData.notes.filter((n) => !prevNoteIds.has(n['Note ID']));

        return [...updatedNotes, ...newNotes];
      });

      setContacts(freshData.contacts);
      setEvents(freshData.events);
    };

    // Create and start service
    const service = createAutoRefreshService(fetchData, onDataChanged, {
      intervalMs: 60000, // 60 seconds
      onError: (_error) => {
        // Silently fail - don't disrupt user experience
      },
    });

    autoRefreshServiceRef.current = service;
    service.start();

    // Cleanup on unmount
    return () => {
      if (autoRefreshServiceRef.current) {
        autoRefreshServiceRef.current.stop();
      }
    };
  }, [accessToken, sheetId, user?.email]); // Removed editingNoteIds - using ref instead

  const handleAddNote = async () => {
    if (!noteForm.Content.trim()) {
      notify.warning('Please enter note content');
      return;
    }

    // Generate temporary ID
    const tempNoteId = `TEMP-${Date.now()}`;

    // Create optimistic note
    const optimisticNote = {
      'Note ID': tempNoteId,
      'Created Date': new Date().toISOString().split('T')[0],
      'Created By': user?.email || '',
      Content: noteForm.Content,
      'Note Type': noteForm['Note Type'],
      'Event ID': noteForm['Event ID'] || '',
      Visibility: noteForm.Visibility || 'Team',
      'Shared With': noteForm['Shared With'] || '',
      Status: 'Unprocessed',
      _optimistic: true,
    };

    // Add to optimistic state immediately
    setOptimisticNotes((prev) => new Map(prev).set(tempNoteId, optimisticNote));

    // Close modal and reset form immediately (optimistic feedback)
    setShowAddModal(false);
    resetForm();

    try {
      // Background: Save to Google Sheets (with optional linking in single operation)
      await addNoteWithLink(
        accessToken,
        sheetId,
        {
          Content: noteForm.Content,
          'Note Type': noteForm['Note Type'],
          'Event ID': noteForm['Event ID'] || '',
          Visibility: noteForm.Visibility || 'Team',
          'Shared With': noteForm['Shared With'] || '',
          Status: 'Unprocessed',
        },
        noteForm['Contact ID'] || null,
        user?.email
      );

      // Remove optimistic note, add real note
      setOptimisticNotes((prev) => {
        const next = new Map(prev);
        next.delete(tempNoteId);
        return next;
      });

      notify.success('Note created successfully!');
      loadData(); // Refresh to get server state
    } catch {
      // Remove optimistic note on error
      setOptimisticNotes((prev) => {
        const next = new Map(prev);
        next.delete(tempNoteId);
        return next;
      });

      notify.error('Failed to create note. Please try again.');
    }
  };

  const handleUpdateNote = async () => {
    if (!noteForm.Content.trim()) {
      notify.warning('Please enter note content');
      return;
    }

    setSaving(true);
    try {
      await updateNote(accessToken, sheetId, editingNote['Note ID'], {
        Content: noteForm.Content,
        'Note Type': noteForm['Note Type'],
        Status: noteForm.Status,
      });

      notify.success('Note updated successfully!');
      closeEditModal();
      loadData();

      // Update selected note if it was the one being edited
      if (selectedNote && selectedNote['Note ID'] === editingNote['Note ID']) {
        setSelectedNote({
          ...selectedNote,
          Content: noteForm.Content,
          'Note Type': noteForm['Note Type'],
          Status: noteForm.Status,
        });
      }
    } catch {
      notify.error('Failed to update note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(accessToken, sheetId, noteId);
      notify.success('Note deleted successfully!');
      if (selectedNote && selectedNote['Note ID'] === noteId) {
        setSelectedNote(null);
      }
      loadData();
    } catch {
      notify.error('Failed to delete note. Please try again.');
    } finally {
      setConfirmDeleteNoteId(null);
    }
  };

  const handleMarkAsProcessed = async (noteId) => {
    try {
      await updateNote(accessToken, sheetId, noteId, { Status: 'Processed' });
      notify.success('Note marked as processed');
      loadData();

      if (selectedNote && selectedNote['Note ID'] === noteId) {
        setSelectedNote({ ...selectedNote, Status: 'Processed' });
      }
    } catch {
      notify.error('Failed to update note status.');
    }
  };

  const openCommitModal = (note) => {
    setCommittingNote(note);
    setShowCommitModal(true);
  };

  const handleCommitNote = async (commitData) => {
    try {
      const { noteUpdates, entityLinks } = commitData;
      const noteId = committingNote['Note ID'];

      // Update note fields (Status, Tags, Content, Note Type, Visibility)
      await updateNote(accessToken, sheetId, noteId, noteUpdates);

      // Link to entities if specified
      if (entityLinks && Object.keys(entityLinks).length > 0) {
        await batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks);
      }

      notify.success('Note committed successfully!');
      setShowCommitModal(false);
      setCommittingNote(null);
      loadData();

      // Update selected note if it was the one being committed
      if (selectedNote && selectedNote['Note ID'] === noteId) {
        setSelectedNote({
          ...selectedNote,
          ...noteUpdates,
        });
      }
    } catch {
      notify.error('Failed to commit note. Please try again.');
    }
  };

  const handleQuickCommit = async (note) => {
    try {
      await updateNote(accessToken, sheetId, note['Note ID'], { Status: 'Processed' });
      notify.success('Note marked as processed');
      loadData();

      if (selectedNote && selectedNote['Note ID'] === note['Note ID']) {
        setSelectedNote({ ...selectedNote, Status: 'Processed' });
      }
    } catch {
      notify.error('Failed to commit note.');
    }
  };

  const handleBulkCommit = async (bulkData) => {
    const { noteIds, tags, visibility, sharedWith, entityLinks } = bulkData;
    let successCount = 0;
    let errorCount = 0;

    for (const noteId of noteIds) {
      try {
        const updates = {
          Status: 'Processed',
          Tags: tags || '',
          Visibility: visibility || 'Workspace-Wide',
          'Shared With': sharedWith || '',
        };

        await updateNote(accessToken, sheetId, noteId, updates);

        // Link to entities if specified
        if (entityLinks && Object.keys(entityLinks).length > 0) {
          await batchLinkNoteToEntities(accessToken, sheetId, noteId, entityLinks);
        }

        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      notify.success(`Successfully committed ${successCount} note(s)`);
    }
    if (errorCount > 0) {
      notify.warning(`Failed to commit ${errorCount} note(s)`);
    }

    // Keep the detail panel in sync if the selected note was just committed
    if (selectedNote && noteIds.includes(selectedNote['Note ID'])) {
      setSelectedNote({ ...selectedNote, Status: 'Processed' });
    }

    setShowBulkCommitModal(false);
    setSelectedNoteIds(new Set());
    setBulkSelectMode(false);
    loadData();
  };

  const toggleBulkSelect = (noteId) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    const allIds = new Set(sortedNotes.map((n) => n['Note ID']));
    setSelectedNoteIds(allIds);
  };

  const deselectAll = () => {
    setSelectedNoteIds(new Set());
  };

  const handleLinkToContact = async (contactId) => {
    if (!linkingNoteId) return;

    try {
      await linkNoteToContact(accessToken, sheetId, linkingNoteId, contactId);
      notify.success('Note linked to contact!');
      setShowLinkModal(false);
      setLinkingNoteId(null);

      // Mark as processed when linked
      await updateNote(accessToken, sheetId, linkingNoteId, { Status: 'Processed' });
      loadData();
    } catch {
      notify.error('Failed to link note to contact.');
    }
  };

  const resetForm = () => {
    setNoteForm({
      Content: '',
      'Note Type': 'General',
      'Contact ID': '',
      'Event ID': '',
      Visibility: 'Workspace-Wide',
      'Shared With': '',
      Status: 'Unprocessed',
    });
  };

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    await loadData();

    // Reset checksum so auto-refresh doesn't think data changed
    if (autoRefreshServiceRef.current) {
      autoRefreshServiceRef.current.resetChecksum();
    }

    notify.success('Notes refreshed!');
  }, [loadData, notify]);

  const openEditModal = (note) => {
    setEditingNote(note);
    setEditingNoteIds((prev) => new Set(prev).add(note['Note ID']));
    setNoteForm({
      Content: note.Content || '',
      'Note Type': note['Note Type'] || 'General',
      'Contact ID': '',
      Status: note.Status || 'Unprocessed',
    });
  };

  const closeEditModal = () => {
    if (editingNote) {
      setEditingNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(editingNote['Note ID']);
        return next;
      });
    }
    setEditingNote(null);
    resetForm();
  };

  const openLinkModal = (noteId) => {
    setLinkingNoteId(noteId);
    setShowLinkModal(true);
  };

  const getContactName = (contactId) => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    return contact ? contact['Name'] : 'Unknown Contact';
  };

  // Merge optimistic notes with real notes for display
  const displayNotes = useMemo(() => {
    const optimisticArray = Array.from(optimisticNotes.values());
    return [...notes, ...optimisticArray];
  }, [notes, optimisticNotes]);

  // Filter notes - with safety checks
  const filteredNotes = (displayNotes || []).filter((note) => {
    if (!note) return false;

    // Visibility filter
    if (visibilityFilter !== 'all' && user?.email) {
      const visibility = note.Visibility || 'Team';
      const createdBy = note['Created By'];
      const sharedWith = (note['Shared With'] || '')
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);

      if (visibilityFilter === 'private' && visibility !== 'Private') return false;
      if (
        visibilityFilter === 'shared' &&
        !(visibility === 'Shared' && (createdBy === user.email || sharedWith.includes(user.email)))
      )
        return false;
      if (
        visibilityFilter === 'workspace' &&
        visibility !== 'Team' &&
        visibility !== 'Campaign-Wide' &&
        visibility !== 'Workspace-Wide'
      )
        return false;
    }

    // Status filter
    if (statusFilter !== 'all' && note.Status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && note['Note Type'] !== typeFilter) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const content = (note.Content || '').toLowerCase();
      const type = (note['Note Type'] || '').toLowerCase();

      if (!content.includes(query) && !type.includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Sort by created date (newest first), with unprocessed braindumps prioritized
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    // Priority 1: Unprocessed braindumps come first
    const aIsBraindump = a['Note Type'] === 'Braindump' && a.Status === 'Unprocessed';
    const bIsBraindump = b['Note Type'] === 'Braindump' && b.Status === 'Unprocessed';

    if (aIsBraindump && !bIsBraindump) return -1;
    if (!aIsBraindump && bIsBraindump) return 1;

    // Priority 2: Sort by date (newest first)
    const dateA = a['Created Date'] ? new Date(a['Created Date']) : new Date(0);
    const dateB = b['Created Date'] ? new Date(b['Created Date']) : new Date(0);
    return dateB - dateA;
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
    setVisibilityFilter('all');
  };

  // Stats
  const totalCount = (notes || []).length;
  const unprocessedCount = (notes || []).filter((n) => n && n.Status === 'Unprocessed').length;
  const processedCount = (notes || []).filter((n) => n && n.Status === 'Processed').length;
  const braindumpCount = (notes || []).filter(
    (n) => n && n['Note Type'] === 'Braindump' && n.Status === 'Unprocessed'
  ).length;

  if (loading) {
    return <ListPageSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Error Loading Notes</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container notes-page">
      <div className="page-header">
        <div>
          <h1>Notes</h1>
          <p className="page-subtitle">Capture ideas, meeting notes, and link them to contacts</p>
        </div>
        {canWrite('notes') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + New Note
          </button>
        )}
      </div>

      {/* Sync Status Bar */}
      <div className="sync-status-bar">
        <button className="btn-icon" onClick={handleManualRefresh} title="Refresh notes">
          <RefreshCw size={16} />
        </button>
        <span className="sync-status-text">Auto-sync: On • Updates every 60s</span>
        <div className="notes-status-bar-actions">
          <button
            className={`btn ${bulkSelectMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setBulkSelectMode(!bulkSelectMode);
              setSelectedNoteIds(new Set());
            }}
          >
            {bulkSelectMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {bulkSelectMode && (
        <div className="bulk-action-toolbar">
          <div className="bulk-action-info">
            <span>{selectedNoteIds.size} selected</span>
            <button className="btn-link" onClick={selectAllFiltered}>
              Select All
            </button>
            <button className="btn-link" onClick={deselectAll}>
              Deselect All
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowBulkCommitModal(true)}
            disabled={selectedNoteIds.size === 0}
          >
            Process Selected ({selectedNoteIds.size})
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="notes-stats-bar">
        <div className="stat-item">
          <span className="stat-value">{totalCount}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{unprocessedCount}</span>
          <span className="stat-label">Unprocessed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{processedCount}</span>
          <span className="stat-label">Processed</span>
        </div>
        {braindumpCount > 0 && (
          <div className="stat-item highlight">
            <span
              className="stat-value"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Zap size={16} /> {braindumpCount}
            </span>
            <span className="stat-label">Braindumps to Review</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="notes-filters">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="Unprocessed">Unprocessed</option>
          <option value="Processed">Processed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          {NOTE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Notes</option>
          <option value="private">Private</option>
          <option value="shared">Shared</option>
          <option value="workspace">Team</option>
        </select>
      </div>

      {/* Notes Content */}
      {sortedNotes.length === 0 ? (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">
            {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
          </h3>
          <p>
            {notes.length === 0
              ? 'Create your first note to get started.'
              : 'No notes match your current filters.'}
          </p>
          <div className="empty-state-actions">
            {notes.length === 0 && canWrite('notes') && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                Create Note
              </button>
            )}
            {notes.length > 0 && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="notes-container">
          {/* Notes List */}
          <div className="notes-list">
            {sortedNotes.map((note) => {
              const isBraindump = note['Note Type'] === 'Braindump';
              const isUnprocessedBraindump = isBraindump && note.Status === 'Unprocessed';
              const isSelected = selectedNoteIds.has(note['Note ID']);

              return (
                <div
                  key={note['Note ID']}
                  className={`note-card ${selectedNote?.['Note ID'] === note['Note ID'] ? 'active' : ''} ${note.Status === 'Processed' ? 'processed' : ''} ${isUnprocessedBraindump ? 'braindump-unprocessed' : ''} ${note._optimistic ? '_optimistic' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    if (bulkSelectMode) {
                      e.stopPropagation();
                      toggleBulkSelect(note['Note ID']);
                    } else {
                      setSelectedNote(note);
                    }
                  }}
                >
                  {bulkSelectMode && (
                    <div className="note-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBulkSelect(note['Note ID'])}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="note-card-header">
                    <span className={`note-type-badge ${isBraindump ? 'braindump' : ''}`}>
                      {isBraindump && (
                        <>
                          <Zap size={12} />{' '}
                        </>
                      )}
                      {note['Note Type']}
                    </span>
                    <span
                      className={`note-status-badge ${note.Status === 'Unprocessed' ? 'unprocessed' : 'processed'}`}
                    >
                      {note.Status}
                    </span>
                  </div>
                  <p className="note-preview">
                    {(note.Content || '').length > 120
                      ? (note.Content || '').substring(0, 120) + '...'
                      : note.Content || ''}
                  </p>
                  <p className="note-date">
                    {new Date(note['Created Date']).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Note Detail View */}
          {selectedNote ? (
            selectedNote['Note Type'] === 'Braindump' && selectedNote.Status === 'Unprocessed' ? (
              // Enhanced view with entity detection for unprocessed braindumps
              <NoteDetailWithEntities
                note={selectedNote}
                contacts={contacts}
                events={events}
                onLinkContact={(contactId) => handleLinkToContact(contactId)}
                onMarkProcessed={handleMarkAsProcessed}
                onEdit={openEditModal}
                onDelete={(noteId) => setConfirmDeleteNoteId(noteId)}
                canEdit={canUserEditNote(selectedNote, user?.email)}
              />
            ) : (
              // Standard note detail view
              <div className="note-detail">
                <div className="note-detail-header">
                  <h2>{selectedNote['Note Type']}</h2>
                  <div className="badge-group">
                    <span
                      className={`note-status-badge large ${selectedNote.Status === 'Unprocessed' ? 'unprocessed' : 'processed'}`}
                    >
                      {selectedNote.Status}
                    </span>
                    <span
                      className={`privacy-badge ${(selectedNote.Visibility || 'Team').toLowerCase()}`}
                    >
                      {selectedNote.Visibility || 'Team'}
                    </span>
                  </div>
                </div>

                <p className="note-detail-date">
                  Created: {new Date(selectedNote['Created Date']).toLocaleString()}
                  {selectedNote['Created By'] && ` by ${selectedNote['Created By']}`}
                </p>

                {selectedNote.Visibility === 'Shared' && selectedNote['Shared With'] && (
                  <p className="note-detail-shared">Shared with: {selectedNote['Shared With']}</p>
                )}

                <div className="note-content-box">
                  <p>{selectedNote.Content}</p>
                </div>

                {/* Linked Event Section */}
                {selectedNote['Event ID'] && (
                  <div className="linked-event-section">
                    <h4>Linked Event</h4>
                    {(() => {
                      const linkedEvent = events.find(
                        (e) => e['Event ID'] === selectedNote['Event ID']
                      );
                      return linkedEvent ? (
                        <span
                          className="linked-event-chip"
                          onClick={() => onNavigate('event-details', selectedNote['Event ID'])}
                        >
                          {linkedEvent['Event Name']} - {linkedEvent['Event Date']}
                        </span>
                      ) : (
                        <p className="text-muted">Event not found</p>
                      );
                    })()}
                  </div>
                )}

                {/* Linked Contacts Section */}
                <div className="linked-contacts-section">
                  <h4>Linked Contacts</h4>
                  {selectedNote.linkedContacts && selectedNote.linkedContacts.length > 0 ? (
                    <div className="linked-contacts-list">
                      {selectedNote.linkedContacts.map((contactId) => (
                        <span
                          key={contactId}
                          className="linked-contact-chip"
                          onClick={() => onNavigate('contact-profile', contactId)}
                        >
                          {getContactName(contactId)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No contacts linked yet</p>
                  )}
                  <button
                    className="btn btn-sm btn-secondary mt-sm"
                    onClick={() => openLinkModal(selectedNote['Note ID'])}
                  >
                    + Add Contact Link
                  </button>
                </div>

                {/* Actions */}
                <div className="note-actions">
                  {selectedNote.Status === 'Unprocessed' &&
                    canUserEditNote(selectedNote, user?.email) && (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => openCommitModal(selectedNote)}
                        >
                          Process & Tag
                        </button>
                        <QuickCommitButton
                          note={selectedNote}
                          onCommit={() => handleQuickCommit(selectedNote)}
                        />
                      </>
                    )}
                  {canUserEditNote(selectedNote, user?.email) && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => openEditModal(selectedNote)}
                    >
                      Edit
                    </button>
                  )}
                  {canUserEditNote(selectedNote, user?.email) && (
                    <button
                      className="btn btn-danger"
                      onClick={() => setConfirmDeleteNoteId(selectedNote['Note ID'])}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="note-detail empty">
              <p className="text-muted">Select a note to view details</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Note Modal */}
      {(showAddModal || editingNote) && (
        <WindowTemplate
          isOpen={showAddModal || !!editingNote}
          onClose={() => {
            setShowAddModal(false);
            closeEditModal();
          }}
          title={editingNote ? 'Edit Note' : 'New Note'}
          size="md"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  closeEditModal();
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingNote ? handleUpdateNote : handleAddNote}
                disabled={!noteForm.Content.trim() || saving}
              >
                {saving ? 'Saving...' : editingNote ? 'Save Changes' : 'Create Note'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>Note Type</label>
            <select
              value={noteForm['Note Type']}
              onChange={(e) => setNoteForm({ ...noteForm, 'Note Type': e.target.value })}
            >
              {NOTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Content *</label>
            <textarea
              value={noteForm.Content}
              onChange={(e) => setNoteForm({ ...noteForm, Content: e.target.value })}
              placeholder="Write your note here..."
              rows={6}
              autoFocus
            />
          </div>

          {!editingNote && (
            <div className="form-group">
              <label>Link to Contact (Optional)</label>
              <select
                value={noteForm['Contact ID']}
                onChange={(e) => setNoteForm({ ...noteForm, 'Contact ID': e.target.value })}
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact['Contact ID']} value={contact['Contact ID']}>
                    {contact['Name']}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editingNote && (
            <div className="form-group">
              <label>Link to Event (Optional)</label>
              <select
                value={noteForm['Event ID']}
                onChange={(e) => setNoteForm({ ...noteForm, 'Event ID': e.target.value })}
              >
                <option value="">No event</option>
                {events.map((event) => (
                  <option key={event['Event ID']} value={event['Event ID']}>
                    {event['Event Name']} - {event['Event Date']}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Visibility</label>
            <select
              value={noteForm.Visibility}
              onChange={(e) => setNoteForm({ ...noteForm, Visibility: e.target.value })}
            >
              <option value="Team">Team (visible to everyone in workspace)</option>
              <option value="Shared">Shared (specific users only)</option>
              <option value="Private">Private (only me)</option>
            </select>
          </div>

          {noteForm.Visibility === 'Shared' && (
            <div className="form-group">
              <label>Share with (comma-separated emails)</label>
              <input
                type="text"
                value={noteForm['Shared With']}
                onChange={(e) => setNoteForm({ ...noteForm, 'Shared With': e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          )}

          {editingNote && (
            <div className="form-group">
              <label>Status</label>
              <select
                value={noteForm.Status}
                onChange={(e) => setNoteForm({ ...noteForm, Status: e.target.value })}
              >
                <option value="Unprocessed">Unprocessed</option>
                <option value="Processed">Processed</option>
              </select>
            </div>
          )}
        </WindowTemplate>
      )}

      {/* Link to Contact Modal */}
      {showLinkModal && (
        <WindowTemplate
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setLinkingNoteId(null);
          }}
          title="Link to Contact"
          size="sm"
          footer={
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowLinkModal(false);
                setLinkingNoteId(null);
              }}
            >
              Cancel
            </button>
          }
        >
          <div className="form-group">
            <label>Select Contact</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleLinkToContact(e.target.value);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Choose a contact...
              </option>
              {contacts.map((contact) => (
                <option key={contact['Contact ID']} value={contact['Contact ID']}>
                  {contact['Name']}
                </option>
              ))}
            </select>
          </div>
        </WindowTemplate>
      )}

      {/* Commit Note Modal */}
      {showCommitModal && committingNote && (
        <CommitNoteModal
          isOpen={showCommitModal}
          onClose={() => {
            setShowCommitModal(false);
            setCommittingNote(null);
          }}
          note={committingNote}
          onCommit={handleCommitNote}
        />
      )}

      {/* Bulk Commit Modal */}
      {showBulkCommitModal && (
        <BulkCommitModal
          isOpen={showBulkCommitModal}
          onClose={() => setShowBulkCommitModal(false)}
          notes={sortedNotes.filter((n) => selectedNoteIds.has(n['Note ID']))}
          onCommit={handleBulkCommit}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteNoteId}
        onConfirm={() => handleDeleteNote(confirmDeleteNoteId)}
        onCancel={() => setConfirmDeleteNoteId(null)}
        title="Delete Note"
        message={(() => {
          const note = notes.find((n) => n['Note ID'] === confirmDeleteNoteId);
          const preview = note?.Content ? note.Content.slice(0, 80) + (note.Content.length > 80 ? '…' : '') : 'this note';
          return `Delete "${preview}"? This cannot be undone.`;
        })()}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default NotesInbox;
